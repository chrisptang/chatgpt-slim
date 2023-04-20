FROM node:17-alpine3.12

# ADD server/node_modules /app/server/node_modules
ADD server/package.json /app/server/package.json
ADD server/database-models.js /app/server/database-models.js
ADD server/user-operations.js /app/server/user-operations.js
ADD server/openai-apis.js /app/server/server.js

WORKDIR /app/server

# use tsinghua as mirror site.
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk add --no-cache make gcc g++ python3 && \
    npm config set registry https://registry.npmmirror.com/ && \
    npm install --save-exact --production sharp && \
    apk del make gcc g++ python3 && \
    npm install

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