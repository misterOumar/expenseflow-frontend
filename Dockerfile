# syntax=docker/dockerfile:1

# --- Build : compilation Angular en mode production ---
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npx ng build

# --- Exécution : nginx sert l'application et relaie l'API ---
FROM nginx:1.29-alpine

# Le modèle est complété par envsubst au démarrage (variables d'environnement définies uniquement).
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

ENV API_UPSTREAM=http://app:8080

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
