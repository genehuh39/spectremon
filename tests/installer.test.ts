import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");
const installerPath = join(projectRoot, "index.js");
const agentPaths = [
  ".claude/agents/discovery.md",
  ".claude/agents/implementer.md",
  ".claude/agents/architect.md"
];
const pluginAgentPaths = [
  "agents/discovery.md",
  "agents/implementer.md",
  "agents/architect.md"
];
const expectedAgentNames = [
  "spectremon-discovery",
  "spectremon-implementer",
  "spectremon-architect"
];
const temporaryDirectories: string[] = [];

type AgentDefinition = {
  name: string;
  description: string;
  model: string;
  color: string;
  tools: string;
  prompt: string;
};

function readAgentDefinition(filePath: string): AgentDefinition {
  const content = readFileSync(filePath, "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]+)$/);

  if (!match) {
    throw new Error(`${filePath} does not contain valid frontmatter boundaries`);
  }

  const [, frontmatter, prompt] = match;
  const scalar = (key: string): string => {
    const value = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1];
    if (!value) throw new Error(`${filePath} is missing ${key}`);
    return value.trim();
  };
  const description = frontmatter.match(/^description:\s*\|\n([\s\S]*?)(?=^[a-z]+:)/m)?.[1]?.trim();

  if (!description) {
    throw new Error(`${filePath} is missing a block description`);
  }

  return {
    name: scalar("name"),
    description,
    model: scalar("model"),
    color: scalar("color"),
    tools: scalar("tools"),
    prompt
  };
}

