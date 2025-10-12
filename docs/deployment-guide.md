# Clear AI v2 - Deployment Guide

Complete guide for deploying Clear AI v2 GraphQL server to Railway with managed cloud databases.

## Prerequisites

- GitHub account
- Railway account (sign up with GitHub)
- MongoDB Atlas account (free tier)
- Neo4j Aura account (free tier)
- Existing Pinecone account (already configured)
- OpenAI API key (already configured)

---

## Part 1: Setup Managed Databases

### 1.1 MongoDB Atlas Setup (Free M0 Tier)

**Already Completed!** ✅ Your `.env` shows:
```
MONGODB_CLOUD_URI=mongodb+srv://yeabsera0830_db_user:vzBy21TV8HlG9PSj@cluster0.eclb7pj.mongodb.net/
```

If you need to verify or modify:
1. Go to https://cloud.mongodb.com/
2. Select your cluster
3. Click "Connect" → "Connect your application"
4. Copy connection string and update `MONGODB_CLOUD_URI`

**Database Configuration:**
- Tier: M0 (Free)
- Storage: 512MB
- RAM: Shared
- Location: AWS (closest to your users)
- Whitelist IPs: `0.0.0.0/0` (allow from anywhere for Railway)

### 1.2 Neo4j Aura Setup (Free Tier)

**Already Completed!** ✅ Your `.env` shows:
```
NEO4J_CLOUD_URI=neo4j+s://cccb621d.databases.neo4j.io
NEO4J_CLOUD_USERNAME=neo4j
NEO4J_CLOUD_PASSWORD=6cPWKGr217vB1s6V4Yo04HcSCj-JgpeLdFZiEBPa40g
```

If you need to verify or modify:
1. Go to https://console.neo4j.io/
2. Select your instance
3. Copy connection details

**Instance Configuration:**
- Tier: AuraDB Free
- Storage: 200k nodes, 400k relationships
- Location: AWS (same region as MongoDB for best performance)

---

## Part 2: Deploy to Railway

### 2.1 Initial Railway Setup

1. **Sign up for Railway**
   - Go to https://railway.app
   - Click "Login" → "Login with GitHub"
   - Authorize Railway to access your GitHub account

2. **Create New Project**
   - Click "+ New Project"
   - Select "Deploy from GitHub repo"
   - Select `clear-ai-v2` repository
   - Railway will automatically detect Node.js/TypeScript project

3. **Initial Deploy** (will fail - expected!)
   - Railway will attempt first deployment
   - It will fail because environment variables are missing
   - This is expected - we'll fix it in the next step

### 2.2 Configure Environment Variables

1. **Open Project Settings**
   - Click on your service
   - Go to "Variables" tab

2. **Add Required Variables** (copy from your `.env`):

```bash
# Core Configuration
NODE_ENV=production
PORT=4001

# LLM
OPENAI_API_KEY=<your-openai-key>
OPENAI_MODEL=gpt-3.5-turbo

# Neo4j Aura (use CLOUD variables)
NEO4J_CLOUD_URI=neo4j+s://cccb621d.databases.neo4j.io
NEO4J_CLOUD_USERNAME=neo4j
NEO4J_CLOUD_PASSWORD=6cPWKGr217vB1s6V4Yo04HcSCj-JgpeLdFZiEBPa40g
NEO4J_CLOUD_DATABASE=neo4j

# MongoDB Atlas (use CLOUD variable)
MONGODB_CLOUD_URI=mongodb+srv://yeabsera0830_db_user:vzBy21TV8HlG9PSj@cluster0.eclb7pj.mongodb.net/

# Pinecone
PINECONE_API_KEY=<your-pinecone-key>
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=clear-ai

# Wasteer API
WASTEER_API_URL=http://localhost:4000/api
# Note: Update this when you deploy the Wasteer API

# Memory Settings (optional - defaults will be used)
MEMORY_EMBEDDING_MODEL=nomic-embed-text
MEMORY_EMBEDDING_DIMENSIONS=768
```

3. **Set Public URL** (after first successful deploy):
   - Railway will provide a public URL like: `https://clear-ai-v2-production.up.railway.app`
   - Add this variable:
     ```
     PUBLIC_URL=https://your-actual-url.railway.app
     ```

### 2.3 Trigger Redeploy

1. Click "Deploy" → "Redeploy"
2. Watch the build logs
3. Deployment should succeed now!

### 2.4 Verify Deployment

**Option 1: Use Health Check**
```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Option 2: Use Verification Script**
```bash
# From your local machine
export STAGING_URL="https://your-app.railway.app/graphql"
yarn deploy:verify:staging
```

Expected output:
```
🔍 Verifying deployment at: https://your-app.railway.app/graphql
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  Testing health endpoint...
   ✅ Health check passed: { status: 'ok', timestamp: '...' }
2️⃣  Testing GraphQL endpoint...
   ✅ GraphQL query successful!
   Request ID: test-1234567890
   Tools Used: [ 'shipments_list' ]
   Duration: 2341ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Deployment verification PASSED!
