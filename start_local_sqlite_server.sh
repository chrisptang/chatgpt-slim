#!/bin/bash

export HOST_NAME=`ifconfig | grep 192. | awk '{print $2}' | head -n 1`
echo "HOST_NAME:$HOST_NAME"

export HTTP_PROXY="http://${HOST_NAME}:8001"

export OPENAI_API_KEY=sk-cJVtUTe8YbShGejGb2_THIS_IS_A_FAKED_API_KEY
export HTTP_PROXY=http://$HOST_NAME:8001
export GITHUB_CLIENT_ID=
export GITHUB_CLIENT_SECRET=
export GITHUB_LOGIN_CALLBACK_HOST=
export EXPOSE_POSTGRES=5432
export GA_TRACKING_ID=G-746MGDZH2M
export USE_SQLITE=true
export SQLITE_DIR=./sqlite
export SERVER_STATIC_PATH=`pwd`/dist
export PORT=4000
echo "SERVER_STATIC_PATH:${SERVER_STATIC_PATH}"

node server/openai-apis.js