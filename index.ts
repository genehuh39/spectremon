#!/usr/bin/env bun

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";

const targetDir = process.cwd();
const CLAUDE_MD_VERSION = "v3.0.0";
const SPECTREMON_SECTION_START = "# CUSTOM WORKFLOWS & TRIGGERS";
const SPECTREMON_SECTION_END = "Treat the `specs/` directory as read-only unless Spectremon mode is active.";
const LEGACY_SPECTREMON_HEADING = "## The Spectremon SDD Framework";

function hashContent(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}

// --- HELPER: safe directory creation ---
function safeMkdir(dir: string): void {
  try {
    if (existsSync(dir)) return;
    mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${relative(targetDir, dir)}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ Failed to create directory: ${relative(targetDir, dir)}`);
    throw new Error(
      `Failed to create directory \`${relative(targetDir, dir)}\`:\n${message}\n\n` +
        "Check that you have write permissions in the parent directory and sufficient disk space."
    );
  }
}

function safeWriteFile(filePath: string, content: string): void {
  try {
    const fullDir = join(targetDir, dirname(filePath));
    if (!existsSync(fullDir)) {
      mkdirSync(fullDir, { recursive: true });
      console.log(`   → Created parent directory: ${relative(targetDir, fullDir)}`);
    }
    writeFileSync(join(targetDir, filePath), content, "utf8");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ Failed to write ${filePath}: ${message}`);
    throw new Error(
      `Failed to write \`${filePath}\`:\n${message}\n\n` +
        "Check that you have write permissions in the current directory and sufficient disk space."
    );
  }
}

function safeAppendFile(filePath: string, content: string): void {
  try {
    appendFileSync(join(targetDir, filePath), content, "utf8");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ Failed to update ${filePath}: ${message}`);
    throw new Error(
      `Failed to append to \`${filePath}\`:\n${message}\n\n` +
        "Check that you have write permissions in the current directory and sufficient disk space."
    );
  }
}

function safeReadFile(filePath: string): string {
  try {
    return readFileSync(join(targetDir, filePath), "utf8");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ Failed to read ${filePath}: ${message}`);
    throw new Error(
      `Failed to read \`${filePath}\`:\n${message}\n\n` +
        "Check that the file exists and is readable."
    );
  }
}

// --- HELPER: preserve user-modified agent files ---
function safeWriteAgentFile(filePath: string, content: string): void {
  const fullPath = join(targetDir, filePath);

  if (!existsSync(fullPath)) {
    safeWriteFile(filePath, content);
    console.log(`✅ Created file: ${filePath}`);
    return;
  }

  const existingContent = safeReadFile(filePath);
  if (hashContent(existingContent) === hashContent(content)) {
    console.log(`⏭️  Skipped ${filePath} — file is up to date`);
    return;
  }

  console.log(`⚠️  ${filePath} has local modifications — keeping existing file intact`);
}

