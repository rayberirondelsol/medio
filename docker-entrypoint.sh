#!/bin/sh
set -euo pipefail

ENV_CONFIG="/usr/share/nginx/html/env-config.js"

if [ -f "$ENV_CONFIG" ]; then
  tmp_file="$(mktemp)"

  # Use envsubst to replace placeholders with actual environment values.
  envsubst '${REACT_APP_API_URL}' < "$ENV_CONFIG" > "$tmp_file"
  cat "$tmp_file" > "$ENV_CONFIG"
  rm -f "$tmp_file"

  if [ -z "${REACT_APP_API_URL:-}" ]; then
    echo "[startup warning] REACT_APP_API_URL is not set. Authentication and API calls will fail." >&2
  fi
fi

exec "$@"
