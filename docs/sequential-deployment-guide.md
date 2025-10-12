# Sequential Deployment Guide - Clear AI v2

**IMPORTANT**: Services must be deployed in this exact order due to dependencies.

## 🏗️ Architecture Overview

```
┌─────────────────┐
│  Agent Tester   │  (Testing framework - runs locally or in CI/CD)
└────────┬────────┘
         │ tests
         ▼
┌─────────────────┐
│ GraphQL Server  │  Port 4001 (Railway Service 2)
│  (Agent System) │
└────────┬────────┘
         │ calls via WASTEER_API_URL
         ▼
┌─────────────────┐
│  Wasteer API    │  Port 4000 (Railway Service 1)
│  (REST API)     │
└────────┬────────┘
         │
         ▼
    MongoDB Atlas
```

---

## 🚀 Step 1: Deploy Wasteer API (First!)

### 1.1 Create Railway Project for Wasteer API

```bash
# Open Railway dashboard
railway open

# Create new service (or use existing project)
# Service name: "wasteer-api"
```

### 1.2 Configure Wasteer API in Railway Web UI

**Service Settings:**
- Name: `wasteer-api`
- Source: GitHub repository `clear-ai-v2`
- Root Directory: `/`
- Build Command: `yarn install && yarn build`
- Start Command: `node dist/api/server.js`
- Port: `4000` (Railway will expose it)

**Environment Variables for Wasteer API:**
```env
NODE_ENV=production
API_PORT=4000

# MongoDB Atlas
MONGODB_CLOUD_URI=your-mongodb-uri-here
```

### 1.3 Deploy Wasteer API

1. Click "Deploy" in Railway
2. Wait for build to complete (2-3 minutes)
3. Get the public URL from "Settings" → "Networking" → "Public Networking"
4. **SAVE THIS URL!** Example: `https://wasteer-api-production.up.railway.app`

### 1.4 Verify Wasteer API

```bash
# Test health endpoint
export WASTEER_URL="https://your-wasteer-api.railway.app"
curl $WASTEER_URL/health

# Should return:
# {
#   "success": true,
#   "message": "Waste Management API is running",
#   "timestamp": "..."
# }

# Test API endpoint
curl $WASTEER_URL/api/shipments

# Should return shipments data (empty array or data)
```

**✅ Checkpoint**: Wasteer API is now live and accessible!

---

## 🚀 Step 2: Deploy GraphQL Server (Second!)

### 2.1 Create Railway Service for GraphQL Server

```bash
# In Railway dashboard
# Click "+ New" → "Empty Service"
# Service name: "clear-ai-graphql"
```

### 2.2 Configure GraphQL Server in Railway Web UI

**Service Settings:**
- Name: `clear-ai-graphql`  
- Source: GitHub repository `clear-ai-v2`
- Root Directory: `/`
- Build Command: `yarn install && yarn build`
- Start Command: `node dist/graphql/start-graphql-server.js`
- Port: `4001` (Railway will expose it)

**Environment Variables for GraphQL Server:**
```env
NODE_ENV=production
PORT=4001

# LLM
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

# Neo4j Aura (CLOUD)
NEO4J_CLOUD_URI=your-neo4j-uri-here
NEO4J_CLOUD_USERNAME=neo4j
NEO4J_CLOUD_PASSWORD=your-neo4j-password-here
NEO4J_CLOUD_DATABASE=neo4j

# MongoDB Atlas (CLOUD) - separate database from API
MONGODB_CLOUD_URI=your-mongodb-uri-here

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=clear-ai

# Memory Settings
MEMORY_EMBEDDING_MODEL=nomic-embed-text
MEMORY_EMBEDDING_DIMENSIONS=768

# 🚨 CRITICAL: Point to deployed Wasteer API from Step 1!
WASTEER_API_URL=https://your-wasteer-api.railway.app/api

# Optional: Set public URL for logging
PUBLIC_URL=https://your-graphql-server.railway.app
```

**🚨 IMPORTANT**: Replace `WASTEER_API_URL` with the actual URL from Step 1.3!

### 2.3 Deploy GraphQL Server

1. Click "Deploy" in Railway
2. Wait for build to complete (3-4 minutes)
3. Watch logs for successful startup:
   ```
   ✓ LLM Provider ready
   ✓ Memory Manager connected (Neo4j + Pinecone)
   ✓ MCP Tools registered
   ✓ Agent Pipeline ready
   ✅ GraphQL Server fully operational!
   ```
4. Get the public URL from "Settings" → "Networking"
5. **SAVE THIS URL!** Example: `https://clear-ai-graphql-production.up.railway.app`

### 2.4 Verify GraphQL Server

```bash
# Test health endpoint
export GRAPHQL_URL="https://your-graphql-server.railway.app"
curl $GRAPHQL_URL/health

# Should return:
# {
#   "status": "ok",
#   "timestamp": "..."
# }

# Test GraphQL endpoint
curl -X POST $GRAPHQL_URL/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { executeQuery(query: \"List all shipments\") { requestId message toolsUsed } }"}'

# Should return actual agent response with tools used
```

**✅ Checkpoint**: GraphQL Server is now live and can communicate with Wasteer API!

---

## 🚀 Step 3: Configure Agent Tester (Third!)

### 3.1 Set GitHub Secret

```bash
# Go to GitHub repository
# Settings → Secrets and variables → Actions
# New repository secret:

Name: STAGING_GRAPHQL_ENDPOINT
Value: https://your-graphql-server.railway.app/graphql
```

