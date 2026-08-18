# ---------- Build ----------
FROM --platform=$BUILDPLATFORM node:22-bookworm AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- Runtime ----------
FROM mcr.microsoft.com/playwright:v1.61.1-noble
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_HEADFUL=1

# 1. Dépendances d'abord, pour que npx patchright résolve la version pinée du lockfile
COPY package*.json ./
RUN npm ci --omit=dev

# 2. Navigateur installé APRÈS, avec la bonne version de patchright disponible
RUN npx patchright install chrome --with-deps

RUN apt-get update && \
    apt-get install -y --no-install-recommends xvfb pandoc && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]