## TL;DR

Install materializes **29** agents into `~/.cursor/plugins/local/maister/agents/` and declares them in `plugin.json`, but Cursor Task/`subagent_type` in the smoke session only listed built-ins. Skills work. Maister `verify` proves disk + hashes, **not** host Task inventory (E5/E6 default `unavailable`). Cursor docs package plugin agents but document Task discovery primarily for `~/.cursor/agents/` and `.cursor/agents/`. Likely fix space: dual-install/symlink into user/project agent roots, verify/E5 that observes host inventory, and/or align skill text with `cursor.native` bridge — not “re-project missing files.”

## Key Decisions

1. Work isolated on worktree `/Users/mrapacz/Workspace/maister-wt-fix-cursor-agents`, branch `fix/cursor-agents-runtime-discovery`.
2. Treat on-disk install as **already correct** for projection (28 canonical + `explore`).
3. Treat the defect as **runtime discovery / host surface / dual-path delegation**, pending clarification of intended success criterion (Task enum vs bridge-only).

## Open Questions & Risks

1. Is success = Task shows `maister-*`, or success = `cursor.native` bridge + E5/E6 pass?
2. Is session reload enough, or do we need dual-install into `~/.cursor/agents/`?
3. Extra frontmatter (`color`, `skills`) — strip or keep?
4. Sibling Codex install work must not collide (worktree isolation).

---

# Summary

| Area | Finding |
|------|---------|
| Projection | `agent-projector` emits `agents/{role_id}.md` with `name: maister-{role_id}` |
| Install root | `~/.cursor/plugins/local/maister` whole_tree; plugin enabled in settings |
| Skills vs agents | Skills from checked-in overlay assets; agents generated at materialize |
| Verify | Receipt drift only; no Cursor Task inventory assertion |
| E5/E6 | Unavailable without injected `discover`/`invoke` |
| Docs | Plugin `agents` documented; Task discovery table omits plugin roots |
| Staff/forum | Plugin agents intended to appear in Task when loaded; restart often required |
| Fallback | Copy/symlink to `~/.cursor/agents/` or project `.cursor/agents/` |
| Delegation split | Skills say Task `maister-*`; runtime gate uses `cursor.native` bridge |

## Key files

- `plugins/maister/lib/distribution/agent-projector.mjs`
- `plugins/maister/lib/distribution/materializer.mjs`
- `plugins/maister/lib/distribution/targets.mjs`
- `plugins/maister/lib/distribution/host-probes/cursor.mjs`
- `plugins/maister/lib/distribution/transaction-manager.mjs`
- `plugins/maister/overlays/cursor/overlay.yml`
- `plugins/maister/overlays/cursor/assets/plugin.json`
- `plugins/maister/lib/distribution/cursor-skill-projector.mjs`
- `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/host-adapters/exact-native.mjs`

## Primary language

JavaScript ESM (distribution + agent-runtime), Markdown agents, YAML overlays.

## Hypotheses (ranked)

1. **Host Task does not reliably load plugin-root agents** → dual-install into `~/.cursor/agents/` (or project) — high practical leverage.
2. **Session/loader staleness** after local plugin install — restart/reload needed; verify should detect missing host IDs.
3. **Product/docs gap** — plugin agents load on some surfaces but not Task; need version-pinned observation.
4. **Frontmatter extras / name↔filename mismatch** break registration — lower confidence.
5. **Wrong success metric** — Task never was the contract; bridge + E5/E6 is — then skill text is the bug.

## Raw inputs

- `analysis/codebase-analysis-raw-discovery.md`
- `analysis/codebase-analysis-raw-cursor-docs.md`
- `analysis/codebase-analysis-raw-context.md`
