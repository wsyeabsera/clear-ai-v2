#!/bin/bash

# Railway Database Seeding Script
# Run this once after deployment to seed your production database

set -e

echo "🌱 Seeding Railway Production Database..."
echo ""

# Run the seed script
yarn seed:prod

echo ""
echo "✅ Database seeded successfully!"

