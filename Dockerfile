FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV DATA_DIR=/app/data
RUN mkdir -p /app/data && chown -R node:node /app/data

EXPOSE 3000

USER node

CMD ["node", "server.js"]
