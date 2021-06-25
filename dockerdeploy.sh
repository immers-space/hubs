#!/usr/bin/env bash
set -e
echo "Logging into to hub $hub as $email"
npm run login -- --host $hub --email $email
echo "Updating hubs config for immer $domain"
# this one reads from env because of issues with dollar sign in payment pointer
npm run immers-configure
echo "Deploying Immers Space hubs client"
npm run deploy -- --noBuild --replacePlaceholders

echo "Done"
