# Multi-stage build for React application

# Stage 1: Build the application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production image with nginx
FROM nginx:alpine

RUN apk add --no-cache gettext

# Copy built application from builder stage with nginx ownership
COPY --from=builder --chown=nginx:nginx /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script for runtime env substitution
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create necessary directories and set permissions for non-root operation
RUN touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/run/nginx.pid /etc/nginx/conf.d

# Switch to non-root nginx user
USER nginx

ENTRYPOINT ["/docker-entrypoint.sh"]

# Expose port 8080 for Fly.io
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
