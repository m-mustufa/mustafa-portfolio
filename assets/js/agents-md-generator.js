(function agentsMdGeneratorModule(root) {
  "use strict";

  // Date the agent file rules below were last checked against the official docs
  // (agents.md, Claude Code memory docs, Codex AGENTS.md docs, GitHub Copilot docs).
  const RULES_VERIFIED = "2026-11-26";
  const CLAUDE_MAX_LINES = 200; // Claude Code docs: target under 200 lines per CLAUDE.md
  const CODEX_MAX_BYTES = 32 * 1024; // Codex project_doc_max_bytes default (32 KiB)

  const PRESETS = {
    nextjs: {
      label: "Next.js app",
      overview: "Next.js App Router web app written in TypeScript.",
      install: "npm install",
      dev: "npm run dev",
      build: "npm run build",
      test: "npm test",
      lint: "npm run lint",
      style: [
        "TypeScript strict mode. Do not use `any` without a comment explaining why.",
        "Server Components by default. Add \"use client\" only when a component needs state or browser APIs.",
        "Keep secrets in server code and environment variables, never in client components.",
      ],
      testing: ["Run the build and the tests before you say a change is done."],
    },
    "vite-express": {
      label: "Vite React SPA + Express API",
      overview: "Vite React single-page app in `client/` with an Express REST API in `server/`.",
      install: "npm install",
      dev: "npm run dev",
      build: "npm run build",
      test: "npm test",
      lint: "npm run lint",
      style: [
        "Validate every request body on the server before it reaches the database.",
        "Every database query is scoped to the current tenant or workspace.",
        "Keep API response shapes stable. Add fields; do not rename or remove them.",
      ],
      testing: ["Add a test for every bug fix that reproduces the bug first."],
    },
    astro: {
      label: "Astro static site",
      overview: "Astro static site. Pages are prerendered to plain HTML at build time.",
      install: "npm install",
      dev: "npm run dev",
      build: "npm run build",
      test: "",
      lint: "",
      style: [
        "Every page keeps a unique title, meta description, canonical link and a single h1.",
        "Every image has real width and height attributes and descriptive alt text.",
        "Do not add client-side JavaScript to a page unless it needs interaction.",
      ],
      testing: ["Run the build and open the changed pages before you say a change is done."],
    },
    "node-api": {
      label: "Node.js API",
      overview: "Node.js REST API written in TypeScript.",
      install: "npm install",
      dev: "npm run dev",
      build: "npm run build",
      test: "npm test",
      lint: "npm run lint",
      style: [
        "Return errors in one consistent JSON shape with a stable error code.",
        "Never log tokens, passwords or full request bodies.",
        "Use async/await. Do not mix callbacks and promises in the same module.",
      ],
      testing: ["Integration tests hit a test database, never production."],
    },
    custom: {
      label: "Custom",
      overview: "",
      install: "",
      dev: "",
      build: "",
      test: "",
      lint: "",
      style: [],
      testing: [],
    },
  };

  const DEFAULT_SECURITY = [
    "Never commit secrets. Keys live in environment variables or a local `.env` file that is git-ignored.",
    "Do not print API keys or tokens in logs, tests or chat output.",
  ];

  function lines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^[-*]\s+/, ""))
      .filter(Boolean);
  }

  function bullets(items) {
    return items.map((item) => `- ${item}`).join("\n");
  }

  function commandBlock(commands) {
    const rows = commands.filter(([, cmd]) => String(cmd || "").trim());
    if (!rows.length) return "";
    const width = Math.max(...rows.map(([, cmd]) => cmd.trim().length));
    return [
      "```bash",
      ...rows.map(([label, cmd]) => `${cmd.trim().padEnd(width)}  # ${label}`),
      "```",
    ].join("\n");
  }

  // Builds AGENTS.md from the form values. Plain Markdown, no required fields.
  function generateAgentsMd(input) {
    const name = String(input.name || "").trim();
    const sections = [name ? `# ${name}` : "# AGENTS.md"];

    const overview = String(input.overview || "").trim();
    if (overview) sections.push(`## Project overview\n\n${overview}`);

    const commands = commandBlock([
      ["install dependencies", input.install],
      ["start the dev server", input.dev],
      ["production build", input.build],
      ["run the tests", input.test],
      ["lint", input.lint],
    ]);
    if (commands) sections.push(`## Commands\n\nRun these exactly as written.\n\n${commands}`);

    const style = lines(input.style);
    if (style.length) sections.push(`## Code style\n\n${bullets(style)}`);

    const testing = lines(input.testing);
    if (testing.length) sections.push(`## Testing\n\n${bullets(testing)}`);

    const security = lines(input.security);
    if (security.length) sections.push(`## Security\n\n${bullets(security)}`);

    const git = lines(input.git);
    if (git.length) sections.push(`## Commits and pull requests\n\n${bullets(git)}`);

    const never = lines(input.never);
    if (never.length) sections.push(`## Never do this\n\n${bullets(never)}`);

    return `${sections.join("\n\n")}\n`;
  }

  // Claude Code reads AGENTS.md only when no CLAUDE.md exists, so a CLAUDE.md
  // that imports it keeps both agents on the same instructions.
  function generateClaudeMd(input) {
    const extra = lines(input.claudeNotes);
    const parts = [
      "@AGENTS.md",
      "## Claude Code only",
      extra.length ? bullets(extra) : "<!-- Add notes that only apply to Claude Code here. Shared rules belong in AGENTS.md. -->",
    ];
    return `${parts.join("\n\n")}\n`;
  }

  const SECRET_PATTERNS = [
    { name: "OpenAI-style secret key", re: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/ },
    { name: "AWS access key ID", re: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
    { name: "Slack token", re: /\bxox[abposr]-[A-Za-z0-9-]{10,}/ },
    { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
    { name: "Stripe live key", re: /\b(?:sk|rk)_live_[0-9A-Za-z]{16,}/ },
    { name: "private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
    { name: "password or secret value", re: /\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["']?[^\s"'`<>]{8,}/i },
  ];

  const VAGUE_PATTERNS = [
    /\bclean code\b/i,
    /\bbest practices?\b/i,
    /\bbe careful\b/i,
    /\bwrite (?:good|nice|quality) code\b/i,
    /\bas needed\b/i,
    /\bwhen appropriate\b/i,
    /\bproperly\b/i,
  ];

  const COMMAND_RE = /\b(?:npm (?:run|test|install|ci)|npx |pnpm |yarn |bun (?:run|test|install)|pytest|python -m|go test|cargo (?:test|build)|make \w|dotnet (?:test|build)|mvn |gradle )/;
  const BUILD_TEST_RE = /\b(?:test|build|lint|typecheck|check)\b/i;

  // Lines inside fenced code blocks, so commands there are not reported.
  function fencedLineSet(allLines) {
    const fenced = new Set();
    let inside = false;
    allLines.forEach((line, index) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced.add(index);
        inside = !inside;
        return;
      }
      if (inside) fenced.add(index);
    });
    return fenced;
  }

  function stripInlineCode(line) {
    return line.replace(/`[^`]*`/g, "");
  }

  function byteLength(text) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text).length;
    return Buffer.byteLength(text, "utf8");
  }

  function lineList(numbers) {
    const shown = numbers.slice(0, 6).join(", ");
    return numbers.length > 6 ? `${shown} and ${numbers.length - 6} more` : shown;
  }

  // Checks an AGENTS.md or CLAUDE.md against the official guidance.
  // Each result: { level: "pass" | "warn" | "fail" | "info", title, detail }.
  function checkAgentFile(text, kind) {
    const content = String(text || "");
    const results = [];
    const file = kind === "claude" ? "CLAUDE.md" : "AGENTS.md";
    if (!content.trim()) return [{ level: "fail", title: "The file is empty", detail: `Paste your ${file} to check it.` }];

    const allLines = content.split(/\r?\n/);
    const lineCount = allLines.length;
    const bytes = byteLength(content);
    const fenced = fencedLineSet(allLines);

    // Size
    if (kind === "claude") {
      results.push(lineCount > CLAUDE_MAX_LINES
        ? { level: "warn", title: `${lineCount} lines, over the 200-line target`, detail: "Claude Code's docs suggest keeping each CLAUDE.md under 200 lines. Move rarely needed detail into separate files or .claude/rules/." }
        : { level: "pass", title: `${lineCount} lines, within the 200-line target`, detail: "Claude Code's docs suggest under 200 lines per CLAUDE.md." });
    } else if (lineCount > CLAUDE_MAX_LINES) {
      results.push({ level: "info", title: `${lineCount} lines`, detail: "Long instruction files are harder for any agent to follow. Keep the rules that matter on every task and move the rest into linked docs." });
    }
    results.push(bytes > CODEX_MAX_BYTES
      ? { level: kind === "claude" ? "info" : "fail", title: `${(bytes / 1024).toFixed(1)} KiB, over Codex's 32 KiB default`, detail: "Codex stops adding instruction files once their combined size reaches project_doc_max_bytes (32 KiB by default), so the end of this file may be cut off." }
      : { level: "pass", title: `${(bytes / 1024).toFixed(1)} KiB, under Codex's 32 KiB default`, detail: "Codex combines instruction files up to 32 KiB by default." });

    // Structure
    const headings = allLines.filter((line, index) => !fenced.has(index) && /^#{1,3}\s+\S/.test(line)).length;
    results.push(headings >= 2
      ? { level: "pass", title: `${headings} headings`, detail: "Sections make it easy for an agent to find the right rule." }
      : { level: "warn", title: "Few or no headings", detail: "Group rules under headings such as Commands, Code style, Testing and Security." });

    // Secrets
    const secretHits = [];
    allLines.forEach((line, index) => {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.re.test(line)) {
          secretHits.push(`${pattern.name} on line ${index + 1}`);
          break;
        }
      }
    });
    results.push(secretHits.length
      ? { level: "fail", title: "Possible secret in the file", detail: `Found: ${secretHits.slice(0, 4).join("; ")}. Instruction files are committed and read by every agent. Move the value to an environment variable and rotate it if it was ever pushed.` }
      : { level: "pass", title: "No obvious secrets found", detail: "Checked for common API key, token and private key patterns." });

    // Commands
    const hasCodeBlock = fenced.size > 0;
    const hasBuildOrTest = allLines.some((line, index) => (fenced.has(index) || /`[^`]+`/.test(line)) && BUILD_TEST_RE.test(line));
    results.push(hasBuildOrTest
      ? { level: "pass", title: "Build or test commands found", detail: "Agents can verify their own changes." }
      : { level: "warn", title: "No build or test command found", detail: "Add the exact commands to build, test and lint in a code block so the agent can check its own work." });
    const looseCommands = [];
    allLines.forEach((line, index) => {
      if (fenced.has(index)) return;
      if (COMMAND_RE.test(stripInlineCode(line))) looseCommands.push(index + 1);
    });
    if (looseCommands.length) {
      results.push({ level: "warn", title: "Commands written as plain text", detail: `Line ${lineList(looseCommands)}. Put commands in backticks or a code block so they are copied exactly instead of paraphrased.` });
    } else if (hasCodeBlock) {
      results.push({ level: "pass", title: "Commands are in code", detail: "Commands are in code blocks or inline code." });
    }

    // Vague rules
    const vague = [];
    allLines.forEach((line, index) => {
      if (fenced.has(index)) return;
      if (VAGUE_PATTERNS.some((re) => re.test(line))) vague.push(index + 1);
    });
    if (vague.length) {
      results.push({ level: "info", title: "Vague rules", detail: `Line ${lineList(vague)}. Rules like "write clean code" or "follow best practices" give an agent nothing to check. Replace them with a specific, testable rule.` });
    }

    // Agent-specific behaviour
    const importLines = [];
    allLines.forEach((line, index) => {
      if (!fenced.has(index) && /^\s*@[\w./~-]+\s*$/.test(line)) importLines.push(index + 1);
    });
    if (kind === "claude") {
      const importsAgents = allLines.some((line, index) => !fenced.has(index) && /^\s*@(?:\.\/)?AGENTS\.md\s*$/.test(line));
      results.push(importsAgents
        ? { level: "pass", title: "Imports @AGENTS.md", detail: "Claude Code loads your shared AGENTS.md rules through this import." }
        : { level: "info", title: "No @AGENTS.md import", detail: "If the repo also has an AGENTS.md, Claude Code will not read it while a CLAUDE.md exists. Add a line with @AGENTS.md at the top to share one set of rules." });
    } else if (importLines.length) {
      results.push({ level: "warn", title: "@file import lines", detail: `Line ${lineList(importLines)}. @path imports are a Claude Code feature for CLAUDE.md. Other agents that read AGENTS.md may treat the line as plain text, so link or inline the content instead.` });
    }

    if (lineCount < 8) {
      results.push({ level: "info", title: "Very short file", detail: "A few lines is fine for a small repo, but most projects need at least the commands, code style and testing rules." });
    }
    return results;
  }

  function summarize(results) {
    return results.reduce((acc, item) => {
      acc[item.level] = (acc[item.level] || 0) + 1;
      return acc;
    }, { pass: 0, warn: 0, fail: 0, info: 0 });
  }

  const api = { PRESETS, DEFAULT_SECURITY, RULES_VERIFIED, CLAUDE_MAX_LINES, CODEX_MAX_BYTES, generateAgentsMd, generateClaudeMd, checkAgentFile, summarize };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.AgentsMdGenerator = api;
  if (typeof document === "undefined") return;

  // --- Page wiring -----------------------------------------------------------
  const form = document.querySelector("[data-agents-form]");
  const agentsOut = document.querySelector("[data-agents-output]");
  const claudeOut = document.querySelector("[data-claude-output]");
  const claudeWrap = document.querySelector("[data-claude-wrap]");
  const checkForm = document.querySelector("[data-check-form]");
  const checkResults = document.querySelector("[data-check-results]");
  const checkSummary = document.querySelector("[data-check-summary]");

  function fillPreset(key) {
    const preset = PRESETS[key];
    if (!preset || !form) return;
    form.elements.overview.value = preset.overview;
    ["install", "dev", "build", "test", "lint"].forEach((field) => { form.elements[field].value = preset[field]; });
    form.elements.style.value = preset.style.join("\n");
    form.elements.testing.value = preset.testing.join("\n");
  }

  function readForm() {
    const data = {};
    ["name", "overview", "install", "dev", "build", "test", "lint", "style", "testing", "security", "git", "never", "claudeNotes"]
      .forEach((field) => { data[field] = form.elements[field] ? form.elements[field].value : ""; });
    return data;
  }

  function render() {
    if (!form) return;
    const data = readForm();
    agentsOut.value = generateAgentsMd(data);
    const withClaude = form.elements.withClaude.checked;
    claudeWrap.hidden = !withClaude;
    claudeOut.value = withClaude ? generateClaudeMd(data) : "";
  }

  function download(name, text) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copy(text, button) {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    } catch (_error) {
      button.textContent = "Select and copy";
    }
    setTimeout(() => { button.textContent = original; }, 1600);
  }

  if (form) {
    form.elements.security.value = DEFAULT_SECURITY.join("\n");
    fillPreset(form.elements.preset.value);
    render();
    form.elements.preset.addEventListener("change", () => { fillPreset(form.elements.preset.value); render(); });
    form.addEventListener("input", render);
    form.addEventListener("submit", (event) => { event.preventDefault(); render(); });
    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", () => copy(button.dataset.copy === "claude" ? claudeOut.value : agentsOut.value, button));
    });
    document.querySelectorAll("[data-download]").forEach((button) => {
      button.addEventListener("click", () => {
        const isClaude = button.dataset.download === "claude";
        download(isClaude ? "CLAUDE.md" : "AGENTS.md", isClaude ? claudeOut.value : agentsOut.value);
      });
    });
    const sendToCheck = document.querySelector("[data-send-to-check]");
    if (sendToCheck && checkForm) {
      sendToCheck.addEventListener("click", () => {
        checkForm.elements.kind.value = "agents";
        checkForm.elements.file.value = agentsOut.value;
        runCheck();
        checkForm.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function runCheck() {
    const results = checkAgentFile(checkForm.elements.file.value, checkForm.elements.kind.value);
    const counts = summarize(results);
    checkSummary.textContent = `${counts.fail} to fix, ${counts.warn} to improve, ${counts.info} notes, ${counts.pass} passed`;
    checkSummary.className = `agm-summary ${counts.fail ? "is-fail" : counts.warn ? "is-warn" : "is-pass"}`;
    checkResults.replaceChildren(...results.map((item) => {
      const li = document.createElement("li");
      li.className = `agm-result is-${item.level}`;
      const label = document.createElement("span");
      label.className = "agm-badge";
      label.textContent = { pass: "Pass", warn: "Improve", fail: "Fix", info: "Note" }[item.level];
      const body = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.title;
      const detail = document.createElement("p");
      detail.textContent = item.detail;
      body.append(title, detail);
      li.append(label, body);
      return li;
    }));
  }

  if (checkForm) {
    checkForm.addEventListener("submit", (event) => { event.preventDefault(); runCheck(); });
  }
})(typeof window !== "undefined" ? window : globalThis);
