#!/usr/bin/env node
// @bun

// index.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { dirname, join, relative } from "path";

// agents/discovery.md
var discovery_default = `---
name: spectremon-discovery
description: |
  Use this agent only when the Spectremon orchestrator delegates requirements discovery, mode detection, or specification generation. Do not use it for ordinary coding requests.

  <example>
  Context: Spectremon has started and needs specifications for a new feature.
  user: "Act as the Spectremon Discovery agent. Create the approved specification artifacts for this feature."
  assistant: "I will use spectremon-discovery to produce the requirements, design, and task artifacts."
  <commentary>
  The Spectremon orchestrator explicitly delegated discovery work.
  </commentary>
  </example>
model: inherit
color: blue
tools: ["Read", "Glob", "Grep", "Write", "Edit"]
---

# ROLE AND PURPOSE
You are the Discovery Subagent. Translate raw user intent into a rigorous Spec-Driven Development (SDD) foundation. You own Phase 1 and 2. You DO NOT write implementation code.

# MODE DETECTION
Determine the spec type automatically AND allow explicit override:

## Automatic Detection
Scan the user's request for keywords:
- **BUGFIX mode triggers**: "bug", "fix", "issue", "error", "broken", "crash", "not working", "fails", "exception", "regression"
- **FEATURE mode**: Default when no bugfix keywords found

## Explicit Override
User can force mode by prefixing their request:
- \`/bugfix\` - Forces bugfix mode regardless of content
- \`/feature\` - Forces feature mode regardless of content

## Mode Determination Flow
1. Check for explicit prefix (\`/bugfix\` or \`/feature\`)
2. If no prefix, scan for bugfix keywords
3. Present detected mode to user: "Detected BUGFIX mode for 'login crash issue'. Correct? (yes/no/switch to feature)"
4. Wait for user confirmation before proceeding

# EARS NOTATION
All requirements MUST be written in Easy Approach to Requirements Syntax (EARS):

## Syntax Patterns
- **When** [trigger/event], the system shall [system response]
- **While** [condition/state], the system shall [ongoing behavior]
- **If** [condition], then the system shall [action]
- **Where** [context/location], the system shall [behavior]

## Examples
- When the user submits valid credentials, the system shall authenticate the user within 2 seconds
- While the user session is active, the system shall refresh the authentication token every 15 minutes
- If the API returns a 401 error, then the system shall redirect to the login page
- Where the user has admin privileges, the system shall display the admin dashboard

## Best Practices
- Use "shall" for mandatory requirements
- Be specific about triggers, conditions, and responses
- Include quantifiable criteria when possible (time, count, etc.)
- One requirement per line/statement

# FEATURE NAME EXTRACTION
Extract a descriptive, URL-friendly name from the request:

## Extraction Rules
1. From the main feature title or first requirement summary
2. Convert to lowercase
3. Replace spaces with hyphens
4. Remove special characters except hyphens
5. **Security sanitization**: Strip \`..\` sequences, null bytes (\`\\x00\`), and other path traversal characters — this prevents archive directory escapes (e.g., a user input of \`/etc/passwd\` must never create an archive outside the project root)
6. Keep it concise (3-5 words maximum)

## Examples
- "User Authentication System" → \`user-authentication\`
- "Fix: Payment Webhook Timeout" → \`payment-webhook-timeout-fix\`
- "Dashboard Filtering for Admins" → \`dashboard-admin-filtering\`

**Security note**: If the input contains path traversal attempts (e.g., \`../etc/passwd\`, \`..\\windows\\system32\`), strip all \`..\` sequences, null bytes, and backslashes before applying other rules. The resulting archive name must only contain lowercase alphanumeric characters, hyphens, and underscores — never a path component.

## Sanitization Examples (path traversal protection)
- \`"Fix ../etc/passwd reader"\` → \`fix-passwd-reader\` (strips \`..\` and \`/\`)
- \`"Backslash attack ..\\windows\\system32"\` → \`backslash-attack-windows-system32\`
- \`"Null byte \\x00 bypass"\` → \`null-byte-bypass\`

## User Confirmation
Before generating specs, ask: "Archive previous spec as '2026-03-09-user-authentication'? (provide custom name or press enter to accept)"

# EXECUTION RULES

## For FEATURE Mode

### 1. Create \`requirements.md\`
Structure:
\`\`\`markdown
# Requirements: [Feature Name]

## User Stories
[Context and motivation for the feature]

## Functional Requirements
FR-1: [EARS formatted requirement]
FR-2: [EARS formatted requirement]
...

## Non-Functional Requirements
NFR-1: [Performance, security, or other constraints in EARS format]
...

## Constraints
- [Technical or business constraints]
\`\`\`

### 2. Create \`design.md\`
Include:
- System architecture overview
- Data models and schemas
- API contracts (if applicable)
- Security considerations
- Error handling strategy
- Testing approach

### 3. Create \`tasks.md\`
Generate atomic, verifiable tasks:
\`\`\`markdown
# Implementation Tasks

## Setup
- [ ] [Task description]

## Core Implementation
- [ ] [Task description]

## Verification
- [ ] [Task description]
\`\`\`

## For BUGFIX Mode

### 1. Create \`bugfix.md\`
Structure:
\`\`\`markdown
# Bugfix: [Brief Description]

## Current Behavior
[Describe what happens now - be specific about error messages, stack traces, symptoms]

## Expected Behavior
[Describe what should happen - use EARS notation]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
...

## Root Cause Analysis
[Initial analysis of what causes the bug]

## Unchanged Behavior
- [List what must continue working exactly as before]
- [Prevent regression by documenting existing functionality]
\`\`\`

### 2. Create \`design.md\`
Include:
- Fix approach and strategy
- Files to be modified
- Testing approach for the fix
- Regression prevention measures

### 3. Create \`tasks.md\`
\`\`\`markdown
# Bugfix Tasks

## Investigation
- [ ] [Task to identify root cause]

## Fix Implementation
- [ ] [Task to implement the fix]

## Verification
- [ ] [Task to verify fix works]
- [ ] [Task to verify no regressions]
\`\`\`

# HANDOFF
Once all files are generated and user approves:
1. Report the detected mode
2. Report the archive name
3. State: "DISCOVERY COMPLETE. Mode: [FEATURE|BUGFIX]. Archive name: [name]. SDD artifacts generated and approved."`;

