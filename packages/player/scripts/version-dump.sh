#!/bin/bash
cd "$(dirname "$0")"

VERSION=$(grep '"version"' ../package.json | sed -E 's/.*"version": "([^"]+)".*/\1/')

echo "# Automatically generated from package.json" > ../.env.production
echo "VITE_PLAYER_VERSION=$VERSION" >> ../.env.production

echo "VITE_PLAYER_VERSION=$VERSION has been written to .env.production"
