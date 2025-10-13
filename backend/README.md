# BACKEND 2025

A Go-based backend API for an inventory management system ("lagertool") with integrated Slack bot for borrowing items.

## Features

- RESTful API for managing inventory items, locations, persons, and loans
- PostgreSQL database with go-pg ORM
- Slack bot integration for conversational item borrowing
- Interactive date picker support via Slack
- Fuzzy search for inventory items
- Auto-generated Swagger/OpenAPI documentation
- CORS-enabled for frontend integration

## Quick Start

### Prerequisites

- Go 1.25+
- Docker and Docker Compose (for PostgreSQL)
- Slack App with Bot Token (optional, for Slack integration)

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

# Slack Configuration (optional)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token

# Application Configuration
APP_PORT=8000
```

## API Documentation

Full API documentation is available via Swagger UI at:
```
http://localhost:8000/swagger/index.html
```

### Main Endpoints

#### Inventory Management
- `GET /items` - List all items
- `GET /items/search?name=<query>` - Search items by name
- `GET /inventory` - List all inventory records (items with locations)
- `GET /search?search_term=<query>` - Fuzzy search across inventory

#### Locations
- `GET /locations` - List all locations
- `POST /locations` - Create a new location

#### Persons
- `GET /persons` - List all persons
- `GET /persons/search` - Search persons by email, firstname, or lastname

#### Loans
- `GET /loans` - List all loans
- `GET /loans/overdue` - Get overdue loans
- `GET /borrows` - Get loans with person details
- `GET /borrows_count` - Get total count of borrows

#### Slack Integration
- `POST /slack/events` - Slack Events API webhook
- `POST /slack/interactivity` - Slack Interactive Components webhook

## Slack Bot Integration

### Setup

1. Create a Slack App at https://api.slack.com/apps
2. Enable the following features:
   - **Event Subscriptions**: Subscribe to `message.im` events
   - **Interactive Components**: Enable and set Request URL to `https://your-domain/slack/interactivity`
   - **Bot Token Scopes**:
     - `chat:write`
     - `im:history`
     - `users:read`

3. Install the app to your workspace and copy the Bot Token
4. Set `SLACK_BOT_TOKEN` in your `.env` file
5. Configure the Event Subscriptions Request URL to `https://your-domain/slack/events`

### How to Use

1. Open a direct message with the bot in Slack
2. Send any message to start the borrowing flow
3. Follow the conversational prompts:
   - **Item**: Name of the item to borrow
   - **Quantity**: How many items you need
   - **Location**: Where to borrow from (format: "Campus Building Room")
   - **Due Date**: Use the interactive date picker to select a return date
4. The bot will confirm and record your borrow in the database

### Slack Bot Architecture

The Slack integration uses:
- **Session-based conversation flow** with in-memory state management
- **Event API** for receiving messages
- **Interactive Components** for date picker functionality
- **Automatic person creation** from Slack usernames

## Development

### Project Structure

```
.
├── main.go              # Application entry point
├── api/
│   ├── routes.go        # Route definitions
│   ├── handlers.go      # HTTP request handlers
│   └── localhandlers.go # Helper functions
├── db/
│   ├── database.go      # Database connection
│   ├── models.go        # Data models
│   ├── slackrequests.go # Slack-specific DB operations
│   └── testdata.go      # Test data insertion
├── slack1/
│   └── slack.go         # Slack client and session management
├── config/
│   └── config.go        # Configuration management
├── util/
│   └── fuzzyfind.go     # Fuzzy search utilities
└── docs/                # Auto-generated Swagger docs
```

### Database Schema

- **location**: Physical locations (campus, building, room, shelf, shelf unit)
- **item**: Inventory items with names and categories
- **inventory**: Junction table linking items to locations with quantities
- **person**: People who can borrow items (includes slack_id for Slack users)
- **loans**: Borrow records (person_id, item_id, amount, begin, until dates)

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

### Slack Date Picker Not Working

**Problem**: After selecting a date in Slack, nothing happens.

**Solution**: This was caused by the `/slack/interactivity` route not being connected to the handler. Ensure `routes.go` has:
```go
r.POST("/slack/interactivity", h.Interactivity)
```

### Database Connection Issues

- Verify PostgreSQL is running: `docker-compose ps`
- Check database credentials in `.env`
- Ensure database is initialized: `docker-compose up -d`

### Slack Bot Not Responding

- Verify `SLACK_BOT_TOKEN` is set correctly
- Check Slack App event subscriptions are configured
- Ensure the bot is installed in your workspace
- Check server logs for authentication errors

## License

MIT

## Contributing

For detailed development guidelines, see [CLAUDE.md](./CLAUDE.md)
