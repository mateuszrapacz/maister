# Canonical Agent Inventory and Cross-Host Projection

## TL;DR
`plugins/maister/agents/*.md` contains 28 internally consistent canonical roles, including ordinary role `advisor`.
Codex copies all 28 canonical files verbatim into an internal prompt pool; Cursor and Kiro instead consume hand-maintained native assets.
Cursor projects only 27 canonical roles and substitutes host-only `explore`; Kiro has descriptors for all 28 but installs none of their referenced prompt files.
Development should add one deterministic agent projector plus an explicit logical-role mapping, while leaving materialization as validated byte copying.

## Key Decisions
- Use the canonical filename/frontmatter `name` as the logical role ID and derive the host ID as `maister-<role-id>` only at a host boundary.
- Require a bijection between all 28 canonical roles and each supported host projection/injection; classify `explore` and Kiro's root `maister` agent separately as host-support roles.
- Treat `advisor` through the same projection, naming, reference-closure, and invocation rules as every other role; introduce no Codex profile, read-only, or sandbox branch.
- Generate/check Cursor Markdown and Kiro descriptor/prompt pairs before materialization; keep the materializer a deterministic copier and validator.

## Open Questions / Risks
- Kiro tool lists and Cursor host substitutions are currently hand-authored metadata; development must decide which portable capability fields belong in the canonical IR and which remain declarative host mappings.
- This stream proves projection structure, not native host discovery or successful invocation; those claims require the host-runtime findings.
- Existing parity baselines explicitly accept deletion of Cursor E2E and Kiro instruction files, so tests must be changed with the implementation or they will preserve the current gaps.

## Scope and evidence method

This finding covers canonical inventory, name normalization, overlay source resolution, materializer behavior, duplication/drift, and projection invariants. It does not claim host-native discovery or execution. Repository evidence is cited as `path:line`; normalized comparisons were made by filename stem, frontmatter `name`, native descriptor `name`, prompt reference, and content after removing only explicit host metadata/name transformations.

Confidence labels follow the research plan: **high** means direct source evidence corroborated by another source type; **medium** means one direct source or a deterministic inference; **low** means unresolved inference.

## Normalized canonical inventory

The canonical set is exactly 28 Markdown files. For every file, the filename stem equals frontmatter `name`; therefore the stable logical role ID can be read without an additional registry. The frontmatter shape is mostly `name`, `description`, `model`, and `color`; `docs-operator` and the two thermo-nuclear roles instead declare skill dependencies. This makes the canonical Markdown sufficient to own role identity, description, portable metadata, and behavior text, while host-specific capabilities must live in an explicit projection mapping rather than a second prompt copy.

| Logical role ID | Canonical evidence | Codex prompt pool | Cursor native Markdown | Kiro JSON descriptor |
|---|---|---:|---:|---:|
| `advisor` | `plugins/maister/agents/advisor.md:2` | yes | yes | yes |
| `bottleneck-analyzer` | `plugins/maister/agents/bottleneck-analyzer.md:2` | yes | yes | yes |
| `code-quality-pragmatist` | `plugins/maister/agents/code-quality-pragmatist.md:2` | yes | yes | yes |
| `code-reviewer` | `plugins/maister/agents/code-reviewer.md:2` | yes | yes | yes |
| `codebase-analysis-reporter` | `plugins/maister/agents/codebase-analysis-reporter.md:2` | yes | yes | yes |
| `docs-operator` | `plugins/maister/agents/docs-operator.md:2` | yes | yes | yes |
| `e2e-test-verifier` | `plugins/maister/agents/e2e-test-verifier.md:2` | yes | **missing** | yes |
| `gap-analyzer` | `plugins/maister/agents/gap-analyzer.md:2` | yes | yes | yes |
| `html-companion-writer` | `plugins/maister/agents/html-companion-writer.md:2` | yes | yes | yes |
| `implementation-completeness-checker` | `plugins/maister/agents/implementation-completeness-checker.md:2` | yes | yes | yes |
| `implementation-planner` | `plugins/maister/agents/implementation-planner.md:2` | yes | yes | yes |
| `information-gatherer` | `plugins/maister/agents/information-gatherer.md:2` | yes | yes | yes |
| `production-readiness-checker` | `plugins/maister/agents/production-readiness-checker.md:2` | yes | yes | yes |
| `project-analyzer` | `plugins/maister/agents/project-analyzer.md:2` | yes | yes | yes |
| `reality-assessor` | `plugins/maister/agents/reality-assessor.md:2` | yes | yes | yes |
| `research-planner` | `plugins/maister/agents/research-planner.md:2` | yes | yes | yes |
| `research-synthesizer` | `plugins/maister/agents/research-synthesizer.md:2` | yes | yes | yes |
| `solution-brainstormer` | `plugins/maister/agents/solution-brainstormer.md:2` | yes | yes | yes |
| `solution-designer` | `plugins/maister/agents/solution-designer.md:2` | yes | yes | yes |
| `spec-auditor` | `plugins/maister/agents/spec-auditor.md:2` | yes | yes | yes |
| `specification-creator` | `plugins/maister/agents/specification-creator.md:2` | yes | yes | yes |
| `task-classifier` | `plugins/maister/agents/task-classifier.md:2` | yes | yes | yes |
| `task-group-implementer` | `plugins/maister/agents/task-group-implementer.md:2` | yes | yes | yes |
| `test-suite-runner` | `plugins/maister/agents/test-suite-runner.md:2` | yes | yes | yes |
| `thermo-nuclear-code-quality-review-subagent` | `plugins/maister/agents/thermo-nuclear-code-quality-review-subagent.md:2` | yes | yes | yes |
| `thermo-nuclear-review-subagent` | `plugins/maister/agents/thermo-nuclear-review-subagent.md:2` | yes | yes | yes |
| `ui-mockup-generator` | `plugins/maister/agents/ui-mockup-generator.md:2` | yes | yes | yes |
| `user-docs-generator` | `plugins/maister/agents/user-docs-generator.md:2` | yes | yes | yes |

