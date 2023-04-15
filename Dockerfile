FROM node:17-alpine3.12

ADD server/node_modules /app/server/node_modules
ADD server/package.json /app/server/package.json
ADD server/package-lock.json /app/server/package-lock.json
ADD server/database-models.js /app/server/database-models.js
ADD server/user-operations.js /app/server/user-operations.js
ADD server/openai-apis.js /app/server/server.js

WORKDIR /app/server
RUN npm install

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


EXPOSE ${PORT}

CMD [ "node","server.js"]