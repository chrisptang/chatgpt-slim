#!/bin/bash

export HOST_NAME=`hostname | awk '{print $1}'`
echo "HOST_NAME:$HOST_NAME"

export HTTP_PROXY="http://${HOST_NAME}:8001"
export PG_HOST="${HOST_NAME}"

read -p "Please type your openai api key starts with sk-:" api_key

echo "about to use api_key:${api_key:0:12}"

export OPENAI_API_KEY="${api_key}"

node openai-apis.js