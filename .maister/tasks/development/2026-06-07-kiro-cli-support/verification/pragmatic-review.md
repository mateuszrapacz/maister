# Pragmatic Code Review: Kiro CLI Platform Support

**Reviewer:** maister-code-quality-pragmatist  
**Date:** 2026-06-08  
**Scope:** `platforms/kiro-cli/`, `plugins/maister-kiro/` (generated), Makefile `validate-kiro`, integration docs  
**Spec:** `implementation/spec.md`  
**Reference:** Cursor platform (`platforms/cursor/`, 247-line `build.sh`)

---

## Executive Summary

**Overall complexity:** Medium–High  
**Appropriateness for project scale:** ⚠️ **Mostly appropriate, with process inflation**

Kiro CLI support is **genuinely more complex than Cursor** — JSON agents, no `AskQuestion` tool, commands merged into skills, hooks embedded in `maister.json`, and an isolated `KIRO_HOME` profile are real platform constraints, not speculative abstraction. The core build pipeline (`build.sh` 548 lines, `generate-agent-json.sh` 208 lines, `agent-tools.json`) is **proportionate** to those constraints.

However, the delivery accumulated **avoidable duplication**: a 746-line development skill override that mirrors mechanical sed output, 12 test files (~1,358 LOC) that largely re-assert `make validate-kiro`, redundant Makefile rules, and brittle magic-number thresholds. The platform directory is **3.4× larger than Cursor** (51 vs 15 files) — roughly half of that delta is test/doc scaffolding rather than essential build logic.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 3 |
| Medium | 6 |
| Low | 5 |

**Status:** Shippable, but simplify before the next platform or major source-plugin churn.

---

## Complexity Assessment

### Project scale

| Dimension | Value |
|-----------|-------|
| Project type | Multi-platform plugin marketplace (production-oriented) |
| Platforms | 4 (Claude Code SOT + 3 generated variants) |
| Kiro deliverable | Greenfield, Cursor-pattern derivative |
| Team model | Small maintainer team; bash+jq build pipeline |

### Complexity indicators

| Metric | Kiro | Cursor | Notes |
|--------|------|--------|-------|
| `build.sh` LOC | 548 | 247 | 2.2× — justified by JSON agents, chat gates, command merge |
| `sedi` calls in build | 124 | 43 | Chat gates (~58) + delegation (~35) drive delta |
| Platform files | 51 | 15 | Tests/prompts/docs inflate Kiro |
| Test shell LOC | ~1,358 | 0 | Cursor has no `platforms/cursor/tests/` |
| Validate rules | 28 | ~15 | Several redundant pairs |
| Task groups / steps | 12 / ~78 | N/A | High process overhead for pattern-follow |

### Appropriateness evaluation

**Justified complexity (keep):**

- `generate-agent-json.sh` + `agent-tools.json` — Kiro requires JSON agents with explicit tool whitelists; source MD has no `tools:` frontmatter (spec decision).
- `merge_commands_to_skills()` — Kiro has no `commands/` API.
- `apply_chat_gate_transforms()` — Kiro has no `AskQuestion`; Cursor's one-line `sed 's/AskUserQuestion/AskQuestion/g'` is insufficient.
- `synthesize_orchestrator_agents()` — embedded hooks + `skill://` resources are Kiro-specific.
- `maister-explore.json` — no built-in explore subagent.
- `smoke-install.sh` + `maister-kiro` wrapper — isolated profile is a real distribution requirement.

**Disproportionate complexity (simplify):**

- Full-file overrides that duplicate sed output.
- 12 test files overlapping `make validate-kiro`.
- Duplicate validate rules and CHAT GATE count thresholds.
- Tier-flattened `agent-tools.json` (3 patterns, 24 entries).
- Install-time JSON patches that hide the true Kiro contract.

---

## Key Issues Found

### High

#### H1. Full development skill override duplicates mechanical transforms

**Evidence:**
- `platforms/kiro-cli/overrides/skills/development/SKILL.md` — 746 lines (same size as source).
- `build.sh` lines 278–283: `apply_chat_gate_transforms_tree` runs **before** `apply_kiro_overrides`, which **replaces** the development skill entirely.
- `transforms/chat-gate-audit.md` line 31: *"Full-file development override mirrors mechanical transform output."*

**Problem:** Maintainers must keep a 746-line override in sync with source plugin changes **and** maintain 58 sed patterns that are thrown away for this file. ~290 lines differ from source — largely transform output that sed already produces.

