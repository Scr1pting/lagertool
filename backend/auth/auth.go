package auth

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/coreos/go-oidc"
	"github.com/gin-gonic/gin"
	"github.com/go-pg/pg/v10"
	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"lagertool.com/main/db_models"
)

const (
	sessionLifetime    = 24 * time.Hour
	sessionSlideAfter  = 12 * time.Hour
	oauthFlowLifetime  = 10 * time.Minute
	cleanupInterval    = 1 * time.Hour
	maxSessionsPerUser = 5

	sessionCookie   = "user_session"
	oauthFlowCookie = "oauth_flow"
)

var (
	clientID           = os.Getenv("VSETH_CLIENT_ID")
	clientSecret       = os.Getenv("VSETH_CLIENT_SECRET")
	redirectURL        = envOr("OIDC_REDIRECT_URL", "https://localhost:8080/auth/eduid/callback") //fake domain
	issuerURL          = envOr("OIDC_ISSUER_URL", "https://keycloak-fake.vis.ethz.ch/realms/VSETH")
	postLogoutRedirect = envOr("OIDC_POST_LOGOUT_REDIRECT", "localhost:8080") //fake domain !!
	cookieDomain       = envOr("COOKIE_DOMAIN", "localhost")
	cookieSecure       = envOr("COOKIE_SECURE", "true") != "false"

	flowSecret  = mustSecret("SESSION_SECRET", 32)
	tokenSecret = mustSecret("TOKEN_ENCRYPTION_KEY", 32)

	oauth2Config       *oauth2.Config
	oidcProvider       *oidc.Provider
	verifier           *oidc.IDTokenVerifier
	endSessionEndpoint string
)

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func mustSecret(env string, size int) []byte {
	if v := os.Getenv(env); v != "" {
		b, err := base64.StdEncoding.DecodeString(v)
		if err != nil {
			log.Fatalf("%s must be base64-encoded: %v", env, err)
		}
		if len(b) < size {
			log.Fatalf("%s must decode to at least %d bytes (got %d)", env, size, len(b))
		}
		return b[:size]
	}
	log.Printf("⚠️  %s not set — using insecure dev fallback. Set it in production.", env)
	h := sha256.Sum256([]byte("lagertool-dev-fallback-" + env))
	return h[:size]
}

func init() {
	var err error
	oidcProvider, err = oidc.NewProvider(context.Background(), issuerURL)
	if err != nil {
		log.Fatalf("Failed to initialize OIDC provider: %v", err)
	}

	var meta struct {
		EndSession string `json:"end_session_endpoint"`
	}
	if err := oidcProvider.Claims(&meta); err == nil {
		endSessionEndpoint = meta.EndSession
	}

	oauth2Config = &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email", oidc.ScopeOfflineAccess},
		Endpoint:     oidcProvider.Endpoint(),
	}
	verifier = oidcProvider.Verifier(&oidc.Config{ClientID: clientID})
}

type AuthHandler struct {
	DB *pg.DB
}

func NewAuthHandler(db *pg.DB) *AuthHandler {
	return &AuthHandler{DB: db}
}

func (h *AuthHandler) StartSessionCleanup(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(cleanupInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				res, err := h.DB.Model((*db_models.Session)(nil)).
					Where("expires_at < ?", time.Now()).
					Delete()
				if err != nil {
					log.Printf("session cleanup failed: %v", err)
				} else if res.RowsAffected() > 0 {
					log.Printf("session cleanup: removed %d expired sessions", res.RowsAffected())
				}
			}
		}
	}()
}

func (h *AuthHandler) LoginHandler(c *gin.Context) {
	state := uuid.New().String()
	nonce := uuid.New().String()
	verifierStr, challenge, err := newPKCE()
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "could not generate PKCE"})
		return
	}

	flow := flowState{
		State:        state,
		Nonce:        nonce,
		CodeVerifier: verifierStr,
		Exp:          time.Now().Add(oauthFlowLifetime).Unix(),
	}
	token, err := signFlow(flow)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "could not sign flow state"})
		return
	}
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(oauthFlowCookie, token, int(oauthFlowLifetime.Seconds()), "/", cookieDomain, cookieSecure, true)

	authURL := oauth2Config.AuthCodeURL(state,
		oidc.Nonce(nonce),
		oauth2.SetAuthURLParam("code_challenge", challenge),
		oauth2.SetAuthURLParam("code_challenge_method", "S256"),
	)
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

