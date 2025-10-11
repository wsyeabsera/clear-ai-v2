#!/bin/bash
# MCP Server Wrapper Script
# This ensures the correct environment for running the MCP server

cd /Users/yab/Projects/clear-ai-v2
export WASTEER_API_URL="${WASTEER_API_URL:-http://localhost:4000/api}"

# Use yarn to run with proper PnP resolution
exec /Users/yab/.nvm/versions/node/v22.19.0/bin/yarn node dist/main.js

