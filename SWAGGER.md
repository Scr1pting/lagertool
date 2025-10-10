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
├── main.go              # Contains main API info annotations
├── api/
│   └── handlers.go      # Contains endpoint annotations
├── docs/                # Generated Swagger files (auto-generated)
│   ├── docs.go
│   ├── swagger.json
│   └── swagger.yaml
└── db/
    └── models.go        # Data models used in API schemas
```

## Current API Documentation Status

The following endpoints are currently documented:

### Locations
- GET /locations - Get all locations
- GET /locations/{id} - Get location by ID
- POST /locations - Create a new location
- PUT /locations/{id} - Update a location
- DELETE /locations/{id} - Delete a location

### Items
- GET /items - Get all items
- GET /items/{id} - Get item by ID
- GET /items/search - Search items by name
- POST /items - Create a new item

**Note**: Additional endpoints exist but are not yet fully documented. You can add annotations following the same pattern shown above.

## Tips

1. Always run `swag init` after modifying annotations
2. The `docs` package is imported in main.go with a blank identifier to ensure it's included in the build
3. Use consistent tag names to group related endpoints
4. Include example values in model structs using `example:"value"` tags
5. Document all possible response codes (success and errors)

## More Information

- [Swag Documentation](https://github.com/swaggo/swag)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Gin-Swagger](https://github.com/swaggo/gin-swagger)