**Impact:** Double maintenance on the highest-churn skill; risk of override drifting from sed behavior; wasted build time transforming a file that gets overwritten.

**Recommendation:** Drop `overrides/skills/development/SKILL.md`. Rely on `apply_chat_gate_transforms()` only. Keep overrides **only** for quick-plan and quick-bugfix where Cursor-origin content needs Kiro-specific gate wording beyond generic sed.

**Estimated effort:** 1–2 hours (remove override, verify rule 26 counts, one build+validate cycle).

---

#### H2. Test suite largely duplicates `make validate-kiro`

**Evidence:**
- 12 test files under `platforms/kiro-cli/tests/`, ~1,358 LOC total.
- Work-log cites ~94 tests; many call `run_build()` then grep the same invariants `validate-kiro` already checks.
- Examples:
  - `build-core.test.sh` — skill count, `maister:` ban, MCP path (rules 2, 9, 13, 14).
  - `validation.test.sh` — wraps `make validate-kiro` plus re-implements rules 7, 14/28, 21–22, 26.
  - `chat-gate.test.sh` — AskUserQuestion ban, CHAT GATE counts (rules 11, 25, 26).
  - `e2e-matrix.test.sh` — greps `docs/kiro-cli-support.md` for scenario table rows (doc lint, not build behavior).

**Problem:** Contributors must update assertions in two places (Makefile + test files). Full `make build-kiro` runs multiple times per test file — slow feedback on a multi-second pipeline.

**Impact:** High maintenance burden; false confidence from redundant coverage; slower CI/local runs.

**Recommendation:** Consolidate to **3–4 test entry points**:
1. `make validate-kiro` (structural SOT — keep all rules, dedupe first).
2. `platforms/kiro-cli/tests/generator.test.sh` + golden fixture (MD→JSON edge cases `validate` cannot cover).
3. `platforms/kiro-cli/tests/gap-fill.test.sh` (negative injection, hook fallback, resources — keep, trim overlap).
4. `smoke-cli.sh` (runtime headless, requires `kiro-cli`).

Delete or merge: `build-core`, `chat-gate`, `delegation-todo`, `build-completion`, `phase2`, `validation` (keep only negative-injection cases not in Makefile), `e2e-matrix` (move scenario table check to docs CI or drop).

**Estimated effort:** 4–6 hours.

---

#### H3. Redundant Makefile validate rules

**Evidence:** `Makefile` lines 99–101 vs 136–138 (rules 11 and 25 — identical AskUserQuestion/AskQuestion ban; 25 adds `*.sh` which 11 should also cover). Lines 110–111 vs 144–145 (rules 14 and 28 — both assert exactly 22 skill directories; rule 28 adds `maister-*` name filter which rule 13 already enforces per-directory).

**Problem:** Rule proliferation without added signal. Rule 26 (CHAT GATE count ≥53 in development, ≥200 total) encodes **magic numbers** tied to a point-in-time source audit (`transforms/chat-gate-audit.md`).

**Impact:** False failures when source adds gates but thresholds aren't updated; confusing rule numbering for contributors.

**Recommendation:**
- Merge rules 11+25 → single ban across `*.md` and `*.sh`.
- Merge rules 14+28 → single "22 directories, all `maister-*`, names match frontmatter" check (rule 13 already covers name match).
- Replace rule 26 count thresholds with: `grep -r AskUserQuestion` must be 0 **and** orchestrator skills with source gates must contain `CHAT GATE` (boolean per file, not global counts).

**Estimated effort:** 2 hours.

---

### Medium

#### M1. `agent-tools.json` flattens three tool tiers into 24 entries

**Evidence:** `platforms/kiro-cli/agent-tools.json` (89 lines). Unique tool patterns:
- 14 agents: `read,grep,glob,list,write`
- 6 agents: `read,grep,glob,list,write,shell`
- 4 agents: `read,grep,glob,list`

**Problem:** Repetitive JSON duplicates the same arrays. Adding a new agent requires copy-paste unless contributor knows the tier convention.

**Recommendation:** Collapse to tier keys:

```json
{
  "tiers": {
    "readonly": ["read","grep","glob","list"],
    "writer": ["read","grep","glob","list","write"],
    "shell": ["read","grep","glob","list","write","shell"]
  },
  "agents": { "gap-analyzer": "readonly", "docs-operator": "shell", ... }
}
```

**Estimated effort:** 2–3 hours (json + generator jq lookup).

---

#### M2. Build output requires runtime patches at install time

