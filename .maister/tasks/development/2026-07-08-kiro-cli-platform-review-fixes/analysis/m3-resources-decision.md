# M3: Orchestrator `resources` skill glob — decision

**Date**: 2026-07-08  
**Task**: Remove or fix `resources: ["skill://.kiro/skills/**/SKILL.md"]` in `synthesize_orchestrator_agents()` (`platforms/kiro-cli/build.sh`).

## Problem

The `maister` orchestrator agent JSON included:

```json
"resources": ["skill://.kiro/skills/**/SKILL.md"]
```

This path is **workspace-relative** (`.kiro/skills/...` under the user's current project). Maister-kiro installs skills into the **global profile** (`~/.kiro-maister/skills/` by default), not into `<project>/.kiro/skills/`. Per Kiro issue [#7776](https://github.com/kirodotdev/Kiro/issues/7776), `resources` URIs resolve workspace-root-relative — so this glob would almost always match nothing for a global-profile install.

Per-agent `resources` in `generate-agent-json.sh` already use the correct absolute form:

```
skill://~/.kiro-maister/skills/maister-<stem>/SKILL.md
```

(rewritten by `smoke-install.sh` `fix_hook_paths()` when `KIRO_HOME` is not the default).

## Prior commit `b43d290` (misattributed in plan)

`git show b43d290` shows commit message **"feat(kiro): add use_aws tool to all subagents, inherit default model"** — not a resources removal. It added `use_aws` to 27 subagent JSON files and changed `maister-project-analyzer` model from `haiku` to `inherit`. It did **not** touch `maister.json` or orchestrator `resources`. The plan's note about "remove redundant skill resource path" does not match this commit.

## Kiro default resource inheritance

Per [Kiro agent configuration reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference) ("Disabling default resource inheritance"):

> By default, custom agents inherit default resources (steering files, skills, and AGENTS.md) alongside their own configured resources.

Maister-kiro does not set `chat.disableInheritingDefaultResources` in `settings/cli.json`. Installed profile skills are therefore available to the orchestrator without an explicit `resources` entry.

## Decision: **REMOVE** orchestrator `resources`

| Option | Verdict |
|--------|---------|
| Keep `skill://.kiro/skills/**/SKILL.md` | Wrong base path; redundant if inheritance works |
| Fix to `skill://~/.kiro-maister/skills/**/SKILL.md` | Redundant with default inheritance; adds install-time rewrite surface |
| Remove `resources` from orchestrator | **Chosen** — rely on default inheritance; matches Kiro docs; per-agent explicit paths remain where needed |

## Change

- `platforms/kiro-cli/build.sh`: drop `--argjson resources` and `resources: $resources` from `maister.json` synthesis.
- `.maister/docs/standards/global/build-pipeline.md`: document default inheritance instead of orchestrator skill glob.

## Related commit `b1c48a6` (actual resources partial removal)

`git show b1c48a6` — **"fix(kiro): remove redundant skill resource path from maister agent"** — removed only the absolute `skill://~/.kiro-maister/skills/**/SKILL.md` entry from orchestrator `resources`, leaving the workspace-relative `skill://.kiro/skills/**/SKILL.md` glob. M3 completes that work by removing the remaining glob entirely.

## Acceptance (verified 2026-07-08)

- `make build-kiro && make validate-kiro` pass (31 rules).
- `plugins/maister-kiro/agents/maister.json` has no `resources` key (`jq 'has("resources")'` → `false`).
- `/maister-*` slash skills remain invocable via default skill inheritance (no empirical kiro-cli session in this pass; decision is structural/docs-based per plan item M3 scope).
