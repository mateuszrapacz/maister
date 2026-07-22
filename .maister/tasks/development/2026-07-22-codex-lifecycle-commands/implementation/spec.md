# Specification: Codex Maister lifecycle skills

> **TL;DR**: Add five Codex-only utility skills to the current overlay distribution: `bye`, `dev`, `next`, `resume`, and `status`. They are materialized as `skills/<command>/SKILL.md` with host-relative frontmatter, preserving the `$maister:<command>` namespace while leaving the common source inventory and other projections unchanged.
>
> **Key Decisions**:
> - Put the five skill assets in `plugins/maister/overlays/codex/assets/skills/` and merge that tree into `skills/` through `overlay.yml`.
> - Adapt the historical Codex behavior to the current orchestrator state model; do not restore the removed host-specific builders.
> - Reconcile Codex parity evidence, add focused materialization coverage, and document the Codex command surface.
>
> **Open Questions & Risks**:
> - `bye` is a state-preserving handoff instruction, not a native process-shutdown API.
> - `resume`, `status`, and `next` rely on a consistent interpretation of the latest active `orchestrator-state.yml` when no task path is supplied.
> - The existing parity baseline must stop classifying these five paths as expected deletions once they are materialized.

## 1. Context and goals

The Codex overlay currently materializes the portable Maister skill inventory and Codex runtime assets, but does not expose the lifecycle shortcuts available in the historical Codex target and the current Cursor compatibility projection. The goal is to make the following Codex skill invocations available:

```text
$maister:bye
$maister:dev
$maister:next
$maister:resume
$maister:status
```

The implementation must fit the current overlay/materializer architecture and preserve the portable inventory boundary selected during Phase 2.

## 2. Scope

### In scope

1. Five new Codex-native skill files:
   - `plugins/maister/overlays/codex/assets/skills/bye/SKILL.md`
   - `plugins/maister/overlays/codex/assets/skills/dev/SKILL.md`
   - `plugins/maister/overlays/codex/assets/skills/next/SKILL.md`
   - `plugins/maister/overlays/codex/assets/skills/resume/SKILL.md`
   - `plugins/maister/overlays/codex/assets/skills/status/SKILL.md`
2. A merged `assets/skills` tree entry in the Codex overlay contract.
3. Codex parity/evidence baseline updates for the five historical paths.
4. A platform-independent test that materializes the real Codex overlay and asserts the observable utility-skill contract.
5. A Codex section in `docs/commands.md`.

### Out of scope

- Adding these utilities to `plugins/maister/skills/` or any other common source.
- Reintroducing `plugins/maister-codex` or `platforms/codex-cli` builders.
- Changing Cursor projection bytes, Pi aliases, Kiro commands, or the launcher CLI.
- Implementing a native Codex process-exit primitive.
- Adding another workflow-state store or changing the schema of `orchestrator-state.yml`.

## 3. Functional contract

### 3.1 `bye`

- Identify the active task from supplied context or the latest task state.
- Preserve the current state fields, including phase, completed phases, blockers, pending gates, and status.
- Never mark an in-progress workflow as complete merely because the session is ending.
- Summarize completed work and remaining work.
- Record the task path and `$maister:resume <task-path>` as the continuation command.

### 3.2 `dev`

- Forward the supplied task description or task path verbatim to `$maister:development`.
- Do not bypass the development workflow because the task appears simple.

### 3.3 `next`

- Read the active task's `orchestrator-state.yml`; an explicit task path takes precedence over discovery.
- Suggest exactly one best next action using current phase, completed/failed phases, blockers, and pending gates.
- Name the phase, skill, or user decision and explain the reason in one sentence.
- Do not execute the suggested action.
- If no active workflow exists, suggest `$maister:init` when project docs are missing, otherwise `$maister:work`.

### 3.4 `resume`

- Treat an explicit task path as authoritative; otherwise use the latest active state file.
- Read workflow type, task path, current phase, completed phases, failed phases, and pending gates.
- If current phase is missing, use the first phase not listed as completed.
- Invoke the matching workflow with the task path and phase continuation context:
  - development → `$maister:development`
  - performance → `$maister:performance`
  - migration/migrations → `$maister:migration`
  - research → `$maister:research`
  - product-design → `$maister:product-design`
- Preserve additional flags and do not restart unless explicitly requested.
- If no active state exists, suggest `$maister:work` or `$maister:init`.

### 3.5 `status`

- Read the active `orchestrator-state.yml`; an explicit task path takes precedence.
- Report task path, workflow type, task status, current phase, completed phases, failed phases, blockers, pending gates, and next incomplete phase/action.
- Do not start or resume a workflow and do not mutate state.
- If no active workflow exists, clearly report that and suggest `$maister:init` or `$maister:work`.

## 4. Packaging and naming contract

- Add the overlay entry as a `tree` with destination `skills`, mode `0755`, ownership `whole_file`, and `merge: true`.
- The Codex `assets/skills` layout entry explicitly sets `native: true`; when one of its files has the same destination as a common source file, the native overlay asset wins. Other layout entries do not gain precedence implicitly, and unrelated or native-vs-native file collisions remain rejected.
- Keep canonical source `plugins/maister/skills/` untouched.
- Use frontmatter names exactly `bye`, `dev`, `next`, `resume`, and `status`; the Codex plugin manifest supplies the `maister:` namespace.
- Keep file modes at `0644` and directory modes at `0755` after materialization.
- Do not include Cursor/Claude-specific paths or vocabulary in the Codex assets.

## 5. Test and evidence contract

Add focused coverage that materializes the production Codex overlay into a temporary staging root and asserts:

- all five `skills/<command>/SKILL.md` files exist;
- frontmatter names are host-relative and match their directory names;
- `dev` references `$maister:development`;
- `resume` references workflow continuation and `--from=<phase>`;
- `status` and `next` are explicitly read-only;
- `bye` preserves state and does not instruct the model to mark active work complete;
- the utility files contain no forbidden Cursor/Claude vocabulary;
- repeated materialization produces identical output/hash.
- the shared assembly planner selects an explicitly native file over a common file in either layout order, while rejecting native-vs-native and unrelated asset/common collisions;

Reconcile `plugins/maister/overlays/codex/parity-baseline.json` so `skills/{bye,dev,next,resume,status}` and their `SKILL.md` files are no longer recorded as materialized absences. Keep unrelated historical expected-deletion entries unchanged.

## 6. Documentation contract

Add a Codex section to `docs/commands.md` that lists the five `$maister:*` commands and summarizes their behavior. Clarify that `next` and `status` are read-only, `bye` preserves resumable state, and `resume` continues from `orchestrator-state.yml`.

## 7. Acceptance criteria

1. A clean Codex materialization exposes all five requested lifecycle skills under the correct `$maister:*` names.
2. The skill instructions match the functional contract above and use current Maister/Codex terminology.
3. The common source inventory and non-Codex targets are unchanged.
4. Overlay, syntax, inventory, vocabulary, topology, parity, and focused materialization tests pass.
5. The documentation describes how Codex users invoke and interpret each lifecycle command.
6. The final diff contains no generated legacy host tree or unrelated worktree changes.

## 8. Verification commands

```sh
make test-overlay TARGET=codex
make check-cursor-projection
make test-core
make test-evidence
make test-topology
node --test tests/platform-independent/release-package.test.mjs
```

## 9. Implementation order

1. Add the five Codex assets.
2. Add the merged overlay mapping.
3. Add focused materialization coverage.
4. Reconcile parity baseline and update command documentation.
5. Run focused tests, then the configured evidence/topology/release checks.