function expectValidAgents(root: string, paths: string[] = agentPaths): void {
  const definitions = paths.map(path => readAgentDefinition(join(root, path)));

  expect(definitions.map(definition => definition.name)).toEqual(expectedAgentNames);
  expect(new Set(definitions.map(definition => definition.name)).size).toBe(definitions.length);

  for (const definition of definitions) {
    expect(definition.name).toMatch(/^[a-z][a-z0-9-]{2,49}$/);
    expect(definition.description).toContain("<example>");
    expect(definition.description).toContain("</example>");
    expect(definition.model).toBe("inherit");
    expect(["blue", "green", "red"]).toContain(definition.color);
    expect(definition.tools).toMatch(/^\[".+"]/);
    expect(definition.prompt.trim().length).toBeGreaterThan(20);
  }
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe("Claude Code plugin", () => {
  test("bundled agent definitions are valid and explicitly referenced by the skill", () => {
    expectValidAgents(projectRoot, pluginAgentPaths);

    const skill = readFileSync(join(projectRoot, "skills/start/SKILL.md"), "utf8");
    const skillFrontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
    if (!skillFrontmatter) throw new Error("SKILL.md is missing frontmatter");
    expect(skillFrontmatter).toMatch(/^name: start$/m);
    expect(skillFrontmatter).toMatch(/^description:/m);
    for (const agentName of expectedAgentNames) {
      expect(skill).toContain(agentName);
    }
    expect(skill).toContain("fresh **spectremon-architect** subagent context");
  });

  test("plugin and marketplace manifests are valid", () => {
    const manifest = JSON.parse(readFileSync(join(projectRoot, ".claude-plugin/plugin.json"), "utf8"));
    const pkg = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
    expect(manifest.name).toBe("spectremon");
    expect(manifest.description.length).toBeGreaterThan(10);
    expect(manifest.version).toBe(pkg.version);

    const marketplace = JSON.parse(readFileSync(join(projectRoot, ".claude-plugin/marketplace.json"), "utf8"));
    expect(marketplace.name).toBe("spectremon");
    expect(marketplace.plugins).toEqual([
      expect.objectContaining({ name: "spectremon", source: "./" })
    ]);
  });

  test("fresh installation produces valid registered subagents", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "spectremon-test-"));
    temporaryDirectories.push(targetDir);

    const result = Bun.spawnSync({
      cmd: [process.execPath, installerPath],
      cwd: targetDir,
      stdout: "pipe",
      stderr: "pipe"
    });

    expect(result.exitCode).toBe(0);
    expectValidAgents(targetDir);

    const orchestrator = readFileSync(join(targetDir, ".claude/spectremon.md"), "utf8");
    for (const agentName of expectedAgentNames) {
      expect(orchestrator).toContain(agentName);
    }
  });

  test("upgrade registers existing agents without replacing their prompt bodies", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "spectremon-test-"));
    temporaryDirectories.push(targetDir);
    const customPrompt = "# CUSTOM PROMPT\nKeep this locally modified agent body.\n";

    for (const agentPath of agentPaths) {
      const fullPath = join(targetDir, agentPath);
      mkdirSync(join(fullPath, ".."), { recursive: true });
      writeFileSync(fullPath, customPrompt);
    }

    const result = Bun.spawnSync({
      cmd: [process.execPath, installerPath],
      cwd: targetDir,
      stdout: "pipe",
      stderr: "pipe"
    });

    expect(result.exitCode).toBe(0);
    expectValidAgents(targetDir);
    for (const agentPath of agentPaths) {
      expect(readFileSync(join(targetDir, agentPath), "utf8")).toEndWith(customPrompt);
    }
  });

  test("upgrade recognizes existing CRLF agent frontmatter", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "spectremon-test-"));
    temporaryDirectories.push(targetDir);
    const agentPath = join(targetDir, agentPaths[0]);
    const crlfAgent = "---\r\nname: custom-agent\r\ndescription: custom\r\n---\r\n\r\n# CUSTOM PROMPT\r\n";
    mkdirSync(join(agentPath, ".."), { recursive: true });
    writeFileSync(agentPath, crlfAgent);

    const result = Bun.spawnSync({
      cmd: [process.execPath, installerPath],
      cwd: targetDir,
      stdout: "pipe",
      stderr: "pipe"
    });

    expect(result.exitCode).toBe(0);
    expect(readFileSync(agentPath, "utf8")).toBe(crlfAgent);
  });

  test("upgrade migrates legacy orchestrator delegation without replacing other content", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "spectremon-test-"));
    temporaryDirectories.push(targetDir);
    const orchestratorPath = join(targetDir, ".claude/spectremon.md");
    const customContent = `# CUSTOM ORCHESTRATOR
Invoke the **Discovery** subagent (\`.claude/agents/discovery.md\`)
Invoke the **Discovery** subagent (\`.claude/agents/discovery.md\`)
Invoke the **Implementer** subagent (\`.claude/agents/implementer.md\`)
Then invoke the **Architect** subagent (\`.claude/agents/architect.md\`).
LOCAL CONTENT MUST REMAIN
`;
    mkdirSync(join(targetDir, ".claude"), { recursive: true });
    writeFileSync(orchestratorPath, customContent);

    const result = Bun.spawnSync({
      cmd: [process.execPath, installerPath],
      cwd: targetDir,
      stdout: "pipe",
      stderr: "pipe"
    });

    expect(result.exitCode).toBe(0);
    const migrated = readFileSync(orchestratorPath, "utf8");
    for (const agentName of expectedAgentNames) {
      expect(migrated).toContain(agentName);
    }
    expect(migrated.match(/spectremon-discovery/g)).toHaveLength(2);
    expect(migrated).toContain("LOCAL CONTENT MUST REMAIN");
    expect(migrated).not.toContain(".claude/agents/");
  });

  test("re-running the installer is idempotent", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "spectremon-test-"));
    temporaryDirectories.push(targetDir);
    const runInstaller = () =>
      Bun.spawnSync({
        cmd: [process.execPath, installerPath],
        cwd: targetDir,
        stdout: "pipe",
        stderr: "pipe"
      });

    expect(runInstaller().exitCode).toBe(0);
    const firstContents = agentPaths.map(path => readFileSync(join(targetDir, path), "utf8"));
    expect(runInstaller().exitCode).toBe(0);
    const secondContents = agentPaths.map(path => readFileSync(join(targetDir, path), "utf8"));

    expect(secondContents).toEqual(firstContents);
  });
});
