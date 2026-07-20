# TDD Green Gate — GitHub-only Distribution

## TL;DR

The unchanged focused GitHub-only contract suite now passes all three tests.
Package publication is blocked, `GH_TOKEN` has the required precedence, and
authenticated assets use GitHub API URLs with octet-stream negotiation.

## Key Decisions

- Preserve the original three-case test without weakening its assertions — the green result must prove the defects were fixed rather than hidden.
- Keep broader transaction, crash, archive-memory, and release checks in the comprehensive verification phases — this gate verifies only the focused Phase 3 contract.

## Open Questions / Risks

- The real anonymous public exact-selector smoke remains unavailable until the canonical `v2.2.1` tag and GitHub Release assets exist.

## Passing test

File: `tests/platform-independent/launcher-github-only.test.mjs`

Command:

```sh
node --test tests/platform-independent/launcher-github-only.test.mjs
```

Observed terminal result on 2026-07-20T12:38:25Z:

```text
tests 3
pass 3
fail 0
exit code 0
```

The green assertions prove:

1. The root package and release workflow make registry publication impossible.
2. `GH_TOKEN` takes precedence over `GITHUB_TOKEN` for GitHub API requests.
3. Authenticated Release assets use numeric GitHub API asset URLs and `application/octet-stream` negotiation.
