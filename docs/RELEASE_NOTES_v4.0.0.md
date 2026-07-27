# Spectremon v4.0.0

## Highlights

Spectremon is now a native **Claude Code plugin**. The repository root is the plugin: it bundles the three subagents (`agents/`), a `/spectremon:start` skill (`skills/start/SKILL.md`), and plugin/marketplace manifests (`.claude-plugin/`).

## Changes

- **Plugin packaging**: install with `/plugin marketplace add genehuh39/spectremon` then `/plugin install spectremon@spectremon`. Nothing is written into your project.
- **Skill trigger**: the orchestrator is now a lazy-loaded skill invoked as `/spectremon:start`, replacing the always-loaded CLAUDE.md persona trigger for plugin users.
- **Single source of truth**: the npx installer now bundles the plugin's markdown files at build time instead of duplicating their content inline. Installer output is unchanged.
- **Legacy installer retained**: `npx spectremon` / `bunx spectremon` still works exactly as before for projects that prefer file-based installation. The CLAUDE.md section version was bumped to v4.0.0.
- `package.json` now declares `"type": "module"`, removing Node's module-detection warning when running the installer.

## Upgrade notes

- The repo previously tracked expanded local variants of `architect.md` and `implementer.md` under `.claude/agents/` that diverged from what the installer actually shipped. The plugin adopts the installer-shipped content as canonical; the expanded variants were dropped (recoverable from git history at `main:.claude/agents/`).

- Existing installer-based setups keep working; re-running the installer refreshes the CLAUDE.md section to v4.0.0 and leaves locally modified agent files intact, as before.
- Plugin and installer modes can coexist, but pick one per project to avoid registering duplicate subagents.
