# Swagger/OpenAPI Documentation

This project uses [swaggo/swag](https://github.com/swaggo/swag) to automatically generate OpenAPI/Swagger documentation from Go code annotations.

## Accessing the Documentation

Once the server is running, you can access the Swagger UI at:

**http://localhost:8000/swagger/index.html**

This provides an interactive API documentation interface where you can:
- Browse all available endpoints
- View request/response schemas
- Test API endpoints directly from the browser

## Adding Documentation to New Endpoints

To document a new API endpoint, add Swagger annotations above the handler function:

```go
// CreateItem godoc
// @Summary Create a new item
// @Description Create a new item with the provided details
// @Tags items
// @Accept json
// @Produce json
// @Param item body db.Item true "Item object"
// @Success 201 {object} db.Item
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /items [post]
func (h *Handler) CreateItem(c *gin.Context) {
    // handler implementation
}
```

### Common Annotation Tags

- `@Summary` - Short description of the endpoint
- `@Description` - Detailed description
- `@Tags` - Groups endpoints together in the UI
- `@Accept` - Content type the endpoint accepts (e.g., json, xml)
- `@Produce` - Content type the endpoint produces
- `@Param` - Parameter definition (name, location, type, required, description)
  - Path params: `@Param id path int true "Item ID"`
  - Query params: `@Param name query string false "Search query"`
  - Body params: `@Param item body db.Item true "Item object"`
- `@Success` - Success response (code, type, schema)
- `@Failure` - Error response (code, type, schema)
- `@Router` - Route path and HTTP method

## Regenerating Documentation

After adding or modifying Swagger annotations, regenerate the documentation files:

```bash
swag init -g main.go --output ./docs
```

This will update the files in the `docs/` directory:
- `docs.go` - Go code with embedded documentation
- `swagger.json` - OpenAPI specification in JSON format
- `swagger.yaml` - OpenAPI specification in YAML format

## File Structure

```
.
├── main.go                   # General API info (title, auth explanation)
├── api/
│   ├── *.go                  # Endpoint annotations above each handler
│   └── swagger_routes.go     # Doc-only entries for /users/{userId}/cart... (see below)
├── auth/
│   └── auth.go               # /auth/eduid/* login, callback, logout
├── api_objects/              # Request/response schemas
├── db_models/                # Data models used in API schemas
└── docs/                     # Generated Swagger files (do not edit by hand)
    ├── docs.go
    ├── swagger.json
    └── swagger.yaml
```

## Current API Documentation Status

All routes registered in `api/routes.go` are documented. Tags:

- **auth**: `/auth/eduid/login`, `/auth/eduid/callback`, `/auth/eduid/logout`, `GET /me`
- **cart**: `/me/cart...` and `POST /me/checkout` (instant checkout of a single item)
- **cart (by user)**: `/users/{userId}/cart...`, same as `/me/cart...` for another user (that user or admin)
- **requests / loans**: borrow requests, review, messages, loans
- **organisations, buildings, rooms, shelves, items, inventory, search, descriptions**

### Authentication in the docs

The API uses a session cookie (`user_session`) set by the Keycloak login, not a
header token. Swagger 2.0 can't describe cookie auth, so it is explained in the
general description (`main.go`) and per route:

- routes for the logged-in user document `401`,
- admin routes say "Admin only." and document `403`.

To try protected routes in Swagger UI, log in via `/auth/eduid/login` in the
same browser first; the cookie is then sent automatically.

### Why `api/swagger_routes.go` exists

The `/me/...` and `/users/{userId}/...` cart routes share handlers. Annotating a
handler with both routes would give the `/me` route a `userId` parameter it
doesn't have, so the handlers document the `/me` routes and
`swagger_routes.go` holds empty functions that only carry the docs for the
`/users/{userId}` variants. Keep both in sync when changing a cart handler.

## Tips

1. Always run `swag init` after modifying annotations (swag needs `go` on the PATH)
2. The `docs` package is imported in main.go with a blank identifier to ensure it's included in the build
3. Use consistent tag names to group related endpoints
4. Include example values in model structs using `example:"value"` tags
5. Document all possible response codes (success and errors)

## More Information

- [Swag Documentation](https://github.com/swaggo/swag)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Gin-Swagger](https://github.com/swaggo/gin-swagger)
