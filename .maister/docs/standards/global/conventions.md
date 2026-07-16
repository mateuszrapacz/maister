## Development Conventions

### Predictable Structure
Organize files and directories in a logical, navigable layout.

### Up-to-Date Documentation
Keep README files current with setup steps, architecture overview, and contribution guidelines.

### Clean Version Control
Write clear commit messages, use feature branches, and add meaningful descriptions to pull requests.

### Environment Variables
Store configuration in environment variables; never commit secrets or API keys.

For installation provenance, production instructions use a clean local Git checkout at a full commit SHA. `MAISTER_ALLOW_DIRTY_LOCAL=1` is development-only and must be explicit; it must not appear in a production release command.

Operator instructions state the ownership and concurrency boundary: Maister owns receipt-listed paths and managed settings keys, its lock coordinates Maister processes only, and host/editor/synchronization writers must be stopped during lifecycle operations. Do not claim protection from malicious same-user or privileged concurrent mutation.

Treat local `dist/` content as disposable. Release instructions require an isolated clean output directory and same-job validation; never publish an existing archive based on its name, timestamp, or an unsigned checksum alone.

Do not document unsupported host targets, resolver paths, or package lifecycles as available. Migration-era names may remain only in a clearly labeled historical/parity section.

### Minimal Dependencies
Keep dependencies lean and up-to-date; document why major ones are included.

### Consistent Reviews
Follow a defined code review process with clear expectations for reviewers and authors.

### Testing Standards
Define required test coverage (unit, integration, etc.) before merging.

### Feature Flags
Use flags for incomplete features instead of long-lived branches.

### Changelog Updates
Maintain a changelog or release notes for significant changes.

### Build What's Needed
Avoid speculative code and "just in case" additions (see minimal-implementation.md).
