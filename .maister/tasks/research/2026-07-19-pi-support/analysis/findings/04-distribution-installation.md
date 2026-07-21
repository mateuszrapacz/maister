# Distribution and Installation Contract for First-Class Pi Support

## TL;DR
The safest Pi layout is a Maister-owned local Pi package at `~/.pi/agent/maister/`, activated by exactly one managed `packages` array entry in `~/.pi/agent/settings.json`.
That design keeps canonical behavior and generated Pi projections in one transactionally replaceable tree, leaves `pi-subagents` operator-owned, and avoids writing scattered files into shared Pi resource directories.
Maister's current settings owner cannot safely manage one array member: it manages dotted keys as whole values, so Pi requires a new identity-aware managed-array-entry contract before installation is safe.
All source modes—local checkout, self-contained archive, and GitHub checkout—can otherwise reuse the existing immutable resolution, staging, receipt, rollback, recovery, evidence, and deterministic release pipeline.

## Key Decisions
- Install Maister as a local Pi package under one private `whole_tree` root rather than invoking `pi install`, npm, or the legacy `npx pi-subagents` installer during the Maister transaction.
- Add exactly one settings membership, logically `packages[source=./maister]`, while preserving byte-semantic ownership of every unrelated package and setting.
- Keep `pi-subagents` 0.35.1 external and operator-owned; verify it as a prerequisite and evidence subject, but do not bundle, update, remove, or claim ownership of it.
- Generate Pi skills, prompts, and canonical agent descriptors from Maister canonical sources during isolated materialization; no checked-in behavior copies.
- Bind support claims to the observed active CLI tuple—Pi 0.80.10, Node 25.9.0, `pi-subagents` 0.35.1—and record mismatches as unavailable or provisional rather than silently accepting a nearby version.
- Preserve the existing deterministic archive model: all target contracts travel in each archive, only the selected target's assets travel, and Pi-native external prerequisites are recorded in evidence/provenance rather than hidden inside the tarball.

## Open Questions / Risks
- The exact public integration surface between the Maister Pi extension/bridge and `pi-subagents` is owned by the native-runtime finding. If it requires direct module imports, Pi's separate package module roots make an external package dependency unsafe without an explicit supported API path.
- Pi's local package entry is an array member, while Maister receipts currently record only whole-file or dotted-key settings ownership. Introducing identity-aware array membership changes overlay, receipt, drift, uninstall, and recovery schemas.
- A project-local installation under `.pi/` would be subject to Pi project trust and per-checkout state; this report recommends user-scope installation as the default, with project scope deferred until a separate use case requires it.
- Pi itself may update independently. Evidence must become stale when the active executable/version, package-resolution behavior, `pi-subagents` version, or tested scenario changes.
- The active executable is Pi 0.80.10, while a separate managed npm tree contains `@earendil-works/pi-coding-agent` 0.79.10. Detecting a package by filesystem presence without resolving the executable would bind evidence to the wrong runtime.

## Scope, Versions, and Provenance

**Fact — high confidence.** Repository claims are bound to tracked commit `debc79d65549de63f5edf0be75ee7d007fa6bd9c`. The working tree was already dirty: `.gitignore` was modified and research/development task trees, `.pi-subagents/`, notes, and `dist/` were untracked. This gatherer edited only this report.

**Fact — high confidence.** The active executable resolved to `/Users/mrapacz/.local/share/mise/installs/node/25.9.0/bin/pi`, a symlink into the global `@earendil-works/pi-coding-agent` installation. `pi --version` returned `0.80.10`; that active package declares Node `>=22.19.0` at `/Users/mrapacz/.local/share/mise/installs/node/25.9.0/lib/node_modules/@earendil-works/pi-coding-agent/package.json:2-3,89-96`. The current Node runtime was `v25.9.0`.

**Fact — high confidence.** `/Users/mrapacz/.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent/package.json:2-3` contains version 0.79.10, but it is not the executable resolved on `PATH`. The research plan's preliminary 0.79.10 runtime baseline is therefore superseded for installation/evidence decisions by the directly observed 0.80.10 executable.

**Fact — high confidence.** `pi-subagents` is configured as user package `npm:pi-subagents`, resolves to `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents`, and reports version 0.35.1 (`package.json:2-3`). Its manifest exposes one extension, one skills root, and one prompts root (`package.json:50-59`); Pi peer packages are optional `*` peers, while its development set is Pi 0.80.10 (`package.json:61-97`).

