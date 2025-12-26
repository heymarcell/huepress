FROM node:20-slim

# Force rebuild - increment to bust cache
ARG CACHEBURST=30

# Install fonts and fontconfig for proper font rendering
RUN apt-get update && apt-get install -y \
    fonts-freefont-ttf \
    fontconfig \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install Inter font
COPY fonts/*.ttf /usr/share/fonts/truetype/inter/
RUN fc-cache -f -v

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
