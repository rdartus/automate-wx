#!/bin/sh
set -eu

if [ "${PLAYWRIGHT_HEADFUL:-0}" = "1" ]; then
	if [ -n "${DISPLAY:-}" ]; then
		DISPLAY_NUMBER="$DISPLAY"
	else
		DISPLAY_INDEX=99
		while [ -e "/tmp/.X${DISPLAY_INDEX}-lock" ] || [ -e "/tmp/.X11-unix/X${DISPLAY_INDEX}" ]; do
			DISPLAY_INDEX=$((DISPLAY_INDEX + 1))
		done
		DISPLAY_NUMBER=":${DISPLAY_INDEX}"
	fi

	# Start a virtual X server and wait until the display socket is ready.
	Xvfb "$DISPLAY_NUMBER" -screen 0 1280x1024x24 -nolisten tcp &
	XVFB_PID=$!

	cleanup() {
		kill "$XVFB_PID" >/dev/null 2>&1 || true
	}

	trap cleanup EXIT INT TERM

	DISPLAY_INDEX="${DISPLAY_NUMBER#:}"
	READY=0
	TRY=0
	while [ "$TRY" -lt 50 ]; do
		if ! kill -0 "$XVFB_PID" >/dev/null 2>&1; then
			echo "[entrypoint] Xvfb exited before becoming ready on ${DISPLAY_NUMBER}" >&2
			exit 1
		fi

		if [ -e "/tmp/.X11-unix/X${DISPLAY_INDEX}" ]; then
			READY=1
			break
		fi

		TRY=$((TRY + 1))
		sleep 0.1
	done

	if [ "$READY" -ne 1 ]; then
		echo "[entrypoint] Timed out waiting for Xvfb display ${DISPLAY_NUMBER}" >&2
		exit 1
	fi

	export DISPLAY="$DISPLAY_NUMBER"
	node dist/main.js
	exit $?
fi

exec node dist/main.js