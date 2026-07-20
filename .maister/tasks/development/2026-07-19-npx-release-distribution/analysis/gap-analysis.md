# Phase 2 Gap Analysis — GitHub-Only Release Distribution

## TL;DR

The approved scope no longer publishes to npmjs or any package registry: npm is only the local Git-package acquisition/execution client, pinned to an exact Git tag or full commit.
The current launcher/installer seam remains useful, but package metadata, the release workflow, direct-Git acquisition tests, and private GitHub authentication do not yet satisfy that boundary.
GitHub Release archives and `plugins/maister/bin/maister-install.mjs` remain the payload and mutation authorities; public access must work anonymously and private access must split Git credentials from GitHub API credentials.
Risk remains high. Prior non-terminal transaction verification, crash/multi-journal recovery, archive-memory evidence, and protected public/private transport smokes are mandatory acceptance work, not follow-ups.

## Key Decisions

- **Supersedes the old npmjs scope:** do not publish `@mateuszrapacz/maister`, do not use registry versions/dist-tags/`latest`, and do not mutate an external package registry.
- Acquire and execute the launcher directly from `mateuszrapacz/maister` with an exact `#vX.Y.Z` tag or full 40-hex commit through `npm exec`/`npm install`; branches, default-branch resolution, semver ranges, and moving selectors are outside scope.
- Support both public and private repositories. Public Git/package and GitHub Release acquisition must work with no credentials.
- For private repositories, npm's Git clone uses the operator's Git credential path (SSH agent/key or HTTPS credential helper). Release metadata/assets use a separate GitHub API credential path.
- Keep deterministic GitHub Release archives as payload authority and `plugins/maister/bin/maister-install.mjs` as the sole host-state mutation authority.
- Keep the receipt-bound installed control plane for state-only lifecycle commands; these commands remain source-free and launcher-network-free after package acquisition.
- Protect the repository package with `"private": true`; remove `publishConfig`, npm publication, dist-tag promotion, registry observation, and registry credentials from CI.
- Keep `tar@7.5.20` as a vetted third-party runtime dependency fetched from npmjs; this is dependency acquisition only and does not publish Maister outside GitHub.
- Resolve GitHub API credentials in the order `GH_TOKEN` → `GITHUB_TOKEN` → bounded non-shell `gh auth token --hostname github.com` → anonymous access.

## Open Questions / Risks

- The selected `gh auth` fallback must never place or print the token in argv, URLs, diagnostics, retained artifacts, or CI evidence.
- A Git tag is exact by name but can be force-moved; protected immutable release tags and CI verification that the tag resolves to the Release sidecar commit are required. A full commit is the stronger caller pin.
- Whole-buffer archive handling is bounded by configured byte limits but still lacks measured peak-memory evidence at the accepted limits.
- The aggregate installer transaction suite has never produced a terminal final-tree result; abrupt crashes and multiple unresolved journals remain unproved.
- Public and private protected release smokes require real GitHub repository/release boundaries. A public repository cannot itself prove the private path, so CI needs a protected private fixture/repository or an equivalent separately controlled integration target.

## Superseded Baseline

The prior specification, plan, implementation, and reports assumed a public npm package named `@mateuszrapacz/maister`, exact registry versions, a staging dist-tag, a public npx smoke, and eventual `latest` promotion. Those assumptions are historical evidence only and are superseded by this analysis.

Useful work from that implementation remains in scope:

- the closed command/target launcher contract;
- bounded GitHub transport and fixed repository/asset mapping;
- release sidecar, archive, source-manifest, and E3 validation;
- private extraction and exact-root cleanup;
- non-shell delegation and child result forwarding;
- receipt-bound offline control planes and exact journal recovery selection;
- deterministic three-target GitHub Release packaging and public-byte comparison.

The following existing work is specifically obsolete:

- `publishConfig.access`, registry package visibility, npm ownership, `NPM_TOKEN`, trusted npm publishing, `npm publish`, `npm view`, npm dist-tags, propagation polling, `NPM_EXACT_PUBLISHED`, and `LATEST_PROMOTED`;
- registry package selectors such as `@mateuszrapacz/maister@2.2.1` and `@latest`;
- publication recovery or patch-forward logic whose only purpose is reconciling npmjs with GitHub;
- acceptance claims based on `npm publish --dry-run` or a registry-backed npx smoke.

