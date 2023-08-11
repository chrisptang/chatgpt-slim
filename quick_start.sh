#!/bin/bash

env=$(cat .env2)
if [ ${#env} -gt 15 ]; then
    printf "existing env:\n"
    cat .env2
    read -p "type enter to use exists config or 'new' to start new:" use_exists
    if [ ${#use_exists} -lt 1 ]; then
        docker-compose up -d
        exit 0
    fi
fi

export HOST_NAME=$(ifconfig | grep 192. |grep -v 255.| awk '{print $2}')
# export HOST_NAME=$(hostname)
printf "HOST_NAME:${HOST_NAME}\n\n"

read -p "...specify your proxy port, default to be 8001:" proxy_port
if [ ${#proxy_port} -gt 3 ]; then
    export HTTP_PROXY="http://${HOST_NAME}:${proxy_port}"
else
    export HTTP_PROXY="http://${HOST_NAME}:8001"
fi

export HTTP_PROXY="http://${HOST_NAME}:8001"

if [ ${#OPENAI_API_KEY} -lt 5 ]; then
    read -p "...specify your openai api key starts with sk-:" api_key
    export OPENAI_API_KEY="${api_key}"
fi

printf "\n===\ngreat, about to use api_key:${OPENAI_API_KEY:0:12}\n===\n"

cat /dev/null >.env2
echo "OPENAI_API_KEY=$OPENAI_API_KEY" >.env2
echo "HTTP_PROXY=$HTTP_PROXY" >>.env2
echo "GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID" >>.env2
echo "GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET" >>.env2
echo "GITHUB_LOGIN_CALLBACK_HOST=$GITHUB_LOGIN_CALLBACK_HOST" >>.env2

printf "\nreview config:\n"
cat .env2
printf "\n\n"

docker-compose --env-file .env2 -f docker-compose-sqlite.yml up -d

printf "started, visit: http://localhost:9001"
