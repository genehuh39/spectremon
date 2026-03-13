# Migration Guide: v2.x to v3.0.0

## Overview

Spectremon v3.0.0 moves spec storage from `.sdd/` to `specs/` directory. This is a **breaking change** that requires manual migration if you have existing specs.

## What's Changed

| Aspect | v2.x | v3.0.0 |
|--------|------|---------|
| Spec directory | `.sdd/` | `specs/` |
| Archive location | `.sdd/archive/` | `specs/archive/` |
| Git ignore | `.sdd/` | `specs/` |

## Migration Steps

### Step 1: Move Existing Specs

If you have existing specs in `.sdd/`, move them to `specs/`:

```bash
# From your project root
mv .sdd specs
```

### Step 2: Update .gitignore

If you have a custom `.gitignore`, update it:

```diff
- .sdd/
+ specs/
```

### Step 3: Verify Migration

Check that your specs are now in the correct location:

```bash
ls -la specs/
# Should show: requirements.md, design.md, tasks.md, archive/
```

## No Spec File Changes Required

Good news! If you're already using v2.x with semantic file naming:
- `requirements.md` (or `bugfix.md`)
- `design.md`
- `tasks.md`

These file names remain unchanged. Only the directory changes from `.sdd/` to `specs/`.

## If You Have Active Specs

If you're in the middle of a Spectremon session:

1. Complete your current session or archive the spec
2. Run the migration command: `mv .sdd specs`
3. Start a new Spectremon session

## Troubleshooting

### Issue: "specs/ directory already exists"

**Solution:** 
```bash
# If you have specs in both locations, merge them:
cp -r .sdd/* specs/
rm -rf .sdd
```

### Issue: Git still tracking .sdd/

**Solution:**
```bash
git rm -r --cached .sdd
git add specs/
git commit -m "Migrate specs from .sdd/ to specs/"
```

### Issue: Claude Code can't find specs

**Solution:** Restart Claude Code after migration. The agent instructions reference `specs/` in v3.0.0.

## Need Help?

- Review the [README.md](README.md) for updated documentation
- Check [docs/RELEASE_NOTES_v3.0.0.md](docs/RELEASE_NOTES_v3.0.0.md) for full release details
- Open an issue on GitHub if you encounter problems

## Why This Change?

The `specs/` directory is more discoverable and follows common conventions:
- **Visible**: Not hidden (no leading dot)
- **Clear intent**: Immediately obvious what it contains
- **Standard**: Many tools and frameworks use `specs/` or `spec/` directories
- **Version control friendly**: Easier to reason about in .gitignore and CI/CD pipelines
