# High-level design: automatyczna kontynuacja Codex

## TL;DR

Docelowa architektura łączy wykonywalną maszynę stanów z ports-and-adapters: wspólny evaluator podejmuje i zapisuje decyzję, runner ją weryfikuje i commituje projekcje/transition, a workflow loop automatycznie dispatchuje następną pracę.
Zgodność rekomendacji kończy gate aktorem `advisor`; rozbieżność uruchamia dokładnie jednego logicznego arbitra, którego nieudane wywołania są retry tego samego rekordu.
Trwałe `work_item_id`, `dispatch_id` i receipt dają logiczne exactly-once dla następnego problemu oraz następnej fazy, także po crashu.
Codex pozostaje `unsupported`, dopóki realny host-native E2E nie udowodni braku UI, utrzymania aktywnej tury i rzeczywistego kolejnego dispatchu.

## Key Decisions

- **A3:** jeden wspólny executable gate evaluator, sterowany read-only portem ról hosta.
- **B1:** evaluator jest właścicielem pełnego rekordu `pending → terminal`; runner konsumuje i weryfikuje ten rekord bez rekonstrukcji provenance.
- **C1:** workflow jest właścicielem stabilnego inventory i durable outbox/receipt; receiver deduplikuje efekt po `dispatch_id`.
- **D1:** cienki binding Codex mapuje wynik na `continue | user_gate | blocked` i oddaje `continue` do aktywnej pętli.
- `orchestrator.current_phase` jest jedynym mutowalnym kursorem fazy; `revision` oraz wspólne repository zabezpieczają dwóch sekwencyjnych writerów.
- Runner jest granicą trwałego commitu i forward transition, ale nigdy dispatcherem domenowej pracy.

## Open Questions / Risks

- Stabilny active-turn hook i headless entrypoint prawdziwego Codex wymagają krótkiego spike'a. Jeśli D1 zostanie empirycznie disproven, dopiero wtedy można rozważyć lokalny MCP adapter.
- Migracja realnych stanów z `started_phase` i uboższych rekordów historii wymaga wersjonowanej, fail-closed migracji oraz fixtures z rzeczywistych workflowów.
- Exactly-once oznacza jeden logiczny efekt; transport może fizycznie retry'ować, lecz zawsze z tym samym `dispatch_id` i idempotentnym receiverem.
- Dwa procesy zapisujące YAML muszą używać tego samego locka, atomic rename i revision/CAS; bez tego możliwy jest lost update.

## 1. Styl architektury i zakres

**Styl:** wykonywalna state machine w architekturze ports-and-adapters, osadzona w istniejącym single-source/multi-target plugin pipeline. Nie powstaje usługa, daemon ani baza danych.

Projekt obejmuje osiem komponentów runtime:

| # | Komponent | Odpowiedzialność | Nie odpowiada za |
|---:|---|---|---|
| 1 | Workflow loop | Materializuje inventory, aplikuje wybór, wyznacza target i kontynuuje aż do terminalnego stopu | Reguły agreement/arbitration |
| 2 | Gate evaluator | Policy, denylista, walidacja outputu, retry, agreement, jeden logiczny arbiter, terminalny record | Raporty i domenowy routing |
| 3 | Role invoker port | Read-only wywołanie `advisor` lub `arbiter` przez host | Mutacje state i wybór polityki |
| 4 | State repository | Lock, odczyt schema, revision/CAS, invariant checks, atomic write | Semantyka workflowu |
| 5 | Continuation runner | Reuse terminal recordu, preflight, raporty/dashboard, forward phase transition | Wywołania modeli i dispatch pracy |
| 6 | Codex binding | Łączy native role port, evaluator i runner; zwraca dyrektywę do aktywnej tury | Własna state machine lub własny audit |
| 7 | Dispatcher/receiver | Wykonuje target z `dispatch_id`, deduplikuje logiczny efekt, zapisuje ack | Wyliczanie domenowego next targetu |
| 8 | Projection generator | Generuje decision summary/dashboard z canonical state | Źródło resume lub decyzji |

