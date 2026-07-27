FROM node:20-alpine AS builder

# Install build dependencies for better-sqlite3 native compilation
RUN apk add --no-creation --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Production Image
FROM node:20-alpine AS runner

RUN apk add --no-cache sqlite

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create data volume directory for SQLite persistent database
RUN mkdir -p /app/data

ENV DATABASE_PATH=/app/data/curator.db
VOLUME [ "/app/data" ]

CMD ["npm", "start"]