func (h *AuthHandler) CallbackHandler(c *gin.Context) {
	ctx := c.Request.Context()

	rawFlow, err := c.Cookie(oauthFlowCookie)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "missing oauth flow cookie"})
		return
	}
	flow, err := verifyFlow(rawFlow)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid oauth flow", "details": err.Error()})
		return
	}
	// Single-use: clear the flow cookie immediately.
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(oauthFlowCookie, "", -1, "/", cookieDomain, cookieSecure, true)

	if c.Query("state") != flow.State {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "state mismatch"})
		return
	}
	code := c.Query("code")
	if code == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "authorization code missing"})
		return
	}

	oauth2Token, err := oauth2Config.Exchange(ctx, code,
		oauth2.SetAuthURLParam("code_verifier", flow.CodeVerifier),
	)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "token exchange failed", "details": err.Error()})
		return
	}
	rawIDToken, ok := oauth2Token.Extra("id_token").(string)
	if !ok {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "no id_token in response"})
		return
	}
	idToken, err := verifier.Verify(ctx, rawIDToken)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "id token validation failed", "details": err.Error()})
		return
	}
	if idToken.Nonce != flow.Nonce {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "nonce mismatch"})
		return
	}

	var claims struct {
		Sub   string `json:"sub"`
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := idToken.Claims(&claims); err != nil {
		log.Printf("failed to extract claims: %v", err)
	}

	encAccess, err := encryptToken(oauth2Token.AccessToken)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "token encryption failed"})
		return
	}
	encRefresh, err := encryptToken(oauth2Token.RefreshToken)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "token encryption failed"})
		return
	}
	encIDToken, err := encryptToken(rawIDToken)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "token encryption failed"})
		return
	}

	var user db_models.User
	err = h.DB.Model(&user).Where("subject = ?", claims.Sub).Limit(1).Select()
	switch {
	case errors.Is(err, pg.ErrNoRows):
		user = db_models.User{
			Subject:              claims.Sub,
			Issuer:               idToken.Issuer,
			Email:                claims.Email,
			Name:                 claims.Name,
			AccessToken:          encAccess,
			RefreshToken:         encRefresh,
			AccessTokenExpiresAt: oauth2Token.Expiry,
			CreatedAt:            time.Now(),
			LastLogin:            time.Now(),
		}
		if _, err = h.DB.Model(&user).Insert(); err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "user insert failed", "details": err.Error()})
			return
		}
	case err != nil:
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "user lookup failed", "details": err.Error()})
		return
	default:
		user.Issuer = idToken.Issuer
		user.Email = claims.Email
		user.Name = claims.Name
		user.AccessToken = encAccess
		user.RefreshToken = encRefresh
		user.AccessTokenExpiresAt = oauth2Token.Expiry
		user.LastLogin = time.Now()
		if _, err = h.DB.Model(&user).WherePK().Update(); err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "user update failed", "details": err.Error()})
			return
		}
	}

	now := time.Now()
	session := db_models.Session{
		UserID:    user.ID,
		CreatedAt: now,
		ExpiresAt: now.Add(sessionLifetime),
		UserIP:    net.ParseIP(c.ClientIP()),
		UserAgent: c.Request.UserAgent(),
		IDToken:   encIDToken,
	}
	if _, err = h.DB.Model(&session).Insert(); err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "session insert failed", "details": err.Error()})
		return
	}
	if err := h.enforceSessionCap(user.ID); err != nil {
		log.Printf("session cap enforcement failed for user %d: %v", user.ID, err)
	}

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(sessionCookie, fmt.Sprint(session.ID), int(sessionLifetime.Seconds()), "/", cookieDomain, cookieSecure, true)
	c.JSON(http.StatusOK, gin.H{"message": "authentication successful"})
}

func (h *AuthHandler) LogoutHandler(c *gin.Context) {
	sessionID, err := c.Cookie(sessionCookie)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "no session cookie"})
		return
	}

	var session db_models.Session
	err = h.DB.Model(&session).Where("session_id = ?", sessionID).Limit(1).Select()
	if err != nil && !errors.Is(err, pg.ErrNoRows) {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "session lookup failed", "details": err.Error()})
		return
	}

	if session.ID != 0 {
		if _, err := h.DB.Model((*db_models.Session)(nil)).Where("session_id = ?", session.ID).Delete(); err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed to delete session", "details": err.Error()})
			return
		}
	}

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(sessionCookie, "", -1, "/", cookieDomain, cookieSecure, true)

	if endSessionEndpoint == "" {
		c.JSON(http.StatusOK, gin.H{"message": "logged out (no end_session_endpoint advertised by IdP)"})
		return
	}

	logoutURL, err := url.Parse(endSessionEndpoint)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "logged out (bad end_session_endpoint)"})
		return
	}
	q := logoutURL.Query()
	q.Set("post_logout_redirect_uri", postLogoutRedirect)
	q.Set("client_id", clientID)
	if hint, err := decryptToken(session.IDToken); err == nil && hint != "" {
		q.Set("id_token_hint", hint)
	}
	logoutURL.RawQuery = q.Encode()
	c.Redirect(http.StatusTemporaryRedirect, logoutURL.String())
}