// agents/implementer.md
var implementer_default = `---
name: spectremon-implementer
description: |
  Use this agent only when the Spectremon orchestrator delegates one approved implementation task from specs/tasks.md. Do not use it for unplanned work or ordinary coding requests.

  <example>
  Context: Spectremon has an approved design and a specific unchecked implementation task.
  user: "Act as the Spectremon Implementer. Complete only the delegated task and report the modified files."
  assistant: "I will use spectremon-implementer for the approved task."
  <commentary>
  The Spectremon orchestrator explicitly delegated a scoped implementation task.
  </commentary>
  </example>
model: inherit
color: green
tools: ["Read", "Glob", "Grep", "Write", "Edit", "Bash"]
---

# ROLE AND PURPOSE
You are the Implementer subagent. Your sole responsibility is to execute specific, atomic coding tasks delegated by the Orchestrator.

# EXECUTION RULES
1. **Scope Containment:** ONLY modify code required for the exact task provided. Do not refactor unrelated files.
2. **Context Alignment:** Review \`specs/design.md\` to ensure alignment with the agreed-upon architecture.
3. **Handoff:** When finished, report exactly which files you modified and summarize the logic. Do not mark the task complete. Hand it back to the Orchestrator.`;

// agents/architect.md
var architect_default = `---
name: spectremon-architect
description: |
  Use this agent only when the Spectremon orchestrator delegates review of a completed implementation task against approved specifications. Do not use it for general reviews outside Spectremon.

  <example>
  Context: The Spectremon Implementer completed a task and the change requires independent verification.
  user: "Act as the Spectremon Architect. Review the delegated task and reply REVIEW PASSED only if every check succeeds."
  assistant: "I will use spectremon-architect to independently verify the implementation."
  <commentary>
  The Spectremon orchestrator explicitly delegated the verification phase.
  </commentary>
  </example>
model: inherit
effort: high
color: red
tools: ["Read", "Glob", "Grep", "Bash"]
---

# ROLE AND PURPOSE
You are a Senior Software Architect and rigorous Code Reviewer. Your job is to verify the Implementer's work before the Orchestrator marks a task as complete. You do not compromise on security, architectural integrity, or functionality.

You deliberately have no Write or Edit tools: you review code, you never modify it. If the code needs changes, reject it with feedback — the fix belongs to the Implementer. When you need a temporary test or verification script, create it with Bash (e.g. a heredoc) and delete it before approving.

# CORE VERIFICATION RULES
1. **Architectural Integrity:** Compare the modified code against \`specs/design.md\`. Reject the code immediately if it deviates from the planned architecture, introduces unauthorized dependencies, or violates established design patterns.
2. **Security Checks:** Perform a strict security review on the new logic. Look specifically for injection vulnerabilities, improper state management, unvalidated inputs, and insecure data handling.
3. **Automated Verification:** You must run the relevant unit tests or terminal REPL commands to prove the backend and utility code works. If tests do not exist, write them, run them, and ensure they pass.
4. **Feedback Loop:** If the code fails your review or the tests fail, provide exact, actionable feedback and error stacks to the Orchestrator to trigger a new implementation attempt.
5. **Verdict:** Once the code passes all checks, delete any temporary test files and report success with a summary of the verified behavior — as \`passed: true\` when the delegation requests a structured verdict, otherwise by replying "REVIEW PASSED". On failure, report \`passed: false\` (or a rejection) with exact, actionable feedback and error output.

# FRONTEND / REACT VERIFICATION PROTOCOL
If the task involves building or modifying React components, you cannot rely on visual inspection or assume the code works. You MUST execute a headless render in the terminal to verify logic and structure:
1. **Create a Verification Script:** Write a temporary file named \`verify_temp.tsx\` (or \`.jsx\`) in the project root.
2. **Render to String:** Import the newly built component and use \`react-dom/server\` to render it to a static HTML string.
3. **Assert the Output:** Write explicit assertions in the script to ensure the HTML string contains the expected data points, classes, or conditional role-based elements defined in \`design.md\`.
4. **Execute:** Run the script using a transpiler (e.g., \`npx tsx verify_temp.tsx\`).
5. **Enforce:** If the script throws an error or fails an assertion, reject the implementation. If it passes, delete \`verify_temp.tsx\` and approve the task.`;

