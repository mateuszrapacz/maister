# Versioning & Manifests Report

**Task:** 2026-06-14-upstream-sync-consistency  
**Category:** versioning-manifests  
**Repo:** `/Users/mrapacz/Workspace/maister`  
**Gatherer:** maister-information-gatherer  
**Date:** 2026-06-14

---

## Executive Summary

Upstream (`679958b` / `upstream/master`) ships **2.1.8** across three Claude Code manifests. The fork diverged at **`1fc5d3c` (2.1.7)**, bumped in parallel to **2.1.8** at **`1707a26`**, then jumped to **2.2.0** at **`607ed5b`** (Wave 1 AJ skills). Fork HEAD (`d3e8298`) already has **internal version drift**: Claude manifests at **2.2.0**, Cursor marketplace at **2.1.8**, Kilo manifest at **2.1.8**.

The approved scheme **`2.1.8-10`** (upstream base + fork postfix) is **workable but semantically fragile**: in SemVer 2.0, `2.1.8-10` is a **pre-release of 2.1.8** and sorts **below** upstream `2.1.8`, which contradicts a fork that is functionally ahead. Safer alternatives: `2.1.8-fork.10`, `2.1.8+fork.10` (build metadata), or a distinct marketplace name with coordinated bump policy.

---

## Manifest Version Comparison (Four Refs)

### Summary Table

| Manifest file | `1fc5d3c` | `679958b` (upstream/master) | `1707a26` (fork parallel bump) | Fork HEAD (`d3e8298`, v2.2.0) |
|---------------|-----------|------------------------------|--------------------------------|-------------------------------|
| `.claude-plugin/marketplace.json` | 2.1.7 | 2.1.8 | 2.1.8 | **2.2.0** |
| `plugins/maister/.claude-plugin/plugin.json` | 2.1.7 | 2.1.8 | 2.1.8 | **2.2.0** |
| `plugins/maister-copilot/.claude-plugin/plugin.json` | 2.1.7 | 2.1.8 | 2.1.8 | **2.2.0** |
| `.cursor-plugin/marketplace.json` | *(absent)* | *(absent)* | 2.1.8 | **2.1.8** ⚠️ drift |
| `plugins/maister-cursor/.cursor-plugin/plugin.json` | *(absent)* | *(absent)* | 2.1.8 | **2.2.0** |
| `plugins/maister-kilo/.claude-plugin/plugin.json` | *(absent)* | *(absent)* | *(absent)* | **2.1.8** ⚠️ drift |

### Ref Details

| Ref | SHA | Commit message | Role |
|-----|-----|----------------|------|
| Divergence base | `1fc5d3c` | Bump version to 2.1.7 | Last common ancestor |
| Upstream tip | `679958b` | Bump version to 2.1.8 | `upstream/master` = upstream release |
| Fork parallel bump | `1707a26` | Bump version to 2.1.8. | Fork E2E release incl. Cursor manifests |
| Fork HEAD | `d3e8298` | Complete Wave 1 AJ skills adoption verification | Current fork @ **2.2.0** (Claude path) |

### Upstream `679958b` — Files Changed

Only **3 files**, all `2.1.7` → `2.1.8`:

- `.claude-plugin/marketplace.json`
- `plugins/maister/.claude-plugin/plugin.json`
- `plugins/maister-copilot/.claude-plugin/plugin.json`

No description or plugin-list changes — version field only.

### Fork `1707a26` vs Upstream `679958b`

Claude manifests are **byte-identical** to upstream `679958b` (no diff on the three Claude files). Fork adds **2 Cursor-only files** also at 2.1.8:

- `.cursor-plugin/marketplace.json` *(new)*
- `plugins/maister-cursor/.cursor-plugin/plugin.json` *(new)*

### Fork `607ed5b` — 2.2.0 Bump

Commit *Port Wave 1 AJ skills… (v2.2.0)* updated:

- `.claude-plugin/marketplace.json` → 2.2.0
- `plugins/maister/.claude-plugin/plugin.json` → 2.2.0
- `plugins/maister-copilot/.claude-plugin/plugin.json` → 2.2.0
- `plugins/maister-cursor/.cursor-plugin/plugin.json` → 2.2.0

**Did not update:** `.cursor-plugin/marketplace.json` (stuck at 2.1.8).

### Marketplace Plugin Lists

