#!/bin/bash

# Replace this with your actual Railway URL
RAILWAY_URL="${RAILWAY_URL:-https://wasteer-api-production.up.railway.app}"

echo "🧪 Testing Wasteer API at: $RAILWAY_URL"
echo ""

echo "1️⃣  Health Check..."
curl -s "$RAILWAY_URL/health" | jq . || curl -s "$RAILWAY_URL/health"
echo -e "\n"

echo "2️⃣  Get Shipments..."
curl -s "$RAILWAY_URL/api/shipments" | jq . || curl -s "$RAILWAY_URL/api/shipments"
echo -e "\n"

echo "3️⃣  Get Facilities..."
curl -s "$RAILWAY_URL/api/facilities" | jq . || curl -s "$RAILWAY_URL/api/facilities"
echo -e "\n"

echo "4️⃣  Get Contaminants..."
curl -s "$RAILWAY_URL/api/contaminants-detected" | jq . || curl -s "$RAILWAY_URL/api/contaminants-detected"
echo -e "\n"

echo "5️⃣  Get Inspections..."
curl -s "$RAILWAY_URL/api/inspections" | jq . || curl -s "$RAILWAY_URL/api/inspections"
echo -e "\n"

echo "6️⃣  Analytics - Contamination Rate..."
curl -s "$RAILWAY_URL/api/analytics/contamination-rate" | jq . || curl -s "$RAILWAY_URL/api/analytics/contamination-rate"
echo -e "\n"

echo "✅ All tests complete!"
