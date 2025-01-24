FROM node:20.16-alpine AS base

FROM base AS deps
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm ci --ignore-scripts

FROM base AS builder
WORKDIR /app
COPY --chown=node:node package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .
RUN npm run build
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM base AS runner
USER node
COPY --chown=node:node package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./app
EXPOSE 3000
CMD [ "node", "app/src/main.js" ]
