# Phase 2 Scope Clarifications — GitHub-Only Distribution

## TL;DR

The user replaced public npmjs publication with direct acquisition from the GitHub repository at an exact tag or full commit.
GitHub Release archives remain the verified payloads, and `maister-install.mjs` remains the only host-state mutation authority.
Public operation is anonymous; private operation separates npm/Git credentials from optional GitHub API credentials for metadata/assets.
Prior terminal transaction, crash/multi-journal, archive-memory, and protected transport-smoke gaps remain mandatory acceptance work.

## Key Decisions

- No npmjs publication, package registry version, dist-tag, `latest`, registry promotion, or external registry mutation.
- Root package is installable/executable from Git and protected with `private: true`; npmjs may be used only to fetch the exact locked `tar@7.5.20` third-party dependency.
- Supported package refs are exact `#vX.Y.Z` tags and full 40-hex commits. Branches, default branch, moving latest refs, and semver ranges are out of scope.
- Public repositories and Releases work without authentication.
- Private Git package acquisition uses operator-managed Git credentials. The launcher does not read those credentials and tokens must not appear in Git URLs.
- Private release metadata/assets use optional GitHub API authentication. Authorization is sent only to `api.github.com`; assets use the API asset URL with `Accept: application/octet-stream`; authorization is stripped on cross-host redirects.
- GitHub API credential precedence is `GH_TOKEN` → `GITHUB_TOKEN` → bounded non-shell `gh auth token --hostname github.com` → anonymous access.
- GitHub Release archives and their sidecars/source/E3 evidence remain payload authority.
- `plugins/maister/bin/maister-install.mjs` and receipt-bound installed control planes remain lifecycle/mutation authority.
- Advisors are disabled for this scope revision; every recorded decision below is the user's decision or an analyzer-identified unresolved implementation choice.

## Open Questions / Risks

- The selected `gh auth` fallback introduces a GitHub CLI runtime prerequisite only for private users who do not provide an environment token; public operation remains anonymous.
- Exact tags can be force-moved unless repository protection and release CI enforce immutability; full commits remain the stronger acquisition pin.
- Protected private smoke needs a controlled private repository/release boundary in addition to public no-auth coverage.
- Aggregate transaction completion, abrupt crash recovery, multiple unresolved journals, and bounded archive memory are unresolved release blockers.

## Superseded Scope

The old public npm package plan is superseded. References in the prior spec, plan, implementation, and reports to `@mateuszrapacz/maister@<version>`, `@latest`, npm scope ownership, `NPM_TOKEN`, `npm publish`, `npm view`, registry propagation, dist-tags, exact npm publication, and latest promotion are historical only and must not drive the revised implementation.

`npm` remains in the user journey solely as the local client that acquires a Git package and runs its binary. This does not authorize package-registry publication or registry-backed runtime dependencies.

## Accepted Invocation Boundary

```sh
# Public exact tag
npm exec --yes --package='github:mateuszrapacz/maister#v2.2.1' -- maister install --target codex

# Public exact full commit
npm exec --yes --package='github:mateuszrapacz/maister#<40-hex-commit>' -- maister verify --target cursor --json

# Private exact full commit using existing Git SSH credentials
npm exec --yes --package='git+ssh://git@github.com/mateuszrapacz/maister.git#<40-hex-commit>' -- maister install --target kiro-cli
```

Equivalent exact-ref `npm install` usage is in scope. Tokens in Git/package URLs are not.

## Credential Clarification

The accepted separation is:

1. npm invokes Git; Git credentials acquire repository/package bytes.
2. The launcher independently resolves optional GitHub API credentials for exact Release metadata and assets.
3. The launcher sends that credential only to `api.github.com`.
4. Asset requests use `/repos/mateuszrapacz/maister/releases/assets/<id>` plus `Accept: application/octet-stream`.
5. A redirect may carry the request to an allowlisted asset host, but the authorization header is removed before following it.
6. No credential or authorization value appears in URLs, argv, logs, JSON diagnostics, thrown error details, retained roots, or CI evidence.
7. No credential is required or emitted for the public path.

Analyzer recommendation: use `GH_TOKEN` → `GITHUB_TOKEN` → optional bounded `gh auth token --hostname github.com` → anonymous. The `gh auth` fallback is still an important implementation decision because it introduces a runtime CLI dependency; the security boundary is fixed regardless of which option is selected.

## CI and Package Clarification

The revised release workflow retains deterministic builds, parity/E3 gates, three archives, sidecars, GitHub Release publication, public-byte verification, and exact candidate evidence. It removes registry URL setup, `NPM_TOKEN`, npm packing for publication, publish/view/dist-tag steps, propagation polling, registry smoke, and registry publication states.

CI must add:

- `package.json` checks for `private: true`, no `publishConfig`, and no registry runtime dependency path;
- public exact-tag and full-commit direct-Git acquisition with all auth variables unset;
- authenticated private Git acquisition plus authenticated exact Release metadata/assets in a protected environment;
- static and runtime proof of no Maister publication or external registry mutation; read-only acquisition of the exact locked third-party dependency remains allowed;
- exact package-ref/tag/commit/Release/source/E3 identity evidence;
- terminal aggregate transaction, abrupt-crash, multiple-journal, and bounded-memory acceptance gates.

## Mandatory Acceptance Carry-Forward

- Aggregate installer transaction suite reaches an explicit terminal result.
- Abrupt-crash recovery tests cover every durable transaction/control-plane boundary.
- Multiple unresolved journal recovery selects only the explicit journal and preserves all others.
- Archive memory is measured and bounded at near-limit/high-ratio inputs, or archive processing is made streaming with equivalent evidence.
- Authenticated private GitHub transport covers token sources, redaction, API asset octet-stream requests, 200/302 behavior, and cross-host auth stripping.
- Protected private release smoke exercises exact Git acquisition and exact private Release assets.
- Public no-auth transport smoke exercises exact tag and full commit and proves no authorization header.
- No external package registry is mutated and no publish/dist-tag credential or command remains; read-only acquisition of `tar@7.5.20` is explicitly permitted.

## Decision Record

| Decision | Status | Actor |
| --- | --- | --- |
| Remove npmjs/package registry publication | Decided: remove | user |
| Repository visibility | Decided: support public and private | user |
| Package acquisition selector | Decided: exact Git tag or full commit | user |
| Payload authority | Decided: exact GitHub Release archives and sidecars | user |
| Mutation authority | Decided: `maister-install.mjs` only | user |
| Public credential behavior | Decided: no auth required or emitted | user |
| Private credential separation | Decided: Git credentials for npm acquisition; API credentials only for GitHub API metadata/assets | user |
| Archive runtime closure | Decided: keep exact locked `tar@7.5.20` as a normal dependency | user |
| `gh auth` fallback | Decided: use after `GH_TOKEN` and `GITHUB_TOKEN`, then anonymous | user |

## decisions_needed

### critical

No unresolved critical decisions. The user selected option 3: retain `tar@7.5.20` as a normal dependency and permit its read-only acquisition from npmjs.

### important

No unresolved important decisions. The user selected bounded `gh auth token --hostname github.com` fallback after environment-token lookup.

## Task Characteristics

```yaml
task_characteristics:
  has_reproducible_defect: true
  modifies_existing_code: true
  creates_new_entities: true
  involves_data_operations: true
  ui_heavy: false
risk_level: high
```

The current implementation has reproducible conflicts with the revised scope, changes existing package/launcher/CI behavior, adds credential and direct-Git test entities, handles network/archive/filesystem/transaction data, and has no UI component.
