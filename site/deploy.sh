#!/usr/bin/env bash
#
# Manual publish, for when you want the site live right now without waiting
# for GitHub Actions. Rebuilds the notes from the book, then uploads.
#
#   ./site/deploy.sh
#
# The first run opens a browser so you can approve Cloudflare access.
set -euo pipefail
cd "$(dirname "$0")"

PROJECT="brotobro"

echo "→ Rebuilding notes from the book's markdown"
node build-notes.js

echo "→ Publishing to Cloudflare Pages project: $PROJECT"
npx --yes wrangler@latest pages deploy . \
  --project-name="$PROJECT" \
  --branch=main \
  --commit-dirty=true

echo "✓ Done. Custom domain updates within about a minute."
