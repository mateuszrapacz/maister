# Code Review Report

**Date**: 2026-06-08  
**Path**: `platforms/kiro-cli/`, `Makefile`, `docs/kiro-cli-support.md`, `README.md`, `CLAUDE.md`, `AGENTS.md`  
**Scope**: all (quality, security, performance, best practices)  
**Status**: ❌ Critical Issues

## Summary

- **Critical**: 3 issues
- **Warnings**: 10 issues
- **Info**: 7 issues

Kiro CLI platform support is well-architected: isolated `KIRO_HOME`, comprehensive `validate-kiro` (28 rules), strong test suite (14 scripts), documented chat-gate transforms, and install guards that refuse personal `~/.kiro/`. JSON emission uses `jq` correctly. During this review, **`make validate-kiro` failed** on the local tree, **`make build-kiro` failed intermittently** with concurrent `build.sh` processes and `sed: No such file or directory`, and the hook destructive-command guard **fails open** when subagent tracking is lost.

---

## Critical Issues

### 1. Generated output is stale or incomplete — `validate-kiro` fails

**Location**: `plugins/maister-kiro/skills/maister-quick-plan/SKILL.md:40,59,72,74,76,87,104,106`; `plugins/maister-kiro/skills/maister-quick-bugfix/SKILL.md:115,146,148,156`

**Description**: Committed/local `plugins/maister-kiro/` still contains `EnterPlanMode` / `ExitPlanMode` references. Platform overrides at `platforms/kiro-cli/overrides/commands/quick-plan.md` and `overrides/skills/quick-bugfix/SKILL.md` are plan-mode-free. Makefile Rule 4 and `build-pipeline.md` § Kiro-Specific API Bans prohibit these APIs in output.

**Risk**: `make validate` / release CI fails; agents may reference non-existent plan-mode tools at runtime.

**Recommendation**: Clean rebuild without concurrent watchers, then validate and commit:

```bash
make clean-kiro && make build-kiro && make validate-kiro
git add plugins/maister-kiro/
```

---

### 2. `build.sh` is non-deterministic under concurrent execution

**Location**: `platforms/kiro-cli/build.sh:124-132`, `252-254`, `260-270`, `496-497`; `Makefile:159-160` (`watch` target)

**Description**: During review, two concurrent `bash platforms/kiro-cli/build.sh` processes were observed. Failures include:

```
sed: .../plugins/maister-kiro/skills/orchestrator-framework/SKILL.md: No such file or directory
rm: .../plugins/maister-kiro: Directory not empty
```

Root cause: `build.sh` starts with `rm -rf "$OUT"` (line 253) while another build may still be running `find … | while read` + `sedi` on files under `$OUT`. No `flock` or build lock exists anywhere in `platforms/`.

**Risk**: Partial trees (unprefixed skill dirs, leftover `.claude-plugin/`, missing hooks) break validation and installs; `make watch` overlapping manual builds reproduces this.

**Recommendation**:

- Wrap the full `build.sh` body in `flock` (e.g. `"$OUT/.build.lock"`).
- Document that `make watch` and `make build-kiro` must not overlap.
- Replace `find | while read` with `find -print0 | while IFS= read -r -d ''` and/or snapshot file lists before destructive steps.

---

### 3. Destructive-command hook fails open when subagent context is lost

**Location**: `platforms/kiro-cli/hooks/block-destructive-commands-kiro.sh:22-25`, `platforms/kiro-cli/hooks/subagent-spawn-tracker.sh:13-17`, `platforms/kiro-cli/hooks/subagent-complete-cleanup.sh:9-12`

**Description**: The bash guard allows all shell commands when `AGENT_TYPE` is empty (block script lines 22–25). Subagent type is tracked via a single global `active-agent.type` and optional `session-${SESSION_ID}.type`. `postToolUse` unconditionally clears `active-agent.type` (cleanup line 9). With parallel subagents (documented max 4) or nested delegation, cleanup can clear state while another subagent is still active, causing destructive commands to pass unblocked.

