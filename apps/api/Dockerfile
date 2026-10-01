# ============================================================
# TaskFlow API — multi-stage build (contexto: raíz del repo)
#   docker build -f apps/api/Dockerfile .
# ============================================================
FROM node:20-alpine AS build
WORKDIR /app

# Manifestos del monorepo (el package-lock.json de la raíz incluye los dos workspaces)
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install --workspace apps/api --include-workspace-root=false

COPY tsconfig.base.json ./
COPY apps/api/ apps/api/
RUN npx prisma generate --schema apps/api/prisma/schema.prisma \
 && npm run build --workspace apps/api

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install --omit=dev --workspace apps/api --include-workspace-root=false

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S taskflow && adduser -S taskflow -G taskflow

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/package.json apps/api/package.json
COPY apps/api/prisma apps/api/prisma

WORKDIR /app/apps/api
USER taskflow
EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
