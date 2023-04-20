FROM node:17-alpine3.12 as builder

ADD server/package.json /app/server/package.json
WORKDIR /app/server
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm install --loglevel verbose

FROM node:17-alpine3.12

WORKDIR /app/server
COPY --from=builder /app/server/node_modules ./node_modules

ADD server/database-models.js /app/server/database-models.js
ADD server/user-operations.js /app/server/user-operations.js
ADD server/openai-apis.js /app/server/server.js
COPY --from=builder /app/server/package.json .

ADD dist /app/frontend/

ENV PORT "5000"
ENV SERVER_STATIC_PATH "/app/frontend"
ENV NODE_ENV "production"
ENV PG_HOST "db-postgres"
ENV PG_USER "postgres"
ENV PG_PASSWORD "postgres-local"
ENV OPENAI_API_KEY "please_set_OPENAI_API_KEY_env"
ENV GITHUB_CLIENT_ID ""
ENV GITHUB_CLIENT_SECRET "secret-of-the-clientId"
ENV GITHUB_LOGIN_CALLBACK_HOST ""
ENV USE_SQLITE "false"


EXPOSE ${PORT}

CMD [ "node","server.js"]