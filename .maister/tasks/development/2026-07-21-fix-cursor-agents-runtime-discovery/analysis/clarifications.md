# Phase 1 clarifications

Status: resolved (2026-07-21T21:07:49Z)

## Q1 — Success criterion

**Assumption:** Success = in a Cursor session, Task/`subagent_type` lists and can invoke `maister-*` agents (e.g. `maister-explore`, `maister-code-reviewer`).

**User:** Confirm (ok).

## Q2 — Delivery strategy

**Assumption (superseded):** Dual-install into `~/.cursor/agents/` was proposed as fallback.

**User:** Build/use the **Cursor plugin** as the delivery mechanism (`~/.cursor/plugins/local/maister` / Maister Cursor overlay install) — fix discovery through the plugin path, do not rely on a separate non-plugin agents dump as the primary design.

## Q3 — Scope

**Assumption:** Installer/materialize/verify + tests in worktree; avoid Codex runtime collision.

**User:** **Everything required** for agents to work end-to-end via the Cursor plugin (projection, install, host discovery/verify, skill/delegation alignment, reload guidance as needed) — still isolated on worktree branch `fix/cursor-agents-runtime-discovery`.

## Resolved constraints for downstream phases

1. Target surface: **Cursor Task discovers plugin agents**.
2. Mechanism: **Cursor plugin** (Maister overlay), not primary dual-copy to user agents dir (fallback only if plugin path proven insufficient).
3. Scope: full vertical slice to make it work; stay on worktree.
