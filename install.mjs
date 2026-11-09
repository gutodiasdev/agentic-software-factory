#!/usr/bin/env node
// Agentic Software Factory — installer.
// Zero dependencies (Node >= 18, ESM). Installs the factory into a target project,
// rendering the role agents into the chosen profile's format.
//
// Usage:
//   node install.mjs --profile <kiro|claude|both> [--target <dir>] [--force]
//   node install.mjs                 # interactive (prompts for the profile)
//
//   kiro   → agents to .kiro/agents/, skills to .kiro/skills/, writes AGENTS.md
//   claude → subagents to .claude/agents/, skills to .claude/skills/, slash command,
//            writes CLAUDE.md
//
// Always installs the engine to <target>/.specs/_factory/ and the store readme to
// <target>/.specs/README.md.

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const REPO = path.dirname(fileURLToPath(import.meta.url));

/* --------------------------------- cli ---------------------------------- */
function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") flags.force = true;
    else if (a === "--help" || a === "-h") flags.help = true;
    else if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) flags[key] = true;
      else { flags[key] = next; i++; }
    }
  }
  return flags;
}
const flags = parseArgs(process.argv.slice(2));

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[38;5;42m", pink: "\x1b[38;5;213m", red: "\x1b[38;5;203m", cyan: "\x1b[38;5;45m",
};
const say = (s) => process.stdout.write(s + "\n");
const ok = (s) => say(`  ${C.green}✔${C.reset} ${s}`);
const info = (s) => say(`  ${C.dim}·${C.reset} ${s}`);
const fail = (s) => { process.stderr.write(`${C.red}install error:${C.reset} ${s}\n`); process.exit(1); };

function help() {
  say(`${C.bold}Agentic Software Factory — installer${C.reset}

  node install.mjs --profile <kiro|claude|both> [--target <dir>] [--force]

  ${C.bold}Options${C.reset}
    --profile   kiro | claude | both   which agent format to install
    --target    directory to install into (default: current directory)
    --force     overwrite an existing root AGENTS.md / CLAUDE.md without backing up
    --help      show this help

  ${C.bold}What gets installed${C.reset}
    <target>/.specs/_factory/           the engine (CLI, config, skill map, templates)
    <target>/.specs/README.md           the traceability-store readme
    kiro   → .kiro/agents/, .kiro/skills/, AGENTS.md
    claude → .claude/agents/, .claude/skills/, .claude/commands/, CLAUDE.md
`);
}

/* ------------------------------ fs helpers ------------------------------ */
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
}
function writeFile(p, body) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
}
function backupIfPresent(p) {
  if (fs.existsSync(p) && !flags.force) {
    const bak = p + ".pre-factory.bak";
    fs.copyFileSync(p, bak);
    info(`backed up existing ${path.basename(p)} → ${path.basename(bak)}`);
  }
}

/* ------------------------- profile tool mapping ------------------------- */
// Neutral capability → Claude Code tool names.
const CLAUDE_TOOLS = {
  read: ["Read", "Grep", "Glob"],
  write: ["Write", "Edit"],
  shell: ["Bash"],
  web: ["WebFetch", "WebSearch"],
  subagent: ["Task"],
};
function claudeToolList(neutral) {
  const out = [];
  for (const cap of neutral) for (const t of CLAUDE_TOOLS[cap] || []) if (!out.includes(t)) out.push(t);
  return out.join(", ");
}

/* --------------------- Kiro permission profiles ------------------------- */
function kiroPermissions(perms, dispatchList) {
  const deny = (match) => `    - capability: shell\n      match: ${JSON.stringify(match)}\n      effect: deny`;
  const allowShell = (match) => `    - capability: shell\n      match: ${JSON.stringify(match)}\n      effect: allow`;
  const allowSpecs = `    - capability: fs_write\n      match: [".specs/**"]\n      effect: allow`;
  const denyAll = `    - capability: fs_write\n      match: ["**"]\n      effect: deny`;
  const runners = ["node*", "npm*", "npx*", "pnpm*", "yarn*", "tsc*", "vitest*", "jest*", "pytest*", "go*", "cargo*", "make*"];

  let rules;
  if (perms === "builder") {
    rules = [
      allowShell([...runners, "git status", "git diff*", "git log*", "git add*", "ls*"]),
      `    - capability: fs_write\n      match: ["**"]\n      effect: allow`,
      `    - capability: fs_write\n      match: [".git/**"]\n      effect: deny`,
      deny(["rm -rf*", "git push*", "git reset --hard*", "git clean*"]),
    ];
  } else if (perms === "reviewer-run") {
    rules = [
      allowShell([...runners, "git status", "git diff*", "git log*", "ls*", "cat .specs/*"]),
      allowSpecs, denyAll,
      deny(["rm -rf*", "git push*", "git add*", "git reset*", "git clean*"]),
    ];
  } else if (perms === "orchestrator") {
    rules = [
      allowShell(["node .specs/_factory/scripts/factory.mjs*", "git status", "git diff*", "git log*", "ls*", "cat .specs/*"]),
      `    - capability: subagent\n      match: ${JSON.stringify(dispatchList)}\n      effect: allow`,
      allowSpecs,
      deny(["rm -rf*", "git push*", "git reset --hard*"]),
    ];
  } else { // readonly-specs
    rules = [
      allowShell(["node .specs/_factory/scripts/factory.mjs*", "ls*", "cat .specs/*", "cat docs/*", "git status", "git diff*", "git log*"]),
      allowSpecs, denyAll,
      deny(["rm -rf*", "git push*", "git reset --hard*", "git clean*"]),
    ];
  }
  return "permissions:\n  rules:\n" + rules.join("\n");
}

/* --------------------------- agent rendering ---------------------------- */
function loadManifest() {
  const m = JSON.parse(fs.readFileSync(path.join(REPO, "agents", "agents.json"), "utf8"));
  return m.agents;
}
function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(REPO, "factory", "factory.config.json"), "utf8"));
}
function defaultSkillFor(agent, cfg) {
  if (!agent.skillStage) return "factory-conventions";
  const stage = cfg.stages.find((s) => s.id === agent.skillStage);
  return (stage && stage.skill) || "factory-conventions";
}
function readBody(agent) {
  return fs.readFileSync(path.join(REPO, "agents", "bodies", agent.body), "utf8").trimEnd();
}

