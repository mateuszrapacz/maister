# AJ Skills Wave 1 — User Guide

Three new on-demand utilities help you catch problems in requirements **before** they become expensive code changes. They run inside Claude Code when you invoke them explicitly — they do not start automatically while you write tickets or discuss features.

This guide is for product owners, architects, analysts, and anyone who writes or reviews requirements in a project that uses the Maister plugin.

---

## What’s new in Wave 1

| Command | What it does |
|---------|--------------|
| `/maister:quick-transcript-critic` | Audits a meeting transcript for decision-process problems |
| `/maister:quick-requirements-critic` | Interactively critiques tickets, user stories, or specs |
| `/maister:quick-problem-classifier` | Classifies a requirement into a DDD modeling problem class |

Each command is a shortcut. Behind the scenes, Claude runs a dedicated skill with a full rubric — you get structured feedback in the chat, not a separate app or report file.

---

## Before you start

**Install the Maister plugin** in your Claude Code project (via the marketplace or your team’s setup). After Wave 1 ships, run `make build` in the maister repo if you maintain the plugin locally.

**How to invoke a command:** Type the slash command in Claude Code’s prompt, optionally followed by your text:

```
/maister:quick-requirements-critic As a user I want to reserve a room by clicking Reserve
```

If you omit the text, Claude will ask you to paste the transcript, requirement, or ticket.

**Explicit-only critics:** The two critic skills (`transcript-critic` and `requirements-critic`) are configured so Claude will **not** run them while you are casually writing or discussing requirements. You must ask — via the slash command or phrases like “critique this ticket” or “review this transcript.”

**Language:** Rubrics support Polish and English. Questions and output follow the language you use in the requirement or transcript.

---

## Quick reference

