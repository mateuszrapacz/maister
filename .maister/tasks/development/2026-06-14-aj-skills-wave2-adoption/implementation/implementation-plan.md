# Implementation Plan: Wave 2 AJ Skills Adoption

## Task Groups

### Group 1: E2 Standard (language-md-convention)

- [x] Create `.maister/docs/standards/global/language-md-convention.md`
- [x] Update `.maister/docs/INDEX.md` with standard entry

**Dependencies:** None

### Group 2: E3 Skills Port

- [x] Port `test-strategy-reviewer/SKILL.md` — guard, disable-model-invocation, language gate, chain
- [x] Port `linguistic-boundary-verifier/SKILL.md` — guard, disable-model-invocation, graceful degradation, chain
- [x] Port `metaprogram-classifier/SKILL.md` — guard, language gate, grill-me chain

**Dependencies:** Group 1 (standard referenced by linguistic-boundary-verifier)

### Group 3: E3 Commands

- [x] Create `reviews-test-strategy.md`
- [x] Create `reviews-linguistic-boundaries.md`
- [x] Create `quick-metaprogram-classifier.md`

**Dependencies:** Group 2

### Group 4: Orchestrator Soft Suggestions (ADR-008)

- [x] Add optional requirements-critic suggestion to `development/SKILL.md` Phase 5
- [x] Add optional transcript-critic suggestion to `product-design/SKILL.md` Phase 1

**Dependencies:** None (Wave 1 skills already exist)

### Group 5: Documentation

- [x] Update `plugins/maister/CLAUDE.md` — skills, commands, Bundles C/D
- [x] Update `README.md` — command table + Bundles C/D

**Dependencies:** Groups 2–3

### Group 6: Build Pipeline & CI

- [x] Update `platforms/kiro-cli/build.sh`
- [x] Update Makefile count rules (57→63, 32→38)
- [x] Update Kiro validation tests
- [x] Run `make build && make validate`

**Dependencies:** Groups 1–5

## Execution Order

Groups 1 and 4 can run in parallel. Group 2 after Group 1. Group 3 after Group 2. Group 5 after Groups 2–3. Group 6 last.

## Test Strategy

- `make build` — platform transform smoke
- `make validate` — structural validation
- Kiro count assertions in `platforms/kiro-cli/tests/`
