#!/usr/bin/env node
// Tests for the AGENTS.md generator and checker (assets/js/agents-md-generator.js).
const assert = require("assert");
const { PRESETS, DEFAULT_SECURITY, generateAgentsMd, generateClaudeMd, checkAgentFile, summarize } = require("../assets/js/agents-md-generator.js");

function levels(results) {
  return Object.fromEntries(results.map((r) => [r.title, r.level]));
}
function find(results, startsWith) {
  return results.find((r) => r.title.startsWith(startsWith));
}

// Generator: a preset produces every section, commands in one code block.
const preset = PRESETS.nextjs;
const agents = generateAgentsMd({
  name: "Acme App",
  overview: preset.overview,
  install: preset.install, dev: preset.dev, build: preset.build, test: preset.test, lint: preset.lint,
  style: preset.style.join("\n"),
  testing: preset.testing.join("\n"),
  security: DEFAULT_SECURITY.join("\n"),
  git: "- Use Conventional Commits",
  never: "Push to main",
});
assert.ok(agents.startsWith("# Acme App\n"), "title");
for (const heading of ["## Project overview", "## Commands", "## Code style", "## Testing", "## Security", "## Commits and pull requests", "## Never do this"]) {
  assert.ok(agents.includes(heading), `missing ${heading}`);
}
assert.ok(/```bash\nnpm install\s+# install dependencies\n/.test(agents), "commands in a bash block");
assert.ok(agents.includes("- Use Conventional Commits\n"), "leading dash is not doubled");
assert.ok(!agents.includes("—"), "no em dash in output");

// Empty input still gives a valid file, and empty sections are left out.
const empty = generateAgentsMd({});
assert.strictEqual(empty, "# AGENTS.md\n");

// CLAUDE.md imports AGENTS.md on the first line.
const claude = generateClaudeMd({ claudeNotes: "Use plan mode for big changes" });
assert.ok(claude.startsWith("@AGENTS.md\n"));
assert.ok(claude.includes("- Use plan mode for big changes"));

// The generated file passes the checker with no fixes or warnings.
const generatedCheck = checkAgentFile(agents, "agents");
const counts = summarize(generatedCheck);
assert.strictEqual(counts.fail, 0, JSON.stringify(generatedCheck, null, 1));
assert.strictEqual(counts.warn, 0, JSON.stringify(generatedCheck, null, 1));
assert.strictEqual(summarize(checkAgentFile(claude, "claude")).fail, 0);

// Checker: empty file.
assert.strictEqual(checkAgentFile("  ", "agents")[0].level, "fail");

// Secrets are caught.
const leaked = "# Rules\n## Setup\nOPENAI key: sk-proj-abcdefghijklmnopqrstuvwxyz123456\n";
assert.strictEqual(find(checkAgentFile(leaked, "agents"), "Possible secret").level, "fail");
assert.strictEqual(find(checkAgentFile("# A\n## B\npassword = hunter2hunter2\n", "agents"), "Possible secret").level, "fail");

// Loose commands are flagged, commands in code are not.
const loose = "# A\n## Commands\nRun npm run build before committing.\n";
assert.strictEqual(find(checkAgentFile(loose, "agents"), "Commands written").level, "warn");
assert.ok(find(checkAgentFile(loose, "agents"), "Commands written").detail.startsWith("Line 3."));
const inline = "# A\n## Commands\nRun `npm run build` before committing.\n";
assert.strictEqual(find(checkAgentFile(inline, "agents"), "Commands written"), undefined);
assert.strictEqual(find(checkAgentFile(inline, "agents"), "Build or test").level, "pass");

// Missing build/test command.
assert.strictEqual(find(checkAgentFile("# A\n## Style\n- Use tabs\n", "agents"), "No build or test").level, "warn");

// Vague rules.
assert.strictEqual(find(checkAgentFile("# A\n## Style\n- Write clean code\n", "agents"), "Vague rules").level, "info");

// Size limits.
const longClaude = "# A\n## B\n" + "- rule\n".repeat(250);
assert.strictEqual(find(checkAgentFile(longClaude, "claude"), "253 lines").level, "warn");
const huge = "# A\n## B\n" + "x".repeat(33 * 1024);
assert.strictEqual(find(checkAgentFile(huge, "agents"), "33.0 KiB").level, "fail");

// CLAUDE.md without @AGENTS.md gets a note; AGENTS.md with @imports gets a warning.
assert.strictEqual(find(checkAgentFile("# A\n## B\n- x\n", "claude"), "No @AGENTS.md").level, "info");
assert.strictEqual(find(checkAgentFile("# A\n## B\n@docs/rules.md\n", "agents"), "@file import").level, "warn");
// An @ line inside a code block is not an import.
assert.strictEqual(find(checkAgentFile("# A\n## B\n```\n@docs/rules.md\n```\n", "agents"), "@file import"), undefined);

console.log("AGENTS.md generator tests passed.");
