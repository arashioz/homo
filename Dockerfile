# syntax=docker/dockerfile:1

# The current website still has Node route handlers that invoke the catalog
# import scripts, so the runtime intentionally includes their Python tools.
FROM node:22-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Keep the OS packages cached if a Python download fails on a slow connection.
ARG PIP_DOWNLOAD_TIMEOUT=120
ARG PIP_DOWNLOAD_RETRIES=10
RUN python3 -m pip install --no-cache-dir --break-system-packages \
      --disable-pip-version-check \
      --timeout "${PIP_DOWNLOAD_TIMEOUT}" --retries "${PIP_DOWNLOAD_RETRIES}" \
      openpyxl pillow pypdf pymupdf

FROM base AS dependencies

# The root package lock must be regenerated whenever a workspace is added.
# Copy workspace manifests as well, so npm ci resolves the monorepo exactly.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY apps ./apps
RUN npm ci --include-workspace-root

FROM base AS build

ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CRM_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_CRM_URL=${NEXT_PUBLIC_CRM_URL}

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 homo \
    && useradd --system --uid 1001 --gid homo --create-home homo

# `standalone` deliberately omits public and static assets. It also cannot
# trace dynamic filesystem reads used by the current web-admin route handlers,
# so data and scripts are copied explicitly.
COPY --from=build --chown=homo:homo /app/.next/standalone ./
COPY --from=build --chown=homo:homo /app/.next/static ./.next/static
COPY --from=build --chown=homo:homo /app/public ./public
COPY --from=build --chown=homo:homo /app/data ./data
COPY --from=build --chown=homo:homo /app/scripts ./scripts

# Uploads are excluded from the build context and mounted at runtime.
RUN mkdir -p public/products public/projects uploads \
    && chown -R homo:homo /app

USER homo

EXPOSE 3000

CMD ["node", "server.js"]