| I want to… | Use this command |
|------------|------------------|
| Check whether meeting decisions are well-founded | `/maister:quick-transcript-critic [transcript or notes]` |
| Improve a user story or ticket before development | `/maister:quick-requirements-critic [requirements text]` |
| Decide how to model a feature (CRUD vs concurrency vs integration) | `/maister:quick-problem-classifier [business requirement]` |
| Run the full “meeting → requirements” quality flow | See [Bundle A](#bundle-a-meeting-to-ready-requirements) below |

---

## `/maister:quick-transcript-critic`

### What it does

Analyzes meeting transcripts or notes to surface **decision-process** problems that a normal summary would miss. This is **not** a meeting summary — it is a critique of how decisions were made.

### When to use it

- After a meeting where decisions were made — to verify they are well-founded
- Before acting on meeting notes — to see what is missing or assumed
- When preparing a follow-up meeting — to get targeted questions
- When reviewing someone else’s notes — to find what the note-taker missed

### What it checks (7 areas)

1. **Fact vs opinion vs hearsay** — including when a guess later gets treated as fact
2. **False consensus** — who really agreed vs who was never asked
3. **Marginalized topics** — raised, cut off, or deferred without return
4. **Hidden dependencies** — “separate” topics that actually affect today’s decision
5. **Scope drift** — the meeting goal vs what was actually decided
6. **Severity mismatch** — rare events dismissed because they are infrequent
7. **Authority dynamics** — first proposal wins, senior override, loudest voice

### Example

```
/maister:quick-transcript-critic

Product sync — 2026-06-10

Alice (PM): We need the reserve button on the room page.
Bob (Dev): Easy — set status to Reserved in the database.
Carol (Ops): What about double-booking?
Alice: Let's not scope-creep. Bob, can you have this by Friday?
Bob: OK.
Carol: ...
Alice: Great, we're aligned. Moving on to the logo.
```

**What you get back** (abbreviated):

```markdown
# Transcript Critique: Product sync — 2026-06-10

## Critical Findings

### Decision made without exploring alternatives
**Severity**: High
**Evidence**: "Easy — set status to Reserved in the database."
**Problem**: First technical proposal became the plan; no evaluation of concurrency or availability.
**Diagnostic question for next meeting**: "Carol, what happens if two users reserve the same room at the same time?"

### Compliance masquerading as agreement
**Severity**: Medium
**Evidence**: Carol raised double-booking; Bob said "OK" after being overruled.
**Diagnostic question for next meeting**: "Carol, you flagged double-booking — is the Friday scope acceptable without addressing that?"
```

Use the **diagnostic questions** in your next meeting or async thread before writing final tickets.

---

## `/maister:quick-requirements-critic`

### What it does

Runs an **interactive** four-check review of requirements, tickets, or specs. When it finds weak spots — especially “status label” requirements disguised as domain behavior — it asks clarifying questions and helps you rewrite the requirement together.

### When to use it

- Before handing a ticket to development
- After refining stories from a meeting (especially after transcript-critic)
- When a requirement “feels done” but you suspect hidden assumptions
- When you want a second opinion without starting a full `/maister:development` workflow

### The four checks

| Check | What it looks for |
|-------|-------------------|
| **1. Problem vs solution** | Does the requirement state a business need, or prematurely pick implementation? |
| **2. Observable behavior vs CRUD status** | Does “Reserve” actually change something in the system, or only set a status field? |
| **3. Signal map** | Hidden domain decisions triggered by keywords (payment, approval, notification, etc.) |
| **4. Rigid quantifiers** | Words like *always*, *never*, *every* — and edge cases they silently exclude |

Checks 2–4 are **interactive**: Claude asks 2–3 questions at a time via multiple-choice prompts, then drafts a reformulated requirement for you to accept or refine.

### Example

```
/maister:quick-requirements-critic

User clicks Reserve. System creates a reservation with status Reserved.
```

Claude may ask:

> Co się zmienia dla **innych użytkowników** po wykonaniu tej komendy?

After your answers, you might get a reformulated requirement:

```
Komenda:        Użytkownik rezerwuje zasób, podając ilość
Efekt:          Dostępna ilość zasobu zmniejsza się o żądaną wartość.
                 Inni użytkownicy widzą zaktualizowaną dostępność.
Współbieżność:  Rezerwacja przekraczająca dostępną ilość jest odrzucona.
Cofnięcie:      Anulowanie przywraca licznik dostępności.
```

That rewrite often reveals **Resource Contention** — a signal to run the problem classifier next.

### Tips

- Paste one ticket or story at a time for clearest feedback
- Say “critique this ticket” or “review this requirement” if you prefer natural language over the slash command
- Re-run the critic on the final draft after you accept a rewrite from Check 2

---

## `/maister:quick-problem-classifier`

### What it does

Classifies a business requirement into one of **four modeling problem classes** from Domain-Driven Design practice. It scans for signals, asks up to four discriminating questions if needed, assigns a class, and suggests an implementation approach — without prescribing your architecture.

### The four problem classes

| Class | Plain-language description | Typical building block |
|-------|---------------------------|------------------------|
| **CRUD** (“Notebook”) | Store and retrieve data; validation checks only what the user submitted in this request | Simple controller + database |
| **Transformation & Presentation (T&P)** | Read existing data and transform it for display; no state change | Read model, report, API projection |
| **Integration** | Coordinate across modules or external systems; contracts and failure order matter | Saga, process manager, events |
| **Resource Contention (RC)** | “Can you do X?” depends on shared state another request could change at the same time | Aggregate with concurrency rules |

### When to use it

- After requirements-critic surfaces counters, availability, or concurrency language
- When the team debates “do we need an aggregate for this?”
- When a screen mixes simple fields with rule-governed status — **Disguised CRUD**
- When you hear “only one owner” but are unsure if races actually happen

### Not the same as archetype mappers

| Question | Use |
|----------|-----|
| “Which **modeling class** is this?” | `/maister:quick-problem-classifier` |
| “Map this to an **accounting archetype**” | Future Wave 4 skills (not in Wave 1) |

Also distinct from Maister’s **`task-classifier` agent**, which routes *development tasks* to workflows (development, performance, migration, research, product-design) — not DDD problem classes.

### Example

```
/maister:quick-problem-classifier

When a user reserves a meeting room, the system must reject the reservation
if the room is already booked for that time slot. Two users may attempt
to book the same slot simultaneously.
```

**Typical output** (abbreviated):

```markdown
## Classification: Resource Contention (primary)

**Signals detected**: "reject if already booked", "simultaneously", shared slot state

**Mutability test**: The availability check reads database state another
command can change at the same moment → RC confirmed.

**Implementation suggestion**: Aggregate for the room/slot boundary;
optimistic locking for concurrent access. Presentation data (room amenities)
can stay in a separate read model.

**Recommended next step**: When `aggregate-designer` ships (Wave 3), use it
with this classification to design the consistency unit.
```

---

## Bundle A: Meeting → ready requirements

Use this sequence when requirements originated in a meeting and you want quality gates before development.

```
┌─────────────────────┐
│  Meeting transcript │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  /maister:quick-transcript-critic   │
│  → findings + diagnostic questions  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Follow-up (meeting or async)       │
│  Use diagnostic questions to verify │
│  assumptions and fill gaps          │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Write refined user stories/tickets │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  /maister:quick-requirements-critic │
│  → interactive 4-check critique     │
└──────────┬──────────────────────────┘
           │
           ▼ (if RC / concurrency signals)
┌─────────────────────────────────────┐
│  /maister:quick-problem-classifier  │
│  → modeling class + guidance        │
└─────────────────────────────────────┘
```

### Step-by-step walkthrough

**Step 1 — Audit the meeting**

```
/maister:quick-transcript-critic

[paste full transcript or notes]
```

Save the diagnostic questions from the report.

**Step 2 — Clarify with stakeholders**

Take the questions to a short follow-up or async thread. Example:

> "Carol, you raised double-booking in the sync — if two users click Reserve at once, should the second request fail or wait?"

**Step 3 — Capture refined requirements**

Turn answers into user stories or tickets. Keep observable behavior explicit.

**Step 4 — Critique the tickets**

```
/maister:quick-requirements-critic

[paste refined stories]
```

Work through interactive questions until you accept rewrites.

**Step 5 — Classify if needed**

If Check 2 or 3 revealed counters, pools, or concurrent access:

```
/maister:quick-problem-classifier

[paste the accepted requirement]
```

**Step 6 — Hand off to development**

When critics and classifier are satisfied, start implementation with your usual workflow, for example:

```
/maister:development "Implement room reservation with concurrent booking protection"
```

---

## Related utilities

Wave 1 critics focus on **requirements and meetings**. Maister also includes utilities for **plans**, **designs**, and **code reviews**.

### `grill-me` — stress-test a plan or design

Relentless one-question-at-a-time interview until you and Claude share the same understanding of a plan. Claude proposes a recommended answer for each question.

**When to use:** Before committing to an architecture or feature design; when you want to be challenged, not validated.

**How to invoke:**

```
/grill-me Our plan is to add a reservation microservice with Redis locks
```

Or ask naturally: *"Grill me on this design."*

There is no `quick-grill-me` command — invoke the skill by name or description.

---

### Thermo-nuclear reviews — deep code branch audits

These skills audit **code changes** on a branch or PR. They are explicit-only (like the critics) and will not run during casual coding.

| Skill | Focus |
|-------|--------|
| **`thermo-nuclear-review`** | Bugs, breaking changes, security, developer-experience regressions, feature-flag leaks |
| **`thermo-nuclear-code-quality-review`** | Maintainability, file size, spaghetti, over-abstraction, structural simplification |
| **`thermos`** | Runs **both** reviews in parallel and merges deduplicated findings |

**When to use:** Before merging a risky PR, after a large refactor, or when you want a second rigorous pass beyond `/maister:reviews-code`.

**How to invoke:**

```
Run thermos on the current branch
```

```
Thermo nuclear review of my changes before I open the PR
```

```
Thermo-nuclear code quality review — focus on the auth module refactor
```

**Contrast with Wave 1 critics:**

| | Wave 1 critics | Thermo-nuclear reviews |
|--|----------------|------------------------|
| **Input** | Transcripts, tickets, business requirements | Git diff, branch, PR |
| **Output** | Decision-process or requirements quality report | Prioritized code findings |
| **Timing** | Before implementation | Before merge / deploy |

---

## Choosing the right tool

```
                    ┌──────────────────────────┐
                    │  Where is the problem?   │
                    └────────────┬─────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
   Meeting notes            Ticket / spec            Code on a branch
         │                       │                       │
         ▼                       ▼                       ▼
 quick-transcript-        quick-requirements-      thermos or thermo-
 critic                   critic (+ problem-       nuclear-review
                          classifier if needed)
         │                       │
         └───────────┬───────────┘
                     ▼
              Still fuzzy plan?
                     │
                     ▼
                 grill-me
```

---

## Frequently asked questions

**Will Claude critique my requirements while I’m drafting them?**

No. The two critic skills require an explicit request. That keeps brainstorming sessions from turning into unsolicited audits.

**Do these commands create a task folder under `.maister/tasks/`?**

No. Wave 1 utilities are lightweight: input from your message, output in the chat. Full structured workflows still use `/maister:development`, `/maister:research`, etc.

**Can I run only part of Bundle A?**

Yes. Use transcript-critic alone before acting on meeting notes, or requirements-critic alone on an existing ticket. Bundle A is the recommended end-to-end path when both meeting quality and ticket quality matter.

**What if I’m on Cursor or Kiro instead of Claude Code?**

The same skills ship in platform-specific builds after `make build`. Command names differ slightly (e.g. Cursor may use `/maister-quick-requirements-critic`). Check your platform’s Maister command list.

**Is problem-classifier the same as task-classifier?**

No. **task-classifier** routes *what kind of Maister workflow* to run (development vs research vs migration). **problem-classifier** routes *how to model a business requirement* (CRUD vs Integration vs Resource Contention).

**What comes in Wave 3?**

When **aggregate-designer** ships, Resource Contention classifications can flow into aggregate boundary design. Wave 1 documents that handoff but does not invoke a skill that does not exist yet.

---

## Command cheat sheet

```bash
# Meeting decision audit (non-interactive report)
/maister:quick-transcript-critic [transcript or notes]

# Interactive requirements quality (4 checks)
/maister:quick-requirements-critic [requirements text]

# DDD problem class classification (may ask clarifying questions)
/maister:quick-problem-classifier [business requirement]

# Plan stress-test (skill, no quick- command)
/grill-me [plan or topic]

# Parallel deep code review (skill)
Run thermos on this branch
```

---

## Summary

Wave 1 adds three explicit, on-demand tools for requirements quality:

1. **Transcript critic** — catch bad decisions hidden in meeting dynamics  
2. **Requirements critic** — turn vague tickets into observable, implementable behavior  
3. **Problem classifier** — pick the right modeling approach before you over- or under-engineer  

Use **Bundle A** when requirements come from meetings: audit the transcript, clarify with diagnostic questions, critique the refined tickets, then classify if concurrency signals appear. Pair with **grill-me** for plan stress-tests and **thermos** for pre-merge code audits when the work moves from requirements to implementation.
