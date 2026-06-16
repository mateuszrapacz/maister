# Wave 2 AJ Skills — User Guide

Maister Wave 2 brings architecture-review and stakeholder-communication capabilities from Architekt Jutra research into the plugin. This guide covers what was added, when to use it, and how to chain the new commands into practical workflows.

**Audience:** Plugin consumers using Claude Code, Cursor Agent CLI, or Kiro CLI.

**Prerequisites:** Maister installed and project initialized with `/maister:init`.

---

## What Wave 2 Adds

Wave 2 has two deliverables:

| Track | Name | What you get |
|-------|------|--------------|
| **E2** | `language-md-convention` standard | A project standard describing how to document ubiquitous language per module via `language.md` files |
| **E3** | Three skills + commands | Architecture review and communication diagnosis tools ported from Architekt Jutra |

### E2 — language.md convention

After `/maister:init`, the standard lives at:

`.maister/docs/standards/global/language-md-convention.md`

It defines where to place `language.md` files, what sections they should contain (module description, core terms, operations, events, integration points), and how relationship types (OHS, ACL, Customer-Supplier, etc.) declare language flow between bounded contexts.

**Adoption is optional.** Maister does not scaffold `language.md` files automatically. Create them manually when your team uses DDD-style bounded contexts or when you want full value from the linguistic boundary verifier.

### E3 — Three new skills

| Skill | Command | Type |
|-------|---------|------|
| `test-strategy-reviewer` | `/maister:reviews-test-strategy` | Read-only review (explicit request only) |
| `linguistic-boundary-verifier` | `/maister:reviews-linguistic-boundaries` | Read-only review (explicit request only) |
| `metaprogram-classifier` | `/maister:quick-metaprogram-classifier` | Interactive classifier |

These skills are **not** auto-invoked by development or product-design orchestrators. Orchestrators may *suggest* them at phase gates (soft suggestions per ADR-008), but you run the commands explicitly when you want the analysis.

> **Note on review commands:** Existing review commands like `/maister:reviews-code` delegate to **subagents**. Wave 2 review commands delegate to **skills** with architecture-review rubrics baked in.

---

## Command Reference

### Claude Code (primary)

| Command | Arguments | Purpose |
|---------|-----------|---------|
| `/maister:reviews-test-strategy` | `[test path or directory]` | Check whether test strategy matches the problem class of production code |
| `/maister:reviews-linguistic-boundaries` | `[module names \| all \| module --pr]` | Audit language leakage across bounded contexts via `language.md` |
| `/maister:quick-metaprogram-classifier` | `[utterance, email, or described behavior]` | Diagnose NLP metaprograms and suggest communication strategies |

All three commands work **without arguments** when you have already pasted the relevant text or described the scope in conversation — the skill picks up context from the chat.

### Cursor Agent CLI

Use the `maister-` prefix (hyphen, not colon):

```
/maister-reviews-test-strategy tests/unit/OrderServiceTest.php
/maister-reviews-linguistic-boundaries billing inventory
/maister-quick-metaprogram-classifier
```

### Kiro CLI

Wave 2 `@` shortcuts are deferred. Invoke the underlying skills via chat prompts or skill names in the Kiro TUI until shortcuts ship.

---

## Skill Details

### `/maister:reviews-test-strategy`

**When to use**

- You suspect tests are brittle, over-mocked, or testing at the wrong abstraction level
- A PR mixes transformation logic with integration orchestration and you want strategy guidance
- After refactoring production code, you want to confirm tests still match the problem class

**When not to use**

- Writing new tests or fixing failing tests (unless you explicitly want strategy review)
- General “how should I test X?” questions without reviewing existing tests

**Example invocations**

```
/maister:reviews-test-strategy tests/integration/OrderFulfillmentTest.php
```

```
We've been mocking the database in these service tests — is that the right approach?
/maister:reviews-test-strategy src/services/ and tests/services/
```

**What happens**

1. **Language gate** — You choose English, Polish, or match input language for questions and the report.
2. **Problem classification** — The skill reads production code and tests, classifies each unit as Transformation, Stateful Object, or Integration, and **asks you to confirm** before recommending changes.
3. **Strategy comparison** — For each test class it compares current strategy (output-based, state-based, interaction-based) against recommendations.
4. **Report** — Per test file: problem class, current vs recommended strategy, verdict (OK or MISMATCH), and concrete change suggestions.

