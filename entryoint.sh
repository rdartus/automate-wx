#!/bin/sh
set -eu

if [ "${PLAYWRIGHT_HEADFUL:-0}" = "1" ]; then
	exec xvfb-run -a node dist/main.js
fi

exec node dist/main.js