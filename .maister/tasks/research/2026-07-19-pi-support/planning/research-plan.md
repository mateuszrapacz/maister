# Research Plan: First-Class Pi Support

## TL;DR
Use a mixed, evidence-first methodology across five parallel investigation categories.
Treat the installed Pi 0.79.10 runtime and `pi-subagents` 0.35.1 package as the empirical baseline, then reconcile observations with their official upstream sources.
Map the resulting host contract onto Maister's canonical source, overlay, projection, installer, runtime, evidence, and release boundaries.
Converge on an implementation-ready Pi target design only after a native delegation probe and a target-by-target gap matrix are complete.

## Key Decisions
- Run five gatherers in parallel, each with a stable category ID and a non-overlapping primary responsibility.
- Prefer direct code, package metadata, installed documentation, executable behavior, and existing tests over summaries or inferred conventions.
- Model Pi support as a new target contract without assuming that Codex, Cursor, or Kiro layouts can be copied unchanged.
- Base Maister native-agent execution on the installed `pi-subagents` extension; evaluate other extensions only when a demonstrated capability gap remains.
- Keep all empirical probes read-only or isolated in temporary directories; do not mutate the user's active Pi configuration or Maister installation.

## Open Questions / Risks
- The installed `@earendil-works/pi-coding-agent` 0.79.10 is behind the `pi-subagents` 0.35.1 development peer version 0.80.10, so observed compatibility and documented contracts may diverge.
- Package discovery and extension APIs may be versioned by convention rather than by a stable compatibility contract.
- `pi-subagents` may expose sufficient interactive delegation but insufficient durable event, identity, policy, cancellation, or resumability evidence for Maister's exact-native runtime.
- A Pi-native package layout could create a behavior-bearing projection unless ownership and drift checks remain explicit.

## Research Type and Methodology

This is **mixed research**:

- **Technical:** trace Maister's source-to-target, install, runtime-dispatch, and evidence flows; inspect Pi and `pi-subagents` implementations.
- **Requirements:** derive must-have compatibility requirements from Maister's safety, auditability, resumability, canonical ownership, and release guarantees.
- **Literature:** verify Pi package, extension, prompt, skill, command, and subagent conventions against official upstream documentation and source.

Use a hybrid of iterative deepening, multi-source triangulation, and comparative analysis:

1. Discover relevant files, installed versions, commands, and package metadata.
2. Read primary implementation and contract files completely.
3. Trace representative flows end to end.
4. Run bounded empirical probes against the installed runtime.
5. Cross-check runtime observations against official upstream source at the installed version when possible.
6. Compare Pi with the three supported Maister targets and synthesize a gap matrix.

## Research Decomposition

The main question decomposes into these decision-oriented subquestions:

1. Which canonical Maister components must change to register a fourth supported target without creating a second source of truth?
2. What exact filesystem/package contracts does the installed Pi use for extensions, skills, prompts, commands, settings, and package discovery?
3. Which `pi-subagents` APIs and observable events can implement `resolveAgent`, `dispatchAgent`, and `readExecutionEventStream` semantics?
4. How should install, verify, update, uninstall, recovery, packaging, provenance, and evidence treat Pi-owned and user-owned state?
5. What tests and evidence are required before Pi can be called structurally supported, exact-native capable, or semantically verified?

## Gathering Strategy

Launch **5 gatherers in parallel**. Each gatherer writes exactly one category report under `analysis/findings/` and begins it with the Artifact Summary Contract sections. Category reports must cite every material claim and separate observation, upstream contract, inference, and recommendation.

### Category `maister-core-contract`

- **Output:** `analysis/findings/01-maister-core-contract.md`
- **Primary questions:**
  - Where are supported targets registered, validated, materialized, installed, packaged, and tested?
  - How do canonical skills, commands, agents, overlays, inventories, semantic bindings, and target-specific projections relate?
  - What closed schemas, target enums, forbidden topology rules, and release loops require a Pi entry?
  - Which invariants must a Pi adapter preserve for ownership, provenance, transactions, exact-native identity, and evidence freshness?
