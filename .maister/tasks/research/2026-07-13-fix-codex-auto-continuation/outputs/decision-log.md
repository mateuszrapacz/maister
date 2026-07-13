# Decision log: automatyczna kontynuacja Codex

## TL;DR

Przyjęto osiem decyzji architektonicznych tworzących jeden spójny łańcuch: shared evaluator → pełny terminal record → runner commit → workflow-owned durable dispatch → thin Codex binding.
Stan pozostaje pojedynczym YAML snapshotem, zabezpieczonym lockiem, revision/CAS i atomic rename; `current_phase` jest jedynym kursorem fazy.
Runner nie dispatchuje pracy, a capability Codex nie zmienia się na `supported` bez zielonego, rzeczywistego host-native E2E.

## Key Decisions

- A3, B1, C1 i D1 zostały zaakceptowane bez zmian.
- `current_phase` zastępuje mutowalne znaczenie `started_phase`.
- Wspólne state repository zapewnia lock + CAS dla evaluatora i runnera.
- Runner pozostaje commit boundary, a workflow loop pozostaje routing boundary.
- Capability flip jest zmianą opartą na dowodzie, nie na deklaracji lub fake-only teście.

## Open Questions / Risks

- Active-turn binding Codex wymaga spike'a; MCP jest fallbackiem tylko po negatywnym dowodzie D1.
- Schema v2 i migracja uboższych historii muszą być fail-closed oraz przetestowane realnymi snapshots.
- Idempotentny receiver jest konieczny, aby `dispatch_id` zapewniał jeden logiczny efekt mimo fizycznego retry.

## Status summary

| ADR | Decyzja | Status |
|---|---|---|
| ADR-001 | Shared executable gate evaluator (A3) | Accepted |
| ADR-002 | Evaluator-owned full gate record (B1) | Accepted |
| ADR-003 | Workflow-owned inventory i outbox/receipt (C1) | Accepted |
| ADR-004 | Thin host-native Codex binding (D1) | Accepted |
| ADR-005 | `current_phase` jako canonical cursor | Accepted |
| ADR-006 | Lock + revision/CAS state repository | Accepted |
| ADR-007 | Runner commituje, workflow dispatchuje | Accepted |
| ADR-008 | Evidence-gated Codex capability flip | Accepted |

## ADR-001 — Shared executable gate evaluator (A3)

**Status:** Accepted  
**Context:** Normatywny Markdown opisuje agreement, arbitration, retry i resume, ale obecne testy nie wykonują tej state machine. Umieszczenie algorytmu wyłącznie w prose lub w adapterze Codex utrwaliłoby drift.  
**Decision:** Dodać wspólny executable evaluator w canonical orchestrator framework. Evaluator posiada state machine i używa wstrzykiwanego read-only `role_invoker`; nie zna domenowego routingu ani hostowych efektów.  
**Consequences:** Agreement, jeden logiczny arbiter, retry i resume są deterministycznie testowalne. Powstaje nowy, mały runtime component i wymagany jest stabilny port native delegation.  
**Rejected alternatives:** A1 prose-only nie usuwa root cause; A2 monolityczny runner miesza domenę i host; A4 Codex-only tworzy drugą semantykę.

## ADR-002 — Evaluator-owned full gate record (B1)

**Status:** Accepted  
**Context:** Runner dziś otrzymuje już wybraną opcję i rekonstruuje uboższy record, tracąc original recommendation, role responses, models i attempts.  
**Decision:** Evaluator aktualizuje jeden pełny envelope od pending do terminalnego wyniku. Runner ponownie czyta state i weryfikuje idempotency key, selected option, actor, confidence oraz revision; nie dopisuje ani nie rekonstruuje provenance.  
**Consequences:** Terminalna decyzja jest trwała przed raportem i continuation, a recovery nie ponawia modeli. Evaluator i runner są sekwencyjnymi writerami i muszą współdzielić repository.  
**Rejected alternatives:** B2 robi z runnera RPC state service; B3 nie daje transakcji przez model call; B4 event log jest nieproporcjonalny.

## ADR-003 — Workflow-owned inventory i durable outbox/receipt (C1)

**Status:** Accepted  
**Context:** Runner potrafi opcjonalnie zmienić fazę, ale nie zna kolejności decision areas i kończy proces po stdout. Sam indeks nie daje stabilnej identity ani recovery po dispatchu.  
**Decision:** Każdy workflow z pętlą materializuje stabilne work itemy. Po decyzji zapisuje wybór, następny target i deterministyczny `dispatch_id`; dispatcher/receiver deduplikuje efekt i zapisuje trwały checkpoint/ack.  
**Consequences:** Same-phase i next-phase continuation są obserwowalne i resumable. Exactly-once oznacza logiczny efekt; fizyczne wywołanie może być retry'owane. Workflowy muszą implementować własne inventory/routing na wspólnym envelope.  
**Rejected alternatives:** C2 indeks jest niestabilny; C3 sprzęga runner z domeną; C4 ephemeral loop nie rozstrzyga crash window.

