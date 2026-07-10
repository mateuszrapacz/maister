# Code Review Report — Improve Grill Skills

**Task**: `.maister/tasks/development/2026-07-09-improve-grill-skills`  
**Reviewer**: maister-code-reviewer (read-only)  
**Date**: 2026-07-10  
**Scope**: Source skills, catalog, build transforms, Kiro tests, user docs, generated variant spot-check

## TL;DR

Implementation delivers the spec’s two-mode grilling model: a strengthened read-only `grill-me` and a new docs-maintaining `grill-with-docs`, with Kiro inventory bumps (69/43/26), FR-5.4 grep contract tests, and user-doc parity. Skill content is principle-based, explicit-only, and prohibition language is grep-testable. **Verdict: pass-with-issues** — no security concerns; two warnings on platform cross-reference transforms and Bundle D user-doc consistency; workspace Kiro output appeared incomplete at review time (43 skills, no shortcuts), though work-log records a prior green `make validate`.

## Key Decisions

- **Two explicit modes (D1)** — `grill-me` prohibits all file mutation; `grill-with-docs` allows confirmed `language.md`/ADR edits only; both prohibit plan implementation.
- **Duplicated protocol (D2)** — Shared grilling rules copied into both `SKILL.md` files with explicit protocol-parity cross-references.
- **TDD-first inventory (D7)** — Makefile rules 14/23/28 and three Kiro test files updated in lockstep before skill content.
- **FR-5.4 grep contract** — Six-pattern prohibition test in `phase2.test.sh` guards source and (when present) generated output.
- **Kiro shortcuts** — `generate_shortcut_skill` for `/grill-with-docs` → `maister-grill-with-docs`; `maister-grill-with-docs` added to `skills_needing_args`.

## Open Questions / Risks

- **Generated tree freshness** — At review time `plugins/maister-kiro/skills` had 43 `maister-*` dirs and 0 shortcut dirs (expected 69/26). A concurrent build lock blocked rebuild; work-log claims post-implementation `make validate` PASS. Re-run `make build && make validate` before merge to confirm.
- **Cross-skill name transforms** — Cursor/Kiro builds transform `` `grill-with-docs` `` but not `` `grill-me` `` or bare `` `context-distiller` `` references inside `grill-with-docs`; this matches a pre-existing pipeline gap but affects new cross-links.
- **Behavioral enforcement** — Grep contract covers prohibition *wording*, not runtime agent compliance; session behavior still relies on model adherence to SKILL.md prose.

---

## 1. Files Reviewed

| Area | Files |
|------|-------|
| Source skills | `plugins/maister/skills/grill-me/SKILL.md`, `plugins/maister/skills/grill-with-docs/SKILL.md` |
| Catalog | `plugins/maister/CLAUDE.md` |
| Build | `platforms/kiro-cli/build.sh`, `platforms/cursor/build.sh`, `Makefile` |
| Tests | `platforms/kiro-cli/tests/phase2.test.sh`, `build-core.test.sh`, `validation.test.sh` |
| User docs | `docs/on-demand-skills.md`, `docs/commands.md`, `docs/kiro-cli-support.md`, `README.md` |
| Generated (spot-check) | `plugins/maister-cursor/skills/maister-grill-*`, `plugins/maister-kiro/skills/maister-grill-*`, `plugins/maister-copilot/skills/grill-*` |

---

## 2. Content Quality

### 2.1 `grill-me` (64 lines)

**Strengths**

- Meets FR-1 frontmatter: `disable-model-invocation: true`, explicit description, `argument-hint`.
- Invocation guard with trigger phrases and anti-triggers mirrors `thermos` / `requirements-critic` patterns.
- Grilling protocol covers one-question discipline, facts-vs-decisions split, dependency tracking, and convergence gate (FR-1.3–1.8).
- Prohibitions section is explicit and grep-friendly: “Never implement the plan”, “No documentation edits”, “No code edits” (FR-1.9).
- Principles are concise; line count within FR-1.10 (~60–100).
- Handoff to `grill-with-docs` when user wants doc maintenance.

**Minor gaps**

- No dedicated “Not this skill” table (present in `grill-with-docs`); acceptable given read-only scope and cross-link at line 47.

### 2.2 `grill-with-docs` (85 lines)

**Strengths**

- FR-2 coverage: session discovery, vocabulary/boundary testing, `language.md` maintenance rules, sparse ADR policy with three significance criteria, CONTEXT.md prohibition, “Not this skill” boundary table.
- User-confirmed edit granularity (“one confirmed term, one edit”) addresses spec-audit ambiguity on batch vs per-term edits.
- ADR skeleton is minimal MADR (6 lines) — appropriate for a reference example.
- Prohibits production code **and tests** for the plan under discussion — stronger than `grill-me` and appropriate for docs-only mode.

