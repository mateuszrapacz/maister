---
name: maister-grill-with-docs
description: Stress-test a plan or domain topic while maintaining language.md and sparse ADRs. Same grilling discipline as grill-me, plus user-confirmed vocabulary and decision documentation. Explicit request only.
argument-hint: "[plan or domain topic]"
---

# Grill with Docs

**Invocation guard**: Activate ONLY when the user explicitly requests docs-aware plan grilling. Trigger phrases: "grill with docs", "grill this plan and update language.md", "stress-test and capture domain language", "grill me on vocabulary".

Do NOT invoke when the user is writing or describing plans without grilling intent, during unrelated implementation work, or for strategic modeling — route those to `maister-context-distiller` or `maister-aggregate-designer`.

## Input

- If argument provided: use it as the plan or domain topic to grill.
- If no argument: scan the conversation for a plan, design, or domain topic. Ask the user to paste one if none is found.

## Grilling Protocol

Same core discipline as `maister-grill-me` — update both skills when changing grilling rules.

1. **One question at a time** — ask exactly one decision question; wait for user feedback before the next.
2. **Facts vs decisions** — investigate discoverable facts in codebase, docs, and config independently; present user-owned decisions with a recommended answer and concise rationale.
3. **Decision tree** — track dependencies; walk branches one-by-one until each path resolves or is explicitly deferred.
4. **Convergence gate** — before closing, summarize decisions, assumptions, deferrals, and contradictions; require explicit shared-understanding confirmation from the user.

## Session Discovery

At session start, read:

- `.maister/docs/INDEX.md` for project context and standards
- Applicable `language.md` files (per `.maister/docs/standards/global/language-md-convention.md`)
- Existing ADRs and decision records
- Relevant code for the plan or domain topic

## Vocabulary and Boundary Testing

During grilling:

- Detect overloaded or conflicting terms; propose precise canonical terms
- Test domain boundaries with concrete edge-case scenarios ("what happens when…")
- Check contradictions between user claims, existing documentation, and code

## language.md Maintenance

- Update `language.md` inline **only after the user confirms each resolved term** — one confirmed term, one edit
- When no `language.md` exists: explain optional adoption per `language-md-convention.md` and ask before creating the first file
- Edit only the sections affected (Core Terms, Operations, Events, Integration Points)

## Sparse ADR Policy

Offer an ADR only when **all three** significance criteria pass:

1. Hard to reverse without significant cost
2. Surprising without prior context
3. Genuine trade-off between viable alternatives

Detect existing ADR format and location. When none exists, propose `.maister/docs/decisions/` with this minimal MADR skeleton and obtain confirmation before the first write:

```markdown
# [Decision Title]
**Status**: Proposed
## Context
## Decision
## Consequences
```

## Prohibitions

- **Never implement the plan** — do not write production code or tests for the plan under discussion
- **Documentation only** — may edit `language.md`, ADRs, and related `.maister/docs/` artifacts after user confirmation; prohibit code edits
- **Never create `CONTEXT.md` or `CONTEXT-MAP.md`** — use `language.md` per project convention

## Not This Skill

| Skill | Use instead when… |
|-------|-------------------|
| `maister-grill-me` | Read-only stress-testing with no documentation edits |
| `maister-context-distiller` | Strategic bounded-context discovery and generalization analysis |
| `maister-aggregate-designer` | Resource-contention consistency units and locking design |
| `maister-linguistic-boundary-verifier` | Read-only audit of existing language leakage across modules |

## Related Skills

- **`maister-grill-me`** — read-only alternative when you do not want documentation maintained during grilling
- **`maister-linguistic-boundary-verifier`** — read-only boundary audit after vocabulary is settled; does not interactively resolve terms or edit files