function buildClaudeSection(): string {
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

function buildDefaultClaudeMd(): string {
  return `# DEFAULT BEHAVIOR
You are a helpful, expert coding assistant.

${buildClaudeSection()}
`;
}

function extractVersion(content: string): string | null {
  const match = content.match(/<!-- SPECTREMON_VERSION:\s*(v[\d.]+) -->/);
  return match ? match[1] : null;
}

type SpectremonSectionRange = {
  start: number;
  end: number;
  section: string;
};

function findSpectremonSectionRange(content: string): SpectremonSectionRange | null {
  let start = content.indexOf(SPECTREMON_SECTION_START);

  if (start === -1) {
    const legacyHeadingIndex = content.indexOf(LEGACY_SPECTREMON_HEADING);
    if (legacyHeadingIndex === -1) return null;
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
  while (end < content.length && content[end] === "\n") {
    end += 1;
  }

  return {
    start,
    end,
    section: content.slice(start, end)
  };
}

function joinClaudeMdParts(parts: string[]): string {
  return `${parts.filter(Boolean).map(part => part.trim()).join("\n\n")}\n`;
}

function handleClaudeMdUpdate(): void {
  const expectedSection = buildClaudeSection();
  const claudeMdPath = join(targetDir, "CLAUDE.md");

  if (!existsSync(claudeMdPath)) {
    safeWriteFile("CLAUDE.md", buildDefaultClaudeMd());
    console.log("✅ Created new CLAUDE.md with Spectremon trigger");
    return;
  }

  const currentContent = safeReadFile("CLAUDE.md");
  const existingRange = findSpectremonSectionRange(currentContent);

  if (!existingRange) {
    const separator = currentContent.endsWith("\n\n") ? "" : currentContent.endsWith("\n") ? "\n" : "\n\n";
    safeAppendFile("CLAUDE.md", `${separator}${expectedSection}\n`);
    console.log("✅ Appended Spectremon trigger to existing CLAUDE.md");
    return;
  }

  if (hashContent(existingRange.section) === hashContent(expectedSection)) {
    console.log(`⏭️  CLAUDE.md is up to date (${CLAUDE_MD_VERSION})`);
    return;
  }

  const currentVersion = extractVersion(existingRange.section);
  if (currentVersion !== CLAUDE_MD_VERSION) {
    const beforeSection = currentContent.slice(0, existingRange.start);
    const afterSection = currentContent.slice(existingRange.end);
    const nextContent = joinClaudeMdParts([beforeSection, expectedSection, afterSection]);
    safeWriteFile("CLAUDE.md", nextContent);

    if (currentVersion) {
      console.log(`✅ Updated Spectremon section in CLAUDE.md (${currentVersion} → ${CLAUDE_MD_VERSION})`);
    } else {
      console.log("✅ Migrated legacy Spectremon section in CLAUDE.md");
    }
    return;
  }

  console.log("⚠️  CLAUDE.md local modifications detected — keeping your changes intact");
}

// --- 1. DEFINE DIRECTORIES ---
const dirs = [
  join(targetDir, ".claude"),
  join(targetDir, ".claude", "agents")
];

// --- 2. DEFINE FILE CONTENTS ---
const files: Record<string, string> = {
  ".claude/spectremon.md": `# ROLE AND PURPOSE
You are the Orchestrator of Spectremon, a Spec-Driven Development (SDD) framework. Your sole job is project management, state tracking, and subagent delegation. You DO NOT write implementation code, and you DO NOT draft technical specifications yourself.

# STATE MANAGEMENT
Your source of truth is the \`specs/\` directory. On every new invocation, read the contents of this directory to determine the project state.
- \`requirements.md\`: Scope and constraints (Feature mode) or \`bugfix.md\` (Bugfix mode).
- \`design.md\`: Technical architecture.
- \`tasks.md\`: Execution checklist (\`- [ ]\`).

# THE ORCHESTRATION LOOP

## Phase 1 & 2: Bootstrapping & Discovery
1. **Archiving:** If the user requests a new feature or bugfix, check for active spec files in \`specs/\`. If they exist, create \`specs/archive/YYYY-MM-DD-{feature-name}\` and move \`requirements.md\`, \`design.md\`, and \`tasks.md\` into it.
2. Invoke the **Discovery** subagent (\`.claude/agents/discovery.md\`).
3. Pass the user's initial prompt to the Discovery agent to begin mode detection and questioning.
4. Wait for the Discovery agent to generate the new \`specs/\` files and report "DISCOVERY COMPLETE".
5. Do not proceed to implementation until the user explicitly approves the generated plan and tasks.

## Phase 3 & 4: Execution & Verification
1. Read \`specs/tasks.md\`. Identify the first uncompleted task (\`- [ ]\`).
2. **Delegation (Coding):** Invoke the **Implementer** subagent (\`.claude/agents/implementer.md\`) with the specific task description.
3. **Delegation (Review):** Once the Implementer finishes, immediately invoke the **Senior Software Architect** subagent (\`.claude/agents/architect.md\`) to review the exact files modified against \`design.md\`.
4. **The Correction Loop:** If the Architect rejects the code, pass the feedback back to the Implementer and repeat.
5. **Plan Mutation Rule:** If the Implementer fails the Architect's review after 3 consecutive attempts on the same task, HALT implementation. Summarize the roadblock, propose modifications to \`design.md\` and \`tasks.md\`, and await user approval before mutating the plan.
6. **State Update:** You are strictly forbidden from changing a task to \`- [x]\` in \`tasks.md\` unless the Architect explicitly replies with "REVIEW PASSED". Once passed, update the markdown file.
7. **User Check-in:** After checking off a task, briefly report the success and ask for permission to proceed.`,

  ".claude/agents/discovery.md": `# ROLE AND PURPOSE
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
3. State: "DISCOVERY COMPLETE. Mode: [FEATURE|BUGFIX]. Archive name: [name]. SDD artifacts generated and approved."`,

  ".claude/agents/implementer.md": `# ROLE AND PURPOSE
You are the Implementer subagent. Your sole responsibility is to execute specific, atomic coding tasks delegated by the Orchestrator.

# EXECUTION RULES
1. **Scope Containment:** ONLY modify code required for the exact task provided. Do not refactor unrelated files.
2. **Context Alignment:** Review \`specs/design.md\` to ensure alignment with the agreed-upon architecture.
3. **Handoff:** When finished, report exactly which files you modified and summarize the logic. Do not mark the task complete. Hand it back to the Orchestrator.`,

  ".claude/agents/architect.md": `# ROLE AND PURPOSE
You are a Senior Software Architect and rigorous Code Reviewer. Your job is to verify the Implementer's work before the Orchestrator marks a task as complete. You do not compromise on security, architectural integrity, or functionality.

# CORE VERIFICATION RULES
1. **Architectural Integrity:** Compare the modified code against \`specs/design.md\`. Reject the code immediately if it deviates from the planned architecture, introduces unauthorized dependencies, or violates established design patterns.
2. **Security Checks:** Perform a strict security review on the new logic. Look specifically for injection vulnerabilities, improper state management, unvalidated inputs, and insecure data handling.
3. **Automated Verification:** You must run the relevant unit tests or terminal REPL commands to prove the backend and utility code works. If tests do not exist, write them, run them, and ensure they pass.
4. **Feedback Loop:** If the code fails your review or the tests fail, provide exact, actionable feedback and error stacks to the Orchestrator to trigger a new implementation attempt.
5. **Approval:** Once the code passes all checks, reply with "REVIEW PASSED", delete any temporary test files, and summarize the verified behavior.

# FRONTEND / REACT VERIFICATION PROTOCOL
If the task involves building or modifying React components, you cannot rely on visual inspection or assume the code works. You MUST execute a headless render in the terminal to verify logic and structure:
1. **Create a Verification Script:** Write a temporary file named \`verify_temp.tsx\` (or \`.jsx\`) in the project root.
2. **Render to String:** Import the newly built component and use \`react-dom/server\` to render it to a static HTML string.
3. **Assert the Output:** Write explicit assertions in the script to ensure the HTML string contains the expected data points, classes, or conditional role-based elements defined in \`design.md\`.
4. **Execute:** Run the script using a transpiler (e.g., \`npx tsx verify_temp.tsx\`).
5. **Enforce:** If the script throws an error or fails an assertion, reject the implementation. If it passes, delete \`verify_temp.tsx\` and approve the task.`
};

console.log("🚀 Initializing Spectremon with Bun...");

try {
  dirs.forEach(dir => safeMkdir(dir));

  for (const [filePath, content] of Object.entries(files)) {
    safeWriteAgentFile(filePath, content);
  }

  handleClaudeMdUpdate();

  console.log("\n✨ Spectremon installation complete!");
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("");
  console.error(message);
  console.error("");
  console.error("❌ Spectremon initialization failed. Please try again or check for issues.\n");
  process.exit(1);
}