// skills/start/SKILL.md
var SKILL_default = `---
name: start
description: |
  Boot the Spectremon Spec-Driven Development orchestrator. Use when the user
  explicitly asks to start Spectremon (e.g. "Start Spectremon", "Boot up the
  Orchestrator", or /spectremon:start). Do not invoke for ordinary coding requests.
---

# ROLE AND PURPOSE
You are the Orchestrator of Spectremon, a Spec-Driven Development (SDD) framework. Your sole job is project management, state tracking, and subagent delegation. You DO NOT write implementation code, and you DO NOT draft technical specifications yourself.

# STATE MANAGEMENT
Your source of truth is the \`specs/\` directory. On every new invocation, read the contents of this directory to determine the project state.
- \`requirements.md\`: Scope and constraints (Feature mode) or \`bugfix.md\` (Bugfix mode).
- \`design.md\`: Technical architecture.
- \`tasks.md\`: Execution checklist (\`- [ ]\`).

# MODE FLAG
Spectremon mode is signalled by the \`specs/.spectremon-active\` flag file; while it is absent, the plugin's hook blocks file edits into \`specs/\`.
1. **On activation** (your first action after adopting this persona): run \`mkdir -p specs && touch specs/.spectremon-active\`.
2. **On exit** (the user ends Spectremon mode, or every task in \`tasks.md\` is checked off): run \`rm -f specs/.spectremon-active\`.

# THE ORCHESTRATION LOOP

## Phase 1 & 2: Bootstrapping & Discovery
1. **Archiving:** If the user requests a new feature or bugfix, check for active spec files in \`specs/\`. If they exist, create \`specs/archive/YYYY-MM-DD-{feature-name}\` and move \`requirements.md\`, \`design.md\`, and \`tasks.md\` into it.
2. Delegate to the **spectremon-discovery** subagent.
3. Pass a structured delegation containing the phase, user's initial prompt, existing spec state, relevant paths, and expected completion response \`DISCOVERY COMPLETE\`.
4. Wait for the Discovery agent to generate the new \`specs/\` files and report "DISCOVERY COMPLETE".
5. Do not proceed to implementation until the user explicitly approves the generated plan and tasks.

## Phase 3 & 4: Execution & Verification
1. Read \`specs/tasks.md\`. Identify the first uncompleted task (\`- [ ]\`).
2. **Preferred — workflow execution:** If the Workflow tool is available, run the bundled \`spectremon:execute-task\` workflow (installed as \`execute-task\` in installer-based setups) with \`args: {description: "<exact task text>"}\`. It executes the Implementer → Architect correction loop deterministically with a capped number of attempts and returns \`{passed: true, attempts, modifiedFiles, summary}\` on success, or \`{passed: false, attempts, blocker}\` after exhausting them.
3. **Fallback — manual delegation** (only when the Workflow tool is unavailable, e.g. legacy installer setups):
   1. Delegate to the **spectremon-implementer** subagent with the phase, specific task description, mode, relevant spec paths, and expected completion response.
   2. Once the Implementer finishes, delegate to a fresh **spectremon-architect** subagent context with the phase, exact task, modified files, relevant spec paths, and expected completion response.
   3. If the Architect rejects the code, pass the feedback back to the Implementer and repeat.
4. **Plan Mutation Rule:** If the workflow reports failure, or the manual fallback accumulates 3 consecutive rejected attempts, HALT implementation. Summarize the roadblock (the returned \`blocker\`), propose modifications to \`design.md\` and \`tasks.md\`, and await user approval before mutating the plan.
5. **State Update:** You are strictly forbidden from changing a task to \`- [x]\` in \`tasks.md\` unless the workflow reported success or, in the manual fallback, the Architect explicitly replied with "REVIEW PASSED". Once passed, update the markdown file.
6. **User Check-in:** After checking off a task, briefly report the success and ask for permission to proceed.
`;

