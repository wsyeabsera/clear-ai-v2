#!/bin/bash

# Benchmark Scenarios for Multi-Agent System Testing
BASE_URL="http://localhost:4001/graphql"
RESULTS_DIR="benchmark-results"

# Function to run a complete scenario
run_scenario() {
    local scenario_num=$1
    local scenario_name=$2
    local task_description=$3
    local dir="${RESULTS_DIR}/scenario-${scenario_num}-${scenario_name}"
    
    echo "Running Scenario ${scenario_num}: ${scenario_name}"
    
    # Create directory
    mkdir -p "$dir"
    
    # Create request file
    cat > "$dir/request.json" << EOF
{
  "scenario": "Scenario ${scenario_num}: ${scenario_name}",
  "task": "${task_description}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    # Step 1: Create Plan
    echo "  Creating plan..."
    curl -s "$BASE_URL" -X POST -H "Content-Type: application/json" -d "{
        \"query\": \"mutation { planQuery(query: \\\"${task_description}\\\") { requestId plan { steps { tool params dependsOn parallel } } metadata { query timestamp estimatedDurationMs } status } }\"
    }" > "$dir/plan.json"
    
    # Extract request ID
    local request_id=$(jq -r '.data.planQuery.requestId' "$dir/plan.json")
    
    if [ "$request_id" = "null" ] || [ -z "$request_id" ]; then
        echo "  ERROR: Failed to get request ID"
        return 1
    fi
    
    # Step 2: Execute Tools
    echo "  Executing tools..."
    curl -s "$BASE_URL" -X POST -H "Content-Type: application/json" -d "{
        \"query\": \"mutation { executeTools(requestId: \\\"${request_id}\\\") { requestId results { success tool data error { code message } metadata { executionTime timestamp } } metadata { totalDurationMs successfulSteps failedSteps timestamp } } }\"
    }" > "$dir/execution.json"
    
    # Step 3: Analyze Results
    echo "  Analyzing results..."
    curl -s "$BASE_URL" -X POST -H "Content-Type: application/json" -d "{
        \"query\": \"mutation { analyzeResults(requestId: \\\"${request_id}\\\") { requestId analysis { summary insights { type description confidence } entities { id type name attributes } anomalies { type description severity } metadata { toolResultsCount successfulResults failedResults analysisTimeMs } } } }\"
    }" > "$dir/analysis.json"
    
    # Create metrics
    local start_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local total_duration=$(jq -r '.data.executeTools.metadata.totalDurationMs' "$dir/execution.json")
    local successful_steps=$(jq -r '.data.executeTools.metadata.successfulSteps' "$dir/execution.json")
    local failed_steps=$(jq -r '.data.executeTools.metadata.failedSteps' "$dir/execution.json")
    local total_steps=$((successful_steps + failed_steps))
    local success_rate=$((successful_steps * 100 / total_steps))
    
    cat > "$dir/metrics.json" << EOF
{
  "scenario": "Scenario ${scenario_num}",
  "startTime": "${start_time}",
  "endTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "totalDurationMs": ${total_duration},
  "totalSteps": ${total_steps},
  "successfulSteps": ${successful_steps},
  "failedSteps": ${failed_steps},
  "successRate": "${success_rate}%"
}
EOF
    
    echo "  Completed Scenario ${scenario_num} (${success_rate}% success)"
}

# Run scenarios
echo "Starting Multi-Agent System Benchmark..."

run_scenario "01" "simple-crud" "Create a new shipment from Stuttgart to Frankfurt with 1500kg of mixed plastic waste, transported by EcoTrans GmbH."

run_scenario "02" "multi-step" "Find shipments with high-risk contaminants, get details of the most critical contamination, update the shipment status to rejected, and create a new inspection record documenting the rejection."

run_scenario "03" "analytical" "Analyze contamination patterns by getting overall contamination rate, finding facilities with highest rejection rates, identifying most common contaminant types, and calculating average contamination concentration by risk level."

run_scenario "04" "complex-filtering" "Find all high-risk operations by getting shipments with critical/high risk contaminants, cross-referencing with facility capacity, identifying overloaded facilities handling dangerous waste, and ranking by risk score."

run_scenario "05" "data-relationships" "Create a complete audit trail for shipment S2 by getting shipment details, finding associated contamination records, getting inspection details, checking facility information, and analyzing risk assessment timeline."

run_scenario "06" "error-handling" "Test error handling by attempting to create shipment with invalid facility ID, trying to update non-existent shipment, creating contamination record for clean shipment, and handling malformed date parameters."

run_scenario "07" "performance-optimization" "Efficiently process multiple operations by getting all facilities with capacity > 600 tons, getting all shipments to those facilities, calculating total waste volume per facility, and identifying facilities approaching capacity limits."

run_scenario "08" "business-intelligence" "Provide strategic insights by analyzing waste distribution by type and location, calculating facility utilization rates, identifying trends in contamination over time, and recommending capacity adjustments."

run_scenario "09" "real-time-monitoring" "Set up monitoring for new high-risk contaminations, facilities approaching capacity, shipments stuck in transit, and inspections requiring follow-up."

run_scenario "10" "integration-testing" "Complete end-to-end workflow by creating new facility with specific capacity, creating shipment to that facility, simulating contamination detection, updating shipment status, creating inspection record, updating facility load, and generating analytics report."

echo "Benchmark completed! Results stored in $RESULTS_DIR/"
