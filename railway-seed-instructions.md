# Seed Railway Database

## Option 1: Via Railway Web UI (Recommended)
1. Go to: https://railway.app/dashboard
2. Select your project → Wasteer API service
3. Click "Deployments" tab
4. Click 3 dots (⋮) on latest deployment
5. Select "Run Command"
6. Enter: yarn seed:prod
7. Click "Run"

## Option 2: Via Railway CLI
Run this in your terminal (from project root):

```bash
# Link to the correct service
railway link

# Run the seed command
railway run --service wasteer-api yarn seed:prod
```

## Option 3: Create a One-Time Seed Job
You can also create a separate Railway service that only runs the seed:

1. Create new service in Railway
2. Connect same GitHub repo
3. Set Dockerfile path: Dockerfile.wasteer-api
4. Set Start Command: yarn seed:prod
5. Deploy once, then delete the service

## Verify Seeding Worked
After seeding, test with:

```bash
curl https://wasteer-api-production.up.railway.app/api/shipments
curl https://wasteer-api-production.up.railway.app/api/facilities
```

You should see sample data returned!
