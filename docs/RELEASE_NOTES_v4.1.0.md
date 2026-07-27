# Spectremon v4.1.0

## Highlights

The framework's rules are now enforced mechanically instead of by prose instruction alone.

## Changes

- **`specs/` write protection hook**: the plugin ships a `PreToolUse` hook (`hooks/protect-specs.sh`) that blocks Write/Edit calls into `specs/` unless the mode flag `specs/.spectremon-active` exists. The orchestrator skill creates the flag on activation and removes it on exit. The hook guards against accidental edits by Claude; it is not a security boundary (shell commands bypass it).
- **Review-only Architect**: the architect subagent no longer has Write/Edit tools. It approves or rejects with feedback; all fixes route back through the Implementer. Temporary verification scripts are created and cleaned up via Bash. The architect also requests `effort: high` for deeper review reasoning.
- **Tests**: new tests validate the hook wiring, script executability, and live block/allow behavior against the mode flag, plus the architect's restricted toolset.

## Deferred

- `isolation: worktree` on the Implementer was considered and deferred: with the current prose-driven loop, a worktree would strand approved changes outside the main tree (no scripted merge step). It lands with the v4.2 workflow orchestrator, which can manage worktree merges deterministically.

## Upgrade notes

- The hook ships with the plugin only. Legacy `npx spectremon` installs get the updated agent/orchestrator content but no hook — hook installation would require editing your project's `settings.json`, which the installer deliberately does not do.
- Existing installer-based projects with locally modified agent files keep their local versions, as always.
