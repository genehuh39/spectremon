# Spectremon v4.1.0

## Highlights

The framework's rules are now enforced mechanically instead of by prose instruction alone.

## Changes

- **`specs/` write protection hooks**: file-editing tools are blocked from touching `specs/` outside Spectremon mode, and a `SessionEnd` hook clears the mode flag so a crashed session can't leave the directory unprotected. See the README's *State Management* section for the full contract.
- **Review-only Architect**: the architect subagent no longer has Write/Edit tools. It approves or rejects with feedback; all fixes route back through the Implementer. Temporary verification scripts are created and cleaned up via Bash. The architect also requests `effort: high` for deeper review reasoning.
- **Tests**: new tests validate the hook wiring, script executability, and live block/allow behavior against the mode flag, plus the architect's restricted toolset.

## Deferred

- `isolation: worktree` on the Implementer was considered and deferred: with the current prose-driven loop, a worktree would strand approved changes outside the main tree (no scripted merge step). It lands with the v4.2 workflow orchestrator, which can manage worktree merges deterministically.

## Upgrade notes

- The hook ships with the plugin only. Legacy `npx spectremon` installs get the updated agent/orchestrator content but no hook — hook installation would require editing your project's `settings.json`, which the installer deliberately does not do.
- Existing installer-based projects with locally modified agent files keep their local versions, as always.
