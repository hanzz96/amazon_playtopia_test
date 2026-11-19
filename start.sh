#!/bin/sh
# Starts the Retail Wallet CLI. State lives only in memory, so every run starts empty.
# Plain POSIX sh (no bashisms), so it also works where bash is not installed, e.g. Alpine.
set -eu

cd "$(dirname "$0")"

# Install dependencies (there are none today, but keep the step so the script stays valid
# if some are added). npm output goes to stderr so stdout contains only CLI output.
npm install --no-audit --no-fund --no-package-lock --silent >&2

# No build step: the app is plain JavaScript (ESM).
exec node src/index.js