```text
User / workflow invocation
          |
          v
+-------------------+       +---------------------+
|  1. Workflow loop |------>| 2. Gate evaluator   |
| inventory + route |       | executable FSM      |
+---------+---------+       +----+-----------+----+
          ^                      |           |
          | continue             |           v
          |                 +----v----+  +----------------+
          |                 | 3. Role |  | 4. State repo  |
          |                 | port    |  | lock/CAS/write |
          |                 +---------+  +-------+--------+
          |                                      |
          |                  +-------------------v--+
          +------------------| 6. Codex binding    |
                             +----+-------------+--+
                                  |             |
                        +---------v--+     +----v-------------+
                        | 5. Runner |     | 7. Dispatcher    |
                        | commit    |     | receipt/dedupe    |
                        +-----+-----+     +------------------+
                              |
                        +-----v-------------+
                        | 8. Projections    |
                        +-------------------+
```

## 2. Granice i porty

### 2.1 `evaluateGate(gateContext, roleInvoker, stateRepository)`

Wejście zawiera dokładny `phase_id`, stabilny `gate_type`, pytanie, uporządkowane opcje, `original_recommendation`, safety i read-only context. Evaluator:

1. wylicza idempotency key;
2. reużywa terminalny rekord przed wywołaniem hosta;
3. zapisuje pending i każdą próbę przed call'em;
4. wywołuje role wyłącznie przez `roleInvoker`;
5. waliduje exact czteropolowy output;
6. zapisuje pełny terminalny envelope albo fail-closed stan.

```js
roleInvoker.invoke({
  role: "advisor" | "arbiter",
  logical_role_id: "sha256:...",
  attempt: 1,
  gate: { idempotency_key, question, options, original_recommendation },
  read_only_context: { task_path, phase_summaries, artifacts, prior_gate_history }
})
// -> { selected_option, rationale, confidence, escalate_to_user }
```

Role port nie otrzymuje writerów, ścieżek wyjściowych ani prawa rozszerzenia scope. Arbiter dodatkowo otrzymuje dokładnie dwie konkurujące opcje wraz z uzasadnieniami i może zwrócić wyłącznie jedną z nich.

### 2.2 `continuePhase(commitRequest, stateRepository)`

Runner dostaje klucz istniejącego terminalnego recordu, oczekiwany wybór i opcjonalny forward target. Ponownie czyta state, sprawdza revision i inwarianty, generuje projekcje oraz zapisuje phase transition/receipt. Nie dostaje odpowiedzi modeli i nie syntetyzuje historii.

```json
{
  "state": ".../orchestrator-state.yml",
  "idempotency_key": "sha256:...",
  "expected_selected_option": "A",
  "expected_revision": 41,
  "next_phase": "phase-5",
  "report_md": ".../decision-summary.md",
  "report_html": ".../decision-summary.html"
}
```

### 2.3 `dispatch(target, dispatchId)`

Workflow wyznacza target, a Codex binding/dispatcher wykonuje go. Receiver sprawdza receipt przed efektem i atomowo zapisuje `acknowledged` po ustanowieniu obserwowalnego checkpointu targetu.

```js
dispatcher.dispatch({
  dispatch_id: "sha256:...",
  kind: "same_phase_work_item" | "phase_entry",
  phase_id: "phase-4",
  work_item_id: "decision-area:persistence-boundary"
})
// -> { directive: "continue", dispatch_id, checkpoint }
```

### 2.4 Dyrektywa hosta

Binding zwraca zamknięty union:

- `continue` — terminalny gate i wymagane durable efekty są gotowe; workflow ma ponownie odczytać state i wykonać target;
- `user_gate` — gate jest manualny/denylisted albo bezpieczny fallback wymaga użytkownika;
- `blocked` — brak bezpiecznej automatycznej lub interaktywnej ścieżki.

Żaden poprawny `continue` nie może zostać zamieniony w końcową odpowiedź assistant turn.

## 3. Kanoniczny model stanu

