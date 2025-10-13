# GraphQL Server Deployment Guide

## Prerequisites

✅ Wasteer API deployed: https://wasteer-api-production.up.railway.app  
✅ MongoDB Atlas configured  
✅ Neo4j Aura configured  
✅ Pinecone configured  
✅ OpenAI API key ready

---

## Step-by-Step Deployment

### 1. Create New Railway Service

1. Go to your Railway project: https://railway.app/dashboard
2. Click **"+ New"** button
3. Select **"Empty Service"**
4. Name it: `clear-ai-graphql`

### 2. Connect GitHub Repository

1. In the new service, click **"Settings"** tab
2. Under **"Source"**, click **"Connect Repo"**
3. Select your repository: `clear-ai-v2`
4. Railway will detect the repo

### 3. Configure Service Settings

Go to **Settings** tab and configure:

#### Build Configuration
- **Builder**: Dockerfile
- **Dockerfile Path**: `Dockerfile.graphql`
- **Build Command**: (leave empty, Dockerfile handles it)

#### Deploy Configuration
- **Start Command**: (leave empty, Dockerfile handles it)
- **Healthcheck Path**: `/health`
- **Healthcheck Timeout**: 300
- **Restart Policy**: On Failure (10 retries)

### 4. Add Environment Variables

Click **"Variables"** tab and add these:

#### Required Variables

```bash
# Environment
NODE_ENV=production

# OpenAI (for LLM)
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4

# Neo4j Aura (for episodic memory)
NEO4J_CLOUD_URI=<your-neo4j-uri>
NEO4J_CLOUD_USERNAME=neo4j
NEO4J_CLOUD_PASSWORD=<your-neo4j-password>
NEO4J_CLOUD_DATABASE=neo4j

# Pinecone (for semantic memory)
PINECONE_API_KEY=<your-pinecone-api-key>
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=clear-ai

# Wasteer API (deployed in previous step)
WASTEER_API_URL=https://wasteer-api-production.up.railway.app/api

# Memory Configuration
MEMORY_EMBEDDING_MODEL=text-embedding-3-small
MEMORY_EMBEDDING_DIMENSIONS=1536
MEMORY_MAX_CONTEXT_MEMORIES=50
MEMORY_SIMILARITY_THRESHOLD=0.7

# Groq (optional, for faster inference)
GROQ_API_KEY=<your-groq-api-key>
GROQ_MODEL=llama-3.1-8b-instant
```

**Important Notes**:
- ❌ **DO NOT** set `PORT` manually (Railway auto-assigns it)
- ✅ Use `NEO4J_CLOUD_*` variables (not `NEO4J_URI`)
- ✅ `WASTEER_API_URL` must point to your deployed Wasteer API

### 5. Deploy

1. Click **"Deployments"** tab
2. Railway will automatically detect the push and build
3. Wait for deployment to complete (~2-3 minutes)

### 6. Generate Public Domain

1. Go to **"Settings"** → **"Networking"**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `https://clear-ai-graphql-production.up.railway.app`)

---

## Verification

### 1. Check Deployment Logs

Go to **"Deployments"** tab → Latest deployment → **"View Logs"**

You should see:
```
🚀 Starting Clear AI v2 GraphQL Server...
📡 Initializing LLM Provider...
✓ LLM Provider ready
🧠 Initializing Memory Manager...
✓ Memory Manager connected (Neo4j + Pinecone)
🔧 Initializing MCP Tools...
✓ MCP Tools registered
🤖 Creating Agent Pipeline...
✓ Agent Pipeline ready
🌐 Starting GraphQL Server...
✅ GraphQL Server fully operational!
   GraphQL endpoint: https://your-url/graphql
   Health check: https://your-url/health
```

### 2. Test Health Endpoint

```bash
# Replace with your actual Railway URL
export GRAPHQL_URL="https://clear-ai-graphql-production.up.railway.app"

# Test health check
curl $GRAPHQL_URL/health
# Expected: {"status":"healthy","timestamp":"..."}
```

### 3. Test GraphQL Endpoint

```bash
# Test with a simple query
curl -X POST $GRAPHQL_URL/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { __schema { queryType { name } } }"
  }'

# Expected: {"data":{"__schema":{"queryType":{"name":"Query"}}}}
```

