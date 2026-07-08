#!/bin/sh
set -eu

if [ "${PLAYWRIGHT_HEADFUL:-0}" = "1" ]; then
	DISPLAY_NUMBER="${DISPLAY:-:99}"

	# Start a virtual X server explicitly to avoid xvfb-run startup hangs.
	Xvfb "$DISPLAY_NUMBER" -screen 0 1280x1024x24 -nolisten tcp &
	XVFB_PID=$!

	cleanup() {
		kill "$XVFB_PID" >/dev/null 2>&1 || true
	}

	trap cleanup EXIT INT TERM

	export DISPLAY="$DISPLAY_NUMBER"
	node dist/main.js
	exit $?
fi

exec node dist/main.js