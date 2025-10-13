# Manual Testing Checklist

Use this checklist after each Railway deployment completes.

---

## After Every Deployment (Required - 30 seconds)

### Health Checks

```bash
# Wasteer API
curl https://wasteer-api-production.up.railway.app/health
# Expected: {"success":true,"message":"Waste Management API is running"}

# GraphQL Server
curl https://clear-ai-v2-production.up.railway.app/health
# Expected: {"status":"ok","timestamp":"..."}
```

- [ ] Wasteer API health: ✅ Healthy
- [ ] GraphQL health: ✅ Healthy

**If both pass, deployment is successful!** ✅

---

## After Feature Changes (Recommended - 5-10 minutes)

### 1. Unit Tests (20 seconds)

```bash
yarn test
```

- [ ] 840+ tests pass
- [ ] No new failures
- [ ] Build completes successfully

### 2. Integration Tests - Deployed (3 minutes)

```bash
yarn test:integration:deployed
```

- [ ] 145+ tests pass (>90%)
- [ ] API endpoints respond
- [ ] Database operations work

### 3. Agent Tests - Deployed (5 minutes)

```bash
export GRAPHQL_DEPLOYED_URL="https://clear-ai-v2-production.up.railway.app/graphql"
yarn agent-tester:deployed
```

- [ ] 50+ scenarios pass (>90%)
- [ ] No connection errors
- [ ] Agent pipeline working

### 4. View Test Report

```bash
open deployed-test-results.html
```

- [ ] Review failed scenarios (if any)
- [ ] Check performance metrics
- [ ] Verify no regressions

---

## Database Management

### Reset/Reseed Database

Only when needed (clears ALL data):

```bash
# Reset and reseed with test data
curl -X POST https://wasteer-api-production.up.railway.app/api/reset

# Verify seeding worked
curl https://wasteer-api-production.up.railway.app/api/shipments | jq '.count'
# Expected: 12

curl https://wasteer-api-production.up.railway.app/api/facilities | jq '.count'
# Expected: 10
```

- [ ] Database reset successful
- [ ] 12 shipments loaded
- [ ] 10 facilities loaded
- [ ] 8 contaminants loaded
- [ ] 12 inspections loaded

---

## Quick Verification Script

For the lazy (1 minute):

```bash
# Set environment variable
export GRAPHQL_DEPLOYED_URL="https://clear-ai-v2-production.up.railway.app/graphql"

# Run automated tests
./test-deployed-services.sh

# Should output:
# ✓ Wasteer API health check passed
# ✓ Wasteer API has data: 12 shipments, 10 facilities
# ✓ GraphQL server health check passed
# ✅ All basic tests passed!
```

- [ ] Script completes successfully
- [ ] All checks pass

---

## When Tests Fail

### Step 1: Check Railway Logs

1. Go to Railway dashboard
2. Click failing service
3. View logs for errors

### Step 2: Check Health Endpoints

```bash
# If Wasteer API fails
curl https://wasteer-api-production.up.railway.app/health
# Check response

# If GraphQL fails  
curl https://clear-ai-v2-production.up.railway.app/health
# Check response
```

### Step 3: Verify Environment Variables

Railway → Service → Variables:
- [ ] All required variables set
- [ ] `WASTEER_API_URL` correct for GraphQL
- [ ] `MONGODB_CLOUD_URI` correct
- [ ] `NEO4J_CLOUD_*` correct

### Step 4: Check Service Logs

Common issues:
- MongoDB connection refused → Check `MONGODB_CLOUD_URI`
- Neo4j connection failed → Check `NEO4J_CLOUD_*` credentials
- Wasteer API unreachable → Check `WASTEER_API_URL` in GraphQL service

---

## Testing Frequency

### Every Deployment
- ✅ Health checks (30 seconds)

### Feature Changes
- ✅ Health checks
- ✅ Integration tests (3 minutes)

### Major Changes
- ✅ Health checks
- ✅ Integration tests
- ✅ Unit tests (20 seconds)
- ✅ Agent tests (5 minutes)

### Weekly
- ✅ Full test suite
- ✅ Review metrics
- ✅ Check for performance degradation

---

## Available Test Commands

```bash
# Unit tests (local)
yarn test

# Integration tests (deployed Wasteer API)
yarn test:integration:deployed

# Agent tests (deployed GraphQL + Wasteer API)
export GRAPHQL_DEPLOYED_URL="https://clear-ai-v2-production.up.railway.app/graphql"
yarn agent-tester:deployed

# Quick verification
./test-deployed-services.sh

# Verify deployment
yarn deploy:verify:deployed
```

---

## Success Criteria

For deployment to be considered successful:

- ✅ Both services healthy
- ✅ Health checks pass
- ✅ At least one successful query test
- ✅ No critical errors in logs

**That's it!** Simple and effective. 🚀

---

## Notes

- Tests run against production data (12 shipments, 10 facilities)
- Use `/api/reset` to refresh data if needed
- All test scripts preserve local `.env` (don't modify it)
- Railway auto-restarts services on failure (max 10 retries)

**Full workflow documentation**: See `DEPLOYMENT_WORKFLOW.md`

