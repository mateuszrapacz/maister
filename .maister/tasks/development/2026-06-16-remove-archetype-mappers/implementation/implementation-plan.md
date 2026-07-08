# Implementation Plan: Remove Archetype Mappers

## Overview

**Total Steps:** 10  
**Task Groups:** 3  
**Execution:** Groups 1+2 parallel → Group 3

---

## Task Group 1: Delete Skill & Command Files

**Dependencies:** None  
**Files to Modify:**
- `plugins/maister/skills/accounting-archetype-mapper/` (delete dir)
- `plugins/maister/skills/pricing-archetype-mapper/` (delete dir)
- `plugins/maister/commands/modeling-accounting-archetype.md` (delete)
- `plugins/maister/commands/modeling-pricing-archetype.md` (delete)

- [x] 1.1 Delete both skill directories
- [x] 1.2 Delete both command files
- [x] 1.3 Verify 4 paths no longer exist

---

## Task Group 2: Edit Cross-Refs, Docs & Build Pipeline

**Dependencies:** None  
**Files to Modify:**
- `plugins/maister/skills/problem-classifier/SKILL.md`
- `plugins/maister/skills/context-distiller/SKILL.md`
- `plugins/maister/CLAUDE.md`
- `README.md`
- `platforms/kiro-cli/build.sh`
- `Makefile`
- `platforms/kiro-cli/tests/build-core.test.sh`
- `platforms/kiro-cli/tests/validation.test.sh`

- [x] 2.1 Remove archetype mapper references from `problem-classifier/SKILL.md`
- [x] 2.2 Remove archetype mapper references from `context-distiller/SKILL.md`
- [x] 2.3 Remove mapper rows and simplify Bundle B in `CLAUDE.md` and `README.md`
- [x] 2.4 Remove merge_one, skills_needing_args, and sedi entries from `build.sh`
- [x] 2.5 Update counts: Makefile (71→67, 46→42), build-core.test.sh (71→67, 18→16, remove 2 test -f), validation.test.sh (71→67, 46→42)

---

## Task Group 3: Build & Validate Gate

**Dependencies:** 1, 2  
**Files to Modify:** None (verification only)

- [x] 3.1 Run `make build && make validate`
- [x] 3.2 Grep verification: zero matches for archetype-mapper patterns in source

---

## Execution Order

```
[1, 2 parallel] → [3]
```
