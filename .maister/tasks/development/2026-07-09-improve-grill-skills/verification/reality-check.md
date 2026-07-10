# Reality Check: Improve Grill Skills

**Task**: `.maister/tasks/development/2026-07-09-improve-grill-skills`  
**Assessor**: maister-reality-assessor  
**Date**: 2026-07-10  
**Spec**: `implementation/spec.md`

## TL;DR

Source skills, catalog, user docs, Kiro build wiring, and structural tests are implemented correctly. After a clean `make build`, **`make validate` passes**, **`build-core.test.sh` passes (8/8)**, and **`phase2.test.sh` passes (14/14)** including FR-5.4 prohibition grep and `/grill-with-docs` shortcut mapping. **Blocker for merge/deploy**: generated platform variants (`maister-kiro`, `maister-cursor`, `maister-copilot`, `maister-kilo`) have **uncommitted drift** — 12 modified/untracked files including new `grill-with-docs` / `maister-grill-with-docs` directories. CI `validate-generated-variants` will fail until `make build` output is committed.

## Key Decisions

- **Functional implementation is complete** — `grill-me` rewritten (63 lines), `grill-with-docs` created (82 lines), both with `disable-model-invocation: true`, invocation guards, convergence gates, and explicit prohibitions.
- **Kiro inventory bump verified** — Makefile rules 14/23/28 and live directory counts: **69 total / 43 `maister-*` / 26 unprefixed shortcuts**.
- **FR-5.4 grep contract satisfied** — All patterns A–F pass in source and generated Kiro output after build.
- **Platform naming transforms are correct** — Kiro exposes both `maister-grill-with-docs` and unprefixed `grill-with-docs` shortcut; Cursor/Copilot/Kilo use platform-appropriate names (`maister-grill-with-docs` on Cursor; `grill-with-docs` on Copilot/Kilo).
- **Quality gate requires committed generated output** — Repo CI runs `make build` then drift-check; current working tree has uncommitted generated files.

## Open Questions / Risks

- **Generated-variant commit gap** — `git status` shows 12 changed/untracked files under `plugins/maister-{copilot,cursor,kiro,kilo}/`. Must commit before merge or CI fails.
- **Fresh-clone validate** — `make validate` fails if `plugins/maister-kiro/` is absent or partial (observed on first run: `jq: Could not open file plugins/maister-kiro/agents/*.json`). Expected until `make build` runs; not a logic bug but an onboarding footgun.
- **Concurrent Kiro builds** — Parallel test invocations contend on `maister-kiro-build.lock` and can corrupt partial trees. Run Kiro structural tests sequentially after a single `make build`.
- **Behavioral criteria untested** — Structural/grep tests verify prohibition *language*; no runtime test confirms agents actually refuse to implement during grilling sessions.

---

## Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `grill-me` read-only grilling discipline | ✅ PASS | Source `plugins/maister/skills/grill-me/SKILL.md`: one-question protocol, convergence gate, prohibitions on docs/code/implementation |
| 2 | `grill-with-docs` docs-aware mode | ✅ PASS | Source `plugins/maister/skills/grill-with-docs/SKILL.md`: language.md/ADR policy, CONTEXT.md prohibition, "Not this skill" boundaries |
| 3 | Explicit-only invocation + catalog suffix | ✅ PASS | Both skills: `disable-model-invocation: true`; catalog lines 554–555 include "Explicit request only." |
| 4 | No CONTEXT.md convention / shared engine | ✅ PASS | Pattern E grep passes; no shared grilling abstraction added |
| 5 | Plugin catalog documents both modes | ✅ PASS | `plugins/maister/CLAUDE.md` lines 554–567 |
| 6 | Kiro inventory 69/43/26 + shortcut | ✅ PASS | Makefile rules 14/23/28; live counts; phase2 `test_grill_with_docs_shortcut` PASS |
| 7 | All four platform variants expose skills | ⚠️ PARTIAL | Built and verified locally; **not all committed to git** |
| 8 | User docs updated (4 files) | ✅ PASS | `docs/on-demand-skills.md`, `docs/commands.md`, `README.md`, `docs/kiro-cli-support.md` |
| 9 | `make build && make validate` passes | ✅ PASS | After clean build (see command output below) |
| 10 | FR-5.4 prohibition structural test | ✅ PASS | `phase2.test.sh` `test_grill_prohibit_implementation` PASS |

