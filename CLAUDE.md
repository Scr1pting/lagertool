# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Go-based backend API for an inventory management system ("lagertool"). It tracks items, locations, consumables, and loans using a PostgreSQL database. The application uses the Gin web framework and go-pg ORM.

## Technology Stack

- **Language**: Go 1.25
- **Web Framework**: Gin (github.com/gin-gonic/gin)
- **Database**: PostgreSQL 15 (accessed via go-pg/pg/v10)
- **Module Path**: `lagertool.com/main`

## Development Commands

### Running the Application

```bash
# Run the main application
go run dummyserv.go

# The server starts on http://localhost:8080
```

### Database

```bash
# Start PostgreSQL via Docker Compose
docker-compose up -d

# Stop the database
docker-compose down

# Database connection details (from docker-compose.yml):
# - Host: localhost
# - Port: 5432
# - User: postgres
# - Password: example
# - Database: appdb
```

**Note**: The current database connection code in `db/database.go:20-28` uses hardcoded credentials that differ from docker-compose.yml. The code connects to database "postgres" with password "12345678", while docker-compose creates database "appdb" with password "example". This needs to be reconciled.

### Building

```bash
# Build the binary
go build -o main .

# Build with Docker (multi-stage build)
docker build -t viscon-backend .
```

### Testing

```bash
# Run all tests
go test ./...

# Run tests for a specific package
go test ./api
go test ./db

# Run tests with coverage
go test -cover ./...
```

**Note**: Currently there are no test files in the codebase.

### Dependency Management

```bash
# Download dependencies
go mod download

# Tidy up dependencies
go mod tidy

# Add a new dependency
go get github.com/package/name
```

## Architecture

### Project Structure

```
.
├── dummyserv.go       # Main entry point, initializes DB and HTTP server
├── api/               # HTTP handlers and routing
│   ├── routes.go      # Route definitions
│   └── handlers.go    # Request handlers
└── db/                # Database layer
    ├── database.go    # Connection setup and initialization
    └── models.go      # Data models (Location, Item, Consumable, etc.)
```

### Database Schema

The system uses a relational model with the following entities:

- **Location**: Physical locations (campus, building, room) with coordinates
- **Item**: Base inventory items with names
- **Consumable**: Items with expiry dates (inherits from Item via FK)
- **Permanent**: Durable items (inherits from Item via FK)
- **IsIn**: Junction table tracking which items are in which locations (with amount and notes)
- **Person**: People who can borrow items
- **Loans**: Records of items loaned to people

**Important**: The models use a pseudo-inheritance pattern where `Consumable` and `Permanent` have IDs that reference `Item.ID`, though this is not explicitly enforced as foreign keys in the current schema.

### Request Flow

1. **dummyserv.go** initializes the database connection and creates a Gin router
2. **api.SetupRoutes()** registers all HTTP endpoints with the router
3. **api.Handler** methods (in handlers.go) process requests, interact with the database, and return JSON responses
4. All database queries use go-pg ORM methods

### API Endpoints

#### Locations
- `GET /locations` - List all locations
- `GET /locations/:id` - Get a specific location
- `POST /locations` - Create a new location

#### Items
- `GET /items/search?name=<query>` - Search items by name (case-insensitive)
- `POST /items/` - Create a new item
- `PUT /update/amount/:item_id/:location_id/:new_amount` - Update item quantity (TODO)
- `PUT /update/move/:item_id/:location_id/:new_location_id` - Move item to new location (TODO)

#### Consumables
- `GET /consumables/expired` - Get consumables past their expiry date

### Database Connection Pattern

The database connection is managed at the application level:
- Connection is created in `main()` via `db.NewDBConn()`
- Connection is passed to handlers via dependency injection
- Connection is closed with a deferred function in `main()`
- The `db.InitDB()` function can create all tables but is not currently called from main

## Important Notes

### Incomplete Features

The following handler functions are defined but not implemented:
- `UpdateItemAmount` in api/handlers.go:114
- `MoveItem` in api/handlers.go:118

### Configuration Issues

- Database credentials are hardcoded in `db/database.go` and don't match `docker-compose.yml`
- No environment variable configuration exists
- The constants at the top of `db/database.go:12-18` are defined but not used

### Database Initialization

The `db.InitDB()` function exists but is never called. To set up tables on first run, this function should be invoked after establishing the database connection in `main()`.

### Field Name Inconsistencies

In `db/models.go:13-14`, the `Location` struct has JSON field names "latitude"/"longitude" but the fields are named `Lon`/`Lat`, and the pg tags also say "latitude"/"longitude". This may cause confusion.