State pozostaje pojedynczym snapshotem YAML. `schema_version` umożliwia migrację, `revision` rośnie przy każdym legalnym atomicznym zapisie, a `current_phase` wskazuje dokładnie jedną fazę `in_progress`.

```yaml
orchestrator:
  schema_version: 2
  revision: 42
  current_phase: phase-4
  initial_phase: phase-1
  completed_phases: [phase-1, phase-2, phase-3]
  failed_phases: []
  gate_history:
    - schema_version: 2
      idempotency_key: sha256:gate-key
      phase_id: phase-4
      gate_type: research-convergence
      question: "Które podejście wybrać?"
      options: [A, B, "Need more info"]
      original_recommendation: A
      policy: fully_automatic
      safety_classification: configurable
      status: decided
      selected_option: B
      final_actor: arbiter
      advisor:
        logical_role_id: sha256:advisor-id
        agent: advisor
        model: gpt-5.6-sol
        response: {selected_option: B, rationale: "...", confidence: high, escalate_to_user: false}
        attempts:
          - {number: 1, status: completed, started_at: "...", completed_at: "...", error: null}
        exhausted: false
      arbiter:
        logical_role_id: sha256:arbiter-id
        agent: arbiter
        model: gpt-5.6-sol
        response: {selected_option: B, rationale: "...", confidence: high, escalate_to_user: false}
        attempts:
          - {number: 1, status: completed, started_at: "...", completed_at: "...", error: null}
        exhausted: false
      rationale: "..."
      confidence: high
      escalate_to_user: false
      user_override: false
      continuation:
        kind: same_phase_work_item
        target_id: decision-area:persistence-boundary
        dispatch_id: sha256:dispatch-id
        status: acknowledged
      error: null
  work:
    phase-4:
      inventory_version: sha256:artifact-derived-version
      items:
        - id: decision-area:execution-owner
          ordinal: 1
          status: completed
          source_gate_key: sha256:previous-gate
          selected_option: A
        - id: decision-area:persistence-boundary
          ordinal: 2
          status: in_progress
          source_gate_key: null
          selected_option: null
  dispatch_outbox:
    - dispatch_id: sha256:dispatch-id
      source_gate_key: sha256:gate-key
      kind: same_phase_work_item
      phase_id: phase-4
      target_id: decision-area:persistence-boundary
      status: acknowledged
      attempts: 1
      checkpoint: gate-context-materialized
      error: null
```

### Inwarianty

1. `current_phase` wskazuje dokładnie jedną fazę `in_progress`.
2. Jeden idempotency key odpowiada jednemu rekordowi historii, aktualizowanemu in-place pending → terminal.
3. Rekord `decided` ma legalną `selected_option`, terminalnego aktora i pełne provenance właściwe dla tego aktora.
4. Jedna rozbieżność ma jeden `arbiter.logical_role_id`; retry zwiększa `attempts[]`, nie liczbę arbitrów.
5. Jeden `dispatch_id` odpowiada jednemu source gate i targetowi; ponowna próba nie może zmienić targetu.
6. Item może przejść `ready → in_progress → completed|blocked`; nie wraca wstecz bez osobnego, jawnego reset protocol.
7. Dashboard i raporty są projekcjami `gate_history`; nigdy nie sterują resume.

## 4. Sekwencje decyzji

### 4.1 Zgodność głównego agenta i advisora

```text
Workflow      Evaluator        Repository       Advisor       Runner       Dispatcher
   | gate         |                |                |             |              |
   |------------->| key/reuse      |                |             |              |
   |              |--lock+CAS----->| advisor_pending + attempt    |              |
   |              |-------------------------------->| invoke      |              |
   |              |<--------------------------------| A/high      |              |
   |              |--lock+CAS----->| decided(actor=advisor)       |              |
   |              |------------------------------->|             |              |
   |              |---------------------------------------------->| verify/report|
   |<-------------| continue      terminal+reports durable        |              |
   | apply choice + enqueue same dispatch_id                       |              |
   |---------------------------------------------------------------------------->|
   |<----------------------------------------------------------------------------| ack
   | start next work item in the same turn                                         |
```

