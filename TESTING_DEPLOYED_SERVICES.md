# Testing Deployed Services

This guide explains how to test your deployed services (Wasteer API + GraphQL Server) without modifying your local `.env` file.

## Prerequisites

1. ✅ Wasteer API deployed: `https://wasteer-api-production.up.railway.app`
2. ⏳ GraphQL Server deployed: Get URL from Railway after deployment
3. ✅ Both services running and healthy

---

## Quick Start

### 1. Set GraphQL URL

```bash
export GRAPHQL_DEPLOYED_URL="https://your-graphql-url.railway.app/graphql"
```

### 2. Run Quick Verification

```bash
./test-deployed-services.sh
```

This tests:
- ✅ Wasteer API health
- ✅ Wasteer API data
- ✅ GraphQL health
- ✅ GraphQL schema

---

## Available Test Commands

All commands automatically use the deployed services:

### Full Agent Test Suite (55 scenarios)
```bash
export GRAPHQL_DEPLOYED_URL="https://your-graphql-url.railway.app/graphql"
yarn agent-tester:deployed
```

**Output**:
- `deployed-test-results.json` - Detailed results
- `deployed-test-results.html` - Visual report

### All Jest Tests
```bash
export GRAPHQL_DEPLOYED_URL="https://your-graphql-url.railway.app/graphql"
yarn test:deployed
```

Runs all Jest tests (unit + integration + agent tests) against deployed services.

### Integration Tests Only
```bash
yarn test:integration:deployed
```

Tests Wasteer API integration without needing GraphQL.

### Quick Verification
```bash
export GRAPHQL_DEPLOYED_URL="https://your-graphql-url.railway.app/graphql"
yarn deploy:verify:deployed
```

Runs a quick health check and basic query test.

---

## Script Details

### `agent-tester:deployed`

**What it does:**
- Runs all 55 agent test scenarios
- Tests against deployed GraphQL server
- Verbose output for debugging
- Exports JSON and HTML reports

**Equivalent command:**
```bash
cd agent-tester && node dist/index.js run --all \
  --endpoint $GRAPHQL_DEPLOYED_URL \
  --verbose \
  --export ../deployed-test-results.json \
  --html ../deployed-test-results.html
```

### `test:deployed`

**What it does:**
- Runs all Jest tests
- Uses deployed Wasteer API
- Uses deployed GraphQL server
- 60-second timeout per test

**Environment variables set:**
- `WASTEER_API_URL=https://wasteer-api-production.up.railway.app/api`
- `GRAPHQL_HTTP_ENDPOINT=$GRAPHQL_DEPLOYED_URL`

### `test:integration:deployed`

**What it does:**
- Runs integration tests only
- Tests Wasteer API endpoints
- No GraphQL server needed

**Environment variables set:**
- `WASTEER_API_URL=https://wasteer-api-production.up.railway.app/api`

### `deploy:verify:deployed`

**What it does:**
- Quick health check
- Basic GraphQL query test
- Verifies connectivity

---

## Example Workflow

### 1. After deploying GraphQL server

```bash
# Set the URL
export GRAPHQL_DEPLOYED_URL="https://clear-ai-graphql-production.up.railway.app/graphql"

# Quick check
./test-deployed-services.sh

# Full agent tests
yarn agent-tester:deployed
```

### 2. View Results

```bash
# Open HTML report
open deployed-test-results.html

# Or check JSON
cat deployed-test-results.json | jq '.summary'
```

### 3. Expected Output

```
Summary:
  Total: 55
  Passed: 48
  Failed: 7
  Skipped: 0
  Success Rate: 87.3%
  Duration: 125.45s
```

---

## Troubleshooting

### Error: "GRAPHQL_DEPLOYED_URL not set"

**Solution:**
```bash
export GRAPHQL_DEPLOYED_URL="https://your-graphql-url.railway.app/graphql"
```

### Error: "Connection refused" or "ECONNREFUSED"

**Possible causes:**
1. GraphQL server not deployed yet
2. Wrong URL (check Railway dashboard)
3. Server crashed (check Railway logs)

**Solution:**
- Verify URL in Railway dashboard
- Check deployment logs for errors
- Ensure health check is passing

### Error: "GraphQL errors: Memory operation failed"

**Possible causes:**
1. Neo4j credentials incorrect in Railway
2. Pinecone API key missing
3. Network issue connecting to databases

**Solution:**
- Check Railway environment variables
- Verify Neo4j and Pinecone are accessible
- Check Railway logs for connection errors

### Error: "MCP tool failed: Network error"

**Possible causes:**
1. GraphQL can't reach Wasteer API
2. `WASTEER_API_URL` incorrect in Railway

**Solution:**
- Check `WASTEER_API_URL` in Railway GraphQL service settings
- Should be: `https://wasteer-api-production.up.railway.app/api`
- Test Wasteer API directly: `curl https://wasteer-api-production.up.railway.app/health`

---

## What's NOT Changed

Your local `.env` file remains unchanged! These scripts:
- ✅ Use environment variables at runtime
- ✅ Keep local and deployed configs separate
- ✅ Don't modify any files

You can still run local tests with:
```bash
yarn test              # Local tests
yarn test:integration  # Local integration tests
yarn agent-tester:all  # Local agent tests
```

---

## CI/CD Integration

Once you verify everything works locally, the same tests will run in GitHub Actions.

GitHub secrets needed:
- `OPENAI_API_KEY` - Your OpenAI API key
- `STAGING_GRAPHQL_ENDPOINT` - Your Railway GraphQL URL

The CI/CD workflow (`.github/workflows/agent-tests.yml`) automatically:
1. Builds the project
2. Runs agent tests against deployed server
3. Posts results as PR comments
4. Uploads test artifacts

---

## Next Steps

After successful testing:

1. ✅ Verify all tests pass
2. ✅ Add GitHub secrets
3. ✅ Test CI/CD with a PR
4. ✅ Monitor deployed services
5. ✅ Set up alerts (optional)

---

## Summary

**Commands to remember:**

```bash
# Set URL (do this once per terminal session)
export GRAPHQL_DEPLOYED_URL="https://your-url.railway.app/graphql"

# Quick test
./test-deployed-services.sh

# Full agent test suite
yarn agent-tester:deployed

# All tests
yarn test:deployed
```

**Files generated:**
- `deployed-test-results.json` - Machine-readable results
- `deployed-test-results.html` - Human-readable report

**No files modified:**
- `.env` stays unchanged
- Local tests still work
- Clean separation of concerns

🎉 **Happy testing!**

