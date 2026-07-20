# TDD Red Gate — GitHub-only Distribution

## TL;DR

Three focused tests reproduce the current mismatch with the approved GitHub-only contract.
All three fail for the intended reasons: the package remains publishable, `GH_TOKEN` does not
take precedence, and authenticated assets still use public browser download URLs.

## Key Decisions

- Keep registry-publishing, credential precedence, and private asset transport in one focused contract suite — these are the three independent regressions introduced by the revised scope.
- Stop the authenticated asset test after the first asset request — this proves URL/header selection without invoking extraction or host-state mutation.

## Open Questions / Risks

- The red suite does not yet cover the bounded non-shell `gh auth token --hostname github.com` fallback; that behavior requires an injectable command boundary in the implementation plan.
- Aggregate transaction, abrupt-crash recovery, multi-journal recovery, and archive-memory evidence remain downstream verification obligations.

## Failing test

File: `tests/platform-independent/launcher-github-only.test.mjs`

Command:

```sh
node --test tests/platform-independent/launcher-github-only.test.mjs
```

Observed terminal result on 2026-07-19T23:50:12Z:

```text
tests 3
pass 0
fail 3
exit code 1
```

The failures reproduce the approved defects:

1. `package.json.private` is absent instead of `true`; the existing workflow also retains registry publication machinery.
2. A request with both `GH_TOKEN` and `GITHUB_TOKEN` sends `Bearer github-token` instead of the required `Bearer gh-token`.
3. The first authenticated asset request uses `browser_download_url` on `github.com` instead of the GitHub API asset URL with octet-stream negotiation.

No production source or release workflow was changed during this phase.
