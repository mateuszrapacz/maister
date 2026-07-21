# Phase 2 scope clarifications

Resolved: 2026-07-21T21:13:00Z (approx)

| ID | Selection | Notes |
|----|-----------|-------|
| verify-task-discovery-proof | **Hybrid** | Auto discover when available; else provisional + mandatory manual smoke |
| plugin-path-fallback | **Optional fallback** after plugin-path exhaustion | Flag-gated copy/symlink to `~/.cursor/agents` or project `.cursor/agents` |
| e6-bridge-packaging | **In-scope** | Ship/document Task-backed or host bridge for E6 — fix immediately with this task |
| skill-text-delegation-story | **Keep Task-only** | Optional one-line bridge pointer only if needed |
| frontmatter-filename-normalization | **Change only with smoke evidence** | No speculative projection churn |

## Downstream implications

- Phase 3 TDD Red: write failing test(s) for Task discovery and/or E5/E6 observation gaps.
- Spec/plan must include: plugin-path discovery fixes, hybrid verify/E5, optional fallback flag, **and** Cursor E6 bridge packaging.
- Skills stay Task-oriented; primary delivery remains Cursor plugin.
