FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN chmod +x docker-entrypoint.sh

# Grabado en build time por el workflow de GitHub Actions (--build-arg) — .git
# no viaja en la imagen (ver .dockerignore), así que `git rev-parse` no
# funcionaría acá adentro; esto le da al server.js la misma info igual.
ARG GIT_COMMIT=
ENV GIT_COMMIT=$GIT_COMMIT
ENV DATA_DIR=/app/data

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
