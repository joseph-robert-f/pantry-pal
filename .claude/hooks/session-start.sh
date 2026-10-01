#!/bin/bash
# SessionStart hook for Claude Code on the web: install npm dependencies so
# `npm run typecheck`, `npm test`, `npx vitest run`, and `npm run build` work
# as soon as the session starts. Runs only in remote (web) sessions.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# npm install (not npm ci) reuses node_modules from the cached container
# state, so later sessions start fast. Idempotent and non-interactive.
npm install --no-audit --no-fund --loglevel=error