## 1. Verified Pi Package and Discovery Contract

### 1.1 Package scopes and roots

**Fact — high confidence.** Active Pi 0.80.10 documentation says package install/remove writes user settings by default and project settings with `-l`; user npm packages live under `~/.pi/agent/npm/`, project packages under `.pi/npm/`, and a project may auto-install missing packages only after trust (`.../pi-coding-agent/docs/packages.md:18-65`, active 0.80.10 installation).

**Fact — high confidence.** Local package paths are not copied. They are stored in settings and resolved relative to the settings file; a directory is loaded under package rules (`active .../docs/packages.md:114`). This supports a Maister-controlled private tree plus a relative `./maister` settings entry without letting Pi's package manager own or update the tree.

**Fact — high confidence.** Pi packages may use a `package.json` `pi` manifest or conventional `extensions/`, `skills/`, `prompts/`, and `themes/` directories (`active .../docs/packages.md:115-165`). Pi's manifest has no native `agents` resource kind; `pi-subagents` owns its own `agents/` convention, as demonstrated by the installed package inventory and `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/package.json:50-59`.

**Fact — high confidence.** Global and project package identities are deduplicated, with project scope winning. Identity is npm name, normalized git repository, or resolved local path (`active .../docs/packages.md:222-230`; active `dist/core/package-manager.js`, `getPackageIdentity()` and `dedupePackages()`, approximately lines 1339-1380).

### 1.2 Settings and trust

**Fact — high confidence.** Global settings are `~/.pi/agent/settings.json`; project settings are `.pi/settings.json`. Project-local resources and packages require project trust, and non-interactive modes do not prompt (`active .../docs/settings.md:7-24`). Resource fields `packages`, `extensions`, `skills`, and `prompts` are arrays; their paths resolve relative to the containing settings directory (`active .../docs/settings.md:221-257`).

**Fact — high confidence.** Pi 0.80.10's `DefaultPackageManager.installAndPersist()` performs the package installation before adding the settings entry, while `removeAndPersist()` removes package storage before removing the entry (active `dist/core/package-manager.js:744-797`). This is not one transaction spanning settings and installed bytes.

**Fact — high confidence.** Pi's settings storage takes a lock and merges fields changed during a session, but ultimately writes `settings.json` directly with `writeFileSync` rather than Maister's fsync+temporary+rename transaction boundary (active `dist/core/settings-manager.js:35-102,346-408`). This is adequate for Pi's own package manager but does not satisfy Maister's journaled multi-root rollback contract.

**Inference — high confidence.** Maister should not shell out to `pi install ./maister` inside its transaction. Doing so creates a second lifecycle owner, uses a non-atomic install/settings sequence, and makes rollback depend on Pi's package manager state rather than the Maister journal and receipt.

### 1.3 Dependencies and package isolation

**Fact — high confidence.** Pi documentation requires third-party runtime dependencies in `dependencies`, core Pi packages as unbundled `*` peers, and other Pi packages as bundled dependencies because package module roots are separate and do not share modules (`active .../docs/packages.md:166-186`).

**Fact — high confidence.** `pi-subagents` publishes 147 files in its npm pack plan, including agents, prompts, its skill, TypeScript source, and public exports; `npm pack --dry-run --json --ignore-scripts` reported no bundled packages, unpacked size 2,383,571 bytes, and integrity `sha512-nIH6liO541FZ1RoeEu58Ligd59tiNw0/ODPgHh7uvx9Dk4UpWH08F84/l1+hXCzUgC85OCmyVtngWkZjcK94Cg==`.

**Recommendation — high confidence.** Do not copy or bundle `pi-subagents` into the Maister package. Require it as an independently configured host extension and integrate only through its verified public/native boundary. Bundling would duplicate behavior, risk two extension registrations, transfer ownership to Maister, and expand deterministic release/SBOM scope without necessity.

## 2. Recommended Pi Overlay and Package Tree

### 2.1 Installed tree

**Recommendation — medium-high confidence.** Use one private root:

