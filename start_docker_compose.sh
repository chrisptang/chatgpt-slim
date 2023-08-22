#!/bin/bash

env=$(cat .env)
if [ ${#env} -gt 15 ]; then
    printf "existing env:\n"
    cat .env
    read -p "type enter to use exists config or 'new' to start new:" use_exists
    if [ ${#use_exists} -lt 1 ]; then
        docker-compose up -d
        exit 0
    fi
fi

export HOST_NAME=$(ifconfig | grep 192. | awk '{print $2}')
# export HOST_NAME=$(hostname)
echo "HOST_NAME:$HOST_NAME"

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

read -p "...specify github app client id to enable auth or enter to continue:" client_id
if [ ${#client_id} -gt 5 ]; then
    export GITHUB_CLIENT_ID="${client_id}"
    read -p "...specify github app client secret then:" client_secret
    export GITHUB_CLIENT_SECRET="${client_secret}"
    read -p "...specify github login callback host, default to be:localhost:9000, type enter to use default value callback host:" callback
    if [ ${#callback} -gt 5 ]; then
        export GITHUB_LOGIN_CALLBACK_HOST="${callback}"
    else
        export GITHUB_LOGIN_CALLBACK_HOST="localhost:9000"
    fi
    echo "GITHUB_LOGIN_CALLBACK_HOST:${GITHUB_LOGIN_CALLBACK_HOST}"
else
    echo "...you choose to use this tool in no-auth mode."
fi

cat /dev/null >.env
echo "OPENAI_API_KEY=$OPENAI_API_KEY" >.env
echo "HTTP_PROXY=$HTTP_PROXY" >>.env
echo "GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID" >>.env
echo "GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET" >>.env
echo "GITHUB_LOGIN_CALLBACK_HOST=$GITHUB_LOGIN_CALLBACK_HOST" >>.env

printf "\nreview config:\n"
cat .env
printf "\n\n"

read -p "...use sqlite?[y or N]:" use_sqlite

printf "...use_sqlite:${use_sqlite}"

compose_file="docker-compose.yml"

if [ "${use_sqlite}" = "y" ]; then
    cat .env > .env2
    compose_file="docker-compose-sqlite.yml"
fi

printf "\n\nstarting with:$compose_file"

docker-compose --env-file .env -f $compose_file up -d
