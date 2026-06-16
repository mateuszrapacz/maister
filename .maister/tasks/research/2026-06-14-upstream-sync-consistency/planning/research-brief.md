# Research Brief: Upstream Sync Consistency

## Research Question

Are upstream SkillPanel/maister v2.1.8 changes (commits `fb5a8f3`, `679958b`) consistent with fork-specific changes in mateuszrapacz/maister (34 commits since `1fc5d3c`)? What integration strategy (cherry-pick) is safe, and what conflicts require manual resolution?

## Research Type

**Mixed** — technical codebase diff + integration strategy + versioning policy.

## Scope

### Included
- Upstream commits: `fb5a8f3` (quick-* rework, Maister rebrand, docs templates), `679958b` (version bump)
- Fork divergences: Cursor/Kiro/Kilo platforms, Wave 1 AJ skills, multi-platform build pipeline
- Versioning policy: upstream base `2.1.8` + fork postfix `2.1.8-10`
- Cherry-pick feasibility per change area
- Consistency of quick-dev/quick-plan command→skill refactor with Kiro shortcut skills and Cursor variants

### Excluded
- Implementing the integration (deferred to development workflow)
- Upstream beta branch or unreleased work beyond master
- Non-maister plugin marketplace distribution

## Constraints
- Cherry-pick only — no blind `git merge upstream/master`
- Never edit generated files under `maister-copilot/`, `maister-cursor/`, `maister-kiro/` directly — source in `plugins/maister/` + `make build`
- Preserve fork-only features: AJ skills, grill-me, thermos, platform variants

## Success Criteria
1. Per-area compatibility matrix (compatible / needs adaptation / conflict)
2. Explicit list of files requiring manual merge during cherry-pick
3. Version manifest update plan for `2.1.8-10` scheme
4. Go/no-go recommendation for development phase with confidence level

## User Decisions (pre-approved)
- Integration method: cherry-pick
- Version scheme: `2.1.8-10` (upstream semver + fork postfix)
- Primary concern: consistency between upstream flow changes and fork platform/skill extensions