## ADR-004 — Thin host-native Codex binding (D1)

**Status:** Accepted  
**Context:** Codex ma read-only profile ról, ale nie ma executable consumer łączącego role, evaluator, runner i aktywną pętlę. Lokalny service lub wrapper zwiększałby footprint i nie gwarantował utrzymania tury.  
**Decision:** Binding w `platforms/codex-cli/` dostarcza native role port, uruchamia shared evaluator/runner, waliduje ich kontrakty i zwraca wyłącznie `continue | user_gate | blocked`. Nie implementuje policy ani domain routing.  
**Consequences:** Shared core pozostaje portable, a Codex zachowuje native delegation. Exact active-turn hook wymaga krótkiego spike'a. MCP można rozważyć wyłącznie, jeśli spike empirycznie obali D1.  
**Rejected alternatives:** D2 dodaje runtime service; D3 wrapper może nie reprezentować realnej sesji; D4 daemon nie kontynuuje tej samej tury.

## ADR-005 — `current_phase` jako jedyny canonical phase cursor

**Status:** Accepted  
**Context:** Realny state używa `started_phase`, runner transition wymaga `current_phase`, a `phases[]` może być niespójne bez jawnego kursora.  
**Decision:** Schema v2 używa `orchestrator.current_phase` jako jedynego mutowalnego kursora. `initial_phase` może zachować niemutowalną informację historyczną. `current_phase` musi wskazywać jedyną fazę `in_progress`.  
**Consequences:** Resume i transition mają jedno źródło prawdy. Wymagana jest wersjonowana migracja realnych state files oraz aktualizacja wszystkich generatorów/call sites.  
**Rejected alternatives:** Utrzymanie obu pól tworzy split-brain; wyprowadzanie wyłącznie z `phases[]` osłabia walidację uszkodzonego stanu.

## ADR-006 — Lock + revision/CAS state repository

**Status:** Accepted  
**Context:** Evaluator zapisuje pending/terminal records, a runner później zapisuje projekcje/transition. Atomic rename pojedynczego writera nie chroni przed lost update między procesami.  
**Decision:** Oba komponenty używają jednego małego repository: project-local exclusive lock, exact-schema/invariant validation, `expected_revision` CAS, temp file + fsync + atomic rename i zachowanie mode. Lock nie jest trzymany podczas model call ani host dispatchu.  
**Consequences:** Konflikt powoduje reread i idempotency resolution, nie overwrite. Repository jest nowym wspólnym dependency, ale ma bezpośrednich callerów i wąski zakres zgodny z minimal implementation.  
**Rejected alternatives:** Blind last-write-wins grozi utratą historii; jeden długi lock przez model/dispatch blokuje workflow i nadal nie tworzy transakcji zewnętrznej.

## ADR-007 — Runner commituje; workflow dispatchuje

**Status:** Accepted  
**Context:** `phase-continue.mjs` ma dobre mechanizmy preflight, terminal persistence, reports i forward transition, ale nie zna domeny i nie utrzymuje hostowej tury.  
**Decision:** Runner pozostaje deterministic commit boundary: weryfikuje terminal record, regeneruje raporty i może atomowo przełączyć fazę. Workflow loop jest routing boundary: stosuje wybór, materializuje target i dispatchuje go przez binding.  
**Consequences:** Recovery raportu/transition pozostaje centralne, a shared runner nie absorbuje decision areas. Sukces runnera nie może być interpretowany jako wykonanie następnej pracy; wymagany jest receipt/checkpoint.  
**Rejected alternatives:** Runner-dispatcher wymagałby domenowego payloadu i hostowego API, powtarzając odrzucony monolit A2/C3.

## ADR-008 — Capability Codex zmienia się tylko na podstawie host-native evidence

**Status:** Accepted  
**Context:** Obecny Codex E2E zwraca `77`, a shared runner i smoke/prose tests nie dowodzą braku UI ani realnego następnego dispatchu. Przedwczesne `supported` uruchomiłoby automatyzację bez bezpiecznego transportu.  
**Decision:** Capability pozostaje `unsupported` przez implementację i adapter integration. Flip na `supported` jest osobnym krokiem dopiero po exit `0` rzeczywistego Codex host-E2E obejmującego agreement, disagreement, same-phase, next-phase, no UI, resume i dedupe. Brak runtime nadal daje `77`, nie fake success.  
**Consequences:** Rollout jest fail-closed i mierzalny. Implementacja może być gotowa przed aktywacją; manual/user gate fallback pozostaje dostępny.  
**Rejected alternatives:** Flip po shared testach lub po obecności plików w generated pluginie myli deklarację z runtime proof.

## Powiązania

- [High-level design](high-level-design.md)
- [Research report](research-report.md)
- [Solution exploration](solution-exploration.md)
- `../analysis/synthesis.md`