**Risk**: Subagents may run `git reset --hard`, `rm -rf`, etc. when tracking is wrong — the primary security control for Kiro per `build-pipeline.md` § Destructive Shell Command Guard.

**Recommendation**:

- Use reference-counted or per-session stack state instead of a single `active-agent.type`.
- For `preToolUse` + `shell` matcher, fail closed (deny) when agent context is ambiguous rather than allow.
- Add hook integration tests simulating parallel subagent shell invocations with tracker state present/absent.

---

## Warnings

### 4. `session_id` not sanitized before use in state file paths

**Location**: `platforms/kiro-cli/hooks/subagent-spawn-tracker.sh:16`, `platforms/kiro-cli/hooks/subagent-complete-cleanup.sh:12`, `platforms/kiro-cli/hooks/block-destructive-commands-kiro.sh:14-15`

**Description**: State files are written as `"$STATE_DIR/session-${SESSION_ID}.type"`. If `session_id` from hook JSON contains `/` or `..`, path resolution can escape `.hook-state/`.

**Risk**: Low if Kiro always emits opaque UUIDs; medium if hook input is attacker-influenced.

**Recommendation**:

```bash
SESSION_ID=$(echo "$SESSION_ID" | tr -cd '[:alnum:]._-')
[ -z "$SESSION_ID" ] && SESSION_ID="unknown"
```

---

### 5. `build.sh` lacks `set -o pipefail`

**Location**: `platforms/kiro-cli/build.sh:2`; `platforms/kiro-cli/generate-agent-json.sh:5`

**Description**: Build scripts use `set -e` only. Install/smoke scripts correctly use `set -euo pipefail` per `build-pipeline.md`. Pipeline failures in `find … | while read` loops are silently ignored (while subshell may exit non-zero but parent pipeline returns 0).

**Recommendation**: Add `set -o pipefail` after `set -e`, or avoid piping `find` into `while`.

---

### 6. Step 8 hook transforms are dead code

**Location**: `platforms/kiro-cli/build.sh:128-132`, `496-497`

**Description**: Step 8 runs `apply_chat_gate_transforms` on `OUT/hooks/*.sh` copied from the Claude source plugin. Step 19 `rm -rf "$OUT/hooks"` and copies fresh `platforms/kiro-cli/hooks/`, discarding all step-8 hook transforms. Wastes work and widens the race surface (transforming files about to be deleted).

**Recommendation**: Remove the hooks branch from `apply_chat_gate_transforms_tree`, or run a final chat-gate pass on platform hooks after step 19 if platform hooks ever reference banned APIs.

---

### 7. Broad `Task tool` sed replacement may over-match

**Location**: `platforms/kiro-cli/build.sh:200`

**Description**: `sedi 's/Task tool/subagent tool/g'` is a global catch-all applied to all `*.md` via `apply_semantic_transforms_tree`. More specific patterns exist at lines 189–199; line 200 rewrites any incidental prose containing "Task tool".

**Recommendation**: Drop the catch-all or scope delegation transforms to known paths (as `TODO_GLOB` does for todo transforms).

---

### 8. `generate-agent-json.sh` frontmatter parser is single-line only

**Location**: `platforms/kiro-cli/generate-agent-json.sh:17-27`, `29-37`

**Description**: `frontmatter_field` and `parse_skills` use awk single-line matchers. Multi-line YAML values will be truncated or missed. Script acknowledges escape hatch at line 4 ("migrate to generate-agents.mjs").

**Risk**: Invalid or incomplete agent JSON when source frontmatter evolves.

**Recommendation**: Migrate to yq or documented `gray-matter` Node script before adding complex frontmatter.

---

### 9. Build-time vs install-time agent JSON divergence

**Location**: `platforms/kiro-cli/smoke-install.sh:44-57`; `Makefile:117-118` (Rule 17)

**Description**: `make validate-kiro` checks build artifacts with `promptFile` and `model: "inherit"`. `smoke-install.sh` rewrites agents at install time (`promptFile` → `prompt` file URI, strips `inherit`). Validation does not cover install-time mutations.

