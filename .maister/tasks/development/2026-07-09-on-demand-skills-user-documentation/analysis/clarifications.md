# Phase 1 Clarifications

## TL;DR

User confirmed plan locked decisions (D1–D7) with four clarifications on open items: grill-me/thermos documented as explicit request + platform callout; thermo-nuclear skills covered only via thermos; no CLAUDE.md cross-link; minimal platform naming in guide.

## Key Decisions

- **grill-me / thermos invocation** — Primary: explicit natural-language request. Platform callout: Cursor `/maister-grill-me`, `/maister-thermos`; Kiro shortcuts referenced via platform guide link. Do not assert `/maister:grill-me` or `/maister:thermos` for Claude Code.
- **thermo-nuclear skills** — Document only via combined `thermos` entry; no separate catalog entries for `thermo-nuclear-review` or `thermo-nuclear-code-quality-review`.
- **CLAUDE.md cross-link** — Skip optional P4 cross-link; keep `plugins/maister/CLAUDE.md` unchanged (agent-only catalog).
- **Platform detail level** — Minimal callout in `on-demand-skills.md`: Claude `/maister:` primary, Cursor `/maister-` hyphen note; defer Kiro shortcut detail to `docs/kiro-cli-support.md`.

## Questions & Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | grill-me/thermos invocation documentation | Explicit request + platform callout |
| 2 | thermo-nuclear catalog entries | thermos-only (10 catalog entries, not 12) |
| 3 | CLAUDE.md cross-link | No |
| 4 | Kiro detail in guide | Minimal callout + link to platform guide |
