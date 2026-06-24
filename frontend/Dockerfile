
ARG NODE_VERSION=24.14.0-slim
ARG VITE_API_URL=http://localhost:3000

FROM node:${NODE_VERSION} AS dependencies

WORKDIR /app

COPY package.json package-lock.json .npmrc* ./

RUN --mount=type=cache,target=/root/.npm \
	npm ci --no-audit --no-fund

FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Bake the API URL into the bundle at build time. If unset, defaults
# to localhost:3000 (useful for `vite dev` without docker).
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:1.29.4-alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]