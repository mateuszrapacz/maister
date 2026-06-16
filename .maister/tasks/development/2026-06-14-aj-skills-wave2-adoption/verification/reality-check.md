# Reality Check: Wave 2 AJ Skills Adoption

**Task:** `.maister/tasks/development/2026-06-14-aj-skills-wave2-adoption`  
**Assessor:** reality-assessor  
**Date:** 2026-06-14  
**Spec:** `implementation/spec.md`  
**Gap analysis:** `analysis/gap-analysis.md`

---

## Executive Summary

**Verdict: PARTIAL — source implementation solves the stated problem; CI gate (R7) does not hold reliably.**

Wave 2 deliverables in `plugins/maister/` (source of truth) are present and structurally correct: E2 standard, three AJ skills, three thin commands, ADR-008 soft orchestrator suggestions, and Bundles C/D documentation. Copilot and Cursor variants build and validate cleanly when built sequentially.

**Critical gap:** `make build && make validate` does **not** pass reliably. Kiro build is flaky under concurrent execution (lock contention, mid-build `sed` failures on disappearing files), and `make validate-kiro` fails on incomplete or stale output. The work-log claim that both commands exited 0 is **not reproducible** in this verification run.

Functional goal (port AJ Wave 2 skills into Maister with conventions and docs) is **met in source**. Production-readiness gate (R7/R8) is **not met**.

---

## Problem Statement Alignment

| Gap (from gap-analysis) | Stated resolution | Verified in repo |
|-------------------------|-------------------|------------------|
| G1 — No `language-md-convention` standard | E2 standard + INDEX | **Yes** — `.maister/docs/standards/global/language-md-convention.md` + INDEX entry |
| G2 — Missing `test-strategy-reviewer` | Ported with guard, language gate, chain | **Yes** — `plugins/maister/skills/test-strategy-reviewer/SKILL.md` |
| G3 — Missing `linguistic-boundary-verifier` | Ported with graceful degradation | **Yes** — includes "Convention not adopted" path + standard link |
| G4 — Missing `metaprogram-classifier` | Ported with language gate, grill-me chain | **Yes** — `Recommended next steps` chains to `grill-me` |
| G5 — Missing Wave 2 commands | 3 thin Skill wrappers | **Yes** — all three have `ACTION REQUIRED` + Skill tool delegation |
| G6 — No ADR-008 soft suggestions | development Phase 5, product-design Phase 1 | **Yes** — optional suggestions, no auto-invocation |
| G7 — CLAUDE.md / README gaps | Bundles C/D + command tables | **Yes** — both document Wave 2 commands and bundle flows |
| G8 — Kiro counts stale | 63/25/38 after build | **Conditional** — correct counts observed after one clean build; not stable under flaky builds |

---

## Requirement Verification (R1–R8)

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| R1 | `language-md-convention` standard + INDEX | **PASS** | Standard file exists; INDEX line 50 references it |
| R2 | Three skills with Maister conventions | **PASS** | Kebab-case dirs, frontmatter, invocation guards on all three |
| R3 | Review skills have `disable-model-invocation: true` | **PASS** | Present on `test-strategy-reviewer`, `linguistic-boundary-verifier`; absent on `metaprogram-classifier` (correct) |
| R4 | Three ACTION REQUIRED command wrappers | **PASS** | `reviews-test-strategy.md`, `reviews-linguistic-boundaries.md`, `quick-metaprogram-classifier.md` |
| R5 | Soft suggestions only in orchestrators | **PASS** | development Phase 5 → `requirements-critic`; product-design Phase 1 → `transcript-critic`; no auto-invoke |
| R6 | CLAUDE.md and README document Bundles C/D | **PASS** | Bundle C (linguistic → test strategy), Bundle D (metaprogram → grill-me) |
| R7 | `make build && make validate` exit 0 | **FAIL** | See Build/CI section |
| R8 | Kiro counts 63 skills, 25 shortcuts, 38 maister-* | **CONDITIONAL** | 63/25/38 after one successful clean build; fails when build incomplete |

---

## Structural Checks

### Skills (source)

| Skill | Guard | Language gate | Chain section | Notes |
|-------|-------|---------------|---------------|-------|
| `test-strategy-reviewer` | Yes | AskUserQuestion | Recommended next steps → problem-classifier, thermos | `disable-model-invocation: true` |
| `linguistic-boundary-verifier` | Yes | N/A (read-only) | Recommended next steps → test-strategy-reviewer | Graceful degradation when no `language.md` |
| `metaprogram-classifier` | Yes | AskUserQuestion | Recommended next steps → grill-me | Interactive (no disable-model-invocation) |

### Commands (source)

All three commands follow the Wave 1 thin-wrapper pattern:

```markdown
**ACTION REQUIRED**: ... Invoke the `<skill>` skill via the Skill tool NOW ...
Invoke Skill tool:
  skill: "<skill>"
  args: "[user arguments from command]"
```

### Generated variants (spot-check)

