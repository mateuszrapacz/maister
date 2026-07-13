# Decision summary: automatyczna kontynuacja Codex

## TL;DR
Research, eksploracja wariantów i high-level design są kompletne; przyjęty zestaw to A3+B1+C1+D1.
Wszystkie konfigurowalne bramki użyły ręcznego fallbacku, ponieważ Codex host-native E2E nadal zwraca `77` i capability pozostaje `unsupported`.
Finalne zakończenie workflow zostało jawnie zatwierdzone przez użytkownika na denylisted bramce.

## Key Decisions
- A3 — wspólny executable evaluator z portami hosta.
- B1 — evaluator zapisuje pełny rekord gate, runner go weryfikuje i kontynuuje.
- C1 — workflow-owned stable inventory oraz durable outbox/receipt z `dispatch_id`.
- D1 — cienki binding Codex zwraca `continue | user_gate | blocked` do aktywnej pętli.
- `current_phase`, schema v2, revision/CAS i evidence-gated capability flip są częścią projektu.

## Open Questions / Risks
- Active-turn/headless hook Codex wymaga krótkiego spike'a implementacyjnego.
- Migracja realnych stanów do schema v2 musi być wersjonowana i fail-closed.
- Receiver musi deduplikować logiczny efekt po `dispatch_id`.

## Audit summary

Wspólny kontekst dla bramek 1–11: policy skonfigurowana jako `fully_automatic`, lecz capability Codex była `unsupported`, więc modeli advisor/arbiter nie wywołano, retry nie wystąpiły, a użytkownik dokonał wyboru przez interaktywny fallback. `user_override: false` dla wszystkich decyzji. Pełny kontekst: [research report](research-report.md), [solution exploration](solution-exploration.md), [high-level design](high-level-design.md), [decision log](decision-log.md).

| # | Phase / gate | Recommendation | Selected option | Actor | Confidence | Status |
|---:|---|---|---|---|---|---|
| 1 | Phase 1 exit | Continue to brainstorming evaluation | Continue to brainstorming evaluation | user | high | decided |
| 2 | Optional brainstorming | Yes, explore alternatives | Yes, explore alternatives | user | high | decided |
| 3 | Optional design | Yes, generate design | Yes, generate design | user | high | decided |
| 4 | Phase 3 exit | Continue to solution convergence | Continue to solution convergence | user | high | decided |
| 5 | Evaluator ownership | A3 | A3 — shared executable evaluator | user | high | decided |
| 6 | Terminal record ownership | B1 | B1 — evaluator-owned full record | user | high | decided |
| 7 | Same-phase dispatch | C1 | C1 — workflow-owned durable outbox/receipt | user | high | decided |
| 8 | Codex binding | D1 | D1 — thin host-native binding | user | high | decided |
| 9 | Phase 4 exit | Continue to high-level design | Continue to high-level design | user | high | decided |
| 10 | Design assumptions | Confirm assumptions | Confirm assumptions | user | high | decided |
| 11 | Phase 5 exit | Continue to output generation | Continue to output generation | user | high | decided |
| 12 | Final handoff approval | Complete workflow | Complete workflow | user | high | decided |

## Decision rationales

1. Research foundation was accepted because it established a high-confidence, evidence-backed root cause and implementation sequence.
2. Brainstorming was enabled because four coupled architectural seams had meaningful alternatives.
3. High-level design was enabled because the fix spans state, evaluator, runner, workflow and host boundaries.
4. Sequential convergence was selected to resolve dependent decision areas one at a time.
5. A3 makes agreement, arbitration, retry and resume executable and portable without absorbing domain routing.
6. B1 preserves full provenance in the component that owns the gate state machine; runner effects can resume independently.
7. C1 preserves domain ordering and logical exactly-once through stable IDs, outbox intent and receipt.
8. D1 keeps Codex integration thin and returns control to the active workflow loop without duplicating canonical logic.
9. The coherent A3+B1+C1+D1 package warranted architecture generation.
10. Design assumptions were explicitly confirmed, including unchanged fail-closed safety boundaries.
11. The completed design with eight components and eight ADRs was accepted for final output generation.
12. Final handoff was explicitly approved by the user; no advisor or arbiter participated in this denylisted decision.

## Generated outputs

- [Research report](research-report.md) ([HTML](research-report.html))
- [Solution exploration](solution-exploration.md) ([HTML](solution-exploration.html))
- [High-level design](high-level-design.md) ([HTML](high-level-design.html))
- [Decision log](decision-log.md) ([HTML](decision-log.html))
