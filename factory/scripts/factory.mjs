#!/usr/bin/env node
// Agentic Software Factory — engine & board renderer.
// Zero dependencies (Node >= 18, ESM). Portable: copy .specs/_factory into any project.
//
// Usage:
//   node factory.mjs new "<title>" [--slug <slug>] [--ref <ID>]
//   node factory.mjs set <DMD-id> <stageId> <pending|active|done|failed|skipped> [--verdict pass|fail] [--note "..."]
//   node factory.mjs loopback <DMD-id> <fromStageId> [--note "reason"]
//   node factory.mjs log <DMD-id> <stageId> "<message>" [--agent <name>]
//   node factory.mjs board [DMD-id]        # one demand (vertical) or all (overview)
//   node factory.mjs list                   # table of all demands
//   node factory.mjs show <DMD-id>          # machine-readable JSON of the state
//   node factory.mjs stages                 # print the configured pipeline + resolved skills
//   node factory.mjs skills                 # print the resolved skill for every phase
//   node factory.mjs skill <stageId>        # print ONLY the resolved skill name for one phase
//
// Exit codes: 0 ok, 1 usage/notfound error.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FACTORY_DIR = path.resolve(__dirname, "..");          // .specs/_factory
const SPECS_ROOT = path.resolve(FACTORY_DIR, "..");         // .specs
const CONFIG_PATH = path.join(FACTORY_DIR, "factory.config.json");
const SKILLS_PATH = path.join(FACTORY_DIR, "factory.skills.json");
const TEMPLATES_DIR = path.join(FACTORY_DIR, "templates");
const REGISTRY_PATH = path.join(SPECS_ROOT, "_registry.md");

const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const STAGES = [...cfg.stages].sort((a, b) => a.order - b.order);
const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));
const ST = cfg.statuses;
const TH = cfg.theme;
const NO_COLOR = process.env.NO_COLOR != null || process.env.FACTORY_NO_COLOR != null;

// Per-phase skill overrides (factory.skills.json). A non-empty value wins over the
// stage's `skill` default in factory.config.json. Missing file = no overrides.
const SKILL_OVERRIDES = (() => {
  try {
    return JSON.parse(fs.readFileSync(SKILLS_PATH, "utf8"));
  } catch {
    return {};
  }
})();
function resolveSkill(stageId) {
  const override = SKILL_OVERRIDES[stageId];
  if (typeof override === "string" && override.trim()) return override.trim();
  return STAGE_BY_ID[stageId]?.skill || cfg.scribe || "";
}
function skillSource(stageId) {
  const override = SKILL_OVERRIDES[stageId];
  return typeof override === "string" && override.trim() ? "override" : "default";
}

/* ----------------------------- ANSI helpers ----------------------------- */
const esc = (code) => (NO_COLOR ? "" : `\x1b[${code}m`);
const fg = (n) => esc(`38;5;${n}`);
const RESET = esc("0");
const BOLD = esc("1");
const DIM = esc("2");
const color = (n, s) => `${fg(n)}${s}${RESET}`;
const bold = (s) => `${BOLD}${s}${RESET}`;
const dim = (s) => `${DIM}${s}${RESET}`;

