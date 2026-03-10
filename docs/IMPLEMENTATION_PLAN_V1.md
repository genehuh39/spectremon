# Implementation Plan: EARS Notation, Semantic File Names, and Archive Structure

## Overview
This plan implements improvements #2 (EARS Notation), #6 (Semantic File Names), and #9 (Archive Structure) to make Spectremon more like Kiro.

## Changes Summary

### 1. Discovery Agent Updates (`.claude/agents/discovery.md`)
**Major rewrite with:**
- EARS notation format instructions
- Dual-mode detection (bugfix vs feature)
- Feature name extraction for archive naming

**Mode Detection:**
- **Automatic**: Keywords like "bug", "fix", "issue", "error", "broken", "crash" trigger bugfix mode
- **Explicit**: User can prefix request with `/bugfix` or `/feature` to force mode

**File Outputs:**
- Feature mode: `requirements.md`, `design.md`, `tasks.md`
- Bugfix mode: `bugfix.md`, `design.md`, `tasks.md`

**EARS Notation Format:**
- **When** [trigger], the system shall [response]
- **While** [condition], the system shall [behavior]
- **If** [condition], then the system shall [action]
- **Where** [context], the system shall [behavior]

### 2. File Name Changes (All Agents)

| Agent | Current Reference | New Reference |
|-------|------------------|---------------|
| `spectremon.md` | `01-requirements.md` | `requirements.md` or `bugfix.md` |
| `spectremon.md` | `02-plan.md` | `design.md` |
| `spectremon.md` | `03-tasks.md` | `tasks.md` |
| `implementer.md` | `02-plan.md` | `design.md` |
| `architect.md` | `02-plan.md` | `design.md` |

### 3. Archive Structure Update (`.claude/spectremon.md`)

**Old Structure:**
```
.sdd/archive/YYYY-MM-DD/
```

**New Structure:**
```
.sdd/archive/YYYY-MM-DD-{feature-name}/
```

**Feature Name Extraction:**
1. Extract from first requirement/bug description
2. Confirm with user: "Archive as '2026-03-09-user-authentication'? (provide custom name or press enter)"
3. Fallback: `untitled-feature` if no name detected

### 4. EARS Notation Examples

**Feature Mode:**
```markdown
# Requirements: User Authentication System

## Functional Requirements

FR-1: When the user submits valid credentials, the system shall authenticate the user within 2 seconds.

FR-2: If authentication fails, the system shall display an error message without revealing which field was incorrect.

FR-3: While the user session is active, the system shall refresh the authentication token every 15 minutes.
```

**Bugfix Mode:**
```markdown
# Bugfix: Login Form Validation Crash

## Current Behavior
When the user clicks submit with empty required fields, the application crashes with:
```
TypeError: Cannot read property 'trim' of undefined
```

## Expected Behavior
When the user clicks submit with empty required fields, the system shall display inline validation errors for each empty field without crashing.

## Unchanged Behavior
- Valid form submissions shall continue to process normally
- Existing validation rules for email format shall remain
```

## Files to Modify

1. `.claude/agents/discovery.md` - Major rewrite with EARS + mode detection
2. `.claude/agents/implementer.md` - Update file reference from `02-plan.md` to `design.md`
3. `.claude/agents/architect.md` - Update file reference from `02-plan.md` to `design.md`
4. `.claude/spectremon.md` - Update state management and archive logic
5. `README.md` - Add EARS guide and update structure documentation

## Migration Strategy

**Clean Migration** - No backward compatibility:
- All new specs use semantic file names
- Old numbered files will be archived with descriptive names
- No support for legacy file naming

## Implementation Checklist

- [ ] Save this plan to `IMPLEMENTATION_PLAN.md`
- [ ] Create feature branch `feat/ears-semantic-files`
- [ ] Update `discovery.md` with EARS notation and mode detection
- [ ] Update `implementer.md` with new file references
- [ ] Update `architect.md` with new file references
- [ ] Update `spectremon.md` with new file names and archive logic
- [ ] Update `README.md` with documentation
- [ ] Create PR with detailed description

## Testing Considerations

After implementation:
1. Test feature mode detection and spec generation
2. Test bugfix mode detection and spec generation
3. Test explicit mode override (`/bugfix`, `/feature`)
4. Test archive naming with auto-extraction and user override
5. Verify all file references are updated correctly