**Evidence:** `smoke-install.sh` lines 44–83 — `fix_agent_prompts()` rewrites `promptFile` → `prompt` file URI and strips `model: inherit`; `fix_hook_paths()` patches relative hook paths to absolute `$KIRO_HOME/hooks/`.

**Problem:** Generated `plugins/maister-kiro/` is not directly consumable by `kiro-cli`; install script mutates artifacts. This hides the true Kiro contract in a smoke-layer workaround.

**Impact:** Users copying `plugins/maister-kiro/` without `smoke-install.sh` get broken agents; debugging requires knowing install-time patches exist.

**Recommendation:** Move `fix_agent_prompts` logic into `generate-agent-json.sh` / `synthesize_orchestrator_agents` so build output matches runtime. Resolve hook paths once in build (or document that only `smoke-install` is supported). **Pragmatic minimum:** emit correct `prompt` field in build; keep hook path fallback only in install.

**Estimated effort:** 3–4 hours.

---

#### M3. `generate-agent-json.sh` exceeds documented escape hatch with repetitive jq branches

**Evidence:** 208 lines; spec line 218: *"escalate to generate-agents.mjs if frontmatter parser exceeds ~100 lines"*. Lines 120–184: four near-identical `jq -n` blocks differing only by optional `resources` / `toolsSettings`.

**Problem:** Threshold documented but not acted on; jq combinatorics harder to read than a small Node script with gray-matter would be.

**Recommendation (pragmatic):** Don't migrate to Node yet — collapse to **one** `jq` invocation with `resources // empty` and `toolsSettings // empty`. Brings script under ~150 lines and removes escape-hatch inconsistency.

**Estimated effort:** 1–2 hours.

---

#### M4. `@prompts` layer adds 9 files for thin aliases

**Evidence:** `platforms/kiro-cli/prompts/*.md` — 5–9 lines each. Example `prompts/dev.md`:

```markdown
Invoke `/maister-development` with the user's feature request...
```

**Problem:** Nine maintained files that add little beyond slash skills already exposed. Spec FR-7 mandates them; value for MVP is marginal.

**Recommendation:** For future platforms, defer `@prompts` to Phase 2+ unless user research shows demand. If kept: generate prompts from a 9-line YAML map in `build.sh` instead of hand-maintained markdown files.

**Estimated effort:** 1 hour to codegen; 0 if deferred on next platform.

---

#### M5. Process overhead: 12 task groups, ~78 steps for a pattern-follow greenfield

**Evidence:** `implementation/implementation-plan.md` — 12 groups, ~78 steps, ~94 tests. Cursor platform was delivered with 15 files and no per-group test files.

**Problem:** Maister workflow applied enterprise-phase rigor to a derivative build. Implementation plan checkboxes for groups 4–11 remain unchecked in the plan file despite work-log marking complete — plan/file drift.

**Impact:** Future platform ports (if any) will feel heavyweight; plan no longer reflects reality.

**Recommendation:** For the next platform port, cap at **5 task groups**: scaffold → core build → platform-specific transform → validate+smoke → docs. Skip per-group test file creation; rely on `validate-*` + one golden test.

**Estimated effort:** Process change only.

---

#### M6. `apply_delegation_transforms` uses 35+ sed rules including dangerous catch-all

**Evidence:** `build.sh` lines 179–215. Line 200: `sedi 's|Task tool|subagent tool|g'` runs **after** more specific Task patterns but can still corrupt unrelated prose containing "Task tool" in edge cases.

