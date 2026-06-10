# Agent Instructions

## Maister Workflows
This project uses the maister plugin for structured development workflows. 

### Available Skills
Skills are located in `.kilo/skills/maister-*/SKILL.md`. Invoke them by describing the task, and the agent will load the appropriate skill.

### Available Subagents
Subagents are located in `.kilo/agents/maister-*.md`. Invoke them via `@maister-<agent-name>` or let the orchestrator delegate to them.

### Key Workflows
- **Development**: Invoke the `maister-development` skill for features, bug fixes, and enhancements.
- **Research**: Invoke the `maister-research` skill for technical investigation.
- **Quick Bugfix**: Invoke the `maister-quick-bugfix` skill for TDD-driven quick fixes.

**Critical Principle**: Always read `.maister/docs/INDEX.md` before starting work to understand project context and standards.
