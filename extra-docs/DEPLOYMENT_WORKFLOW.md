# Simple Deployment Workflow

## Overview

This project uses a simplified deployment strategy with Railway auto-deployment and manual testing. No complex CI/CD pipeline needed!

---

## How It Works

### 1. Make Changes on Main Branch
```bash
# Make your code changes
vim src/agents/planner.ts

# Build locally (optional, for verification)
yarn build
```

### 2. Commit and Push to GitHub
```bash
git add .
git commit -m "feat: Your changes"
git push origin main
```

### 3. Railway Auto-Deploys
- Railway detects the push automatically
- Builds both services (Wasteer API + GraphQL Server)
- Duration: 2-3 minutes
- Monitor in Railway dashboard

### 4. Wait for Deployment
Check Railway dashboard for deployment status:
- **Wasteer API**: https://railway.app/project/wonderful-appreciation
- **GraphQL Server**: https://railway.app/project/wonderful-appreciation

Look for green checkmark ✅ on latest deployment.

### 5. Test Manually
Run the post-deployment tests (see checklist below).

---

## Quick Post-Deployment Test (30 seconds)

After Railway shows ✅ deployment complete:

```bash
# Test Wasteer API
curl https://wasteer-api-production.up.railway.app/health

# Test GraphQL Server  
curl https://clear-ai-v2-production.up.railway.app/health

# Both should return healthy status
```

---

## Full Testing (5-10 minutes)

For major changes, run comprehensive tests:

```bash
# 1. Unit tests (local)
yarn test

# 2. Integration tests (against deployed API)
yarn test:integration:deployed

# 3. Agent tests (full system)
export GRAPHQL_DEPLOYED_URL="https://clear-ai-v2-production.up.railway.app/graphql"
yarn agent-tester:deployed

# 4. View results
open deployed-test-results.html
```

---

## Database Seeding

If you need to reset/reseed the production database:

```bash
# Reset and reseed with test data
curl -X POST https://wasteer-api-production.up.railway.app/api/reset

# Verify data loaded
curl https://wasteer-api-production.up.railway.app/api/shipments | jq '.count'
# Should return: 12
```

**Note:** This clears ALL data and reseeds. Use carefully!

---

## Monitoring Deployments

### Railway Dashboard
- View logs in real-time
- Check resource usage
- See deployment history
- Monitor health checks

### Health Endpoints
- Wasteer API: https://wasteer-api-production.up.railway.app/health
- GraphQL: https://clear-ai-v2-production.up.railway.app/health

---

## Rollback Procedure

If a deployment breaks something:

### Option 1: Quick Rollback (Easiest)
1. Go to Railway → Service → Deployments
2. Find previous working deployment
3. Click "Redeploy"

### Option 2: Git Revert
```bash
git revert HEAD
git push origin main
# Railway will auto-deploy the reverted code
```

### Option 3: Manual Fix
```bash
# Fix the code
# Push to main
# Railway will auto-deploy the fix
```

---

## Troubleshooting

### Deployment Fails to Build
- Check Railway logs for build errors
- Verify `yarn.lock` is up to date
- Check Dockerfile syntax

### Services Won't Start
- Check Railway environment variables
- Verify database connections (MongoDB Atlas, Neo4j Aura)
- Review application logs

### Tests Fail After Deployment
- Run tests locally first
- Compare local vs deployed results
- Check if data is seeded correctly

---

## Benefits of This Approach

✅ **Simple**: No complex CI/CD setup  
✅ **Fast**: Railway deploys in 2-3 minutes  
✅ **Flexible**: You control when to test  
✅ **Clear**: Direct feedback loop  
✅ **Cost-effective**: No CI/CD infrastructure needed

---

## When to Run Tests

### Always (30 seconds)
- Health checks after every deployment

### Usually (3 minutes)
- Integration tests after feature changes
- Quick agent test when modifying agent logic

### Sometimes (5 minutes)
- Full agent test suite for major releases
- Before important demos
- Weekly regression checks

---

## Summary

```
Make Changes → Push to Main → Railway Deploys → Test Manually → Done!
     ↓              ↓              ↓                ↓              ↓
  Local IDE    GitHub Repo    Auto-Build      Health Check    Success
```

**Simple. Fast. Reliable.** 🚀

