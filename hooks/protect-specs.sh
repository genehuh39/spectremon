#!/usr/bin/env bash
# PreToolUse hook: blocks file-editing tools from touching specs/ unless
# Spectremon mode is active — signalled by specs/.spectremon-active, which the
# orchestrator creates on start and removes on exit (and the SessionEnd hook
# clears as a backstop).

project_dir="${CLAUDE_PROJECT_DIR:-$PWD}"

# Mode active → everything allowed; cheapest check first.
[ -e "$project_dir/specs/.spectremon-active" ] && exit 0

input=$(cat)

# Cheap pre-filter: skip the interpreter spawn when nothing mentions specs.
case "$input" in
  *specs*) ;;
  *) exit 0 ;;
esac

decision=$(printf '%s' "$input" | python3 -c '
import json, os, sys

try:
    tool_input = json.load(sys.stdin).get("tool_input", {})
    path = tool_input.get("file_path") or tool_input.get("notebook_path") or ""
except Exception:
    print("unparseable")
    raise SystemExit

if not path:
    print("allow")
    raise SystemExit

project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
specs = os.path.realpath(os.path.join(project_dir, "specs"))
target = os.path.realpath(os.path.join(project_dir, path))
if sys.platform == "darwin":  # APFS is case-insensitive by default
    specs, target = specs.lower(), target.lower()
print("block" if target == specs or target.startswith(specs + os.sep) else "allow")
' 2>/dev/null)

[ "$decision" = "allow" ] && exit 0

if [ "$decision" = "block" ]; then
  echo "Blocked: specs/ is read-only outside Spectremon mode. Run /spectremon:start so the orchestrator activates the mode flag (specs/.spectremon-active) before editing spec files." >&2
else
  echo "Blocked: the Spectremon specs-protection hook could not parse the tool input (is python3 installed?). Failing closed because the input mentions specs." >&2
fi
exit 2