| Ref | Marketplace | Plugins listed |
|-----|-------------|----------------|
| `1fc5d3c`, `679958b`, `1707a26`, HEAD (Claude) | `maister-plugins` | `maister`, `maister-copilot` |
| `1707a26`, HEAD (Cursor) | `maister-plugins` | `maister-cursor` only |

Fork Cursor and Claude marketplaces are **separate JSON files** with the same marketplace name but different plugin entries. Upstream has **no** `.cursor-plugin/` tree.

### Git Tags

Upstream tags include **`v2.1.8`**. Fork has **no `v2.2.0` tag**; latest tag in shared history is `v2.1.8`.

---

## Version Propagation Model

Understanding which files are **source** vs **generated** determines the update workflow for `2.1.8-10`.

```
plugins/maister/.claude-plugin/plugin.json   ← SOURCE OF TRUTH (version)
        │
        ├── make build-copilot → plugins/maister-copilot/.claude-plugin/plugin.json
        ├── make build-cursor  → plugins/maister-cursor/.cursor-plugin/plugin.json (re-written by build.sh)
        └── platforms/kilo-cli/build.sh → plugins/maister-kilo/.claude-plugin/plugin.json (copied from core)

.claude-plugin/marketplace.json              ← MANUAL (Claude Code marketplace)
.cursor-plugin/marketplace.json              ← MANUAL (Cursor marketplace; NOT touched by build-cursor)
```

| Platform | Version manifest | Build regenerates? | In default `make build`? |
|----------|------------------|--------------------|--------------------------|
| Claude Code (maister) | `plugins/maister/.claude-plugin/plugin.json` | N/A (source) | — |
| Claude marketplace | `.claude-plugin/marketplace.json` | No | — |
| Copilot CLI | `plugins/maister-copilot/.claude-plugin/plugin.json` | Yes (`build-copilot`) | Yes |
| Cursor Agent | `plugins/maister-cursor/.cursor-plugin/plugin.json` | Yes (`build-cursor`) | Yes |
| Cursor marketplace | `.cursor-plugin/marketplace.json` | **No** | — |
| Kiro CLI | *(none — `.claude-plugin/` removed by build)* | N/A | Yes (`build-kiro`) |
| Kilo CLI | `plugins/maister-kilo/.claude-plugin/plugin.json` | Yes (`platforms/kilo-cli/build.sh`) | **No** (not in Makefile) |

**Kiro** has no plugin version field — agents use JSON configs without semver.

**Cursor `build.sh`** reads version from copied source manifest and injects it into the expanded `.cursor-plugin/plugin.json` template (lines 23–29).

---

## Files Containing Version Strings to Update

### Tier 1 — Must update for `2.1.8-10` release (manifest semver)

| # | File | Current (HEAD) | Edit mode | Notes |
|---|------|----------------|-----------|-------|
| 1 | `.claude-plugin/marketplace.json` | 2.2.0 | **Manual** | Claude Code marketplace version |
| 2 | `plugins/maister/.claude-plugin/plugin.json` | 2.2.0 | **Manual (source)** | Drives copilot/cursor/kilo builds |
| 3 | `.cursor-plugin/marketplace.json` | 2.1.8 | **Manual** | Already stale; must sync on any bump |
| 4 | `plugins/maister-copilot/.claude-plugin/plugin.json` | 2.2.0 | Regenerate | `make build-copilot` after #2 |
| 5 | `plugins/maister-cursor/.cursor-plugin/plugin.json` | 2.2.0 | Regenerate | `make build-cursor` after #2 |
| 6 | `plugins/maister-kilo/.claude-plugin/plugin.json` | 2.1.8 | Regenerate | `bash platforms/kilo-cli/build.sh` after #2 |

**Synchronization rule:** All six should carry the **same** version string after integration.

### Tier 2 — Documentation / historical references (optional, non-blocking)

| File | Current references | Action |
|------|-------------------|--------|
| `docs/cursor-agent-implementation-plan.md` | v2.1.8 in release checklist | Update if doc should reflect post-integration version |
| `CLAUDE.md` § Beta Branch Management | Documents 3-manifest workflow (upstream-era) | Extend to list fork-only manifests (Cursor marketplace, Kilo) |

### Tier 3 — Not plugin version (do not change for semver bump)

