## Development Conventions

### Predictable Structure
Organize files and directories in a logical, navigable layout.

### Up-to-Date Documentation
Keep README files current with setup steps, architecture overview, and contribution guidelines.

### Clean Version Control
Write clear commit messages, use feature branches, and add meaningful descriptions to pull requests.

### Environment Variables
Store configuration in environment variables; never commit secrets or API keys.

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

### Read INDEX Before Work
Always read `.maister/docs/INDEX.md` before starting any task.

### Follow Project Standards
Follow standards in `.maister/docs/standards/`. If they conflict with the task, ask the user.

### Documentation First During Work
Check `docs/INDEX.md` before and during work, not only at start.

### Continuous Standards Discovery
Check standards throughout the workflow, not just at the start.

### Specification Before Implementation
Create clear specs before coding.

### Planning Before Execution
Break implementation into manageable steps before executing.
