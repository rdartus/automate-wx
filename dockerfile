FROM mcr.microsoft.com/playwright:v1.61.1-noble
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_HEADFUL=1

# 1. Installer les dépendances EN PREMIER pour que npx voie la version pinée
COPY package*.json ./
RUN npm ci --omit=dev

# 2. Puis installer le(s) navigateur(s) réellement nécessaire(s)
RUN npx patchright install chromium chrome --with-deps

RUN apt-get update && \
    apt-get install -y --no-install-recommends xvfb pandoc && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]