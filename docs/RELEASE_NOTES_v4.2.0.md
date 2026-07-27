# Spectremon v4.2.0

## Highlights

The phase 3/4 execution loop is now deterministic code instead of prose the orchestrator is trusted to follow.

## Changes

- **Bundled workflow `spectremon:execute-task`**: runs one approved task through the Implementer → Architect cycle. The retry loop is a real `for` loop with a hard 3-attempt cap; the Architect returns a structured `{passed, feedback}` verdict validated by schema instead of the "REVIEW PASSED" string match; rejected attempts feed the Architect's feedback back into the next Implementer prompt automatically.
- **Orchestrator skill**: prefers the workflow when the Workflow tool is available and passes each task via `args: {description}`. Per-task user check-ins and the plan-mutation rule on `passed: false` are unchanged. Legacy installer setups without the plugin fall back to the previous manual delegation loop.
- **Tests**: the workflow script is syntax-checked the way the runtime wraps it (async function context) and its agent wiring, attempt cap, and skill reference are validated.

## Not included

- `isolation: worktree` on the Implementer, previously deferred to this release, is dropped for now: each workflow agent gets its own worktree, so the Architect could not see the Implementer's changes, and sequential dependent tasks need each approved change in the main tree before the next starts. Revisit if workflows gain a shared-workspace primitive.

## Upgrade notes

- The workflow ships with the plugin only. Installer-based setups keep the prose delegation loop.
- Whether `agent({agentType})` resolves plugin-registered agents is documented as "same registry as the Agent tool" but worth verifying live once installed; the workflow's prompts fully restate each role, so behavior degrades gracefully if a default subagent is used.
