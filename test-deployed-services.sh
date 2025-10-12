#!/bin/bash

# Test Deployed Services Script
# This script tests both Wasteer API and GraphQL server deployed on Railway

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  Testing Deployed Services                                       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if GRAPHQL_DEPLOYED_URL is set
if [ -z "$GRAPHQL_DEPLOYED_URL" ]; then
    echo -e "${YELLOW}⚠️  GRAPHQL_DEPLOYED_URL not set${NC}"
    echo "Please set it before running tests:"
    echo ""
    echo "  export GRAPHQL_DEPLOYED_URL=https://your-graphql-url.railway.app/graphql"
    echo ""
    echo "Then run one of these commands:"
    echo ""
    echo "  yarn test:deployed                # Run all Jest tests against deployed"
    echo "  yarn test:integration:deployed   # Run integration tests"
    echo "  yarn agent-tester:deployed       # Run full agent test suite (55 scenarios)"
    echo "  yarn deploy:verify:deployed      # Quick verification script"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} GRAPHQL_DEPLOYED_URL is set: $GRAPHQL_DEPLOYED_URL"
echo ""

# Test Wasteer API
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Testing Wasteer API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

WASTEER_URL="https://wasteer-api-production.up.railway.app"

echo "Health check..."
HEALTH=$(curl -s "$WASTEER_URL/health")
if echo "$HEALTH" | grep -q "success"; then
    echo -e "${GREEN}✓${NC} Wasteer API health check passed"
else
    echo -e "${RED}✗${NC} Wasteer API health check failed"
    exit 1
fi

echo "Checking data..."
SHIPMENTS=$(curl -s "$WASTEER_URL/api/shipments" | jq -r '.count')
FACILITIES=$(curl -s "$WASTEER_URL/api/facilities" | jq -r '.count')

if [ "$SHIPMENTS" -gt 0 ] && [ "$FACILITIES" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Wasteer API has data: $SHIPMENTS shipments, $FACILITIES facilities"
else
    echo -e "${RED}✗${NC} Wasteer API missing data"
    exit 1
fi

echo ""

# Test GraphQL Server
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Testing GraphQL Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Extract base URL (remove /graphql if present)
GRAPHQL_BASE=$(echo "$GRAPHQL_DEPLOYED_URL" | sed 's|/graphql$||')

echo "Health check..."
HEALTH=$(curl -s "$GRAPHQL_BASE/health")
if echo "$HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✓${NC} GraphQL server health check passed"
else
    echo -e "${RED}✗${NC} GraphQL server health check failed"
    echo "Response: $HEALTH"
    exit 1
fi

echo "Testing GraphQL schema..."
SCHEMA=$(curl -s -X POST "$GRAPHQL_DEPLOYED_URL" \
    -H "Content-Type: application/json" \
    -d '{"query":"query { __schema { queryType { name } } }"}')

if echo "$SCHEMA" | grep -q "Query"; then
    echo -e "${GREEN}✓${NC} GraphQL schema accessible"
else
    echo -e "${RED}✗${NC} GraphQL schema not accessible"
    echo "Response: $SCHEMA"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ All basic tests passed!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run comprehensive tests with:"
echo ""
echo "  yarn agent-tester:deployed     # Full agent test suite (55 scenarios)"
echo "  yarn test:deployed              # All Jest tests"
echo ""

