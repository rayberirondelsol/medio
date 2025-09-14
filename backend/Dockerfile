FROM node:18-alpine

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files with correct ownership
COPY --chown=nodejs:nodejs package*.json ./

# Install dependencies as root (needed for some native modules)
RUN npm ci --only=production

# Copy source code with correct ownership
COPY --chown=nodejs:nodejs . .

# Create upload directories with correct permissions
RUN mkdir -p /app/uploads/videos /app/uploads/thumbnails && \
    chown -R nodejs:nodejs /app/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "src/server.js"]