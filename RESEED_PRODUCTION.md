# Reseed Production Database with Expanded Data

## Status: Code Ready, Awaiting Railway Redeploy

### ✅ Completed Steps

1. **Expanded Seed Data** - Updated `src/api/db/seed-data.ts`:
   - ✅ 20 facilities (up from 10)
   - ✅ 100 shipments (up from 12)
   - ✅ 41 contaminants (up from 8)
   - ✅ 80 inspections (up from 12)

2. **Built and Tested Locally** - Verified data generation works correctly

3. **Committed and Pushed** - Code pushed to `origin/main`

---

## ⏳ Next Step: Manual Railway Redeploy

Railway's auto-deploy hasn't triggered yet (possibly watching a different branch or webhook not configured).

### Option 1: Manual Redeploy via Railway UI (Recommended)

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your **Wasteer API** service
3. Go to the **Deployments** tab
4. Click **"Deploy"** or **"Redeploy"** button
5. Wait for the build to complete (~2-3 minutes)
6. Once deployed, run the reseed command:

```bash
curl -X POST https://wasteer-api-production.up.railway.app/api/reset
```

7. Verify the new data counts:

```bash
curl https://wasteer-api-production.up.railway.app/api/shipments | jq '.count'
# Should return: 100
```

### Option 2: Configure Auto-Deploy

1. Go to Railway Dashboard > Wasteer API service
2. Click **Settings**
3. Under **Source**, check that:
   - Repository: `wsyeabsera/clear-ai-v2`
   - Branch: `main` (or change to the branch you want to watch)
4. Save and trigger a manual deploy

---

## Verification Commands

After Railway redeploys, run these commands to verify:

```bash
# Reseed production database
curl -X POST https://wasteer-api-production.up.railway.app/api/reset

# Check shipments count (should be 100)
curl https://wasteer-api-production.up.railway.app/api/shipments | jq '.count'

# Check facilities count (should be 20)
curl https://wasteer-api-production.up.railway.app/api/facilities | jq '.count'

# Check contaminants count (should be ~40)
curl https://wasteer-api-production.up.railway.app/api/contaminants | jq '.count'

# Check inspections count (should be 80)
curl https://wasteer-api-production.up.railway.app/api/inspections | jq '.count'
```

Expected output after reseed:
```json
{
  "success": true,
  "message": "Database reset successfully. All data cleared and reseeded.",
  "data": {
    "facilities": 20,
    "shipments": 100,
    "contaminants": 41,
    "inspections": 80
  }
}
```

---

## Test Frontend with New Data

Once production is reseeded:

1. Start the frontend dev server:
```bash
cd /Users/yab/Projects/clear-ai-v2
yarn web:dev
```

2. Open http://localhost:5173

3. Try these queries to see the expanded data:
   - "Show me all shipments from the last week"
   - "Which facilities have the highest contamination rates?"
   - "Show me all critical risk contaminants"
   - "Compare shipment volumes across all facilities"

The AI agent should now have much more data to analyze and provide richer insights!

---

## Data Generation Details

### Facilities (20)
- 10 original + 10 new German cities
- Mix of sorting, processing, and disposal types
- Realistic capacities and load levels

### Shipments (100)
- **Date Distribution:**
  - 30% from last 7 days (recent activity)
  - 40% from last 30 days (monthly patterns)
  - 30% from 30-90 days ago (historical data)
- **Status Distribution:**
  - 60% delivered
  - 15% in_transit
  - 15% rejected
  - 10% pending
- **Contamination:**
  - 70% clean shipments
  - 20% with contaminants (but delivered)
  - 10% rejected due to contaminants

### Contaminants (41)
- Various types: Lead, Mercury, PCBs, Asbestos, Heavy Metals
- **Risk Distribution:**
  - 20% critical
  - 30% high
  - 30% medium
  - 20% low
- Linked to contaminated shipments

### Inspections (80)
- 4 inspections per facility on average
- **Type Distribution:**
  - 50% arrival
  - 30% processing
  - 15% departure
  - 5% random
- 85% pass rate
- Linked to recent shipments

---

## Benefits of Expanded Data

### For AI Agent
✅ More meaningful trend analysis
✅ Better pattern detection
✅ Statistical significance for insights
✅ Realistic anomaly detection

### For Frontend Demo
✅ Populated history sidebar
✅ Varied query results
✅ Better showcase of AI capabilities
✅ More realistic user experience

### For Testing
✅ Better edge case coverage
✅ Performance testing with volume
✅ Query variety

---

## Rollback (if needed)

If you need to revert to the old seed data:

```bash
cd /Users/yab/Projects/clear-ai-v2
cp src/api/db/seed-data-backup.ts src/api/db/seed-data.ts
yarn build
git add src/api/db/seed-data.ts
git commit -m "revert: Restore original seed data"
git push origin main
# Then redeploy on Railway
```

