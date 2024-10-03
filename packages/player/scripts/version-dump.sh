#!/bin/bash

# Navigate to the directory containing the script
cd "$(dirname "$0")"

# Read the version from package.json using grep and sed
VERSION=$(grep '"version"' ../package.json | sed -E 's/.*"version": "([^"]+)".*/\1/')

# Write the version to .env.production
echo "VITE_PLAYER_VERSION=$VERSION" > ../.env.production

echo "VITE_PLAYER_VERSION=$VERSION has been written to .env.production"