Arbiter calls = 0, user-gate calls = 0. Zapis `decided` następuje przed raportami, cursorem i dispatch'em.

### 4.2 Rozbieżność i jeden logiczny arbiter

```text
Evaluator -> Repository: advisor_pending + advisor attempt started
Evaluator -> Advisor: original=A, ordered options
Advisor --> Evaluator: B/high/no escalation
Evaluator -> Repository: advisor response + arbiter_pending
Evaluator -> Repository: one logical_arbiter_id + attempt 1 started
Evaluator -> Arbiter: only {A + rationale, B + rationale}
Arbiter --> Evaluator: timeout
Evaluator -> Repository: attempt 1 failed; backoff; attempt 2 started
Evaluator -> Arbiter: same logical_arbiter_id
Arbiter --> Evaluator: A/high/no escalation
Evaluator -> Repository: decided(actor=arbiter, selected=A)
Evaluator -> Runner: verify terminal record and project
Runner --> Workflow: continue
```

Resume z `arbiter_pending` nie wywołuje advisora i nie tworzy nowego `logical_arbiter_id`.

### 4.3 Fail-closed

Denylista omija role i automatyczny runner. Low confidence, `escalate_to_user: true`, exhaustion, invalid output po limicie, unsupported capability lub błąd legalnego commitu kończą się `user_gate` w sesji interaktywnej albo `blocked`. Nie wolno przesunąć itemu/fazy ani utworzyć dispatchu.

## 5. Same-phase i next-phase continuation

### Same phase

1. Workflow materializuje stabilne inventory z artefaktu i zapisuje `inventory_version`.
2. Po terminalnym gate idempotentnie zapisuje wybór w itemie N i oznacza go `completed`.
3. Ponownie oblicza zależne inventory; istniejące ID nie zmieniają znaczenia.
4. Następny item N+1 przechodzi do `ready`, a outbox otrzymuje deterministyczny `dispatch_id` związany z source gate i targetem.
5. Dispatcher ustanawia checkpoint N+1, receiver deduplikuje ID i zapisuje ack.
6. Binding zwraca `continue`; loop od razu renderuje lub wykonuje N+1 bez pytania o kontynuację.

### Next phase

1. Runner po raportach atomowo oznacza source `completed`, target `in_progress`, aktualizuje `current_phase`, timestamps i continuation intent.
2. Workflow tworzy `phase_entry` outbox item z deterministycznym `dispatch_id`.
3. Dispatcher uruchamia body target phase i zapisuje obserwowalny checkpoint startu.
4. Ack zamyka receipt. Samo ustawienie `current_phase` bez checkpointu nie jest dowodem wejścia do fazy.

Phase-entry self-check akceptuje terminalny automatyczny rekord + zgodny applied transition/receipt jako równoważny dowód wobec historycznego user-question call ID.

## 6. Persistence, awarie i recovery

Kanoniczna kolejność:

```text
1. lock + read + schema/invariant validation
2. pending + attempt started; revision++ ; atomic fsync+rename
3. role response/attempt result; revision++
4. full terminal gate + continuation intent; revision++
5. dashboard/report projection from persisted state
6. apply selection + work cursor or phase transition + outbox; revision++
7. dispatch(target, same dispatch_id)
8. durable acknowledgement/checkpoint; revision++
```

| Crash window | Stan po restarcie | Recovery |
|---|---|---|
| Przed pending write | Brak nowej historii | Bezpiecznie rozpocząć gate |
| Po `attempt: started` | Pending attempt | Zamknąć jako interruption/timeout i zużyć slot |
| Po odpowiedzi advisora | Persisted response | Nie ponawiać zakończonej roli |
| W `arbiter_pending` | Jeden logical arbiter | Ponowić wyłącznie jego następną próbę |
| Po terminalnym gate, przed raportem | `decided`, brak projekcji | Regenerować raport bez modelu i bez duplicate history |
| Po raporcie, przed outbox | Terminal + projekcje | Idempotentnie zastosować wybór i utworzyć target |
| Po outbox, przed efektem | `pending` dispatch | Retry ten sam `dispatch_id` |
| Po efekcie, przed ack | Niepewny transport | Receiver deduplikuje `dispatch_id`, następnie zapisuje ten sam ack |
| Po ack | Target checkpoint durable | Reuse i kontynuacja bez redispatchu |

