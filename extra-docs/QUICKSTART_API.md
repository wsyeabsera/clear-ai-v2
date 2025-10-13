# Quick Start Guide - Waste Management API

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js (v18+)
- ✅ Yarn package manager
- ✅ MongoDB installed

## Step-by-Step Setup

### 1. Install MongoDB (if not already installed)

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu/Debian:**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

**Windows:**
Download and install from: https://www.mongodb.com/try/download/community

### 2. Verify MongoDB is Running

```bash
# Check if MongoDB is running
mongosh --eval "db.version()"
```

If you see a version number, MongoDB is running! 🎉

### 3. Install Project Dependencies

```bash
cd /path/to/clear-ai-v2
yarn install
```

### 4. Build the Project

```bash
yarn build
```

### 5. Seed the Database

```bash
yarn seed
```

You should see:
```
✓ Inserted 10 facilities
✓ Inserted 12 shipments
✓ Inserted 8 contaminants
✓ Inserted 12 inspections
```

### 6. Start the API Server

```bash
yarn api:dev
```

You should see:
```
✓ Connected to MongoDB: mongodb://localhost:27017/wasteer
✓ Waste Management API server running on http://localhost:4000
✓ Health check: http://localhost:4000/health
✓ API endpoints: http://localhost:4000/api
```

### 7. Test the API with curl

Open a new terminal and try these commands:

```bash
# Health check
curl http://localhost:4000/health

# Get all shipments
curl http://localhost:4000/api/shipments

# Get shipments with contaminants
curl "http://localhost:4000/api/shipments?has_contaminants=true"

# Get all facilities
curl http://localhost:4000/api/facilities

# Get facilities in Hannover
curl "http://localhost:4000/api/facilities?location=Hannover"

# Get high-risk contaminants
curl "http://localhost:4000/api/contaminants-detected?risk_level=high"

# Get rejected inspections
curl "http://localhost:4000/api/inspections?status=rejected"
```

### 8. Start the MCP Server (Optional)

In another terminal:

```bash
yarn dev
```

The MCP tools will now connect to your local API at `http://localhost:4000/api`

## Testing the API

### Run All Tests

```bash
# Run all tests (requires MongoDB running)
yarn test

# Run only tool tests (no MongoDB required)
yarn test src/tests/tools

# Run only API tests (requires MongoDB running)
yarn test src/tests/api
```

### Run Tests in Watch Mode

```bash
yarn test:watch
```

### Run with Coverage

```bash
yarn test:coverage
```

## Common Commands

```bash
# Start API in development mode (with hot reload)
yarn api:dev

# Start API in production mode
yarn build && yarn api:start

# Reseed database (clears existing data)
yarn seed

# Start MCP server
yarn dev

# Run tests
yarn test

# Check for TypeScript errors
yarn lint
```

## Example API Operations

### Create a New Shipment

```bash
curl -X POST http://localhost:4000/api/shipments \
  -H "Content-Type: application/json" \
  -d '{
    "id": "S100",
    "facility_id": "F1",
    "date": "2025-10-15",
    "status": "pending",
    "weight_kg": 1500,
    "has_contaminants": false,
    "origin": "Hamburg",
    "destination": "Hannover"
  }'
```

### Update a Shipment

```bash
curl -X PUT http://localhost:4000/api/shipments/S100 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "delivered",
    "weight_kg": 1600
  }'
```

### Get a Single Shipment

```bash
curl http://localhost:4000/api/shipments/S100
```

### Delete a Shipment

```bash
curl -X DELETE http://localhost:4000/api/shipments/S100
```

## Troubleshooting

### MongoDB Connection Error

**Problem:** `Failed to connect to MongoDB`

**Solution:**
```bash
# Check if MongoDB is running
brew services list | grep mongodb  # macOS
systemctl status mongod           # Linux

# Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongod           # Linux
```

### Port 4000 Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::4000`

**Solution:**
```bash
# Find what's using port 4000
lsof -ti:4000

# Kill the process
kill -9 $(lsof -ti:4000)

# Or change the port in .env
echo "API_PORT=4001" >> .env
```

### Tests Failing

**Problem:** API tests fail with connection errors

**Solution:**
Make sure MongoDB is running before running tests:
```bash
brew services start mongodb-community  # macOS
yarn test
```

### Clear Database

If you want to start fresh:
```bash
# Connect to MongoDB
mongosh

# Switch to database
use wasteer

# Drop database
db.dropDatabase()

# Exit
exit

# Reseed
yarn seed
```

## Development Workflow

### Typical Development Session

**Terminal 1 - API Server:**
```bash
yarn api:dev
# Leave running
```

**Terminal 2 - MCP Server:**
```bash
yarn dev
# Leave running
```

**Terminal 3 - Testing:**
```bash
# Test with curl
curl http://localhost:4000/api/shipments

# Or run tests
yarn test:watch
```

### Making Changes

1. Edit code in `src/api/`
2. API server automatically reloads (if using `yarn api:dev`)
3. Test your changes with curl or tests
4. Restart MCP server if needed

## What's Next?

Now that your API is running:

1. ✅ Explore endpoints with curl (see `API.md` for all endpoints)
2. ✅ Try the MCP tools with `yarn dev`
3. ✅ Run the test suite with `yarn test`
4. ✅ Create your own test data using POST/PUT endpoints
5. ✅ Start building LangGraph agents that use the MCP tools

## Full Documentation

- **API.md** - Complete API reference with all endpoints
- **WASTE_API_IMPLEMENTATION.md** - Implementation details
- **README.md** - Project overview

## Getting Help

If you encounter issues:
1. Check MongoDB is running: `mongosh --eval "db.version()"`
2. Check API is running: `curl http://localhost:4000/health`
3. Check logs in terminal where API is running
4. Review error messages carefully

---

**You're all set!** 🚀

The Waste Management API is now running and ready to use.

