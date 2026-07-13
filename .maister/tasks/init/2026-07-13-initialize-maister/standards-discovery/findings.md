# Standards Discovery Findings

## TL;DR

Full discovery analyzed configuration, code patterns, documentation, CI, and available pull requests. It produced 35 raw findings and 31 semantic standards after deduplication. One finding scored high confidence, two scored medium confidence, and 28 remained below the configured 60% threshold. No contradictory findings were detected.

## Scoring

Scores follow the bundled aggregation strategy: unique source count (45 maximum), observed consistency (20), explicitness (15), evidence strength (20), and repeated PR feedback (10). The score does not reuse analyzer-provided confidence values.

## High Confidence (>=80%)

| # | Standard | Category | Score | Sources | Description |
|---|---|---|---:|---|---|
| H1 | Canonical source and reproducible generated variants | global/generated-artifacts | 95 | code-patterns, documentation, ci-config | Edit `plugins/maister/` or `platforms/`, run the build, and commit drift-free generated variants; never edit generated targets directly. |

## Medium Confidence (60–79%)

| # | Standard | Category | Score | Sources | Description |
|---|---|---|---:|---|---|
| M1 | Build and validate every platform before release | testing/release | 65 | documentation, ci-config | Every `v*` release must rebuild all platform variants and pass `make validate` before publication. |
| M2 | Prove rejected transactional mutations leave state unchanged | testing/safety | 60 | code-patterns | Snapshot transactional files and assert exact non-mutation or rollback, including modes where relevant. |

## Low Confidence (<60%)

| # | Standard | Category | Score | Sources | Description |
|---|---|---|---:|---|---|
| L1 | Fail fast in non-hook shell scripts | global/error-handling | 55 | code-patterns | Start non-hook build, install, smoke, generator, and test scripts with fail-fast shell behavior. |
| L2 | Use snake_case for shell functions | global/coding-style | 55 | code-patterns | Name shell functions with lowercase snake_case. |
| L3 | Use lowercase kebab-case shell filenames | global/coding-style | 55 | code-patterns | Use lowercase kebab-case, reserving dot suffixes for `.test` and `.e2e`. |
| L4 | Resolve repository paths from script location | global/portability | 40 | code-patterns | Derive `ROOT` or `SCRIPT_DIR` from `$0`, independent of the caller's working directory. |
| L5 | Use ESM and node-prefixed built-in imports | global/javascript | 55 | code-patterns | Write Node runtime modules as `.mjs` and import built-ins through `node:`. |
| L6 | Use lowerCamelCase for JavaScript functions | global/javascript | 55 | code-patterns | Name JavaScript function declarations with lowerCamelCase. |
| L7 | Encode shell test scope in filename | testing/naming | 55 | code-patterns | Use `.test.sh` for contract/structural tests and `.e2e.sh` for end-to-end tests. |
| L8 | Emit explicit shell test outcomes | testing/reporting | 40 | code-patterns | Print a `PASS` marker or final passed-count summary. |
| L9 | Read project documentation before work | global | 40 | documentation | Read `.maister/docs/INDEX.md`, then relevant standards, before work. |
| L10 | Evolve standards with user approval | global | 30 | documentation | Suggest recurring conventions and update standards only after approval. |
| L11 | Keep commands as thin skill wrappers | global | 35 | documentation | Put orchestration in `SKILL.md`; keep commands as delegators. |
| L12 | Scaffold plugin components consistently | global | 30 | documentation | Use documented locations and update the component catalog. |
| L13 | Write principle-based plugin documentation | global | 35 | documentation | Explain what, when, and why; avoid verbose implementation manuals. |
| L14 | Keep references conceptual and bounded | global | 35 | documentation | Keep references short, conceptual, and free of production implementations. |
| L15 | Require user confirmation before rollback | global | 35 | documentation | Never automatically revert changes; obtain explicit confirmation. |
| L16 | Keep Advisor and Arbiter read-only | global | 30 | documentation | Treat their output as recommendations, never mutation authority. |
| L17 | Use orchestrator-state.yml as source of truth | global | 40 | documentation | Use persistent orchestrator state for phases, gates, artifacts, and resume. |
| L18 | Keep workflow artifacts under task directory | global | 30 | documentation | Store reports and dashboards under `.maister/tasks/<type>/<task>/`. |
| L19 | Use standard task directory names | global | 30 | documentation | Use `YYYY-MM-DD-task-name` with a concise slug. |
| L20 | Use workflow artifact summary contract | global | 35 | documentation | Start workflow Markdown with bounded TL;DR and decision/risk sections. |
| L21 | Require explicit invocation for on-demand skills | global | 35 | documentation | Do not auto-run explicit-request-only skills. |
| L22 | Keep Playwright MCP opt-in | global | 35 | documentation | Enable browser MCP only for workflows that require it. |
| L23 | Do not pin host model settings | global | 35 | documentation | Inherit host/session model settings unless users opt into overrides. |
| L24 | Treat hooks as defense in depth | global | 30 | documentation | Hooks complement rather than replace sandbox and approval policy. |
| L25 | Guard new agents from destructive commands by default | global | 35 | documentation | Whitelist unrestricted shell access only when genuinely required. |
| L26 | Verify incrementally, then run the full suite | testing | 40 | documentation | Run focused tests per task group and the full suite before completion. |
| L27 | Use fresh workspaces for full E2E runs | testing | 35 | documentation | Prevent prior workflow state from contaminating E2E verification. |
| L28 | Monitor Cursor CLI parity weekly without blocking main CI | testing/platform-parity | 50 | ci-config | Run scheduled/manual parity smoke with recoverable skips for unavailable prerequisites. |

## Conflicts

No conflicts were detected among the aggregated findings.

## Source Summary

- Configuration: 0 findings; no supported classic linter/compiler/package-manager config was present.
- Code patterns: 10 findings; generated copies were not treated as independent evidence.
- Documentation: 22 findings from 13 documents.
- External/CI: 3 findings from three GitHub Actions workflows.
- Pull requests: only two merged PRs were available and neither contained review feedback; the three-PR evidence threshold was not met.
