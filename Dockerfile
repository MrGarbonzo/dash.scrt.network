# Multi-stage build for Secret Dashboard

# Stage 1: Build the Vite application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build production bundle
# Environment variables will be injected at runtime
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 3000;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA routing - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Add script to inject environment variables at runtime
COPY <<'EOF' /docker-entrypoint.d/40-envsubst-on-templates.sh
#!/bin/sh
set -e

# Create runtime config file with environment variables
cat > /usr/share/nginx/html/config.js <<JSEOF
window.ENV = {
  VITE_FAUCET_URL: '${VITE_FAUCET_URL:-http://localhost:3001/claim}',
  VITE_FAUCET_ADDRESS: '${VITE_FAUCET_ADDRESS:-secret1kreu9upy9v9hlm2e4xytmm2ptn6qag7vp5jfr3}',
  VITE_MIXPANEL_ENABLED: '${VITE_MIXPANEL_ENABLED:-false}',
  VITE_MIXPANEL_PROJECT_TOKEN: '${VITE_MIXPANEL_PROJECT_TOKEN:-}',
  VITE_DEBUG_MODE: '${VITE_DEBUG_MODE:-false}',
  TRANSAK_API_KEY: '${TRANSAK_API_KEY:-}'
};
JSEOF

echo "Runtime configuration injected successfully"
EOF

RUN chmod +x /docker-entrypoint.d/40-envsubst-on-templates.sh

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# nginx will start automatically via the base image's entrypoint