```text
~/.pi/agent/maister/                         # plugin_private, whole_tree
├── package.json                             # Pi package manifest, generated/static metadata
├── .maister-source.json                     # source commit/version/content binding
├── extensions/
│   └── maister.ts                           # thin Pi registration/bridge extension
├── skills/
│   └── <canonical-skill-id>/
│       ├── SKILL.md                         # canonical skill or declared Pi transform
│       └── ...                              # canonical referenced assets
├── prompts/
│   └── maister-<command>.md                 # generated only where Pi prompt semantics fit
├── agents/
│   └── maister-<role>.md                    # generated 28-role Pi/pi-subagents projection
├── agent-projection-v1.json                 # closed projection contract
├── common/                                  # portable primitives/assets required at runtime
├── lib/                                     # distribution/runtime closure
├── bin/                                     # maister install/gate entry points
└── orchestrator-framework/...               # runtime/state/gate closure as selected by layout
```

The exact internal runtime paths should mirror the canonical release closure rather than create a Pi-only second implementation. `agents/` is package-private data consumed by the Pi bridge/`pi-subagents`; Pi's own package manifest should list only supported resource kinds.

### 2.2 Proposed package manifest

**Recommendation — medium confidence.** The staged `package.json` should be deterministic and minimal:

```json
{
  "name": "@maister/pi-package",
  "version": "<source-version>",
  "private": true,
  "type": "module",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions/maister.ts"],
    "skills": ["./skills"],
    "prompts": ["./prompts"]
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*"
  }
}
```

Do not list `pi-subagents` as an ordinary dependency unless the runtime investigation proves that direct import is the only supported API. In that case Pi's own isolation rule would require bundling it, which should be treated as a design escalation, not a default.

### 2.3 Proposed overlay layout/inventory

**Recommendation — high confidence for shape, medium for exact command mapping.** A Pi overlay should approximately declare:

```text
layout
  common/skills             -> skills/                         whole_file tree
  common/runtime closure    -> orchestrator-framework/...      whole_file tree
  assets/package.json       -> package.json                    whole_file file
  assets/extensions         -> extensions/                     whole_file tree
  generated command view    -> prompts/                        whole_file tree
  generated role projection -> agents/                         canonical projection outputs

inventory.required
  package.json
  extensions/maister.ts
  skills/**/SKILL.md
  agents/maister-*.md
  orchestrator-framework/bin/gate-evaluator.mjs

inventory.optional
  prompts/maister-*.md

inventory.forbidden
  .codex-plugin/**
  .cursor-plugin/**
  steering/**
  rules/**
  agents not matching the declared Pi projection/support inventory
  checked-in duplicate canonical role bodies outside generated projection
```

Pi command behavior must be mapped deliberately: Pi loads prompt templates and skill commands, while extension commands are runtime registration. A command should not be copied into `prompts/` merely because it is Markdown; the projection must state whether it is a skill, prompt template, or extension-registered command.

## 3. Ownership Boundary

| Path/state | Recommended owner | Mechanism | Install/update/uninstall behavior | Confidence |
|---|---|---|---|---|
| `~/.pi/agent/maister/**` | Maister | `plugin_private`, `whole_tree` | Replace transactionally; receipt hashes every managed entry; remove whole owned tree on uninstall after drift check | High |
| `~/.pi/agent/settings.json` as a file | Operator/Pi | Shared file | Never claim whole-file ownership; snapshot exact bytes/mode for rollback only | High |
| Exact local package membership `./maister` in `packages` | Maister | New identity-aware managed array entry | Add/update/remove only the matching resolved local-package identity; preserve order and all unrelated entries; refuse drift/collision | High |
| Other `packages` members | Operator/Pi | Unmanaged | Preserve byte-semantic JSON values and ordering; never update/remove | High |
| `~/.pi/agent/npm/**` | Pi/operator | Unmanaged prerequisite storage | Read-only prerequisite/version discovery; no Maister cleanup | High |
| Installed `pi-subagents` files and settings entry | Operator/Pi | Unmanaged external prerequisite | Verify only; missing/incompatible becomes unavailable/blocked; never bundle/update/remove | High |
| `~/.pi/agent/extensions/**`, `skills/**`, `prompts/**` outside private root | Operator/Pi | Unmanaged | No Maister leaves in recommended design; collision discovery only | Medium-high |
| Pi executable/global npm installation | Operator/toolchain manager | Unmanaged | Resolve actual executable, version, and package root; never mutate | High |
| `$XDG_STATE_HOME/maister/pi/**` | Maister | Private transaction state | Lock/journals/backups/receipts/staging, modes 0700/0600, preserve unresolved failures | High |
| Project `.pi/**` | Project/operator | Unmanaged by default | No default installation; future project-scope mode must be explicit and trust-aware | Medium-high |
| Pi sessions, auth, trust, model/provider settings | Operator/Pi | Unmanaged sensitive state | Never read beyond prerequisite metadata; never include in backups, archives, receipts, or logs | High |

