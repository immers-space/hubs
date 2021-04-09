#!/usr/bin/env bash
echo "Logging into to hub $hub as $email"
npm run login -- --host $hub --email $email
echo "Deploying Immers Space hubs client"
npm run deploy -- --skipCI
echo "Updating hubs config for immer $domain"
npm run immers-configure -- --immer $domain --wallet $monetizationPointer
echo "Done"