Invalid payload, changed terminal selection i invalid transition są odrzucane przed legalnym commitem z byte-exact zachowaniem state, raportów, modes i topologii katalogów. Awaria po terminalnym commicie nie cofa decyzji; recovery dokańcza projekcję lub continuation.

## 7. Concurrency i state repository

Wspólny `state-repository` jest małym, bezpośrednio używanym modułem, nie generyczną warstwą persistence. Zapewnia:

- jeden project-local advisory/exclusive lock dla ścieżki state;
- timeout locka kończący się bez mutacji;
- parse + exact-schema + invariant validation pod lockiem;
- `expected_revision` compare-and-swap;
- zapis do pliku tymczasowego w tym samym katalogu, `fsync`, atomic rename i opcjonalny directory `fsync`;
- zachowanie mode/ownership zgodnie z istniejącym kontraktem;
- wzrost `revision` dokładnie raz na legalny commit.

Evaluator zwalnia lock przed długim role call'em, ponieważ pending jest już trwały. Po odpowiedzi ponownie bierze lock i używa CAS; konflikt revision powoduje reread i idempotency resolution, nie blind overwrite. Runner działa dopiero na terminalnym recordzie i również używa CAS. Nie ma jednoczesnej, długo trzymanej transakcji przez model, raporty i host dispatch.

## 8. Migracja call sites i build projection

Migracja powinna następować pionami, bez bezpośrednich edycji generated variants:

1. **Canonical schema/runtime:** `plugins/maister/skills/orchestrator-framework/` — evaluator, repository, runner i zsynchronizowane references/fixtures.
2. **Research tracer:** Phase 4 materializuje dwa work itemy, korzysta z binding result i usuwa wymaganie UI call ID na poprawnej ścieżce auto.
3. **Pozostałe call sites:** product-design, development, migration i performance przyjmują ten sam gate envelope; tylko workflow-specific inventory/routing pozostaje lokalne.
4. **Codex adapter:** nowe host binding/harness w `platforms/codex-cli/`; `advisor.toml` pozostaje read-only profilem.
5. **Build projection:** `platforms/codex-cli/build.sh` jawnie kopiuje wymagane runtime files; `make build` regeneruje `plugins/maister-codex/`.
6. **Parity:** wspólne contract tests uruchamiają source i generated runners; drugi clean build ma zero diff.

Backward refinement z product-design nie jest częścią tej naprawy. Forward-only phase transition pozostaje niezmieniony; ewentualny reset protocol wymaga osobnej decyzji.

## 9. Bezpieczeństwo

- Hard denylista jest sprawdzana przez evaluator i ponownie przez runner; denylisted gate nie wywołuje roli, auto continuation ani dispatchu.
- Exact allowlists obejmują gate context, czteropolowy output ról, actor/confidence, terminal record, target kind i phase transition.
- Ścieżki state/report są canonicalizowane i ograniczone do task root; symlink/path traversal są odrzucane.
- Advisor i arbiter mają read-only context, nie dostają shella, writerów ani mutable artifact handles.
- Model output jest danymi, nigdy fragmentem komendy; runner przyjmuje JSON na stdin albo `--input-file`.
- Low confidence i eskalacja nie mogą zostać automatycznie podwyższone lub wyciszone.
- Retry ma skończony budżet i exponential backoff; exhaustion kończy się manual/block.
- Logi i decision summary przechowują provenance, ale nie powinny kopiować sekretów ani niepotrzebnego pełnego promptu.

## 10. Architektura testów