**Expected output (excerpt)**

```markdown
### OrderFulfillmentServiceTest

**Tests**: OrderFulfillmentService
**Problem class**: Integration
**Current strategy**: output-based
**Recommended strategy**: interaction-based (mock unmanaged dependencies at system edge)
**Verdict**: MISMATCH

Tests assert final JSON response while calling real SMTP and message bus...
```

**Recommended next steps** (from the skill): If domain modeling class is unclear, run `/maister:quick-problem-classifier` on the requirement. On the same PR, optionally pair with `/maister:thermos` for code-risk review.

---

### `/maister:reviews-linguistic-boundaries`

**When to use**

- Architectural review touching multiple modules or bounded contexts
- Before a major cross-module refactor
- Quarterly architecture health check
- Single-module PR review (`--pr`) to catch new concepts that break a module's generalization

**When not to use**

- Routine code review without boundary concerns
- Deciding *where* boundaries should be (that requires context discovery — planned for a future wave)

**Prerequisites for full verification**

Modules should have `language.md` at `<module>/language.md` following the convention standard. Each file declares the module's vocabulary and integration points with related modules — no separate context-map file is required.

**Example invocations**

```
/maister:reviews-linguistic-boundaries billing inventory scheduling
```

```
/maister:reviews-linguistic-boundaries all
```

```
/maister:reviews-linguistic-boundaries resource --pr
```

**What happens**

**Cross-module mode** (2+ modules or `all`):

1. Parses `language.md` files and reconstructs the relationship graph from integration points
2. Greps for foreign terms in code (strings, events, API calls)
3. Presents violations with ASCII diagrams and pauses for your confirmation
4. Proposes type-specific fixes (generalization for strings, ACL for events, dependency inversion for API calls)
5. Writes `linguistic-boundary-report.md`

**Single-module PR mode** (`module --pr`):

1. Diffs the PR for new class names, methods, string literals, event types
2. Checks whether new terms fit the module's linguistic space
3. Flags terms that smell like downstream language leaking into a generalization module

**Graceful degradation (no language.md files)**

If no `language.md` files exist in scope, the skill **does not error**. It completes with a **"Convention not adopted"** report that:

- Links to `.maister/docs/standards/global/language-md-convention.md`
- Summarizes the template
- Optionally runs limited string-leakage heuristics with a disclaimer
- Recommends adopting the convention before re-running full verification

**Expected output (excerpt)**

```markdown
## Executive Summary
Boundary health: 2 violations found (1 string leakage, 1 event in foreign language)
Fix proposals: 2 confirmed, 0 boundary questions

## Violations with Fixes

### VIOLATION: reason.equals("MAINTENANCE") in ResourceService.java:47
**Type**: String from foreign context
**Fix**: Unavailability.requiresSafetyBuffer: boolean
**User decision**: Yes
```

**Recommended next steps:** Run `/maister:reviews-test-strategy` on tests spanning the same modules. Optionally pair with `/maister:thermos` on the same PR.

---

### `/maister:quick-metaprogram-classifier`

**When to use**

- Someone shared an email or Slack message and you need to know how to respond effectively
- Recurring communication friction with a stakeholder or manager
- Preparing for a difficult conversation (refactoring proposal, architecture change, scope negotiation)
- Diagnosing why "clear explanations" aren't landing

**When not to use**

- Psychometric profiling, hiring decisions, or permanent personality labeling
- Normal conversation where you are not asking for communication-style analysis

**Example invocations**

```
/maister:quick-metaprogram-classifier "Niestety nie mogę się z tobą nie zgodzić, ale potrzebuję więcej szczegółów zanim cokolwiek zatwierdzę."
```

```
My PM keeps saying "let's just ship it" when I raise edge cases. Here's what they wrote: [paste message]
/maister:quick-metaprogram-classifier
```

**What happens**

1. **Language gate** — English, Polish, or match input language
2. **Context identification** — Situation, role, emotional context (silent analysis)
3. **Signal scan** — All 7 metaprograms assessed with confidence levels and cited evidence
4. **Compound patterns** — e.g., Detail + Differences, Reactive + Away-From-Problems
5. **Communication strategies** — Per detected pattern: what to do, what to avoid, sample opening phrase

**The 7 metaprograms**

