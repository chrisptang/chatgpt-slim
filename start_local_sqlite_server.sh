#!/bin/bash

export HOST_NAME=`ifconfig | grep 192. |grep -v 255. | awk '{print $2}'`
echo "HOST_NAME:$HOST_NAME"

export HTTP_PROXY="http://${HOST_NAME}:8001"

export OPENAI_API_KEY=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
export HTTP_PROXY=http://$HOST_NAME:8001
export GITHUB_CLIENT_ID=
export GITHUB_CLIENT_SECRET=
export GITHUB_LOGIN_CALLBACK_HOST=
export EXPOSE_POSTGRES=5432
export GA_TRACKING_ID=G-746MGDZH2M
export USE_SQLITE=true
export SQLITE_DIR=./sqlite
export SERVER_STATIC_PATH=`pwd`/dist
echo "SERVER_STATIC_PATH:${SERVER_STATIC_PATH}"

node server/openai-apis.js