#!/bin/bash

echo "🧪 Testing Wasteer API after seeding..."
echo ""

echo "1️⃣  Shipments:"
curl -s https://wasteer-api-production.up.railway.app/api/shipments | jq '.count'

echo "2️⃣  Facilities:"
curl -s https://wasteer-api-production.up.railway.app/api/facilities | jq '.count'

echo "3️⃣  Contaminants:"
curl -s https://wasteer-api-production.up.railway.app/api/contaminants-detected | jq '.count'

echo "4️⃣  Inspections:"
curl -s https://wasteer-api-production.up.railway.app/api/inspections | jq '.count'

echo ""
echo "✅ If you see counts > 0, seeding worked!"