Normalized counts are therefore:

| Inventory class | Canonical | Codex | Cursor | Kiro CLI |
|---|---:|---:|---:|---:|
| canonical roles represented | 28 | 28 | 27 | 28 descriptors / 0 resolved prompts |
| host-support roles | 0 | 0 | 1 (`explore`) | 2 (`explore`, root `maister`) |
| total checked-in host agent artifacts | 28 | 28 copied sources | 28 Markdown files | 30 JSON files |

Cursor's `maister-explore` is explicitly a replacement for built-in exploration (`plugins/maister/overlays/cursor/assets/agents/explore.md:2-4`), while Kiro has both `maister-explore` (`plugins/maister/overlays/kiro-cli/assets/agents/maister-explore.json:2-16`) and a root orchestrator named `maister` (`plugins/maister/overlays/kiro-cli/assets/agents/maister.json:2-21`). These are host-support agents, not evidence that the canonical inventory contains 30 roles.

**Finding confidence: high.** The filesystem inventory, every canonical frontmatter name, native asset names, and parity baselines agree on the observed rows.

## Current source-to-host transformation mechanics

| Host | Declared source | Materialized destination | Actual transformation today | Result |
|---|---|---|---|---|
| Codex | `common/agents` | `skills/orchestrator-framework/agents` | none; recursive byte copy | all 28 canonical Markdown files become an internal prompt pool |
| Cursor | `assets/agents` | `agents` | none during materialization; host changes are already checked into duplicated Markdown | 27 canonical roles plus `explore` |
| Kiro CLI | `assets/agents` | `agents` | none during materialization; JSON is already checked in | 28 canonical descriptors plus two support descriptors, with unresolved prompt references |

The Codex overlay declares `common/agents -> skills/orchestrator-framework/agents` (`plugins/maister/overlays/codex/overlay.yml:21-25`). Materializer source resolution expands `common/<x>` first to `plugins/maister/<x>` and then to a root-relative fallback (`plugins/maister/lib/distribution/materializer.mjs:147-163`), so in this repository `common/agents` resolves to `plugins/maister/agents`. The assembly plan recursively expands a source tree and records destination collisions (`plugins/maister/lib/distribution/materializer.mjs:201-217`, `plugins/maister/lib/distribution/materializer.mjs:220-273`).

Cursor and Kiro instead select their checked-in `assets/agents` trees (`plugins/maister/overlays/cursor/overlay.yml:15-19`, `plugins/maister/overlays/kiro-cli/overlay.yml:15-19`). The copy stage uses `fs.copyFileSync` and changes only the requested mode (`plugins/maister/lib/distribution/materializer.mjs:758-803`); it does not parse or generate an agent representation. Materialization then validates inventory, syntax, modes, references, hashes, and content (`plugins/maister/lib/distribution/materializer.mjs:889-904`). Determinism is covered at the whole-tree level for all targets (`tests/platform-independent/source-materializer.test.mjs:338-365`), but that test does not assert canonical agent parity.

**Finding confidence: high.** Overlay declarations, executable source resolution, copy implementation, and deterministic-materialization tests form independent evidence.

## Duplication and drift

### Cursor

