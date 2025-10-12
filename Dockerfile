FROM node:22-alpine

WORKDIR /app

# Enable Corepack for Yarn 4
RUN corepack enable

# Copy everything (needed for Yarn 4 workspaces)
COPY . .

# Install dependencies with Yarn 4
RUN yarn install

# Build TypeScript
RUN yarn build

# Expose port (Railway will override with PORT env var)
EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4001) + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/graphql/start-graphql-server.js"]

