# Decision Summary: ujednolicone projekcje agentów Maister

## TL;DR

Badanie zakończyło się jedną architekturą docelową: 28 kanonicznych ról Markdown jest parsowanych do wersjonowanego IR i manifestu, deterministycznie projektowanych do natywnych reprezentacji hostów, a następnie wybieranych przez exact fail-closed resolver.
Codex używa generic subagenta z wstrzykniętą instrukcją, Cursor wygenerowanych plugin-agentów Markdown, a Kiro wygenerowanych par JSON + prompt w natywnym `~/.kiro/agents`.
`advisor` przechodzi dokładnie tę samą ścieżkę co każda inna rola.
Legacy Codex TOML zostaje usunięty ze źródła bez migracji i kompatybilności wstecznej, ponieważ instalacje będą wykonywane od zera.

## Key Decisions

- Zachować `plugins/maister/agents/*.md` jako jedyne źródło zachowania 28 ról.
- Użyć portable core z ports and adapters oraz deterministycznego projectora w stagingu transakcji.
- Rozwiązywać `maister:<role_id>` dokładnie i kończyć fail-closed bez natural-language, built-in ani inline fallbacku.
- Traktować `advisor` identycznie jak wszystkie role: bez TOML, `readonly`, sandboxu i osobnego adaptera.
- Zarządzać tylko wyliczonym leaf-setem Maister pod natywnym `~/.kiro/agents`.
- Usunąć legacy Codex TOML bez migracji runtime; clean install jest wiążącym założeniem.
- Oddzielić dowód materializacji, native discovery i exact invocation; brak prerequisite pozostaje `unavailable`.

## Open Questions / Risks

- Codex spawn schema i per-spawn model control pozostają zależne od wersji hosta.
- Cursor precedence dla kolidujących agentów `maister-*` wymaga natywnego probe.
- Kiro exact identity observation wymaga wersjonowanego scenariusza wykonawczego.
- Multi-root transaction dla Kiro musi zachować byte-exact rollback, race detection i niezwiązane pliki użytkownika.
- Upgrade środowiska zawierającego legacy Codex TOML jest celowo poza zakresem.

## Outcome

| Area | Outcome |
|---|---|
| Research confidence | High dla architektury i diagnozy; native runtime support pozostaje wersjonowanym dowodem |
| Brainstorming | Pominięty — badanie nie pozostawiło równorzędnych alternatyw |
| High-level design | Wykonany |
| Architecture style | Portable core + ports and adapters + deterministic staged projection + transactional delivery |
| Architectural decisions | 6 accepted ADRs |
| Workflow status | Completed and explicitly approved by the user |
| Production implementation | Niewykonana; następny krok to `maister:development` |

## Decision History

Pełny kontekst i kanoniczny audit trail: [orchestrator-state.yml](../orchestrator-state.yml).

### 1. Research foundation exit

- **Phase / gate:** `phase-1` / `phase-1-exit`
- **Question:** Research foundation complete (initialized, planned, gathered, synthesized). Continue to brainstorming evaluation?
- **Options:** `Continue to brainstorming evaluation`; `Pause workflow`
- **Original recommendation:** `Continue to brainstorming evaluation`
- **Selected option:** `Continue to brainstorming evaluation`
- **Final actor / status:** user / `decided`
- **Rationale / confidence:** The user approved continuing the research workflow. / high
- **Policy:** manual gate; configured policy `fully_automatic`
- **Advisor / Arbiter:** `advisor` / `arbiter`, model `gpt-5.6-sol`; 0 attempts; no arbitration
- **User override / terminal error:** false / none
- **Idempotency key:** `sha256:8dc80ac772693c815f0dfac96f7baa45a3cded3e406f16c6f5a42756f1e157d4`

### 2. Brainstorming selection

- **Phase / gate:** `phase-2` / `optional-phase-selection`
- **Question:** Research converged on one architecture and did not identify competing alternatives, so brainstorming is unlikely to add value. Would you like to explore solution alternatives?
- **Options:** `Yes, explore alternatives`; `No, skip brainstorming`
- **Original recommendation:** `No, skip brainstorming`
- **Selected option:** `No, skip brainstorming`
- **Final actor / status:** user / `decided`
- **Rationale / confidence:** The user chose to skip brainstorming after the research converged on one architecture. / high
- **Policy:** manual gate; configured policy `fully_automatic`
- **Advisor / Arbiter:** `advisor` / `arbiter`, model `gpt-5.6-sol`; 0 attempts; no arbitration
- **User override / terminal error:** false / none
- **Idempotency key:** `sha256:99f3113cd7105936bc727db4bf0cb86d5ef197d114aaaaf2278ad15e56713dac`

