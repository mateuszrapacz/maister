# Research Brief: First-Class Pi Support

## TL;DR
Determine the smallest safe architecture that makes Pi a supported Maister target.
Use the installed Pi runtime as empirical evidence and Pi's subagents extension as the native-agent substrate.
The deliverable must define packaging, adapter, delegation, validation, and compatibility requirements precisely enough for a later development workflow.

## Key Decisions
- Treat `pi` as the Pi coding agent implied by the installed extension ecosystem — the subagents constraint uniquely identifies the intended platform.
- Research before implementation — this workflow produces evidence and a recommended design, not source changes.

## Open Questions / Risks
- Pi's extension contracts may be conventional rather than stable public APIs.
- Maister's workflow gates, skills, commands, and agent roles may not map one-to-one onto Pi primitives.
- The installed subagents extension may require an adapter or companion extension to preserve durable orchestration state.

## Research Question

How should Maister add first-class support for the Pi coding agent, including target packaging, installation, commands and skills, and native-agent orchestration built on Pi's installed subagents extension?

## Scope

Included: canonical Maister sources and generated targets; the installed Pi runtime and extension inventory; Pi's extension, prompt, skill, command, and package conventions; the installed subagents extension; build/install/validation changes; compatibility and test strategy.

Excluded: implementing the adapter during research; rewriting Pi or the subagents extension; unrelated platform work.

Constraints: use the installed Pi environment for empirical checks; base native agents on the installed subagents plugin; install additional extensions only if evidence cannot otherwise be obtained; preserve Maister's safety, auditability, resumability, and canonical-source ownership.

## Success Criteria

- Evidence-backed inventory of relevant Maister and Pi integration points.
- Verified description of how Pi discovers and executes extensions, skills, prompts, commands, and subagents.
- At least one tested native-agent delegation path using the installed subagents extension.
- Gap matrix between existing targets and Pi.
- Recommended target architecture, generated artifact layout, installer/build changes, and validation strategy.
- Explicit risks, unknowns, and implementation-ready next steps.

## Project Documentation

- `.maister/docs/project/vision.md`
- `.maister/docs/project/roadmap.md`
- `.maister/docs/project/tech-stack.md`
- `.maister/docs/project/architecture.md`