## Current State

### Direct-Git package boundary

- Root `package.json` already defines one ESM `maister` binary and Node `>=22`, but it is publishable, contains `publishConfig.access: public`, and does not set `private: true`.
- The package has a production dependency on `tar@7.5.20`. The user explicitly permits npmjs acquisition of this vetted third-party dependency; Maister itself remains GitHub-only.
- `lib/launcher/package-contract.mjs` derives release identity from the root package version. That can continue to select `v<package version>`, but CI must prove that each accepted exact tag/full-commit package source corresponds to the same Release source commit and version.
- Existing package-boundary tests inspect npm pack behavior. They do not execute `npm exec --package=<exact-git-spec> -- maister ...` or `npm install <exact-git-spec>` with registry access disabled/observed.

Official npm documentation confirms that Git specs accept `#<commit-ish>` and that an exact commit-ish is cloned exactly. `npm exec --package=<package-spec> -- <cmd>` installs the package into npm's cache and places its bin on `PATH`. See [npm install Git package specs](https://docs.npmjs.com/cli/install/) and [npm exec](https://docs.npmjs.com/cli/v11/commands/npm-exec/).

### GitHub Release acquisition

- `lib/launcher/orchestrator.mjs` calls the exact release-tag API and adds only `GITHUB_TOKEN` when present. It does not accept `GH_TOKEN` and does not use an existing `gh auth` session.
- The API credential is currently attached to release metadata only. Sidecars and the selected archive are downloaded from `browser_download_url` without API authentication, so private Release assets are unsupported.
- `release-transport.mjs` already strips `Authorization` on a cross-host redirect and allowlists GitHub asset hosts. That behavior should be retained.
- GitHub's supported private-asset path is `GET /repos/{owner}/{repo}/releases/assets/{asset_id}` with `Accept: application/octet-stream`; GitHub may return `200` or `302`, and public resources may use the endpoint without authentication. Fine-grained tokens require repository Contents read permission. See [GitHub REST release asset documentation](https://docs.github.com/en/rest/releases/assets).

### Installer and verification

- `maister-install.mjs` remains the only writer of target files, receipts, journals, backups, settings, and receipt-bound control planes. No new launcher mutation authority is required.
- Focused launcher, clean lifecycle, recovery, journal-selection, and acquisition-abort checks passed in prior reports. These are retained evidence, not complete acceptance.
- `verification/implementation-verification.md` and `verification/reality-check.md` explicitly record no terminal aggregate installer transaction result, no abrupt-kill matrix, no simultaneous unresolved-journal test, and no bounded archive peak-memory evidence.
- Prior protected/public smoke was registry-oriented and was not executed. It does not establish direct-Git public acquisition or authenticated private GitHub Release transport.

## Desired State

The supported install/update chain is:

```text
exact Git tag or full commit package spec
  -> npm exec/npm install invokes Git (no registry package selector)
  -> Git acquires the repository package using public access or operator Git credentials
  -> launcher resolves exact GitHub Release metadata for package version
  -> anonymous or authenticated GitHub API returns allowlisted Release assets
  -> launcher verifies sidecars/archive/source commit/E3 and extracts privately
  -> packaged maister-install.mjs delegates the lifecycle transaction
```

Representative public invocations are:

```sh
npm exec --yes --package='github:mateuszrapacz/maister#v2.2.1' -- maister install --target codex
npm exec --yes --package='github:mateuszrapacz/maister#<40-hex-commit>' -- maister update --target cursor
```

Private acquisition uses an exact full Git URL compatible with the operator's configured Git transport, for example an exact `git+ssh://git@github.com/mateuszrapacz/maister.git#<40-hex-commit>` spec. Tokens embedded in Git URLs are prohibited. The package spec is an acquisition argument, not a new launcher CLI option.

State-only commands (`status`, `verify`, `uninstall`, `rollback`, `recover`) continue to delegate to the active receipt-bound installed control plane with no GitHub API/archive request by the launcher. npm may need its local cache or Git access to acquire the launcher package before it starts; that acquisition boundary is distinct and must be documented.