| Platform | Wave 2 skills | Wave 2 commands | Validate |
|----------|---------------|-----------------|----------|
| Copilot | Present under `plugins/maister-copilot/skills/` | Present under `commands/` | **PASS** (`make validate-copilot`) |
| Cursor | Present under `plugins/maister-cursor/skills/` | Present under `commands/` | **PASS** after `make build-cursor` |
| Kiro | `maister-test-strategy-reviewer`, `maister-linguistic-boundary-verifier`, `maister-metaprogram-classifier`, merged command skills | Merged into `skills/maister-*/` | **FAIL** — see below |

Kiro `build.sh` includes Wave 2 entries in `merge_one`, `skills_needing_args`, and `apply_delegation_transforms` cross-refs (lines 65–67, 210–215, 305–316).

---

## Build / CI Evidence

### Commands run

```text
make build && make validate          → FAIL (Kiro validate Rule 2: maister: prefix)
make build-cursor                    → PASS
make validate-copilot                → PASS
make validate-cursor                 → PASS (after build-cursor)
make clean-kiro && make build-kiro   → Intermittent FAIL (sed: file not found mid-build)
bash platforms/kiro-cli/tests/build-core.test.sh    → 5 passed, 3 failed
bash platforms/kiro-cli/tests/validation.test.sh    → 3 passed, 5 failed
```

### Successful Kiro build (one clean run)

After `make clean-kiro && make build-kiro` completed without error:

- Total skill dirs: **63**
- Unprefixed shortcut dirs: **25**
- maister-* dirs: **38**

### Failure modes observed

1. **Concurrent Kiro builds** — lock file at `$TMPDIR/maister-kiro-build.lock.d`; parallel test suites trigger `FAIL: another Kiro build is in progress` or corrupted partial output.
2. **Mid-build sed failures** — e.g. `sed: .../maister-docs-manager/docs/standards/frontend/accessibility.md: No such file or directory` while `find | sed` iterates; suggests race or incomplete copy before transforms.
3. **Stale Kiro tree** — `validate-kiro` Rule 2 finds `maister:` prefixes when output is from an interrupted build (commands dir not merged, transforms not applied).
4. **Rule 4 (EnterPlanMode)** — failed on `maister-quick-plan` and `maister-quick-bugfix` overrides when build completed but plan-mode strip did not cover override files (pre-existing Kiro platform issue, not Wave 2-specific).

### Work-log discrepancy

`implementation/work-log.md` records `make build` and `make validate` both exit 0. This verification **could not reproduce** a full green `make validate` in the current environment.

---

## Documentation vs Reality

| Documented | Reality | Match |
|------------|---------|-------|
| Bundles C/D in README and CLAUDE.md | Commands and skills exist; bundle ordering documented | **Yes** |
| `language-md-convention.md` referenced from Bundle C | Standard file exists | **Yes** |
| Reviews delegation note (Wave 2 → Skill tool) | Command files delegate to skills, not subagents | **Yes** |
| Kiro @ shortcuts for Wave 2 commands | Deferred per spec | **Yes (intentionally absent)** |
| `make validate` passes | Fails intermittently on Kiro | **No** |

---

## Critical Gaps

1. **R7 not satisfied — `make validate` fails.** Copilot/Cursor pass; Kiro fails on Rule 2 (`maister:` prefixes), Rule 4 (EnterPlanMode in overrides), or Rule 7 (invalid/missing agent JSON) depending on build completeness. **Blocks spec acceptance.**

2. **Kiro build reliability.** Build script fails under parallel invocation (test suites, concurrent `make build`). Partial builds leave Wave 2 merged commands with untransformed skill references (e.g. `skill: "test-strategy-reviewer"` instead of `maister-test-strategy-reviewer` on Kiro). **Blocks R8 verification and Kiro platform usability.**

3. **Work-log false completion signal.** Implementation plan Group 6 checkbox and work-log table claim validate passed; reality check contradicts this. **Risk of shipping with broken CI gate.**

---

## Non-Critical / Informational

- **Deferred items correctly out of scope:** Kiro @ shortcuts for Wave 2, `implementation-verifier` test-strategy mention (8D), `language-md-generator`.
- **Wave 2 does not introduce orchestrator auto-invocation** — ADR-008 soft suggestions only; verified.
- **Source skill count:** 26 skill directories in `plugins/maister/skills/` (includes Wave 2 additions).

---

## Recommendation

**Do not mark Wave 2 complete for release until R7 is green.**

Suggested fixes (outside this report's scope):

1. Serialize Kiro builds in test harnesses (single lock holder; no overlapping `make build-kiro` from parallel test functions).
2. Harden `platforms/kiro-cli/build.sh` — guard `sedi` with `[ -f "$f" ]` in all transform loops; avoid processing files under directories being `mv`'d.
3. Extend plan-mode strip to Kiro override files (`quick-plan`, `quick-bugfix`).
4. Re-run `make build && make validate` once in a clean, single-threaded environment and update work-log with actual exit codes.

---

## Conclusion

The Wave 2 AJ skills adoption **does solve the functional problem** in `plugins/maister/`: standards, skills, commands, orchestrator hints, and user-facing documentation are implemented and align with `spec.md` and `gap-analysis.md`.

The implementation **does not fully satisfy the acceptance gate** because CI validation is unreliable and the documented "all green" build result is not reproducible. Treat Wave 2 as **functionally complete, operationally incomplete**.
