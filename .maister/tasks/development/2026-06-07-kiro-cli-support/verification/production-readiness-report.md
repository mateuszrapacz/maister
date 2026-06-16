# Production Readiness Report

**Date**: 2026-06-08  
**Path**: `.maister/tasks/development/2026-06-07-kiro-cli-support` (Kiro CLI platform support)  
**Target**: Production release of `maister-plugins` marketplace (fourth platform: Kiro CLI)  
**Status**: Not Ready

## Executive Summary

- **Recommendation**: **NO-GO**
- **Overall Readiness**: 38%
- **Deployment Risk**: Critical
- **Blockers**: 4 | **Concerns**: 8 | **Recommendations**: 5

Kiro CLI platform support is **architecturally complete** — Makefile aggregates, 28 `validate-kiro` rules, smoke/install/uninstall scripts, `KIRO_HOME` isolation, and user documentation are in place. **Mechanical release gates are broken in the current workspace**: `make build-kiro` fails reproducibly, `make validate-kiro` fails on the partial artifact, and neither `platforms/kiro-cli/` nor `plugins/maister-kiro/` is committed to `master`. A tag-triggered release via `.github/workflows/release.yml` would fail at `make build && make validate`.

Documentation and distribution design are production-quality. Build reliability, artifact discipline, and CI coverage are not.

---

## Category Breakdown

| Category | Score | Status |
|----------|-------|--------|
| Configuration | 70% | With concerns |
| Monitoring | 40% | With concerns |
| Resilience | 25% | Not ready |
| Performance | 80% | Ready |
| Security | 78% | With concerns |
| Deployment | 18% | Not ready |

---

## Blockers (Must Fix)

### 1. `make build-kiro` fails — release gate broken

**Location**: `platforms/kiro-cli/build.sh`  
**Issue**: Build exits non-zero during semantic transforms. Verified on 2026-06-08 after `make clean-kiro`:

```
sed: .../plugins/maister-kiro/skills/orchestrator-framework/references/orchestrator-creation-checklist.md: No such file or directory
```

Earlier attempts also hit paths under `maister-docs-manager/docs/`, `hooks/block-destructive-commands.sh`, and unprefixed skill dirs — consistent with a **partially transformed tree**.

**Root cause**: Nine `find ... | while read` pipelines in `build.sh` iterate files while concurrent steps (`mv`, `rm -rf`, `rename_skill_directories`) mutate `$OUT`. Combined with `set -e` **without** `set -o pipefail`, sed failures in the subshell do not reliably abort the parent; later steps run against a corrupted tree.

**Impact**: `.github/workflows/release.yml` runs `make build && make validate` on every `v*` tag — **release would fail**.

**How to fix**:
1. Add `set -euo pipefail` to `build.sh` and `generate-agent-json.sh`.
2. Replace `find | while read` with `find -print0` + `while IFS= read -r -d ''`, or snapshot file lists before transforms.
3. Optionally add `flock` around the full build body when `make watch` may overlap.
4. Verify green on macOS and Linux: `make clean-kiro && make build-kiro && make validate-kiro`.

**Fixable**: Yes

---

### 2. Generated artifact `plugins/maister-kiro/` not committed

**Location**: `plugins/maister-kiro/`  
**Issue**: `git ls-files plugins/maister-kiro` returns **0 tracked files**. Spec FR-13 and `docs/kiro-cli-support.md` require manual commit (Cursor/Copilot parity).

**Impact**: Users cloning the released repo cannot install Kiro support without a local build that currently fails. Release artifact is incomplete.

**How to fix**: After build is green, `git add plugins/maister-kiro/` and commit per documented checkpoint.

**Fixable**: Yes

---

### 3. Platform sources untracked on `master`

**Location**: `platforms/kiro-cli/`  
**Issue**: Entire Kiro build pipeline (build.sh, tests, smoke scripts, hooks, overrides, wrapper) is **untracked** (`??` in git status).

**Impact**: Production release of maister-plugins would not ship Kiro CLI support at all.

