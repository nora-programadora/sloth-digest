#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

# Load node if it was installed with nvm (harmless if not)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

mkdir -p logs
echo "--- $(date) ---" >> logs/digest.log
npm run digest -- inbox >> logs/digest.log 2>&1