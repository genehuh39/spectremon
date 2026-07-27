# Spectremon v4.2.0

## Highlights

The phase 3/4 execution loop is now deterministic code instead of prose the orchestrator is trusted to follow.

## Changes

- **Bundled workflow `spectremon:execute-task`**: runs one approved task through the Implementer → Architect cycle. The retry loop is a real `for` loop with a hard 3-attempt cap; the Architect returns a structured `{passed, feedback}` verdict validated by schema instead of the "REVIEW PASSED" string match; rejected attempts feed the Architect's feedback back into the next Implementer prompt automatically.
- **Orchestrator skill**: prefers the workflow when the Workflow tool is available and passes each task via `args: {description}`. Per-task user check-ins and the plan-mutation rule on failure are unchanged. The legacy installer now copies the same script to `.claude/workflows/execute-task.js`, so both setups share one code path; manual delegation remains only as a last-resort fallback when the Workflow tool itself is unavailable.
- **Architect verdict protocol**: the agent definition now names the structured `{passed, feedback}` verdict as its primary protocol, with the plain-text "REVIEW PASSED" reply reserved for unstructured (fallback) delegations — one protocol owner instead of two.
- **Tests**: the workflow script is executed against stubbed agents to verify the real control flow — agent targeting, retry feedback threading, the attempt cap, and both return shapes.

## Not included

- `isolation: worktree` on the Implementer, previously deferred to this release, is dropped for now: each workflow agent gets its own worktree, so the Architect could not see the Implementer's changes, and sequential dependent tasks need each approved change in the main tree before the next starts. Revisit if workflows gain a shared-workspace primitive.

## Upgrade notes

- The workflow prompts carry only per-task context; role rules live solely in the agent definitions resolved via `agentType`. Whether `agent({agentType})` resolves plugin-registered agents is documented as "same registry as the Agent tool" but worth one live verification before relying on the workflow path.
