# Research Plan: Unified Agent Projections

## TL;DR
Research will run as four independent gathering streams: canonical projection, Codex runtime, Cursor/Kiro runtime, and installer/tests/docs.
Each stream must trace agents from `plugins/maister/agents/*.md` to an explicit host artifact and invocation path.
`maister-advisor` is evaluated by the same matrix as every other agent; no permission, read-only, profile, or sandbox exception is allowed.
Synthesis must produce a development-ready architecture, migration boundary, and verification matrix for `maister:development`.

## Key Decisions
- Use a mixed methodology: code-flow analysis for current behavior, official host documentation for native contracts, and requirements synthesis for the target architecture.
- Run exactly four parallel gathering categories; normalize their findings into one agent-by-host matrix during synthesis.
- Treat static installation, native discovery, and successful runtime invocation as separate claims requiring separate evidence.
- Keep `plugins/maister/agents/*.md` as the only portable behavior owner; host representations must be deterministic projections or runtime injections.

## Open Questions / Risks
- Overlay declarations may describe capabilities that are not connected to executable host adapters.
- Current Cursor and Kiro assets may contain inventory drift or unresolved prompt references; file counts alone cannot establish parity.
- Official host contracts are version-sensitive, so discovery roots and invocation APIs must be tied to the documented or observed host version.
- Codex may require a choice between native registered agents and generic subagents with injected canonical prompts; both must be evaluated without special treatment for Advisor.

## Research objective

Answer how Maister should transform, install, discover, select, and invoke every canonical agent on Codex, Cursor, and Kiro CLI while preserving transactional installation and avoiding hand-maintained prompt duplication.

## Method

Use parallel gathering followed by integrated synthesis:

1. Each gatherer answers only its assigned questions and writes evidence with exact file/line references or official documentation URLs, section names, access dates, and host versions where available.
2. Current-state claims are triangulated across implementation, configuration/materialized layout, tests, or native documentation. A declaration such as `adapter: codex.subagent` is not evidence of an executable path by itself.
3. Each gatherer records contradictions and assigns confidence: high for direct evidence confirmed by at least two independent source types, medium for one direct source or consistent indirect evidence, and low for inference or unresolved conflict.
4. Synthesis joins all findings by canonical logical role ID, including `maister-advisor` as an ordinary row.

## Parallel gathering categories

### 1. `canonical-projection`

**Goal:** Establish the canonical inventory and the deterministic transformation model shared by all hosts.

**Questions:**

- What is the complete normalized role inventory under `plugins/maister/agents/`, and which naming rule produces host-facing identifiers?
- How do overlay `layout` sources such as `common/agents` resolve to the canonical directory during materialization?
- Which agent content or metadata is duplicated in host overlays, and where can it drift from the canonical source?
- What minimum intermediate representation is required to generate Markdown agents, JSON descriptors, prompt references, or runtime prompt injections without a second behavior owner?
- Which invariants must hold for every canonical role: exactly one projection/injection per supported host, deterministic naming, resolvable prompt content, and explicit invocation mapping?
- Does the proposed model handle `advisor.md` identically to all other canonical Markdown agents?

**Primary sources:**

- `plugins/maister/agents/*.md`
- `plugins/maister/overlays/{codex,cursor,kiro-cli}/overlay.yml`
- `plugins/maister/lib/distribution/materializer.mjs`
- `plugins/maister/lib/distribution/targets.mjs`
- `plugins/maister/lib/distribution/target-paths.mjs`

**Expected output:** A normalized canonical inventory, source-to-host transformation table, duplication/drift findings, and proposed projection invariants.

### 2. `codex-runtime`

**Goal:** Determine the supported Codex representation, discovery, selection, and runtime delegation contract for every role.

**Questions:**

- What does the Codex overlay currently install, and which installed paths are plugin resources versus native agent discovery locations?
- Can a Codex workflow create a generic subagent and inject the selected canonical Markdown prompt, or must every role be registered as a native custom agent?
- How does the workflow pass a deterministic logical role ID, role instructions, model choice, and task context to the Codex runtime?
- What namespace prevents collisions with project/user agents, and what is the fallback when native registration or delegation is unavailable?
- Which evidence proves native discovery separately from successful invocation and role-specific behavior?
- Does `maister-advisor` use precisely the same projection and invocation path, with no `.codex/agents` exception, read-only flag, or sandbox setting?

**Primary sources:**

- `plugins/maister/overlays/codex/overlay.yml`
- `plugins/maister/lib/distribution/{materializer.mjs,targets.mjs,target-paths.mjs}`
- Official OpenAI Codex documentation for plugins, custom agents/subagents, project and user discovery roots, and programmatic delegation
- Codex-related platform-independent test filenames as pointers to existing structural coverage

