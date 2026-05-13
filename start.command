#!/bin/bash
# Double-click this file in Finder to install deps (first time) and start the API server.
# Then open: http://localhost:3000/clients.html

cd "$(dirname "$0")" || exit 1

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js from https://nodejs.org (LTS), then run this again."
  read -r _
  exit 1
fi

npm install
npm start
