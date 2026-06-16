# Research Synthesis: Upstream Sync Consistency

**Task:** 2026-06-14-upstream-sync-consistency  
**Synthesizer:** maister-research-synthesizer  
**Date:** 2026-06-14  
**Inputs:** 5 findings reports + research brief

---

## Cross-Reference Map

| Finding report | Primary question answered | Feeds into |
|----------------|---------------------------|------------|
| `upstream-diff-report.md` | What changed upstream? Can `fb5a8f3` cherry-pick cleanly? | Cherry-pick file list, rebrand scope, dry-run evidence |
| `fork-divergence-report.md` | What did the fork add? Where do paths overlap? | Preserve list, manual merge targets, semantic conflicts |
| `platform-build-report.md` | How do build scripts treat commands vs skills? | Cursor/Kiro adaptation requirements, validate rules |
| `quick-workflows-report.md` | Is command→skill refactor compatible with platform models? | Per-workflow matrix, override preservation policy |
| `versioning-manifests-report.md` | How to apply `2.1.8-10`? SemVer caveats? | Version plan, skip `679958b` strategy |

---

## Pattern Analysis

### Pattern 1: Git-clean ≠ integration-clean

The upstream diff report documents a **successful dry-run** of `git cherry-pick --no-commit fb5a8f3` with zero merge conflicts. The fork divergence report simultaneously identifies **3 overlapping source files** and **4 semantic design divergences** that git does not surface.

**Reasoning:** Git auto-merged `CLAUDE.md` and `init/SKILL.md` because upstream and fork edits touched different regions. That produces a syntactically valid file that still requires **human verification** — upstream adds quick-plan/quick-dev skill entries and Maister rebrand text; fork adds AJ skills, grill-me, thermos sections and Phase 3 UX logic. The cherry-pick succeeds mechanically; correctness depends on post-pick review, not conflict markers.

### Pattern 2: Upstream moves left; fork platforms move down

Upstream `fb5a8f3` shifts quick workflows **horizontally** — from prescriptive commands to thin skills extending native Claude behaviors (plan mode, direct dev, TDD). The fork shifted **vertically** — same workflows adapted per platform via overrides (file-based plans, CHAT GATE, AskQuestion) because Cursor/Kiro lack `EnterPlanMode`.

```
Upstream axis:  command (130 lines) ──► skill (~25 lines, EnterPlanMode)
Fork axis:      Claude source ──► platform override ──► generated variant
```

These axes are **orthogonal, not opposing**. Quick-workflows and platform-build reports converge: adopt upstream source layout; **preserve** fork platform overrides as permanent adaptations. The conflict is not "upstream vs fork philosophy" but "source artifact type changed while build pipeline still assumes commands on Cursor."

### Pattern 3: Kiro is already skill-native; Cursor is command-native

Platform-build report establishes asymmetric impact:

| Platform | quick-plan/dev today | After upstream source change | Build change needed? |
|----------|---------------------|------------------------------|----------------------|
| **Kiro** | Commands merged → skills + shortcuts | Native skills + same overrides | Optional cleanup only |
| **Cursor** | Commands in output; overrides on command path | Skills in copy; override still writes command | **Yes** — duplicate artifacts + validate failure |
| **Copilot** | Stale commands from fork source | Skills-only (matches upstream) | No build change |

Quick-workflows report adds: Kiro shortcuts (`/quick-dev` → `/maister-quick-dev`) are **invocation-name stable** regardless of whether canonical body came from command merge or native skill directory.

### Pattern 4: Thin-skill philosophy vs fork verbose commands

Upstream explicitly reframes quick workflows as "trust Claude to reason" (~24–26 lines). Fork retained ~130-line command bodies through Wave 1 AJ port (`607ed5b`). Cherry-picking upstream **changes runtime behavior on Kiro for quick-dev** (no override buffer) and **aligns Copilot** (currently stale).

**Cross-reference:** Fork divergence preserve list does not require verbose quick-dev/plan bodies — only AJ skills, grill-me, thermos, platform dirs, init Phase 3 gate. Adopting upstream thin skills satisfies user constraint "preserve fork-only features" without preserving fork verbosity.

### Pattern 5: Version surface expanded beyond upstream convention

Versioning report × fork divergence report:

- Upstream: **3 manifest files** at 2.1.8
- Fork: **6 manifest files** (adds Cursor marketplace, Cursor plugin, Kilo plugin)
- Fork HEAD: **internal drift** (Claude path 2.2.0, Cursor marketplace 2.1.8, Kilo 2.1.8)

Upstream commit `679958b` is trivially cherry-pickable but **must not be taken verbatim** — it sets 2.1.8, contradicting approved `2.1.8-10`. Fork already has parallel bump at `1707a26` (byte-identical Claude manifests to upstream `679958b`).

**SemVer cross-reference:** User-approved `2.1.8-10` parses as pre-release of 2.1.8, sorting **below** upstream stable 2.1.8. This is acceptable as a **distribution convention** if documented; comparators will not reflect "fork is ahead." Alternative `2.1.8-fork.10` avoids ambiguity.

### Pattern 6: Rebrand is low-risk, high-touch

Upstream Maister rebrand touches 11+ locations but **does not alter fork-only logic**. Init overlap is title/description text vs Phase 3 gate logic — fork divergence rates merge risk **medium on text, low on logic**. Rebrand can ride the cherry-pick with spot-check that "Maister" naming doesn't break Kiro/Cursor user docs that still say "AI SDLC."

---

## Reasoning Chain: Safe Cherry-Pick Strategy

### Step 1 — Cherry-pick `fb5a8f3` only (substantive)