---

## Command Execution Results

### 1. `make validate` (initial — before clean build)

**Exit code**: 2  
**Failure**: Kiro Rule 7 — `plugins/maister-kiro/agents/*.json` missing (generated tree absent/partial).

```
Rule 7: all agents/*.json parse with jq...
jq: error: Could not open file plugins/maister-kiro/agents/*.json: No such file or directory
FAIL: invalid JSON plugins/maister-kiro/agents/*.json
make: *** [validate-kiro] Error 1
```

Copilot and Cursor validation passed before Kiro failure.

### 2. `make build && make validate` (after clean rebuild)

**Exit code**: 0 — all platform checks passed.

```
=== Copilot validation ===
Copilot checks passed
=== Cursor validation ===
PR5: skill inventory test...
PASS: skill inventory (30 public skills)
Cursor checks passed
=== Kiro validation ===
Rule 14: exactly 69 skill directories...
Rule 23: exactly 26 unprefixed shortcut skill directories...
Rule 28: exactly 43 maister-* skill directories...
Kiro checks passed
=== Kilo validation ===
Kilo checks passed
```

### 3. `bash platforms/kiro-cli/tests/build-core.test.sh`

**Exit code**: 0  
**Results**: **8 passed, 0 failed**

Key assertions:
- `PASS: exactly 69 skill directories after core build`
- `PASS: exactly 26 unprefixed shortcut skill directories`
- `PASS: exactly 69 total / 43 maister-*` (via validation subset in core tests)

### 4. `bash platforms/kiro-cli/tests/phase2.test.sh`

**Exit code**: 0  
**Results**: **14 passed, 0 failed**

Key assertions:
- `PASS: /grill-with-docs shortcut maps to /maister-grill-with-docs`
- `PASS: grill skills prohibit plan implementation (FR-5.4 grep contract)`
- `PASS: /grill-me and /thermos skills map to maister skills`

**Note**: First parallel invocation failed due to Kiro build lock contention; sequential run after clean `make build` succeeded.

---

## FR-5.4 Grep Contract Verification

Manual grep against source skills (`plugins/maister/skills/*/SKILL.md`):

| Pattern | Target | Result |
|---------|--------|--------|
| A | `grill-me`: `(never\|do not\|prohibit).*(implement\|implementation)` | ✅ PASS |
| B | `grill-with-docs`: same implementation ban | ✅ PASS |
| C | No `proceed to implement` in either skill | ✅ PASS |
| D | `grill-me`: doc/code mutation ban or read-only | ✅ PASS |
| E | `grill-with-docs`: CONTEXT.md / CONTEXT-MAP.md prohibition | ✅ PASS |
| F | Generated Kiro `maister-grill-me` / `maister-grill-with-docs` | ✅ PASS (via phase2 test) |

Representative source phrases:
- `grill-me`: "**Never implement the plan**", "**No documentation edits**", "**No code edits**"
- `grill-with-docs`: "**Never implement the plan**", "**Never create `CONTEXT.md` or `CONTEXT-MAP.md`**"

---

## Platform Variant Presence

