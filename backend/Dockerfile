FROM node:18-alpine

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files with correct ownership
COPY --chown=nodejs:nodejs package*.json ./

# Install dependencies as root (needed for some native modules)
# Use production-only install for production, full install for development
ARG NODE_ENV=production
RUN if [ "$NODE_ENV" = "development" ]; then npm ci; else npm ci --only=production; fi

# Copy source code with correct ownership
COPY --chown=nodejs:nodejs . .

# Ensure directories are owned by the app user
RUN chown -R nodejs:nodejs /app && \
    mkdir -p /app/uploads/videos /app/uploads/thumbnails /app/logs && \
    chown -R nodejs:nodejs /app/uploads /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "src/server.js"]
