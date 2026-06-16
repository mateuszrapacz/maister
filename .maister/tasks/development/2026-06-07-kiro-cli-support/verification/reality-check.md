# Reality Check: Maister Kiro CLI Platform Support

**Assessor:** maister-reality-assessor  
**Date:** 2026-06-08  
**Task path:** `.maister/tasks/development/2026-06-07-kiro-cli-support`  
**Research question:** Jak przygotować implementację wsparcia kiro-cli analogicznie do Cursor, Copilot i Claude Code?

---

## Status

**⚠️ Issues Found** — architecture and happy-path behavior are largely in place, but the delivery is **not production-ready** and does **not reliably solve** the problem end-to-end.

| Dimension | Verdict |
|-----------|---------|
| Solves research question (design) | ✅ Yes — Cursor-pattern fourth platform with Kiro-specific transforms |
| Solves research question (shippable product) | ❌ No — flaky build, uncommitted artifacts, hook runtime gaps |
| Matches spec (structural) | ⚠️ When build completes: all 28 validate rules pass |
| Matches spec (runtime) | ⚠️ Headless smoke passes; hooks fail; full E2E not proven |
| Ready for release / tag push | ❌ **NO-GO** |

---

## Reality vs Claims

| Claim | Reality | Evidence |
|-------|---------|----------|
| Work-log: "Implementation Complete" | **Overstated** | Build is flaky; artifacts untracked; hooks error at runtime in smoke |
| Work-log: "`make validate-kiro` passes (28 rules)" | **Conditionally true** | Passes after a **successful** clean build; fails on partial/corrupt trees |
| Work-log: "gap-fill 10/10" | **True when build succeeds** | Re-ran: 10 passed after successful build; 7/10 when build failed mid-suite |
| Spec: `make build && make validate` green | **Unreliable** | First invocation in this session failed; 3/5 rapid rebuilds failed; concurrent `build.sh` processes observed |
| Spec: committed `plugins/maister-kiro/` | **False** | `git status`: `?? platforms/kiro-cli/`, `?? plugins/maister-kiro/` |
| Spec: smoke-cli 3 headless tests | **Exceeded** | 4/4 passed (`smoke-cli.sh` exit 0) with `kiro-cli 2.6.0` installed |
| Spec: hooks execute in smoke | **False** | Every test logged `exit code 127` for `../hooks/*.sh` — hooks never ran |

---

## Test Execution Summary

Commands run during this assessment (in order):

```bash
make build-kiro && make validate-kiro && bash platforms/kiro-cli/tests/gap-fill.test.sh   # FAILED (build)
make clean-kiro && make build-kiro                                                       # FAILED (sed missing file)
rm -rf plugins/maister-kiro && bash platforms/kiro-cli/build.sh                          # SUCCESS → validate 28/28
bash platforms/kiro-cli/tests/gap-fill.test.sh                                           # 10/10 PASS
bash platforms/kiro-cli/smoke-cli.sh                                                     # 4/4 PASS (hooks errored)
bash platforms/kiro-cli/tests/generator.test.sh                                          # 8/8 PASS (isolated)
```

### Structural validation (`validate-kiro`)

After one successful clean build:

- **Rules 1–28:** all passed
- **26 JSON agents** generated (`maister.json`, `maister-explore.json`, 24 converted)
- **22 `maister-*` skill directories**, no `commands/`
- **9 prompts**, `settings/mcp.json`, embedded hooks in `maister.json`
- **CHAT GATE** markers present (rule 26 thresholds met on success path)

After failed/partial builds:

- Rule 4 failed (`EnterPlanMode` in quick-plan/quick-bugfix — overrides never applied)
- Rule 13 failed (empty `name:` — corrupt skill tree)
- Zero `agents/*.json` (generator step never reached)

### Feature tests

| Suite | Result | Notes |
|-------|--------|-------|
| `generator.test.sh` | 8/8 PASS | MD→JSON, golden gap-analyzer, 24 agents — **works in isolation** |
| `gap-fill.test.sh` | 10/10 when build green | Generator edge cases, hook path fallback unit tests, resume docs |
| `smoke-cli.sh` | 4/4 PASS | Init detection, gap-analyzer subagent, quick-plan + quick-bugfix artifacts |

