## TL;DR

Ship a thin public `@mateuszrapacz/maister` npx launcher now. It should select and verify the correct `mateuszrapacz/maister` GitHub Release archive—`maister-codex.tar.gz`, `maister-cursor.tar.gz`, or `maister-kiro-cli.tar.gz`—then delegate all host mutation and lifecycle behavior to the archive's existing transactional `maister-install.mjs`.

This is the smallest design that creates a one-command installation path without duplicating receipts, drift detection, update, rollback, recovery, or target-specific behavior. Add host-native managed marketplace plugins later as another distribution channel. Generic `npx skills` is useful for copying or symlinking Agent Skills, but is insufficient for Maister's complete plugin lifecycle because it does not own Maister's target archives, host settings, transactions, rollback, or recovery.

## Key Decisions

- Publish the launcher as **`@mateuszrapacz/maister`** and resolve releases from **`mateuszrapacz/maister`**.
- Keep GitHub Release archives as the release payloads and source of truth.
- Keep `maister-install.mjs` as the sole authority for installation, update, verification, uninstall, rollback, recovery, receipts, journals, backups, and managed host settings.
- Keep target selection explicit: `codex`, `cursor`, or `kiro-cli`.
- Support exact versions as the reproducible path; if `latest` is supported, display and record the resolved immutable version.
- Treat Agent Skills installers and host marketplaces as complementary channels, not replacements for the transactional installer.

## Open Questions / Risks

- **Publisher trust:** checksums detect mismatched bytes but do not authenticate a publisher unless anchored by a stronger signing or trusted-publishing mechanism.
- **Extraction safety:** the launcher must reject path traversal, absolute paths, unsafe symlinks, oversized payloads, and unexpected archive topology before delegation.
- **Version alignment:** npm package versions and GitHub Release tags/assets must be published and tested as one release unit.
- **Host marketplace ownership:** each host has a distinct review, packaging, update, and compatibility surface; parity may drift.
- **Scope pressure:** putting lifecycle logic into the launcher or an Agent Skills package would create a second mutation authority and weaken the current transactional boundary.

## Observed Installer Patterns

The following are **verified facts from the supplied evidence brief**, not recommendations inferred by this report.

