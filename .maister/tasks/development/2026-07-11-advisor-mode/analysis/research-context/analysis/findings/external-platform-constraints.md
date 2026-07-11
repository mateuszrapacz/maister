# External Platform Constraints: Gate Transforms & Advisor Feasibility

## TL;DR

Maister compiles orchestrator gates from source `AskUserQuestion` into five platform-specific patterns: native tool (Claude), `AskQuestion` (Cursor), `ask_user` (Copilot), **CHAT GATE** + headless defaults (Kiro), and `plain-text user question` (Codex). A portable **Task/subagent advisor consultation** pattern is feasible on Kiro and Codex and conditionally on Claude/Cursor; it does not by itself inject an answer into an interactive gate. Kiro headless already auto-answers via the Headless Defaults table. Copilot lacks reliable per-subagent model pinning — advisor there is instruction-level or host-default only. Native Anthropic Advisor Tool API is Claude-only (out of scope for this file; see `external-anthropic` gatherer).

> **Revision 2026-07-11:** Codex feasibility raised from Low to Medium–High. Prior “Low” reflected plugin MVP policy (no `agents/` at plugin root), not Codex API limits. See `outputs/research-report.md` Appendix F.

## Key Decisions

- **Source of truth authoring** — All gate and advisor instructions must use `AskUserQuestion` and `Task tool` in `plugins/maister/`; never author `AskQuestion`, `ask_user`, or `CHAT GATE` in SOT.
- **Portable advisor pattern** — Pre-gate `Task`/`subagent` invocation of `maister-advisor` with `model:` in agent frontmatter is a cross-platform recommendation fallback; it is not a synthetic answer mechanism and is not the native Advisor Tool API.
- **Kiro advisor + headless** — Extend Headless Defaults table (3B) for `advisor_mode` rather than inventing tool names; any new gate copy must survive `apply_chat_gate_transforms()` zero-tolerance on `AskUserQuestion`/`AskQuestion`.
- **Cursor model policy** — Advisor model must avoid `*-fast` slugs per `maister-no-fast-models.mdc`; prefer agent frontmatter `model:` over Task-call `model` param (parent override bug risk).

## Open Questions / Risks

- **Copilot `ask_user` availability** — Open GitHub issue #1898 reports `ask_user` missing in some CLI modes; advisor cannot rely on a stable question tool in all sessions (Medium confidence).
- **Cursor Task `model` override** — Forum reports parent agent injects explicit `model` on Task calls, ignoring subagent frontmatter (Medium confidence; blocks reliable separate advisor model).
- **Codex advisor path** — Plugin MVP bans root `agents/` (`smoke-cli.sh`); advisor ships as init-scaffolded `.codex/agents/advisor.toml` with `model`, `sandbox_mode`, `developer_instructions`. Orchestrator spawns via `native subagent delegation` (High confidence from Codex subagents docs + `maister-codex` delegation pattern).
- **Kiro interactive advisor** — Subagent can answer internally, but CHAT GATE still requires presenting options in chat unless headless defaults extended — UX ambiguity for “advisor answered but user never saw question” (Medium).
- **Copilot headless** — `--no-ask-user` disables `ask_user`; advisor-as-user requires alternate automation path (scripted defaults or parent synthesis), not tool substitution (High confidence from GitHub docs).

---

## 1. Gate Transform Matrix (Authoritative: `platforms/*/build.sh`)

| Platform | Output plugin | Build script | Source → Output gate mechanism | Step / function |
|----------|---------------|--------------|-------------------------------|-----------------|
| **Claude Code** | `plugins/maister` | *(none — SOT)* | `AskUserQuestion` unchanged | — |
| **Cursor** | `plugins/maister-cursor` | `platforms/cursor/build.sh` | `AskUserQuestion` → `AskQuestion` | Step 6 (global `find … sed`) |
| **Copilot CLI** | `plugins/maister-copilot` | `platforms/copilot-cli/build.sh` | `AskUserQuestion` → `ask_user` | Step 8 |
| **Kiro CLI** | `plugins/maister-kiro` | `platforms/kiro-cli/build.sh` | `AskUserQuestion` / `AskQuestion` → **CHAT GATE** (chat-native) | Step 8 `apply_chat_gate_transforms()` |
| **Codex** | `plugins/maister-codex` | `platforms/codex-cli/build.sh` | `AskUserQuestion` / `AskQuestion` → `plain-text user question` | `transform_markdown()` / `transform_tree_markdown()` |

