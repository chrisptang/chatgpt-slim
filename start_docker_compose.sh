#!/bin/bash

export HOST_NAME=$(ifconfig | grep 192. | awk '{print $2}')
echo "HOST_NAME:$HOST_NAME"

export HTTP_PROXY="http://${HOST_NAME}:8001"

if [ ${#OPENAI_API_KEY} -lt 5 ]; then
    read -p "specify your openai api key starts with sk-:" api_key
    export OPENAI_API_KEY="${api_key}"
fi

echo "about to use api_key:${OPENAI_API_KEY:0:12}"

read -p "specify github app client id to enable auth:" client_id
if [ ${#client_id} -gt 5 ]; then
    export GITHUB_CLIENT_ID="${client_id}"
    read -p "specify github app client secret then:" client_secret
    export GITHUB_CLIENT_SECRET="${client_secret}"
    read -p "specify github login callback host, e.g:   localhost:9000" callback
    export GITHUB_LOGIN_CALLBACK_HOST="${callback}"
else
    echo "you choose to use this tool in no-auth mode."
fi

docker-compose up -d