| File | `"version"` meaning |
|------|---------------------|
| `plugins/maister/hooks/hooks.json` | Hook schema version `1` |
| `plugins/maister-cursor/hooks/hooks.json` | Hook schema version `1` |
| `platforms/cursor/hooks/hooks.json` | Hook schema version `1` |
| `plugins/maister/skills/product-design/references/visual-companion.md` | Example API response `"1.0.0"` |
| `plugins/maister/skills/migration/references/migration-types.md` | Prose keyword "version" |

### Tier 4 — Generated bulk (auto-fixed by rebuild)

After source bump + `make build`, version strings in generated trees update automatically. Do **not** hand-edit:

- `plugins/maister-copilot/**` (except understanding manifest path above)
- `plugins/maister-cursor/**`
- `plugins/maister-kiro/**` (no version manifest)
- `plugins/maister-kilo/**` (except manifest from kilo build)

---

## Assessment: Is `2.1.8-10` Sound?

### Intent (from research brief)

> Upstream base `2.1.8` + fork postfix `-10` → encodes upstream sync point and fork iteration without claiming upstream semver continuity.

This is a reasonable **communication goal**: readers see which upstream release the fork incorporates, plus a fork-specific counter.

### SemVer Analysis

| Aspect | Assessment |
|--------|------------|
| **Validity** | `2.1.8-10` is syntactically valid SemVer 2.0 |
| **Precedence** | `-10` is a **pre-release identifier**. SemVer orders `2.1.8-10` **< `2.1.8`** (stable) |
| **Implication** | Package managers / semver comparators treat fork as **older than upstream**, despite fork having **more features** |
| **Upstream convention** | Master: `X.Y.Z`; beta: `X.Y.Z-beta.N` (see `CLAUDE.md`) |
| **Fork convention today** | Independent minor bump to **2.2.0** — implies fork semver line diverged from upstream |

### Alignment: Upstream SemVer vs Fork Iteration

| Dimension | Upstream | Fork (HEAD) | With `2.1.8-10` |
|-----------|----------|-------------|-----------------|
| Base sync point | 2.1.8 | Cherry-pick target | Explicit in version ✅ |
| Feature delta | 2 commits since base | 34 commits, multi-platform | Not visible in `-10` alone |
| Semver line | Linear `2.1.x` | Jumped to `2.2.0` | Resets to 2.1.8 track ✅ |
| Comparator vs upstream | Equal at 2.1.8 | Ahead (2.2.0 > 2.1.8) | **Behind** (2.1.8-10 < 2.1.8) ⚠️ |
| Next upstream release | Likely 2.1.9 or 2.2.0 | Unclear merge path | Fork postfix increments: `2.1.8-11`, or rebase to `2.1.9-1` |

### What Does `-10` Mean?

No commit in fork history encodes `-10`. Candidates:

1. **Arbitrary integration release ID** (user pre-approved) — fine if documented in release notes.
2. **Tenth fork iteration** — does **not** match git metrics (34 commits since `1fc5d3c`, 2 semver bumps: 2.1.8 → 2.2.0).
3. **Replacement for abandoned 2.2.0** — adopting `2.1.8-10` **downgrades** manifest from current 2.2.0 in strict semver terms.

**Recommendation:** Document `-10` explicitly in commit message / changelog. Increment to `-11`, `-12`, … for subsequent fork releases without upstream sync; on next upstream sync (e.g. 2.1.9), reset to `2.1.9-1`.

### Safer Alternative Schemes

| Scheme | Example | Pros | Cons |
|--------|---------|------|------|
| **Approved** | `2.1.8-10` | Short, encodes base | SemVer pre-release → sorts below upstream |
| Pre-release tag | `2.1.8-fork.10` | Clear fork identity | Longer string |
| Build metadata | `2.1.8+fork.10` | Equal precedence to 2.1.8 | `+` may be stripped by some tools |
| Fourth segment | `2.1.8.10` | Reads as "patch fork 10" | Non-strict SemVer |
| Separate marketplace | `maister-plugins-fork` @ `2.1.8.10` | No collision with upstream | Different install identity |

### Verdict

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Encodes upstream base | ✅ Good | Clearly ties to 2.1.8 sync |
| Fork iteration tracking | ⚠️ Partial | `-10` needs explicit definition; not git-derived |
| SemVer correctness | ⚠️ Weak | Pre-release semantics invert "ahead of upstream" |
| Tooling compatibility | ✅ Likely OK | JSON string field; no schema fetch verified (404 on schema URL) |
| Consistency with repo history | ⚠️ Conflict | Retracts 2.2.0; fixes marketplace drift if applied uniformly |
| Multi-platform coverage | ⚠️ Needs process | Must update 6 manifest paths + kilo rebuild outside `make build` |