**How to fix**: Commit `platforms/kiro-cli/` with generated artifact in the same release PR.

**Fixable**: Yes

---

### 4. `make validate-kiro` fails on current artifact

**Location**: `Makefile` `validate-kiro` Rule 4  
**Issue**: On the partial/corrupted tree left by failed builds, validation fails:

```
FAIL: plan mode references found
plugins/maister-kiro/skills/maister-quick-plan/SKILL.md: ... EnterPlanMode ...
plugins/maister-kiro/skills/maister-quick-bugfix/SKILL.md: ... EnterPlanMode ...
```

Overrides at `platforms/kiro-cli/overrides/` contain **no** `EnterPlanMode`/`ExitPlanMode` — the failure indicates overrides were never applied because the build did not complete.

**Impact**: Aggregate `make validate` fails; platform test battery cannot pass end-to-end (`build-completion.test.sh`: 1 passed, 7 failed).

**How to fix**: Fix blocker #1, regenerate, confirm Rule 4 passes.

**Fixable**: Yes

---

## Concerns (Should Fix)

### CI integration

| Item | Status | Detail |
|------|--------|--------|
| `release.yml` includes Kiro | ✅ | Runs `make build && make validate` — includes `build-kiro` / `validate-kiro` via Makefile aggregates |
| `build-copilot.yml` auto-rebuild | ⚠️ | Only commits `plugins/maister-copilot/`; Kiro requires manual commit (by design, easy to forget) |
| Dedicated Kiro CI job on PR/push | ❌ | No `build-kiro.yml`; `platforms/kiro-cli/tests/*.test.sh` not run in CI |
| `jq` in CI | ⚠️ | Required by `generate-agent-json.sh` and `validate-kiro`; not explicitly installed in `release.yml` (works on `ubuntu-latest` today, fragile) |

**Recommendation**: Add a PR workflow on `paths: ['plugins/maister/**', 'platforms/**']` running `make build-kiro && make validate-kiro && bash platforms/kiro-cli/tests/*.test.sh`.

---

### Build / validate gates

| Gate | Status |
|------|--------|
| `make build` includes `build-kiro` | ✅ Defined in Makefile |
| `make validate-kiro` (28 rules) | ✅ Comprehensive (jq, CHAT GATE counts, agent JSON, hooks, prompts) |
| `make build-kiro` succeeds | ❌ **Fails** (verified 2026-06-08) |
| `make validate-kiro` passes | ❌ **Fails** Rule 4 on partial artifact |
| `generate-agent-json.sh` error handling | ⚠️ Checks `jq` presence and missing sources; `set -e` only, no `pipefail` |

---

### Smoke scripts

| Script | Status | Notes |
|--------|--------|-------|
| `smoke-install.sh` | ✅ Good | `set -euo pipefail`; refuses `~/.kiro/`; `fix_agent_prompts` + `fix_hook_paths`; `--set-default` opt-in (default N) |
| `smoke-uninstall.sh` | ✅ Good | `set -euo pipefail`; refuses personal `~/.kiro/` removal |
| `smoke-cli.sh` | ⚠️ | **Exits 0 with SKIP** when `kiro-cli` not in PATH — CI without Kiro CLI will not fail |
| `maister-kiro` wrapper | ✅ | `KIRO_HOME="${KIRO_HOME:-$HOME/.kiro-maister}" exec kiro-cli "$@"` |
| Headless tests 1–4 | ☐ Unverified | `kiro-cli` is installed locally (`~/.local/bin/kiro-cli`) but smoke cannot run without a successful build |

---

### Distribution (`KIRO_HOME` profile)

| Item | Status |
|------|--------|
| Isolated `KIRO_HOME=~/.kiro-maister` | ✅ Documented and enforced |
| Never touches `~/.kiro/` | ✅ Guards in install + uninstall |
| Workspace `.kiro/` copy for smoke | ✅ `setup_smoke_workspace` in `smoke-cli.sh` |
| Runtime JSON fixes at install | ✅ `promptFile` → `file://`; `model: inherit` stripped; hook path fallback |
| `marketplace.json` entry | N/A by design — Kiro is repo-distributed, not Claude marketplace |
| README Kiro section | ✅ Install, smoke, hooks note, link to full guide |

