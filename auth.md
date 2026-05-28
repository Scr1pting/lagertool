# AUTH — What's Missing (VIS / VSETH Keycloak)

Summary of gaps in the current authentication setup. The backend has an OIDC skeleton against the VSETH Keycloak realm; sections 2 and 3 have just been fixed in this branch, but the multi-tenant, frontend, CORS and operational gaps remain.

Files looked at:
- `backend/auth/auth.go`
- `backend/api/routes.go`
- `backend/main.go`
- `backend/config/config.go`
- `backend/db_models/models.go`
- `frontend/src/App.tsx`, `frontend/src/pages/Login.tsx`
- `frontend/.env.development`

---

## 1. Configuration / multi-tenant (VIS *and* VSETH)

- Only **one** Keycloak realm is supported. `backend/auth/auth.go` hardcodes the VSETH realm as the default issuer. VIS needs either its own realm or, more likely, a way to pick the realm per request/organisation. There is no concept of "which org am I logging into" anywhere in the OAuth flow.
- The default issuer URL still points at `keycloak-fake.vis.ethz.ch` — needs to be replaced with the real VIS/VSETH Keycloak hosts (set via `OIDC_ISSUER_URL`).
- `clientID` / `clientSecret` are read from `VSETH_CLIENT_ID` / `VSETH_CLIENT_SECRET` only — no `VIS_*` counterpart.
- None of these values are pulled through `config.Config` — `config/config.go` doesn't know about auth at all. Should be moved into the config struct so they can be set per environment.
- Cookie attributes now come from env (`COOKIE_DOMAIN`, `COOKIE_SECURE`) but they are still single-valued — there's no per-tenant cookie scoping yet.

## 2. OIDC flow — ✅ fixed in this branch

- **`init()` shadowing of `oidcProvider`** — now uses `=` so the package-level var is populated.
- **OAuth `state` validation** — Redis removed. Flow state (state + nonce + PKCE verifier + exp) is now packed into an HMAC-signed cookie (`oauth_flow`, `SESSION_SECRET`), set on `/login` and verified on `/callback`. The cookie is single-use: it's cleared immediately on callback entry.
- **Flow lifetime** is now 10 minutes (cookie MaxAge + signed `exp`).
- **`using_auth` default flipped to `true`** in `main.go` so deployments are protected by default.
- **Nonce check** — login generates a nonce, passes it via `oidc.Nonce(...)`, and the callback aborts if `idToken.Nonce != flow.Nonce`.
- **PKCE (S256)** — login generates a 32-byte verifier + SHA256 challenge; callback exchanges with `code_verifier`.
- **Refresh tokens are now used** — `refreshIfNeeded` runs in `AuthMiddleware`, refreshes the access token via `oauth2Config.TokenSource` when within a minute of expiry, and persists the new tokens.
- **Tokens encrypted at rest** — access/refresh/id tokens are AES-GCM encrypted with `TOKEN_ENCRYPTION_KEY` before being written to `user` / `session`.

## 3. Sessions — ✅ fixed in this branch

- **Session lifetime** is now a `sessionLifetime = 24h` constant. The cookie MaxAge and DB `expires_at` are derived from it (no more `lifetime := 1` ambiguity).
- **Sliding renewal** — once a session is older than `sessionSlideAfter` (12h) and still valid, every authenticated request extends `expires_at` by another 24h and re-sets the cookie.
- **Background cleanup** — `AuthHandler.StartSessionCleanup(ctx)` is launched from `main.go` and deletes rows where `expires_at < now()` every hour.
- **RP-initiated logout** — provider discovery now reads `end_session_endpoint`. `LogoutHandler` deletes the local session and redirects to Keycloak's end-session endpoint with `id_token_hint` (decrypted from the stored session) and `post_logout_redirect_uri`.
- **Device tracking + cap** — `Session.UserAgent` is recorded; `enforceSessionCap` keeps only the `maxSessionsPerUser = 5` most recent sessions per user.