func (h *AuthHandler) AuthMiddleware(usingAuth bool) gin.HandlerFunc {
	if !usingAuth {
		return func(c *gin.Context) { c.Next() }
	}
	return func(c *gin.Context) {
		sessionID, err := c.Cookie(sessionCookie)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "no session cookie"})
			return
		}

		var session db_models.Session
		err = h.DB.Model(&session).Relation("User").Where("session.session_id = ?", sessionID).First()
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
			return
		}
		if time.Now().After(session.ExpiresAt) {
			_, _ = h.DB.Model((*db_models.Session)(nil)).Where("session_id = ?", session.ID).Delete()
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "session expired"})
			return
		}

		if session.User != nil {
			if err := h.refreshIfNeeded(c.Request.Context(), session.User); err != nil {
				log.Printf("token refresh failed for user %d: %v", session.User.ID, err)
			}
		}

		if time.Since(session.CreatedAt) > sessionSlideAfter {
			newExpiry := time.Now().Add(sessionLifetime)
			if _, err := h.DB.Model(&session).
				Set("expires_at = ?", newExpiry).
				Where("session_id = ?", session.ID).
				Update(); err == nil {
				session.ExpiresAt = newExpiry
				c.SetSameSite(http.SameSiteLaxMode)
				c.SetCookie(sessionCookie, fmt.Sprint(session.ID), int(sessionLifetime.Seconds()), "/", cookieDomain, cookieSecure, true)
			}
		}

		c.Set("user", session.User)
		c.Set("session", &session)
		c.Next()
	}
}

func (h *AuthHandler) refreshIfNeeded(ctx context.Context, user *db_models.User) error {
	if !user.AccessTokenExpiresAt.IsZero() && time.Now().Before(user.AccessTokenExpiresAt.Add(-1*time.Minute)) {
		return nil
	}
	if user.RefreshToken == "" {
		return nil
	}
	refresh, err := decryptToken(user.RefreshToken)
	if err != nil {
		return fmt.Errorf("decrypt refresh token: %w", err)
	}
	src := oauth2Config.TokenSource(ctx, &oauth2.Token{RefreshToken: refresh})
	tok, err := src.Token()
	if err != nil {
		return fmt.Errorf("refresh: %w", err)
	}
	encAccess, err := encryptToken(tok.AccessToken)
	if err != nil {
		return err
	}
	encRefresh, err := encryptToken(tok.RefreshToken)
	if err != nil {
		return err
	}
	user.AccessToken = encAccess
	if tok.RefreshToken != "" {
		user.RefreshToken = encRefresh
	}
	user.AccessTokenExpiresAt = tok.Expiry
	_, err = h.DB.Model(user).
		Set("access_token = ?", user.AccessToken).
		Set("refresh_token = ?", user.RefreshToken).
		Set("access_token_expires_at = ?", user.AccessTokenExpiresAt).
		Where("id = ?", user.ID).
		Update()
	return err
}

func (h *AuthHandler) enforceSessionCap(userID int) error {
	var ids []int
	err := h.DB.Model((*db_models.Session)(nil)).
		Column("session_id").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(maxSessionsPerUser).
		Select(&ids)
	if err != nil || len(ids) == 0 {
		return err
	}
	_, err = h.DB.Model((*db_models.Session)(nil)).Where("session_id IN (?)", pg.In(ids)).Delete()
	return err
}

type flowState struct {
	State        string `json:"s"`
	Nonce        string `json:"n"`
	CodeVerifier string `json:"v"`
	Exp          int64  `json:"e"`
}

func signFlow(s flowState) (string, error) {
	payload, err := json.Marshal(s)
	if err != nil {
		return "", err
	}
	body := base64.RawURLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, flowSecret)
	mac.Write([]byte(body))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return body + "." + sig, nil
}

func verifyFlow(token string) (*flowState, error) {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return nil, errors.New("malformed flow token")
	}
	mac := hmac.New(sha256.New, flowSecret)
	mac.Write([]byte(parts[0]))
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(parts[1]), []byte(expected)) {
		return nil, errors.New("bad signature")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, err
	}
	var s flowState
	if err := json.Unmarshal(payload, &s); err != nil {
		return nil, err
	}
	if time.Now().Unix() > s.Exp {
		return nil, errors.New("flow expired")
	}
	return &s, nil
}

func newPKCE() (verifier, challenge string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	verifier = base64.RawURLEncoding.EncodeToString(b)
	sum := sha256.Sum256([]byte(verifier))
	challenge = base64.RawURLEncoding.EncodeToString(sum[:])
	return verifier, challenge, nil
}

func encryptToken(plain string) (string, error) {
	if plain == "" {
		return "", nil
	}
	block, err := aes.NewCipher(tokenSecret)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	ct := gcm.Seal(nonce, nonce, []byte(plain), nil)
	return base64.StdEncoding.EncodeToString(ct), nil
}

func decryptToken(encoded string) (string, error) {
	if encoded == "" {
		return "", nil
	}
	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(tokenSecret)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(raw) < gcm.NonceSize() {
		return "", errors.New("ciphertext too short")
	}
	nonce, ct := raw[:gcm.NonceSize()], raw[gcm.NonceSize():]
	plain, err := gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}