---

### Error handling in `build.sh`

| Check | Status |
|-------|--------|
| `set -e` | ✅ Present (line 2) |
| `set -o pipefail` | ❌ Missing — pipeline failures in `find \| while` do not abort parent |
| `set -u` | ❌ Missing — unset vars won't fail fast |
| `sedi()` cross-platform | ✅ macOS/Linux handled |
| `jq empty` on synthesized agents | ✅ After `maister.json` / `maister-explore.json` |
| Input validation (CORE exists) | ⚠️ Implicit via `cp -r` failure only |
| Fail-fast on missing transform targets | ❌ sed errors on deleted paths produce partial output |

Smoke scripts (`smoke-install.sh`, `smoke-cli.sh`, `smoke-uninstall.sh`) correctly use `set -euo pipefail` — build scripts do not match this standard.

---

### Documentation for users

| Document | Status |
|----------|--------|
| `docs/kiro-cli-support.md` | ✅ Comprehensive: install, daily use, build pipeline, E2E matrix, known gaps, manual commit checkpoint |
| `README.md` Kiro section | ✅ Prerequisites, install, smoke, hooks note |
| `build-pipeline.md` Kiro section | ✅ Never-edit rule, layout, API bans |
| `tech-stack.md` fourth platform | ✅ |
| `plugin-development.md` | ✅ `maister-kiro` never-edit rule |
| `cursor-agent-support.md` cross-link | ✅ |
| E2E matrix completion | ⚠️ Most scenarios ☐ draft; scenario 8 ☑ structural only |
| Interactive gate UX (2a) | ☐ Manual only — documented, not automated |

Docs-only tests (`docs-release.test.sh`): **7 of 8 pass**; the reproducible-build assertion fails because `make build-kiro` fails.

---

### Security (Kiro-specific)

| Item | Status |
|------|--------|
| Destructive-command hook | ⚠️ Fails open when `AGENT_TYPE` is empty (allows shell) — subagent tracking race documented in code review |
| Isolated profile | ✅ No merge into personal `~/.kiro/` |
| No secrets in scripts | ✅ |
| Hook scripts executable | ✅ Rule 22 (when build completes) |

---

## Recommendations (Nice to Have)

1. **Pin CI tooling**: Explicitly `sudo apt-get install -y jq` in `release.yml`.
2. **Fail smoke on skip in CI**: `SMOKE_REQUIRE_KIRO=1` env var to make `smoke-cli.sh` exit 1 when `kiro-cli` is absent (release/nightly only).
3. **Pre-merge checklist**: Document manual commit of `plugins/maister-kiro/` in release runbook (Copilot auto-commits; Kiro does not).
4. **E2E scenario sign-off**: Complete manual interactive gate test (scenario 2a) before claiming runtime GO.
5. **Hook hardening**: Reference-counted subagent tracking in `.hook-state/` instead of single `active-agent.type` file.

---

## Verified Checks (What Passed)

- Makefile aggregates: `build`, `validate`, `clean`, `watch` include Kiro targets
- `validate-kiro` rule definitions are thorough (28 rules including CHAT GATE thresholds)
- `smoke-install.sh` / `smoke-uninstall.sh` safety guards and runtime JSON fixes
- `docs/kiro-cli-support.md`, README, standards docs cover install, `KIRO_HOME`, rebuild workflow, known gaps
- `release.yml` architecturally gates all platforms via aggregate `make build && make validate`
- `gap-fill.test.sh`: 7/10 passed (source-level checks; 3 failures require successful build)
- Overrides (`quick-plan`, `quick-bugfix`, `development`) are plan-mode-free and chat-gate adapted

---

## Next Steps (Prioritized)

