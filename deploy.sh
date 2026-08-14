#!/usr/bin/env bash
#
# deploy.sh — deploys pre-alpha/shoot-prep.html to Netlify as "darmiyan-shoot"
# Requires: netlify CLI already installed + logged in (netlify login)
#
# Usage: bash deploy.sh
#
set -e

SITE_NAME="darmiyan-shoot"
DIST_DIR="dist"

echo "Deploying ${SITE_NAME} ..."

# Netlify wants a publish directory with an index.html in it.
# pre-alpha/shoot-prep.html becomes dist/index.html
mkdir -p "${DIST_DIR}"
cp pre-alpha/shoot-prep.html "${DIST_DIR}/index.html"

# First-time deploy: creates the site if it doesn't exist yet.
# Subsequent runs just redeploy to the same site.
netlify deploy \
  --dir="${DIST_DIR}" \
  --site="${SITE_NAME}" \
  --prod \
  --create-site="${SITE_NAME}"

echo "Done. Live at: https://${SITE_NAME}.netlify.app"

