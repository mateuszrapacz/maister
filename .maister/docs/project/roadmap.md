# Development Roadmap

## Current State

- **Version**: v2.2.1 is the latest semantic tag observed during initialization
- **Key Features**: Structured SDLC workflows; persistent orchestration state; project standards; research, specification, planning, implementation, verification, migration, performance, and product-design flows; platform generation for Cursor, Kiro, and Codex; Advisor/Arbiter gate support
- **Recent Updates**: Cross-platform Advisor initialization, atomic configuration reconciliation, capability-aware continuation, and expanded generated-variant validation

## Planned Enhancements (Next 3–6 Months)

The items below are analysis-derived priorities. They should be reconciled with maintainer decisions and tracked work before scheduling.

### High Priority

- [ ] **Runtime continuation coverage** — Add focused tests for the Node continuation runner, including capability boundaries, retries, and state transitions.
- [ ] **Advisor/Arbiter architecture assurance** — Add contract and integration coverage demonstrating that read-only agents cannot bypass protected gates and that disagreement handling remains deterministic.
- [ ] **Platform parity protection** — Extend golden fixtures around high-risk host vocabulary, manifest, hook, and gate-policy transformations.

### Medium Priority

- [ ] **Local tool compatibility guide** — Document supported Node.js, Bash, Make, `jq`, `sed`, and `stat` capabilities for macOS and Linux.
- [ ] **Product-design server tests** — Exercise HTTP routes, file handling, and failure behavior of the visual companion runtime.
- [ ] **Dependency reproducibility** — Evaluate pinning optional `@playwright/mcp` usage instead of resolving `latest` where deterministic runs matter.
- [ ] **Release consistency checks** — Continue strengthening synchronization checks across source manifests, generated marketplaces, tags, and documentation.

### Technical Debt

- [ ] **Semantic transform helpers** — Replace the most fragile multi-stage `sed`/`grep` rewrites with narrowly scoped parsers or transformation helpers where the complexity justifies it.
- [ ] **Golden fixture expansion** — Capture representative skills, agents, commands, hooks, and manifests to detect silent transform regressions.
- [ ] **Standards specialization** — Keep standards focused on plugin generation, shell portability, state contracts, and risk-based testing rather than generic application conventions.

## Future Considerations

- **Feature ideas**: A machine-readable host capability matrix; richer state migration between workflow schema versions; deterministic offline validation bundles.
- **Scalability**: Improve build diagnostics and selective validation as the number of skills, generated targets, and platform contracts grows.
- **Governance**: Record architectural decisions for platform parity, state ownership, Advisor/Arbiter boundaries, and release compatibility.