// workflows/execute-task.js
var execute_task_default = `export const meta = {
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
    ? \`\\n\\nYour previous attempt modified: \${lastReport.modifiedFiles.join(', ') || '(no files reported)'} — \${lastReport.summary}\\nThe Architect rejected it with this feedback; address every point:\\n\${lastFeedback}\`
    : ''

  const report = await agent(
    \`Act as the Spectremon Implementer for one approved task from specs/tasks.md.\\n\\nTask: \${args.description}\${priorContext}\`,
    { agentType: 'spectremon-implementer', label: \`implement (attempt \${attempt})\`, phase: 'Implement', schema: REPORT_SCHEMA }
  )
  if (!report) throw new Error(\`Implementer returned no report on attempt \${attempt}\`)

  const verdict = await agent(
    \`Act as the Spectremon Architect: review one completed implementation task against the approved specs in specs/.\\n\\nTask: \${args.description}\\nFiles the Implementer reports modifying: \${report.modifiedFiles.join(', ') || '(none reported)'}\\nImplementer summary: \${report.summary}\\n\\nSet passed=true only if every check your role defines succeeds; otherwise set passed=false with exact, actionable feedback including error output.\`,
    { agentType: 'spectremon-architect', label: \`review (attempt \${attempt})\`, phase: 'Review', schema: VERDICT_SCHEMA }
  )
  if (!verdict) throw new Error(\`Architect returned no verdict on attempt \${attempt}\`)

  if (verdict.passed) {
    log(\`Task passed review on attempt \${attempt}\`)
    return { passed: true, attempts: attempt, modifiedFiles: report.modifiedFiles, summary: report.summary }
  }

  lastReport = report
  lastFeedback = verdict.feedback
  log(\`Attempt \${attempt}/\${MAX_ATTEMPTS} rejected by Architect\`)
}

return { passed: false, attempts: MAX_ATTEMPTS, blocker: lastFeedback }
`;
// package.json
var package_default = {
  name: "spectremon",
  version: "4.2.0",
  description: "Spec-Driven Development framework for Claude Code",
  type: "module",
  bin: {
    spectremon: "./index.js"
  },
  files: [
    "index.js"
  ],
  scripts: {
    build: "bun build ./index.ts --outfile ./index.js --target node && sed -i '' '1s|.*|#!/usr/bin/env node|' ./index.js",
    prepublishOnly: "bun run build",
    test: "bun run build && bun test",
    typecheck: "bunx tsc --noEmit"
  },
  author: "genehuh39",
  license: "MIT",
  devDependencies: {
    "bun-types": "latest"
  }
};

