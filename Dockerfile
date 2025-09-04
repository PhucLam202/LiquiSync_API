# Use Node.js 20 LTS Alpine for smaller image size
FROM node:20-alpine

# Install curl for health check
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (needed for build)
RUN npm install

# Copy source code  
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Clean dev dependencies after build
RUN npm install --only=production && npm cache clean --force

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Start the application (skip prestart script since build is already done)
CMD ["node", "dist/server.js"]