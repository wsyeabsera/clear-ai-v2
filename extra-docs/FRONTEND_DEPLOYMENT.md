# Frontend Deployment Guide

## Overview

The Clear AI v2 web application is built with React + TypeScript + Vite and Material-UI. It connects to the GraphQL backend deployed on Railway.

---

## Local Development

### Setup

```bash
cd web
npm install

# Create .env.local file
echo 'VITE_GRAPHQL_ENDPOINT=http://localhost:4001/graphql' > .env.local

# Start dev server
npm run dev
```

App runs at: `http://localhost:5173`

### From Root

```bash
# Start web app
yarn web:dev

# Build web app
yarn web:build

# Preview production build
yarn web:preview
```

---

## Deploy to Vercel (Recommended)

### Option 1: Vercel Dashboard (Easiest)

1. **Push to GitHub** (already done if reading this!)

2. **Go to Vercel**: https://vercel.com/new

3. **Import Project**:
   - Click "Add New Project"
   - Select your GitHub repository: `clear-ai-v2`
   - Click "Import"

4. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Add Environment Variable**:
   - Click "Environment Variables"
   - Add variable:
     - Name: `VITE_GRAPHQL_ENDPOINT`
     - Value: `https://clear-ai-v2-production.up.railway.app/graphql`
   - Click "Add"

6. **Deploy**:
   - Click "Deploy"
   - Wait 1-2 minutes
   - Copy your Vercel URL

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from web directory
cd web
vercel

# Follow prompts:
# - Setup: Yes
# - Project name: clear-ai-v2-web
# - Directory: ./
# - Override settings: No

# Add environment variable
vercel env add VITE_GRAPHQL_ENDPOINT
# Enter: https://clear-ai-v2-production.up.railway.app/graphql

# Deploy to production
vercel --prod
```

---

## Testing the Deployed Frontend

### 1. Open the Vercel URL

Your app will be at: `https://clear-ai-v2-web.vercel.app` (or similar)

### 2. Test Basic Functionality

1. **Submit a query**:
   - Type: "List all shipments"
   - Click "Submit"
   - Wait 5-10 seconds
   - Should see results with insights

2. **Check history**:
   - Query should appear in left sidebar
   - Click on it to view again

3. **Test another query**:
   - Try: "Show me contaminated facilities"
   - Should see different results

### 3. Verify GraphQL Connection

Open browser console (F12) and check for:
- ✅ No CORS errors
- ✅ GraphQL responses
- ✅ No 404 errors

---

## Environment Variables

### Production (Vercel)

```bash
VITE_GRAPHQL_ENDPOINT=https://clear-ai-v2-production.up.railway.app/graphql
```

### Local Development

```bash
VITE_GRAPHQL_ENDPOINT=http://localhost:4001/graphql
```

---

## Troubleshooting

### "Network error" in browser

**Cause**: GraphQL endpoint not accessible  
**Fix**:
- Check GraphQL server is running
- Verify CORS enabled on backend
- Check environment variable is set correctly

### "Failed to fetch"

**Cause**: GraphQL endpoint URL incorrect  
**Fix**:
- Verify `VITE_GRAPHQL_ENDPOINT` in Vercel
- Test endpoint directly: `curl https://clear-ai-v2-production.up.railway.app/health`

### Build fails on Vercel

**Cause**: Missing dependencies or TypeScript errors  
**Fix**:
- Test build locally: `cd web && npm run build`
- Check Vercel build logs
- Verify all dependencies in package.json

### History not updating

**Cause**: Polling interval too long  
**Fix**: History updates every 5 seconds automatically

---

## Features

### Current (MVP)

- ✅ Query input interface
- ✅ Results display with:
  - Main message
  - Tools used
  - Insights (type, description, confidence)
  - Entities (name, type, relationships)
  - Anomalies (type, severity, description)
- ✅ History sidebar
- ✅ Responsive design

### Coming Soon

- Real-time progress bar (WebSocket)
- Analytics dashboard
- Export results
- Share query links
- Dark mode

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Vercel (Frontend)                   │
│                                                   │
│  React + Material-UI                            │
│  Apollo Client                                   │
│                                                   │
└──────────────────┬──────────────────────────────┘
                   │
                   │ GraphQL
                   ↓
┌─────────────────────────────────────────────────┐
│         Railway (Backend)                        │
│                                                   │
│  GraphQL Server → Agent System → Wasteer API    │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

## Performance

### Build Size
- Initial bundle: ~638KB (194KB gzipped)
- Good for MVP, can optimize later

### Runtime Performance
- Query execution: 5-10 seconds (backend processing)
- UI rendering: Instant
- History updates: Every 5 seconds

---

## Cost

**Vercel Free Tier**:
- 100GB bandwidth/month
- Unlimited deployments
- Auto SSL certificate
- Global CDN
- **Cost: $0/month** 🎉

---

## Next Steps After Deployment

1. **Share the URL** with your team
2. **Test thoroughly** with various queries
3. **Enable WebSocket** for real-time progress (Phase 2)
4. **Add analytics dashboard** (Phase 2)
5. **Custom domain** (optional)

---

## Support

- **Frontend Issues**: Check browser console
- **Backend Issues**: Check Railway logs
- **GraphQL Errors**: Test with Apollo Studio

**Deployment Status**: ✅ Ready to deploy to Vercel!

