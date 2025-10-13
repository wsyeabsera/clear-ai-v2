#!/bin/bash

# Test Docker deployment locally
# This mimics exactly what Railway does

echo "🐳 Building Docker image..."
docker build -t clear-ai-v2:test .

echo ""
echo "🚀 Running container with cloud environment variables..."
docker run --rm \
  -e NODE_ENV=production \
  -e PORT=4001 \
  -e OPENAI_API_KEY="your-openai-api-key-here" \
  -e OPENAI_MODEL="gpt-3.5-turbo" \
  -e NEO4J_CLOUD_URI="your-neo4j-uri-here" \
  -e NEO4J_CLOUD_USERNAME="neo4j" \
  -e NEO4J_CLOUD_PASSWORD="your-neo4j-password-here" \
  -e NEO4J_CLOUD_DATABASE="neo4j" \
  -e MONGODB_CLOUD_URI="your-mongodb-uri-here" \
  -e PINECONE_API_KEY="your-pinecone-api-key-here" \
  -e PINECONE_ENVIRONMENT="us-east-1-aws" \
  -e PINECONE_INDEX_NAME="clear-ai" \
  -e MEMORY_EMBEDDING_MODEL="nomic-embed-text" \
  -e MEMORY_EMBEDDING_DIMENSIONS="768" \
  -e WASTEER_API_URL="http://host.docker.internal:4000/api" \
  -p 4001:4001 \
  clear-ai-v2:test

# Press Ctrl+C to stop

