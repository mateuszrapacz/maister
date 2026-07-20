# Finding 03: npm can provide the one-command launcher without owning plugin state

## TL;DR
The repository currently has no `package.json` or npm executable entrypoint, so npx support requires a new small package boundary.
The natural public package is `@mateuszrapacz/maister`, with a single `maister` binary and commands such as `install --target codex`.
`npx` already fetches a package into the npm cache and executes its `bin` command; it does not need to install Maister into the user's npm project.
The package should download the GitHub Release archive and delegate all target mutation to `maister-install.mjs`.

## Key Decisions
- Prefer the user-scoped package name `@mateuszrapacz/maister`; use the existing project name `maister` as its binary.
- Publish it as a public scoped package with `npm publish --access public` and a release-aligned version.
- Keep the package dependency-light and use Node built-ins where practical; do not put the full target archive into the npm package.

## Open Questions / Risks
- The package name is a product decision: `@mateuszrapacz/maister` is shorter, while `@mateuszrapacz/maister-cli` is more explicit.
- A `latest` npx command adds moving-version behavior; exact version support must be first-class.
- npm's package cache is execution infrastructure, not the Maister install state; the wrapper must not rely on cache contents after it exits.

## Evidence

### Current repository boundary

The repository has no root `package.json`, package lock, or npm `bin` entrypoint. Its JavaScript uses ESM and built-in Node modules, and its current developer/release entrypoints are `Makefile` targets and direct `node plugins/maister/bin/*.mjs` commands.

That makes the smallest npx addition a thin package directory or root package containing:

```text
package.json
bin/maister.mjs
```

The package's `bin` field should map the executable name `maister` to the launcher file. The launcher can locate its own package resources but should not assume the current working directory is the Maister repository.

### npm behavior

Official npm documentation states that `npx` is the npm-exec path for running a command from a local or remote npm package. If the requested package is not already available, npm fetches it into its cache and adds its executable to the command `PATH`; `--yes` suppresses the install confirmation prompt. See [npm exec / npx](https://docs.npmjs.com/cli/v11/commands/npm-exec/).

An npm package must contain `package.json` to be published. The `bin` field maps command names to executable files. See [npm package.json](https://docs.npmjs.com/files/package.json/) and [npm packages and modules](https://docs.npmjs.com/about-packages-and-modules/).

An npm user account receives a matching scope, so `@mateuszrapacz/maister` is the correct ownership namespace if the npm account is `mateuszrapacz`. Public scoped packages require `npm publish --access public` on first publication. See [npm scopes](https://docs.npmjs.com/about-scopes/) and [publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

### Recommended command surface

```text
npx --yes @mateuszrapacz/maister@latest install --target codex
npx --yes @mateuszrapacz/maister@2.2.1 install --target codex
npx --yes @mateuszrapacz/maister@latest update --target codex
npx --yes @mateuszrapacz/maister@latest status --target codex
npx --yes @mateuszrapacz/maister@latest verify --target codex
npx --yes @mateuszrapacz/maister@latest uninstall --target codex
```

The wrapper should forward lifecycle JSON and exit status from the existing installer. It should add only distribution metadata around the call: resolved version/tag, target, release asset, digest, temporary source root, and receipt/journal paths.

### Package responsibilities

The npm package should:

- parse `--target`, `--version`, and lifecycle commands;
- default `--version` to `latest` only if the user accepts moving release resolution;
- resolve an allowlisted asset name for the target;
- download the archive and verification files with bounded timeouts and size limits;
- validate archive path topology and digest;
- extract to a private temporary directory;
- invoke the packaged `maister-install.mjs` with `local:<root>` and the manifest commit;
- clean up temporary files in success and failure paths;
- print actionable errors and preserve the installer's JSON contract.

It should not:

- write `.codex`, `.cursor`, or `.kiro` files directly;
- own receipts, journals, backups, or managed settings;
- infer a different target after the user explicitly selected one;
- use a Git branch checkout as a release substitute;
- silently downgrade from a requested exact version.

### Node runtime

The release workflow uses Node 22. The wrapper can use Node's stable built-in `fetch` for downloads and `fs.mkdtemp` for private temporary roots; the official Node documentation records `fetch` as stable from Node 21 and available without the experimental flag from Node 18, and `fs.mkdtemp` creates a random temporary directory. See [Node globals](https://nodejs.org/api/globals.html) and [Node fs](https://nodejs.org/api/fs.html).

The package should declare an engine floor compatible with the existing runtime and test it on macOS/Linux/Windows if all hosts are supported cross-platform. The exact floor needs validation against the current syntax/runtime APIs before implementation.

## Sources

- `Makefile`
- `plugins/maister/bin/maister-install.mjs`
- `plugins/maister/lib/distribution/cli-contract.mjs`
- `plugins/maister/lib/distribution/targets.mjs`
- `.github/workflows/release.yml`
- [npm exec / npx](https://docs.npmjs.com/cli/v11/commands/npm-exec/)
- [npm package.json `bin`](https://docs.npmjs.com/files/package.json/)
- [npm scopes](https://docs.npmjs.com/about-scopes/)
- [Publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [Node.js globals](https://nodejs.org/api/globals.html)
- [Node.js fs](https://nodejs.org/api/fs.html)
