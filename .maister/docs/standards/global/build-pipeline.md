## Build Pipeline

### Canonical Source and Reproducible Generated Variants
Treat `plugins/maister/` as the canonical editable plugin and put host-specific behavior in `platforms/`. Never directly edit `plugins/maister-cursor/`, `plugins/maister-kiro/`, or `plugins/maister-codex/`.

After changing canonical sources or adapters, run `make build`, inspect and validate the generated changes, and commit the matching generated variants. CI rebuilds the variants and applies `git diff --exit-code` to them, so any diff means the committed outputs do not reproduce from their sources. This preserves deterministic cross-host parity and prevents silent generated drift.

**Preferred:** Edit `plugins/maister/` and/or `platforms/`, run `make build`, inspect the generated diff, validate it, and commit the source, adapter, and generated outputs together.

**Avoid:** Patching a generated target directly; the next build will overwrite it and leave the canonical source inconsistent.

**Evidence:** `platforms/codex-cli/build.sh`, `platforms/cursor/build.sh`, `platforms/kiro-cli/build.sh`, `.github/workflows/validate-generated-variants.yml`, `CLAUDE.md`, `docs/codex-support.md`, and `docs/kiro-cli-support.md`.

### Build and Validate Every Platform Before Release
Before creating or pushing any `v*` release tag, run a fresh `make build && make validate` successfully. The aggregate build and validation gates must cover Cursor, Kiro, Codex, and shared contracts before GitHub Release creation. This prevents publishing stale, divergent, or invalid platform artifacts.

**Preferred:** Run `make build && make validate`, inspect the resulting outputs, and only then push the release tag.

**Avoid:** Creating or pushing a release tag after only a platform-specific build or test.

**Evidence:** `.github/workflows/release.yml`, `Makefile`, `docs/kiro-cli-support.md`, and `README.md`.
