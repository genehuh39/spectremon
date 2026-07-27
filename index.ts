#!/usr/bin/env bun

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";

import discoveryAgent from "./agents/discovery.md" with { type: "text" };
import implementerAgent from "./agents/implementer.md" with { type: "text" };
import architectAgent from "./agents/architect.md" with { type: "text" };
import orchestratorSkill from "./skills/start/SKILL.md" with { type: "text" };
import executeTaskWorkflow from "./workflows/execute-task.js" with { type: "text" };
import pkg from "./package.json";

const targetDir = process.cwd();
const CLAUDE_MD_VERSION = `v${pkg.version}`;
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

const FRONTMATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;

function extractFrontmatter(content: string): string {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    throw new Error("Bundled definition is missing required YAML frontmatter.");
  }
  return match[0];
}

function stripFrontmatter(content: string): string {
  return content.slice(extractFrontmatter(content).length);
}

function migrateOrchestratorDelegation(content: string): string {
  return content
    .replaceAll(
      "Invoke the **Discovery** subagent (`.claude/agents/discovery.md`)",
      "Delegate to the **spectremon-discovery** subagent"
    )
    .replaceAll(
      "Invoke the **Implementer** subagent (`.claude/agents/implementer.md`)",
      "Delegate to the **spectremon-implementer** subagent"
    )
    .replaceAll(
      "invoke the **Architect** subagent (`.claude/agents/architect.md`)",
      "delegate to a fresh **spectremon-architect** subagent context"
    )
    .replaceAll(
      "invoke the **Senior Software Architect** subagent (`.claude/agents/architect.md`)",
      "delegate to a fresh **spectremon-architect** subagent context"
    );
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
  if (filePath.startsWith(".claude/agents/") && !/^---\r?\n/.test(existingContent)) {
    safeWriteFile(filePath, `${extractFrontmatter(content)}\n${existingContent}`);
    console.log(`✅ Registered existing agent: ${filePath} (prompt content preserved)`);
    return;
  }

  if (filePath === ".claude/spectremon.md") {
    const migratedContent = migrateOrchestratorDelegation(existingContent);
    if (migratedContent !== existingContent) {
      safeWriteFile(filePath, migratedContent);
      console.log(`✅ Updated legacy subagent delegation in ${filePath} (other content preserved)`);
      return;
    }
  }

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

// --- 2. FILE CONTENTS (sourced from the plugin files at build time) ---
const files: Record<string, string> = {
  ".claude/spectremon.md": stripFrontmatter(orchestratorSkill).trim(),
  ".claude/agents/discovery.md": discoveryAgent,
  ".claude/agents/implementer.md": implementerAgent,
  ".claude/agents/architect.md": architectAgent,
  ".claude/workflows/execute-task.js": executeTaskWorkflow
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
