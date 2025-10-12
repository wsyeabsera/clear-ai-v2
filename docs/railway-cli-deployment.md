# Railway CLI Deployment Guide

Quick guide to deploy Clear AI v2 using Railway CLI.

## Step 1: Install Railway CLI

```bash
# macOS/Linux
npm install -g @railway/cli

# Or using brew (macOS)
brew install railway
```

## Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

## Step 3: Initialize Project

```bash
# In your project root
cd /Users/yab/Projects/clear-ai-v2

# Link to existing project (if you created one in web UI)
railway link

# OR create a new project
railway init
```

## Step 4: Set Environment Variables

```bash
# Set variables one by one
railway variables set NODE_ENV=production
railway variables set PORT=4001

# Or set multiple from your .env file
# First, create a railway-specific env file
cat > .env.railway << 'EOF'
NODE_ENV=production
PORT=4001
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

# Neo4j Aura (CLOUD)
NEO4J_CLOUD_URI=your-neo4j-uri-here
NEO4J_CLOUD_USERNAME=neo4j
NEO4J_CLOUD_PASSWORD=your-neo4j-password-here
NEO4J_CLOUD_DATABASE=neo4j

# MongoDB Atlas (CLOUD)
MONGODB_CLOUD_URI=your-mongodb-uri-here

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=clear-ai

# Memory Settings
MEMORY_EMBEDDING_MODEL=nomic-embed-text
MEMORY_EMBEDDING_DIMENSIONS=768

# Wasteer API (update when deployed)
WASTEER_API_URL=http://localhost:4000/api
EOF

# Load all variables from file
while IFS='=' read -r key value; do
  [[ $key =~ ^#.*$ ]] && continue
  [[ -z $key ]] && continue
  railway variables set "$key=$value"
done < .env.railway

# Delete the temp file
rm .env.railway
```

## Step 5: Deploy

```bash
# Deploy to Railway
railway up

# Or if you want to watch logs
railway up --detach
railway logs
```

## Step 6: Get Your Deployment URL

```bash
# Get the public URL
railway domain

# Or open in browser
railway open
```

## Step 7: Verify Deployment

```bash
# Get your URL
export STAGING_URL=$(railway domain | grep "https")

# Verify it's working
curl $STAGING_URL/health

# Test with verification script
yarn deploy:verify:staging
```

## Common Issues

### Issue: "No project found"

```bash
# Link to your project
railway link
# Select your project from the list
```

### Issue: "Build failed"

```bash
# Check logs
railway logs

# Common fixes:
# 1. Make sure railway.json exists
# 2. Check if all dependencies are in package.json
# 3. Verify Node version (22) is compatible
```

### Issue: "Environment variables not set"

```bash
# List current variables
railway variables

# Check specific variable
railway variables get NODE_ENV
```

### Issue: "Port already in use"

Railway automatically assigns a PORT, but we override with PORT=4001 in env vars.
The code already handles this with `parseInt(process.env.PORT || '4001')`.

## Useful Commands

```bash
# View logs
railway logs

# View all variables
railway variables

# Delete a variable
railway variables delete VARIABLE_NAME

# Restart service
railway restart

# Check status
railway status

# Open Railway dashboard
railway open
```

## After Deployment

1. **Get your public URL**:
   ```bash
   export STAGING_URL=$(railway domain | grep "https")
   echo $STAGING_URL
   ```

2. **Update GitHub Secret**:
   - Go to GitHub repo → Settings → Secrets → Actions
   - Add `STAGING_GRAPHQL_ENDPOINT` = `https://your-url.railway.app/graphql`

3. **Test the deployment**:
   ```bash
   yarn deploy:verify:staging
   cd agent-tester
   yarn build
   node dist/index.js run --scenario simple-shipments-001 --endpoint $STAGING_URL/graphql
   ```

4. **Create baseline**:
   ```bash
   cd agent-tester
   node dist/index.js run --all --endpoint $STAGING_URL/graphql --save-baseline production-v1
   ```

## Pro Tips

- Use `railway logs -f` to follow logs in real-time
- Use `railway run <command>` to run commands with Railway environment
- Use `railway shell` to open an interactive shell with all env vars loaded
- Railway auto-deploys on git push to main (if connected to GitHub)

## Cost Management

```bash
# Check current usage
railway status

# View billing
railway open
# Navigate to project settings → Usage
```

Free tier includes:
- $5 credit per month
- Hobby projects get more with paid plan

Expected cost for this project: **$5-15/month**