**Risk**: `make validate-kiro` can pass while installed profile is broken if `fix_agent_prompts` regresses.

**Recommendation**: Add `validate-kiro-installed` target or apply `fix_agent_prompts` inside `build.sh` so validated artifacts match runtime.

---

### 10. Magic-number validation thresholds are brittle

**Location**: `Makefile:110-111`, `140-141`, `144-145`

**Description**: Rules 14, 26, and 28 hardcode skill counts (22), CHAT GATE counts (≥53 in development, ≥200 total), and `maister-*` directory counts. Adding/removing a source skill requires updating Makefile constants and `transforms/chat-gate-audit.md`.

**Recommendation**: Derive thresholds from source counts in a validation script, or document an update checklist in `platforms/kiro-cli/README.md`.

---

### 11. `rename_skill_directories` interpolates skill names into sed without escaping

**Location**: `platforms/kiro-cli/build.sh:50-54`

**Description**: `sedi "s/^name: ${name}/name: ${target_name}/"` embeds frontmatter values directly in sed expressions. Names containing `/`, `&`, or newlines can break sed or corrupt files.

**Risk**: Low today (kebab-case names); high if naming conventions change.

**Recommendation**: Validate names against `^[a-z0-9-]+$` before sed, or use literal-string replacement (`perl -pi` / `awk`).

---

### 12. Hook scripts missing `jq` dependency guards

**Location**: `platforms/kiro-cli/hooks/block-destructive-commands-kiro.sh:7`, `platforms/kiro-cli/hooks/post-compact-reminder-stub.sh:30`

**Description**: Hooks call `jq` without checking availability. On `jq` failure, `block-destructive-commands-kiro.sh` behavior is undefined — may block all shell use or fail open depending on Kiro hook error handling.

**Recommendation**: Add `command -v jq` guard; deny subagent shell when `jq` unavailable, allow main agent.

---

### 13. Duplicate validate rules 11 and 25

**Location**: `Makefile:99-101`, `136-138`

**Description**: Rule 11 bans `AskUserQuestion`/`AskQuestion` in `*.md` only; Rule 25 repeats the same check including `*.sh`. Redundant maintenance burden; Rule 11 alone is insufficient per transform doc (hooks must be checked).

**Recommendation**: Remove Rule 11 or merge into Rule 25 with a single check covering both extensions.

---

## Informational

### 14. `AGENTS.md` not updated for Kiro platform

**Location**: `AGENTS.md` (repo root)

**Description**: Scope includes `AGENTS.md`, but it contains no Kiro CLI references. `CLAUDE.md` and `README.md` were updated correctly.

**Suggestion**: Add a brief note that Kiro uses `plugins/maister/` source with `platforms/kiro-cli/` transforms, mirroring `CLAUDE.md` § Never Edit Generated Files.

---

### 15. `apply_chat_gate_transforms` catch-all may corrupt negation phrases

**Location**: `platforms/kiro-cli/build.sh:117-121`

**Description**: Broad `s/AskQuestion/**CHAT GATE**/g` replaces substrings in phrases like "no AskQuestion". Makefile Rules 11/25 use `grep -v 'no AskQuestion'` to compensate post-hoc rather than preventing corruption at transform time.

**Suggestion**: Add sed exclusions for negation phrases or a post-build lint for corrupted strings.

---

### 16. Strong security patterns already in place

**Location**: `platforms/kiro-cli/smoke-install.sh:87-90`, `smoke-uninstall.sh:30-33`, `maister-kiro:3`, `smoke-install.sh:97` (`${dest:?}`)

**Description**: Install/uninstall refuse `~/.kiro/`; wrapper defaults `KIRO_HOME` to `~/.kiro-maister`; install uses bash `:?'` guard on destructive rm. Follows project standards well.

---

### 17. Test coverage is thorough for a bash pipeline

