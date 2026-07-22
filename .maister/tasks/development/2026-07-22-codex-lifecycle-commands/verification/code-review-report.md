# Code Review Report

## Summary

- **Status:** Changes requested
- **Review role:** `maister:code-reviewer`, delegated by `implementation-verifier`
- **Review basis:** active task state snapshot at revision 14, phase 11; approved scope in `orchestrator-state.yml`; repository standards indexed by `.maister/docs/INDEX.md`
- **State mutation:** none by this reviewer; `orchestrator-state.yml` was read only. It was later observed at revision 15 with the workflow still in phase 11 and a pending verification-fix-selection gate.
- **Issue counts:** 0 critical, 1 high, 1 medium, 0 low

The Codex utility assets, overlay mapping, parity cleanup, documentation, and focused materialization test match the approved feature boundary. The Codex-focused checks pass. The shared materializer change needs a narrower, explicit precedence contract before approval because it currently weakens the repository's fail-closed collision invariant for unrelated asset/common paths.

## Findings

### P1 — Native precedence is broader than the approved collision contract

**Location:** `plugins/maister/lib/distribution/materializer.mjs:285-289`, with the `native` flag derived at line 277 from `source.startsWith("assets/")`.

The new collision branch gives every `assets/*` layout entry precedence over every non-native file at the same destination. This is broader than the approved scope, which requires Codex lifecycle assets to replace their matching common files while unrelated collisions remain rejected. There is no overlay-level opt-in or destination restriction for this behavior.

I reproduced this with an in-memory assembly plan using the unrelated pair `common/skills/development/SKILL.md` and `assets/skills/bye/SKILL.md`, both mapped to `skills/development/SKILL.md`; the plan silently retained the asset instead of raising `E_MATERIALIZE_COLLISION`.

**Impact:** A future or accidental asset/common destination collision can silently replace a common file, bypassing the materializer's documented fail-closed collision validation. This affects all targets using the shared materializer, not only the five intended Codex lifecycle files.

**Recommendation:** Make native precedence explicit in the layout contract and enable it only for the Codex `assets/skills` mapping, or otherwise constrain the rule to the approved lifecycle destinations. Preserve collision errors for unrelated asset/common mappings and add a contract test for that behavior.

### P2 — Focused test does not cover the precedence/collision matrix

**Location:** `tests/platform-independent/codex-utility-skills.test.mjs:42-65`.

The test proves that the five final Codex files contain the native instructions, which indirectly exercises the intended override. It does not directly prove the new shared materializer contract: native-over-common wins in both layout orders, native-over-native still fails, and unrelated asset-over-common collisions still fail.

**Impact:** A future refactor could broaden or weaken collision handling while the focused test continues to pass for the current five files.

**Recommendation:** Add small `buildAssemblyPlan` cases covering the three collision outcomes above. Keep the production Codex materialization assertions in the existing focused test.

## Standards review

Passes observed:

- Codex assets use host-relative frontmatter names (`bye`, `dev`, `next`, `resume`, `status`) and avoid Cursor/Claude/Pi vocabulary.
- The overlay uses a merged tree with explicit modes and keeps the common portable inventory unchanged.
- The parity change removes exactly the ten approved lifecycle directory/file observations; unrelated expected-deletion entries remain present.
- Documentation describes all five `$maister:*` entrypoints and their read-only/state-preserving semantics.
- The focused test is behavior-oriented and verifies deterministic materialization, frontmatter, permissions, inventory, syntax, and target vocabulary.

The P1 finding conflicts with the validation standard's requirement that the materializer reject collisions and fail closed. The P2 finding is a critical-path test coverage gap rather than a current test failure.

## Approved-scope review

The following production/test/docs changes are within the approved scope:

- `plugins/maister/overlays/codex/assets/skills/{bye,dev,next,resume,status}/SKILL.md`
- `plugins/maister/overlays/codex/overlay.yml`
- `plugins/maister/lib/distribution/materializer.mjs`
- `tests/platform-independent/codex-utility-skills.test.mjs`
- `plugins/maister/overlays/codex/parity-baseline.json`
- `docs/commands.md`

No Cursor projection, Pi host-probe/evidence, Kiro command, launcher, legacy builder, or state-schema changes were attributed to this task.

## Verification evidence

| Check | Result | Notes |
| --- | --- | --- |
| `node --test tests/platform-independent/codex-utility-skills.test.mjs` | PASS | 1/1 test passed |
| `make test-overlay TARGET=codex` | PASS | Overlay contract validated |
| `make test-evidence` | PASS | 46/46 tests passed |
| `make test-topology` | PASS | No violations |
| `make check-cursor-projection` | PRE-EXISTING FAILURE | Canonical `development` projection hash drift |
| `node --test tests/platform-independent/source-materializer.test.mjs` | PRE-EXISTING FAILURE | 37 passed, 2 failed on stale Pi command projection digest |
| `make test-core` | PRE-EXISTING FAILURE | Same Cursor projection drift plus stale Pi command projection digest |

The failed checks do not involve the reviewed Codex files. The worktree already contains unrelated modified Pi probe/evidence files and separate Cursor/Pi task residue; those changes were not edited or counted as findings for this review.

## Reviewed artifact

This report was written only to:

`.maister/tasks/development/2026-07-22-codex-lifecycle-commands/verification/code-review-report.md`

## Post-fix re-review

The requested P1/P2 findings are resolved:

- precedence is now opt-in through the overlay layout's explicit `native: true` property;
- the Codex and existing Kiro skills trees declare that property explicitly;
- unmarked asset/common collisions remain rejected;
- native/native collisions remain rejected;
- the focused Codex test directly covers both layout orders and both rejection cases.

The implementation plan and approved scope now explicitly include the shared materializer/overlay-loader contract change. Post-fix task-scoped checks pass. The re-review verdict is **approved with unrelated repository verification issues**; the remaining Cursor projection, Pi digest, and deployment rollback failures are outside this task.