function renderKiro(agent, cfg, dispatchList) {
  const skill = defaultSkillFor(agent, cfg);
  const tools = agent.tools.map((t) => `  - ${t}`).join("\n");
  const resources = [
    "  - file://.specs/README.md",
    "  - file://.specs/_factory/factory.config.json",
    `  - skill://.kiro/skills/${skill}/SKILL.md`,
  ];
  if (skill !== "factory-conventions") resources.push("  - skill://.kiro/skills/factory-conventions/SKILL.md");
  const fm = [
    "---",
    `name: ${agent.name}`,
    `description: ${JSON.stringify(agent.description)}`,
    "tools:",
    tools,
    "resources:",
    resources.join("\n"),
    kiroPermissions(agent.perms, dispatchList),
    ...(agent.welcomeMessage ? [`welcomeMessage: ${JSON.stringify(agent.welcomeMessage)}`] : []),
    "---",
    "",
  ].join("\n");
  return fm + readBody(agent) + "\n";
}

function renderClaude(agent) {
  const fm = [
    "---",
    `name: ${agent.name}`,
    `description: ${JSON.stringify(agent.description)}`,
    `tools: ${claudeToolList(agent.tools)}`,
    "---",
    "",
  ].join("\n");
  return fm + readBody(agent) + "\n";
}

/* ------------------------------ installer ------------------------------- */
function installEngine(target) {
  const dstFactory = path.join(target, ".specs", "_factory");
  copyDir(path.join(REPO, "factory"), dstFactory);
  // The store readme ships as specs-README.md; move it to .specs/README.md.
  const shipped = path.join(dstFactory, "specs-README.md");
  if (fs.existsSync(shipped)) {
    writeFile(path.join(target, ".specs", "README.md"), fs.readFileSync(shipped, "utf8"));
    fs.rmSync(shipped);
  }
  ok("engine → .specs/_factory/ (CLI, config, factory.skills.json, templates)");
  ok("store readme → .specs/README.md");
}

