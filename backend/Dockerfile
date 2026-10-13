FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY apps/crm-frontend/package.json ./apps/crm-frontend/package.json
# Install only the API workspace, excluding the website and CRM frontend.
RUN npm ci --workspace=@homo/backend --include-workspace-root=false --no-audit --no-fund
COPY backend ./backend
RUN npm run build --workspace=@homo/backend

# This stage depends on the completed build, so BuildKit cannot run a second
# dependency install alongside it. Reuse the installation and remove dev tools.
FROM build AS production-dependencies
RUN npm prune --omit=dev --workspace=@homo/backend --include-workspace-root=false --no-audit --no-fund \
    && mkdir -p backend/node_modules

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=production-dependencies /app/backend/package.json ./backend/package.json
COPY --from=production-dependencies /app/backend/node_modules ./backend/node_modules
COPY --from=production-dependencies /app/backend/dist ./backend/dist
EXPOSE 4000
CMD ["node", "backend/dist/main.js"]
