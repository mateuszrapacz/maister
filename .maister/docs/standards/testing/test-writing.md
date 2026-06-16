## Test Writing

### Test Behavior
Focus on what code does, not how it does it, to allow safe refactoring.

### Clear Names
Use descriptive names explaining what's tested and expected (`shouldReturnErrorWhenUserNotFound`).

### Mock External Dependencies
Isolate tests by mocking databases, APIs, and external services.

### Fast Execution
Keep unit tests fast (milliseconds) so developers run them frequently.

### Risk-Based Testing
Prioritize testing based on business criticality and likelihood of bugs.

### Balance Coverage and Velocity
Adjust test coverage based on project needs and team workflow.

### Critical Path Focus
Ensure core user workflows and critical business logic are well-tested.

### Appropriate Depth
Match edge case testing to the risk profile of the code.

### Structural Validation As Quality Gate
This repo uses `make validate` (grep/find structural checks) instead of unit test frameworks. CI requires `make validate` pass.

### Playwright MCP For E2E
Browser E2E verification via Playwright MCP (`npx @playwright/mcp@latest`). No local playwright.config.

### CLI Smoke Test Script
Cursor integration verified via `platforms/cursor/smoke-cli.sh` after `make build-cursor`.

### Test-Driven Development Approach
Write tests first, implement, then verify.

### TDD Red Gate For Bug Fixes
Bug fixes: write failing test first (TDD Red) before implementation.

### TDD Green Gate For Bug Fixes
Bug fixes: verify test passes (TDD Green) after implementation.

### Incremental Test Verification
After each implementation group, run only new tests, not the entire suite.

### Full Test Suite Before Commit
Run full test suite and create verification report before code review or completion.

### Read-only Test Verifier Agents
Test agents (test-suite-runner, e2e-test-verifier) are read-only: run tests and report, do not fix code.

### Test-driven Implementation Ordering
Implementation steps: test step (N.1) before implementation steps (N.2+) within each task group.