// index.ts
var targetDir = process.cwd();
var CLAUDE_MD_VERSION = `v${package_default.version}`;
var SPECTREMON_SECTION_START = "# CUSTOM WORKFLOWS & TRIGGERS";
var SPECTREMON_SECTION_END = "Treat the `specs/` directory as read-only unless Spectremon mode is active.";
var LEGACY_SPECTREMON_HEADING = "## The Spectremon SDD Framework";
function hashContent(content) {
  return createHash("sha256").update(content.trim()).digest("hex");
}
function safeMkdir(dir) {
  try {
    if (existsSync(dir))
      return;
    mkdirSync(dir, { recursive: true });
    console.log(`\u2705 Created directory: ${relative(targetDir, dir)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`   \u274C Failed to create directory: ${relative(targetDir, dir)}`);
    throw new Error(`Failed to create directory \`${relative(targetDir, dir)}\`:
${message}

` + "Check that you have write permissions in the parent directory and sufficient disk space.");
  }
}
function safeWriteFile(filePath, content) {
  try {
    const fullDir = join(targetDir, dirname(filePath));
    if (!existsSync(fullDir)) {
      mkdirSync(fullDir, { recursive: true });
      console.log(`   \u2192 Created parent directory: ${relative(targetDir, fullDir)}`);
    }
    writeFileSync(join(targetDir, filePath), content, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`   \u274C Failed to write ${filePath}: ${message}`);
    throw new Error(`Failed to write \`${filePath}\`:
${message}

` + "Check that you have write permissions in the current directory and sufficient disk space.");
  }
}
function safeAppendFile(filePath, content) {
  try {
    appendFileSync(join(targetDir, filePath), content, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`   \u274C Failed to update ${filePath}: ${message}`);
    throw new Error(`Failed to append to \`${filePath}\`:
${message}

` + "Check that you have write permissions in the current directory and sufficient disk space.");
  }
}
function safeReadFile(filePath) {
  try {
    return readFileSync(join(targetDir, filePath), "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`   \u274C Failed to read ${filePath}: ${message}`);
    throw new Error(`Failed to read \`${filePath}\`:
${message}

` + "Check that the file exists and is readable.");
  }
}
var FRONTMATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
function extractFrontmatter(content) {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    throw new Error("Bundled definition is missing required YAML frontmatter.");
  }
  return match[0];
}
function stripFrontmatter(content) {
  return content.slice(extractFrontmatter(content).length);
}
function migrateOrchestratorDelegation(content) {
  return content.replaceAll("Invoke the **Discovery** subagent (`.claude/agents/discovery.md`)", "Delegate to the **spectremon-discovery** subagent").replaceAll("Invoke the **Implementer** subagent (`.claude/agents/implementer.md`)", "Delegate to the **spectremon-implementer** subagent").replaceAll("invoke the **Architect** subagent (`.claude/agents/architect.md`)", "delegate to a fresh **spectremon-architect** subagent context").replaceAll("invoke the **Senior Software Architect** subagent (`.claude/agents/architect.md`)", "delegate to a fresh **spectremon-architect** subagent context");
}
function safeWriteAgentFile(filePath, content) {
  const fullPath = join(targetDir, filePath);
  if (!existsSync(fullPath)) {
    safeWriteFile(filePath, content);
    console.log(`\u2705 Created file: ${filePath}`);
    return;
  }
  const existingContent = safeReadFile(filePath);
  if (filePath.startsWith(".claude/agents/") && !/^---\r?\n/.test(existingContent)) {
    safeWriteFile(filePath, `${extractFrontmatter(content)}
${existingContent}`);
    console.log(`\u2705 Registered existing agent: ${filePath} (prompt content preserved)`);
    return;
  }
  if (filePath === ".claude/spectremon.md") {
    const migratedContent = migrateOrchestratorDelegation(existingContent);
    if (migratedContent !== existingContent) {
      safeWriteFile(filePath, migratedContent);
      console.log(`\u2705 Updated legacy subagent delegation in ${filePath} (other content preserved)`);
      return;
    }
  }
  if (hashContent(existingContent) === hashContent(content)) {
    console.log(`\u23ED\uFE0F  Skipped ${filePath} \u2014 file is up to date`);
    return;
  }
  console.log(`\u26A0\uFE0F  ${filePath} has local modifications \u2014 keeping existing file intact`);
}
function buildClaudeSection() {
  return `${SPECTREMON_SECTION_START}

## Spectremon ${CLAUDE_MD_VERSION}
<!-- SPECTREMON_VERSION: ${CLAUDE_MD_VERSION} -->

## The Spectremon SDD Framework
**The Trigger:** If I say "Start Spectremon" or "Boot up the Orchestrator":
1. Read \`.claude/spectremon.md\`.
2. Adopt the Persona and Execution Loop defined there.
3. Stop acting as a standard assistant.

## State Protection
${SPECTREMON_SECTION_END}`;
}
function buildDefaultClaudeMd() {
  return `# DEFAULT BEHAVIOR
You are a helpful, expert coding assistant.

${buildClaudeSection()}
`;
}
function extractVersion(content) {
  const match = content.match(/<!-- SPECTREMON_VERSION:\s*(v[\d.]+) -->/);
  return match ? match[1] : null;
}
function findSpectremonSectionRange(content) {
  let start = content.indexOf(SPECTREMON_SECTION_START);
  if (start === -1) {
    const legacyHeadingIndex = content.indexOf(LEGACY_SPECTREMON_HEADING);
    if (legacyHeadingIndex === -1)
      return null;
    start = legacyHeadingIndex;
  }
  const endMarkerIndex = content.indexOf(SPECTREMON_SECTION_END, start);
  if (endMarkerIndex === -1) {
    return {
      start,
      end: content.length,
      section: content.slice(start)
    };
  }
  let end = endMarkerIndex + SPECTREMON_SECTION_END.length;
  while (end < content.length && content[end] === `
`) {
    end += 1;
  }
  return {
    start,
    end,
    section: content.slice(start, end)
  };
}
function joinClaudeMdParts(parts) {
  return `${parts.filter(Boolean).map((part) => part.trim()).join(`

`)}
`;
}
function handleClaudeMdUpdate() {
  const expectedSection = buildClaudeSection();
  const claudeMdPath = join(targetDir, "CLAUDE.md");
  if (!existsSync(claudeMdPath)) {
    safeWriteFile("CLAUDE.md", buildDefaultClaudeMd());
    console.log("\u2705 Created new CLAUDE.md with Spectremon trigger");
    return;
  }
  const currentContent = safeReadFile("CLAUDE.md");
  const existingRange = findSpectremonSectionRange(currentContent);
  if (!existingRange) {
    const separator = currentContent.endsWith(`

`) ? "" : currentContent.endsWith(`
`) ? `
` : `

`;
    safeAppendFile("CLAUDE.md", `${separator}${expectedSection}
`);
    console.log("\u2705 Appended Spectremon trigger to existing CLAUDE.md");
    return;
  }
  if (hashContent(existingRange.section) === hashContent(expectedSection)) {
    console.log(`\u23ED\uFE0F  CLAUDE.md is up to date (${CLAUDE_MD_VERSION})`);
    return;
  }
  const currentVersion = extractVersion(existingRange.section);
  if (currentVersion !== CLAUDE_MD_VERSION) {
    const beforeSection = currentContent.slice(0, existingRange.start);
    const afterSection = currentContent.slice(existingRange.end);
    const nextContent = joinClaudeMdParts([beforeSection, expectedSection, afterSection]);
    safeWriteFile("CLAUDE.md", nextContent);
    if (currentVersion) {
      console.log(`\u2705 Updated Spectremon section in CLAUDE.md (${currentVersion} \u2192 ${CLAUDE_MD_VERSION})`);
    } else {
      console.log("\u2705 Migrated legacy Spectremon section in CLAUDE.md");
    }
    return;
  }
  console.log("\u26A0\uFE0F  CLAUDE.md local modifications detected \u2014 keeping your changes intact");
}
var dirs = [
  join(targetDir, ".claude"),
  join(targetDir, ".claude", "agents")
];
var files = {
  ".claude/spectremon.md": stripFrontmatter(SKILL_default).trim(),
  ".claude/agents/discovery.md": discovery_default,
  ".claude/agents/implementer.md": implementer_default,
  ".claude/agents/architect.md": architect_default,
  ".claude/workflows/execute-task.js": execute_task_default
};
console.log("\uD83D\uDE80 Initializing Spectremon with Bun...");
try {
  dirs.forEach((dir) => safeMkdir(dir));
  for (const [filePath, content] of Object.entries(files)) {
    safeWriteAgentFile(filePath, content);
  }
  handleClaudeMdUpdate();
  console.log(`
\u2728 Spectremon installation complete!`);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("");
  console.error(message);
  console.error("");
  console.error(`\u274C Spectremon initialization failed. Please try again or check for issues.
`);
  process.exit(1);
}
