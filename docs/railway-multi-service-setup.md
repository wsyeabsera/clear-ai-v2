# Railway Multi-Service Setup Guide

Since you have multiple services (Wasteer API, GraphQL Server) in one repository, you need to configure each service separately in Railway.

## Problem

Railway detected `railway.json` and applied it to ALL services, causing every service to run the GraphQL server.

## Solution

**Configure each service manually in Railway UI** (no config files needed)

---

## Service 1: Wasteer API

### Settings:
- **Name**: `wasteer-api`
- **Source**: GitHub repo `clear-ai-v2`
- **Root Directory**: `/`
- **Build Command**: `yarn install && yarn build`
- **Start Command**: `node dist/api/server.js` ⭐
- **Port**: `4000`

### Environment Variables:
```
NODE_ENV=production
API_PORT=4000
MONGODB_CLOUD_URI=your-mongodb-uri-here
```

### Health Check:
- Path: `/health`
- Expected: `{"success":true,"message":"Waste Management API is running",...}`

### Test:
```bash
curl https://wasteer-api-production.up.railway.app/health
curl https://wasteer-api-production.up.railway.app/api/shipments
curl https://wasteer-api-production.up.railway.app/api/facilities
```

---

## Service 2: GraphQL Server

### Settings:
- **Name**: `graphql-server` or `clear-ai-graphql`
- **Source**: Same GitHub repo `clear-ai-v2`
- **Root Directory**: `/`
- **Build Command**: `yarn install && yarn build`
- **Start Command**: `node dist/graphql/start-graphql-server.js` ⭐
- **Port**: `4001`

### Environment Variables:
```
NODE_ENV=production
PORT=4001
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
NEO4J_CLOUD_URI=your-neo4j-uri-here
NEO4J_CLOUD_USERNAME=neo4j
NEO4J_CLOUD_PASSWORD=your-neo4j-password-here
NEO4J_CLOUD_DATABASE=neo4j
MONGODB_CLOUD_URI=your-mongodb-uri-here
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=clear-ai
MEMORY_EMBEDDING_MODEL=nomic-embed-text
MEMORY_EMBEDDING_DIMENSIONS=768
WASTEER_API_URL=https://wasteer-api-production.up.railway.app/api  ⭐
```

### Health Check:
- Path: `/health`
- Expected: `{"status":"ok","timestamp":"..."}`

---

## How to Configure in Railway UI

### For Each Service:

1. **Click on the service**
2. **Settings Tab**:
   - Scroll to "Deploy" section
   - Click "Configure" or edit icon
   - Set **"Start Command"** (see above for each service)
   - Save

3. **Variables Tab**:
   - Click "Raw Editor"
   - Paste environment variables (see above for each service)
   - Click "Update Variables"

4. **Networking Tab**:
   - Click "Generate Domain" to get public URL
   - Copy the URL

---

## Current Issue

Your `wasteer-api` service is currently running the GraphQL server because it read `railway.json`.

**Fix**: 
1. In wasteer-api Settings, manually set Start Command to `node dist/api/server.js`
2. Railway will redeploy with correct command
3. Then `/api/shipments` will work!

---

## Testing Each Service

### Wasteer API:
```bash
export API_URL="https://wasteer-api-production.up.railway.app"
curl $API_URL/health
curl $API_URL/api/shipments
curl $API_URL/api/facilities
```

### GraphQL Server:
```bash
export GQL_URL="https://your-graphql-service.up.railway.app"
curl $GQL_URL/health
curl -X POST $GQL_URL/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { executeQuery(query: \"List all shipments\") { requestId message } }"}'
```

---

## Pro Tip

You can also use `nixpacks.toml` for service-specific config, but the Railway UI approach is simpler and more explicit.