| # | Metaprogram | Poles |
|---|-------------|-------|
| MP1 | Information sorting | Similarities ↔ Differences |
| MP2 | Granularity | Detail ↔ Big picture |
| MP3 | Authority source | Internal ↔ External reference |
| MP4 | World orientation | Away-from problems ↔ Toward goals |
| MP5 | Self-motivation | Reactive ↔ Proactive |
| MP6 | Self-persuasion | Necessity ↔ Possibility |
| MP7 | Priority | Self ↔ Others |

**Expected output (excerpt)**

```markdown
## Metaprogram Analysis

### Detected Metaprograms
| Metaprogram | Detected pole | Confidence | Evidence |
| Information Sorting | Differences | High | "nie mogę się z tobą nie zgodzić" |
| Granularity | Detail | High | "potrzebuję więcej szczegółów" |

### Communication Strategies

#### Granularity — Detail
**Do**: Provide step-by-step specifics before asking for approval
**Avoid**: Leading with abstract benefits only
**Sample opening**: "Before we decide, here are the three concrete cases I tested..."
```

**Recommended next steps:** Stress-test your proposal with `/maister:grill-me` before the conversation (see Bundle D below).

---

## Bundled Workflows

Wave 2 skills chain via each skill's **Recommended Next Steps** section — not through an orchestrator. Run commands in sequence when the prior skill's output points you to the next step.

### Bundle C — Architecture Review

Use when reviewing a PR or module set where bounded contexts and test strategy both matter.

```
Step 1: /maister:reviews-linguistic-boundaries [modules or all]
Step 2: /maister:reviews-test-strategy [tests for same scope]
Step 3 (optional): /maister:thermos [same PR branch]
```

**Why this order**

1. **Linguistic boundaries first** — Catches vocabulary leaking across modules; architectural dependency tools (ArchUnit, deptrac, Nx) miss string literals and foreign event names
2. **Test strategy second** — Once boundaries are understood, verify tests match the problem class of the code under test
3. **Thermos optional** — Adds branch-level code risk (bugs, security, breaking changes) complementary to architecture rubrics

**Example session**

```
You: We refactored billing and inventory modules in this PR.
You: /maister:reviews-linguistic-boundaries billing inventory
→ Boundary report with violation diagrams and fix proposals

You: /maister:reviews-test-strategy tests/billing/ tests/inventory/
→ Test strategy report per test class

You: /maister:thermos
→ Combined thermo-nuclear review on current branch
```