- **Source priority:** current source code and behavior tests; overlay and inventory contracts; project architecture/roadmap; CI and Make targets; historical references only when explicitly labeled as parity context.
- **Empirical tests:** run focused discovery and existing read-only test commands that reveal target assumptions; trace one existing target from registry through materialization, package, install receipt, runtime gate, and release test; record commands and results without changing sources.
- **Expected evidence:** file-and-symbol inventory, current target flow, extension points, hard-coded target assumptions, invariants, and preliminary Pi change surface.

### Category `pi-host-contract`

- **Output:** `analysis/findings/02-pi-host-contract.md`
- **Primary questions:**
  - Which Pi executable and package versions are installed, and what configuration roots and precedence rules are active?
  - How are npm/local packages, extensions, skills, prompts, commands, themes, and settings discovered and loaded?
  - Which resources are Pi-native primitives versus conventions implemented by packages?
  - What non-interactive, JSON/event, session, model, working-directory, extension-selection, and failure interfaces are available for automation?
- **Source priority:** installed package metadata and shipped docs/source for `@earendil-works/pi-coding-agent` 0.79.10; executable `--help` and isolated runtime probes; official `earendil-works/pi` source and tagged history; original upstream only to clarify lineage, never to override installed-fork behavior.
- **Empirical tests:** capture `pi` path/version/help; inventory active packages from settings without exposing secrets; load a minimal temporary extension/package in an isolated Pi config root; verify discovery of an extension, skill, and prompt/command-like surface; observe stdout/stderr, exit status, created files, and session/event behavior. Do not alter `~/.pi/agent/settings.json`.
- **Expected evidence:** version-bound host contract, resource layout table, precedence/ownership rules, automation interfaces, and mismatches between docs and runtime.

### Category `pi-subagents-native-runtime`

- **Output:** `analysis/findings/03-pi-subagents-native-runtime.md`
- **Primary questions:**
  - How does installed `pi-subagents` 0.35.1 discover agent descriptors and skills, select identities, launch children, fan out work, report progress, and return results?
  - What public APIs are exposed by `./delegation` and `./background-work`, and which extension/RPC/internal APIs would be unsafe to depend on?
  - Can it provide exact selected-agent identity, bounded request/result schemas, cancellation, concurrency control, durable execution events, and resumed inspection?
  - What is the smallest adapter from Maister's three-method runtime port to the extension without reimplementing subagents?
- **Source priority:** installed `pi-subagents` package source, README, changelog, agents, prompts, skills, exports, and tests if present; official `nicobailon/pi-subagents` source/tag for 0.35.1; direct native delegation behavior; Maister runtime contracts as the comparison baseline.
- **Empirical tests:** execute at least one bounded native delegation through the installed extension in a temporary task/work directory; capture selected agent, request, completion/failure, output, and observable event trail; separately probe parallel/fan-out or background inspection if safely available; test an invalid/unknown agent and cancellation or explicit unavailability. Redact credentials and avoid modifying the active package installation.
- **Expected evidence:** delegation sequence, API stability assessment, capability matrix against `resolveAgent`/`dispatchAgent`/`readExecutionEventStream`, exact-native gaps, and adapter boundary recommendation.

### Category `distribution-installation`

- **Output:** `analysis/findings/04-distribution-installation.md`
- **Primary questions:**
  - What Pi overlay layout and inventory can be generated from the existing canonical sources without checked-in behavior duplication?
  - Which Pi paths and settings keys would Maister manage, and which must remain operator-owned?
  - How should local checkout, archive, and GitHub-source installation materialize and transactionally commit Pi assets?
  - What package metadata, dependency/version checks, rollback/recovery behavior, receipts, and deterministic release artifacts are required?
- **Source priority:** Maister materializer, target registry, overlay contracts, installer/receipt/journal/recovery code, package/release tests, Makefile and CI; Pi package manifest and official package-discovery rules; installed filesystem only as a read-only reality check.
- **Empirical tests:** stage a hypothetical Pi target layout in a temporary directory using existing materializer conventions or a manually documented fixture; check path collisions, settings ownership, deterministic enumeration, symlink/path safety, and lifecycle expectations; compare a package-local install with user-global Pi discovery without committing either to the active configuration.
- **Expected evidence:** proposed overlay/package tree, managed/unmanaged ownership table, installer lifecycle deltas, version/prerequisite policy, and deterministic packaging/provenance implications.

### Category `compatibility-validation`

