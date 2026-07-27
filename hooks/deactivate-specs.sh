#!/usr/bin/env bash
# SessionEnd hook: clears the Spectremon mode flag so a crashed or forgetful
# session can never leave specs/ permanently unprotected.
rm -f "${CLAUDE_PROJECT_DIR:-$PWD}/specs/.spectremon-active"
exit 0
