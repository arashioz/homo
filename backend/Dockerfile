FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY apps/crm-frontend/package.json ./apps/crm-frontend/package.json
RUN npm ci
COPY backend ./backend
RUN npm run build --workspace=@homo/backend

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY apps/crm-frontend/package.json ./apps/crm-frontend/package.json
RUN npm ci --omit=dev
COPY --from=build /app/backend/dist ./backend/dist
EXPOSE 4000
CMD ["node", "backend/dist/main.js"]
