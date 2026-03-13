## Spectremon v3.0.0

Major release changing spec storage directory from `.sdd/` to `specs/`.

### ⚠️ Breaking Changes

**Spec directory has changed.** Existing `.sdd/` directories need migration:

```bash
# From your project root
mv .sdd specs
```

See [MIGRATION_v3.md](MIGRATION_v3.md) for detailed migration instructions.

### Changes

#### Directory Structure
- **Old**: `.sdd/` (hidden directory)
- **New**: `specs/` (visible directory)

#### Updated References
All agent instructions and documentation now reference `specs/`:
- `.claude/spectremon.md` - Updated state management references
- `.claude/agents/architect.md` - Updated design.md path
- `.claude/agents/implementer.md` - Updated design.md path
- `.gitignore` - Changed from `.sdd/` to `specs/`
- `index.ts` - Updated installer to reference `specs/`
- `index.js` - Rebuilt with updated references
- `README.md` - Updated all documentation

#### New Files
- `MIGRATION_v3.md` - Comprehensive migration guide

### Why This Change?

The `specs/` directory is more discoverable and follows common conventions:
- **Visible**: Not hidden (no leading dot)
- **Clear intent**: Immediately obvious what it contains
- **Standard**: Many tools and frameworks use `specs/` or `spec/` directories
- **Version control friendly**: Easier to reason about in .gitignore and CI/CD pipelines

### No Spec File Changes

The spec files themselves remain unchanged:
- `requirements.md` or `bugfix.md`
- `design.md`
- `tasks.md`

Only the containing directory changes.

### Migration

**Quick Migration:**
```bash
mv .sdd specs
```

**Detailed Migration:**
See [MIGRATION_v3.md](MIGRATION_v3.md) for step-by-step instructions and troubleshooting.

---

**Full Changelog**: https://github.com/genehuh39/spectremon/compare/v2.0.1...v3.0.0
