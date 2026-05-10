## Spectremon v3.0.1

Patch release focused on installer reliability, safer re-runs, and smoother upgrades.

### Fixes

#### Installer reliability
- Added comprehensive error handling around directory creation, file reads, file writes, and file appends
- Improved failure messages with actionable guidance for permission and disk-space issues
- Installer now exits cleanly with a clear error message instead of failing silently

#### Idempotent installation
- Re-running `npx spectremon` no longer overwrites unchanged installed files
- Locally modified agent files in `.claude/agents/` are now preserved instead of being silently clobbered
- Existing up-to-date installs are detected and skipped cleanly

#### `CLAUDE.md` upgrades and migration
- Restored the full Spectremon trigger block in generated `CLAUDE.md`
- Added version-aware Spectremon section updates using `SPECTREMON_VERSION` markers
- Fixed duplicate Spectremon sections when upgrading from legacy, non-versioned `CLAUDE.md` installs
- Legacy Spectremon sections are now migrated in place instead of duplicated
- Local modifications inside the current Spectremon section are preserved

#### Archive naming guidance
- Embedded updated Discovery instructions in the installer so archive-name sanitization guidance actually ships to installed projects
- Documented path traversal protection for archive names in README and Discovery instructions

### No Breaking Changes

This is a patch release. Existing projects can upgrade by re-running:

```bash
npx spectremon
```

### Notes

You may still see a Node module-type warning when running the built installer directly with `node`. This does not affect install correctness and will be addressed separately.

---

**Full Changelog**: https://github.com/genehuh39/spectremon/compare/v3.0.0...v3.0.1
