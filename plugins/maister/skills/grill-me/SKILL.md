---
name: maister-grill-me
description: Relentless interactive interview to stress-test a plan or design until shared understanding. Invoked ONLY on explicit request — e.g. "grill me", "stress-test this plan".
argument-hint: "[plan or topic]"
---

# Grill Me

**Invocation guard**: This skill activates ONLY when the user explicitly asks to be grilled or to stress-test a plan or design. Trigger phrases: "grill me", "stress-test this plan", "get grilled on", "walk me through the decisions", "challenge this design".

Do NOT invoke when the user is writing, describing, or elaborating a plan; working on unrelated tasks; or asking for implementation, coding, or documentation edits. Grilling on request only.

**Protocol parity**: Core grilling discipline is shared with `grill-with-docs`; update both skills when changing one-question protocol or convergence rules.

---

## Input

- If argument provided: use it as the plan or topic to grill.
- If no argument: scan the conversation for a plan, design, or proposal. Ask the user to paste one if none is found.

---

## Grilling Protocol

Walk the decision tree branch by branch until shared understanding is reached. Trust principles over scripts.

1. **One question at a time** — Ask exactly one decision question, then wait for the user's answer before continuing. Multiple questions at once are bewildering.

2. **Facts vs decisions** — Investigate discoverable facts independently (codebase, docs, config). Never ask the user for information you can look up. User-owned decisions are theirs — present each with a recommended answer and concise rationale, then wait.

3. **Dependencies** — Track how decisions depend on each other. Resolve prerequisites before downstream branches. If the user contradicts an earlier choice, surface it explicitly.

4. **Convergence gate** — Before ending, summarize: decisions made, assumptions accepted, items deferred, and contradictions unresolved. Require explicit shared-understanding confirmation from the user. Do not close until they confirm.

---

## Prohibitions

This is a **read-only** grilling session.

- **Never implement the plan** — Do not write code, scaffold features, or start implementation of the design under discussion. Prohibit plan implementation for the entire session.
- **No documentation edits** — Do not edit, mutate, or create documentation files.
- **No code edits** — Do not modify source code, configuration, or project files.

If the user wants documentation maintained during grilling, suggest `grill-with-docs` instead.

---

## Principles

- **Decisions are the user's** — Recommend, don't dictate. Expose gaps and dependencies; do not own the design.
- **Facts are yours to find** — Respect the user's time; look before you ask.
- **Honest contradictions** — Name tensions between choices, claims, and discoverable reality.
- **Convergence is explicit** — Shared understanding means the user says so, not that you assume it.
- **Branch before breadth** — Finish one decision branch before opening unrelated topics.

---

## Recommended Next Steps

After confirmed shared understanding, the user may use `/maister-quick-plan`, `/maister-development`, or `grill-with-docs` to harden vocabulary before building.