## Credential Boundary for Private Repositories and Releases

Credential responsibilities must stay separate:

| Boundary | Credential source | Credential destination | Required behavior |
| --- | --- | --- | --- |
| npm acquires Git package | Existing Git credentials: SSH agent/key or HTTPS credential helper/askpass | Git/GitHub clone transport selected by the exact package spec | Launcher does not read, translate, or log Git credentials; no token in package URL. |
| Launcher reads release metadata | `GH_TOKEN`, then `GITHUB_TOKEN`, then optionally the active `gh auth` token | `https://api.github.com/repos/mateuszrapacz/maister/releases/tags/v<version>` only | Omit auth for public use; redact all credential material; fail with an actionable private-access error on 404/401/403 without revealing token state. |
| Launcher downloads sidecars/archive | Same in-memory GitHub API credential | `https://api.github.com/repos/mateuszrapacz/maister/releases/assets/<asset-id>` with `Accept: application/octet-stream` | Accept `200` or bounded `302`; strip `Authorization` before every cross-host redirect; never reattach it to `github.com` or `*.githubusercontent.com`. |
| Installed lifecycle authority | No acquisition credential | Local receipt-bound control plane | No Git, GitHub API, or registry access after launcher start for state-only commands. |

Recommended precedence is `GH_TOKEN` → `GITHUB_TOKEN` → `gh auth token --hostname github.com` → anonymous. This matches GitHub CLI environment precedence and supports headless CI plus an existing interactive login. The `gh` fallback must use non-shell spawn with fixed argv, capture only bounded stdout, accept one token line, keep it in memory, and replace any child failure with a credential-source diagnostic. It must not pass a token on argv or persist subprocess output. See [GitHub CLI environment precedence](https://cli.github.com/manual/gh_help_environment) and [`gh auth token`](https://cli.github.com/manual/gh_auth_token).

Only GitHub API requests receive API authorization. Redirect targets receive no authorization header even when they are allowlisted content hosts. Redirects back to `api.github.com` must be revalidated against the API route policy rather than inheriting credentials generically.

## Gap Matrix

| Capability | Current state | GitHub-only gap | Required change surface |
| --- | --- | --- | --- |
| Package protection | Publishable package with `publishConfig.access: public` | Accidental registry publication remains possible | Set `private: true`; remove `publishConfig`; validate both conditions in package-boundary tests. |
| Direct-Git execution | Registry package commands and pack tests | No exact tag/full-commit `npm exec` or `npm install` contract/proof | Replace docs/tests/smoke commands with explicit Git package specs; reject moving selectors in release instructions. |
| Dependency acquisition | Production dependency `tar@7.5.20` | Third-party npmjs access is allowed but must not be confused with Maister publication | Keep the exact pinned dependency and lock integrity; prohibit publish/dist-tag operations and Maister registry credentials. |
| Package/release identity | Package version selects `v<version>` | Exact package ref is not yet proven to match Release sidecar source commit | Protected tag/commit smoke must compare package version, tag target, sidecar full commit, embedded source manifest, and E3. |
| Public GitHub transport | Anonymous API metadata and browser asset downloads generally work | No explicit zero-auth integration proof through API asset endpoints | Use API asset URLs for both modes; run a public no-auth exact-tag/full-commit transport test. |
| Private Git acquisition | Delegated implicitly to npm/Git | No documented/tested SSH/HTTPS credential boundary | Test exact private Git package acquisition with configured Git credentials and no token-bearing URL. |
| Private release metadata | Only `GITHUB_TOKEN` on metadata call | No `GH_TOKEN`, `gh auth`, precedence, redaction, or failure matrix | Add a bounded credential provider and authenticated metadata tests. |
| Private release assets | Browser URLs fetched without auth | Private sidecars/archive cannot be downloaded reliably | Select API asset `url`/ID, request octet-stream with API auth, accept 200/302, strip auth cross-host. |
| CI release state | GitHub plus npm publish/dist-tag state machine | Registry mutation and registry coupling violate scope | Delete npm publication/promotion/observation; retain GitHub build, upload, public-byte verification, and evidence. |
| Transaction evidence | Focused scenarios pass | Aggregate suite non-terminal; crash/multi-journal gaps | Add bounded progress/timeout diagnostics and mandatory terminal acceptance runs. |
| Archive resources | Byte caps and whole-buffer validation | No measured safe peak-memory bound | Stream or produce measured bounded-memory evidence at near-limit/high-ratio inputs across supported OSes. |
| Protected smoke | Registry smoke designed but unexecuted | No public direct-Git or private authenticated end-to-end proof | Add public no-auth and protected private Git/API/Release smoke with exact refs. |
| Registry safety | Historical npm publish dry-runs and token wiring | No prohibition test | Add static/runtime CI assertions that no publish/dist-tag command or registry credential exists and no external registry is mutated. |

## Integration Points

1. Root `package.json`, `package-lock.json`, and `lib/launcher/verify-package-boundary.mjs`: package protection, runtime dependency closure, exact Git-package installability, and zero-registry assertions.
2. `bin/maister.mjs` and `lib/launcher/package-contract.mjs`: preserve the single binary and derive the exact Release version without introducing branch/latest selectors.
3. `lib/launcher/orchestrator.mjs`: credential selection, exact release metadata, API asset endpoint selection, and source/tag/commit binding.
4. `lib/launcher/release-transport.mjs`: API-only authorization, 200/302 octet-stream handling, redirect credential stripping, bounds, retry behavior, and secret-safe diagnostics.
5. `lib/launcher/release-contract.mjs`: fixed repository, exact asset IDs/names, package-version/tag/source-commit agreement, and public/private response validation.
6. `lib/launcher/archive-port.mjs`: registry-free archive implementation plus bounded-memory evidence while retaining fail-closed inspection/extraction.
7. `plugins/maister/bin/maister-install.mjs`, receipt/journal/recovery modules, and target paths: unchanged mutation authority; complete terminal, abrupt-crash, and multi-journal recovery proof.
8. `.github/workflows/release.yml`: GitHub-only publishing, protected private smoke, public no-auth smoke, package/ref/release identity evidence, and absence of registry mutation.
9. `.github/workflows/validate-generated-variants.yml`: ensure launcher/package/auth/archive changes trigger validation before a release tag.
10. `README.md` and release/operator documentation: exact Git tag/full-commit commands, public/private credential split, offline boundary, unsigned evidence limitation, and removal of npmjs/latest language.

## Required Architecture Changes

1. **Protect the Git package from publication.** Set `private: true`, remove publication metadata, retain the exact pinned `tar` dependency and lock integrity, and distinguish dependency download from forbidden Maister publication.
2. **Replace registry identity with exact Git/Release identity.** The package version selects one `v<version>` Release; CI resolves the exact invocation tag/full commit and proves agreement with the release tag target, sidecar `source_commit`, embedded `.maister-source.json`, and E3.
3. **Add a credential provider with a narrow output.** Resolve optional GitHub API authorization from environment and, if selected, `gh auth`; return only a secret in memory or anonymous mode. Do not absorb Git clone credentials into this provider.
4. **Use one API asset path for public and private modes.** Download each selected Release asset by API asset ID with `Accept: application/octet-stream`; authorize only the API request and strip authorization on cross-host redirects.
5. **Retain the launcher/installer authority split.** The launcher reads/verifies/extracts/delegates; `maister-install.mjs` alone mutates host and installer state; receipt-bound control planes own offline state-only delegation.
6. **Simplify CI to GitHub-only release states.** A sufficient state sequence is `BUILT → GITHUB_PUBLISHED → GITHUB_VERIFIED → PUBLIC_NO_AUTH_SMOKE_VERIFIED → PROTECTED_PRIVATE_SMOKE_VERIFIED`. Each transition must be evidenced for the exact candidate commit; no npm registry state exists.
7. **Close prior verification gaps before release.** Instrument or split the aggregate transaction suite, add real abrupt-kill/multi-journal tests, and either stream archive processing or establish a measured memory ceiling compatible with supported hosts.

## Mandatory New Acceptance Work

The following are release-blocking and cannot be waived by prior focused passes:

1. **Aggregate transaction terminal result:** `tests/platform-independent/installer-transaction.test.mjs` must finish with an explicit pass/fail/timeout result on the exact candidate tree. Silence/interruption is unavailable evidence.
2. **Abrupt-crash recovery:** kill the installer process at every durable transaction/control-plane boundary and prove bytes, modes, links, topology, active receipt, backup, journal, staging, and control-plane outcomes.
3. **Multiple unresolved journals:** create simultaneous unresolved journals, prove default recovery fails closed or selects only the specified policy, and prove `--journal-id` recovers exactly one journal without touching the others.
4. **Bounded archive memory:** provide measured peak-memory evidence using near-limit and high-compression-ratio archives on supported OSes, or replace whole-buffer handling with streaming inspection/extraction and test the bound.
5. **Authenticated private GitHub transport:** test `GH_TOKEN`, `GITHUB_TOKEN`, optional `gh auth`, precedence, missing/invalid/insufficient credentials, redaction, API-only authorization, octet-stream asset download, direct 200, 302, and cross-host auth stripping.
6. **Protected private release smoke:** from a protected CI environment, acquire the exact private Git package using Git credentials, download exact private Release assets using GitHub API credentials, and run install/status/verify/uninstall in isolated roots for all targets selected by the release policy.
7. **Public no-auth transport test:** unset all GitHub/Git credential overrides, acquire exact public tag and full-commit package specs, fetch the exact public Release through the same API asset path, and prove no Authorization header was emitted.
8. **No external registry mutation:** fail CI if package metadata/workflows contain publish/dist-tag operations or registry publication credentials; permit only read-only acquisition of the exact locked third-party dependency and prove no publish, dist-tag, or other registry mutation.
9. **Exact identity evidence:** for tag and commit smokes, record package spec, resolved full commit, package version, Release tag, Release tag target, sidecar source commit, archive digest, and E3 digest without credentials.
10. **Existing safety matrix:** retain launcher CLI, transport bounds, hostile archive, zero-pre-delegation-mutation, cleanup, signal, child result, three-target lifecycle, and cross-platform tests; new credential handling must not weaken them.

## Task Characteristics

```yaml
task_characteristics:
  has_reproducible_defect: true
  modifies_existing_code: true
  creates_new_entities: true
  involves_data_operations: true
  ui_heavy: false
```

- `has_reproducible_defect: true`: the current tree reproducibly violates the approved boundary (`private` is absent, npm publication remains, the runtime archive dependency is registry-fetched, and private assets are fetched through unauthenticated browser URLs). The non-terminal aggregate suite is also a reproducible verification deficiency.
- `modifies_existing_code: true`: package metadata, launcher transport/orchestration, CI, tests, and documentation must change.
- `creates_new_entities: true`: a bounded credential provider, direct-Git/public-private fixtures, protected smoke evidence, and likely a vendored/self-contained archive closure or replacement are new entities.
- `involves_data_operations: true`: the feature downloads, hashes, inspects, extracts, journals, receipts, and cleans filesystem/network data under strict bounds.
- `ui_heavy: false`: there is no graphical interface or mockup requirement.

## Risk Level

```yaml
risk_level: high
```

The launcher processes repository code and hostile network bytes immediately before a transactional filesystem authority. Private support adds secret-handling and redirect boundaries; removing registry dependencies changes the archive trust/dependency boundary; and prior verification still lacks terminal crash/recovery and memory evidence. A defect can leak credentials, execute the wrong package/ref, fetch the wrong private asset, exhaust memory, select the wrong journal, or leave host state unresolved. Existing fail-closed checks reduce but do not eliminate this risk.

## decisions_needed

### critical

No unresolved critical decisions. The user selected normal `tar@7.5.20` dependency acquisition from npmjs while keeping Maister itself GitHub-only.

### important

No unresolved important decisions. The user selected `GH_TOKEN` → `GITHUB_TOKEN` → bounded `gh auth token --hostname github.com` → anonymous access.

All scope choices are resolved: no registry publication; public and private repository support; exact Git tag/full-commit specs; GitHub Release archives as payload authority; `maister-install.mjs` as mutation authority; exact `tar@7.5.20` dependency acquisition; and GitHub API credential precedence with `gh auth` fallback.
