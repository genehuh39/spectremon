#!/usr/bin/env bash
# PreToolUse hook: blocks Write/Edit to the specs/ directory unless Spectremon
# mode is active (signalled by the specs/.spectremon-active flag the
# orchestrator creates on start and removes on exit).

input=$(cat)

file_path=$(printf '%s' "$input" | python3 -c '
import json, sys
try:
    print(json.load(sys.stdin).get("tool_input", {}).get("file_path", ""))
except Exception:
    pass
' 2>/dev/null)

[ -z "$file_path" ] && exit 0

project_dir="${CLAUDE_PROJECT_DIR:-$PWD}"

case "$file_path" in
  "$project_dir"/specs/* | specs/* | ./specs/*) ;;
  *) exit 0 ;;
esac

[ -e "$project_dir/specs/.spectremon-active" ] && exit 0

echo "Blocked: specs/ is read-only outside Spectremon mode. Run /spectremon:start so the orchestrator activates the mode flag (specs/.spectremon-active) before editing spec files." >&2
exit 2
