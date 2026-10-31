# ---------- dependencies ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- quality gate: lint, types, tests ----------
FROM deps AS test
COPY . .
ENV CI=1
CMD ["sh", "-c", "npm run lint && npm run typecheck && npm test -- --ci"]

# ---------- static web build ----------
FROM deps AS build
COPY . .
# The browser talks to the API through nginx on the same origin (no CORS needed).
ARG EXPO_PUBLIC_API_BASE_URL=/api
ENV EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL CI=1
RUN npx expo export --platform web --output-dir dist

# ---------- serve ----------
FROM nginx:1.27-alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
