# Test Suite Results

**Task**: Add Codex Maister lifecycle skills
**Date**: 2026-07-22
**Execution mode**: local fallback verification after the verification-agent dispatch pool was exhausted

## Passing checks

| Command | Result |
| --- | --- |
| `node --test tests/platform-independent/codex-utility-skills.test.mjs` | 1 passed, 0 failed |
| `make test-overlay TARGET=codex` | passed |
| `make test-evidence` | 46 passed, 0 failed |
| `make test-topology` | passed; violations: `[]` |
| `node --check tests/platform-independent/codex-utility-skills.test.mjs` | passed |
| `git diff --check` | passed |

The focused Codex test materializes the production overlay twice and verifies the five skill files, host-relative frontmatter names, file modes, command semantics, forbidden host vocabulary, and deterministic content hashes.

## Checks with existing repository failures

| Command | Result | Observed blocker |
| --- | --- | --- |
| `make check-cursor-projection` | failed | Existing canonical-source drift for `development`: expected `4fb5185d...`, observed `c8493353...` |
| `make test-core` | 72 passed, 3 failed | The same Cursor projection drift plus stale `E_AGENT_PROJECTION_BINDING` digest for `commands/modeling-aggregate-designer.md`; neither file belongs to this task |
| `node --test tests/platform-independent/release-package.test.mjs` | 1 passed, 6 failed | Six cases are downstream of the Cursor projection failure; the final CLI case additionally reports an unrelated Codex native deployment rollback/recovery failure |

These failures were present outside the approved Codex lifecycle change and the affected source files were not modified. They should be resolved separately before treating the repository-wide release gate as green.

## Verification conclusion

Task-specific checks pass. Repository-wide verification is `passed_with_issues` because unrelated pre-existing projection and deployment-environment failures remain.

## Post-fix rerun

After the explicit native-precedence fix and collision-matrix coverage were added, the complete rerun produced:

- Focused Codex lifecycle test: **2 passed, 0 failed**.
- `make test-overlay TARGET=codex`: **passed**.
- `make test-evidence`: **46 passed, 0 failed**.
- `make test-topology`: **passed; violations: `[]`**.
- `make test-core`: **72 passed, 3 failed** — only the existing Cursor `development` projection drift and two stale Pi command-digest failures remain.
- `make check-cursor-projection`: **failed** on the same pre-existing `development` drift.
- `release-package.test.mjs`: **1 passed, 6 failed** — package cases stop on the same Cursor drift; the final CLI case reports the unrelated `E_RECOVERY_FAILURE` Codex rollback issue.

The prior task-scoped collision failures are resolved. No failure in the rerun implicates the Codex lifecycle assets, explicit native contract, or collision-matrix test.
