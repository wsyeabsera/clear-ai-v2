# Deployment Strategy Blueprint

## Local Development

```bash
# 1. Install dependencies
yarn install

# 2. Setup environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start services (Docker)
docker-compose up -d neo4j pinecone

# 4. Run in development mode
yarn dev
```

## Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  clear-ai:
    build: .
    ports:
      - "3000:3000"
    environment:
      - WASTEER_API_URL=${WASTEER_API_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - NEO4J_URI=bolt://neo4j:7687
      - PINECONE_API_KEY=${PINECONE_API_KEY}
    depends_on:
      - neo4j
  
  neo4j:
    image: neo4j:latest
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/password
    volumes:
      - neo4j-data:/data
  
volumes:
  neo4j-data:
```

## Production Deployment

### 1. Build
```bash
yarn build
```

### 2. Environment
```bash
export NODE_ENV=production
export WASTEER_API_URL=http://localhost:4000
# ... other env vars
```

### 3. Run
```bash
node dist/main.js
```

## CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: yarn install
      - run: NODE_OPTIONS=--experimental-vm-modules yarn jest
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          # Deploy steps here
```

## Monitoring

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(orchestrator.getMetrics());
});
```

