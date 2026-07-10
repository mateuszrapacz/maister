# Production Readiness Report — Improve Grill Skills

**Task**: `.maister/tasks/development/2026-07-09-improve-grill-skills`  
**Target**: Production plugin release (`maister-plugins` @ `2.2.1-fork.1`)  
**Verifier**: `maister-production-readiness-checker`  
**Date**: 2026-07-10

## TL;DR

Source implementation for `grill-me` (rewritten) and `grill-with-docs` (new) is **complete and spec-aligned**: explicit-only frontmatter, read-only vs docs-maintaining boundaries, Kiro build wiring, structural tests, catalog, and FR-7 user docs are in place. Work-log records **`make validate` PASS** at implementation completion. **This verifier session could not re-confirm a clean full pipeline** — concurrent `make build` / Kiro test runs left generated trees partially built (Kiro at 43/69 skills, shortcuts missing; Kilo cleaned). **`grill-with-docs` generated dirs remain untracked** in git alongside ~202 uncommitted files. **Recommendation: `concerns` — do not tag/release until a single-threaded `make build && make validate` passes and all generated variants are committed.**

## Key Decisions

- **Assessed plugin release gate, not runtime grilling behavior** — Structural grep tests (FR-5.4) cover prohibition strings; one-question discipline and convergence gates rely on SKILL.md review and manual session checks (per spec audit).
- **Trusted work-log validate PASS as primary evidence** — Implementation completed 2026-07-09 with documented green gate; current workspace pollution treated as environmental, not design regression.
- **Four-platform parity required** — Copilot, Cursor, Kiro, Kilo must all expose correctly named skills; partial Kiro/Kilo state in workspace is a **release blocker** until rebuilt.
- **Manifest version unchanged** — No version bump required for this feature; all checked manifests remain `2.2.1-fork.1`.

## Open Questions / Risks

- **Concurrent build corruption** — Kiro `build.sh` uses a filesystem lock, but parallel agents/tests still produced partial trees (`agents/*.md` vs `*.json`, missing shortcuts, sed on absent paths). CI/release must run builds serially.
- **Generated artifact commit gap** — `grill-with-docs` is `??` (untracked) in Copilot, Cursor, Kiro, and Kilo trees; shipping without committing breaks consumers who install from git.
- **Protocol duplication (spec D2)** — `grill-me` and `grill-with-docs` duplicate grilling protocol; future edits may drift without disciplined paired updates.
- **docs/cursor-agent-support.md drift** — Lists `/grill-me` shortcut only; out of FR-7 scope but may confuse Cursor users post-release.

---

## Deployment Decision

| Outcome | Status |
|---------|--------|
| **Decision** | **Deploy with concerns** (`concerns`) |
| **Readiness score** | 78 / 100 |
| **GO for production tag** | **No** — complete rebuild + validate + commit generated trees first |

### Issue Counts

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 2 |
| Medium | 4 |
| Low | 3 |

---

## Category Assessment

### 1. Build Pipeline (`make build` / `make validate`)

| Check | Status | Evidence |
|-------|--------|----------|
| Source-only edits policy | ✅ Pass | Work-log: changes in `plugins/maister/`, `platforms/*`; no hand-edits to generated skill bodies |
| `make build` (Copilot) | ✅ Pass | `Built Copilot CLI variant` in verifier session |
| `make build` (Cursor) | ⚠️ Intermittent | Succeeded earlier; failed mid-session when concurrent `build.sh` raced after `make clean` (`sed` on partially copied tree) |
| `make build` (Kiro) | ❌ Fail (session) | Lock contention + partial output (43 skill dirs, 0 unprefixed shortcuts); work-log reports success at completion |
| `make build` (Kilo) | ❌ Missing | `make clean` removed tree; not rebuilt in failed session |
| `make validate` (full) | ⚠️ Unconfirmed | Work-log: exit 0; verifier: Copilot passed, Cursor failed (incomplete build), Kiro failed (no `agents/*.json`) |
| Kiro inventory 69 / 43 / 26 | ⚠️ Makefile aligned | Rules 14/23/28 updated; generated tree not at target counts in polluted workspace |

**Mitigation before release**

```bash
# Ensure no other build/test processes
make clean
make build
make validate
```

Run on a clean checkout or after stopping parallel agent sessions.

---

### 2. Test Coverage — New Skill

