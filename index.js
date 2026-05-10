#!/usr/bin/env node
// @bun

// index.ts
import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from "fs";
import { createHash } from "crypto";
import { dirname, join, relative } from "path";
var targetDir = process.cwd();
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
function shouldSkipFile(filePath, newContent) {
  const fullPath = join(targetDir, filePath);
  if (!existsSync(fullPath))
    return false;
  try {
    const existingContent = readFileSync(fullPath, "utf8");
    const existingHash = createHash("sha256").update(existingContent).digest("hex");
    const newHash = createHash("sha256").update(newContent).digest("hex");
    return existingHash === newHash;
  } catch {
    return false;
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
    console.error(`   \u274C Failed to create ${filePath}: ${message}`);
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
function safeWriteAgentFile(filePath, content) {
  if (shouldSkipFile(filePath, content)) {
    console.log(`\u23ED\uFE0F  Skipped ${filePath} \u2014 file is up to date`);
    return;
  }
  const fullPath = join(targetDir, filePath);
  try {
    if (existsSync(fullPath)) {
      const existingContent = safeReadFile(filePath);
      const existingHash = createHash("sha256").update(existingContent).digest("hex");
      const newHash = createHash("sha256").update(content).digest("hex");
      if (existingHash !== newHash) {
        console.log(`\u26A0\uFE0F  ${filePath} has been modified \u2014 updating with latest version`);
      }
    }
    safeWriteFile(filePath, content);
    console.log(`\u2705 Created file: ${filePath}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`   \u274C Failed to update ${filePath}: ${message}`);
    throw new Error(`Failed to write \`${filePath}\`:
${message}

` + "Check that you have write permissions in the current directory and sufficient disk space.");
  }
}
var dirs = [
  join(targetDir, ".claude"),
  join(targetDir, ".claude", "agents")
];
var files = {
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

# EXECUTION RULES
1. **Requirements (\`specs/requirements.md\`):** Analyze the request. For any technical divergence, missing constraint, or ambiguity, present structured options to the user (Context, Option A, Option B, Recommended) and wait for a selection.
2. **Architecture (\`specs/design.md\`):** Synthesize approved requirements into a technical architecture, defining data models, security boundaries, and verification strategies.
3. **Tasks (\`specs/tasks.md\`):** Translate the plan into a chronological checklist (\`- [ ]\`). Tasks must be atomic (1-2 files max) and explicitly state how they will be verified.
4. **Handoff:** Once all files are generated and explicitly approved by the user, report back to the Orchestrator: "DISCOVERY COMPLETE. SDD artifacts generated and approved."`,
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
var CLAUDE_MD_VERSION = "v3.0.0";
function buildClaudeTrigger() {
  return `# CUSTOM WORKFLOWS & TRIGGERS

## Spectremon ${CLAUDE_MD_VERSION}
` + `<!-- SPECTREMON_VERSION: ${CLAUDE_MD_VERSION} -->

` + `## The Spectremon SDD Framework`;
}
function hasSpectremonSection(content) {
  return content.includes("<!-- SPECTREMON_VERSION:");
}
function extractSpectremonBlock(content) {
  const marker = "<!-- SPECTREMON_VERSION:";
  const idx = content.indexOf(marker);
  if (idx === -1)
    return null;
  let sectionStart = idx;
  while (sectionStart > 0 && content[sectionStart - 1] !== `
`) {
    sectionStart--;
  }
  if (content[sectionStart - 1] === `
` || sectionStart === 0) {
    return content.substring(sectionStart);
  }
  return content.substring(sectionStart + 1);
}
function extractNonSpectremonContent(content) {
  const marker = "<!-- SPECTREMON_VERSION:";
  const idx = content.indexOf(marker);
  if (idx === -1)
    return content;
  let beforeEnd = idx;
  while (beforeEnd > 0 && content[beforeEnd - 1] !== `
`) {
    beforeEnd--;
  }
  if (content[beforeEnd - 1] === `
` || beforeEnd === 0) {
    return content.substring(0, beforeEnd);
  }
  return content.substring(0, beforeEnd + 1);
}
function extractVersion(content) {
  const match = content.match(/<!-- SPECTREMON_VERSION:\s*(v[\d.]+) -->/);
  return match ? match[1] : null;
}
function handleClaudeMdUpdate() {
  const claudeMdPath = join(targetDir, "CLAUDE.md");
  if (!existsSync(claudeMdPath)) {
    const defaultContent = `# DEFAULT BEHAVIOR
You are a helpful, expert coding assistant.
${buildClaudeTrigger()}

## State Protection
Treat the \`specs/\` directory as read-only unless Spectremon mode is active.`;
    safeWriteFile("CLAUDE.md", defaultContent);
    console.log(`\u2705 Created new CLAUDE.md with Spectremon trigger`);
    return;
  }
  try {
    const currentContent = safeReadFile("CLAUDE.md");
    if (!hasSpectremonSection(currentContent)) {
      const appendedContent = `
${buildClaudeTrigger()}

## State Protection
Treat the \`specs/\` directory as read-only unless Spectremon mode is active.`;
      safeAppendFile("CLAUDE.md", appendedContent);
      console.log(`\u2705 Appended Spectremon trigger to existing CLAUDE.md`);
      return;
    }
    const currentVersion = extractVersion(currentContent) || "unknown";
    const expectedTrigger = buildClaudeTrigger();
    const newHash = createHash("sha256").update(expectedTrigger).digest("hex");
    const existingSpectremonBlock = extractSpectremonBlock(currentContent);
    if (!existingSpectremonBlock) {
      console.log(`\u26A0\uFE0F  Could not parse Spectremon section \u2014 appending fresh trigger`);
      safeAppendFile("CLAUDE.md", `
${buildClaudeTrigger()}

## State Protection
Treat the \`specs/\` directory as read-only unless Spectremon mode is active.`);
      return;
    }
    const existingHash = createHash("sha256").update(existingSpectremonBlock).digest("hex");
    if (currentVersion === CLAUDE_MD_VERSION && existingHash === newHash) {
      console.log(`\u23ED\uFE0F  CLAUDE.md is up to date (${CLAUDE_MD_VERSION})`);
      return;
    }
    const needsUpdate = currentVersion !== CLAUDE_MD_VERSION || existingHash !== newHash;
    if (needsUpdate) {
      const beforeSpectremon = extractNonSpectremonContent(currentContent);
      let replacementBlock;
      if (currentVersion !== CLAUDE_MD_VERSION) {
        console.log(`\u26A0\uFE0F  Spectremon ${CLAUDE_MD_VERSION} available \u2014 updating CLAUDE.md with latest template`);
        replacementBlock = `
${buildClaudeTrigger()}

## State Protection
Treat the \`specs/\` directory as read-only unless Spectremon mode is active.`;
      } else {
        console.log(`\u26A0\uFE0F  CLAUDE.md local modifications detected \u2014 keeping your changes intact`);
        return;
      }
      const newContent = beforeSpectremon + replacementBlock;
      safeWriteFile("CLAUDE.md", newContent);
      console.log(`\u2705 Updated Spectremon section in CLAUDE.md`);
    } else {
      console.log(`\u23ED\uFE0F  CLAUDE.md is up to date (${CLAUDE_MD_VERSION})`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`   \u274C Failed to read/append CLAUDE.md: ${message}`);
    throw new Error(`Failed to update \`CLAUDE.md\`:
${message}

` + "Check that the file exists and is readable, and that you have write permissions in the current directory.");
  }
}
var claudeTrigger = buildClaudeTrigger();
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
  console.error(`\u274C Spectremon initialization failed. Please try again or check for issues.
`);
  process.exit(1);
}