### 3.2 Test Locally Against Staging

```bash
# Export your GraphQL URL
export STAGING_URL="https://your-graphql-server.railway.app/graphql"

# Build agent-tester
cd agent-tester
yarn build

# Run a single test
node dist/index.js run --scenario simple-shipments-001 --endpoint $STAGING_URL

# Run full suite
node dist/index.js run --all --endpoint $STAGING_URL --parallel 5

# Save as production baseline
node dist/index.js run --all --endpoint $STAGING_URL --save-baseline production-v1
```

### 3.3 Verify CI/CD

```bash
# Create test branch
git checkout -b test/ci-integration

# Make a small change (add comment)
echo "# Test CI/CD" >> README.md

# Commit and push
git add .
git commit -m "test: Verify CI/CD pipeline with deployed services"
git push origin test/ci-integration

# Open PR on GitHub
# GitHub Actions will:
# 1. Run tests against staging GraphQL
# 2. Detect regressions
# 3. Post results as PR comment
```

---

## 🔄 Environment Variable Summary

### Service 1: Wasteer API
- `NODE_ENV=production`
- `API_PORT=4000`
- `MONGODB_CLOUD_URI=mongodb+srv://...` (database: `clear-ai-wasteer`)

### Service 2: GraphQL Server
- `NODE_ENV=production`
- `PORT=4001`
- `OPENAI_API_KEY=sk-...`
- `NEO4J_CLOUD_URI=neo4j+s://...`
- `NEO4J_CLOUD_PASSWORD=...`
- `MONGODB_CLOUD_URI=mongodb+srv://...` (database: `clear-ai-graphql`)
- `PINECONE_API_KEY=pcsk_...`
- **`WASTEER_API_URL=https://wasteer-api-url/api`** ← Points to Service 1!

### Service 3: Agent Tester (CI/CD)
- GitHub Secret: `STAGING_GRAPHQL_ENDPOINT=https://graphql-url/graphql` ← Points to Service 2!

---

## 📊 Deployment Checklist

### ✅ Wasteer API (Service 1)
- [ ] Service created in Railway
- [ ] MongoDB Atlas connected
- [ ] Environment variables set
- [ ] Deployed successfully
- [ ] Health check passes (`/health`)
- [ ] API endpoints work (`/api/shipments`)
- [ ] **URL saved for next step**

### ✅ GraphQL Server (Service 2)
- [ ] Service created in Railway
- [ ] `WASTEER_API_URL` points to Service 1 URL
- [ ] Neo4j Aura connected
- [ ] MongoDB Atlas connected (separate database)
- [ ] Pinecone connected
- [ ] OpenAI API key set
- [ ] Deployed successfully
- [ ] Health check passes (`/health`)
- [ ] GraphQL endpoint works (`/graphql`)
- [ ] **URL saved for CI/CD**

### ✅ Agent Tester (CI/CD)
- [ ] GitHub secret `STAGING_GRAPHQL_ENDPOINT` set to Service 2 URL
- [ ] Local tests pass against staging
- [ ] Production baseline saved
- [ ] GitHub Actions workflow runs successfully
- [ ] PR comments show test results

---

## 🐛 Troubleshooting

### Issue: GraphQL Server can't reach Wasteer API

**Symptoms:**
```
Error: Failed to fetch from Wasteer API
ECONNREFUSED or timeout errors
```

**Solution:**
1. Verify Wasteer API is deployed and health check works
2. Check `WASTEER_API_URL` in GraphQL Server env vars
3. Make sure URL includes `/api` path: `https://your-url.railway.app/api`
4. Check Railway logs for both services

### Issue: GraphQL Server fails to start

**Symptoms:**
```
❌ Failed to start GraphQL server
Missing required environment variables
```

**Solution:**
1. Check all required env vars are set (Neo4j, MongoDB, Pinecone, OpenAI)
2. Verify database credentials are correct
3. Check Railway logs for specific error
4. Ensure `NODE_ENV=production` is set

### Issue: Agent Tester tests fail in CI/CD

**Symptoms:**
```
GraphQL server is not responding
Health check failed
```

**Solution:**
1. Verify `STAGING_GRAPHQL_ENDPOINT` GitHub secret is correct
2. Check GraphQL Server is running in Railway
3. Test manually: `curl https://your-graphql-url/health`
4. Review GitHub Actions logs for specific errors

---

## 💰 Cost Breakdown

| Service | Provider | Cost |
|---------|----------|------|
| Wasteer API | Railway | $2-5/month |
| GraphQL Server | Railway | $5-10/month |
| MongoDB Atlas | MongoDB | $0 (Free M0) |
| Neo4j Aura | Neo4j | $0 (Free tier) |
| Pinecone | Pinecone | $0 (your existing) |
| GitHub Actions | GitHub | $0 (Free for public repos) |
| **Total** | | **$7-15/month** |

---

## 🎉 Success!

When all three steps are complete:
- ✅ Wasteer API is live and serving data
- ✅ GraphQL Server is live and can call Wasteer API
- ✅ Agent Tester can test the full system
- ✅ CI/CD runs automatically on every PR
- ✅ Production baseline saved for regression detection

**Your deployment URLs:**
1. Wasteer API: `https://wasteer-api-xxxxx.railway.app`
2. GraphQL Server: `https://clear-ai-graphql-xxxxx.railway.app`
3. Test endpoint: `https://clear-ai-graphql-xxxxx.railway.app/graphql`

Now you can make PRs and GitHub Actions will automatically test against your deployed services! 🚀

