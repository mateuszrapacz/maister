# AskUserQuestion → Chat-Native Gates (Kiro build transform)

Applied by `platforms/kiro-cli/build.sh` step 8 (`apply_chat_gate_transforms()`) to all `*.md` under `OUT` and `hooks/*.sh` before MD→JSON generation.

Kiro has **no** `AskQuestion` tool. Do not sed-rename to `AskQuestion` (Cursor pattern). Replace with chat-native gate instructions (ADR-003).

## Pattern catalog

### 3A — Instruction rewrites (chat gates)

| Source pattern | Replacement |
|----------------|-------------|
| `→ **MANDATORY GATE** — … Invoke \`AskUserQuestion\` now. …` | `→ **CHAT GATE** — Present the question and options in chat. Do not proceed until the user replies in this conversation. In \`--no-interactive\` mode, use the documented default for this gate (see Headless Defaults table).` |
| `→ MANDATORY GATE` / `→ Pause` | `→ **CHAT GATE**` |
| `AskUserQuestion - "…"` / `AskUserQuestion — "…"` | `→ **CHAT GATE** — Present in chat: "…"` |
| `Use AskUserQuestion` / `use AskUserQuestion` | `→ **CHAT GATE** — Present the question in chat` |
| `Invoke \`AskUserQuestion\`` / `invoke \`AskUserQuestion\`` | `Fire the **CHAT GATE**` |
| Remaining `` `AskUserQuestion` `` / `AskUserQuestion` | `**CHAT GATE**` |
| `AskQuestion` (Cursor leakage) | Same as above — **banned in output** |

**Gate instruction template (normative):**

```markdown
→ **CHAT GATE** — Present the question and options in chat. Do not proceed until the user replies in this conversation. In `--no-interactive` mode, use the documented default for this gate (see Headless Defaults table).
```

### 3B — Headless defaults table

Normative defaults for `kiro-cli chat --no-interactive` and `smoke-cli.sh`. Smoke prompts reference these; orchestrator skills cite the table.

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

### 3C — Multi-select → sequential single-choice

| Source | Replacement |
|--------|-------------|
| `multi-select question` | `sequential single-choice questions (one per option)` |
| `multi-select` / `multiselect` / `multiSelect` | `sequential single-choice` |
| `allow_multiple` | `sequential single-choice` |
| `AskUserQuestion (multi-select)` | `**CHAT GATE** (present sequentially in chat; one question per option)` |

Init Phase 3 standards selection and development verification Q1 are primary 3C targets.

## Build implementation

1. **`apply_chat_gate_transforms()`** in `build.sh` — per-file sed passes (3C before 3A; longest MANDATORY GATE pattern first).
2. **Step 9 partial** — strip `EnterPlanMode`/`ExitPlanMode`; copy Kiro overrides for `development`, `quick-plan`, `quick-bugfix`.
3. **Overrides** at `platforms/kiro-cli/overrides/` — hand-maintained for high-churn orchestrator files; must not contain `AskUserQuestion` or `AskQuestion`.

## Validate rules

| Rule | Check |
|------|-------|
| 25 | Zero `AskUserQuestion`, `AskQuestion` in output `*.md` (and `hooks/*.sh` when present) |
| 26 | Orchestrator skills contain `CHAT GATE` where source had gates (count ≥ source minus documented exceptions) |
| 27 | This file exists at `platforms/kiro-cli/transforms/askuser-to-chat-gate.md` |

## Documented exceptions (grep audit)

See `transforms/chat-gate-audit.md` for source vs output gate counts and allowed exceptions.

| Exception | Reason | Resolved by |
|-----------|--------|-------------|
| Source `plugins/maister/` | SOT — never transformed | N/A (not in output) |
| Platform `platforms/kiro-cli/overrides/` pre-build | Authoring copies; must be chat-gate clean before commit | Maintainer review |
| Hook scripts in output | Transformed in step 8 `hooks/*.sh` glob | `apply_chat_gate_transforms()` |

## Files transformed (step 8 glob)

- `skills/**/*.md`
- `agents/*.md` (pre–step 17 JSON generation)
- `CLAUDE.md` (until step 10 steering migration in Group 6)
- `hooks/*.sh`

## Overrides (step 9)

| Override | Target in OUT |
|----------|---------------|
| `overrides/skills/development/SKILL.md` | `skills/maister-development/SKILL.md` |
| `overrides/commands/quick-plan.md` | `skills/maister-quick-plan/SKILL.md` |
| `overrides/skills/quick-bugfix/SKILL.md` | `skills/maister-quick-bugfix/SKILL.md` |
