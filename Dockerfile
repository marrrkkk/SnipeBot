FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD ["node", "dist/scripts/healthcheck.js"]
CMD ["sh", "-c", "node dist/scripts/migrate.js && exec node dist/index.js"]