**Overall:** **Conditionally sound** — acceptable as a **fork distribution convention** if the team accepts SemVer pre-release ordering and documents postfix semantics. For comparator clarity, prefer **`2.1.8-fork.10`** or **`2.1.8+fork.10`** over bare `-10`.

---

## Manifest Update Plan for `2.1.8-10`

### Pre-integration state to reconcile

1. Fork at **2.2.0** on Claude path — decide whether to **replace** with `2.1.8-10` (recommended per brief) or keep 2.2.0 line.
2. Fix existing drift: `.cursor-plugin/marketplace.json` and `plugins/maister-kilo/.claude-plugin/plugin.json` lagging at 2.1.8.

### Post-cherry-pick sequence

```bash
# 1. Edit source manifests (Tier 1 manual files)
#    - plugins/maister/.claude-plugin/plugin.json  → "2.1.8-10"
#    - .claude-plugin/marketplace.json           → "2.1.8-10"
#    - .cursor-plugin/marketplace.json           → "2.1.8-10"

# 2. Regenerate platform variants
make build                    # copilot + cursor + kiro

# 3. Regenerate Kilo (not in default make build)
bash platforms/kilo-cli/build.sh

# 4. Verify all manifests match
grep -r '"version": "2.1.8-10"' \
  .claude-plugin/marketplace.json \
  .cursor-plugin/marketplace.json \
  plugins/maister/.claude-plugin/plugin.json \
  plugins/maister-copilot/.claude-plugin/plugin.json \
  plugins/maister-cursor/.cursor-plugin/plugin.json \
  plugins/maister-kilo/.claude-plugin/plugin.json

# 5. Validate
make validate
```

### Cherry-pick interaction with `679958b`

Upstream version commit `679958b` sets **`2.1.8`**. After cherry-picking `fb5a8f3` + `679958b`:

- **Do not** take upstream `2.1.8` verbatim — override to **`2.1.8-10`** in the same files.
- Fork `1707a26` already matched upstream Claude manifests; content merge is trivial, version string is the fork-specific override.

### Description fields

Upstream and fork share identical descriptions today. Optional enhancement for fork manifests:

```json
"description": "Structured, standards-aware development workflows for Claude Code (fork build 2.1.8-10, synced to upstream 2.1.8)"
```

Not required for tooling; aids human traceability.

---

## Version Timeline (Fork)

```
1fc5d3c  ── 2.1.7 ── common ancestor
    │
    ├── upstream: fb5a8f3 (features) → 679958b (2.1.8)
    │
    └── fork: c726313 (Cursor variant, marketplace 2.1.7→…)
              1707a26 (2.1.8 + Cursor manifests)
              b63dee6 (Kilo added, kilo manifest 2.1.8)
              607ed5b (2.2.0 Wave 1 — partial manifest update)
              d3e8298 (HEAD, 2.2.0 Claude / 2.1.8 Cursor marketplace)
```

---

## Findings for Synthesis

| Finding | Impact |
|---------|--------|
| Upstream version surface = **3 JSON files** | Cherry-pick `679958b` is low-conflict; override version afterward |
| Fork adds **2 manual manifest files** (Cursor marketplace + Kilo) | Upstream merge workflow in `CLAUDE.md` is incomplete for fork |
| Fork HEAD has **manifest drift** (2.1.8 vs 2.2.0) | Integration must fix all 6 paths in one commit |
| `2.1.8-10` pre-release semantics | May confuse semver comparators vs upstream 2.1.8 |
| Kilo not in `make build` | Easy to miss during version bump |
| No `v2.2.0` git tag on fork | Tag policy should be defined for `2.1.8-10` release |

---

## Sources

- `git show` / `git diff` at refs `1fc5d3c`, `679958b`, `1707a26`, `607ed5b`, `d3e8298`
- `.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json`, plugin manifests at HEAD
- `platforms/cursor/build.sh` (version propagation)
- `platforms/kilo-cli/build.sh`, `platforms/copilot-cli/build.sh`
- `Makefile` (`build`, `validate` targets)
- `CLAUDE.md` § Beta Branch Management (upstream 3-manifest convention)
- Task brief: `.maister/tasks/research/2026-06-14-upstream-sync-consistency/planning/research-brief.md`