## 4. Required Installer and Receipt Deltas

### 4.1 Target and path model

**Fact — high confidence.** Maister target definitions provide a private active root and optional additional `leaf_set` roots; state is separately rooted at `$XDG_STATE_HOME/maister/<target>` (`targets.mjs:5-40`; `target-paths.mjs:20-45`). Candidate inventory is routed to roots in `transaction-manager.mjs:527-556`, currently with Kiro-specific routing.

**Recommendation — high confidence.** Pi needs only `plugin_private = .pi/agent/maister` if settings activation is implemented safely. This avoids new leaf-set routing and scattered native files. Add no shared extensions/skills/prompts managed roots unless Pi proves local packages cannot satisfy discovery.

### 4.2 Identity-aware array ownership

**Fact — high confidence.** Current overlay settings support only `whole_file` or `managed_keys` (`overlay-loader.mjs:15-17,217-260`). `settings-owner.mjs:95-112` maps recognized dotted keys to fixed values and maps every unknown key to boolean `true`; JSON merge replaces the entire dotted value (`settings-owner.mjs:41-57,115-151`). Therefore declaring `managed_keys: [packages]` would overwrite the operator's package array with `true` and is invalid for Pi.

**Recommendation — high confidence.** Introduce a closed settings ownership form such as:

```yaml
settings:
  - path: .pi/agent/settings.json
    format: json
    ownership: managed_array_entries
    array_path: packages
    identity: pi_local_package_v1
    entries:
      - source: ./maister
    merge_policy: preserve_unmanaged_refuse_drift
```

The selector must normalize local package identity exactly as Pi does: resolve relative to `~/.pi/agent`, then compare absolute path. It must treat string `"./maister"` and object `{ "source": "./maister", ...filters }` as the same identity; duplicate identity or an operator-owned conflicting object fails closed.

Receipt schema v2 can either add a typed `managed_entries` block per setting or require schema v3. It must record array path, normalized identity, exact installed entry, before/after file hashes and modes, backup reference, and merge algorithm version. Drift verification compares only the owned normalized member while ensuring the rest is preserved during each mutation.

### 4.3 Lifecycle sequence

**Fact — high confidence.** Existing install/update resolves one immutable source, selects its overlay from the same root, materializes into empty same-filesystem staging, validates candidate inventory/hashes/references, snapshots all managed roots/settings/active receipt, commits roots and settings, verifies integrity, records E4, and publishes a receipt. Journals have explicit prepared→staged→snapshotted→committing→committed→verified states (`journal-schema.mjs:8-23`; `transaction-manager.mjs`, `executeLifecycle()` and commit helpers).

**Recommendation — high confidence.** Reuse this sequence unchanged around Pi-specific content:

1. Resolve and revalidate local/archive/GitHub source and the Pi overlay from that source.
2. Probe the actual `pi` executable and `pi-subagents` package/config identity read-only; attach observations to evidence, not candidate bytes.
3. Materialize the complete private Pi package and generated role projection in isolated staging.
4. Preflight: refuse an unmanaged existing `.pi/agent/maister`, settings identity collision, unsafe symlink, wrong package manifest, or incompatible target version.
5. Snapshot private root, settings file bytes/mode, and active receipt.
6. Atomically replace the private root, then merge exactly the local package array member through the new ownership primitive.
7. Verify every receipt-owned byte/mode/link plus package membership; optionally run isolated Pi discovery as E5 without modifying settings again.
8. Publish receipt only after integrity and E4 succeed.

Update repeats drift checks and preserves the previous receipt. Uninstall removes the exact managed package member and private tree only after both remain receipt-consistent. Rollback/recovery restore settings bytes, mode, tree topology, and prior active receipt exactly.