**Expected output:** One end-to-end Codex sequence (`canonical role -> projected/injected representation -> discovery -> explicit invocation -> result`) plus supported alternatives, gaps, and required native evidence.

### 3. `cursor-kiro-runtime`

**Goal:** Establish and compare the native agent contracts for Cursor and Kiro CLI without conflating their artifact formats.

**Questions:**

- For Cursor, which plugin `agents/*.md` files are natively discovered, how are names formed, and how does a workflow invoke an exact named subagent?
- Is Cursor's checked-in agent tree a deterministic projection or a hand-maintained behavior copy, and what migration removes that duplication?
- For Kiro CLI, what schema defines `agents/*.json`, how are prompt files referenced, and are all referenced prompt files installed at the resolved location?
- How does Kiro select a named agent for delegated work versus a default chat agent?
- For both hosts, what happens on missing, duplicate, or colliding role names, and how can invocation fail closed rather than selecting another agent?
- Does each host apply the identical naming, projection, discovery, and invocation rules to `maister-advisor` and every other role?

**Primary sources:**

- `plugins/maister/overlays/cursor/overlay.yml`
- `plugins/maister/overlays/kiro-cli/overlay.yml`
- `plugins/maister/lib/distribution/{materializer.mjs,targets.mjs,target-paths.mjs}`
- Official Cursor documentation for plugins, custom/subagents, agent file format, discovery, and invocation
- Official Kiro CLI documentation for custom-agent JSON schema, prompt/instruction references, discovery roots, default-agent selection, and delegated invocation

**Expected output:** Separate Cursor and Kiro end-to-end sequences, a reference-integrity audit, a parity comparison against canonical roles, and host-specific transformation requirements.

### 4. `installer-tests-docs`

**Goal:** Define how unified projections participate in installation lifecycle, validation, migration, and documentation.

**Questions:**

- Which destination paths are owned per host, and how do install, update, uninstall, rollback, and drift checks preserve exact ownership and unmanaged content?
- At what stage should projections be generated: source preparation, materialization, or runtime invocation, and how is deterministic output verified?
- Which existing platform-independent suites cover overlay shape, target paths, materialization, transactions, topology, parity, and release packaging?
- What new tests are required for inventory equality, normalized naming, content derivation, prompt-reference closure, collision rejection, explicit role selection, native discovery, and successful role invocation?
- What migration removes stale project `.codex/agents` files and duplicated overlay agents without deleting user-modified files or weakening rollback?
- Which user and contributor documents must explain canonical ownership, per-host destinations, invocation semantics, unsupported/unavailable states, and migration?

**Primary sources:**

- `plugins/maister/lib/distribution/{materializer.mjs,targets.mjs,target-paths.mjs}`
- `plugins/maister/overlays/{codex,cursor,kiro-cli}/overlay.yml`
- Filenames under `tests/platform-independent/`, especially overlay, materializer, target registry, installer transaction, topology, parity, and release-package suites
- `.maister/docs/project/{architecture,tech-stack,vision,roadmap}.md`
- `.maister/docs/standards/global/build-pipeline.md`
- `.maister/docs/standards/testing/test-writing.md`
- `docs/commands.md` and `docs/workflows.md`

**Expected output:** Transaction-aware projection lifecycle, migration rules, test matrix, documentation impact list, and acceptance criteria suitable for an implementation specification.

## Evidence standards

- Cite repository evidence as `path:line`; cite external evidence with official URL, section heading, access date, and relevant host/version.
- Distinguish declared layout, materialized artifact, native discovery, and successful invocation. Never infer a later stage from an earlier one.
- Confirm inventory by normalized identifiers and resolved content/reference closure, not only by counts or filenames.
- Require two-source triangulation for high-confidence current-state claims; record conflicts instead of selecting the preferred source silently.
- Treat absent native runtime prerequisites as `unavailable`, not passed. Define the probe needed to raise confidence.
- Apply every question and test to `maister-advisor` through the ordinary agent matrix; flag any special-case branch as contrary to the research constraint.

## Synthesis criteria

The final recommendation is development-ready only if it provides:

1. One portable behavior owner and one normalized logical role ID for every agent.
2. A deterministic per-host mapping from canonical source through installed or injected representation to explicit runtime invocation.
3. No host-specific Advisor exception and no implicit role selection.
4. Reference closure and collision behavior for every generated artifact.
5. Transactional install/update/uninstall/rollback and safe migration semantics.
6. A verification matrix separating structural, materialization, transaction, native discovery, and native invocation evidence.
7. Explicit decisions, rejected alternatives, unresolved risks, and concrete inputs for the subsequent `maister:development` workflow.

