# Versioning Recommendation (post user review)

## Context

| Ref | Claude manifests | Notes |
|-----|------------------|-------|
| Upstream `679958b` | `2.1.8` | Official SkillPanel release |
| Fork `1707a26` | `2.1.8` | Matched upstream before platform work |
| Fork `607ed5b` | `2.2.0` | Wave 1 AJ skills — independent bump |
| Fork HEAD | `2.2.0` (Claude/Cursor plugin) / `2.1.8` (Cursor marketplace, Kilo) | **Drift** — inconsistent |

Upstream convention (from `CLAUDE.md`): stable `X.Y.Z`, beta `X.Y.Z-beta.N`.

## Goal: dual versioning

Encode **upstream sync point** + **fork iteration** without lying to semver comparators.

## Options evaluated

| Scheme | Example | Sorts vs upstream 2.1.8 | Sorts vs fork 2.2.0 | Dual-tracking | Verdict |
|--------|---------|---------------------------|---------------------|---------------|---------|
| Bare upstream | `2.1.8` | Equal | **Downgrade** | Yes (loses fork line) | ❌ Hides fork features |
| Continue fork line | `2.2.1` | **Ahead** | Patch bump | **No** upstream anchor | ✅ Simple; ❌ no sync signal |
| Hyphen number | `2.1.8-10` | **Below** (pre-release) | Downgrade | Yes | ❌ Semver misread |
| Fork pre-release | `2.1.8-fork.1` | Below 2.1.8* | Downgrade | **Yes** — mirrors `-beta.N` | ✅ Best dual-flow match |
| Build metadata | `2.1.8+fork.1` | Equal precedence | Downgrade | Yes | ⚠️ Often stripped by tools |
| Fork minor on upstream | `2.1.9-fork.1` | Ahead | Downgrade | Yes | ⚠️ Implies upstream features we don't have |

\*Pre-release sorts below release — same as upstream `2.1.8-beta.1`.

## Recommendation: `2.1.8-fork.1`

**Why:**
1. Mirrors upstream's own **`X.Y.Z-beta.N`** pattern → **`X.Y.Z-fork.N`**
2. Base `2.1.8` = "content synced with upstream release"
3. `-fork.1` = first fork integration release on that base (increment: `-fork.2`, `-fork.3`…)
4. On next upstream sync (e.g. `2.1.9`): reset to `2.1.9-fork.1`
5. Clearer than `2.1.8-10` (which looks like CI build number and has no convention in this repo)

**Alternative if dual-tracking doesn't matter:** `2.2.1` — honest continuation of fork semver; add changelog note "includes upstream fb5a8f3".

## Manifest update (6 files → `2.1.8-fork.1`)

Manual:
1. `plugins/maister/.claude-plugin/plugin.json` (source of truth)
2. `.claude-plugin/marketplace.json`
3. `.cursor-plugin/marketplace.json`

Regenerate:
4. `plugins/maister-copilot/.claude-plugin/plugin.json` → `make build-copilot`
5. `plugins/maister-cursor/.cursor-plugin/plugin.json` → `make build-cursor`
6. `plugins/maister-kilo/.claude-plugin/plugin.json` → `bash platforms/kilo-cli/build.sh`

Also fix existing drift (Cursor marketplace + Kilo stuck at 2.1.8).

## Do NOT cherry-pick `679958b`

Set version manually to chosen scheme after `fb5a8f3` integration.
