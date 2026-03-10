## Spectremon v1.0.0

Initial release of Spectremon - a Spec-Driven Development framework for Claude Code.

### Features

#### Multi-Agent Orchestration
Coordinates four specialized agents to enforce a rigorous SDD lifecycle:
- **Orchestrator** - Project management, state tracking, and delegation
- **Discovery** - Translates requests into technical specifications
- **Implementer** - Executes atomic coding tasks
- **Architect** - Reviews code for security, architecture, and correctness

#### Four-Phase Development Loop
1. **Discovery** - Questioning model to clarify requirements
2. **Architecture** - Technical design and planning
3. **Implementation** - Atomic task execution
4. **Verification** - Rigorous code review with automated testing

#### State Management
All spec state lives in `.sdd/` directory:
- `01-requirements.md` - Scope and constraints
- `02-plan.md` - Technical architecture
- `03-tasks.md` - Execution checklist

#### Spec Archiving
Completed specs are archived to `.sdd/archive/YYYY-MM-DD/` with timestamped folders.

#### Correction Loop
If implementation fails review 3 times, the Orchestrator halts and proposes spec modifications.

### Installation

```bash
npx spectremon
```

### Usage

Trigger in Claude Code:
```
"Start Spectremon" or "Boot up the Orchestrator"
```

### What's Included

- `.claude/spectremon.md` - Orchestrator instructions
- `.claude/agents/discovery.md` - Discovery agent
- `.claude/agents/implementer.md` - Implementer agent
- `.claude/agents/architect.md` - Architect agent

### Documentation

See README.md for full documentation on the SDD workflow and agent responsibilities.

---

This is the initial stable release of Spectremon.