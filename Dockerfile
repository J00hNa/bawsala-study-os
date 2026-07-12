FROM node:26-bookworm-slim@sha256:e999d087492c7227c85adc70574cf9d3cce774c3e6d7b8dfe473ee6b142c8f2c AS build
WORKDIR /src
COPY package.json package-lock.json ./
COPY tools ./tools
COPY assets ./assets
RUN node tools/build-assets.mjs

FROM node:26-bookworm-slim@sha256:e999d087492c7227c85adc70574cf9d3cce774c3e6d7b8dfe473ee6b142c8f2c AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    BAWSALA_DATA_DIR=/var/lib/bawsala \
    BAWSALA_STORAGE=sqlite
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node server.js service-worker.js manifest.webmanifest index.html robots.txt _headers LICENSE ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node config ./config
COPY --chown=node:node pages ./pages
COPY --chown=node:node assets/js ./assets/js
COPY --chown=node:node assets/img ./assets/img
COPY --from=build --chown=node:node /src/assets/dist ./assets/dist
RUN mkdir -p /var/lib/bawsala && chown -R node:node /var/lib/bawsala /app
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health/live',{headers:{Host:'127.0.0.1'}}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