| Requirement | Status | Evidence |
|-------------|--------|----------|
| FR-5.1 `/grill-with-docs` → `maister-grill-with-docs` | ✅ Implemented | `platforms/kiro-cli/tests/phase2.test.sh` → `test_grill_with_docs_shortcut` |
| FR-5.2 build-core 69 / 26 counts | ✅ Implemented | `platforms/kiro-cli/tests/build-core.test.sh` |
| FR-5.3 validation 69 / 43 counts | ✅ Implemented | `platforms/kiro-cli/tests/validation.test.sh` |
| FR-5.4 prohibition grep A–F | ✅ Implemented | `test_grill_prohibit_implementation` in `phase2.test.sh` |
| FR-5.5 TDD red gate | ✅ Documented | Work-log RED evidence before skill work |
| FR-5.6 Cursor/Kilo extension | ✅ N/A (should) | Cursor `skill-inventory.test.sh` range 27–31 accommodates +1 skill (30 after add) |
| Behavioral protocol tests | ⚠️ Gap | One-question / convergence not structurally asserted (accepted per spec audit) |

**phase2.test.sh session result** (concurrent builds): 13 passed, 1 failed (`steering/maister-workflows.md` missing after corrupted Kiro build). Not indicative of test defect; indicative of polluted output tree.

---

### 3. Skill Content — Source of Truth

| Criterion | `grill-me` | `grill-with-docs` |
|-----------|------------|-------------------|
| `disable-model-invocation: true` | ✅ L4 | ✅ L4 |
| Invocation guard | ✅ L10–12 | ✅ L10–12 |
| One-question protocol | ✅ L29–35 | ✅ L18–21 |
| Facts vs decisions | ✅ L31 | ✅ L19 |
| Convergence gate | ✅ L35 | ✅ L21 |
| Never implement plan | ✅ L43 | ✅ L66 |
| Read-only / no doc edits | ✅ L41–45 | N/A (docs allowed) |
| Docs-only mutations | N/A | ✅ L42–44, L67 |
| CONTEXT.md prohibited | N/A | ✅ L68 |
| Boundary matrix | N/A | ✅ L70–77 |
| Line count (NFR-1) | ✅ 63 lines | ✅ 82 lines |
| Cross-link parity | ✅ L47, L63 | ✅ L81–82 |

---

### 4. Generated Variants — Platform Parity

| Platform | `grill-me` | `grill-with-docs` | Read-only vs docs distinction | Git status |
|----------|------------|-------------------|-------------------------------|------------|
| **Source** (`plugins/maister`) | ✅ `skills/grill-me/` | ✅ `skills/grill-with-docs/` | Preserved | Modified |
| **Copilot** | ✅ `skills/grill-me/` | ✅ `skills/grill-with-docs/` | Prohibitions in generated SKILL.md | `grill-with-docs` **untracked** |
| **Cursor** | ✅ `maister-grill-me/` | ✅ `maister-grill-with-docs/` | `read-only` + `Never implement` in grill-me | `maister-grill-with-docs` **untracked** |
| **Kiro** | ✅ `maister-grill-me/` | ✅ `maister-grill-with-docs/` | Same transforms | Shortcut `/grill-with-docs` **missing** in partial build; prefixed skill present |
| **Kilo** | ❌ Tree absent | ❌ Tree absent | N/A after `make clean` | Needs rebuild |

**Kiro shortcut check** (FR-4.2): `plugins/maister-kiro/skills/grill-with-docs/SKILL.md` must exist and reference `/maister-grill-with-docs` — **not present** in verifier workspace partial build; expected after full `build-kiro`.

**Cursor reference sed** (FR-4.5 should): `platforms/cursor/build.sh` includes `grill-with-docs` → `maister-grill-with-docs` transforms ✅

---

### 5. Documentation Parity (FR-7)

| File | Requirement | Status |
|------|-------------|--------|
| `docs/on-demand-skills.md` | Both skills + when-to-use table | ✅ |
| `docs/commands.md` | `/maister:grill-with-docs` pseudo-command | ✅ L299–307 |
| `README.md` | Kiro `/grill-with-docs` shortcut | ✅ L259 |
| `docs/kiro-cli-support.md` | Shortcut row | ✅ |
| `plugins/maister/CLAUDE.md` | Catalog + Bundle D + boundaries | ✅ L554–567 |
| Generated `CLAUDE.md` / steering | Propagated via build | ✅ Copilot catalog verified |
| `docs/cursor-agent-support.md` | Shortcut list | ⚠️ Low — `/grill-me` only (L258) |

User docs link to `SKILL.md` for depth; skill algorithm bodies not duplicated ✅

---

### 6. Manifest Consistency

| Manifest | Version | Name | Notes |
|----------|---------|------|-------|
| `.claude-plugin/marketplace.json` | `2.2.1-fork.1` | `maister-plugins` | Lists `maister` + `maister-copilot` only (expected for this marketplace) |
| `plugins/maister/.claude-plugin/plugin.json` | `2.2.1-fork.1` | `maister` | ✅ |
| `plugins/maister-copilot/.claude-plugin/plugin.json` | `2.2.1-fork.1` | `maister-copilot` | ✅ |
| `plugins/maister-cursor/.cursor-plugin/plugin.json` | `2.2.1-fork.1` | `maister-cursor` | ✅ |