| Warstwa | Dowód | Kluczowe przypadki |
|---|---|---|
| Evaluator unit/contract | Wykonywalna FSM z fake role port i call logiem | agreement; oba wyniki arbitra; retry; resume pending; low/escalation; denylist |
| Repository/runner contract | Atomic writes, full record reuse, report/transition recovery | rich real-state fixtures; CAS conflict; changed selection; byte-exact rejection |
| Workflow integration | Fake dispatcher i trwały receipt | dwa zależne same-phase itemy; next phase; crash przed/po ack; dedupe |
| Codex adapter integration | Native binding z fake rolami/UI spy | `continue|user_gate|blocked`; UI=0 na success; dokładny payload/exit/stdout |
| Build/parity | Source → generated | clean double build; source/generated contract matrix; manifest/runtime wiring |
| Host-native Codex E2E | Rzeczywisty host, fake tylko role/dispatcher | agreement + disagreement; same-phase + next-phase; no UI; resume; real checkpoint |

Capability E2E zwraca `77`, gdy runtime jest niedostępny. Tylko exit `0` z rzeczywistego Codex entrypointu jest dowodem `supported`; shared Node test ani smoke prose nie wystarcza.

## 11. Rollout i tracer bullet

### Tracer bullet

1. Wprowadzić schema v2, `current_phase`, `revision` i repository oraz migrację jednego realnego research fixture.
2. Zaimplementować evaluator agreement z fake advisor portem i pełnym terminalnym recordem.
3. Zmienić runner na consume/verify terminal record, zachowując report recovery.
4. Zmaterializować dokładnie dwa research decision areas; po pierwszym gate utworzyć durable dispatch do drugiego i potwierdzić `continue` bez UI.
5. Dodać disagreement z jednym logicznym arbitrem i oboma legalnymi wynikami.
6. Dodać next-phase target oraz failure injection dla raportu, transition i dispatchu.
7. Włączyć cienki Codex binding za capability `unsupported`, uruchomić clean build i pełną walidację.
8. Wykonać realny Codex E2E; dopiero po zielonym dowodzie zmienić capability na `supported` i sprawdzić projekcję.

### Rollout gates

- **R0 — schema contract:** rich fixtures i migracja przechodzą; brak call-site flipu.
- **R1 — shared runtime:** evaluator/runner/repository tests zielone; stara manualna ścieżka nadal działa.
- **R2 — research tracer:** dwa itemy automatycznie przechodzą z logicznym exactly-once.
- **R3 — Codex binding:** adapter integration i build parity zielone, capability nadal `unsupported`.
- **R4 — native proof:** realny host-E2E obserwuje no UI i oba rodzaje dispatchu; capability flip w osobnym, małym commicie.
- **R5 — broader migration:** pozostałe workflowy migrowane po jednym, z własnym inventory testem.

Rollback przed R4 polega na pozostawieniu capability `unsupported` i użyciu manualnego/user gate fallbacku. Nie należy degradować denylisty ani omijać terminalnego audit recordu, aby ratować automatyzację.

## 12. Kryteria akceptacji projektu

Projekt jest wdrożony poprawnie dopiero, gdy:

- agreement daje `final_actor: advisor`, zero arbitra, zero UI i rozpoczyna następny target;
- disagreement daje jeden logical arbiter, legalny wynik, zero UI i następny target;
- resume nie powiela historii, zakończonych role calls ani logicznego efektu dispatchu;
- same-phase i next-phase mają obserwowalny, trwały checkpoint;
- denylista/low/escalation/exhaustion/unsupported pozostają fail-closed;
- invalid input i zmieniona terminalna decyzja zachowują byte-exact stan;
- source i generated variants przechodzą contract matrix oraz clean rebuild;
- capability Codex jest `supported` wyłącznie po zielonym host-native E2E.

## 13. Powiązane decyzje i źródła

- [Decision log](decision-log.md)
- [Research report](research-report.md)
- [Solution exploration](solution-exploration.md)
- `../analysis/synthesis.md`
- `../analysis/findings/01-gate-state-contract.md`
- `../analysis/findings/02-continuation-dispatch.md`
- `../analysis/findings/03-codex-host-adapter.md`
- `../analysis/findings/04-verification-safety.md`
- `.maister/docs/project/architecture.md`
- `.maister/docs/standards/global/build-pipeline.md`
- `.maister/docs/standards/testing/test-writing.md`
