# ============================================================
# TaskFlow Web — multi-stage build (contexto: raíz del repo)
#   docker build -f apps/web/Dockerfile . --build-arg VITE_API_URL=/api
# ============================================================
FROM node:20-alpine AS build
WORKDIR /app

# /api → Nginx hace de proxy hacia el contenedor de la API
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

# Manifestos del monorepo: npm ci usa el package-lock.json de la raíz
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --no-audit --no-fund

COPY apps/web/ apps/web/
RUN npm run build --workspace apps/web

# ------------------------------------------------------------
# Etapa 2 — servir estáticos con nginx
# ------------------------------------------------------------
FROM nginx:alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
