FROM node:22-alpine

ARG APP_VERSION=dev
ARG APP_COMMIT=unknown

ENV NODE_ENV=production \
    PORT=3000 \
    APP_VERSION=${APP_VERSION} \
    APP_COMMIT=${APP_COMMIT}

LABEL org.opencontainers.image.title="EKFC Field Support API" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${APP_COMMIT}"

WORKDIR /app
COPY app/server.js ./app/server.js
COPY app/ticket-store.js ./app/ticket-store.js

# The runtime runs Node directly; npm and npx are not needed in the production image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "app/server.js"]
