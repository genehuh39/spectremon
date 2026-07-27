export const meta = {
  name: 'execute-task',
  description: 'Run one approved Spectremon task through the Implementer → Architect review loop (hard 3-attempt cap)',
  whenToUse: 'Invoked by the Spectremon orchestrator for each unchecked task in specs/tasks.md. Pass args: {description: "<exact task text>"}.',
  phases: [
    { title: 'Implement', detail: 'Implementer executes the approved task' },
    { title: 'Review', detail: 'Architect independently verifies the change' },
  ],
}

const task = typeof args === 'string' ? { description: args } : (args || {})
if (!task.description) {
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
const attempts = []

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const priorFeedback = attempts.length
    ? `\n\nYour previous attempt was rejected by the Architect with this feedback — address every point:\n${attempts[attempts.length - 1].feedback}`
    : ''

  const report = await agent(
    `Act as the Spectremon Implementer. Complete ONLY this approved task from specs/tasks.md and nothing else.\n\nTask: ${task.description}${priorFeedback}\n\nAlign the implementation with specs/design.md. Do not mark the task complete — report the files you modified and a summary of the logic.`,
    { agentType: 'spectremon-implementer', label: `implement (attempt ${attempt})`, phase: 'Implement', schema: REPORT_SCHEMA }
  )
  if (!report) throw new Error(`Implementer returned no report on attempt ${attempt}`)

  const verdict = await agent(
    `Act as the Spectremon Architect. Independently review a completed implementation task against the approved specs in specs/.\n\nTask: ${task.description}\nFiles the Implementer reports modifying: ${report.modifiedFiles.join(', ') || '(none reported)'}\nImplementer summary: ${report.summary}\n\nRun every check your role defines: conformance to specs/design.md, security review, and automated verification (run the relevant tests; write temporary ones via Bash if none exist, then delete them). Set passed=true only if every check succeeds. Otherwise set passed=false and give exact, actionable feedback with error output.`,
    { agentType: 'spectremon-architect', label: `review (attempt ${attempt})`, phase: 'Review', schema: VERDICT_SCHEMA }
  )
  if (!verdict) throw new Error(`Architect returned no verdict on attempt ${attempt}`)

  attempts.push({
    attempt,
    modifiedFiles: report.modifiedFiles,
    summary: report.summary,
    passed: verdict.passed,
    feedback: verdict.feedback,
  })

  if (verdict.passed) {
    log(`Task passed review on attempt ${attempt}`)
    return { passed: true, attempts, modifiedFiles: report.modifiedFiles, summary: report.summary }
  }
  log(`Attempt ${attempt}/${MAX_ATTEMPTS} rejected by Architect`)
}

return {
  passed: false,
  attempts,
  blocker: attempts[attempts.length - 1].feedback,
}