**Fact — high confidence.** Existing code already rejects unmanaged destination collisions, verifies root inventory at mutation boundaries, commits a `whole_tree` through replacement/displacement renames, writes settings through fsync+temporary+rename, and snapshots/restores roots and settings (`transaction-manager.mjs:558-758`; `settings-owner.mjs:197-241`; `recovery.mjs:318-365`). The new array primitive should reuse these boundaries rather than call Pi's package manager.

## 5. Version and Prerequisite Policy

### Structural install

**Recommendation — high confidence.** Require:

- supported OS/filesystem and Node satisfying the package's active engine bound (currently `>=22.19.0`);
- resolvable `pi` executable with a parsed semver and package identity;
- no unmanaged collision at the private root or managed settings identity;
- valid Pi overlay/materialization E1/E2, portable core E3, and transactional E4.

Structural installation may complete provisionally when native prerequisites are unavailable only if the release policy explicitly permits unavailable E5/E6, matching Maister's current evidence model. It must not claim native semantic support.

### Native delegation prerequisite

**Recommendation — high confidence.** Resolve `pi-subagents` through Pi's configured package list and installed path, not by scanning arbitrary `node_modules`. Require one unambiguous configured package identity, readable package manifest, verified supported version, and Pi discovery of the extension. Do not infer activation merely because the directory exists.

The initial verified compatibility tuple is Pi CLI 0.80.10 + `pi-subagents` 0.35.1 + scenario version to be defined by the native-runtime report. The extension's development peers are 0.80.10, which now match the active executable; its wildcard optional peers are not a compatibility guarantee (`pi-subagents/package.json:61-97`).

Unpinned `npm:pi-subagents` can change under `pi update --extensions`; every update must stale E5/E6 until the scenario is rerun. A future supported range should be evidence-derived, not assumed from `*` peer declarations.

### Failure classification

| Condition | Required outcome |
|---|---|
| `pi` missing/unparseable/unsupported | Structural prerequisite error or E5/E6 `unavailable`; never passed |
| Multiple/mismatched Pi installations | Block with resolved executable/package diagnostics |
| `pi-subagents` absent from configured packages | Native E5/E6 `unavailable`; Maister must not auto-install silently |
| Package directory exists but not configured/loaded | `unavailable`, because presence is not discovery |
| Version outside tested tuple/range | `unavailable` or policy-blocked pending fresh evidence |
| Settings package identity collision | `E_DRIFT_CONFLICT`, no mutation |
| Private root exists without receipt ownership | `E_DRIFT_CONFLICT`, no mutation |
| Project trust required in future project mode | Explicit blocked/unavailable; no trust prompt in non-interactive transaction |

## 6. Deterministic Packaging and Provenance

**Fact — high confidence.** Current release staging copies canonical common/lib/bin/skills/agents/commands, the selected target overlay assets, and contract-only descriptors for the other targets; it rejects foreign target assets and legacy behavior trees (`release-interface.mjs:80-169`). Release tests require sorted deterministic archives, full runtime closure, selected-target isolation, E3 binding, and extracted install/verify/uninstall (`release-package.test.mjs:248-325`).

**Recommendation — high confidence.** For Pi:

- include `overlays/pi/{overlay.yml,inventory.yml}` descriptors in every target archive;
- include `overlays/pi/assets/**` only in the Pi archive;
- include canonical role/skill/command sources and generate Pi projections during materialization, not during source editing;
- canonicalize generated `package.json` JSON, LF endings, modes, paths, and entry order;
- bind Pi projection digest, package-manifest digest, overlay hash, materialized tree hash, source commit/version, and E3 digest into provenance/receipt;
- record external prerequisites as declared/evidence-bound components: Pi executable package/version and `pi-subagents` name/version/integrity/configured identity;
- do not embed active user settings, sessions, credentials, trust state, provider/model config, or the operator's `pi-subagents` tree;
- extend SBOM/provenance limitation text to distinguish archive-contained components from observed external runtime prerequisites.

**Inference — high confidence.** A local Pi package makes the released Maister archive deterministic even though active Pi/npm state is not. The archive contains the exact Maister package bytes; E5/E6 separately bind the external host/extension tuple.

The historical parity gate issue identified in `01-maister-core-contract.md` remains: Pi must use a greenfield admission matrix, while the immutable legacy oracle remains scoped to Codex/Cursor/Kiro.

## 7. Empirical Safety and Distribution Checks