**Evidence:** Dry-run EXIT_CODE=0, stat matches (+147/−687, 23 files).

**Expected outcome:**
- Deletes `commands/quick-dev.md`, `commands/quick-plan.md` (source + copilot mirror)
- Adds `skills/quick-dev/SKILL.md`, `skills/quick-plan/SKILL.md`
- Refactors `quick-bugfix`, templates, hooks, docs, rebrand strings
- Auto-merges `CLAUDE.md`, `init/SKILL.md`

### Step 2 — Skip `679958b`; apply version manually

**Evidence:** Fork at 2.2.0; upstream sets 2.1.8; user decision is 2.1.8-10.

Taking `679958b` creates unnecessary conflict resolution. Version is a **post-integration edit** on 6 Tier-1 manifest paths.

### Step 3 — Manual merge verification (3 files)

| File | Action |
|------|--------|
| `plugins/maister/CLAUDE.md` | Keep fork AJ/grill-me/thermos sections + upstream quick-dev/plan skill entries + Maister rebrand |
| `plugins/maister/skills/init/SKILL.md` | Keep fork Phase 3 smart-defaults gate; apply upstream Maister title/description |
| `plugins/maister/.claude-plugin/plugin.json` | Set `2.1.8-10`; do not revert to upstream 2.1.8 or keep 2.2.0 |

### Step 4 — Platform build adaptations (Cursor required)

**Evidence convergence:** platform-build + quick-workflows both flag Cursor as blocking.

1. Move `quick-plan` override target from `commands/` to `skills/` OR keep override writing to `commands/quick-plan.md` (quick-workflows recommends latter for validate compatibility)
2. Add build step to emit `commands/quick-dev.md` from skill (Cursor slash discovery)
3. Update `validate-cursor` if skill-only path chosen

Kiro: optional removal of dead `merge_one quick-dev/plan` lines.

### Step 5 — Preserve fork-only assets (no upstream action)

From fork divergence preserve list — **zero cherry-pick risk**:
- AJ skills + quick-* critic commands
- grill-me, thermos suite
- All `platforms/{cursor,kiro-cli,kilo-cli}/` trees and overrides
- Init Phase 3 gate logic
- Orchestrator MANDATORY GATE markdown fix

### Step 6 — Regenerate, validate, smoke

```bash
make build && make validate
bash platforms/kilo-cli/build.sh   # Kilo not in default make build
platforms/kiro-cli/tests/build-core.test.sh
platforms/cursor/smoke-cli.sh
```

---

## Unified Compatibility Assessment

| Area | Status | Confidence | Key evidence |
|------|--------|------------|--------------|
| Cherry-pick `fb5a8f3` (git) | **Compatible** | High | Dry-run success |
| Cherry-pick `679958b` | **Conflict** (skip) | High | Version mismatch |
| Quick workflows (source) | **Needs adaptation** | High | Command→skill + delete fork commands |
| Quick workflows (Kiro) | **Compatible** | High | Shortcuts + overrides unchanged |
| Quick workflows (Cursor) | **Needs adaptation** | High | Build + validate assume commands |
| Quick workflows (Copilot) | **Compatible** | High | Aligns after source adopt |
| Rebrand / templates | **Compatible** | Medium | Auto-merge; verify docs consistency |
| Init skill | **Needs adaptation** | Medium | Logic preserved; text merged |
| CLAUDE.md catalog | **Needs adaptation** | High | Both sides added table rows |
| Version manifests | **Needs adaptation** | High | 6 files → 2.1.8-10 |
| Fork-only skills | **N/A (preserve)** | High | No upstream overlap |
| Platform directories | **N/A (preserve)** | High | Fork-only |
| Generated variants | **Needs adaptation** | High | Rebuild only; never direct edit |

---

## Tension Resolution

### Tension A: quick-workflows vs platform-build on Cursor quick-plan

- **platform-build:** Move override to `skills/quick-plan/SKILL.md`; update validate to skill path.
- **quick-workflows:** Keep override copying to `commands/quick-plan.md` to satisfy existing validate + slash command discovery.

**Synthesis:** Both are valid. **Recommended hybrid:** keep override writing to `commands/quick-plan.md` (minimal validate change) for quick-plan; add skill→command emission for quick-dev only. Revisit when Cursor skill slash invocation is confirmed stable.

### Tension B: 2.1.8-10 vs 2.2.0

User pre-approved 2.1.8-10. Versioning report warns SemVer pre-release ordering.

**Synthesis:** Proceed with `2.1.8-10` per user decision. Document in changelog that `-10` is fork integration release ID (not git-derived). Note caveat: semver tools rank fork below upstream 2.1.8.

### Tension C: Upstream thin skills vs fork verbose commands

**Synthesis:** Adopt upstream thin skills. Fork verbosity is not on preserve list. Platform overrides remain the intentional behavioral fork for plan/bugfix on Cursor/Kiro.

---

## Synthesis Conclusion

Upstream v2.1.8 changes are **structurally consistent** with fork changes. The integration is **safe via cherry-pick of `fb5a8f3`** with **bounded post-pick work**: 3 file reviews, Cursor build pipeline updates, unified version bump to `2.1.8-10`, and full platform rebuild.

No finding recommends blind `git merge upstream/master`. No finding identifies irreconcilable conflict with fork-only features.

**Recommendation precursor:** **CONDITIONAL GO** — conditions are enumerated in `outputs/research-report.md`.

**Overall confidence:** **High** (85%) on cherry-pick feasibility and preserve-list safety; **Medium-High** (75%) on first-pass validate/smoke pass without Cursor build edits.