// Visible width: ignore ANSI, count most emoji as width 2.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
function vlen(s) {
  const clean = s.replace(/\x1b\[[0-9;]*m/g, "");
  let w = 0;
  for (const ch of clean) {
    if (ch === "\uFE0F" || ch === "\u200D") continue; // variation selector / ZWJ
    w += EMOJI.test(ch) ? 2 : 1;
  }
  return w;
}
function pad(s, width) {
  const diff = width - vlen(s);
  return diff > 0 ? s + " ".repeat(diff) : s;
}

/* ----------------------------- fs helpers ----------------------------- */
const demandDir = (id) => path.join(SPECS_ROOT, id);
const statePath = (id) => path.join(demandDir(id), "pipeline.json");
const poLogPath = (id) => path.join(demandDir(id), "PO-LOG.md");
const nowISO = () => new Date().toISOString();

function listDemands() {
  if (!fs.existsSync(SPECS_ROOT)) return [];
  return fs
    .readdirSync(SPECS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith(cfg.idPrefix + "-"))
    .map((d) => d.name)
    .sort();
}
function loadState(id) {
  const p = statePath(id);
  if (!fs.existsSync(p)) die(`demand '${id}' not found (${p})`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function saveState(state) {
  state.updatedAt = nowISO();
  fs.writeFileSync(statePath(state.id), JSON.stringify(state, null, 2) + "\n");
}
function die(msg) {
  process.stderr.write(color(TH.loopback, "factory: ") + msg + "\n");
  process.exit(1);
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "demand";
}
function nextId() {
  let max = 0;
  for (const id of listDemands()) {
    const n = parseInt(id.split("-")[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${cfg.idPrefix}-${String(max + 1).padStart(4, "0")}`;
}

/* ----------------------------- arg parsing ----------------------------- */
function parseFlags(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) flags[key] = true;
      else { flags[key] = next; i++; }
    } else pos.push(a);
  }
  return { flags, pos };
}

/* ----------------------------- commands ----------------------------- */
function cmdNew(argv) {
  const { flags, pos } = parseFlags(argv);
  const title = pos.join(" ").trim();
  if (!title) die('usage: factory new "<title>" [--slug <slug>] [--ref <ID>]');
  const id = nextId();
  const slug = flags.slug ? slugify(String(flags.slug)) : slugify(title);
  const dir = demandDir(id);
  if (fs.existsSync(dir)) die(`directory already exists: ${dir}`);
  fs.mkdirSync(dir, { recursive: true });

  // `--ref` is the generic reference tag (ticket, RFC, PRD id, …). `--prd` is kept as an alias.
  const ref = flags.ref ? String(flags.ref) : flags.prd ? String(flags.prd) : "TBD";
  const vars = {
    ID: id,
    TITLE: title,
    SLUG: slug,
    DATE: nowISO().slice(0, 10),
    DATETIME: nowISO(),
    REF: ref,
    PRD: ref,
  };
  // Scaffold every stage artifact + the product-owner log + traceability matrix.
  const templates = fs.existsSync(TEMPLATES_DIR)
    ? fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".md"))
    : [];
  for (const t of templates) {
    let body = fs.readFileSync(path.join(TEMPLATES_DIR, t), "utf8");
    for (const [k, v] of Object.entries(vars)) {
      body = body.replaceAll(`{{${k}}}`, v);
    }
    fs.writeFileSync(path.join(dir, t), body);
  }

  const state = {
    schema: 1,
    id,
    slug,
    title,
    ref,
    createdAt: vars.DATETIME,
    updatedAt: vars.DATETIME,
    status: "in-progress",
    iteration: 1,
    currentStage: STAGES[0].id,
    stages: Object.fromEntries(
      STAGES.map((s) => [
        s.id,
        { status: "pending", verdict: null, artifact: s.artifact, updatedAt: null, note: null },
      ])
    ),
    history: [{ at: vars.DATETIME, stage: null, event: "created", iteration: 1, note: title }],
  };
  state.stages[STAGES[0].id].status = "active";
  saveState(state);
  updateRegistry();

  process.stdout.write(`${color(TH.accent, "created")} ${bold(id)}  ${dim(dir)}\n`);
  renderBoard(state);
}

function cmdSet(argv) {
  const { flags, pos } = parseFlags(argv);
  const [id, stageId, status] = pos;
  if (!id || !stageId || !status) die("usage: factory set <DMD-id> <stageId> <status> [--verdict pass|fail] [--note ...]");
  if (!STAGE_BY_ID[stageId]) die(`unknown stage '${stageId}'. Known: ${STAGES.map((s) => s.id).join(", ")}`);
  if (!ST[status]) die(`unknown status '${status}'. Known: ${Object.keys(ST).join(", ")}`);
  const state = loadState(id);
  const st = state.stages[stageId];
  st.status = status;
  st.updatedAt = nowISO();
  if (flags.verdict) st.verdict = String(flags.verdict);
  if (status === "done" && !flags.verdict) st.verdict = "pass";
  if (status === "failed" && !flags.verdict) st.verdict = "fail";
  if (flags.note) st.note = String(flags.note);

  state.currentStage = stageId;
  state.history.push({
    at: nowISO(), stage: stageId, event: status, verdict: st.verdict,
    iteration: state.iteration, note: flags.note ? String(flags.note) : null,
  });

  // Derive overall status.
  if (stageId === "approval" && status === "done") state.status = "approved";
  else if (stageId === "approval" && status === "failed") state.status = "rejected";
  else if (status === "failed") state.status = "needs-rework";
  else state.status = "in-progress";

  saveState(state);
  updateRegistry();
  renderBoard(state);
}

function cmdLoopback(argv) {
  const { flags, pos } = parseFlags(argv);
  const [id, fromStage] = pos;
  if (!id || !fromStage) die("usage: factory loopback <DMD-id> <fromStageId> [--note reason]");
  if (!STAGE_BY_ID[fromStage]) die(`unknown stage '${fromStage}'`);
  const target = STAGE_BY_ID[fromStage].loopbackTo || cfg.loopbackTarget;
  const state = loadState(id);

  const from = state.stages[fromStage];
  from.status = "failed";
  from.verdict = "fail";
  from.updatedAt = nowISO();
  if (flags.note) from.note = String(flags.note);

  state.iteration += 1;
  // The target (builder) goes active; downstream reviewers reset to pending for the new iteration.
  const targetOrder = STAGE_BY_ID[target].order;
  for (const s of STAGES) {
    if (s.id === fromStage) continue;
    if (s.order >= targetOrder && s.order < STAGE_BY_ID[fromStage].order) {
      state.stages[s.id].status = s.id === target ? "active" : "pending";
      if (s.id !== target) { state.stages[s.id].verdict = null; }
    } else if (s.order > STAGE_BY_ID[fromStage].order) {
      state.stages[s.id].status = "pending";
      state.stages[s.id].verdict = null;
    }
  }
  state.stages[target].status = "active";
  state.currentStage = target;
  state.status = "needs-rework";
  state.history.push({
    at: nowISO(), stage: fromStage, event: "loopback", to: target,
    iteration: state.iteration - 1, note: flags.note ? String(flags.note) : null,
  });
  state.openLoopback = { from: fromStage, to: target, iteration: state.iteration };
  saveState(state);
  updateRegistry();
  process.stdout.write(
    `${color(TH.loopback, "↩ loopback")} ${bold(id)}  ${STAGE_BY_ID[fromStage].label} ${dim("→")} ${STAGE_BY_ID[target].label}  ${dim("(iteration " + state.iteration + ")")}\n`
  );
  renderBoard(state);
}

function cmdLog(argv) {
  const { flags, pos } = parseFlags(argv);
  const [id, stageId] = pos;
  const message = pos.slice(2).join(" ");
  if (!id || !stageId || !message) die('usage: factory log <DMD-id> <stageId> "<message>" [--agent name]');
  const state = loadState(id);
  const stage = STAGE_BY_ID[stageId];
  const agent = flags.agent ? String(flags.agent) : (stage ? stage.agent : "factory");
  const line = `- \`${nowISO()}\` · **${stage ? stage.label : stageId}** · _${agent}_ · it.${state.iteration} — ${message}\n`;
  if (!fs.existsSync(poLogPath(id))) fs.writeFileSync(poLogPath(id), `# PO-LOG · ${id}\n\n`);
  fs.appendFileSync(poLogPath(id), line);
  process.stdout.write(dim("logged → ") + path.relative(process.cwd(), poLogPath(id)) + "\n");
}

/* ----------------------------- rendering ----------------------------- */
function termWidth() {
  return Math.min(process.stdout.columns || 78, 100);
}
function rule(ch = "━", w = termWidth()) {
  return color(TH.rule, ch.repeat(w));
}

function renderBoard(state) {
  const W = termWidth();
  const out = [];
  out.push("");
  out.push(rule());
  out.push("  " + color(TH.accent, bold(cfg.name.toUpperCase())));
  out.push("  " + bold(state.id) + dim("  ·  ") + state.title);
  const statusColor =
    state.status === "approved" ? ST.done.color :
    state.status === "rejected" ? ST.failed.color :
    state.status === "needs-rework" ? ST.failed.color : ST.active.color;
  out.push(
    "  " + dim("iteration ") + bold(String(state.iteration)) +
    dim("   ·   stage: ") + (STAGE_BY_ID[state.currentStage]?.label || state.currentStage) +
    dim("   ·   status: ") + color(statusColor, state.status)
  );
  out.push(rule());
  out.push("");

  const lb = state.openLoopback && state.status === "needs-rework" ? state.openLoopback : null;
  const lbTopOrder = lb ? STAGE_BY_ID[lb.to].order : null;
  const lbBotOrder = lb ? STAGE_BY_ID[lb.from].order : null;

  const LABEL_COL = 30;
  for (let i = 0; i < STAGES.length; i++) {
    const s = STAGES[i];
    const st = state.stages[s.id];
    const meta = ST[st.status] || ST.pending;
    const glyph = color(meta.color, meta.glyph);

    let chan = "   ";
    if (lb) {
      if (s.order === lbTopOrder) chan = color(TH.loopback, "╭◀ ");
      else if (s.order === lbBotOrder) chan = color(TH.loopback, "╰─ ");
      else if (s.order > lbTopOrder && s.order < lbBotOrder) chan = color(TH.loopback, "│  ");
    }

    const label = st.status === "pending" ? dim(s.label) : s.label;
    const left = `  ${chan}${glyph}  ${s.icon}  ${pad(label, LABEL_COL)}`;

    let badge = color(meta.color, meta.badge);
    if (s.id === lb?.to) badge += "  " + color(TH.loopback, "↩ reworking");
    if (s.id === lb?.from) badge += "  " + color(TH.loopback, "↩ loopback → " + STAGE_BY_ID[lb.to].label);
    out.push(pad(left, LABEL_COL + 16) + badge);

    if (i < STAGES.length - 1) {
      const nextOrder = STAGES[i + 1].order;
      let conn = "│";
      if (lb && s.order >= lbTopOrder && nextOrder <= lbBotOrder) {
        out.push("  " + color(TH.loopback, "│  ") + color(TH.rule, "│"));
      } else {
        out.push("  " + "   " + color(TH.rule, conn));
      }
    }
  }

  const total = STAGES.length;
  const done = STAGES.filter((s) => state.stages[s.id].status === "done").length;
  const barW = Math.max(12, Math.min(28, W - 24));
  const filled = Math.round((done / total) * barW);
  const bar = color(ST.done.color, "█".repeat(filled)) + color(TH.rule, "░".repeat(barW - filled));
  out.push("");
  out.push("  " + dim("progress  ") + bar + "  " + bold(`${done}/${total}`) + dim(" stages"));
  out.push(
    "  " + dim("legend    ") +
    color(ST.done.color, "✔ done") + "   " +
    color(ST.active.color, "◐ active") + "   " +
    color(ST.pending.color, "○ pending") + "   " +
    color(ST.failed.color, "✖ fail → loopback to Builder")
  );
  out.push(rule());
  out.push("");
  process.stdout.write(out.join("\n") + "\n");
}

function cmdBoard(argv) {
  const { pos } = parseFlags(argv);
  if (pos[0]) return renderBoard(loadState(pos[0]));
  const W = termWidth();
  const ids = listDemands();
  if (!ids.length) {
    process.stdout.write("\n" + rule() + "\n  " + color(TH.accent, bold(cfg.name.toUpperCase())) +
      "\n  " + dim("no demands yet — create one with: ") + "node .specs/_factory/scripts/factory.mjs new \"<title>\"\n" + rule() + "\n\n");
    return;
  }
  const out = ["", rule(), "  " + color(TH.accent, bold(cfg.name.toUpperCase())) + dim("  ·  all demands"), rule(), ""];
  for (const id of ids) {
    const s = JSON.parse(fs.readFileSync(statePath(id), "utf8"));
    const glyphs = STAGES.map((stg) => {
      const meta = ST[s.stages[stg.id]?.status] || ST.pending;
      return color(meta.color, meta.glyph);
    }).join(color(TH.rule, "─"));
    const stColor =
      s.status === "approved" ? ST.done.color :
      s.status === "rejected" || s.status === "needs-rework" ? ST.failed.color : ST.active.color;
    out.push(`  ${bold(pad(id, 9))} ${glyphs}  ${dim("it." + s.iteration)}  ${color(stColor, s.status)}`);
    out.push(`  ${" ".repeat(9)} ${dim(s.title.slice(0, W - 16))}`);
    out.push("");
  }
  out.push("  " + dim("stages: ") + STAGES.map((s) => s.icon + " " + s.label).join(dim(" · ")));
  out.push(rule(), "");
  process.stdout.write(out.join("\n") + "\n");
}

function cmdList() {
  const ids = listDemands();
  if (!ids.length) { process.stdout.write(dim("no demands yet\n")); return; }
  for (const id of ids) {
    const s = JSON.parse(fs.readFileSync(statePath(id), "utf8"));
    process.stdout.write(`${bold(id)}  ${pad(s.status, 14)} ${dim("stage=" + s.currentStage + " it=" + s.iteration)}  ${s.title}\n`);
  }
}

function cmdShow(argv) {
  const { pos } = parseFlags(argv);
  if (!pos[0]) die("usage: factory show <DMD-id>");
  process.stdout.write(JSON.stringify(loadState(pos[0]), null, 2) + "\n");
}

function cmdStages() {
  process.stdout.write("\n" + rule() + "\n  " + color(TH.accent, bold(cfg.name.toUpperCase())) + dim("  ·  pipeline") + "\n" + rule() + "\n\n");
  for (const s of STAGES) {
    const sk = resolveSkill(s.id);
    const src = skillSource(s.id);
    process.stdout.write(`  ${s.icon}  ${bold(pad(s.label, 22))} ${dim(pad(s.id, 20))} ${dim("→ " + s.agent)}\n`);
    process.stdout.write(`      ${dim(s.description)}\n`);
    process.stdout.write(`      ${dim("skill: ")}${sk}${dim(src === "override" ? "  (override)" : "  (default)")}\n`);
    if (s.loopbackTo) process.stdout.write(`      ${color(TH.loopback, "on fail → loopback to " + STAGE_BY_ID[s.loopbackTo].label)}\n`);
    process.stdout.write("\n");
  }
  process.stdout.write(rule() + "\n\n");
}

function cmdSkills() {
  process.stdout.write("\n" + rule() + "\n  " + color(TH.accent, bold(cfg.name.toUpperCase())) + dim("  ·  skills per phase") + "\n" + rule() + "\n\n");
  for (const s of STAGES) {
    const sk = resolveSkill(s.id);
    const src = skillSource(s.id);
    const tag = src === "override" ? color(TH.accent, "override") : dim("default");
    process.stdout.write(`  ${s.icon}  ${bold(pad(s.label, 22))} ${pad(sk, 30)} ${tag}\n`);
  }
  process.stdout.write("\n  " + dim("edit overrides in: ") + path.relative(process.cwd(), SKILLS_PATH) + "\n");
  process.stdout.write(rule() + "\n\n");
}

function cmdSkill(argv) {
  const { pos } = parseFlags(argv);
  if (!pos[0]) die("usage: factory skill <stageId>");
  if (!STAGE_BY_ID[pos[0]]) die(`unknown stage '${pos[0]}'. Known: ${STAGES.map((s) => s.id).join(", ")}`);
  // Print ONLY the resolved skill name so agents can consume it programmatically.
  process.stdout.write(resolveSkill(pos[0]) + "\n");
}

function updateRegistry() {
  const ids = listDemands();
  const lines = [
    "# Demand registry",
    "",
    "Auto-generated by `factory.mjs`. One row per demand. Do not edit by hand.",
    "",
    "| ID | Title | Stage | Iteration | Status |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const id of ids) {
    const s = JSON.parse(fs.readFileSync(statePath(id), "utf8"));
    lines.push(`| [${id}](./${id}/) | ${s.title} | ${s.currentStage} | ${s.iteration} | ${s.status} |`);
  }
  lines.push("");
  fs.writeFileSync(REGISTRY_PATH, lines.join("\n"));
}

/* ----------------------------- dispatch ----------------------------- */
const [, , cmd, ...rest] = process.argv;
switch (cmd) {
  case "new": cmdNew(rest); break;
  case "set": cmdSet(rest); break;
  case "loopback": cmdLoopback(rest); break;
  case "log": cmdLog(rest); break;
  case "board": cmdBoard(rest); break;
  case "list": cmdList(); break;
  case "show": cmdShow(rest); break;
  case "stages": cmdStages(); break;
  case "skills": cmdSkills(); break;
  case "skill": cmdSkill(rest); break;
  default:
    process.stdout.write(
      `${bold(cfg.name)} ${dim("v" + cfg.version)}\n\n` +
      "commands:\n" +
      "  new \"<title>\" [--slug s] [--ref ID]   create a demand + scaffold docs\n" +
      "  set <id> <stage> <status> [--verdict] [--note]   update a stage\n" +
      "  loopback <id> <fromStage> [--note]     send a demand back to the builder\n" +
      "  log <id> <stage> \"<msg>\" [--agent]     append to PO-LOG.md\n" +
      "  board [id]                             render the factory board\n" +
      "  list | show <id> | stages\n" +
      "  skills                                 resolved skill for every phase\n" +
      "  skill <stageId>                        resolved skill name for one phase\n\n" +
      dim("statuses: " + Object.keys(ST).join(", ")) + "\n"
    );
    if (cmd && cmd !== "help" && cmd !== "--help") process.exit(1);
}