**Location**: `platforms/kiro-cli/tests/*.test.sh` (14 scripts)

**Description**: Covers scaffold, build core, generator golden files, chat gates, delegation/todo, validation rules, smoke install, phase-2 hooks/prompts, E2E matrix, docs release, and `fix_agent_prompts` / `fix_hook_paths`. Exceeds typical platform transform coverage.

---

### 18. Documentation quality is high

**Location**: `docs/kiro-cli-support.md`, `platforms/kiro-cli/transforms/askuser-to-chat-gate.md`, `README.md` § Kiro CLI

**Description**: Install paths, headless defaults (3B table), E2E matrix, known gaps (`preCompact`, todo API, max 4 subagents), and manual commit checkpoint are clearly documented.

---

### 19. `generate-agent-json.sh` uses jq for JSON emission (good)

**Location**: `platforms/kiro-cli/generate-agent-json.sh:61-72`, `121-184`

**Description**: Agent JSON built via `jq -n --argjson`, not string concatenation of untrusted content. `build_resources_json` uses `jq -Rn --arg` per element. Avoids JSON injection from frontmatter descriptions.

---

### 20. `smoke-uninstall.sh` lacks empty-DEST guard

**Location**: `platforms/kiro-cli/smoke-uninstall.sh:11`, `41`

**Description**: `DEST="${1:-$DEFAULT_DEST}"` does not treat empty string as missing (bash `${1:-}` only substitutes when unset). `rm -rf "$DEST"` with empty DEST is usually harmless but inconsistent with install's `${dest:?}` pattern.

**Suggestion**: Use `DEST="${1:-$DEFAULT_DEST}"; [ -z "$DEST" ] && DEST="$DEFAULT_DEST"` or `rm -rf "${DEST:?}"`.

---

## Metrics

| Metric | Value |
|--------|-------|
| Files analyzed | 50+ |
| Max function length | ~58 lines (`apply_chat_gate_transforms`, `build.sh:64-122`) |
| Max nesting depth | 3 levels (`merge_commands_to_skills`) |
| `build.sh` total lines | 549 |
| `validate-kiro` rules | 28 |
| Potential vulnerabilities | 2 (path traversal, hook fail-open) |
| N+1 / performance risks | 0 (build-time only) |
| `make validate-kiro` at review time | **FAIL** (Rule 6 on partial tree; Rule 4 on stale quick-plan/quick-bugfix) |
| Concurrent `build.sh` at review time | **2 processes observed** |

---

## Prioritized Recommendations

1. **Stop concurrent builds**; add `flock` to `build.sh`; regenerate `plugins/maister-kiro/` and confirm all 28 `validate-kiro` rules pass.
2. **Harden subagent tracking** in destructive-command hooks (stacked state, fail-closed for unknown subagents).
3. **Sanitize `session_id`** before writing to `.hook-state/`.
4. **Add `set -o pipefail`** to `build.sh` and `generate-agent-json.sh`; remove dead step-8 hook transforms.
5. **Align validation with install-time JSON fixes** (`fix_agent_prompts`) so CI validates runtime shape.
6. **Replace brittle Makefile magic numbers** with source-derived counts.
7. **Plan `generate-agent-json.sh` migration** before multi-line frontmatter is needed.
8. **Update `AGENTS.md`** with Kiro platform note.

---

## Files Reviewed (focus areas)

| Area | Files |
|------|-------|
| Bash build | `platforms/kiro-cli/build.sh`, `generate-agent-json.sh`, `smoke-*.sh`, `maister-kiro` |
| MD→JSON | `generate-agent-json.sh`, `agent-tools.json` |
| Hooks | `hooks/*.sh` (5 scripts) |
| Chat gates | `transforms/askuser-to-chat-gate.md`, `build.sh:apply_chat_gate_transforms*` |
| Makefile | `validate-kiro` rules 1–28, `build-kiro`, `clean-kiro` |
| Docs | `docs/kiro-cli-support.md`, `README.md`, `CLAUDE.md`, `AGENTS.md` |
