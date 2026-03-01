
# BACKEND 2025

A Go-based backend API for an inventory management system ("lagertool") that tracks items, locations, and loans.

## Features

- RESTful API for managing organisations, inventory, carts, loans, and requests
- PostgreSQL database with go-pg ORM
- EduID (OIDC) authentication
- Request messaging system for borrow request communication
- Auto-generated Swagger/OpenAPI documentation
- CORS-enabled for frontend integration

## Quick Start

### Prerequisites

- Go 1.25+
- Docker and Docker Compose (for PostgreSQL)

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env` and configure environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start the PostgreSQL database:
   ```bash
   docker-compose up -d
   ```

4. Install Go dependencies:
   ```bash
   go mod download
   ```

5. Run the application:
   ```bash
   go run main.go
   ```

The server will start on `http://localhost:8000`

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=example
DB_NAME=appdb

# Application Configuration
APP_PORT=8000
```

## API Documentation

Full API documentation is available via Swagger UI at:
```
http://localhost:8000/swagger/index.html
```

### Endpoints Overview

#### Resources
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/organisations` | List all organisations |
| `GET` | `/organisations/:orgId/buildings` | List buildings for an organisation |
| `GET` | `/organisations/:orgId/rooms` | List rooms for an organisation |
| `GET` | `/organisations/:orgId/shelves` | List shelves for an organisation |
| `GET` | `/organisations/:orgId/inventory?start=X&end=X` | List inventory for an organisation |

#### Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/organisations/:orgId/items/:id?start=X&end=X` | Get a specific inventory item |
| `POST` | `/organisations/:orgId/items` | Create a new inventory item |
| `PUT` | `/organisations/:orgId/items/:id` | Update an inventory item |

#### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/:userId/cart?start=X&end=X` | Get a user's shopping cart |
| `POST` | `/users/:userId/cart/items` | Add an item to the cart |
| `POST` | `/users/:userId/cart/checkout` | Checkout the cart (creates requests) |

#### Loans & Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/loans/:id` | Update a loan (e.g. mark as returned) |
| `PUT` | `/requests/:id` | Update a request status |
| `POST` | `/requests/:id/review` | Review/approve/deny a request |
| `GET` | `/requests/:id/messages` | Get messages for a request |
| `POST` | `/requests/:id/messages` | Post a message to a request |

#### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/eduid/login` | Initiate EduID login |
| `GET` | `/auth/eduid/callback` | EduID OAuth callback |

## Development

### Project Structure

```
.
├── main.go                # Application entry point
├── api/
│   ├── routes.go          # Route definitions
│   ├── handlers.go        # GET request handlers
│   ├── post_handlers.go   # POST request handlers
│   ├── update_handlers.go # PUT request handlers
│   ├── handlers_output_sorted_by_date.go # Org-scoped resource handlers
│   ├── utils.go           # Helper functions
│   └── handlers_test.go   # API tests
├── api_objects/
│   ├── request_objects.go  # Request DTOs
│   └── response_objects.go # Response DTOs
├── auth/
│   └── auth.go            # EduID OIDC authentication
├── db/
│   ├── database.go        # Database connection & init
│   ├── database_create.go # Create operations
│   ├── database_update.go # Update operations
│   └── testdata.go        # Test data insertion
├── db_models/
│   └── models.go          # Data models
├── config/
│   └── config.go          # Configuration management
├── util/
│   └── fuzzyfind.go       # Fuzzy search utilities
└── docs/                  # Auto-generated Swagger docs
```

### Database Schema

- **organisation**: Organisations that own shelves
- **user**: User accounts (EduID-linked)
- **building**: Physical buildings (name, campus, GPS)
- **room**: Rooms within buildings
- **shelf**: Storage shelves owned by organisations
- **column** / **shelf_unit**: Shelf structure (columns containing units)
- **item**: Product templates (name, consumable flag)
- **inventory**: Physical inventory instances (item + location + amount)
- **shopping_cart** / **shopping_cart_item**: User shopping carts
- **request** / **request_items**: Loan/borrow requests
- **request_review**: Admin review/approval of requests
- **user_request_message**: Chat messages on requests
- **loans**: Active loan tracking
- **consumed**: Consumed item tracking

### Running Tests

```bash
go test ./...
```

### Updating Swagger Documentation

After modifying API handlers:

```bash
swag init
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `docker-compose ps`
- Check database credentials in `.env`
- Ensure database is initialized: `docker-compose up -d`

## License

MIT
