#!/bin/bash

export HOST_NAME=`ifconfig | grep 192. | awk '{print $2}'`
echo "HOST_NAME:$HOST_NAME"

export HTTP_PROXY="http://${HOST_NAME}:8001"
export PG_HOST="${HOST_NAME}"

export $(cat ../.env | xargs)

if [ -z "$OPENAI_API_KEY" ]
then
    read -p "specify your openai api key starts with sk-:" api_key
    export OPENAI_API_KEY="${api_key}"
fi

echo "about to use api_key:${OPENAI_API_KEY:0:12}"

export SERVER_STATIC_PATH=`pwd`
export SERVER_STATIC_PATH="${SERVER_STATIC_PATH/server/dist}"
echo "SERVER_STATIC_PATH:${SERVER_STATIC_PATH}"

export GITHUB_LOGIN_CALLBACK_HOST=localhost:8081

node openai-apis.js