### 1.1 Claude Code (baseline)

**Source**: `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` §2

**Evidence** — normative gate contract:

```60:70:plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md
**`→ Pause` means STOP and USE AskUserQuestion.** This is NOT optional. You MUST invoke the `AskUserQuestion` tool and WAIT for user response. Proceeding without it is a protocol violation.
...
You MUST invoke `AskUserQuestion` at every `→ Pause` in every permission mode — `default`, `acceptEdits`, `auto`, `plan`, `bypassPermissions`.
```

**Hooks** reinforce gates: `plugins/maister/hooks/skill-invocation-reminder.sh` injects AskUserQuestion at checkpoints.

**Advisor feasibility**: **Native AskUserQuestion** at orchestrator parent + optional **Anthropic Advisor Tool API** (external gatherer). Agent `model:` frontmatter is present on 23 of 26 SOT agents (plus Cursor `explore`); three SOT companion agents omit it. Dedicated `advisor.md` with non-inherit `model:` is structurally valid per `plugin-development.md`, but separate-model behavior still requires per-platform verification.

**Confidence**: High

---

### 1.2 Cursor (`platforms/cursor/build.sh`)

#### AskUserQuestion → AskQuestion

**Evidence** — step 6:

```74:77:platforms/cursor/build.sh
# 6. AskUserQuestion → AskQuestion
find "$OUT" -name "*.md" | while read -r f; do
  sedi 's/AskUserQuestion/AskQuestion/g' "$f"
done
```

**Platform documentation** in generated rule `maister-workflows.mdc`:

```50:55:platforms/cursor/templates/maister-workflows-template.mdc
| User questions | `AskQuestion` tool (supports `allow_multiple`) |
...
| Other subagents | Custom agents as `maister-*` via Task tool |
| Model policy | **No fast-tier by default** — see `maister-no-fast-models.mdc` ...
```

**Hooks** — Cursor variant reminds `AskQuestion` (transformed):

```6:6:platforms/cursor/hooks/skill-invocation-reminder.sh
...invoke AskQuestion at every mandatory gate checkpoint...
```

#### Task tool & model parameter

