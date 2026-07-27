export const meta = {
  name: 'execute-task',
  description: 'Run one approved Spectremon task through the Implementer → Architect review loop (hard 3-attempt cap)',
  whenToUse: 'Invoked by the Spectremon orchestrator for each unchecked task in specs/tasks.md. Pass args: {description: "<exact task text>"}.',
  phases: [
    { title: 'Implement', detail: 'Implementer executes the approved task' },
    { title: 'Review', detail: 'Architect independently verifies the change' },
  ],
}

if (!args?.description) {
  throw new Error('args.description is required: pass the exact task text from specs/tasks.md')
}

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    modifiedFiles: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['modifiedFiles', 'summary'],
  additionalProperties: false,
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    feedback: { type: 'string' },
  },
  required: ['passed', 'feedback'],
  additionalProperties: false,
}

const MAX_ATTEMPTS = 3

// Role rules live in the agent definitions (agents/*.md), loaded via
// agentType — these prompts carry only the per-task delegation context.
let lastReport = null
let lastFeedback = ''

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const priorContext = lastReport
    ? `\n\nYour previous attempt modified: ${lastReport.modifiedFiles.join(', ') || '(no files reported)'} — ${lastReport.summary}\nThe Architect rejected it with this feedback; address every point:\n${lastFeedback}`
    : ''

  const report = await agent(
    `Act as the Spectremon Implementer for one approved task from specs/tasks.md.\n\nTask: ${args.description}${priorContext}`,
    { agentType: 'spectremon-implementer', label: `implement (attempt ${attempt})`, phase: 'Implement', schema: REPORT_SCHEMA }
  )
  if (!report) throw new Error(`Implementer returned no report on attempt ${attempt}`)

  const verdict = await agent(
    `Act as the Spectremon Architect: review one completed implementation task against the approved specs in specs/.\n\nTask: ${args.description}\nFiles the Implementer reports modifying: ${report.modifiedFiles.join(', ') || '(none reported)'}\nImplementer summary: ${report.summary}\n\nSet passed=true only if every check your role defines succeeds; otherwise set passed=false with exact, actionable feedback including error output.`,
    { agentType: 'spectremon-architect', label: `review (attempt ${attempt})`, phase: 'Review', schema: VERDICT_SCHEMA }
  )
  if (!verdict) throw new Error(`Architect returned no verdict on attempt ${attempt}`)

  if (verdict.passed) {
    log(`Task passed review on attempt ${attempt}`)
    return { passed: true, attempts: attempt, modifiedFiles: report.modifiedFiles, summary: report.summary }
  }

  lastReport = report
  lastFeedback = verdict.feedback
  log(`Attempt ${attempt}/${MAX_ATTEMPTS} rejected by Architect`)
}

return { passed: false, attempts: MAX_ATTEMPTS, blocker: lastFeedback }