### 3. High-level design selection

- **Phase / gate:** `phase-2` / `optional-phase-selection`
- **Question:** Research identifies architectural decisions across parsing, projection, installation, dispatch, migration, and verification, and the design will feed maister:development. Would you like to generate a high-level design?
- **Options:** `Yes, generate design`; `No, skip design`
- **Original recommendation:** `Yes, generate design`
- **Selected option:** `Yes, generate design`
- **Final actor / status:** user / `decided`
- **Rationale / confidence:** The user approved generating a high-level design as the development handoff. / high
- **Policy:** manual gate; configured policy `fully_automatic`
- **Advisor / Arbiter:** `advisor` / `arbiter`, model `gpt-5.6-sol`; 0 attempts; no arbitration
- **User override / terminal error:** false / none
- **Idempotency key:** `sha256:9b2ddc4d107ba91823dbe96461fee0cf7e83bbc3e977a797aa6c644d34c3cf89`

### 4. Design assumptions clarification

- **Phase / gate:** `phase-5` / `research-clarification`
- **Question:** Proposed design assumptions included a hash-gated legacy Codex TOML cleanup. Confirm these assumptions?
- **Options:** `Confirm assumptions`; `Correct assumptions`; `Provide more context`
- **Original recommendation:** `Confirm assumptions`
- **Selected option:** `Correct assumptions`
- **Final actor / status:** user / `decided`
- **Rationale / confidence:** The user removed backward-compatibility requirements; old Codex TOML agent files are deleted because all installations start clean. / high
- **Policy:** manual gate; configured policy `fully_automatic`
- **Advisor / Arbiter:** `advisor` / `arbiter`, model `gpt-5.6-sol`; 0 attempts; no arbitration
- **User override / terminal error:** false / none
- **Idempotency key:** `sha256:08d897407996d017ff889aaf062a92e49e6cd9aa9d9cd5942601cd8ea1002e91`

### 5. Design exit

- **Phase / gate:** `phase-5` / `phase-5-exit`
- **Question:** Design complete. Continue to output generation?
- **Options:** `Continue to output generation`; `Pause workflow`
- **Original recommendation:** `Continue to output generation`
- **Selected option:** `Continue to output generation`
- **Final actor / status:** user / `decided`
- **Rationale / confidence:** The user approved generating the final research summary and development handoff. / high
- **Policy:** manual gate; configured policy `fully_automatic`
- **Advisor / Arbiter:** `advisor` / `arbiter`, model `gpt-5.6-sol`; 0 attempts; no arbitration
- **User override / terminal error:** false / none
- **Idempotency key:** `sha256:6bdf08499f5ea52adcb109887df08612b87fed5c1a2a6ba779d4fc70c9cb160e`

### 6. Final handoff approval

- **Phase / gate:** `phase-6` / `final-handoff-approval`
- **Question:** Research summary and development handoff are complete. Complete the workflow?
- **Options:** `Complete workflow`; `Keep workflow open`
- **Original recommendation:** `Complete workflow`
- **Selected option:** `Complete workflow`
- **Final actor / status:** user / `decided`
- **Rationale / confidence:** The user explicitly confirmed completion of the research workflow and requested context compaction before development. / high
- **Policy:** manual gate; configured policy `fully_automatic`
- **Advisor / Arbiter:** `advisor` / `arbiter`, model `gpt-5.6-sol`; 0 attempts; no arbitration
- **User override / terminal error:** false / none
- **Idempotency key:** `sha256:d80f674bb46ee9bc4ab3f4827a639076174888b935b69a4d0c8ad83216fb4ee0`

## Artifact Inventory

- [Research report](research-report.md) ([HTML](research-report.html))
- [High-level design](high-level-design.md) ([HTML](high-level-design.html))
- [Decision log](decision-log.md) ([HTML](decision-log.html))
- [Research synthesis](../analysis/synthesis.md)
- [Canonical workflow state](../orchestrator-state.yml)

## Development Handoff

Implementation should proceed in dependency order:

1. Canonical parser/IR, versioned manifest and 28/28 identity/collision tests.
2. Pure deterministic projector, transform registry, projection validation and digest provenance.
3. Cursor and Kiro native projections plus Kiro managed leaf-set transaction support.
4. Exact resolver, host adapter ports and execution record.
5. Removal of legacy Codex TOML source/init/docs without migration runtime.
6. Structural, transactional, native discovery, exact invocation and release-lifecycle verification.

After context compaction, start a fresh development workflow with:

```text
$maister:development .maister/tasks/research/2026-07-17-unify-agent-projections
```

The high-level design and decision log are authoritative where they supersede the earlier migration recommendation.