- **Subagent definition**: Agents ship as `agents/*.md` with `maister-*` prefix injected (step 11b); `explore.md` demonstrates `model: inherit` pattern.
- **Task tool**: Not renamed in Cursor build (unlike Kiro/Codex); orchestrator delegation stays `Task tool` + `subagent_type="maister-*"`.
- **Model configuration** ([Cursor Subagents docs](https://cursor.com/docs/subagents)):
  - Agent frontmatter `model: inherit | <model-id> | <id>[effort=high,…]`
  - Parent may override when model blocked, Max Mode required, or plan-limited
  - Known bug: parent injects explicit `model` on Task calls, ignoring user/subagent settings ([forum #162601](https://forum.cursor.com/t/parent-agent-overrides-subagent-model-settings-by-explicitly-passing-model-to-task-tool-it-used-all-of-my-api-budget/162601))

**`maister-no-fast-models.mdc`** (alwaysApply):

```15:16:platforms/cursor/rules/maister-no-fast-models.mdc
1. **Default** — Do **not** pass a `model` parameter containing `fast` when invoking Task ...
   Prefer omitting `model` so subagents inherit the parent session model.
```

**Validation**: `make validate-cursor` does **not** grep for `AskQuestion` presence/absence; structural checks only. No ban on `AskUserQuestion` in output (transform is one-way).

#### Advisor feasibility (Cursor)

| Approach | Feasible? | Notes |
|----------|-----------|-------|
| Native Advisor Tool API | **No** | Not exposed in Cursor plugin surface |
| Task → `maister-advisor` before `AskQuestion` | **Conditional** | Author `agents/advisor.md`; orchestrator can obtain and show a recommendation, but a synthetic `AskQuestion` answer is not provided by the documented API |
| AskQuestion auto-answered by executor | **Unverified** | No documented injection/pre-selection API; requires a host/runtime smoke test |
| Separate model via Task `model` param | **Risky** | Documented; conflicts with no-fast rule if misconfigured; parent override bug |

**Confidence**: High for transform mapping; Low–Medium for separate model and gate auto-answer

---

### 1.3 Copilot CLI (`platforms/copilot-cli/build.sh`)

#### AskUserQuestion → ask_user

**Evidence** — steps 7–8:

```57:72:platforms/copilot-cli/build.sh
# 7. Add platform note to plugin's CLAUDE.md
...
- **User questions**: Use `ask_user` tool instead of `AskUserQuestion`
...
# 8. Replace AskUserQuestion with copilot's ask_user tool
find "$OUT" -name "*.md" | while read f; do
  sedi 's/AskUserQuestion/ask_user/g' "$f"
done
```

**Additional transforms**:
- Multi-select → sequential single-select (step 5)
- `maister:` → `maister-` (step 4)
- **Hooks removed**: `rm -rf "$OUT/hooks"` (line 20) — no runtime gate reminders in Copilot variant

**External API** ([Copilot CLI reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)):
- Built-in `ask_user` tool — “Ask the user a question”
- `--no-ask-user` — “Disable the `ask_user` tool (the agent works autonomously without asking questions)”
- Programmatic mode recommends `--no-ask-user` for CI ([docs](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically))

**Risk**: [copilot-cli#1898](https://github.com/github/copilot-cli/issues/1898) — `ask_user` reported missing outside plan mode (open, Mar 2026).

**Validation** (`make validate-copilot`): No `ask_user`/`AskUserQuestion` grep rules; checks colons, multi-select, `maister:` bans.

#### Advisor feasibility (Copilot)

| Approach | Feasible? | Notes |
|----------|-----------|-------|
| Custom agent with separate model | **Unclear** | Copilot custom agents exist (`--agent`); plugin does not ship `agents/` JSON; model pinning not in Maister transform pipeline |
| Pre-gate subagent answers → `ask_user` | **Partial** | Orchestrator synthesizes answer; still uses `ask_user` or skips with `--no-ask-user` |
| Headless advisor defaults | **Yes** | Align with `--no-ask-user` + documented default answers (similar to Kiro 3B) |
| Native Advisor Tool API | **No** | Claude/Anthropic-specific |

**Confidence**: High for transform; Low–Medium for separate advisor model

---

### 1.4 Kiro CLI (`platforms/kiro-cli/build.sh` + `transforms/askuser-to-chat-gate.md`)

#### AskUserQuestion → CHAT GATE (not AskQuestion)

**Normative spec** — `platforms/kiro-cli/transforms/askuser-to-chat-gate.md`:

> Kiro has **no** `AskQuestion` tool. Do not sed-rename to `AskQuestion` (Cursor pattern).

**Long-form MANDATORY GATE replacement** (build.sh line 105):

```
→ **CHAT GATE** — Present the question and options in chat. Do not proceed until the user replies in this conversation. In `--no-interactive` mode, use the documented default for this gate (see Headless Defaults table).
```

**Residual ban** — all `AskUserQuestion`/`AskQuestion` strings become `**CHAT GATE**` (lines 146–150).

**Validation** — `make validate-kiro` rules 11, 25:

```
Rule 11/25: no AskUserQuestion or AskQuestion in output tree (incl. hooks)
Rule 26: CHAT GATE count thresholds (≥53 in maister-development, ≥200 total)
Rule 27: transforms/askuser-to-chat-gate.md must exist
Rule 30: no `model: inherit` in agents/*.json (non-inherit models allowed)
```

#### Headless Defaults table (3B)

**Source**: `platforms/kiro-cli/transforms/askuser-to-chat-gate.md` §3B

| Gate context | `--no-interactive` default |
|--------------|---------------------------|
| Orchestrator phase exit gates | Proceed to next phase |
| Scope/decision gates with recommendation | Accept recommended option |
| Verification option prompts | Run all recommended checks |
| Init standards scope selection | `global` only |
| `quick-plan` approval gate | Proceed with generated plan |
| `quick-bugfix` complexity escalation | Stay in quick-bugfix (no escalation) |
| Fix-loop "which issues to fix" | Fix all fixable issues |
| E2E / user-docs enable prompts | Skip optional phases |

**Smoke tests** embed 3B summary in prompts (`platforms/kiro-cli/smoke-cli.sh` line 24) and run `kiro-cli chat --no-interactive`.

**Hook reminder** (transformed):

```8:8:platforms/kiro-cli/hooks/skill-invocation-reminder.sh
...fire **CHAT GATE** at every mandatory checkpoint... In --no-interactive mode, use documented Headless Defaults.
```

#### Delegation transforms (advisor-relevant)

`apply_delegation_transforms()` — `Task tool` → `subagent tool`, `subagent_type` → `agent:` (build.sh lines 261–298).

**Agent JSON** — `generate-agent-json.sh` emits `model` field only when frontmatter ≠ `inherit`:

```134:134:platforms/kiro-cli/generate-agent-json.sh
    + (if ($model | length) > 0 and $model != "inherit" then {model: $model} else {} end)
```

#### Advisor feasibility (Kiro)

| Approach | Feasible? | Notes |
|----------|-----------|-------|
| CHAT GATE + user reply | **Yes (interactive)** | Default path today |
| `--no-interactive` + Headless Defaults | **Yes (headless)** | Already auto-answers; **advisor_mode must extend 3B table** or override defaults |
| `subagent tool` + `maister-advisor` before gate | **Yes (consultation)** | SOT says `Task tool`; build rewrites to `subagent tool`; advisor returns recommended option; interactive orchestrator still presents CHAT GATE |
| `AskQuestion` / `ask_user` in output | **Banned** | CI fail rules 11/25 |
| Separate advisor model in JSON | **Yes** | Non-inherit `model:` in source `advisor.md` → Kiro agent JSON |

**Conflict**: Headless default “accept recommended option” ≈ naive advisor; true advisor_mode needs explicit rows (e.g. “when `orchestrator.options.advisor_mode`, invoke maister-advisor subagent; use its answer as CHAT GATE reply / headless default”).

**Confidence**: High for transforms and existing headless defaults; Medium for interactive consultation UX; no synthetic-answer support demonstrated

---

### 1.5 Codex (`platforms/codex-cli/build.sh`)

#### AskUserQuestion → plain-text user question

**Evidence**:

```60:63:platforms/codex-cli/build.sh
    -e 's/AskUserQuestion/plain-text user question/g' \
    -e 's/AskQuestion/plain-text user question/g' \
```

**Delegation** — generic replacements:

```70:74:platforms/codex-cli/build.sh
    -e 's/Task tool/native subagent delegation/g' \
    -e 's/subagent_type/agent role/g' \
    -e 's/agent role: `maister[-:][^`]*`/agent role: `native Codex subagent`/g' \
```

**No `agents/` directory** in output — skills-only packaging. README:

> Models are selected by the Codex host/session; the plugin does not pin models.

**Validation** (`platforms/codex-cli/smoke-cli.sh` lines 35–38):

```bash
grep -RInE 'CLAUDE\.md|AskUserQuestion|AskQuestion|TaskCreate|TaskUpdate|EnterPlanMode|ExitPlanMode' \
  "$PLUGIN/skills" --include='*.md'  # must be empty
```

**Hook** (`platforms/codex-cli/hooks/skill-invocation-reminder.sh`):

> preserve phase gates as plain-text user questions

#### Advisor feasibility (Codex)

Codex natively supports subagents with **separate agent threads** (isolated context; parent receives summary). Custom agents live in `.codex/agents/*.toml` or `~/.codex/agents/*.toml` with optional `model`, `model_reasoning_effort`, `sandbox_mode`. Default `agents.max_depth = 1` allows orchestrator → advisor (advisor cannot spawn deeper).

| Approach | Feasible? | Notes |
|----------|-----------|-------|
| Dedicated `advisor` at plugin root | **No** | `smoke-cli.sh` FAIL if `$PLUGIN/agents/` exists — MVP policy |
| Project `.codex/agents/advisor.toml` (init bootstrap) | **Yes** | Template in `platforms/codex-cli/templates/`; `model` from `advisor_model` config |
| Native subagent delegation for advisor | **Yes** | Spawn agent `advisor` by name; separate thread + model when TOML sets `model` |
| Separate advisor model | **Yes (project TOML)** | Not in plugin manifest; seeded at init |
| Plain-text gate + orchestrator synthesis only | **Fallback** | Degraded path if TOML missing |
| `codex exec -m` subprocess | **Optional** | CI/automation fallback; not primary interactive path |

**Confidence**: High for native subagent + custom TOML; Medium for live gate-runtime smoke (deferred like rest of Codex MVP)

---

## 2. Cross-Platform Comparison: Implementation Paths

| Platform | Gate surface | Subagent / Task API | Model pinning for advisor | Recommended advisor path |
|----------|-------------|---------------------|---------------------------|--------------------------|
| Claude Code | `AskUserQuestion` | `Task tool` + `subagent_type` | Agent frontmatter `model:` | Native API (if available) **or** Task → advisor agent |
| Cursor | `AskQuestion` | `Task tool` + `maister-*` | Agent frontmatter `model:` (runtime honor uncertain) | Task → `maister-advisor` → show recommendation; auto-answer unverified |
| Copilot | `ask_user` | Plugin agents N/A in build | Not in Maister pipeline | Orchestrator synthesis + `ask_user`; headless: `--no-ask-user` + defaults |
| Kiro | **CHAT GATE** | `subagent tool` + `agent: maister-*` | JSON `model` if ≠ inherit | Subagent advisor + existing headless defaults; interactive gate remains user-facing |
| Codex | plain-text question | native subagent delegation | `.codex/agents/advisor.toml` | Spawn `advisor` custom agent → gate answer |

---

## 3. SOT Authoring Rules for Advisor Mode (Transform Survival)

Author in `plugins/maister/` only:

1. **Gate tool name**: Always `AskUserQuestion` (never `AskQuestion`, `ask_user`, `CHAT GATE`).
2. **Delegation**: Use `Task tool` with `subagent_type` (Kiro → `subagent tool`; Codex → `native subagent delegation`).
3. **Advisor agent**: Add `plugins/maister/agents/advisor.md` with `name: advisor`, `model: <non-inherit>` when separate model required.
4. **Kiro-safe phrasing**: Avoid post-transform banned strings in new prose; e.g. do not document “call AskQuestion after advisor” in Kiro overrides — use “after advisor consultation, fire gate per orchestrator-patterns §2”.
5. **Headless**: For Kiro, any advisor auto-answer must be expressible as a **Headless Defaults** row or `--no-interactive` branch (see 3B table).
6. **Cursor fast models**: Advisor `model:` must not use `*-fast` unless user explicitly configures (rule conflict otherwise).
7. **Codex**: Init scaffold `.codex/agents/advisor.toml` from template; §2 instructs `native subagent delegation` → agent `advisor`. Do not bundle root `agents/` in plugin.

### Example SOT pattern (pre-transform)

```markdown
When `orchestrator.options.advisor_mode` is true and gate is advisor-allowed:
1. Invoke Task tool with subagent_type `advisor`, passing gate question + options + artifact TL;DR
2. Record advisor response as a recommendation in `phases[].gate.advisor_answer`
3. If advisor_mode false, invoke AskUserQuestion as today
```

**Post-transform samples**:

| Platform | Step 3 becomes |
|----------|----------------|
| Cursor | `AskQuestion` |
| Copilot | `ask_user` |
| Kiro | `→ **CHAT GATE**` (advisor recommendation is shown; headless behavior is separate) |
| Codex | `plain-text user question` |

---

## 4. Related Transforms Affecting Advisor Orchestration

| Transform | Cursor | Copilot | Kiro | Codex |
|-----------|--------|---------|------|-------|
| `TaskCreate`/`TaskUpdate` | → `TodoWrite` | unchanged | → `todo` tool | → `phase entries in orchestrator-state.yml` |
| `Skill tool` | unchanged (internal → `lib/skills`) | unchanged | → `/maister-*` slash | → `skill loader` |
| `EnterPlanMode` | stripped | unchanged | stripped | → `native planning flow` |
| Multi-select gates | `AskQuestion` allow_multiple | sequential single-select | sequential single-choice | unchanged text |
| Agent prefix | `maister-*` | unchanged filenames | `maister-*.json` | N/A (no agents) |
| Hooks | Cursor format | **removed** | embedded in `maister.json` | minimal set |

---

## 5. Feasibility Summary & Confidence

| Claim | Confidence | Primary evidence |
|-------|------------|------------------|
| Cursor maps `AskUserQuestion` → `AskQuestion` globally | **High** | `platforms/cursor/build.sh:74-77` |
| Kiro bans `AskUserQuestion`/`AskQuestion` in output | **High** | `Makefile` validate-kiro rules 11, 25 |
| Kiro headless defaults are normative for `--no-interactive` | **High** | `transforms/askuser-to-chat-gate.md` §3B, `smoke-cli.sh` |
| Codex bans `AskUserQuestion` in skills | **High** | `platforms/codex-cli/smoke-cli.sh:35-38` |
| Copilot maps to `ask_user`; `--no-ask-user` disables it | **High** | GitHub Copilot CLI docs |
| Cursor supports subagent `model:` in frontmatter | **High** | cursor.com/docs/subagents |
| Cursor Task `model` param reliably honored | **Low–Medium** | Forum bug reports |
| Copilot separate advisor model via plugin | **Low** | No agent packaging in `build.sh` |
| Codex plugin root `agents/` banned | **High** | `platforms/codex-cli/smoke-cli.sh:61-64` |
| Codex custom agent TOML supports `model` | **High** | [Codex subagents — Custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents) |
| Codex subagent separate agent thread | **High** | Codex subagents docs |
| Codex plugin manifest pins advisor model | **Low** | By design — model in project TOML |

---

## 6. Sources Investigated

### In-repo (primary)

| Path | Purpose |
|------|---------|
| `platforms/cursor/build.sh` | AskQuestion transform, agent prefix, TodoWrite, hooks |
| `platforms/copilot-cli/build.sh` | ask_user transform, multi-select, hook removal |
| `platforms/kiro-cli/build.sh` | CHAT GATE transforms, delegation, JSON agents |
| `platforms/kiro-cli/transforms/askuser-to-chat-gate.md` | Normative gate + Headless Defaults 3B |
| `platforms/kiro-cli/generate-agent-json.sh` | Kiro `model` field emission |
| `platforms/kiro-cli/smoke-cli.sh` | Headless test harness |
| `platforms/codex-cli/build.sh` | plain-text gates, subagent genericization |
| `platforms/codex-cli/smoke-cli.sh` | Banned reference validation |
| `platforms/cursor/templates/maister-workflows-template.mdc` | Cursor platform API table |
| `platforms/cursor/rules/maister-no-fast-models.mdc` | Task model policy |
| `platforms/cursor/agents/explore.md` | `model: inherit` precedent |
| `Makefile` | `validate-cursor`, `validate-kiro`, `validate-copilot` rules |
| `.maister/docs/standards/global/build-pipeline.md` | Kiro API bans, hook contracts |
| `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` §2 | SOT gate contract |

### External (secondary)

| URL | Purpose |
|-----|---------|
| https://cursor.com/docs/subagents | Task/subagent `model` field, override conditions |
| https://forum.cursor.com/t/parent-agent-overrides-subagent-model-settings-by-explicitly-passing-model-to-task-tool-it-used-all-of-my-api-budget/162601 | Task model override risk |
| https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference | `ask_user`, `--no-ask-user` |
| https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically | Headless `--no-ask-user` |
| https://github.com/github/copilot-cli/issues/1898 | `ask_user` availability regression |
| https://kiro.dev/docs/cli/custom-agents/ | Kiro agent JSON model (linked from Kiro build steering) |

---

## 7. Implications for Downstream Synthesis

1. **Feasibility matrix** should mark Claude/Kiro/Codex as consultation-capable, Cursor as conditional pending model/runtime smoke test, and Copilot as **defaults-only / orchestrator synthesis**. No platform should be marked synthetic-answer capable without a runtime test.
2. **Config schema** should seed `advisor_mode` into `orchestrator.options` and require Kiro **Headless Defaults** extension when `advisor_mode && --no-interactive`.
3. **Safety denylist** gates (rollback, scope expansion) must bypass advisor on all platforms — on Kiro, bypass means “do not apply headless proceed/default; require real chat reply”.
4. **Build pipeline work** likely needed: Kiro override snippets for advisor consultation; optional Copilot headless default table; verify Cursor `maister-advisor` model behavior and use only the supported read-only build mechanism.
