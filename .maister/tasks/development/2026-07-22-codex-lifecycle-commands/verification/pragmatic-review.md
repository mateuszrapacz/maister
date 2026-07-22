# Pragmatic Review: Codex Lifecycle Skills

## Review scope

Read-only review of the active implementation in the context of the approved
Codex-only boundary:

- native overlay precedence in `plugins/maister/lib/distribution/materializer.mjs`;
- the merged `assets/skills` entry in `plugins/maister/overlays/codex/overlay.yml`;
- Codex variants of `bye`, `dev`, `next`, `resume`, and `status`;
- focused materialization coverage and the resulting package contract.

No source, test, documentation, workflow state, or other verification report was
modified by this review.

## Status

**PASS WITH MINOR, NON-BLOCKING FINDINGS**

The implementation is appropriately scoped and uses the simplest architecture
that fits the selected boundary. The five files are justified host adapters:
the portable source already contains the same lifecycle concepts with
host-specific `maister-*` frontmatter and slash-command references, while Codex
needs host-relative names and `$maister:*` references. Keeping the variants in
the Codex overlay avoids expanding the common inventory or changing Cursor,
Pi, or Kiro projections.

The native precedence change is small and directly enables the required
host-specific override. It does not introduce a second materialization path,
new state format, runtime service, or unnecessary abstraction.

## Issue counts

| Severity | Count | Blocking? |
| --- | ---: | --- |
| Critical | 0 | No |
| Major | 0 | No |
| Minor | 2 | No |
| Informational | 2 | No |

## Findings

### M-01 — Native classification is inferred from the source pathname

**Severity:** Minor  
**Location:** `plugins/maister/lib/distribution/materializer.mjs:263-279`

`buildAssemblyPlan` derives `entry.native` from
`source.startsWith("assets/")`, rather than from an explicit overlay contract
field. This is compact and correct for the current layout, where overlay-owned
assets are intentionally authoritative, but it makes precedence a convention
that is hidden in the materializer. A future `assets/*` layout could silently
gain override authority, while a future native source outside that naming
convention would not.

**Pragmatic disposition:** Do not expand this task to redesign the overlay
schema. The current five Codex files are covered and the rule is easy to locate;
consider an explicit `native: true` layout property only if more precedence
cases appear.

### M-02 — Precedence behavior lacks an isolated regression fixture

**Severity:** Minor  
**Locations:** `plugins/maister/lib/distribution/materializer.mjs:281-319`,
`tests/platform-independent/codex-utility-skills.test.mjs:42-66`

The focused test proves the real Codex package contains the native five skills,
so it would catch the requested override failing for these paths. Existing
collision coverage proves ordinary collisions are rejected. However, there is
no small fixture that explicitly asserts the complete precedence contract:
native file beats common file at the same normalized destination, while
native-vs-native and unrelated file collisions still fail.

**Pragmatic disposition:** This is a test-maintenance improvement, not an
implementation blocker. Add such a fixture if the materializer precedence rule
is reused by another overlay or receives another change.

### I-01 — The five overlay files are not unnecessary duplication

The duplication is intentional and bounded. Each file changes the host-relative
frontmatter name and/or command syntax while preserving the shared lifecycle
behavior. Promoting these files into common source would force one host's
invocation contract onto other hosts and was explicitly rejected during scope
selection.

### I-02 — Prompt-level lifecycle semantics are correctly bounded

`bye` instructs the agent to preserve resumable state; it does not pretend to
provide a native Codex process-exit API. `next` and `status` explicitly remain
read-only, and `dev`/`resume` delegate through the existing workflow namespace.
This is the appropriate level of implementation for the available Codex skill
surface.

## Evidence reviewed

- `node --test tests/platform-independent/codex-utility-skills.test.mjs` — 1
  passed, 0 failed.
- `make test-overlay TARGET=codex` — overlay contract validation passed.
- `git diff --check` for the task files — no whitespace errors.
- The focused test verifies host-relative frontmatter, all five paths,
  command-specific safety markers, forbidden host vocabulary, and deterministic
  content hashes.
- The parity baseline removes exactly the ten historical directory/file
  observations corresponding to the five now-materialized skills.

## Review conclusion

No critical, major, or scope-expanding issue was found. The implementation is
maintainable enough to merge within the approved task boundary. The two minor
findings are future-proofing opportunities and do not justify additional work
before completing the current workflow verification.

**Exact report path:**
`.maister/tasks/development/2026-07-22-codex-lifecycle-commands/verification/pragmatic-review.md`

## Post-fix re-review

The explicit `native` layout property and direct collision-matrix test address both minor maintainability observations. The shared change remains small, opt-in, and fail-closed for unrelated collisions. No new pragmatic issue was found.
