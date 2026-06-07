# Chat gate grep audit (Task Group 4)

Generated: 2026-06-07

## Source counts (`plugins/maister/`, `*.md`)

| Metric | Count |
|--------|-------|
| AskUserQuestion refs | 226 |
| Pause/MANDATORY GATE markers | 54 |
| multi-select refs | 7 |

## Output counts (`plugins/maister-kiro/`, after `make build-kiro`)

| Metric | Count |
|--------|-------|
| AskUserQuestion in `*.md` (must be 0) | 0 |
| AskQuestion in `*.md` (must be 0) | 0 |
| CHAT GATE markers in all `*.md` | 230+ |
| CHAT GATE in `maister-development/SKILL.md` | 53 |
| multi-select in `*.md` (must be 0) | 0 |
| AskUserQuestion in `hooks/*.sh` (must be 0) | 0 |

## Rule 26 threshold

| File | Source gates | Output CHAT GATE |
|------|--------------|------------------|
| `skills/maister-development/SKILL.md` | 53 AskUserQuestion | 53 CHAT GATE |
| `skills/maister-init/SKILL.md` | 5 AskUserQuestion | 5+ CHAT GATE |

Output count ≥ source count for orchestrator-class skills. Full-file `development` override mirrors mechanical transform output.

## Documented exceptions

| Location | Exception | Rationale |
|----------|-----------|-----------|
| `plugins/maister/` | Untransformed SOT | Source of truth; never edited for Kiro |
| `platforms/kiro-cli/overrides/` | Pre-build authoring copies | Must be chat-gate clean; applied at step 9 after step 8 |
| `agents/instructions/*.md` | Generated at step 17 | Inherits transformed agent MD bodies from step 8 |

## Maintenance

Re-run audit after source plugin changes:

```bash
make build-kiro
grep -r 'AskUserQuestion\|AskQuestion' plugins/maister-kiro --include='*.md' && echo FAIL || echo PASS
grep -c 'CHAT GATE' plugins/maister-kiro/skills/maister-development/SKILL.md
```
