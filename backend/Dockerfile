FROM node:20-alpine

ENV NODE_ENV=production

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