**Problem:** Same pattern Cursor avoids (Cursor doesn't need delegation transforms). Kiro's longer transform chain increases ordering risk. No shared `platforms/common/sed-transforms.sh` across Cursor/Kiro.

**Recommendation:** Extract shared transforms (todo, plan-mode strip, `maister:` prefix) to `platforms/common/`. Keep Kiro-only transforms (chat gates, delegation) in `kiro-cli/build.sh`. Add one negative fixture test: prose phrase "task tool" in a comment must not become "subagent tool" if unintended.

**Estimated effort:** 4 hours (extract + verify both platforms).

---

### Low

#### L1. `post-compact-reminder-stub.sh` shipped but not wired

**Evidence:** `hooks/post-compact-reminder-stub.sh`; `build.sh` line 308 documents gap; not in `maister.json` hooks. README confirms "not wired."

**Impact:** Minor confusion — executable hook that never runs.

**Recommendation:** Move to `docs/kiro-cli-support.md` known-gaps section only, or rename to `*.md` stub. Drop from `hooks/` copy in build.

---

#### L2. Transform documentation overlap

**Evidence:** `transforms/askuser-to-chat-gate.md` (90 lines) + `transforms/chat-gate-audit.md` (49 lines) + rule 27 requires transform doc exists.

**Recommendation:** Merge audit metrics into `askuser-to-chat-gate.md` appendix; one file.

---

#### L3. `e2e-matrix.test.sh` tests documentation, not behavior

**Evidence:** Greps `docs/kiro-cli-support.md` for `| 1 |` through `| 8 |` table rows.

**Recommendation:** Drop or replace with a single docs lint in CI. Runtime coverage belongs in `smoke-cli.sh`.

---

#### L4. Implementation plan checkbox drift

**Evidence:** Work-log says G1–G12 complete; `implementation-plan.md` groups 4–11 steps still `[ ]`.

**Recommendation:** Update plan checkboxes or add note that work-log is SOT — reduces contributor confusion.

---

#### L5. Chat-gate transforms on source hooks are dead work

**Evidence:** `build.sh` lines 128–132 — `apply_chat_gate_transforms_tree` transforms `OUT/hooks/*.sh` copied from source (which contain `AskUserQuestion` in reminder text). Lines 496–497 — `rm -rf "$OUT/hooks"` and `cp -R "$PLATFORM/hooks"` replace hooks entirely with pre-authored Kiro scripts that already use `CHAT GATE` wording.

**Problem:** Step 8 spends sed cycles on hook files that step 19 discards. Misleading for readers tracing transform order.

**Recommendation:** Remove the `OUT/hooks` branch from `apply_chat_gate_transforms_tree`, or move hook copy before transforms only if source hooks were retained (they are not).

**Estimated effort:** 15 minutes.

---

## Developer Experience

### Friction points

| Area | Assessment |
|------|------------|
| **Onboarding** | Good: `docs/kiro-cli-support.md`, `smoke-install.sh`, `maister-kiro` wrapper |
| **Build feedback** | Moderate: `make build-kiro` works; test suite re-builds excessively |
| **Debugging transforms** | Poor: 124 sed calls across functions; no single "transform trace" mode |
| **Generated artifact contract** | Poor: install-time patches mean output ≠ runtime |
| **Rule discovery** | Moderate: 28 numbered rules in Makefile; duplicates confuse |
| **Pattern consistency** | Good: follows Cursor `sedi()`, step order, override pattern |

### Positive DX choices

- Clear `CORE`/`OUT`/`PLATFORM` vars and step comments in `build.sh`
- Golden fixture for `gap-analyzer` MD→JSON (`tests/fixtures/`)
- `KIRO_HOME` guard refusing install into `~/.kiro/`
- Headless defaults table (3B) embedded in smoke prompts
- `gap-fill.test.sh` covers genuine edge cases (resources from skills frontmatter, hook path fallback) that Makefile rules miss

---

## Requirements Alignment

### Spec requirements vs implementation

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR-1 Build pipeline (22 skills, 26 agents) | ✅ Met | |
| FR-2 MD→JSON agents | ✅ Met | Runtime patch gap (M2) |
| FR-3 Commands→skills merge | ✅ Met | |
| FR-4 Semantic transforms | ✅ Met | Override redundancy (H1) |
| FR-5 Hooks embedded in maister.json | ✅ Met | Path fallback at install |
| FR-6 KIRO_HOME distribution | ✅ Met | |
| FR-7 @prompts (9 files) | ✅ Met | Low value (M4) |
| FR-8 Init integration | ✅ Met | |
| FR-9 Makefile validate | ✅ Met | Redundant rules (H3) |
| FR-10 Todo transforms | ✅ Met | |
| FR-11 Documentation | ✅ Met | |
| FR-12 E2E verification | ⚠️ Partial | Matrix documented; 2a manual |
| FR-13 Release | ✅ Met | |

### Requirement inflation (not in spec, added during implementation)

- 28 validate rules (spec listed 24; rules 25–28 added for chat gates + dir naming)
- ~94 tests across 12 files (spec suggested 2–8 per group; no cap on total)
- `chat-gate-audit.md` as separate artifact
- Fourth smoke test in `smoke-cli.sh` (quick-bugfix) beyond spec's three

### Out-of-scope correctly respected

- No edits to `plugins/maister/` for Kiro
- No Node generator (despite crossing 100-line threshold)
- No `skills-internal/` dual tree
- No CI auto-commit of `plugins/maister-kiro/`

---

## Context Consistency

### Contradictory patterns

| Pattern A | Pattern B | Location |
|-----------|-----------|----------|
| Mechanical sed transforms | Full-file override for same file | `apply_chat_gate_transforms` then `apply_kiro_overrides` for development |
| Build emits `promptFile` | Install rewrites to `prompt` | `generate-agent-json.sh` vs `smoke-install.sh` |
| "Never hand-edit `plugins/maister-kiro/`" | Install mutates JSON in place | `fix_agent_prompts`, `fix_hook_paths` |
| Spec: escalate to Node at ~100 lines | Generator at 208 lines, still bash | `generate-agent-json.sh` |
| Work-log: complete | Plan: groups 4–11 unchecked | `work-log.md` vs `implementation-plan.md` |
| Transform all hooks at step 8 | Replace hooks at step 19 | `apply_chat_gate_transforms_tree` vs hook copy |

### Dead / unused code

- `post-compact-reminder-stub.sh` — copied to output, never hooked (L1)
- Chat gate sed on `development/SKILL.md` — overwritten by override (H1)
- Chat gate sed on source `OUT/hooks/*.sh` — discarded when platform hooks copied (L5)

### Ordering note (correct, not a bug)

Step 8 (chat gates) runs before step 9 (overrides) before steps 7/13–15 (explore, delegation, todo). Overrides for quick-plan/bugfix are **not** re-processed by delegation/todo transforms after copy — those overrides must be pre-adapted. This is consistent but fragile; document in `platforms/kiro-cli/README.md`.

---

## Recommended Simplifications

### Priority 1 — Remove development skill override (H1)

**Before:** 746-line override + 58 sed patterns + audit doc asserting they match.  
**After:** Sed-only for development; overrides only for quick-plan and quick-bugfix.

**Impact:** −746 lines maintenance surface; single transform path; faster builds (skip wasted sed on overwritten file).

---

### Priority 2 — Consolidate test suite (H2 + H3)

**Before:** 12 test files (~1,358 LOC), 28 validate rules (4 redundant).  
**After:** `make validate-kiro` (≤24 rules) + `generator.test.sh` + `gap-fill.test.sh` + `smoke-cli.sh`.

**Impact:** ~60% less test LOC; single source of truth for structural checks; faster local runs.

---

### Priority 3 — Emit runtime-correct JSON from build (M2)

**Before:** `promptFile` + `model: inherit` in build output; patched at install.  
**After:** `generate-agent-json.sh` writes `prompt: "file://./instructions/..."` and omits invalid model values.

**Impact:** `plugins/maister-kiro/` becomes self-describing; simpler mental model for contributors.

---

## Summary Statistics

| Metric | Current | After top-3 simplifications (est.) |
|--------|---------|-------------------------------------|
| Platform files (`kiro-cli/`) | 51 | ~42 |
| Test shell LOC | ~1,358 | ~550 |
| `build.sh` LOC | 548 | ~535 |
| Override SKILL.md LOC | ~912 (3 files) | ~166 (2 files) |
| Validate rules | 28 | ~24 |
| Install-time JSON mutations | 2 functions | 0–1 (hook path only) |
| Maintained prompt files | 9 hand-written | 9 (or 1 YAML → 9) |

---

## Conclusion

Kiro CLI platform support is **not over-engineered at the architectural level** — the MD→JSON pipeline, chat-native gates, command merge, and orchestrator synthesis respond to real Kiro API gaps that Cursor does not have. Copying Cursor's 247-line `build.sh` verbatim was never an option.

The over-engineering is **operational**: duplicate validation layers, a full skill override that mirrors sed output, flattened tool whitelists, magic-number grep thresholds, dead hook transforms, and a 12-group / ~78-step delivery process for a derivative platform. These inflate maintenance cost without improving correctness.

### Action items (ordered by ROI)

1. **Drop `overrides/skills/development/SKILL.md`** — rely on mechanical chat gates (1–2 h)
2. **Deduplicate Makefile rules 11/25 and 14/28**; soften rule 26 (2 h)
3. **Merge or delete 6–8 redundant test files** (4–6 h)
4. **Move `fix_agent_prompts` into build** (3–4 h)
5. **Remove dead hook transform branch** (L5) (15 min)
6. **Tier-based `agent-tools.json`** (2–3 h)
7. **Collapse `generate-agent-json.sh` jq branches** (1–2 h)

**Total estimated simplification effort:** 13–19 hours  
**Risk of simplification:** Low — changes are subtractive; `make validate-kiro` + `smoke-cli.sh` gate correctness.

---

*Review is read-only. No code was modified.*