### Probe DI-1 — installed Pi package reality check

- **Commands:** `rtk pi --version`; `rtk which pi`; `rtk ls -l "$(command -v pi)"`; `rtk npm ls -g --depth=0 @earendil-works/pi-coding-agent`; `rtk pi list`.
- **Captured:** `2026-07-19T12:42:27Z` UTC, exit 0 for all commands.
- **Result:** active Pi 0.80.10 from the mise Node 25.9.0 global installation; eight configured user packages; `npm:pi-subagents` resolved to its managed user npm path. No project package was added and active settings were not modified.
- **Conclusion:** executable resolution and configured-package identity must outrank stray package copies. **Confidence: high.**

### Probe DI-2 — path, collision, staging, settings, and rollback behavior

- **Command:** `rtk node --test --test-name-pattern='materializes identical|path containment|normalized destination collisions|staging-root symlink|symlinked staging parent|staging parent when it is swapped|managed-key settings preserve|failure during commit restores exact|symlink escapes at target' tests/platform-independent/source-materializer.test.mjs tests/platform-independent/installer-transaction.test.mjs`
- **Isolation:** existing suites created temporary source/home/state/staging roots; no active Pi or Maister installation was targeted.
- **Result:** exit 0; 9 selected tests passed. Verified deterministic identical materialization, containment/symlink rejection, normalized collision rejection, staging-parent revalidation, unrelated-setting preservation and owned-setting drift refusal, exact rollback of bytes/modes/links, and target/state/settings/staging symlink boundaries.
- **Side effects:** temporary fixtures only; tracked production source status unchanged.
- **Conclusion:** existing primitives are suitable for Pi private-root staging, but array-member ownership still needs its own tests and implementation. **Confidence: high.**

### Probe DI-3 — extension package dry-run inventory

- **Command:** `rtk npm pack --dry-run --json --ignore-scripts` in `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents`.
- **Result:** exit 0; version 0.35.1, 147 entries, unpacked size 2,383,571 bytes, no bundled dependencies, published agents/prompts/skill/source/API files, integrity recorded above. No tarball was written because this was a dry run.
- **Conclusion:** bundling the installed extension would materially duplicate a separately versioned package and expand Maister ownership; prerequisite verification is preferable. **Confidence: high.**

## 8. Acceptance Criteria for the Distribution Slice

1. A clean Pi install from local checkout, extracted archive, and injected GitHub checkout produces byte-identical private package content and equivalent receipts.
2. Existing operator packages/settings survive install, update, failed commit, rollback, recovery, and uninstall; only the normalized `./maister` identity changes.
3. Duplicate string/object forms of the same local package identity fail before mutation.
4. Unmanaged private root, symlinked parents/leaves, case/Unicode-normalized collisions, unsafe manifest paths, and foreign target assets fail closed.
5. Pi discovers exactly the staged extension/skills/prompts and the bridge discovers all 28 generated agent identities without checked-in behavior copies.
6. Missing or incompatible `pi-subagents` never causes silent installation, bundling, deletion, or native-pass evidence.
7. Update/uninstall refuse drift in either private bytes or owned package membership and preserve the journal/backups for recovery.
8. Two Pi archives built with identical source epoch/commit/version/E3 input have identical hashes; extracted lifecycle passes in an isolated home/state root.
9. Receipts and release provenance bind the active Pi executable/package identity, `pi-subagents` configured identity/version/integrity, projection digest, source/overlay/materialized hashes, and evidence scenario/freshness.

## 9. Confidence Summary

- **High-confidence facts:** Pi scope/layout/settings rules, active executable 0.80.10, configured `pi-subagents` 0.35.1, package isolation, existing Maister transaction/path/provenance behavior, and the inability of current `managed_keys` to own an array member.
- **High-confidence recommendations:** private local package root; one identity-aware package entry; no Pi package-manager mutation inside the transaction; operator-owned external `pi-subagents`; deterministic target archive and evidence-bound prerequisite tuple.
- **Medium-confidence design details:** exact `package.json` name, prompt-versus-skill command mapping, and package-private agent descriptor layout pending the Pi host/native-runtime synthesis.
- **Low-confidence/blocked detail:** direct import/event-bus/RPC integration mechanism between the Maister bridge and `pi-subagents`; this must be taken from the dedicated native-runtime finding before implementation.