### 4. Test Agent Query

```bash
# Test the agent system
curl -X POST $GRAPHQL_URL/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { executeQuery(query: \"List all shipments\") { queryId status result } }"
  }'

# Expected: Response with queryId and status
```

---

## Update GitHub Secrets

After deployment, update your GitHub secret:

1. Go to: https://github.com/YOUR_USERNAME/clear-ai-v2/settings/secrets/actions
2. Add/Update:
   - Name: `STAGING_GRAPHQL_ENDPOINT`
   - Value: `https://clear-ai-graphql-production.up.railway.app/graphql`

This allows GitHub Actions to run tests against the deployed server.

---

## Troubleshooting

### Issue: "Application failed to respond"

**Cause**: App might be listening on wrong host/port  
**Check**: View logs to see what port app is listening on  
**Fix**: Ensure `PORT` env var is NOT manually set (let Railway assign it)

### Issue: "Memory operation failed: connect"

**Cause**: Neo4j or Pinecone credentials incorrect  
**Check**: 
```bash
# Verify Neo4j connection
neo4j+s://cccb621d.databases.neo4j.io

# Check Railway logs for connection errors
```
**Fix**: Double-check `NEO4J_CLOUD_*` variables in Railway

### Issue: "MCP tool failed: Network error"

**Cause**: Can't reach Wasteer API  
**Check**: 
```bash
# Test Wasteer API from your local machine
curl https://wasteer-api-production.up.railway.app/health
```
**Fix**: Verify `WASTEER_API_URL` is correct in Railway variables

### Issue: "OpenAI API error"

**Cause**: Invalid or expired API key  
**Check**: Test API key locally  
**Fix**: Update `OPENAI_API_KEY` in Railway variables

---

## Next Steps After Deployment

1. ✅ Verify all services are running
2. ✅ Test end-to-end agent query
3. ✅ Update GitHub secret for CI/CD
4. ✅ Run agent tests against deployed server
5. ✅ Set up monitoring and alerts

---

## Environment Variables Summary

| Variable | Source | Example |
|----------|--------|---------|
| `NODE_ENV` | Manual | `production` |
| `PORT` | Railway (auto) | `8080` (don't set manually) |
| `OPENAI_API_KEY` | OpenAI | `sk-...` |
| `NEO4J_CLOUD_URI` | Neo4j Aura | `neo4j+s://xxxxx.databases.neo4j.io` |
| `NEO4J_CLOUD_USERNAME` | Neo4j Aura | `neo4j` |
| `NEO4J_CLOUD_PASSWORD` | Neo4j Aura | `your-password` |
| `PINECONE_API_KEY` | Pinecone | `pcsk_...` |
| `WASTEER_API_URL` | Railway (Wasteer API) | `https://wasteer-api-production.up.railway.app/api` |

---

## Cost Estimate

- **Railway**: ~$5-10/month (depends on usage)
- **MongoDB Atlas**: Free (M0 tier)
- **Neo4j Aura**: Free tier
- **Pinecone**: Free tier
- **OpenAI**: Pay-per-use (~$0.002 per 1K tokens)

**Total**: ~$5-15/month

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Railway Deployment                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │   GraphQL Server     │──────│   Wasteer API        │    │
│  │   (Agent System)     │      │   (Data Layer)       │    │
│  └──────────────────────┘      └──────────────────────┘    │
│            │                              │                  │
│            │                              │                  │
└────────────┼──────────────────────────────┼──────────────────┘
             │                              │
             ▼                              ▼
    ┌────────────────┐           ┌───────────────────┐
    │   Neo4j Aura   │           │  MongoDB Atlas    │
    │ (Episode Mem)  │           │  (Waste Data)     │
    └────────────────┘           └───────────────────┘
             │
             ▼
    ┌────────────────┐
    │   Pinecone     │
    │ (Semantic Mem) │
    └────────────────┘
             │
             ▼
    ┌────────────────┐
    │   OpenAI API   │
    │   (LLM)        │
    └────────────────┘
```

---

**Ready to deploy? Follow the steps above!** 🚀

