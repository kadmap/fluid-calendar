# Base stage for both development and production
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install netcat
RUN apk add --no-cache netcat-openbsd

# Development stage
FROM base AS development
WORKDIR /app
ENV NODE_ENV=development
COPY . .
COPY package*.json ./
RUN npm install --legacy-peer-deps --ignore-scripts
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npm", "run", "dev"]

# Production builder stage
FROM base AS builder
WORKDIR /app
ENV NODE_ENV=development

# Install build dependencies for bcrypt
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ENV NODE_ENV=production
RUN ls
RUN pwd
RUN npm run prisma:generate
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/bcrypt ./node_modules/bcrypt
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