| Project / tool | Installation unit | Scope and mutation model | Update / provenance pattern | Implication for Maister |
|---|---|---|---|---|
| [mattpocock/skills](https://github.com/mattpocock/skills) | Editable skills or native Claude plugin | `npx skills@latest add` copies into selected agents/projects; Claude plugin is managed and read-only | Copied skills are user-editable; native plugin updates with releases | Copy and managed-plugin channels serve different ownership models |
| [obra/superpowers](https://github.com/obra/superpowers) | Harness-specific plugin/package | Separate installation per host: marketplaces/plugins, direct repository install, or Pi git package | Lifecycle follows each harness | No universal host mutation layer is assumed |
| [gsd-build/gsd-2](https://github.com/gsd-build/gsd-2/blob/main/docs/user-docs/skills.md) | Agent Skills delegated to `npx skills` | Global `~/.agents/skills` or project `.agents/skills`; recommendations during `gsd init` | Catalog recommendations plus check/update lifecycle | A product can delegate its skill subset while retaining its own product lifecycle |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | Skills from Git, URL, or local source | Agent choice; global/project scope; symlink by default or copy | `list`, `update`, `remove`, and `use` | Strong generic skill distribution, but intentionally skill-oriented |
| [`gh skill install`](https://cli.github.com/manual/gh_skill_install) | Skills copied from GitHub | Copies skills and injects source-tracking metadata | Latest tag, then default HEAD unless pinned by `@VERSION` or `--pin` | Provenance and pinning can accompany copies, but copying remains the mutation model |
| Maister today | Target-specific release archive | `maister-{codex,cursor,kiro-cli}.tar.gz` delegates to transactional `maister-install.mjs` | Existing lifecycle includes transactional state and recovery | Distribution should wrap, not replace, this authority |

## Alternatives

### 1. Thin npx release launcher — recommended now

**Classification:** In scope.

**Description:** Publish `@mateuszrapacz/maister` as a small executable package. It resolves an exact or `latest` GitHub Release, maps the explicit target to its archive, validates and extracts it into a private temporary directory, then invokes the packaged `maister-install.mjs` and forwards its result.

**Pros:** One-command cross-host entry point; reuses current release artifacts; preserves one mutation authority; small implementation and test surface; supports exact pinning; keeps npm payload small.

**Cons:** Requires Node/npm; introduces download and safe-extraction code; coordinates npm and GitHub publishing; does not provide a native marketplace discovery experience.

**Risks:** Version skew, compromised or mismatched artifacts, unsafe archives, and ambiguity around `latest`. Mitigate with allowlisted targets/assets, exact-version support, digest and manifest checks, bounded extraction, release alignment tests, and visible resolved provenance.

### 2. Agent Skills copy/symlink package

**Classification:** Stretch for skill-only distribution; out of scope as the primary installer.

**Description:** Expose Maister skills through the `npx skills` ecosystem for global/project installation, using symlinks or copies and source tracking where available.

**Pros:** Familiar cross-agent workflow; supports project/global scope; editable copy mode; catalog discovery and generic update tooling; useful for lightweight, standalone skills.

**Cons:** Models files as skills rather than a multi-host plugin; cannot by itself preserve Maister's target overlays, settings ownership, transaction journal, receipts, rollback, and recovery semantics.

**Risks:** Users may mistake skill installation for complete Maister installation; editable copies can drift; generic updates could overwrite intentional edits; lifecycle behavior may fragment between two authorities.

### 3. Per-host managed marketplace plugins

**Classification:** Stretch / later channel.

**Description:** Publish separately through each host's native marketplace or managed plugin mechanism, following the harness-specific pattern observed in Superpowers and mattpocock/skills' Claude bundle.

**Pros:** Native discovery, trust prompts, updates, and uninstall UX; read-only managed bundles reduce drift; host conventions are handled where they belong.

**Cons:** Separate packaging, review, metadata, release, and compatibility work per host; not every host offers equivalent marketplace capabilities; slower route to parity.

**Risks:** Release lag and behavioral divergence across Codex, Cursor, and Kiro CLI; marketplace rules may constrain transactional behavior; users may receive different versions by host.

### 4. Hybrid universal bootstrap plus host adapters

**Classification:** Stretch after the thin launcher proves the contract.

**Description:** Keep `@mateuszrapacz/maister` as the universal entry point, but allow it to dispatch to a host-native adapter when one exists and otherwise use the verified archive plus `maister-install.mjs` path.

**Pros:** One documented command; gradual adoption of native channels; central target/version/provenance policy; fallback for hosts without marketplaces.

**Cons:** More branching and compatibility testing; adapter contracts must remain aligned; the bootstrap must clearly report which channel performed the installation.

**Risks:** Two paths for the same host can produce state conflicts; native adapters may bypass receipts or transactional guarantees; automatic host detection can choose incorrectly. Require explicit targets, adapter capability contracts, and single-authority handoff rules.

## Five-Perspective Evaluation

Scores are **design inferences** from the verified patterns and local Maister report: 5 is strongest; for risk, 5 means lowest delivery/operational risk.

| Alternative | Technical feasibility | User impact | Simplicity | Risk | Scalability | Summary |
|---|---:|---:|---:|---:|---:|---|
| Thin npx launcher | 5 | 4 | 5 | 4 | 4 | Best near-term fit because it reuses archives and the installer |
| Agent Skills package | 4 | 3 | 3 | 2 | 4 | Good for skill subsets, incomplete for the plugin lifecycle |
| Per-host marketplaces | 3 | 5 | 2 | 3 | 3 | Best native UX, highest channel duplication |
| Hybrid bootstrap/adapters | 3 | 5 | 2 | 2 | 5 | Strong destination, premature as the first release |

## How Might We Questions

- How might we make installation one command while preserving `maister-install.mjs` as the only mutation authority?
- How might we make `latest` convenient without hiding the exact version and source that were installed?
- How might we expose standalone Maister skills through generic skill catalogs without implying full plugin installation?
- How might we add marketplace channels without creating incompatible receipts, state, or update ownership?
- How might we prove npm package, GitHub tag, archive, manifest, and installed source all describe the same release?

## SCAMPER-Derived Ideas

- **Substitute:** replace manual archive download/extraction with a thin npx resolver, not with a new installer.
- **Combine:** pair npm's executable delivery with GitHub Release payloads and the existing transactional installer.
- **Adapt:** borrow source tracking and pinning from `gh skill install`, while binding it to Maister's release manifest and receipts.
- **Modify:** make `latest` print and persist its resolved version so convenience becomes auditable.
- **Put to another use:** publish selected standalone skills through `npx skills` for discovery, while labeling that channel “skills only.”
- **Eliminate:** remove duplicate host mutation logic from all distribution adapters.
- **Reverse:** instead of making one generic tool understand every host lifecycle, let host adapters call the same validated Maister lifecycle contract.

## Recommendation

Implement the **thin `@mateuszrapacz/maister` launcher now**. Its responsibility should end at target/version resolution, verified download, safe temporary extraction, delegation, cleanup, and faithful forwarding of the installer's output and exit status. The authoritative chain should be:

```text
@mateuszrapacz/maister
  → mateuszrapacz/maister GitHub Release
  → maister-<target>.tar.gz
  → maister-install.mjs
  → host state
```

Offer exact versions as the reproducible route and make any `latest` resolution explicit. Add host-native marketplaces later, beginning where a managed read-only plugin channel materially improves discovery and automatic updates.

Generic `npx skills` alone is insufficient because its abstraction is installation of skills by copy or symlink. Maister distributes target-specific plugin archives and already owns a broader transactional lifecycle: host settings, staging, receipts, journals, drift detection, verification, update, uninstall, rollback, and recovery. Delegating a skill subset to `npx skills` can be useful, but delegating the entire plugin would either lose those guarantees or duplicate them outside `maister-install.mjs`.

## Deferred Ideas

- Native marketplace packages for Codex, Cursor, and Kiro CLI after each channel's lifecycle contract is understood.
- A hybrid bootstrap that selects certified host adapters while retaining a universal fallback.
- A catalog entry for standalone Maister skills, explicitly separated from full plugin installation.
- Stronger publisher authentication or trusted publishing beyond unsigned checksum comparison.
- Host auto-detection only as an advisory prompt; explicit `--target` remains authoritative.

## Fact / Inference Boundary and Sources

**Facts** in the pattern matrix come from the supplied verified brief and these official sources: [mattpocock/skills](https://github.com/mattpocock/skills), [obra/superpowers](https://github.com/obra/superpowers), [gsd-build/gsd-2 skills documentation](https://github.com/gsd-build/gsd-2/blob/main/docs/user-docs/skills.md), [vercel-labs/skills](https://github.com/vercel-labs/skills), and [`gh skill install`](https://cli.github.com/manual/gh_skill_install). The existence of Maister's three target archives and transactional installer is verified local evidence supplied for this exploration.

**Inferences** are the alternative classifications, scores, risks, SCAMPER ideas, and recommendation. They follow from comparing those facts with Maister's existing lifecycle boundary; they are not claims that the referenced projects endorse Maister's design.