> Schema note: the `user` and `session` tables gained columns (`access_token_expires_at`, `user_agent`, `id_token`). `InitDB` uses `IfNotExists`, so existing databases need either a fresh init or a migration to pick these up.

## 4. Authorisation (roles / permissions)

- `db_models.HasSpecialRightsFor` exists but is **not used by any middleware or handler**. Every authenticated user can hit every protected endpoint.
- Keycloak group/role claims (`realm_access.roles`, `resource_access`, VSETH organisation memberships) are not extracted from the ID token. The `claims` struct in `auth.go` only pulls `sub`, `name`, `email`.
- No middleware like `RequireRole("admin")` or `RequireOrgMember(orgId)`. The borrow-request review endpoints in particular need this.
- No mapping from Keycloak groups → `organisation` rows in the DB.

## 5. Frontend

- **There is no real login flow.** `frontend/src/pages/Login.tsx` is a static page with a `<Button>` that has no `onClick`. It does not redirect to `/auth/eduid/login`.
- Gating is done via `VITE_IS_LOGGED_IN` (`App.tsx:29`), a *build-time* env var. `.env.development` has it set to `true`, meaning dev builds skip the login page entirely and assume the user is authenticated.
- No `/me` endpoint exists on the backend, and the frontend never fetches the current user. There is no way to know who is logged in, render their name, or check their role on the client.
- `fetch` calls in `frontend/src/hooks/**` do not set `credentials: "include"`, so the `user_session` cookie is **not sent** with API requests. Every protected call will 401 now that `using_auth` defaults to true.
- No global "401 → redirect to login" handler.
- No logout button wired to `/auth/eduid/logout`.

## 6. CORS / cookies

- `main.go` sets `AllowOrigins: ["*"]` **together with** `AllowCredentials: true`. Browsers reject this combination — credentials won't be sent. The allowed origin must be the actual frontend URL (e.g. `https://lagertool.ch`).
- The session and oauth-flow cookies are now set with `SameSite=Lax` explicitly. For a cross-site SPA + API setup we likely need `SameSite=None; Secure` instead — needs a deployment-shape decision.
- No CSRF token for state-changing requests. Session is a cookie, so any logged-in user is vulnerable to CSRF on POST/PUT/DELETE unless we either switch to `Authorization: Bearer` or add CSRF tokens.

## 7. Operational

- OIDC discovery happens in `init()` and `log.Fatalf`s on failure. If Keycloak is briefly unreachable at startup the app refuses to boot. Should retry / lazy-init.
- No rate limiting on `/auth/eduid/login` or `/auth/eduid/callback`.
- No structured logging or audit trail for logins/logouts/failed validations.
- No tests covering the auth package (`backend/auth/` has only `auth.go`).
- Health/readiness checks don't include Keycloak reachability.
- `SESSION_SECRET` and `TOKEN_ENCRYPTION_KEY` fall back to a derived dev default if unset — fine for local dev, but production must set them to real base64-encoded 32-byte keys.

---

## Suggested order of remaining work

1. ~~Fix the broken-by-default OIDC pieces.~~ ✅ done
2. ~~Session lifetime, sliding renewal, cleanup, RP-initiated logout, device cap.~~ ✅ done
3. Move auth config (issuer, client id/secret, redirect, cookie domain, secrets) into `config.Config` and add per-realm entries for VIS and VSETH.
4. Wire the frontend: real `Login.tsx` redirect, `credentials: "include"` on all fetches, `/me` endpoint, logout button, remove `VITE_IS_LOGGED_IN`.
5. Add role/group extraction from Keycloak claims and a `RequireRole` / `RequireOrgMember` middleware backed by `HasSpecialRightsFor`.
6. CORS: replace wildcard origin with the real frontend URL; revisit `SameSite` once the deployment shape is known.
7. CSRF tokens (or move to `Authorization: Bearer`).
