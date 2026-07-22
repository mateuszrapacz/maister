# Implementation Plan: Codex Maister lifecycle skills

> **TL;DR**: Implement the approved Codex-only overlay change in five dependency-ordered groups: add utility assets, wire the overlay, add focused materialization coverage, reconcile parity, and document the command surface. Finish with target-aware and repository-wide verification.
>
> **Key Decisions**:
> - Keep all five utility skills under `plugins/maister/overlays/codex/assets/skills/`; do not touch the common skill inventory.
> - Use one merged `assets/skills` tree entry in the Codex overlay.
> - Remove exactly ten lifecycle entries from the Codex expected-deletion parity rule after the materialized bytes are verified.
>
> **Open Questions & Risks**:
> - Existing unrelated worktree changes must remain untouched, especially the modified Pi host-probe and evidence tests.
> - A parity update that removes too many historical entries would weaken the migration oracle; review the resulting JSON diff narrowly.
> - The focused test should validate user-observable skill content without pretending that prompt instructions provide a native process-exit API.

## Dependency graph

```text
Group 1: Codex skill assets
        ↓
Group 2: Overlay merge contract
        ↓
Group 3: Materialization test ─────┐
        ↓                          │
Group 4: Parity baseline ──────────┤→ Group 5: Documentation and full verification
                                   │
```

Groups 1–2 establish the package shape. Group 3 proves the observable package contract and supplies hashes/paths needed to review Group 4. Group 5 can proceed only after focused checks pass and the diff is confirmed Codex-only.

## Group 1 — Add Codex utility skill assets

**Depends on:** none

**Files to Modify:**

- `plugins/maister/overlays/codex/assets/skills/bye/SKILL.md`
- `plugins/maister/overlays/codex/assets/skills/dev/SKILL.md`
- `plugins/maister/overlays/codex/assets/skills/next/SKILL.md`
- `plugins/maister/overlays/codex/assets/skills/resume/SKILL.md`
- `plugins/maister/overlays/codex/assets/skills/status/SKILL.md`

**Steps:**

1. [x] Copy the reviewed historical behaviors into current Codex-native instructions.
2. [x] Set frontmatter names to the host-relative directory names: `bye`, `dev`, `next`, `resume`, `status`.
3. [x] Keep descriptions concise and command-specific.
4. [x] Use `$maister:development` and other `$maister:*` references; do not use Cursor, Claude, Pi, or host-builder terminology.
5. [x] Preserve safety semantics: `bye` does not complete active work; `next` and `status` do not execute or mutate; `resume` preserves flags and phase context.

**Acceptance:** Each file is valid Markdown/frontmatter, has mode `0644`, and satisfies the functional contract in `implementation/spec.md`.

## Group 2 — Wire the Codex overlay

**Depends on:** Group 1

**Files to Modify:**

- `plugins/maister/overlays/codex/overlay.yml`
- `plugins/maister/lib/distribution/materializer.mjs`
- `plugins/maister/lib/distribution/overlay-loader.mjs`

**Steps:**

1. [x] Add `source: assets/skills`, `destination: skills`, `kind: tree`, mode `0755`, ownership `whole_file`, and `merge: true`.
2. [x] Place the entry with the other Codex asset merges; do not alter the common skill mapping or plugin manifest.
3. [x] Mark native precedence explicitly on the Codex skills layout and ensure only that entry overrides same-destination common files while unrelated file collisions remain rejected.
4. [x] Confirm the overlay inventory and forbidden paths still describe the produced package.

**Acceptance:** Overlay loading and contract validation accept the new tree, and materialization emits the five asset files alongside common skills.

## Group 3 — Add focused materialization coverage

**Depends on:** Group 2

**Files to Modify:**

- `tests/platform-independent/codex-utility-skills.test.mjs` (new)

**Steps:**

1. [x] Materialize the real Codex overlay into a temporary staging root using the existing production materializer helper pattern.
2. [x] Assert all five paths exist and each frontmatter `name` matches its directory.
3. [x] Assert command-specific semantics: `dev` delegates to development, `resume` carries phase continuation semantics, `next`/`status` are read-only, and `bye` preserves active state.
4. [x] Assert no Cursor/Claude vocabulary or forbidden target paths are present in the five files.
5. [x] Materialize twice and assert identical tree/content hash for deterministic output.
6. [x] Add direct collision-matrix assertions for native-over-common in both layout orders, native-vs-native rejection, and unrelated asset/common rejection; keep the test isolated from modified Pi evidence/host-probe files.

**Acceptance:** The new test fails if the overlay entry, asset path, frontmatter, behavior markers, vocabulary, or determinism regresses.

## Group 4 — Reconcile Codex parity evidence

**Depends on:** Group 3

**Files to Modify:**

- `plugins/maister/overlays/codex/parity-baseline.json`

**Steps:**

1. [x] Remove only these ten entries from `codex-legacy-inventory-deletions` paths and observations:
   - `skills/bye`
   - `skills/bye/SKILL.md`
   - `skills/dev`
   - `skills/dev/SKILL.md`
   - `skills/next`
   - `skills/next/SKILL.md`
   - `skills/resume`
   - `skills/resume/SKILL.md`
   - `skills/status`
   - `skills/status/SKILL.md`
2. [x] Keep all unrelated expected deletions and their immutable observations unchanged.
3. [x] Run the parity validator and shadow parity check against the resulting Codex materialization.
4. [x] Review the JSON diff to ensure no broad pattern or unrelated observation changed.

**Acceptance:** Evidence tests pass and candidate-only/missing-path reports contain no lifecycle false positives.

## Group 5 — Documentation and verification

**Depends on:** Groups 1–4

**Files to Modify:**

- `docs/commands.md`

**Steps:**

1. [x] Add a Codex shortcuts section listing `$maister:bye`, `$maister:dev`, `$maister:next`, `$maister:resume`, and `$maister:status`.
2. [x] Explain the read-only behavior of `next`/`status`, state-preserving behavior of `bye`, and persisted-state continuation of `resume`.
3. [x] State that `dev` is a shortcut for `$maister:development`.
4. [x] Run focused checks first, then the configured core/evidence/topology/release checks.
5. [x] Reconcile the shared materializer/overlay-loader scope explicitly, then inspect `git diff --stat` and `git status --short` to verify no existing unrelated modifications were overwritten or staged.

**Verification commands:**

```sh
make test-overlay TARGET=codex
make check-cursor-projection
make test-core
make test-evidence
make test-topology
node --test tests/platform-independent/codex-utility-skills.test.mjs
node --test tests/platform-independent/release-package.test.mjs
```

## Acceptance mapping

| Requirement | Plan coverage |
| --- | --- |
| Five `$maister:*` commands available in Codex | Groups 1–2 |
| Existing state semantics preserved | Group 1 and focused test in Group 3 |
| Common inventory and other hosts unchanged | Groups 1–2 and diff review in Group 5 |
| Deterministic package contents | Group 3 |
| Parity/evidence remains intentional | Group 4 |
| Command documentation | Group 5 |
| No legacy builders or unrelated changes | Group 5 diff review |

## Rollback and safety

- All changes are additive except the ten explicitly obsolete parity observations and the documentation addition.
- If focused materialization fails, revert the Codex overlay entry and assets as one logical change; do not modify unrelated worktree files.
- If parity fails, restore the ten observations temporarily and diagnose the materialized/legacy comparison before changing any other baseline rule.
- Do not run destructive cleanup commands against the workspace; temporary materialization roots are created by tests under the system temporary directory.
