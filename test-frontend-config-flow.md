# Frontend Configuration Selection Testing Guide

## Prerequisites

1. **Backend GraphQL Server** - Running on port 4001
2. **Frontend Development Server** - Running on port 3000 (or configured port)
3. **Wasteer API** - Running on port 4000 (for tool execution)

## Test Setup

### 1. Start Backend Services

```bash
# Terminal 1: Start GraphQL Server
cd /Users/yab/Projects/clear-ai-v2
npm run graphql:start

# Terminal 2: Start Wasteer API (if not already running)
cd /path/to/wasteer-api
npm start
```

### 2. Start Frontend

```bash
# Terminal 3: Start Frontend
cd /Users/yab/Projects/clear-ai-frontend
npm run dev
```

## Test Cases

### Test 1: UI Layout and Overflow

**Objective**: Verify that panels don't overlap and content displays properly

**Steps**:
1. Open browser to `http://localhost:3000`
2. Create a new session
3. Submit a query to generate some data
4. Click on the AI response to select it
5. Check right panel for request details

**Expected Results**:
- [ ] Left panel shows sessions without overflow
- [ ] Center panel shows messages with proper scrolling
- [ ] Right panel displays request details without horizontal scroll
- [ ] JSON data in right panel is properly wrapped and contained
- [ ] Panels can be resized without breaking layout
- [ ] No content is cut off or overlapping

### Test 2: Configuration Selectors

**Objective**: Verify config selectors work properly and don't cause layout issues

**Steps**:
1. In the center panel, look for "Agent Configurations" section
2. Check analyzer and summarizer dropdowns
3. Click on each dropdown to open them
4. Verify all configs are visible and selectable

**Expected Results**:
- [ ] Config selectors are visible above the input area
- [ ] Dropdowns open without being clipped by parent containers
- [ ] Long config names are truncated with ellipsis
- [ ] Default configs are marked with "(default)" text
- [ ] No Badge components causing layout issues
- [ ] Dropdowns have proper z-index and don't get hidden

### Test 3: Configuration Selection and Persistence

**Objective**: Verify that different configs produce different results and persist

**Steps**:
1. Note the current analyzer config selection
2. Submit a test query: "What is the weather in San Francisco?"
3. Wait for response and note the analysis results
4. Change to a different analyzer config
5. Submit the same query again
6. Compare the results
7. Refresh the page and verify configs are still selected

**Expected Results**:
- [ ] Different analyzer configs produce different numbers of insights
- [ ] High confidence configs filter out low-confidence insights
- [ ] Different summarizer configs produce different summary styles/lengths
- [ ] Selected configs persist after page refresh
- [ ] Default configs are auto-selected on first load

### Test 4: End-to-End Configuration Flow

**Objective**: Verify complete pipeline with custom configurations

**Steps**:
1. Select a high-confidence analyzer config (e.g., minConfidence: 0.9)
2. Select a detailed summarizer config (e.g., maxLength: 2000)
3. Submit query: "Analyze waste management data for contamination patterns"
4. Wait for complete pipeline execution
5. Click on the response to view details
6. Check the analysis tab for insights
7. Check the summary tab for detailed response

**Expected Results**:
- [ ] Query executes successfully with custom configs
- [ ] Analysis shows fewer insights due to high confidence threshold
- [ ] Summary is more detailed due to summarizer config
- [ ] Right panel shows complete request details
- [ ] All tabs (Plan, Execution, Analysis) display properly
- [ ] No console errors related to configuration

## Troubleshooting

### Common Issues

1. **Configs not loading**:
   - Check browser console for GraphQL errors
   - Verify backend is running on port 4001
   - Check network tab for failed requests

2. **Layout overflow**:
   - Check if panels are properly sized
   - Verify overflow-hidden classes are applied
   - Check for long text without proper truncation

3. **Configs not persisting**:
   - Check localStorage in browser dev tools
   - Verify ConfigProvider is working
   - Check for JavaScript errors

4. **Results not changing**:
   - Verify backend resolvers are using config IDs
   - Check browser console for resolver logs
   - Test with GraphQL directly to confirm configs work

### Debug Commands

```bash
# Check if backend is running
curl http://localhost:4001/health

# Test config selection via GraphQL
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { listAgentConfigs(isActive: true) { id name type isDefault } }"}'

# Check frontend build
cd /Users/yab/Projects/clear-ai-frontend
npm run build
```

## Success Criteria

All tests should pass with:
- ✅ No UI layout issues or content overflow
- ✅ Config selectors work properly without clipping
- ✅ Different configs produce measurably different results
- ✅ Configurations persist across page refreshes
- ✅ Complete pipeline works end-to-end with custom configs
- ✅ No console errors or failed network requests

## Notes

- The backend GraphQL server is already running on port 4001
- Configuration selection has been fixed in the resolvers
- Frontend UI issues have been addressed with proper overflow handling
- Test with the same query multiple times to verify config differences
