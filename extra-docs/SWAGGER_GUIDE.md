# Swagger UI Guide - Waste Management API

## Quick Access

**Swagger UI**: http://localhost:4000/api-docs  
**Swagger JSON**: http://localhost:4000/swagger.json  
**API Base URL**: http://localhost:4000/api

## Features

✅ **12 Interactive Endpoints** covering all API operations  
✅ **6 Data Models** with complete schemas  
✅ **Try it Out** functionality for live testing  
✅ **Request/Response Examples** for all endpoints  
✅ **Parameter Validation** with type checking  
✅ **Organized by Tags**: Shipments, Facilities, Contaminants, Inspections, Analytics

## Available Endpoints

### Shipments
- `GET /api/shipments` - List all shipments with filters
- `POST /api/shipments` - Create new shipment
- `GET /api/shipments/{id}` - Get shipment by ID
- `PUT /api/shipments/{id}` - Update shipment
- `DELETE /api/shipments/{id}` - Delete shipment

### Facilities
- `GET /api/facilities` - List all facilities
- `POST /api/facilities` - Create new facility
- `GET /api/facilities/{id}` - Get facility by ID
- `PUT /api/facilities/{id}` - Update facility
- `DELETE /api/facilities/{id}` - Delete facility

### Contaminants
- `GET /api/contaminants-detected` - List all contaminants
- `POST /api/contaminants-detected` - Create contaminant record
- `GET /api/contaminants-detected/{id}` - Get contaminant by ID
- `PUT /api/contaminants-detected/{id}` - Update contaminant
- `DELETE /api/contaminants-detected/{id}` - Delete contaminant

### Inspections
- `GET /api/inspections` - List all inspections
- `POST /api/inspections` - Create new inspection
- `GET /api/inspections/{id}` - Get inspection by ID
- `PUT /api/inspections/{id}` - Update inspection
- `DELETE /api/inspections/{id}` - Delete inspection

### Analytics
- `GET /api/analytics/contamination-rate` - Get contamination statistics
- `GET /api/analytics/facility-performance` - Get facility metrics
- `GET /api/analytics/waste-type-distribution` - Get waste type breakdown
- `GET /api/analytics/risk-trends` - Get contaminant risk trends

## How to Use

### 1. Start the Server
```bash
cd /Users/yab/Projects/clear-ai-v2
yarn api:dev
```

### 2. Open Swagger UI
Navigate to http://localhost:4000/api-docs in your browser

### 3. Test an Endpoint

#### Example: Get a Shipment

1. **Expand the endpoint**: Click on `GET /api/shipments/{id}`
2. **Click "Try it out"**: Button appears in the top right of the endpoint
3. **Enter parameters**: 
   - Set `id` to `S1`
4. **Click "Execute"**: Button at the bottom
5. **View response**: 
   - Response code (200)
   - Response body with shipment data
   - Response headers

#### Example: Create a New Shipment

1. **Expand**: Click on `POST /api/shipments`
2. **Click "Try it out"**
3. **Edit request body**: Use the provided example or create your own:
   ```json
   {
     "id": "S99",
     "facility_id": "F1",
     "date": "2025-10-12",
     "status": "pending",
     "weight_kg": 1000,
     "has_contaminants": false,
     "waste_type": "plastic",
     "carrier": "Test Carrier"
   }
   ```
4. **Click "Execute"**
5. **View response**: Should see 201 Created

#### Example: Query with Filters

1. **Expand**: Click on `GET /api/shipments`
2. **Click "Try it out"**
3. **Set parameters**:
   - `status`: `delivered`
   - `has_contaminants`: `false`
4. **Click "Execute"**
5. **View filtered results**

## Data Models

All request and response schemas are documented. Click on any model name to see its structure:

- **Shipment**: Full shipment details including waste type, carrier info
- **Facility**: Facility information with accepted waste types
- **Contaminant**: Detailed contaminant analysis with chemical levels
- **Inspection**: Inspection records with duration and photos
- **Error**: Standard error response format
- **SuccessResponse**: Standard success response format

## Tips

1. **Authentication**: Currently no authentication required (development mode)
2. **Required Fields**: Marked with red asterisk (*) in Swagger UI
3. **Enum Values**: Click dropdown to see valid options
4. **Response Examples**: Available for each endpoint
5. **Schema References**: Click on schema names to see full definitions

## Testing Scenarios

### Scenario 1: Track a Contaminated Shipment

1. Create a shipment with `has_contaminants: true`
2. Create contaminant records linked to the shipment
3. Create an inspection with status `rejected`
4. View analytics to see updated contamination rate

### Scenario 2: Facility Performance Analysis

1. Query facilities by type (e.g., `sorting`)
2. Get inspections for specific facility
3. View facility performance analytics
4. Compare acceptance rates

### Scenario 3: Waste Type Distribution

1. Create shipments with different `waste_type` values
2. Query analytics/waste-type-distribution
3. Analyze contamination rates by type

## Advanced Features

### Export/Import API Spec

Download the OpenAPI spec for use with other tools:
```bash
curl http://localhost:4000/swagger.json > wasteer-api-spec.json
```

### Use with Postman

1. In Postman, click "Import"
2. Select "Link" tab
3. Enter: `http://localhost:4000/swagger.json`
4. All endpoints will be imported automatically

### Use with Code Generation

Generate client code using tools like:
- `swagger-codegen`
- `openapi-generator`
- `@openapitools/openapi-generator-cli`

Example:
```bash
openapi-generator-cli generate \
  -i http://localhost:4000/swagger.json \
  -g typescript-axios \
  -o ./generated-client
```

## Troubleshooting

### Server not starting
```bash
# Kill existing processes
pkill -f "node dist/api/server.js"

# Restart
yarn api:dev
```

### Swagger UI not loading
1. Check server is running: `curl http://localhost:4000/health`
2. Clear browser cache
3. Try incognito/private mode

### MongoDB connection issues
```bash
# Check MongoDB is running
brew services list | grep mongodb

# Start if needed
brew services start mongodb-community
```

## Next Steps

1. ✅ Explore all endpoints in Swagger UI
2. ✅ Test CRUD operations for each resource
3. ✅ Try the analytics endpoints
4. ✅ Export the API spec for documentation
5. ✅ Generate client code for your application

---

**Happy API Testing!** 🚀

