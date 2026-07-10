## language.md Convention

### Purpose
Each bounded context (module, package, or service) maintains a `language.md` file documenting its ubiquitous language — the terms, operations, and events that belong to that context. This enables linguistic boundary verification without a separate context-map file; integration points across modules reconstruct the relationship graph.

### File Location
Place `language.md` at the root of each module: `<module>/language.md`.

If your project uses a different layout (monorepo packages, layered directories, service folders), document the pattern in `.maister/docs/INDEX.md` under Global Standards so skills and reviewers can discover it.

### Template Sections
Every `language.md` should include these sections:

**Module Description** — What the module does and its role: generalization (serves many consumers with generic language) or specific (owns a particular business capability). Generalizations require stricter boundary enforcement.

**Core Terms** — Glossary of domain terms owned by this context. Include brief definitions where meaning is non-obvious.

**Operations** — Commands, use cases, or API operations expressed in this context's language.

**Events** — Domain events this context publishes or subscribes to, named in this context's vocabulary.

**Integration Points** — Per related module, declare:
- Relationship type (see Relationship Types below)
- Direction (upstream/downstream or provider/consumer)
- Imported terms (vocabulary received from the other context)
- Exported terms (vocabulary this context exposes to the other)

**Published API** (optional) — Terms explicitly exported for consumers. When present, downstream modules may only use Published API terms, not internal Core Terms. When absent, all Core Terms are available to consumers.

### Relationship Types
Use DDD relationship types as defaults — they have well-defined language flow rules:

- **OHS (Open Host Service)** — Provider exposes API; consumer receives provider's language
- **Customer-Supplier** — Supplier defines language; customer receives it
- **ACL (Anti-Corruption Layer)** — Consumer translates provider's language; foreign terms must not leak into consumer code
- **Conformist** — Consumer fully adopts provider's language
- **Shared Kernel** — Both contexts share explicit terms only

Team aliases work — "provider/consumer", "library/client", "core/plugin" are fine. What matters is that each integration point declares direction and translation expectations.

### Adoption
Optional per project. Teams adopt `language.md` when using DDD-style bounded contexts or the `maister-linguistic-boundary-verifier` skill.

Not required by `maister-init` by default. Future init flags may scaffold stubs; manual creation is the current path.

### Cross-Reference
The `maister-linguistic-boundary-verifier` skill reads `language.md` files to detect language leakage (strings, events, API calls across boundaries). Without these files, the skill degrades gracefully and outputs adoption guidance pointing to this standard.

### Minimal Example

```markdown
# Resource

## Module Description
Generalization module providing shared resource availability and scheduling.
Serves HR, Training, and Facilities as consumers.

## Core Terms
- **Resource** — Any bookable entity (room, equipment, trainer slot)
- **Availability** — Time window when a resource can be allocated
- **Allocation** — Binding of a resource to a time period

## Operations
- checkAvailability(resourceId, timeRange)
- allocate(resourceId, timeRange, requesterId)
- release(allocationId)

## Events
- ResourceAllocated
- ResourceReleased
- AvailabilityChanged

## Integration Points

### HR (Customer-Supplier)
- Direction: HR (supplier) → Resource (customer)
- Imported: EmployeeId, DepartmentCode
- Exported: Availability, Allocation

### Training (OHS)
- Direction: Resource (provider) → Training (consumer)
- Exported: checkAvailability, allocate, release

## Published API
- checkAvailability
- allocate
- release
- Availability
- Allocation
```
