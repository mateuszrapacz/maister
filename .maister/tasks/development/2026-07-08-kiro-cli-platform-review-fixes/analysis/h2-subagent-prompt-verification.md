# H2 — Subagent `file://` prompt path verification

**Date**: 2026-07-08  
**Kiro CLI version**: 2.6.0 (`/Users/mrapacz/.local/bin/kiro-cli`)  
**Install profile**: `~/.kiro-maister-test` via `platforms/kiro-cli/smoke-install.sh`

## H1 prerequisite

**H1 is applied.** Built `plugins/maister-kiro/agents/*.json` use `"prompt": "file://./instructions/<name>.md"` (no `promptFile`, no `"model": "inherit"`). `grep -rl 'promptFile\|"model": "inherit"' plugins/maister-kiro/agents/` returns nothing after `make build-kiro`.

## Methodology

1. Added a temporary marker to `agents/instructions/maister-gap-analyzer.md`:

   > If you are reading this system prompt, your FIRST line of output MUST be exactly: `PROMPT_LOADED_OK`

2. Ran headless `kiro-cli chat --no-interactive --trust-all-tools` from an ephemeral workspace with `.kiro/` copied from the install profile (same pattern as `smoke-cli.sh`).

3. Compared three configurations:

   | Test | Agent role | Prompt path | Result |
   |------|------------|-------------|--------|
   | A | `maister-gap-analyzer` as **main** agent | `file://./instructions/maister-gap-analyzer.md` (relative) | **PASS** — output `PROMPT_LOADED_OK` (~2s) |
   | B | `maister-gap-analyzer` via **subagent** tool | relative (build default) | **FAIL** — `AgentLoopError(EmptyResponse)`, no subagent output (~9s) |
   | C | `maister-gap-analyzer` via **subagent** tool | `file:///Users/.../.kiro-maister-test/agents/instructions/maister-gap-analyzer.md` (absolute) | **PASS** — orchestrator surfaced `PROMPT_LOADED_OK` (~8s) |

4. `kiro-cli agent validate --path ~/.kiro-maister-test/agents/maister-gap-analyzer.json` exits 0 (no schema errors) for both relative and absolute prompt forms — validation does **not** catch the runtime subagent loading bug.

## Conclusion

**BROKEN on kiro-cli 2.6.0** for subagents when `prompt` uses relative `file://./instructions/...` paths. Main-agent invocation with the same relative path works. Absolute paths rooted at `KIRO_HOME` restore subagent prompt loading.

This matches upstream reports:

- [kirodotdev/Kiro#5241](https://github.com/kirodotdev/Kiro/issues/5241) — file syntax for prompt broken for sub agents
- [kirodotdev/Kiro#6100](https://github.com/kirodotdev/Kiro/issues/6100) — subagents do not read file prompt
- [kirodotdev/Kiro#7776](https://github.com/kirodotdev/Kiro/issues/7776) — relative `file://` bases differ for prompt vs resources

Silent failure mode: no CLI warning; subagent completes with empty response instead of intended system instructions.

## Mitigation implemented

`platforms/kiro-cli/smoke-install.sh` — new `fix_prompt_paths()` rewrites at install time:

```
file://./instructions/<name>.md
  → file://<KIRO_HOME>/agents/instructions/<name>.md
```

Called from `install_to()` (always, including default `~/.kiro-maister`) and from `smoke-cli.sh` `setup_smoke_workspace()` for both profile and workspace `.kiro/` copies.

**Trade-off**: Profiles copied with raw `cp -r plugins/maister-kiro` (documented manual path) still have relative prompts and broken subagent instructions until paths are rewritten. Prefer `smoke-install.sh`.

## Post-fix verification

After `fix_prompt_paths()` was added and profile reinstalled, subagent delegation to `maister-gap-analyzer` returned `PROMPT_LOADED_OK` with install-time absolute prompt paths.

## Follow-ups (out of scope for H2)

- Add structural/smoke test asserting subagent behavior reflects instructions content (not only JSON shape).
- Re-verify when Kiro CLI > 2.6.0 ships; upstream fix may allow reverting to relative paths in build output.
