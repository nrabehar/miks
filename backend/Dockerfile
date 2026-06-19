ARG NODE_VERSION=24.14.0-slim

FROM node:${NODE_VERSION} AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run db:generate

RUN npm run build

FROM node:${NODE_VERSION} AS prod-dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY --chown=node:node --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

FROM node:${NODE_VERSION} AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=prod-dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=prod-dependencies /app/package.json ./package.json

USER node

EXPOSE 3000

CMD ["node", "dist/main.js" ]