#!/usr/bin/env bash
#
# deploy_curl.sh — deploys pre-alpha/shoot-prep.html to Netlify via raw API calls.
# No Netlify CLI needed — works on Termux with just curl + zip.
#
# Setup (one time, in Termux):
#   pkg install curl zip jq
#   export NETLIFY_TOKEN="your_token_here"   # put this in ~/.bashrc, not in this script
#
# Usage: bash deploy_curl.sh
#
set -e

if [ -z "$NETLIFY_TOKEN" ]; then
  echo "NETLIFY_TOKEN not set. Run: export NETLIFY_TOKEN=\"your_token\""
  exit 1
fi

SITE_NAME="darmiyan-shoot"
DIST_DIR="dist"

mkdir -p "${DIST_DIR}"
cp pre-alpha/shoot-prep.html "${DIST_DIR}/index.html"

# --- Step 1: find or create the site ---
echo "Checking if site '${SITE_NAME}' exists..."
SITE_ID=$(curl -s -H "Authorization: Bearer ${NETLIFY_TOKEN}" \
  "https://api.netlify.com/api/v1/sites" | jq -r ".[] | select(.name==\"${SITE_NAME}\") | .id")

if [ -z "$SITE_ID" ]; then
  echo "Site doesn't exist yet, creating..."
  SITE_ID=$(curl -s -X POST \
    -H "Authorization: Bearer ${NETLIFY_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${SITE_NAME}\"}" \
    "https://api.netlify.com/api/v1/sites" | jq -r ".id")
  echo "Created site: ${SITE_ID}"
else
  echo "Found existing site: ${SITE_ID}"
fi

# --- Step 2: compute file hash, ask Netlify what it needs ---
FILE_HASH=$(sha1sum "${DIST_DIR}/index.html" | awk '{print $1}')

DEPLOY_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${NETLIFY_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"files\":{\"/index.html\":\"${FILE_HASH}\"}}" \
  "https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys")

DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | jq -r ".id")
REQUIRED=$(echo "$DEPLOY_RESPONSE" | jq -r ".required[]?")

echo "Deploy created: ${DEPLOY_ID}"

# --- Step 3: upload the actual file content if Netlify asked for it ---
if [ -n "$REQUIRED" ]; then
  echo "Uploading index.html..."
  curl -s -X PUT \
    -H "Authorization: Bearer ${NETLIFY_TOKEN}" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@${DIST_DIR}/index.html" \
    "https://api.netlify.com/api/v1/deploys/${DEPLOY_ID}/files/index.html" > /dev/null
  echo "Upload complete."
else
  echo "File already up to date on Netlify, nothing to upload."
fi

echo ""
echo "Done. Live at: https://${SITE_NAME}.netlify.app"

