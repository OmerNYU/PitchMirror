FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including dev) for build
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["npm", "start"]
