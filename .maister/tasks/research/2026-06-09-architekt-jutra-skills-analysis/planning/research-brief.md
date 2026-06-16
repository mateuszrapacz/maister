# Research Brief: Architekt Jutra Skills for Maister Integration

## Research Question

Extract all skills from `/Users/mrapacz/Projects/architekt-jutra-code`, analyze and categorize each one, and recommend which could be adopted into the Maister plugin as standalone invocable skills (similar to `grill-me` or `thermos`).

## Research Type

**Mixed** — combines literature-style analysis of external skill definitions with technical assessment against Maister's existing plugin architecture and skill inventory.

## Scope

### Included

- All `SKILL.md` files under architekt-jutra-code (14 identified)
- Skill purpose, workflow, invocation model, dependencies (subagents, MCP, AskQuestion)
- Maister existing skills in `plugins/maister/skills/` (18 skills)
- Fit assessment for Maister as AI SDLC plugin marketplace (not domain-specific app code)
- Categorization by function (review, modeling, communication, research, etc.)
- Priority recommendations for adoption as optional/on-demand skills

### Excluded

- Porting full week-demo code or AJ-dotnet application
- Implementing skills in this research task (recommendations only)
- Deep analysis of architekt-jutra-code application runtime (only skill artifacts)
- `incident-diagnosis-review` and `aj-kg-query` as first-class Maister skills unless strong generic value found (likely AJ-specific)

## Constraints

- Maister skills live in `plugins/maister/skills/` (source of truth); never edit generated variants directly
- Follow Maister plugin conventions: thin commands, SKILL.md as source of truth, optional `disable-model-invocation`
- Polish and English skills are acceptable (Maister already has bilingual-friendly patterns in places)
- Skills requiring Neo4j MCP or AJ-specific KG are low fit for generic Maister distribution

## Success Criteria

1. Complete inventory of all AJ skills with one-paragraph description each
2. Taxonomy (categories) with every skill assigned
3. Gap analysis vs Maister current skills (overlap, complement, missing)
4. Ranked adoption recommendations with rationale (high / medium / low / not recommended)
5. For top candidates: integration notes (command name, dependencies, overlap with existing workflows)

## Project Documentation Paths

From `.maister/docs/INDEX.md`:

- `.maister/docs/project/tech-stack.md`
- `.maister/docs/standards/global/plugin-development.md`
- `.maister/docs/standards/global/conventions.md`
