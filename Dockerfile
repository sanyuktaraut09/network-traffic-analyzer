# Multi-stage production-ready Dockerfile for Network Traffic Analyzer Node.js application
FROM node:20-alpine AS base

# Set working directory inside container
WORKDIR /app

# Copy dependency definition files to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source code into image container
COPY . .

# Create unprivileged non-root user and group for runtime container security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose default HTTP server port
EXPOSE 3000

# Default container startup command
CMD ["node", "server.js"]
