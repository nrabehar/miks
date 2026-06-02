FROM node:24.12.0-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci
COPY . .

# RUN npx prisma generate

FROM development AS builder

ENV NODE_ENV=production

RUN npm run build

FROM base AS runner

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/package-lock.json ./

RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start:prod"]