- **Output:** `analysis/findings/05-compatibility-validation.md`
- **Primary questions:**
  - What resource and behavior gaps exist between Codex, Cursor, Kiro CLI, and Pi for skills, commands, agents, gates, state, and native execution?
  - Which current requirement and success-criterion tests can be parameterized for Pi, and which need Pi-specific fixtures or scenarios?
  - What constitutes E1/E2/E3/E4, provisional native E5, and semantic E6 evidence for Pi?
  - Which negative tests prevent false support claims, silent inline fallback, stale native evidence, and reintroduced generated-source ownership?
- **Source priority:** current test suites and fixtures; project roadmap's requirement-to-test inventory; evidence schemas/policies; findings from the other categories when available; official Pi contracts for scenario feasibility.
- **Empirical tests:** execute safe baseline suites or enumerate their assertions; construct a traceability matrix from Pi requirements to tests; define a version-bound native scenario using the delegation probe; verify that missing executable, extension, authentication, identity observation, or event access yields typed `unavailable`/`blocked`, never `passed`.
- **Expected evidence:** four-target gap matrix, capability/evidence matrix, proposed test additions, CI/release gates, and explicit support-level terminology.

## Cross-Category Merge Protocol

After all gatherers return:

1. Normalize version facts: installed Pi package, executable, Node runtime, `pi-subagents`, active package declarations, and upstream revision/tag.
2. Reconcile contradictions by preferring reproducible installed behavior, then installed source/docs, then same-version official upstream source, then newer upstream guidance.
3. Link each proposed Maister change to both a host capability and an existing project invariant.
4. Build a gap matrix with rows for target registration, overlay, inventory, skills, commands/prompts, agents, runtime bridge, execution events, installation, state, evidence, packaging, CI, and release.
5. Classify each row as reuse unchanged, parameterize, Pi adapter required, Pi projection required, extension prerequisite, or unsupported/unavailable.
6. Separate verified facts from design recommendations and give each finding a high/medium/low confidence rating.

## Synthesis Requirements

The synthesizer should produce an implementation-ready recommendation containing:

- a concise verified Pi host contract bound to observed versions;
- the recommended `pi` target registry and overlay model;
- the generated artifact/package layout and canonical ownership boundary;
- command, skill, prompt, and agent projection rules;
- a `pi-subagents`-based runtime adapter sequence and capability fallbacks;
- installer, settings, receipt, update, rollback, recovery, and uninstall behavior;
- deterministic package, provenance, evidence, and release changes;
- a four-target gap matrix and requirement-to-test traceability matrix;
- staged implementation slices with acceptance criteria;
- unresolved risks, upstream dependencies, and explicit unsupported outcomes.

## Evidence and Citation Rules

- Cite repository files as paths with line ranges or symbols; include commit when the working tree provenance matters.
- Cite installed artifacts with package name, exact version, absolute path, and relevant file/symbol; never quote secrets or session content.
- Cite empirical behavior with the exact sanitized command, environment isolation used, timestamp, exit status, and artifact/log location.
- Cite upstream claims with canonical repository/document URL plus tag, commit, or release version and access date.
- Mark inference explicitly and name the evidence it connects.
- Use **high confidence** only for convergent direct evidence or a reproducible probe; **medium** for one authoritative source or partial verification; **low** for inference, version drift, or unresolved contradiction.

## Safety and Scope Guardrails

- Do not edit Maister production sources during research.
- Do not edit active Pi settings, extensions, installed npm package contents, sessions, credentials, or model configuration.
- Use `mktemp -d` or an equivalent explicit temporary root for probes and report cleanup status.
- Do not install another extension unless a specific evidence gap cannot be closed from installed artifacts or official source; record the reason, package, version, and side effects if installation becomes necessary.
- Do not treat successful interactive output as proof of identity, policy, durability, or resumability unless those properties are independently observed.
- Stop a probe if it could disclose credentials, modify an uncontrolled workspace, contact an unintended service, or leave an untracked child process.

## Completion Criteria

Phase 1 gathering is complete when all five category reports exist and collectively provide:

- a current Maister integration inventory;
- a version-bound Pi resource and automation contract;
- at least one native delegation result using installed `pi-subagents`;
- a capability gap analysis for the Maister runtime port;
- a proposed Pi target/install/package layout;
- a four-target compatibility and evidence matrix;
- cited unknowns and confidence assessments sufficient for synthesis.
