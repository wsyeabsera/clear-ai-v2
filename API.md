# Waste Management API Documentation

A RESTful API for managing waste management operations including shipments, facilities, contaminants, and inspections.

## Table of Contents

- [Setup](#setup)
- [Running the API](#running-the-api)
- [API Endpoints](#api-endpoints)
  - [Shipments](#shipments)
  - [Facilities](#facilities)
  - [Contaminants](#contaminants)
  - [Inspections](#inspections)
  - [Analytics](#analytics)
- [Testing](#testing)

## Setup

### Prerequisites

- Node.js (v18+)
- MongoDB (v6+)
- Yarn package manager

### MongoDB Installation

#### macOS (using Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

#### Ubuntu/Debian
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

#### Windows
Download and install from [MongoDB Download Center](https://www.mongodb.com/try/download/community)

### MongoDB Compass (Optional GUI)
Download from [MongoDB Compass](https://www.mongodb.com/products/compass)

### Project Setup

1. **Install dependencies:**
```bash
yarn install
```

2. **Configure environment variables:**
Create a `.env` file in the project root:
```bash
# API Configuration
API_PORT=4000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/wasteer

# MCP Tools Configuration
WASTEER_API_URL=http://localhost:4000/api
```

3. **Build the project:**
```bash
yarn build
```

4. **Seed the database with test data:**
```bash
yarn seed
```

## Running the API

### Development Mode (with auto-reload)
```bash
yarn api:dev
```

### Production Mode
```bash
yarn build
yarn api:start
```

The API will be available at `http://localhost:4000`

### Health Check
```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Waste Management API is running",
  "timestamp": "2025-10-11T12:00:00.000Z"
}
```

## API Endpoints

All endpoints are prefixed with `/api` and return JSON responses.

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "details": { ... }
  }
}
```

---

## Shipments

Manage waste shipments between facilities.

### List Shipments
```bash
# Get all shipments
curl http://localhost:4000/api/shipments

# Filter by date range
curl "http://localhost:4000/api/shipments?date_from=2025-10-01&date_to=2025-10-10"

# Filter by facility
curl "http://localhost:4000/api/shipments?facility_id=F1"

# Filter by status
curl "http://localhost:4000/api/shipments?status=delivered"

# Filter by contamination status
curl "http://localhost:4000/api/shipments?has_contaminants=true"

# Limit results
curl "http://localhost:4000/api/shipments?limit=10"

# Combined filters
curl "http://localhost:4000/api/shipments?date_from=2025-10-01&status=delivered&has_contaminants=true"
```

### Get Single Shipment
```bash
curl http://localhost:4000/api/shipments/S1
```

### Create Shipment
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

### Update Shipment
```bash
curl -X PUT http://localhost:4000/api/shipments/S100 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_transit",
    "weight_kg": 1600
  }'
```

### Delete Shipment
```bash
curl -X DELETE http://localhost:4000/api/shipments/S100
```

---

## Facilities

Manage waste management facilities.

### List Facilities
```bash
# Get all facilities
curl http://localhost:4000/api/facilities

# Filter by location
curl "http://localhost:4000/api/facilities?location=Hannover"

# Filter by type
curl "http://localhost:4000/api/facilities?type=sorting"

# Filter by minimum capacity
curl "http://localhost:4000/api/facilities?min_capacity=500"

# Filter by specific IDs
curl "http://localhost:4000/api/facilities?ids=F1,F2,F3"

# Combined filters
curl "http://localhost:4000/api/facilities?location=Berlin&type=processing"
```

### Get Single Facility
```bash
curl http://localhost:4000/api/facilities/F1
```

### Create Facility
```bash
curl -X POST http://localhost:4000/api/facilities \
  -H "Content-Type: application/json" \
  -d '{
    "id": "F100",
    "name": "Test Sorting Center",
    "location": "Hamburg",
    "type": "sorting",
    "capacity_tons": 650,
    "current_load_tons": 200,
    "coordinates": {
      "lat": 53.5511,
      "lon": 9.9937
    }
  }'
```

### Update Facility
```bash
curl -X PUT http://localhost:4000/api/facilities/F100 \
  -H "Content-Type: application/json" \
  -d '{
    "capacity_tons": 750,
    "current_load_tons": 250
  }'
```

### Delete Facility
```bash
curl -X DELETE http://localhost:4000/api/facilities/F100
```

---

## Contaminants

Track detected contaminants in shipments.

### List Contaminants
```bash
# Get all contaminants
curl http://localhost:4000/api/contaminants-detected

# Filter by shipment IDs
curl "http://localhost:4000/api/contaminants-detected?shipment_ids=S2,S4"

# Filter by facility
curl "http://localhost:4000/api/contaminants-detected?facility_id=F2"

# Filter by date range
curl "http://localhost:4000/api/contaminants-detected?date_from=2025-10-01T00:00:00Z&date_to=2025-10-10T23:59:59Z"

# Filter by type
curl "http://localhost:4000/api/contaminants-detected?type=Lead"

# Filter by risk level
curl "http://localhost:4000/api/contaminants-detected?risk_level=high"

# Combined filters
curl "http://localhost:4000/api/contaminants-detected?risk_level=high&type=Lead"
```

### Get Single Contaminant
```bash
curl http://localhost:4000/api/contaminants-detected/C1
```

### Create Contaminant Detection
```bash
curl -X POST http://localhost:4000/api/contaminants-detected \
  -H "Content-Type: application/json" \
  -d '{
    "id": "C100",
    "shipment_id": "S1",
    "facility_id": "F1",
    "type": "Lead",
    "concentration_ppm": 125,
    "risk_level": "high",
    "detected_at": "2025-10-15T10:30:00Z",
    "notes": "Above threshold, requires monitoring"
  }'
```

### Update Contaminant
```bash
curl -X PUT http://localhost:4000/api/contaminants-detected/C100 \
  -H "Content-Type: application/json" \
  -d '{
    "risk_level": "critical",
    "notes": "Risk assessment escalated"
  }'
```

### Delete Contaminant
```bash
curl -X DELETE http://localhost:4000/api/contaminants-detected/C100
```

---

## Inspections

Manage shipment inspections and their results.

### List Inspections
```bash
# Get all inspections
curl http://localhost:4000/api/inspections

# Filter by date range
curl "http://localhost:4000/api/inspections?date_from=2025-10-01&date_to=2025-10-10"

# Filter by status
curl "http://localhost:4000/api/inspections?status=rejected"

# Filter by facility
curl "http://localhost:4000/api/inspections?facility_id=F1"

# Filter by shipment
curl "http://localhost:4000/api/inspections?shipment_id=S1"

# Filter inspections with risk contaminants
curl "http://localhost:4000/api/inspections?has_risk_contaminants=true"

# Combined filters
curl "http://localhost:4000/api/inspections?status=rejected&has_risk_contaminants=true"
```

### Get Single Inspection
```bash
curl http://localhost:4000/api/inspections/I1
```

### Create Inspection
```bash
curl -X POST http://localhost:4000/api/inspections \
  -H "Content-Type: application/json" \
  -d '{
    "id": "I100",
    "shipment_id": "S1",
    "facility_id": "F1",
    "date": "2025-10-15",
    "status": "accepted",
    "inspector": "John Doe",
    "notes": "Clean shipment, no issues",
    "contaminants_detected": [],
    "risk_assessment": "Low risk"
  }'
```

### Update Inspection
```bash
curl -X PUT http://localhost:4000/api/inspections/I100 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "rejected",
    "notes": "Contamination detected after re-inspection",
    "contaminants_detected": ["Lead"],
    "risk_assessment": "High risk"
  }'
```

### Delete Inspection
```bash
curl -X DELETE http://localhost:4000/api/inspections/I100
```

---

## Testing

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run with coverage
yarn test:coverage

# Run only API tests
yarn test src/tests/api
```

### Test Database

Tests use a separate test database (`wasteer-test`) that is automatically cleaned before each test run.

Configure the test database URI in your environment:
```bash
MONGODB_TEST_URI=mongodb://localhost:27017/wasteer-test
```

---

## Integration with MCP Tools

The MCP (Model Context Protocol) tools automatically connect to this API when running the MCP server:

```bash
# Start the API server (in one terminal)
yarn api:dev

# Start the MCP server (in another terminal)
yarn dev
```

The MCP tools will use the GET endpoints to query data for AI agent operations.

---

## Data Model

### Shipment
```typescript
{
  id: string;
  facility_id: string;
  date: string;  // ISO 8601 date
  status: "pending" | "in_transit" | "delivered" | "rejected";
  weight_kg: number;
  has_contaminants: boolean;
  origin?: string;
  destination?: string;
  waste_type?: string;  // e.g., "plastic", "metal", "paper", "industrial"
  waste_code?: string;  // Waste classification code
  carrier?: string;  // Transport company name
  composition_notes?: string;  // Description of waste composition
}
```

### Facility
```typescript
{
  id: string;
  name: string;
  location: string;
  type: "sorting" | "processing" | "disposal";
  capacity_tons: number;
  current_load_tons?: number;
  coordinates?: {
    lat: number;
    lon: number;
  };
  accepted_waste_types?: string[];  // Types of waste this facility accepts
  rejected_waste_types?: string[];  // Types of waste this facility rejects
  contact_email?: string;
  contact_phone?: string;
  operating_hours?: string;
}
```

### Contaminant
```typescript
{
  id: string;
  shipment_id: string;
  facility_id?: string;
  type: string;  // e.g., "Lead", "Mercury", "Plastic"
  concentration_ppm: number;
  risk_level: "low" | "medium" | "high" | "critical";
  detected_at: string;  // ISO 8601 datetime
  notes?: string;
  analysis_notes?: string;  // Detailed analysis notes
  waste_item_detected?: string;  // Specific waste item that was detected
  explosive_level?: "low" | "medium" | "high";
  so2_level?: "low" | "medium" | "high";  // Sulfur dioxide level
  hcl_level?: "low" | "medium" | "high";  // Hydrogen chloride level
  estimated_size?: number;  // Estimated size/volume
}
```

### Inspection
```typescript
{
  id: string;
  shipment_id: string;
  facility_id: string;
  date: string;  // ISO 8601 date
  status: "accepted" | "rejected" | "pending";
  inspector: string;
  notes?: string;
  contaminants_detected?: string[];
  risk_assessment?: string;
  inspection_type?: "arrival" | "processing" | "departure" | "random";
  duration_minutes?: number;  // How long the inspection took
  passed?: boolean;  // Quick status indicator
  follow_up_required?: boolean;  // Whether follow-up action is needed
  photos?: string[];  // URLs to inspection photos
}
```

---

## Analytics

### GET /api/analytics/contamination-rate

Get overall contamination statistics across all shipments.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_shipments": 12,
    "contaminated_shipments": 4,
    "clean_shipments": 8,
    "contamination_rate_percent": 33.33,
    "risk_level_distribution": {
      "high": 3,
      "medium": 2,
      "critical": 1,
      "low": 2
    }
  }
}
```

### GET /api/analytics/facility-performance

Get facility performance metrics including acceptance and rejection rates.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "facility_id": "F1",
      "facility_name": "Hannover Sorting Center",
      "location": "Hannover",
      "total_inspections": 2,
      "accepted": 1,
      "rejected": 0,
      "pending": 1,
      "acceptance_rate_percent": 50
    }
  ],
  "count": 10
}
```

### GET /api/analytics/waste-type-distribution

Get waste type distribution statistics.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "waste_type": "plastic",
      "shipment_count": 1,
      "total_weight_kg": 1500,
      "contaminated_count": 0,
      "contamination_rate_percent": 0
    }
  ],
  "count": 3
}
```

### GET /api/analytics/risk-trends

Get contaminant risk trends over time.

**Query Parameters:**
- `days` (optional): Number of days to look back (default: 30)

**Example:**
```bash
curl "http://localhost:4000/api/analytics/risk-trends?days=30"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period_days": 30,
    "start_date": "2025-09-11",
    "trends": [
      {
        "date": "2025-10-01",
        "low": 0,
        "medium": 0,
        "high": 2,
        "critical": 0,
        "total": 2
      }
    ]
  }
}
```

---

## Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (duplicate ID)
- `500` - Internal Server Error

---

## Support

For issues or questions, please refer to the project README or create an issue in the repository.

