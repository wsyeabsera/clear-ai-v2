# Production Deployment Steps - Memory System & Seed Data

## Quick Checklist ✅

Follow these steps in order:

### 1. Add Memory Environment Variable to Railway (1 min)

**Go to**: https://railway.app/dashboard

**For GraphQL Service**:
1. Click on your **GraphQL** service
2. Go to **Variables** tab
3. Click **"+ New Variable"**
4. Add:
   - **Name**: `MEMORY_EMBEDDING_PROVIDER`
   - **Value**: `openai`
5. Click **"Add"**
6. Service will automatically restart (~30 seconds)

---

### 2. Redeploy Wasteer API with New Seed Data (3 min)

**Option A: Wait for Auto-Deploy** (Recommended)
- Railway should auto-deploy from your latest GitHub push
- Check Deployments tab for "Building" or "Deploying" status
- Wait for "Active" status

**Option B: Manual Redeploy**
1. Click on **Wasteer API** service
2. Go to **Deployments** tab
3. Click **"Redeploy"** on latest deployment
4. Wait 2-3 minutes for build to complete

**Verify Deployment**:
```bash
curl https://wasteer-api-production.up.railway.app/health
# Should return: {"success":true,"message":"Waste Management API is running",...}
```

---

### 3. Reseed Production Database (30 sec)

Run this command:
```bash
curl -X POST https://wasteer-api-production.up.railway.app/api/reset
```

**Expected Output**:
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

**If you still see old counts** (10/12/8/12):
- Wasteer API hasn't redeployed yet
- Wait 1-2 more minutes
- Try reseed again

---

### 4. Test Production Memory System (2 min)

**Get your GraphQL URL from Railway**:
- Go to GraphQL service → Settings → Networking
- Copy the public URL (e.g., `https://your-app.railway.app`)

**Send a test query**:
```bash
export GRAPHQL_URL="https://your-graphql-url.railway.app"

curl -X POST $GRAPHQL_URL/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { executeQuery(query: \"Show me all contaminated shipments\") { message toolsUsed } }"}' \
  | jq '.'
```

**Should Return**:
- Non-error response
- AI-generated message about contaminated shipments
- List of tools used

---

### 5. Check Railway Logs for Memory Storage (1 min)

**In Railway Dashboard**:
1. Click **GraphQL** service
2. Go to **Deployments** tab
3. Click on the **Active** deployment
4. Scroll through logs

**Look For** (after your test query):
```
[OrchestratorAgent] Storing semantic memory...
[OrchestratorAgent] ✅ Stored request ... in memory (episodic + semantic)
```

**If you see this**: ✅ Memory system working!  
**If you see errors**: Check error message and logs

---

### 6. Verify Pinecone Vectors (1 min)

1. Go to https://app.pinecone.io/
2. Click on `clear-ai` index
3. Go to **"Vectors"** or **"Browse"** tab
4. Look for:
   - **Vector Count** increasing after each query
   - New vector IDs appearing

**Expected**:
- Before queries: 0 vectors
- After 1 query: 1 vector
- After 5 queries: 5 vectors

---

### 7. Verify Expanded Data (1 min)

```bash
# Check shipments count
curl https://wasteer-api-production.up.railway.app/api/shipments | jq '.count'
# Expected: 100

# Check facilities count
curl https://wasteer-api-production.up.railway.app/api/facilities | jq '.count'
# Expected: 20

# Sample some data
curl https://wasteer-api-production.up.railway.app/api/shipments?limit=3 | jq '.data[].id'
```

---

## Verification Script 🤖

I've created an automated verification script you can run:

```bash
cd /Users/yab/Projects/clear-ai-v2
yarn deploy:verify:production
```

This script will:
- ✅ Test Wasteer API health
- ✅ Verify data counts (should be 100 shipments)
- ✅ Test GraphQL endpoint
- ✅ Send a test query
- ✅ Check for memory storage success
- ✅ Report Pinecone stats (if API key available)

---

## Troubleshooting 🔧

### Issue: Railway env var not taking effect
**Solution**: 
- Check Variables tab - is it there?
- Service should auto-restart when variable added
- Try manual redeploy if needed

### Issue: Still seeing old seed data (12 shipments)
**Solution**:
- Wasteer API hasn't redeployed yet
- Check Deployments tab for status
- Wait for "Active" status, then reseed

### Issue: GraphQL query fails
**Solution**:
- Check GraphQL service is running (green status)
- Verify URL is correct
- Check logs for startup errors

### Issue: No "Storing semantic memory" in logs
**Solution**:
- Verify `MEMORY_EMBEDDING_PROVIDER=openai` is set
- Check for any error messages before that point
- Verify `OPENAI_API_KEY` is also set in Railway

### Issue: Pinecone shows 0 vectors
**Solution**:
- Check Railway logs for Pinecone errors
- Verify `PINECONE_API_KEY` is set in Railway
- Verify `PINECONE_INDEX_NAME=clear-ai`
- Index might need a minute to update

---

## Expected Timeline ⏱️

```
[00:00] Add Railway env var → Immediate
[00:30] Service restarts → 30 seconds
[01:00] Check if Wasteer API redeployed → Check status
[04:00] Manual redeploy if needed → 3 minutes
[04:30] Reseed database → 30 seconds
[05:00] Test GraphQL query → 1 minute
[06:00] Check logs → 1 minute
[07:00] Verify Pinecone → 1 minute
[08:00] ✅ COMPLETE
```

---

## Success Indicators 🎯

You'll know it's working when you see:

1. ✅ Railway Variables tab shows `MEMORY_EMBEDDING_PROVIDER=openai`
2. ✅ Wasteer API reset returns `"shipments": 100`
3. ✅ GraphQL query returns AI-generated response
4. ✅ Railway logs show "✅ Stored request ... in memory"
5. ✅ Pinecone dashboard shows vectors > 0
6. ✅ No error messages in logs

---

## After Verification

Once everything is working:

### Test Context Loading
Send two related queries:

```bash
# First query
curl -X POST $GRAPHQL_URL/graphql \
  -d '{"query":"mutation { executeQuery(query: \"Show me facilities in Berlin\") { message } }"}'

# Second query (should use context from first)
curl -X POST $GRAPHQL_URL/graphql \
  -d '{"query":"mutation { executeQuery(query: \"What were their inspection rates?\") { message } }"}'
```

The second query should understand "their" refers to Berlin facilities from the first query!

### Test Frontend
```bash
cd /Users/yab/Projects/clear-ai-v2
yarn web:dev
# Open http://localhost:5173
# Try various queries with the 100 shipments
```

---

## Quick Reference 📋

### Railway Dashboard
https://railway.app/dashboard

### Your Services
- Wasteer API: `https://wasteer-api-production.up.railway.app`
- GraphQL: (get from Railway dashboard)

### Pinecone Dashboard
https://app.pinecone.io/

### Test Commands
```bash
# Reseed
curl -X POST https://wasteer-api-production.up.railway.app/api/reset

# Verify data
curl https://wasteer-api-production.up.railway.app/api/shipments | jq '.count'

# Test GraphQL (replace URL)
curl -X POST https://your-graphql-url.railway.app/graphql \
  -d '{"query":"mutation { executeQuery(query: \"test\") { message } }"}'
```

---

**Ready to deploy!** Follow the steps above and let me know if you hit any issues. I'll create the verification script next.

