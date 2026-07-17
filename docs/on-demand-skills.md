# On-Demand Skills

Use an on-demand skill when you need one focused critique, review, or modeling session without starting a full Maister workflow.

For end-to-end work that needs analysis, specification, planning, implementation, and verification, use an [orchestrator workflow](workflows.md) instead.

## How invocation works

Ask for the capability directly in natural language, for example:

- "Audit this meeting transcript for decision problems."
- "Classify these requirements by modeling problem class."
- "Grill me on this design."
- "Run a thermos review on this branch."

The portable source of truth is each skill's `SKILL.md` under `plugins/maister/skills/`. Supported host overlays may project a different display or command name, so use the name exposed by the installed host instead of copying another host's syntax.

Treat every on-demand skill as user-triggered: it runs only for a clear request. Where `disable-model-invocation: true` is present, host metadata also prevents implicit attachment; the remaining skills express the same request guard in their canonical descriptions. A host or orchestrator may recommend a skill, but the recommendation does not run it.

### Orchestrator suggestions

Two orchestrators may suggest an on-demand skill at a relevant point. These are recommendations, not automatic phases.

| Suggested skill | Orchestrator | When |
| --- | --- | --- |
| `requirements-critic` | `development` | After requirements are drafted |
| `transcript-critic` | `product-design` | When the input includes meeting transcripts |

## Choose a skill

| Need | Skill | Use it when | Result |
| --- | --- | --- | --- |
| Review a meeting | [`transcript-critic`](../plugins/maister/skills/transcript-critic/SKILL.md) | A transcript or meeting notes may hide false consensus, scope drift, or unresolved decisions | Structured report |
| Improve requirements | [`requirements-critic`](../plugins/maister/skills/requirements-critic/SKILL.md) | Written requirements are vague, solution-heavy, or hard to verify | Interactive critique |
| Select a modeling approach | [`problem-classifier`](../plugins/maister/skills/problem-classifier/SKILL.md) | You need to distinguish CRUD, transformation, integration, or resource contention | Interactive classification |
| Find bounded contexts | [`context-distiller`](../plugins/maister/skills/context-distiller/SKILL.md) | Domain terms may need to be generalized or split across contexts | Context map |
| Design consistency units | [`aggregate-designer`](../plugins/maister/skills/aggregate-designer/SKILL.md) | Concurrent commands compete for the same resources | Interactive aggregate design |
| Audit domain language | [`linguistic-boundary-verifier`](../plugins/maister/skills/linguistic-boundary-verifier/SKILL.md) | Existing `language.md` files may leak concepts across bounded contexts | Read-only audit |
| Review testing strategy | [`test-strategy-reviewer`](../plugins/maister/skills/test-strategy-reviewer/SKILL.md) | Tests may use the wrong strategy or abstraction level for the production code | Read-only review |
| Review a branch deeply | [`thermos`](../plugins/maister/skills/thermos/SKILL.md) | A significant branch needs combined bug, security, maintainability, and simplification review | Synthesized report |
| Adapt communication | [`metaprogram-classifier`](../plugins/maister/skills/metaprogram-classifier/SKILL.md) | You want to understand someone's communication filters and adjust your message | Classification and guidance |
| Stress-test a plan | [`grill-me`](../plugins/maister/skills/grill-me/SKILL.md) | A plan or design has unresolved assumptions and no documentation should be changed | Read-only interview |
| Stress-test and document | [`grill-with-docs`](../plugins/maister/skills/grill-with-docs/SKILL.md) | The same interview should also maintain confirmed `language.md` terms and significant ADRs | Interview with approved documentation updates |

The closest alternatives differ by intent:

- Use `transcript-critic` for how a meeting reached decisions and `requirements-critic` for the quality of the resulting written requirements.
- Use `context-distiller` to find strategic boundaries, `aggregate-designer` to model resource contention, and `linguistic-boundary-verifier` to audit boundaries already documented in `language.md`.
- Use `grill-me` for a read-only interview and `grill-with-docs` when confirmed vocabulary and decisions should be recorded as you go.

## Related documentation

| Document | Purpose |
| --- | --- |
| [Documentation hub](README.md) | Installation, supported targets, evidence, and recovery |
| [Workflows](workflows.md) | End-to-end orchestrators and their phases |
| [Command reference](commands.md) | Workflow and utility commands |
| [`language.md` convention](../.maister/docs/standards/global/language-md-convention.md) | Structure and semantics of bounded-context language files |