1. **Fix `build.sh` pipeline** — add `pipefail`/`nounset`, eliminate `find | while` race (blocker #1).
2. **Green local gate** — `make clean-kiro && make build-kiro && make validate-kiro`.
3. **Run full test suite** — `for f in platforms/kiro-cli/tests/*.test.sh; do bash "$f"; done`.
4. **Commit artifacts** — `platforms/kiro-cli/` + `plugins/maister-kiro/` to `master`.
5. **Runtime verification** — `bash platforms/kiro-cli/smoke-cli.sh` (kiro-cli available locally).
6. **Tag only after** steps 1–4 pass; simulate `release.yml` locally before tagging.

---

## Structured Result

```yaml
status: "not_ready"
recommendation: "NO-GO"
report_path: ".maister/tasks/development/2026-06-07-kiro-cli-support/verification/production-readiness-report.md"

overall_readiness: 38
deployment_risk: "critical"

categories:
  configuration: { score: 70, status: "with_concerns" }
  monitoring: { score: 40, status: "with_concerns" }
  resilience: { score: 25, status: "not_ready" }
  performance: { score: 80, status: "ready" }
  security: { score: 78, status: "with_concerns" }
  deployment: { score: 18, status: "not_ready" }

issues:
  - source: "production_readiness"
    severity: "critical"
    category: "deployment"
    description: "make build-kiro fails reproducibly due to find|while pipeline race and missing pipefail"
    location: "platforms/kiro-cli/build.sh"
    fixable: true
    suggestion: "Add set -euo pipefail; replace find|while with find -print0 iteration"

  - source: "production_readiness"
    severity: "critical"
    category: "deployment"
    description: "plugins/maister-kiro/ not committed (0 tracked files)"
    location: "plugins/maister-kiro/"
    fixable: true
    suggestion: "Fix build, regenerate, git add and commit generated artifact"

  - source: "production_readiness"
    severity: "critical"
    category: "deployment"
    description: "platforms/kiro-cli/ untracked on master"
    location: "platforms/kiro-cli/"
    fixable: true
    suggestion: "Commit platform sources with release PR"

  - source: "production_readiness"
    severity: "critical"
    category: "resilience"
    description: "make validate-kiro fails; release.yml make build would fail on tag push"
    location: ".github/workflows/release.yml"
    fixable: true
    suggestion: "Fix build pipeline and regenerate artifact before tagging"

  - source: "production_readiness"
    severity: "warning"
    category: "monitoring"
    description: "smoke-cli.sh exits 0 when kiro-cli not in PATH"
    location: "platforms/kiro-cli/smoke-cli.sh:154-158"
    fixable: true
    suggestion: "Add CI-only flag to fail on skip"

  - source: "production_readiness"
    severity: "warning"
    category: "monitoring"
    description: "No dedicated CI workflow for Kiro platform tests on PR"
    location: ".github/workflows/"
    fixable: true
    suggestion: "Add build-kiro.yml or extend existing workflow paths"

  - source: "production_readiness"
    severity: "warning"
    category: "resilience"
    description: "build.sh uses set -e only; no pipefail or nounset"
    location: "platforms/kiro-cli/build.sh:2"
    fixable: true
    suggestion: "set -euo pipefail per build-pipeline standards"

  - source: "production_readiness"
    severity: "warning"
    category: "security"
    description: "Destructive-command hook fails open when AGENT_TYPE is empty"
    location: "platforms/kiro-cli/hooks/block-destructive-commands-kiro.sh:22-25"
    fixable: true
    suggestion: "Default deny for subagent shell when tracking state is ambiguous"

  - source: "production_readiness"
    severity: "warning"
    category: "deployment"
    description: "E2E verification matrix mostly draft/manual"
    location: "docs/kiro-cli-support.md"
    fixable: false
    suggestion: "Complete manual E2E sign-off before claiming runtime GO"

  - source: "production_readiness"
    severity: "info"
    category: "configuration"
    description: "jq not explicitly installed in release.yml"
    location: ".github/workflows/release.yml"
    fixable: true
    suggestion: "apt-get install jq in CI step"

issue_counts:
  critical: 4
  warning: 5
  info: 1
```
