# Production image: one Node process serves the built Angular app, the API, /uploads and /api-docs
# from the same origin. Node 26 is the current LTS; its npm 11 matches the lockfiles.
ARG NODE_IMAGE=node:26-alpine

FROM ${NODE_IMAGE} AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
COPY frontend/scripts ./scripts
RUN npm ci --no-progress
COPY frontend ./
RUN npm run build_production -- --no-progress

FROM ${NODE_IMAGE} AS backend-deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-progress

FROM ${NODE_IMAGE}
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=backend-deps /app/node_modules ./node_modules
COPY backend ./
COPY --from=frontend /frontend/dist/pressing-room/browser ./public
# db/ and covers are written at runtime
RUN chown -R node:node db uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1
# Without demo mode the seed creates the data files and the Admin; with DEMO_MODE=true index.js
# resets everything itself before listening. exec leaves node as the only process
CMD ["sh", "-c", "[ \"$DEMO_MODE\" = true ] || node scripts/seed.js && exec node index.js"]
