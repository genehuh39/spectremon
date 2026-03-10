## Summary

This PR implements three key improvements to make Spectremon more similar to Kiro's spec-driven development approach:

1. **EARS Notation** for structured requirements
2. **Semantic file names** replacing numbered files
3. **Descriptive archive structure** with auto-extracted names

## Changes

### EARS Notation Support
- All requirements now follow Easy Approach to Requirements Syntax
- Supports four patterns: When/While/If/Where
- Makes requirements clear, testable, and unambiguous
- Includes comprehensive examples in README

### Semantic File Naming
**Before:**
- `01-requirements.md` / `01-bugfix.md`
- `02-plan.md`
- `03-tasks.md`

**After:**
- `requirements.md` or `bugfix.md`
- `design.md`
- `tasks.md`

Clean migration with no backward compatibility (as requested).

### Archive Structure
**Before:** `.sdd/archive/2026-03-09/`

**After:** `.sdd/archive/2026-03-09-user-authentication/`

- Auto-extracts descriptive name from feature/bug description
- User can provide custom name during discovery
- Makes it easy to identify archived specs

### Feature vs Bugfix Modes
- **Automatic detection**: Keywords like "bug", "fix", "crash" trigger bugfix mode
- **Explicit override**: `/bugfix` or `/feature` prefixes force mode
- **Bugfix specs** include "Unchanged Behavior" section to prevent regressions

### Files Modified
- `.claude/agents/discovery.md` - Major rewrite with EARS + mode detection
- `.claude/agents/implementer.md` - Updated file references
- `.claude/agents/architect.md` - Updated file references
- `.claude/spectremon.md` - Updated state management and archive logic
- `README.md` - Comprehensive documentation with examples

### New File
- `IMPLEMENTATION_PLAN.md` - Detailed implementation plan for reference

## Testing

After merging, test the following:
1. Start Spectremon and verify mode detection works
2. Create a feature spec and verify EARS formatting
3. Create a bugfix spec and verify bugfix.md structure
4. Verify archive naming works correctly
5. Check all file references are updated

## Breaking Changes

⚠️ **This is a breaking change** - existing specs using numbered files will need to be migrated manually or archived before using the new version.

## Related Improvements

This addresses recommendations #2, #6, and #9 from the Kiro comparison analysis.