| Platform | Path | Status |
|----------|------|--------|
| **Kiro** (prefixed) | `plugins/maister-kiro/skills/maister-grill-with-docs/SKILL.md` | ✅ Present |
| **Kiro** (shortcut) | `plugins/maister-kiro/skills/grill-with-docs/SKILL.md` | ✅ Present — maps to `/maister-grill-with-docs` |
| **Cursor** | `plugins/maister-cursor/skills/maister-grill-with-docs/SKILL.md` | ✅ Present (Cursor PR3: all public skills use `maister-` prefix) |
| **Copilot** | `plugins/maister-copilot/skills/grill-with-docs/SKILL.md` | ✅ Present |
| **Kilo** | `plugins/maister-kilo/.kilo/skills/grill-with-docs/SKILL.md` | ✅ Present |

**Read-only vs docs-writing distinction preserved in generated output:**
- `maister-grill-me`: "**read-only** grilling session"; prohibits doc/code edits
- `maister-grill-with-docs`: allows confirmed `language.md`/ADR edits; prohibits code implementation

---

## Kiro Inventory Counts (Makefile + Live)

| Rule | Expected | Makefile assertion | Live count |
|------|----------|-------------------|------------|
| 14 | 69 total skill dirs | `eq 69` | 69 |
| 23 | 26 unprefixed shortcuts | `eq 26` | 26 |
| 28 | 43 `maister-*` dirs | `eq 43` | 43 |

Makefile excerpts (lines 170–171, 191–192, 203–204):
```
Rule 14: exactly 69 skill directories...
Rule 23: exactly 26 unprefixed shortcut skill directories...
Rule 28: exactly 43 maister-* skill directories...
```

---

## Git / CI Drift

```
 M plugins/maister-copilot/CLAUDE.md
 M plugins/maister-copilot/skills/grill-me/SKILL.md
 M plugins/maister-cursor/skills/maister-grill-me/SKILL.md
 M plugins/maister-kilo/.kilo/rules/maister-workflows.md
 M plugins/maister-kilo/.kilo/skills/grill-me/SKILL.md
 M plugins/maister-kiro/skills/maister-grill-me/SKILL.md
 M plugins/maister-kiro/skills/maister-orchestrator-framework/references/catalog.md
?? plugins/maister-copilot/skills/grill-with-docs/
?? plugins/maister-cursor/skills/maister-grill-with-docs/
?? plugins/maister-kilo/.kilo/skills/grill-with-docs/
?? plugins/maister-kiro/skills/grill-with-docs/
?? plugins/maister-kiro/skills/maister-grill-with-docs/
```

`git diff --quiet` on generated variants: **exit 1** (drift detected).  
`.github/workflows/validate-generated-variants.yml` will fail until committed.

---

## Skill Quality Spot-Check

| Check | grill-me | grill-with-docs |
|-------|----------|-----------------|
| Lines | 63 (within 60–100 target) | 82 (within 60–150 target) |
| `disable-model-invocation` | ✅ | ✅ |
| Invocation guard | ✅ trigger + anti-trigger | ✅ trigger + anti-trigger |
| Convergence gate | ✅ | ✅ |
| "Not this skill" boundaries | N/A (read-only) | ✅ table with 4 related skills |
| Cross-links | → `grill-with-docs` | → `grill-me`, `linguistic-boundary-verifier` |

---

## Deployment Recommendation

**Decision: `issues_found`**

Implementation meets functional spec and passes all quality gates **after `make build`**. The remaining gap is **operational**: generated platform variant files are not committed, which blocks CI and merge readiness.

### Required before merge

1. Run `make build` and commit all generated variant changes under `plugins/maister-{copilot,cursor,kiro,kilo}/`.
2. Re-run `make validate` and confirm `validate-generated-variants` CI job passes.

### Optional hardening

- Document that Kiro structural tests should not run concurrently (build lock).
- Consider a smoke test that invokes grill skills and asserts no file mutations (behavioral, not just grep).

---

## Issue Summary

| Severity | Count | Description |
|----------|-------|-------------|
| Blocker | 1 | Uncommitted generated platform variants (CI drift) |
| Warning | 1 | `make validate` fails on fresh tree without prior `make build` |
| Info | 1 | Kiro test parallelization causes build-lock contention |
