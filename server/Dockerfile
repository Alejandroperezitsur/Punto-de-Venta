FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY prisma/ ./prisma/
RUN npx prisma generate
COPY tsconfig.json ./
COPY *.ts *.js ./
COPY middleware/ ./middleware/
COPY routes/ ./routes/
COPY services/ ./services/
COPY validators/ ./validators/
RUN npx tsc || true

FROM node:18-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
COPY . .

RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health/live || exit 1

CMD ["npx", "ts-node", "index.ts"]
