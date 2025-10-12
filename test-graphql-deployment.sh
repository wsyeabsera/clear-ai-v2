#!/bin/bash

# GraphQL Server Deployment Testing Script
# Replace GRAPHQL_URL with your actual Railway URL

GRAPHQL_URL="${GRAPHQL_URL:-https://clear-ai-graphql-production.up.railway.app}"

echo "🧪 Testing GraphQL Server Deployment"
echo "URL: $GRAPHQL_URL"
echo ""

echo "1️⃣  Health Check..."
curl -s "$GRAPHQL_URL/health" | jq . || curl -s "$GRAPHQL_URL/health"
echo -e "\n"

echo "2️⃣  GraphQL Schema Check..."
curl -s -X POST "$GRAPHQL_URL/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { __schema { queryType { name } mutationType { name } } }"}' \
  | jq . || echo "Failed"
echo -e "\n"

echo "3️⃣  Test Simple Agent Query..."
curl -s -X POST "$GRAPHQL_URL/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { executeQuery(query: \"List all shipments\") { queryId status result } }"}' \
  | jq . || echo "Failed"
echo -e "\n"

echo "4️⃣  Test Complex Agent Query..."
curl -s -X POST "$GRAPHQL_URL/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { executeQuery(query: \"Show me all contaminated shipments with high risk levels\") { queryId status result } }"}' \
  | jq . || echo "Failed"
echo -e "\n"

echo "✅ Testing complete!"
echo ""
echo "If all tests passed, your GraphQL server is fully operational! 🎉"