**Minor gaps**

- Missing **Input** section that `grill-me` has (argument vs conversation scan). Low impact — invocation guard covers intent; consider parity in a follow-up.
- Protocol parity line references `` `grill-me` `` (unprefixed) — see §4 platform transforms.

### 2.3 `plugins/maister/CLAUDE.md`

- `grill-with-docs` added to Review & Utility Skills table with “Explicit request only.” suffix (FR-3.1–3.3).
- Bundle D updated: `grill-with-docs` documented as standalone alternative, not a third step (FR-3.4, D6).
- “Grilling vs modeling/review” callout distinguishes grilling from `context-distiller`, `aggregate-designer`, `linguistic-boundary-verifier` (FR-3.4).
- Catalog entries remain short; operational detail deferred to SKILL.md (FR-3.5).

### 2.4 User documentation

| File | Assessment |
|------|------------|
| `docs/on-demand-skills.md` | Strong: explicit-request list, trigger phrases, full `grill-with-docs` catalog entry, comparison table “Grilling and modeling — when to use which skill”. |
| `docs/commands.md` | `grill-me` and `grill-with-docs` sections with Cursor invocation paths; convergence gate and read-only called out. |
| `docs/kiro-cli-support.md` | `/grill-with-docs` shortcut row added (FR-7). |
| `README.md` | Kiro shortcut list includes `/grill-with-docs`. |

**Doc inconsistency (warning)**: Bundle D mermaid in `docs/on-demand-skills.md` (§4) still shows only `metaprogram-classifier → grill-me`. `CLAUDE.md` documents `grill-with-docs` as a standalone alternative — user docs could add a one-line note under Bundle D for parity.

---

## 3. Prohibition Grep Contract (FR-5.4)

`test_grill_prohibit_implementation` in `phase2.test.sh` implements patterns A–F:

| Pattern | Check | Source result |
|---------|-------|---------------|
| A | `grill-me` prohibits implementation | PASS |
| B | `grill-with-docs` prohibits implementation | PASS |
| C | No “proceed to implement” permissive language | PASS |
| D | `grill-me` prohibits doc/code mutation OR read-only | PASS |
| E | `grill-with-docs` prohibits CONTEXT.md / CONTEXT-MAP.md | PASS |
| F | Prohibition survives build (generated files) | PASS on existing `maister-grill-*` in tree |

**Strengths**

- Patterns use case-insensitive extended regex aligned with actual prohibition prose.
- Pattern D accepts alternate phrasing (`read-only`, “No documentation edits”) — robust to wording variants.
- Red-gate tolerance: Pattern F skips missing generated files (lines 165–175) — correct for TDD red phase.

**Gaps (info)**

- Pattern F validates implementation prohibition only on generated output — not Pattern D/E on generated files. A transform could strip read-only/CONTEXT prohibitions while leaving “never implement” and tests would still pass.
- Pattern C checks only exact phrase `proceed to implement` — narrow but sufficient for current content.

Manual grep verification (reviewer): all six patterns pass against current source and generated `maister-grill-*` SKILL.md files.

---

## 4. Build Script Correctness

### 4.1 `platforms/kiro-cli/build.sh`

| Change | Assessment |
|--------|------------|
| `maister-grill-with-docs` in `skills_needing_args` | Correct — mirrors `maister-grill-me`; enables `$ARGUMENTS` injection. |
| `generate_shortcut_skill "grill-with-docs" … "maister-grill-with-docs"` | Correct — FR-4.2. |
| Sed: `run \`grill-with-docs\`` and `` `grill-with-docs` `` → `maister-grill-with-docs` | Correct for `grill-me` Recommended Next Steps and protocol parity. |

Generated `maister-grill-me` includes `**User input**: \`$ARGUMENTS\`` and transforms `/maister:` commands to `/maister-*` slash form.

### 4.2 `platforms/cursor/build.sh`

- Same `grill-with-docs` sed lines as Kiro (FR-4.5).
- Cursor inventory: 30 public skills including `maister-grill-me` and `maister-grill-with-docs` — within `skill-inventory.test.sh` band 27–31 (FR-5.6 N/A).

### 4.3 Platform cross-reference gap (warning)

In generated Cursor/Kiro `maister-grill-with-docs/SKILL.md`, these references remain **unprefixed**:

- `` route those to `context-distiller` or `aggregate-designer` ``
- `` Same core discipline as `grill-me` ``
- “Not this skill” table entries: `` `grill-me` ``, `` `context-distiller` ``, etc.

The build pipeline transforms `skill \`context-distiller\``, `run \`context-distiller\``, and `` `grill-with-docs` `` but not bare `` `grill-me` `` or routing phrases. This is a **pre-existing** pattern (e.g. `maister-linguistic-boundary-verifier` also references `` `context-distiller` `` unprefixed in Cursor output). The grill task **introduces new** `grill-me` ↔ `grill-with-docs` cross-links where only one direction is transformed.

**Recommendation**: Add sed rules for `` `grill-me` `` → `` `maister-grill-me` `` (and optionally bare modeling-skill backticks) in both `platforms/cursor/build.sh` and `platforms/kiro-cli/build.sh`, or document that agents resolve unprefixed names on Claude Code source only.

### 4.4 `Makefile`

Rules 14, 23, 28 updated 67→69, 25→26, 42→43 — arithmetic consistent (+1 `maister-grill-with-docs`, +1 `grill-with-docs` shortcut).

---

## 5. Test Coverage

| Test file | New/updated assertions | Assessment |
|-----------|------------------------|------------|
| `build-core.test.sh` | 69 total dirs, 26 unprefixed shortcuts | Aligned with Makefile |
| `validation.test.sh` | `test_exactly_69_skill_dirs` (69/43) | Aligned |
| `phase2.test.sh` | `test_grill_with_docs_shortcut`, `test_grill_prohibit_implementation` | Covers FR-5.1, FR-5.4 |

**Not covered (acceptable per spec)**

- Cursor-specific prohibition grep (FR-5.6 “Should” — skipped; inventory band sufficient).
- Behavioral/integration tests for grilling sessions (spec defers to manual review).

**Workspace note**: `test_grill_with_docs_shortcut` requires `$OUT/skills/grill-with-docs/` — failed against current tree (0 shortcut dirs). Rebuild required for green CI.

---

## 6. Generated Variant Spot-Check

| Variant | `grill-me` | `grill-with-docs` | Notes |
|---------|------------|-------------------|-------|
| `maister-cursor` | `maister-grill-me/SKILL.md` ✓ | `maister-grill-with-docs/SKILL.md` ✓ | 30 skills; prohibitions intact; cross-refs partially unprefixed |
| `maister-kiro` | `maister-grill-me/SKILL.md` ✓ | `maister-grill-with-docs/SKILL.md` ✓ | `$ARGUMENTS` injected; **shortcut dirs absent** in workspace at review |
| `maister-copilot` | `grill-with-docs/SKILL.md` ✓ | Unprefixed names (expected for Copilot) | `CLAUDE.md` catalog updated |

`maister-kilo` `.kilo/skills/grill-with-docs` present; rules file references updated.

---

## 7. Security

No security findings. Changes are Markdown documentation and Bash test/build scripts. No credentials, shell injection vectors, or unsafe execution patterns introduced. Prohibition language reduces risk of unintended file mutation during grilling sessions (policy, not enforcement).

---

## 8. Spec Traceability Summary

| Requirement group | Status |
|-------------------|--------|
| FR-1 Strengthen `grill-me` | Met |
| FR-2 Add `grill-with-docs` | Met (minor Input section gap) |
| FR-3 Plugin catalog | Met |
| FR-4 Kiro generation | Met in source; generated shortcuts unverified in workspace |
| FR-5 Structural tests | Met in source |
| FR-6 Build/validate | Claimed pass in work-log; workspace stale at review |
| FR-7 User docs | Met (Bundle D diagram note optional) |

---

## 9. Findings Summary

| Severity | Count | Description |
|----------|------:|-------------|
| Critical | 0 | — |
| Warning | 2 | Incomplete Kiro generated tree at review; partial platform skill-name transforms for new cross-links |
| Info | 4 | Missing Input in `grill-with-docs`; Bundle D diagram omission; Pattern F scope; grep red-gate skip behavior |

---

## 10. Recommendations

1. **Before merge**: Run `make build && make validate` and confirm 69/43/26 Kiro counts and `/grill-with-docs` shortcut exist.
2. **Optional follow-up**: Add `` `grill-me` `` → `` `maister-grill-me` `` sed to Cursor/Kiro builds; extend Pattern F to check read-only/CONTEXT prohibitions on generated files.
3. **Optional doc polish**: Add Bundle D note for `grill-with-docs` standalone use in `docs/on-demand-skills.md`; add Input section to `grill-with-docs` for parity with `grill-me`.
