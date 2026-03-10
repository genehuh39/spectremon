## Spectremon v2.0.0

A major release implementing Kiro-inspired improvements for spec-driven development.

### ⚠️ Breaking Changes

**File naming convention has changed.** Existing `.sdd/` directories using numbered files will need migration:
- `01-requirements.md` → `requirements.md` (or `bugfix.md` for bugfixes)
- `02-plan.md` → `design.md`
- `03-tasks.md` → `tasks.md`

### ✨ New Features

#### EARS Notation Support
All requirements now use Easy Approach to Requirements Syntax for clarity and testability:
- **When** [trigger], the system shall [response]
- **While** [condition], the system shall [behavior]
- **If** [condition], then the system shall [action]
- **Where** [context], the system shall [behavior]

#### Feature vs Bugfix Modes
Spectremon now supports two distinct spec types:

**Feature Mode** (default):
- Creates `requirements.md` with EARS-formatted functional requirements
- Best for building new capabilities

**Bugfix Mode**:
- Creates `bugfix.md` with Current/Expected/Unchanged behavior analysis
- Prevents regressions through explicit "Unchanged Behavior" documentation
- Triggered automatically by keywords (bug, fix, crash, error, etc.) or explicitly with `/bugfix`

#### Descriptive Archive Structure
Archives now include descriptive names:
- **Before**: `.sdd/archive/2026-03-09/`
- **After**: `.sdd/archive/2026-03-09-user-authentication/`

Names are auto-extracted from your feature/bug description with optional user override.

### 📁 Files Changed

- `.claude/agents/discovery.md` - Major rewrite with EARS + mode detection
- `.claude/agents/implementer.md` - Updated file references
- `.claude/agents/architect.md` - Updated file references
- `.claude/spectremon.md` - Updated state management and archive logic
- `README.md` - Comprehensive documentation with examples

### 🚀 Getting Started

```bash
# Install or update
npx spectremon

# Trigger in Claude Code
"Start Spectremon"
```

### 📝 Usage Examples

**Feature Mode:**
```
/feature Create a user authentication system with JWT tokens
```

**Bugfix Mode (auto-detected):**
```
Fix the login crash when users submit empty forms
```

**Bugfix Mode (explicit):**
```
/bugfix The payment webhook times out after 30 seconds
```

### 📖 Documentation

See the updated [README.md](https://github.com/genehuh39/spectremon/blob/main/README.md) for:
- EARS notation guide with examples
- Feature vs Bugfix mode details
- Best practices for preventing regressions
- Complete file structure reference

---

**Full Changelog**: https://github.com/genehuh39/spectremon/compare/v1.0.0...v2.0.0