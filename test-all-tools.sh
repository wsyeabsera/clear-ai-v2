#!/bin/bash

# Comprehensive Tool Testing Script
# Tests all tool categories to verify fixes

GRAPHQL_URL="http://localhost:4001/graphql"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing All Tool Categories..."
echo "================================"

# Function to test a query
test_query() {
    local query_name="$1"
    local graphql_query="$2"
    
    echo -n "Testing $query_name... "
    
    response=$(curl -s -X POST -H "Content-Type: application/json" \
        --data "{\"query\":\"$graphql_query\"}" \
        "$GRAPHQL_URL" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        # Check if response contains errors
        if echo "$response" | grep -q '"errors"'; then
            echo -e "${RED}FAILED${NC}"
            echo "  Error: $(echo "$response" | jq -r '.errors[0].message' 2>/dev/null || echo 'Unknown error')"
        else
            echo -e "${GREEN}PASSED${NC}"
        fi
    else
        echo -e "${RED}FAILED${NC} (No response)"
    fi
}

# Test 1: Plan Generation
echo -e "\n📋 Testing Plan Generation:"
test_query "facilities_list_plan" 'mutation { planQuery(query: "List all facilities") { requestId plan { steps { tool params } } } }'
test_query "shipments_list_plan" 'mutation { planQuery(query: "List all shipments") { requestId plan { steps { tool params } } } }'
test_query "analytics_plan" 'mutation { planQuery(query: "Show contamination rate") { requestId plan { steps { tool params } } } }'

# Test 2: Direct Tool Execution (using known request IDs)
echo -e "\n🔧 Testing Direct Tool Execution:"

# Create a plan first and get request ID
echo "Creating facilities plan..."
facilities_plan=$(curl -s -X POST -H "Content-Type: application/json" \
    --data '{"query":"mutation { planQuery(query: \"List all facilities\") { requestId } }"}' \
    "$GRAPHQL_URL" 2>/dev/null)

if [ -n "$facilities_plan" ]; then
    request_id=$(echo "$facilities_plan" | jq -r '.data.planQuery.requestId' 2>/dev/null)
    
    if [ "$request_id" != "null" ] && [ -n "$request_id" ]; then
        echo "Got request ID: $request_id"
        
        # Test execution
        echo -n "Testing facilities_list execution... "
        exec_response=$(curl -s -X POST -H "Content-Type: application/json" \
            --data "{\"query\":\"mutation { executeTools(requestId: \\\"$request_id\\\") { requestId results { success tool data error { message } } } }\"}" \
            "$GRAPHQL_URL" 2>/dev/null)
        
        if [ -n "$exec_response" ]; then
            if echo "$exec_response" | grep -q '"errors"'; then
                echo -e "${RED}FAILED${NC}"
                echo "  Error: $(echo "$exec_response" | jq -r '.errors[0].message' 2>/dev/null || echo 'Unknown error')"
            else
                success=$(echo "$exec_response" | jq -r '.data.executeTools.results[0].success' 2>/dev/null)
                if [ "$success" = "true" ]; then
                    echo -e "${GREEN}PASSED${NC}"
                else
                    echo -e "${RED}FAILED${NC}"
                    echo "  Tool execution failed"
                fi
            fi
        else
            echo -e "${RED}FAILED${NC} (No response)"
        fi
    else
        echo -e "${RED}FAILED${NC} (Could not get request ID)"
    fi
else
    echo -e "${RED}FAILED${NC} (Could not create plan)"
fi

# Test 3: Analytics Tools (these were working)
echo -e "\n📊 Testing Analytics Tools:"
test_query "contamination_rate_plan" 'mutation { planQuery(query: "Show contamination rate") { requestId } }'

# Test 4: Get Tools (these were working)
echo -e "\n🔍 Testing Get Tools:"
test_query "shipment_get_plan" 'mutation { planQuery(query: "Get shipment shipment-1") { requestId } }'

echo -e "\n✅ Tool testing complete!"
echo "================================"