function installSkills(target, skillsDir) {
  const src = path.join(REPO, "skills");
  const dst = path.join(target, skillsDir);
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    copyDir(path.join(src, name), path.join(dst, name));
  }
  ok(`skills → ${skillsDir}/ (${fs.readdirSync(src).length} skills)`);
}

function installProfile(target, profile) {
  const cfg = loadConfig();
  const agents = loadManifest();
  const dispatchList = [
    ...cfg.stages.map((s) => s.agent),
    cfg.scribe,
  ];

  if (profile === "kiro") {
    installSkills(target, ".kiro/skills");
    const dir = path.join(target, ".kiro", "agents");
    fs.mkdirSync(dir, { recursive: true });
    for (const a of agents) writeFile(path.join(dir, `${a.name}.md`), renderKiro(a, cfg, dispatchList));
    ok(`agents → .kiro/agents/ (${agents.length}, Kiro format)`);
    const root = path.join(target, "AGENTS.md");
    backupIfPresent(root);
    writeFile(root, fs.readFileSync(path.join(REPO, "profiles", "kiro", "AGENTS.md"), "utf8"));
    ok("root doc → AGENTS.md");
  } else if (profile === "claude") {
    installSkills(target, ".claude/skills");
    const dir = path.join(target, ".claude", "agents");
    fs.mkdirSync(dir, { recursive: true });
    for (const a of agents) writeFile(path.join(dir, `${a.name}.md`), renderClaude(a));
    ok(`subagents → .claude/agents/ (${agents.length}, Claude format)`);
    copyDir(path.join(REPO, "profiles", "claude", "commands"), path.join(target, ".claude", "commands"));
    ok("slash command → .claude/commands/factory.md");
    const root = path.join(target, "CLAUDE.md");
    backupIfPresent(root);
    writeFile(root, fs.readFileSync(path.join(REPO, "profiles", "claude", "CLAUDE.md"), "utf8"));
    ok("root doc → CLAUDE.md");
  }
}

async function promptProfile() {
  if (!process.stdin.isTTY) {
    fail("no --profile given and not an interactive terminal. Use --profile <kiro|claude|both>.");
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) =>
    rl.question(`${C.bold}Which agent profile?${C.reset} ${C.dim}[1] Kiro  [2] Claude  [3] both:${C.reset} `, res)
  );
  rl.close();
  const a = answer.trim().toLowerCase();
  if (a === "1" || a === "kiro") return "kiro";
  if (a === "2" || a === "claude") return "claude";
  if (a === "3" || a === "both") return "both";
  fail(`unrecognized choice '${answer}'.`);
}

/* -------------------------------- main ---------------------------------- */
async function main() {
  if (flags.help) return help();

  let profile = flags.profile;
  if (!profile) profile = await promptProfile();
  profile = String(profile).toLowerCase();
  if (!["kiro", "claude", "both"].includes(profile)) {
    fail(`--profile must be kiro, claude, or both (got '${profile}').`);
  }

  const target = path.resolve(flags.target ? String(flags.target) : process.cwd());
  if (path.resolve(target) === REPO) {
    fail("refusing to install into the factory repo itself. Pass --target <your-project>.");
  }
  if (!fs.existsSync(target)) fail(`target directory does not exist: ${target}`);

  say("");
  say(`${C.pink}${C.bold}Installing the Agentic Software Factory${C.reset}`);
  info(`profile: ${C.bold}${profile}${C.reset}`);
  info(`target:  ${target}`);
  say("");

  installEngine(target);
  const profiles = profile === "both" ? ["kiro", "claude"] : [profile];
  for (const p of profiles) {
    say("");
    say(`  ${C.cyan}${C.bold}${p}${C.reset}`);
    installProfile(target, p);
  }

  say("");
  say(`${C.green}${C.bold}Done.${C.reset} Next steps:`);
  info("see the board:   node .specs/_factory/scripts/factory.mjs board");
  info("list phases:     node .specs/_factory/scripts/factory.mjs stages");
  info("pick skills:     edit .specs/_factory/factory.skills.json  (then: factory.mjs skills)");
  if (profiles.includes("claude")) info("run a demand:    /factory <demand description>   (Claude Code)");
  if (profiles.includes("kiro")) info("run a demand:    use the factory-orchestrator agent   (Kiro)");
  say("");
}

main().catch((e) => fail(e?.message || String(e)));
