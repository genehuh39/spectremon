## Spectremon v3.0.2

Patch release restoring reliable Claude Code subagent registration and delegation.

### Fixes

- Added valid Claude Code YAML frontmatter to the Discovery, Implementer, and Architect project agents
- Existing agent prompts without frontmatter are registered during upgrade without replacing their prompt bodies or local edits
- Known legacy orchestrator delegation phrases are migrated to registered agent names while preserving other orchestrator content
- Registered stable agent names: `spectremon-discovery`, `spectremon-implementer`, and `spectremon-architect`
- Restricted agent descriptions to explicit Spectremon orchestration work to avoid unintended routing
- Updated the orchestrator to delegate by registered agent name with structured phase context
- Required Architect review to run in a fresh subagent context

### Verification

- Added installer integration tests that validate generated agent metadata and orchestrator references
- Added validation for the tracked project agent definitions
