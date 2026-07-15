ARG NODE_VERSION=24.14.0-slim
ARG VITE_API_URL

FROM node:${NODE_VERSION} AS dependencies

WORKDIR /app

COPY package.json package-lock.json .npmrc* ./

RUN --mount=type=cache,target=/root/.npm \
	npm ci --no-audit --no-fund

FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:1.29.4-alpine

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

ENV NGINX_ENVSUBST_TEMPLATE_DIR=/etc/nginx
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]