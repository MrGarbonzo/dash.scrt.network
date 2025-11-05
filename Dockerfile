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
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Install envsubst for environment variable substitution
RUN apk add --no-cache gettext

# Copy custom nginx config
RUN printf 'server {\n    listen 3000;\n    server_name _;\n    root /usr/share/nginx/html;\n    index index.html;\n\n    gzip on;\n    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;\n\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n\n    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {\n        expires 1y;\n        add_header Cache-Control "public, immutable";\n    }\n\n    add_header X-Frame-Options "SAMEORIGIN" always;\n    add_header X-Content-Type-Options "nosniff" always;\n    add_header X-XSS-Protection "1; mode=block" always;\n}\n' > /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create config template
RUN cat > /usr/share/nginx/html/config.js.template <<'EOF'
window.ENV = {
  VITE_FAUCET_URL: "${VITE_FAUCET_URL}",
  VITE_FAUCET_ADDRESS: "${VITE_FAUCET_ADDRESS}",
  VITE_MIXPANEL_ENABLED: "${VITE_MIXPANEL_ENABLED}",
  VITE_MIXPANEL_PROJECT_TOKEN: "${VITE_MIXPANEL_PROJECT_TOKEN}",
  VITE_DEBUG_MODE: "${VITE_DEBUG_MODE}",
  TRANSAK_API_KEY: "${TRANSAK_API_KEY}"
};
EOF

# Create entrypoint script
RUN cat > /docker-entrypoint.sh <<'EOF'
#!/bin/sh
# Inject environment variables into config.js
envsubst < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js
echo "Runtime configuration injected"
exec nginx -g "daemon off;"
EOF
RUN chmod +x /docker-entrypoint.sh

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Run entrypoint script
CMD ["/docker-entrypoint.sh"]
