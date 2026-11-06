# Stage 1: Build the production bundle
FROM node:24-alpine AS build

WORKDIR /app

# Install dependencies based on package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

# Copy full project source and build static + server artifacts into .output/
COPY . .
RUN npm run build

# Stage 2: Production runtime container
FROM node:24-alpine AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    REEF_CONFIG_PATH=/var/lib/reef-control/reef-config.json

WORKDIR /app

# Create persistent state directory owned by unprivileged node user
RUN mkdir -p /var/lib/reef-control && chown -R node:node /var/lib/reef-control

# Copy built artifacts from the build stage
COPY --from=build --chown=node:node /app/.output ./.output

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
