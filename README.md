# Spectremon: Spec-Driven Development Framework

Spectremon is an on-demand, multi-agent orchestration framework for Claude Code. It enforces a rigorous Spec-Driven Development (SDD) lifecycle by coordinating an Orchestrator with three specialized subagents: Discovery, Implementer, and Architect.

## Installation

Run the installer from your project root. No global install required.

**With npm:**
```bash
npx spectremon
```

**With Bun:**
```bash
bunx spectremon
```

Or run directly from GitHub without installing:

```bash
# npm
npx github:genehuh39/spectremon

# Bun
bunx github:genehuh39/spectremon
```

The installer writes the following into your project:

```text
/your-project-root
  ├── CLAUDE.md                  # Appended with the Spectremon trigger
  └── .claude/
       ├── spectremon.md         # Orchestrator instructions
       └── agents/
            ├── discovery.md     # Phase 1 & 2: Requirements & Architecture
            ├── implementer.md   # Phase 3: Coding
            └── architect.md     # Phase 4: Review & Verification
```

## Usage

Once installed, trigger the framework inside Claude Code by saying:

> "Start Spectremon" or "Boot up the Orchestrator"

Claude will adopt the Orchestrator persona and begin the SDD workflow.

## How It Works

Spectremon enforces a four-phase development loop.

### Phase 1 & 2 — Discovery

The **Discovery** subagent translates your request into three spec files stored in `.sdd/`:

| File | Contents |
|---|---|
| `01-requirements.md` | Scope, constraints, and clarified requirements |
| `02-plan.md` | Technical architecture and design decisions |
| `03-tasks.md` | Atomic implementation checklist (`- [ ]`) |

The Orchestrator does not proceed until you explicitly approve the generated spec.

### Phase 3 — Implementation

The **Implementer** subagent executes one task at a time from `03-tasks.md`. It is strictly scoped to the files required for that task and aligns all code against `02-plan.md`.

### Phase 4 — Verification

The **Architect** subagent reviews every change before it is marked complete. It checks:

- Architectural conformance against `02-plan.md`
- Security vulnerabilities (injection, unvalidated inputs, improper state)
- Functional correctness via automated tests or REPL execution

For React/UI tasks, it renders components headlessly and asserts the output. A task is only marked `[x]` after the Architect replies **"REVIEW PASSED"**.

### Correction Loop

If the Implementer fails the Architect's review **3 times** on the same task, the Orchestrator halts, summarizes the blocker, and proposes spec changes for your approval before continuing.

## State Management

All spec state lives in `.sdd/` at your project root. This directory is treated as read-only outside of Spectremon mode.

```text
/your-project-root
  └── .sdd/
       ├── 01-requirements.md
       ├── 02-plan.md
       ├── 03-tasks.md
       └── archive/              # Previous specs, organized by date
```

When starting a new feature, the Orchestrator archives any existing `.sdd/` files before invoking Discovery.

## License

MIT © [genehuh39](https://github.com/genehuh39)