### Smoke install

`smoke-cli.sh` calls `make build-kiro` at start, then `setup_smoke_workspace` with `fix_hook_paths`. Install isolation design is sound (`KIRO_HOME` ephemeral, never touches `~/.kiro/`), but **hook scripts do not execute** in the workspace `.kiro/` copy pattern (see Critical Gap #3).

---

## Critical Gaps

### C1. Build pipeline is flaky — release gate will fail intermittently

**Claim:** `make build-kiro` produces reproducible `plugins/maister-kiro/`.  
**Reality:** Build fails often with `sed: … No such file or directory` or `cp: … No such file or directory`.

**Root cause (verified in `platforms/kiro-cli/build.sh`):**

Nine pipelines use `find … | while read -r f`, which runs the `while` loop in a **subshell** that races with the main script:

```125:127:platforms/kiro-cli/build.sh
  find "$OUT" -name "*.md" | while read -r f; do
    apply_chat_gate_transforms "$f"
  done
```

The main script proceeds to `merge_commands_to_skills`, `rename_skill_directories`, etc., while the subshell still sed-processes paths that have been moved or deleted. Same pattern at lines 129, 137, 247, 260, 263, 268, 286, 354, 368.

**Additional aggravators:**

- No `set -o pipefail` — subshell sed failures are not always propagated cleanly
- Concurrent `build.sh` processes observed during assessment (`ps` showed 2+ instances)
- Failed builds leave trees that `rm -rf` cannot always clean (`Directory not empty`)
- `make watch` (fswatch → `make build`) can overlap manual builds

**Impact:** `.github/workflows/release.yml` runs `make build && make validate` on every `v*` tag — **will fail unpredictably**.

**Fix:** Replace all `find | while read` with `while read … done < <(find …)` or pre-collected path arrays; add `set -o pipefail`; optional `flock` build lock.

---

### C2. Deliverable not on `master` — users cannot consume it

**Claim:** Phase 4 release with committed `platforms/kiro-cli/` + `plugins/maister-kiro/`.  
**Reality:** Both directories are **untracked** (`??`). Only `Makefile` and `README.md` modifications are staged as modified.

**Impact:** Clone of current branch does not include Kiro support without local untracked files. Research recommendation "commit generated artifact like Cursor/Copilot" is **not satisfied**.

---

### C3. Hooks embedded in `maister.json` do not run in smoke/workspace layout

**Claim:** Hooks execute; destructive bash blocked for non-whitelisted subagents.  
**Reality:** `smoke-cli.sh` logs hook failures on every test:

```
✗ agentSpawn "../hooks/skill-invocation-reminder.sh" failed with exit code: 127
zsh:1: no such file or directory: ../hooks/skill-invocation-reminder.sh
```

**Cause:** `setup_smoke_workspace` copies profile to `$ws/.kiro/`. Agents live at `.kiro/agents/` but `../hooks/` resolves to `$ws/hooks/`, not `$ws/.kiro/hooks/`. `fix_hook_paths` runs on `$kiro_home` before the workspace copy and does not re-patch the `.kiro/` tree.

**Impact:** Primary security control (bash guard via `preToolUse`) is **inactive** in the documented E2E workspace pattern. Smoke tests pass because they assert JSON/plan artifacts, not hook execution.

**Fix:** Run `fix_hook_paths` on `$ws/.kiro` after workspace copy, or use absolute `$KIRO_HOME/hooks/` paths in synthesized `maister.json` by default.

---

## High Gaps

### H1. Destructive-command hook fails open when subagent tracking is lost

**Location:** `platforms/kiro-cli/hooks/block-destructive-commands-kiro.sh`  
**Reality:** When `AGENT_TYPE` is empty, all shell commands are allowed. Combined with C3 (hooks not running), the guard is **unverified at runtime**.

### H2. Implementation plan completion markers are misleading

Parent task groups G4–G11 marked `[x]` while most sub-steps (4.1–11.7) remain `[ ]`. Work-log states "G1–G12 all completed" — **not aligned** with plan checkboxes or reproducible green builds.

### H3. Phase 3 interactive E2E (scenario 2a) not verified

Spec requires manual interactive gate UX verification. No evidence in verification artifacts. Headless defaults work (smoke passes), but **chat gate pause-until-reply** is unproven.

---

## Medium Gaps

| Gap | Detail |
|-----|--------|
| M1 | `smoke-cli.sh` rebuilds via `make build-kiro` at start — amplifies C1 flakiness |
| M2 | Agent conflict warnings in smoke ("Using workspace version") — noisy, may mask misconfiguration |
| M3 | `development/SKILL.md` 746-line override duplicates mechanical sed output (pragmatic review H1) — maintenance burden |
| M4 | Research doc still references `maister-orchestrator.json`, `agents/prompts/` — superseded by grill ADRs but confusing for maintainers |

---

## Functional Completeness vs Spec

| Requirement | Status | % |
|-------------|--------|---|
| FR-1 Build pipeline | ⚠️ Implemented, unreliable | 70% |
| FR-2 MD→JSON agents | ✅ Generator works | 95% |
| FR-3 Commands→skills | ✅ On successful build | 90% |
| FR-4 Semantic transforms | ✅ Chat gates, todo, subagent | 85% |
| FR-5 Hooks | ⚠️ Synthesized, not executing in E2E | 50% |
| FR-6 Distribution | ⚠️ Wrapper + scripts exist; install unverified standalone | 70% |
| FR-7 @prompts | ✅ 9 files | 100% |
| FR-8 Init integration | ✅ Patches in build | 90% |
| FR-9 Makefile validation | ✅ 28 rules | 95% |
| FR-10 Todo transforms | ✅ Present in build | 90% |
| FR-11 Documentation | ✅ `docs/kiro-cli-support.md`, README, standards | 90% |
| FR-12 E2E verification | ⚠️ Headless smoke only | 40% |
| FR-13 Release | ❌ Not committed | 20% |

**Overall functional completeness: ~75%** — design complete, operational reliability incomplete.

---

## Research Recommendations Alignment

| Research recommendation | Implemented? | Notes |
|-------------------------|--------------|-------|
| `platforms/kiro-cli/build.sh` from Cursor template | ✅ | 548-line pipeline with Kiro-specific steps |
| `plugins/maister-kiro/` generated, never hand-edit | ⚠️ | Generated when build succeeds; not committed |
| `KIRO_HOME=~/.kiro-maister` isolated profile | ✅ | `maister-kiro` wrapper + smoke-install |
| MD→JSON agents + `agent-tools.json` | ✅ | 24 agents + 2 synthetic |
| Commands merged to skills (no `commands/` API) | ✅ | 8→8 skill dirs |
| AskUserQuestion → chat gates (not AskQuestion sed) | ✅ | `apply_chat_gate_transforms()`, overrides |
| `Task` → `subagent`, `TaskCreate` → `todo` | ✅ | Banned in output |
| `maister.json` orchestrator (ADR-011) | ✅ | Not `maister-orchestrator` |
| `agents/instructions/` split (ADR-013) | ✅ | |
| `make build-kiro`, `validate-kiro`, aggregate targets | ✅ | |
| Smoke install + headless CLI | ⚠️ | Smoke passes; hooks broken |
| `docs/kiro-cli-support.md` | ✅ | Exists, untracked |
| Manual commit of generated artifact | ❌ | |
| Deterministic CI (`release.yml`) | ❌ | Blocked by C1 |

**Conclusion on research question:** The implementation **correctly encodes** the research architecture (Cursor derivative + Kiro JSON agents + chat gates + isolated profile). It does **not yet reliably deliver** that architecture to users or CI.

---

## Integration Points

| Integration | Works? | Evidence |
|-------------|--------|----------|
| Makefile `build` / `validate` / `clean` aggregates | ✅ | Targets present and wired |
| `release.yml` `make build && make validate` | ❌ | Would fail when Kiro build flakes |
| Source plugin `plugins/maister/` unchanged | ✅ | No Kiro-specific edits in SOT |
| `kiro-cli` runtime (local 2.6.0) | ✅ | smoke-cli 4/4 with real CLI |
| Cursor/Copilot variants unaffected | ✅ | Separate output dirs |
| Standards docs updated | ✅ | `build-pipeline.md`, `tech-stack.md`, `plugin-development.md` |

---

## What Actually Works (Happy Path)

When `bash platforms/kiro-cli/build.sh` completes without race:

1. **26 JSON agents** with valid `jq` parsing and `trustedAgents`
2. **22 slash skills** with matching `name:` frontmatter
3. **Zero banned APIs** (`maister:`, `AskUserQuestion`, `TaskCreate`, `EnterPlanMode`, etc.)
4. **CHAT GATE** transforms with headless defaults documented
5. **Headless kiro-cli** can detect `/maister-init`, delegate to `maister-gap-analyzer`, run quick-plan/quick-bugfix and write `.maister/plans/*.md`
6. **User documentation** is thorough (`docs/kiro-cli-support.md`, README Kiro section)

This proves the **design is viable** — the gap is **engineering hardening**, not wrong architecture.

---

## Pragmatic Action Plan

| # | Action | Priority | Success criteria | Effort |
|---|--------|----------|------------------|--------|
| 1 | Fix `find \| while read` → process substitution in `build.sh` (9 sites); add `set -o pipefail` | **Critical** | 10/10 consecutive `make clean-kiro && make build-kiro` succeed on macOS | 2–4 h |
| 2 | Add build lock (`flock`) or document/enforce no concurrent `make watch` during Kiro builds | **Critical** | No overlapping `build.sh` in `ps` during CI/local build | 1 h |
| 3 | Fix hook paths for workspace `.kiro/` copy — `fix_hook_paths "$ws/.kiro"` after smoke workspace setup | **Critical** | smoke-cli shows zero hook exit 127; `preToolUse` shell guard fires in test | 2 h |
| 4 | Commit `platforms/kiro-cli/` + green `plugins/maister-kiro/` | **Critical** | `git status` clean; clone + `make validate-kiro` passes | 1 h |
| 5 | Harden bash guard: deny unknown agent types instead of fail-open | High | Integration test with simulated hook JSON | 3 h |
| 6 | Reconcile implementation-plan checkboxes with actual step completion | Medium | Sub-steps 4.1–11.7 reflect reality | 30 min |
| 7 | Manual Phase 3 scenario 2a (interactive chat gate) | Medium | Documented pass/fail in `docs/kiro-cli-support.md` E2E matrix | 1 h |
| 8 | Run full `platforms/kiro-cli/tests/*.test.sh` suite once after #1–3 | Medium | All feature tests green in single session | 1 h |

---

## Deployment Decision

### ❌ NO-GO

**Justification:**

1. **Release CI will fail** — `make build-kiro` is not deterministic; tag push triggers broken pipeline.
2. **Artifacts not merged** — feature is invisible to consumers of `master`.
3. **Security hooks unverified** — bash guard does not run in documented smoke/workspace layout.
4. **False completion signal** — work-log and plan overstate readiness relative to reproducible evidence.

**Acceptable with monitoring?** No — this is pre-release greenfield platform support, not a low-risk incremental change.

**Minimum bar for GO:**

```bash
make clean-kiro && make build-kiro && make validate-kiro   # 3× consecutive green
bash platforms/kiro-cli/tests/gap-fill.test.sh             # 10/10
bash platforms/kiro-cli/smoke-cli.sh                       # 4/4, zero hook 127 errors
git add platforms/kiro-cli/ plugins/maister-kiro/ docs/kiro-cli-support.md Makefile README.md ...
# PR merged to master
```

---

## Summary

Kiro CLI platform support is a **substantial, well-aligned implementation** of the research recommendations — MD→JSON generator, chat-native gates, commands→skills merge, isolated `KIRO_HOME`, 28-rule validation, and headless smoke tests all demonstrate the approach works **when the build completes**.

It does **not yet solve the problem reliably**: the build pipeline races itself, artifacts are uncommitted, and runtime hooks fail in the primary E2E workspace pattern. The work is **~75% functionally complete** and **not shippable** until the pipe-race fix, hook path fix, and commit checkpoint are done.

---

*Assessment performed by independent test execution, codebase inspection, and cross-reference of spec, research report, and prior verification reports. No code was modified.*
