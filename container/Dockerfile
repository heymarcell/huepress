FROM node:20-slim

# Force rebuild - increment to bust cache
ARG CACHEBURST=22

# Install only essential fonts for PDF text rendering
RUN apt-get update && apt-get install -y \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy application files
COPY . .

# Expose port for the service
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD timeout 5s bash -c '</dev/tcp/localhost/4000' || exit 1

# Start the server
CMD ["node", "server.js"]