Cursor namespaces frontmatter names as `maister-<role>`; for example canonical `advisor` is `name: advisor` (`plugins/maister/agents/advisor.md:2`) while Cursor stores `name: maister-advisor` and an additional `readonly: true` field (`plugins/maister/overlays/cursor/assets/agents/advisor.md:2-6`). This is a hand-maintained host projection: the only checked projector targets Cursor **skills**, not agents. Its design already demonstrates the useful mechanism—manifest-owned source/output roots, allowlisted transforms, canonical inventory closure, and source fingerprints (`plugins/maister/lib/distribution/cursor-skill-projector.mjs:204-242`)—and its test detects isolated skill drift (`tests/platform-independent/overlay-contract.test.mjs:94-117`). There is no corresponding agent projection test.

After normalizing the `maister-` name prefix, Cursor skill dependency prefix, and host `readonly` metadata, nine agent files still contain host-specific body substitutions (command separator changes, task/todo terms, question-tool naming, and `explore -> maister-explore`). Those substitutions can be legitimate, but because they live in copied behavior files they are not attributable to a versioned transform. More importantly, Cursor entirely omits canonical `e2e-test-verifier` and includes `explore` instead. The parity baseline explicitly marks `agents/e2e-test-verifier.md` as an expected deletion (`plugins/maister/overlays/cursor/parity-baseline.json:7-16`, `plugins/maister/overlays/cursor/parity-baseline.json:112-121`), so the current parity machinery confirms rather than rejects the canonical gap.

**Finding confidence: high.** Direct normalized content comparison is corroborated by overlay layout and the explicit parity rule.

### Kiro CLI

Every canonical role has a descriptor named `maister-<role>`, and almost all descriptor descriptions duplicate the canonical description. The descriptor also duplicates host tools twice as `tools` and `allowedTools`; `maister-advisor`, for example, carries both lists and points to `file://./instructions/maister-advisor.md` (`plugins/maister/overlays/kiro-cli/assets/agents/maister-advisor.json:2-14`). This is the same descriptor/prompt pattern used by ordinary `project-analyzer` (`plugins/maister/overlays/kiro-cli/assets/agents/maister-project-analyzer.json:2-14`); Advisor needs no special projection path.

No `instructions` source appears in the Kiro layout, which installs only skills, the JSON agent tree, steering, hooks, and settings assets (`plugins/maister/overlays/kiro-cli/overlay.yml:9-39`). Consequently none of the 30 `file://./instructions/*.md` references has a materialized target. The reference validator deliberately exempts every Kiro agent instruction reference matching that pattern (`plugins/maister/lib/distribution/materializer.mjs:627-647`), bypassing the normal target-existence check at `plugins/maister/lib/distribution/materializer.mjs:655-669`. The Kiro parity baseline also classifies the entire `agents/instructions` tree, including every canonical role and `maister.md`, as expected deletion (`plugins/maister/overlays/kiro-cli/parity-baseline.json:7-45`).

One descriptor description already demonstrates drift: canonical `codebase-analysis-reporter` says “parallel Explore agents” (`plugins/maister/agents/codebase-analysis-reporter.md:2-4`), while Kiro's duplicated description says “parallel maister-explore agents” (`plugins/maister/overlays/kiro-cli/assets/agents/maister-codebase-analysis-reporter.json:2-4`). That may be a required host substitution, but today it is indistinguishable from accidental drift.

**Finding confidence: high.** Descriptor references, absent layout source, validator exception, and parity deletion rule all independently establish missing reference closure.

### Invocation names are not a projection contract

The overlays declare fail-closed delegation adapters (`codex.subagent`, `cursor.subagent`, and `kiro-cli.subagent`) at `plugins/maister/overlays/codex/overlay.yml:43-51`, `plugins/maister/overlays/cursor/overlay.yml:42-50`, and `plugins/maister/overlays/kiro-cli/overlay.yml:52-60`. These declarations contain no mapping from a logical role ID to the installed filename/name. Canonical workflows currently embed role spellings such as `maister:research-planner` (`plugins/maister/skills/research/SKILL.md:222`) and `maister:e2e-test-verifier` (`plugins/maister/skills/development/SKILL.md:608`), while Advisor configuration defaults to bare `advisor` (`plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:282-284`). Therefore a layout declaration plus naming convention does not yet guarantee deterministic role selection.

**Finding confidence: medium.** Absence of a mapping is direct; the exact runtime consequence belongs to the host-runtime streams.

## Required intermediate representation

Development should parse each canonical Markdown into a minimal immutable agent record:

```yaml
role_id: advisor                  # canonical filename stem; must equal frontmatter name
source: plugins/maister/agents/advisor.md
source_sha256: <digest>
description: <canonical frontmatter description>
model: inherit                   # optional portable metadata
color: purple                    # optional presentation metadata
skill_dependencies: []           # canonical logical skill IDs
instructions: <body after frontmatter>
projections:
  codex:
    representation: runtime_prompt
    external_id: maister-advisor
    destination: skills/orchestrator-framework/agents/advisor.md
  cursor:
    representation: markdown_agent
    external_id: maister-advisor
    destination: agents/advisor.md
    transforms: [cursor-agent-name-v1, ...]
  kiro-cli:
    representation: json_plus_prompt
    external_id: maister-advisor
    descriptor: agents/maister-advisor.json
    prompt: agents/instructions/maister-advisor.md
    tools_profile: <named host profile>
```

The `advisor` row is intentionally structurally identical to every other row. The IR should not contain an `advisor`-specific Codex profile, `readonly`, or `sandbox_mode` branch. Role behavior that says an agent only reports findings remains canonical instruction content; it is not a reason to fork installation mechanics.

Host-support roles need a separate collection, for example `support_agents.cursor.explore` and `support_agents.kiro-cli.maister`, so support artifacts cannot mask a missing canonical role by preserving only a total file count.

## Projection invariants for implementation

1. **Canonical identity closure:** every `plugins/maister/agents/*.md` filename stem equals its frontmatter `name`, is unique after case-folded/path normalization, and yields one logical `role_id`.
2. **Canonical-set bijection:** for each supported host and each canonical `role_id`, exactly one installed projection or runtime injection exists. Host-support agents are counted separately and cannot satisfy canonical parity.
3. **Deterministic namespace:** host-facing IDs derive only as `maister-<role_id>` (or a documented equivalent required by the host). Workflows select the logical ID; one adapter-owned map resolves the external ID and artifact.
4. **Single behavior owner:** prompt/body bytes originate only from canonical Markdown. Host copies are generated outputs or runtime injections; no manually edited body is authoritative.
5. **Allowlisted transforms:** every textual or metadata substitution has a stable transform ID and test fixture. An unclassified difference fails `--check`; this generalizes the existing Cursor skill-projector pattern.
6. **Reference closure:** every descriptor prompt reference resolves inside the materialized target. Remove the blanket Kiro exception at `materializer.mjs:635-637`; no unresolved reference may pass validation.
7. **Explicit invocation mapping:** every workflow role reference resolves to exactly one inventory row before delegation. Missing, duplicate, or colliding mappings fail closed instead of falling back to another or built-in agent.
8. **Advisor equality:** `advisor` participates in invariants 1–7 with no Codex `.toml`, project initialization, read-only, or sandbox exception.
9. **Projection reproducibility:** two runs over the same canonical tree and mapping produce identical bytes/content hashes; source changes make `--check` fail until projections are regenerated.
10. **Separation of evidence:** structural parity, materialized reference closure, native discovery, and successful role-specific invocation remain separate test results.

## Development requirements and acceptance inputs

### Projector and manifests

- Add a host-neutral `agent-projector` that reads all canonical Markdown once and emits/checks host artifacts. Prefer a pre-materialization source-preparation command so `materializer.mjs` remains a byte copier with strong provenance.
- Add a versioned projection manifest containing the canonical source root, normalized naming rule, per-host destinations, allowlisted transformation IDs, host tool profiles, and separately declared support agents.
- Cursor output must be generated from all 28 canonical roles, restoring `e2e-test-verifier`; retain `explore` only as an explicitly classified support agent.
- Kiro output must generate both `agents/maister-<role>.json` and `agents/instructions/maister-<role>.md` for all 28 roles. Generate root `maister` and `maister-explore` only from the support-agent section.
- Codex must consume the same 28-row manifest/prompt pool as all other hosts. Runtime registration versus injection is decided by the Codex-runtime stream, but `advisor` must take precisely that same path.

### Validation

- Add normalized inventory tests that compare role IDs rather than file counts and print missing/extra/colliding rows per host.
- Add source-derivation tests that normalize only declared transforms and compare every generated prompt body to its canonical source digest.
- Add Kiro descriptor tests for `descriptor.name`, filename, prompt filename, and actual prompt target closure; delete the blanket historical-reference exemption.
- Add Cursor projector `--check` coverage analogous to the existing skill projection check, including each host transformation and canonical inventory change.
- Add an invocation-map test proving every role referenced by a workflow—including `advisor` and `e2e-test-verifier`—resolves exactly once on every supported host.
- Update parity baselines so Cursor E2E and Kiro instruction files are required projections, not accepted deletions.

### Definition of done for the subsequent `maister:development`

The implementation is structurally complete when a clean projection check reports canonical `28/28` for Codex, Cursor, and Kiro; support roles are reported separately; every Kiro prompt reference resolves; regenerated Cursor/Kiro artifacts have no unclassified content drift; and Advisor passes the same matrix without any special-case configuration. Native discovery and invocation then require the separate host-runtime verification matrix before the overall feature can be called operational.
