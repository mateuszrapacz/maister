## TL;DR

Scope is limited to a Codex plugin-only MVP and its repository integration.
The implementation includes native packaging, docs, structural validation, and generated output.
Separate custom-agent bootstrap and live authenticated runtime testing remain follow-up work.

## Key Decisions

- Include Codex in `make build`, `make validate`, and generated-variant drift checks.
- Include local marketplace metadata but do not add a package registry or release automation.
- Keep native Goals/planning optional and non-authoritative.

## Open Questions / Risks

- Whether Maister later needs a separately installed library of custom `.codex/agents/*.toml` profiles.

## Scope Boundaries

Included:

- `platforms/codex-cli/` build, hooks, and smoke test.
- Generated `plugins/maister-codex/`.
- Makefile, CI drift check, README, docs, and tech-stack updates.

Excluded:

- Codex app-server implementation.
- Model selection or reasoning-effort defaults.
- Automatic installation of `.codex/agents/*.toml`.
- Authenticated live Codex CLI smoke tests.