No version bump needed for this feature slice. Cursor/Kiro/Kilo are distributed outside marketplace.json — consistent with repo conventions.

---

## Deployment Blockers (Must Fix)

### HIGH-1 — Generated variants not committed

`git status` shows `grill-with-docs` / `maister-grill-with-docs` as **untracked** in generated plugin trees. Production release must include regenerated artifacts from a green `make build`.

**Fix**: `make build` → commit all `plugins/maister-{copilot,cursor,kiro,kilo}/` changes.

### HIGH-2 — Full `make validate` not re-confirmed in release workspace

Work-log claims PASS; verifier session hit partial Kiro (43 skills), missing Kilo, and concurrent-build failures. Cannot certify release gate on current tree.

**Fix**: Serial `make clean && make build && make validate` with no parallel kiro/cursor builds.

---

## Concerns (Mitigate or Accept)

### MEDIUM-1 — Kiro build lock + parallel test invocations

`phase2.test.sh` calls `make build-kiro` per assertion; parallel test shells cause lock waits and occasional corrupt partial trees.

**Mitigation**: Document serial CI; consider test harness reuse of single build output.

### MEDIUM-2 — Behavioral grilling protocol untested

FR-1.3–1.8 / FR-2.4–2.6 enforced by prose only. Accept for plugin release; monitor user feedback.

### MEDIUM-3 — Protocol duplication drift (D2)

Two independent `SKILL.md` files share protocol; paired-update note present but not enforced by tests.

### MEDIUM-4 — `docs/cursor-agent-support.md` incomplete

Add `/grill-with-docs` → `/maister-grill-with-docs` for parity (optional pre-release).

---

## Low-Priority Items

| ID | Item |
|----|------|
| LOW-1 | No dedicated Cursor grep test for grill prohibitions (FR-5.6 should-only) |
| LOW-2 | Consumer projects may lack `.maister/docs/decisions/` — runtime ADR flow handled in skill text |
| LOW-3 | `orchestrator-state.yml` still `in_progress` while work-log marks complete — metadata only |

---

## Acceptance Criteria Traceability

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `grill-me` read-only, convergence, no mutations | ✅ Source + generated Copilot/Cursor |
| 2 | `grill-with-docs` explicit, docs/ADR with confirmation, no implementation | ✅ Source |
| 3 | `disable-model-invocation` + catalog "Explicit request only." | ✅ |
| 4 | No CONTEXT.md / shared engine | ✅ |
| 5 | Plugin catalog both modes + boundaries | ✅ `CLAUDE.md` |
| 6 | Kiro 69/43/26 + shortcut | ⚠️ Makefile/tests updated; output not verified clean |
| 7 | Four-platform named skills + distinction | ⚠️ Kilo missing; Kiro shortcut unverified |
| 8 | User docs four-file parity | ✅ |
| 9 | `make build && make validate` | ⚠️ Work-log ✅; verifier unconfirmed |
| 10 | FR-5.4 structural prohibition tests | ✅ Tests present |

---

## Post-Deployment Verification Checklist

After release commit/tag:

- [ ] `make validate` exit 0 on release commit SHA
- [ ] Kiro TUI: `/grill-with-docs` appears and delegates to `maister-grill-with-docs`
- [ ] Cursor: `/maister-grill-me` and `/maister-grill-with-docs` discoverable
- [ ] Copilot: natural-language "grill with docs" does **not** auto-invoke (explicit-only)
- [ ] Spot-check: `grill-me` session refuses doc edits; `grill-with-docs` updates `language.md` only after confirmation
- [ ] Marketplace install from tagged commit includes `grill-with-docs` in Copilot variant

---

## Rollback Criteria

Rollback or hold release if:

- `make validate` fails on release commit
- Kiro skill count ≠ 69 or shortcut mapping broken
- Generated `grill-me` / `grill-with-docs` lose implementation prohibition text
- User reports auto-invocation of grill skills during unrelated work (explicit-only regression)

---

## Summary Table

| Area | Score | Notes |
|------|------:|-------|
| Configuration / manifests | 95% | Versions aligned |
| Build pipeline | 60% | Source correct; workspace rebuild needed |
| Test coverage | 85% | Kiro structural tests strong; no behavioral tests |
| Documentation | 90% | FR-7 complete; minor cursor-agent-support gap |
| Generated variants | 70% | Copilot/Cursor good; Kiro/Kilo incomplete in workspace |
| Security / safety | 90% | Explicit-only + prohibition grep contract |
| **Overall** | **78%** | **Concerns — fix HIGH items before tag** |
