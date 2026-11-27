#!/usr/bin/env bash
# The app as it was before the audit that this skill came from (Mindstream at
# commit 7139291). Needs to run inside a clone of that repository.
set -eu
repo="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
mkdir -p app
git -C "$repo" archive 7139291 src package.json package-lock.json vite.config.js index.html public | tar -x -C app
