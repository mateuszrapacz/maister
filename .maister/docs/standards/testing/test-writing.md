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

### Prove Rejected Transactional Mutations Leave State Unchanged
For configuration and state writers, snapshot every affected file before invalid-input and injected-failure cases, then assert byte-for-byte non-mutation or exact rollback. When relevant, also verify modes and permissions plus the unchanged existence of created or deleted directories. Transactional safety means preserving the complete original state, not merely reporting failure.

**Preferred:** Snapshot with `cp -p "$target" "$target.before"`, run the invalid case, compare with `cmp "$target" "$target.before"`, and assert expected file modes and directory existence.

**Avoid:** Checking only that the command returned a nonzero exit code.

**Evidence:** `tests/phase-continue-contract.test.sh`, `tests/advisor-config-reconciliation.test.sh`, and `tests/advisor-init-lifecycle.test.sh`.
