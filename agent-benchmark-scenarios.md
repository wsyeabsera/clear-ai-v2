# Agent Benchmarking Scenarios

## API Discovery Summary
- **API Base URL**: http://localhost:3001/api
- **Available Endpoints**: 
  - `/shipments` - 12 shipments (4 contaminated, 8 clean)
  - `/facilities` - 10 facilities across Germany
  - `/contaminants-detected` - 8 contamination records
  - `/inspections` - 12 inspection records
  - `/analytics/contamination-rate` - Overall contamination stats
  - `/analytics/facility-performance` - Facility performance metrics
  - `/analytics/waste-distribution` - Waste type distribution
  - `/analytics/risk-trends` - Risk trends over time

## Benchmark Scenarios

### Scenario 1: Simple CRUD - Create New Shipment
**Task**: Create a new shipment from Stuttgart to Frankfurt with 1500kg of mixed plastic waste, transported by EcoTrans GmbH.

**Expected Outcome**: New shipment created with ID, all required fields populated, status set to 'pending'.

---

### Scenario 2: Multi-Step Workflow - Handle Contaminated Shipment
**Task**: 
1. Find shipments with high-risk contaminants
2. Get details of the most critical contamination
3. Update the shipment status to 'rejected'
4. Create a new inspection record documenting the rejection

**Expected Outcome**: Complete workflow from detection to rejection with proper documentation.

---

### Scenario 3: Analytical Query - Contamination Analysis
**Task**: Analyze contamination patterns by:
1. Getting overall contamination rate
2. Finding facilities with highest rejection rates
3. Identifying most common contaminant types
4. Calculating average contamination concentration by risk level

**Expected Outcome**: Comprehensive analysis with actionable insights.

---

### Scenario 4: Complex Filtering - High-Risk Operations
**Task**: Find all high-risk operations by:
1. Getting shipments with critical/high risk contaminants
2. Cross-referencing with facility capacity
3. Identifying overloaded facilities handling dangerous waste
4. Ranking by risk score (concentration × facility load)

**Expected Outcome**: Prioritized list of high-risk operations requiring immediate attention.

---

### Scenario 5: Data Relationships - Complete Audit Trail
**Task**: Create a complete audit trail for shipment S2 by:
1. Getting shipment details
2. Finding associated contamination records
3. Getting inspection details
4. Checking facility information
5. Analyzing risk assessment timeline

**Expected Outcome**: Complete picture of shipment S2's journey and issues.

---

### Scenario 6: Error Handling - Invalid Operations
**Task**: Test error handling by:
1. Attempting to create shipment with invalid facility ID
2. Trying to update non-existent shipment
3. Creating contamination record for clean shipment
4. Handling malformed date parameters

**Expected Outcome**: Proper error responses without system crashes.

---

### Scenario 7: Performance Optimization - Bulk Operations
**Task**: Efficiently process multiple operations:
1. Get all facilities with capacity > 600 tons
2. Get all shipments to those facilities
3. Calculate total waste volume per facility
4. Identify facilities approaching capacity limits

**Expected Outcome**: Efficient bulk processing with minimal API calls.

---

### Scenario 8: Business Intelligence - Strategic Analysis
**Task**: Provide strategic insights by:
1. Analyzing waste distribution by type and location
2. Calculating facility utilization rates
3. Identifying trends in contamination over time
4. Recommending capacity adjustments

**Expected Outcome**: Strategic recommendations with supporting data.

---

### Scenario 9: Real-time Monitoring - Active Alerts
**Task**: Set up monitoring for:
1. New high-risk contaminations
2. Facilities approaching capacity
3. Shipments stuck in transit
4. Inspections requiring follow-up

**Expected Outcome**: Proactive monitoring system with alert priorities.

---

### Scenario 10: Integration Testing - End-to-End Flow
**Task**: Complete end-to-end workflow:
1. Create new facility with specific capacity
2. Create shipment to that facility
3. Simulate contamination detection
4. Update shipment status
5. Create inspection record
6. Update facility load
7. Generate analytics report

**Expected Outcome**: Seamless integration across all system components.

---

## Evaluation Criteria

### Correctness (40%)
- ✓ Task completion accuracy
- ✓ Data consistency
- ✓ Proper error handling
- ✓ Valid business logic

### Efficiency (30%)
- Number of API calls made
- Response time optimization
- Data fetching strategies
- Caching opportunities

### Reasoning Quality (30%)
- Problem decomposition
- Strategic thinking
- Error anticipation
- Business context understanding

## Comparison Framework

Each scenario will be evaluated with:
- **Reference Agent (Me)**: Documented approach, calls, results, metrics
- **User's Multi-Agent System**: Planner → Executor → Analyzer pipeline results
- **Comparative Analysis**: Strengths, weaknesses, improvement suggestions

---

*Generated on: 2025-10-13*
*API Version: Wasteer v1.0*
*Total Scenarios: 10*
