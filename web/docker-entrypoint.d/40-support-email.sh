#!/bin/sh
f=/usr/share/nginx/html/config.js
v=$(printf '%s' "${SUPPORT_EMAIL:-}" | tr -cd 'A-Za-z0-9@._+-')
if [ -n "$v" ]; then
  sed -i '/SABEEL_SUPPORT_EMAIL/d' "$f"
  printf "window.SABEEL_SUPPORT_EMAIL = '%s';\n" "$v" >> "$f"
fi
