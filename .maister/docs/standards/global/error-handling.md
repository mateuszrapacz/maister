## Error Handling

### Clear User Messages
Show helpful, actionable messages without exposing internal details or security-sensitive information.

### Fail Fast
Validate inputs and check preconditions early; reject invalid data before it causes deeper issues.

### Typed Exceptions
Use specific exception types instead of generic ones to enable precise error handling.

### Centralized Handling
Catch and process errors at appropriate boundaries (controllers, API layers) rather than scattering try-catch throughout.

### Graceful Degradation
When non-critical services fail, continue operating with reduced functionality rather than crashing entirely.

### Retry with Backoff
Use exponential backoff for transient failures when calling external services.

### Resource Cleanup
Always release resources (file handles, connections) in finally blocks or equivalent cleanup mechanisms.

### Filesystem Transaction Recovery

Treat exit code `7` as an unresolved transaction, recovery, or rollback failure. Preserve the target-scoped lock, journals, receipts, backups, and staging state; never advise deleting state or repeatedly retrying rollback as a first response. Recovery instructions must distinguish a busy lock (`6`), drift (`5`), validation/source errors (`3`/`4`), and integrity failure (`8`).

### External Command Boundaries

CI and operator documentation must not execute unpinned remote scripts. If a native runtime is not already available and no trustworthy vendor digest/signature is verified, record an explicit `unavailable` or provisional result instead of silently swallowing installation failure.
