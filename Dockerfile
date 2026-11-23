# db-learning-app – single self-contained container (PostgreSQL/WASM + emulators + web UI)
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8765

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY server.js ./
COPY engines ./engines
COPY content ./content
COPY data ./data
COPY public ./public

USER node
EXPOSE 8765
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8765/api/health || exit 1
CMD ["node", "server.js"]
