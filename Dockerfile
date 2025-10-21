# Multi-stage build for React application with BFF Proxy

# Stage 1: Build the React application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including express and http-proxy-middleware)
RUN npm ci

# Copy application source
COPY . .

# Build the React application
RUN npm run build

# Stage 2: Production runtime with Node.js (BFF Proxy)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for production dependencies
COPY package*.json ./

# Install ONLY production dependencies
# IMPORTANT: express and http-proxy-middleware must be in dependencies, not devDependencies
RUN npm ci --only=production

# Copy server.js (BFF proxy server)
COPY server.js ./

# Copy built React application from builder stage
COPY --from=builder /app/build ./build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port 8080
EXPOSE 8080

# Start BFF proxy server
CMD ["node", "server.js"]
