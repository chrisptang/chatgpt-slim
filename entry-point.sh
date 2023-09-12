#!/bin/bash

sed -i "s/GA_TRACKING_ID/$GA_TRACKING_ID/g" /app/frontend/index.html

cd /app/server
node server.js