**Without language.md:** Step 1 still runs but returns adoption guidance instead of full boundary analysis. Follow the [language.md adoption](#adopting-languagemd-files) section, then re-run.

### Bundle D — Stakeholder Communication

Use before a difficult conversation where you need to match your message to the other person's cognitive filters and stress-test your own proposal.

```
Step 1: /maister:quick-metaprogram-classifier [stakeholder message or behavior]
Step 2: /maister:grill-me [your proposal]
```

**Why this order**

1. **Metaprogram classifier** — Diagnoses how the stakeholder processes information (detail vs big picture, toward goals vs away-from problems, etc.) and suggests concrete phrasing
2. **Grill-me** — Relentlessly questions your plan one decision at a time until gaps are closed before you walk into the meeting

**Example session**

```
You: My director wrote: "Doskonała okazja — wyprzedźmy konkurencję. Nie rozumiem czemu to trwa tyle."
You: /maister:quick-metaprogram-classifier
→ Strategies: lead with goal/benefit, don't open with risk lists, frame technical work as competitive advantage

You: I want to propose a two-sprint refactor of the payment module before adding the new checkout flow.
You: /maister:grill-me
→ Interactive Q&A stress-testing your proposal with recommended answers
```

> `/maister:grill-me` invokes the `grill-me` skill directly. There is no separate orchestrator — paste your plan or topic and answer questions one at a time.

---

## Adopting language.md Files

The linguistic boundary verifier delivers full value when modules document their ubiquitous language. Use this checklist to adopt the convention incrementally.

### 1. Read the standard

```
Open: .maister/docs/standards/global/language-md-convention.md
```

Or browse via `.maister/docs/INDEX.md` → Global Standards → language.md Convention.

### 2. Start with high-value modules

Prioritize modules that are:

- **Generalizations** serving many consumers (Resource, PricingEngine, Invoicing) — strictest boundary enforcement
- **Integration hubs** with many dependencies — relationship map is most complex
- **Actively changing** in current PRs — immediate ROI from `--pr` mode

Skip infrastructure-only folders (config, shared utils) unless they own domain language.

### 3. Create one language.md per module

Place at `<module>/language.md`. Minimum sections:

| Section | Purpose |
|---------|---------|
| **Module Description** | Role: generalization vs specific capability |
| **Core Terms** | Glossary owned by this context |
| **Operations** | Commands/APIs in this vocabulary |
| **Events** | Published or subscribed events |
| **Integration Points** | Per related module: relationship type, direction, imported/exported terms |
| **Published API** (optional) | Terms consumers may use; when absent, all Core Terms are available |

### 4. Minimal example

```markdown
# Resource

## Module Description
Generalization module providing shared resource availability.
Serves HR, Training, and Facilities as consumers.

## Core Terms
- **Resource** — Any bookable entity (room, equipment, trainer slot)
- **Availability** — Time window when a resource can be allocated

## Operations
- checkAvailability(resourceId, timeRange)
- allocate(resourceId, timeRange, requesterId)

## Events
- ResourceAllocated
- ResourceReleased

## Integration Points

### HR (Customer-Supplier)
- Direction: HR (supplier) → Resource (customer)
- Imported: EmployeeId
- Exported: Availability, Allocation
```

### 5. Verify incrementally

After each module (or batch):

```
/maister:reviews-linguistic-boundaries [module-name]
```

When several modules are documented:

```
/maister:reviews-linguistic-boundaries all
```

For PRs touching a single documented module:

```
/maister:reviews-linguistic-boundaries resource --pr
```

### 6. Iterate from verifier feedback

The skill proposes `language.md` updates when it finds vocabulary gaps or misclassified integration points. Treat the report as a living backlog — update `language.md` as the codebase evolves.

### Adoption tips

- **Team aliases are fine** — "provider/consumer" instead of OHS/ACL works if direction and translation expectations are declared
- **No context-map file needed** — The relationship graph is reconstructed from integration point sections across all `language.md` files
- **Optional Published API section** — Use it when internal Core Terms should not leak to consumers
- **Document non-standard layouts** — If modules live in monorepo packages or nested service folders, note the pattern in `.maister/docs/INDEX.md` so reviewers can find files

---

## Relationship to Other Maister Commands

| Related command | Relationship |
|-----------------|--------------|
| `/maister:quick-problem-classifier` | Classifies **business requirements** into DDD modeling classes (CRUD, Transformation & Presentation, Integration, Resource Contention). Different taxonomy from test-strategy-reviewer's **testing** problem classes — use when domain modeling class is unclear before Bundle C step 2 |
| `/maister:quick-requirements-critic` | Requirements quality (Bundle A). Complements metaprogram classifier when communication issues stem from vague requirements |
| `/maister:thermos` | Optional third step in Bundle C for code/branch risk |
| `/maister:grill-me` | Second step in Bundle D for proposal stress-testing |
| `/maister:development` | May *suggest* requirements-critic in Phase 5; does not auto-run Wave 2 reviews |
| `/maister:product-design` | May *suggest* transcript-critic when transcripts exist in `context/`; does not auto-run Wave 2 reviews |

---

## Quick Decision Guide

| I want to… | Run |
|------------|-----|
| Check if tests mock too much or test the wrong layer | `/maister:reviews-test-strategy [path]` |
| Find domain terms leaking across modules | `/maister:reviews-linguistic-boundaries [modules]` |
| Validate new terms in a single-module PR | `/maister:reviews-linguistic-boundaries [module] --pr` |
| Understand how to talk to a stakeholder | `/maister:quick-metaprogram-classifier [message]` |
| Full architecture review on a PR | Bundle C (boundaries → test strategy → optional thermos) |
| Prepare for a hard conversation | Bundle D (metaprogram → grill-me) |
| Document module vocabulary for the team | Create `language.md` per convention standard |

---

## Further Reading

- [README.md](../../../../../README.md) — Quick command table and Bundle C/D summaries
- [plugins/maister/CLAUDE.md](../../../../../plugins/maister/CLAUDE.md) — Full skill and command reference for plugin internals
- `.maister/docs/standards/global/language-md-convention.md` — Authoritative template and relationship types
- Skill source (for deep rubrics): `plugins/maister/skills/test-strategy-reviewer/`, `linguistic-boundary-verifier/`, `metaprogram-classifier/`