```

**Option 3: Run Agent Tests Against Staging**
```bash
export STAGING_URL="https://your-app.railway.app/graphql"
yarn agent-tester:staging
```

---

## Part 3: Railway Configuration

### 3.1 Custom Domain (Optional)

1. Go to "Settings" → "Domains"
2. Click "Generate Domain" for a Railway subdomain
3. Or add custom domain:
   - Add your domain
   - Configure DNS records as shown
   - Wait for SSL certificate provisioning

### 3.2 Resource Limits

Railway provides:
- **Free Tier**: $5 credit per month
- **Pro Tier** ($20/month):
  - $20 usage credit per month
  - Longer build timeouts
  - More concurrent builds
  - Priority support

**Estimated costs for this app:**
- Development/staging: ~$3-5/month (occasional usage)
- Production: ~$10-15/month (regular usage)

### 3.3 Monitoring

**View Logs:**
1. Click on your service
2. Go to "Observability" tab
3. View real-time logs

**Key log messages to look for:**
```
🚀 Starting Clear AI v2 GraphQL Server...
✓ LLM Provider ready
✓ Memory Manager connected (Neo4j + Pinecone)
✓ MCP Tools registered
✓ Agent Pipeline ready
✅ GraphQL Server fully operational!
```

**Check Metrics:**
- CPU usage
- Memory usage
- Network traffic
- Response times

---

## Part 4: Environment-Specific Configuration

### 4.1 Local Development

Uses `*_LOCAL_*` or default environment variables:
```bash
NODE_ENV=development
NEO4J_URI=bolt://localhost:7687
MONGODB_LOCAL_URI=mongodb://localhost:27017/wasteer
```

**Start local server:**
```bash
yarn graphql:dev
```

### 4.2 Staging/Production

Uses `*_CLOUD_*` environment variables:
```bash
NODE_ENV=production
NEO4J_CLOUD_URI=neo4j+s://...
MONGODB_CLOUD_URI=mongodb+srv://...
```

**The code automatically switches based on `NODE_ENV`!**

---

## Part 5: Troubleshooting

### Issue: Deployment fails with "Missing environment variables"

**Solution:**
- Check Railway "Variables" tab
- Ensure all required variables are set (see section 2.2)
- Redeploy after adding variables

### Issue: "Cannot connect to Neo4j"

**Solution:**
1. Verify Neo4j Aura instance is running
2. Check connection string format: `neo4j+s://` (note the `+s`)
3. Verify credentials in Railway variables
4. Check Neo4j Aura dashboard for connection status

### Issue: "Cannot connect to MongoDB"

**Solution:**
1. Verify MongoDB Atlas cluster is active
2. Check IP whitelist includes `0.0.0.0/0`
3. Verify connection string includes database name
4. Check username/password are correct

### Issue: "Health check passes but GraphQL queries fail"

**Solution:**
1. Check Railway logs for error messages
2. Verify all agent dependencies initialized:
   - LLM Provider
   - Memory Manager
   - MCP Tools
3. Test specific query using GraphQL playground
4. Check `WASTEER_API_URL` is accessible from Railway

### Issue: "High latency in production"

**Solution:**
1. Ensure Neo4j Aura and MongoDB Atlas are in same AWS region
2. Consider upgrading Railway tier for more resources
3. Check if Pinecone index is in same region
4. Monitor Railway metrics for resource constraints

### Issue: "Deployment succeeds but server crashes"

**Solution:**
1. Check Railway logs for crash reason
2. Common causes:
   - Memory limit exceeded (upgrade Railway tier)
   - Uncaught exceptions (check error handling)
   - Database connection timeouts
3. Enable Railway "Restart Policy" (already in `railway.json`)

---

## Part 6: Post-Deployment

### 6.1 Set Up GitHub Secrets

For CI/CD integration:
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add new repository secret:
   - Name: `STAGING_GRAPHQL_ENDPOINT`
   - Value: `https://your-app.railway.app/graphql`

### 6.2 Update Agent Tester

Test your deployed endpoint:
```bash
export STAGING_URL="https://your-app.railway.app/graphql"
cd agent-tester
yarn test:run --all --endpoint $STAGING_URL --parallel 5
```

### 6.3 Create Baseline

Save current test results as baseline:
```bash
cd agent-tester
yarn test:run --all --endpoint $STAGING_URL --save-baseline production-v1
```

---

## Part 7: Deployment Checklist

### Pre-Deployment
- [ ] MongoDB Atlas cluster created and accessible
- [ ] Neo4j Aura instance created and accessible
- [ ] All environment variables documented
- [ ] Local tests passing
- [ ] Code pushed to GitHub

### Deployment
- [ ] Railway project created
- [ ] GitHub repository connected
- [ ] Environment variables configured in Railway
- [ ] First deployment successful
- [ ] Health check passing
- [ ] GraphQL endpoint responding

### Post-Deployment
- [ ] Verification script passes
- [ ] Agent tester runs successfully against staging
- [ ] Logs show no errors
- [ ] Baseline saved for regression detection
- [ ] GitHub secrets configured for CI/CD
- [ ] Monitoring set up
- [ ] Documentation updated with actual URLs

---

## Part 8: Next Steps

1. **Set up CI/CD** (Phase 4, Part 3)
   - Configure GitHub Actions
   - Automatic testing on PR
   - Regression detection

2. **Deploy Wasteer API**
   - Update `WASTEER_API_URL` in Railway
   - Redeploy GraphQL server

3. **Production Environment**
   - Create separate Railway project for production
   - Use different database namespaces
   - Implement proper monitoring and alerting

4. **Scale Up**
   - Monitor resource usage
   - Upgrade Railway tier if needed
   - Consider database scaling options

---

## Support

- **Railway Docs**: https://docs.railway.app/
- **MongoDB Atlas Docs**: https://www.mongodb.com/docs/atlas/
- **Neo4j Aura Docs**: https://neo4j.com/docs/aura/

## Estimated Total Monthly Cost

| Service | Plan | Cost |
|---------|------|------|
| Railway | Hobby | $5-15 |
| MongoDB Atlas | M0 Free | $0 |
| Neo4j Aura | Free | $0 |
| Pinecone | Free | $0 |
| OpenAI API | Pay-per-use | Variable |
| **Total** | | **$5-15/month** |

---

🎉 **Congratulations!** Your Clear AI v2 GraphQL server is now deployed and accessible from anywhere!

