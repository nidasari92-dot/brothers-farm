FROM node:20-alpine

# Install dependencies needed for better-sqlite3 and sharp if used
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3232

CMD ["node", "server.js"]
