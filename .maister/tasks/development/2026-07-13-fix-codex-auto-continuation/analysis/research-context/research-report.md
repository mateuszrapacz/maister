# Raport badawczy: jak naprawić automatyczną kontynuację Codex

## TL;DR

To powinno działać automatycznie i naprawa jest jednoznaczna: zgodność rekomendacji kończy gate decyzją advisora; rozbieżność uruchamia dokładnie jednego logicznego arbitra; poprawny wynik jest trwale commitowany i natychmiast przekazywany do następnego problemu lub fazy bez kliknięcia użytkownika.
Brakującym elementem nie jest sam wybór opcji, lecz wykonywalny łańcuch `evaluator → runner → adapter Codex → workflow loop`.
`phase-continue.mjs` pozostaje bezpieczną granicą commitu i transition — **runner commit nie jest dispatcherem**.
Po sukcesie adapter musi zwrócić sterowanie do pętli workflow w tej samej turze; zakończenie odpowiedzi po stdout runnera jest obecnym punktem awarii.

## Key Decisions

- Zaimplementować wspólny, wykonywalny evaluator agreement/arbitration zamiast polegać wyłącznie na instrukcjach Markdown.
- Ujednolicić canonical state: `current_phase`, pełny `gate_history`, trwały work-item cursor i continuation receipt.
- Zachować ścisły podział: evaluator wybiera, runner utrwala, Codex adapter wykonuje transport, workflow loop routuje następną pracę.
- Potwierdzić obie kontynuacje: kolejny problem w tej samej fazie i faktyczne wejście do następnej fazy.
- Flip `unsupported → supported` wykonać dopiero po zielonym, rzeczywistym Codex E2E.

## Open Questions / Risks

- Stabilny headless entrypoint Codex i mechanizm wstrzyknięcia fake role invokera wymagają implementacyjnego spike'a.
- Exact schema pełnego rekordu i receipt trzeba skonsolidować w jednym module/fixture, żeby uniknąć kolejnego rozjazdu prose–runtime.
- Exactly-once dotyczy logicznego efektu; fizyczny dispatch może być ponowiony po przerwaniu, ale zawsze z tym samym `dispatch_id` i deduplikacją.
- Product-design backward refinement wymaga osobnego reset protocol; nie powinien być przemycony jako osłabienie forward-only runnera.

## 1. Odpowiedź: docelowe zachowanie

Dla każdego bezpiecznego, niedenylistowanego gate'u `fully_automatic`:

1. Główny agent tworzy stabilny gate context: `phase_id`, `gate_type`, dokładne pytanie, uporządkowane opcje, `original_recommendation`, safety i read-only context.
2. Evaluator zapisuje `advisor_pending` i próbę `started`, po czym wywołuje read-only advisora.
3. Jeśli advisor zwraca dokładnie `original_recommendation`, `confidence: high|medium` i `escalate_to_user: false`, evaluator zapisuje terminalne `decided`, `final_actor: advisor`. Arbiter i user UI nie są wywoływani.
4. Jeśli advisor wskazuje inną opcję, evaluator tworzy jeden logiczny rekord `arbiter` i wywołuje go. Retry są kolejnymi `attempts[]` tego samego arbitra; advisor nie jest wywoływany ponownie.
5. Arbiter może wybrać wyłącznie rekomendację głównego agenta albo advisora. Poprawny `high|medium`, bez eskalacji, kończy gate aktorem `arbiter`.
6. Pełny terminalny rekord jest trwale zapisany przed raportami i przed continuation.
7. Runner waliduje terminalny rekord, regeneruje raporty i — dla exit gate'u — atomowo przełącza fazę.
8. Adapter Codex sprawdza exit/stdout runnera i zwraca `continue`, nie kończy tury i nie pokazuje pytania.
9. Workflow loop ponownie czyta canonical state, stosuje wybór do bieżącego work itemu, przesuwa trwały cursor i natychmiast dispatchuje następny problem albo body następnej fazy.
10. Dopiero brak kolejnej pracy albo finalna, zawsze user-controlled bramka kończy automatyczny ciąg.

To dokładnie realizuje regułę użytkownika. Nie należy symulować kliknięcia ani wywoływać user gate na ścieżce sukcesu.

## 2. Obecny łańcuch awarii

```text
workflow gate call site
  → instrukcje agreement/arbitration w Markdown
  → profil advisora w advisor.toml
  → [BRAK wykonywalnego evaluatora/adaptera Codex]
  → phase-continue.mjs (jeżeli zostanie wywołany ręcznie)
      ├─ terminalny commit
      ├─ raporty
      ├─ opcjonalna zmiana current_phase
      └─ stdout JSON + process exit
  → [BRAK consumer → apply effect → advance cursor → dispatch]
```

Konkretnie:

- `platforms/codex-cli/templates/advisor.toml:5-18` opisuje rolę i `phase_continue(selected_option)`, ale jest tylko promptem.
- `platforms/codex-cli/build.sh:135-151,315-331` kopiuje/generuje instrukcje i waliduje wpis capability, lecz nie buduje executable bindingu.
- `platforms/codex-cli/smoke-cli.sh:66-89` sprawdza frazy, nie wykonanie.
- `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh` zawsze kończy się `77`.
- `phase-continue.mjs:741-800` po zapisie/raportach/transition wypisuje JSON i kończy proces.
- Bez `next_phase` runner nie przesuwa kursora. Z `next_phase` zmienia state fazy, ale nie uruchamia handlera fazy.
- Call sites research/product-design mają prose „record choice, move to next area”, lecz nie mają durable same-phase cursor ani executable dispatch consumer.
- Phase-entry self-checki wymagające call ID pytania użytkownika są sprzeczne z poprawnym terminalnym auto gate'em.

**Finding: high confidence.** Baseline: gate prose tests, shared runner i contract tests przechodzą; Codex E2E zwraca `77`, a capability poprawnie pozostaje `unsupported`.

## 3. Jednoznaczny algorytm decyzyjny

### 3.1 Agreement

Warunki konieczne jednocześnie:

- gate nie jest na hard denyliście;
- effective policy to `fully_automatic`;
- host capability jest zweryfikowane;
- output advisora ma dokładnie cztery dozwolone pola;
- `selected_option` jest dokładnym elementem `options`;
- `selected_option === original_recommendation` (exact string);
- `confidence ∈ {high, medium}`;
- `escalate_to_user === false`.

Efekt: jeden terminalny rekord, `status: decided`, `final_actor: advisor`; `arbiter_calls=0`, `user_gate_calls=0`.

### 3.2 Disagreement

Gdy poprawna rekomendacja advisora różni się od pierwotnej:

- zapisz wynik advisora przed arbitrażem;
- utwórz jeden `logical_arbiter_id` i jedną mapę `arbiter`;
- przekaż obie opcje i oba uzasadnienia;
- dozwolony output arbitra to wyłącznie jedna z tych dwóch opcji;
- malformed/timeout to kolejna próba w `arbiter.attempts[]`, nie nowy arbiter;
- resume `arbiter_pending` nie wywołuje advisora i nie tworzy nowego logical arbitra;
- poprawny wynik kończy gate z `final_actor: arbiter`.

### 3.3 Fail-closed

| Warunek | Terminalne zachowanie | Czego nie wolno zrobić |
|---|---|---|
| Hard denylist | `user_pending` albo noninteractive `blocked` | advisor, arbiter, auto runner, dispatch |
| Low confidence | user fallback albo `blocked` | automatyczny wybór |
| `escalate_to_user: true` | user fallback albo `blocked` | obniżenie eskalacji |
| Retry exhaustion | user fallback albo `blocked` | nieskończony retry lub approval |
| Invalid option/schema | retry w limicie, potem fallback/block | terminalny selection commit |
| Unsupported capability | manual/block | udawana automatyczna kontynuacja |
| Persistence/runner error | stop i resumable state | przesunięcie kursora/fazy |

**Finding: high confidence.** Reguły są już normatywnie opisane w `gate-decision-engine.md:266-300`; brak ich executable realization.

## 4. Kanoniczny kontrakt state/history/continuation

### 4.1 Faza

Użyć `orchestrator.current_phase` jako jedynego mutowalnego kursora fazy. Musi wskazywać dokładnie jedną fazę `in_progress` w `phases[]`. `started_phase` należy usunąć albo zmienić na niemutowalne `initial_phase`; nie może konkurować z kursorem wykonania.

### 4.2 Gate history

Jeden gate = jeden rekord o stabilnym idempotency key. Rekord przechodzi pending → terminal przez update, nie append duplikatu. Pełny envelope powinien obejmować:

```yaml
schema_version: 1
idempotency_key: sha256:...
phase_id: phase-4
gate_type: research-convergence
question: "..."
options: [A, B, "Need more info"]
original_recommendation: A
policy: fully_automatic
safety_classification: configurable
status: decided
selected_option: B
final_actor: arbiter
advisor:
  agent: advisor
  model: "..."
  response: {selected_option: B, rationale: "...", confidence: high, escalate_to_user: false}
  attempts: []
  exhausted: false
arbiter:
  logical_arbiter_id: sha256:...
  agent: arbiter
  model: "..."
  response: {selected_option: B, rationale: "...", confidence: high, escalate_to_user: false}
  attempts: []
  exhausted: false
confidence: high
rationale: "..."
continuation:
  kind: same_phase_work_item
  target: decision-area:persistence-boundary
  status: pending
error: null
```

Runner nie powinien syntetyzować `original_recommendation = selected_option` ani rationale zastępczego. Powinien odczytać pełny terminalny rekord i zweryfikować zgodność payloadu z nim.

### 4.3 Same-phase cursor

Lista decision areas/problemów musi zostać zmaterializowana w state ze stabilnymi identyfikatorami:

```yaml
decision_areas:
  - id: execution-owner
    ordinal: 1
    status: completed
    gate_key: sha256:...
    chosen_approach: host-workflow-loop
  - id: persistence-boundary
    ordinal: 2
    status: ready
    gate_key: null
    chosen_approach: null
```

Continuation target zawiera `work_item_id`, `source_gate_key`, `dispatch_id` i status `ready|in_progress|completed|blocked`. Ordinal jest informacyjny, nie stanowi identity.

### 4.4 Kolejność durability

```text
1. pending + attempt started (atomic state)
2. role response / attempt result (atomic state)
3. pełny terminal gate + continuation pending (atomic state)
4. dashboard/report projections from persisted state
5. apply selection + cursor/phase transition intent (atomic state)
6. dispatch(target, dispatch_id)
7. applied/completed receipt (atomic state)
```

Awaria po kroku 3 nie cofa decyzji. Resume regeneruje brakujące projekcje i kontynuuje z tego samego rekordu. Odrzucenie przed legalnym commitem musi zachować byte-exact state/report/modes/topology.

**Finding: high confidence** dla wymaganych danych i kolejności; **medium-high** dla dokładnego kształtu YAML.

## 5. Podział odpowiedzialności

| Komponent | Odpowiada za | Nie odpowiada za |
|---|---|---|
| `gate-evaluate` / evaluator | idempotency, policy, denylist, role calls, validation, agreement, jeden arbiter, retry, terminal result | domenowy next-item routing |
| `phase-continue.mjs` | canonical-state preflight, terminal reuse/commit verification, raporty, forward phase transition | wywoływanie modeli, decision-area selection, host turn |
| Codex adapter | native delegation port, exact JSON transport, runner exit/stdout validation, outcome `continue|user_gate|blocked` | własny schema, własny cursor, wybór następnego problemu |
| Workflow loop | apply gate effect, stable work-item cursor, next target, natychmiastowy dispatch | ponowna implementacja gate safety |

Najważniejszy warunek implementacyjny: **successful adapter execution must return control to the workflow loop without ending the turn**. Jeśli adapter po runner exit `0` zwróci finalną odpowiedź użytkownikowi, błąd pozostanie mimo poprawnego commitu.

## 6. Same-phase kontra next-phase

### Same-phase: kolejny problem/decision area

`next_phase` nie może być użyty, bo target jest tą samą fazą i runner odrzuca self-transition. Poprawny flow:

1. Commit terminal gate dla area N.
2. Idempotentnie zapisz `chosen_approach`, `gate_key`, `status: completed`.
3. Po zastosowaniu wyboru ponownie wylicz dozwolone alternatywy area N+1.
4. Ustaw N+1 `ready` z trwałym `dispatch_id`.
5. Adapter zwraca `continue`; workflow loop natychmiast rozpoczyna N+1 w tej samej turze.

Nie wolno pre-renderować wszystkich areas, bo późniejsze mogą zależeć od wcześniejszych wyborów.

### Next-phase: przejście i wejście

Runner może atomowo wykonać forward transition: source `completed`, target `in_progress`, `current_phase=target`. To nadal tylko commit. Po jego sukcesie adapter zwraca `continue`, a workflow loop uruchamia body target phase i zapisuje obserwowalny pierwszy checkpoint/artifact. Test wyłącznie na statusie fazy jest niewystarczający.

**Finding: high confidence.** Runner commit nie jest dispatcherem; to wynika z kodu `main()` i braku domenowych/hostowych portów.

## 7. Dokładna mapa zmian per plik

### Canonical framework — edytować

| Plik | Zmiana |
|---|---|
| `plugins/maister/skills/orchestrator-framework/bin/gate-evaluate.mjs` (nowy) | Wykonywalna state machine agreement/arbitration/retry/resume z portem role invoker i pełnym terminalnym rekordem. |
| `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` | Konsumowanie/weryfikacja pełnego terminalnego rekordu; wspólny schema; `current_phase`; continuation intent/receipt; bogatszy, ścisły stdout bez dispatchu domenowego. |
| `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md` | Zsynchronizować schema z executable evaluatorem, ownership terminal recordu, retry jednego arbitra i recovery po projekcjach. |
| `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` | `current_phase` zamiast `started_phase`; cursor/dispatch contract; auto gate jako legalny phase-entry proof; wyraźny „do not end turn”. |
| `plugins/maister/skills/orchestrator-framework/references/gate-decision-fixtures.yml` | Pełne executable inputs/expected state/call counts zamiast samych deklaracji. |
| `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml` | Bez zmiany na początku; `codex: supported` wyłącznie po zielonym native E2E. |

### Workflow call sites — edytować

| Plik | Zmiana |
|---|---|
| `plugins/maister/skills/research/SKILL.md` | Terminal result zamiast „If user picks”; stable decision-area inventory/cursor; sukces runnera wraca do loop; phase self-check akceptuje auto record/receipt. |
| `plugins/maister/skills/product-design/SKILL.md` | Ten sam shared same-phase loop; osobny jawny reset dla backward refinement. |
| `plugins/maister/skills/development/SKILL.md` | Scope decisions jako work items; runner success consumer; auto phase-entry proof. |
| Pozostałe orchestratory używające wspólnego kontraktu | Migracja `started_phase → current_phase`, pełny gate envelope i entry checks według inventory wyszukiwania. |

### Codex adapter — edytować/dodać

| Plik | Zmiana |
|---|---|
| `platforms/codex-cli/` nowy binding/loop | Port native role invocation, call evaluator, exact runner transport, validate stdout, return `continue` bez UI/end turn. |
| `platforms/codex-cli/templates/advisor.toml` | Pozostawić read-only profil; wskazać rzeczywisty adapter/port, nie udawać implementacji prose. |
| `platforms/codex-cli/build.sh` | Kopiować nowy runtime/binding do generated target i walidować jego obecność. |
| `platforms/codex-cli/smoke-cli.sh` | Sprawdzać executable binding i wiring, nie tylko frazy. |
| `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh` | Zastąpić `exit 77` realnym host-native testem; `77` tylko gdy runtime naprawdę niedostępny. |

### Testy — edytować/dodać

| Plik | Zmiana |
|---|---|
| `tests/gate-decision-engine.test.sh` | Dodać executable evaluator tests z licznikami advisor/arbiter/UI. |
| `tests/fixtures/gate-evaluator/` (nowy) | Agreement, oba wyniki arbitra, retry, resume, denylist, low/escalation, full expected record. |
| `tests/phase-continue-contract.test.sh` | Rich real-state fixtures, continuation receipt, crash windows, byte-exact rejection. |
| `tests/fixtures/phase-continue/*.yml` | Stany zgodne z realnymi workflowami, pełny advisor/arbiter audit i `current_phase`. |
| Nowy workflow-loop/dispatch contract test | Dwa same-phase work items, phase entry, `dispatch_id` dedupe i resume. |
| Nowy Codex adapter integration test | Fake role invoker + fake dispatcher, bez rzeczywistego modelu. |
| `Makefile` | Włączyć szybkie testy; zachować host-native target jako jedyny capability proof. |

### Generated effects — nie edytować bezpośrednio

`plugins/maister-codex/`, `plugins/maister-cursor/` i `plugins/maister-kiro/` są wynikami `make build`. Po zmianie canonical/adapters uruchomić build, sprawdzić diff i `make validate`. Nowe bindingi Codex muszą mieć jawne reguły copy, bo build odtwarza target.

## 8. Kolejność implementacji

1. **Schema i fixtures:** ustalić pełny gate envelope, `current_phase`, continuation/work-item receipt; dodać real-state fixtures.
2. **Executable evaluator:** agreement, disagreement, jeden arbiter, retry/resume, denylist; testy bez hosta.
3. **Runner contract:** runner weryfikuje utrwalony terminal record, raporty i phase transition; nie rekonstruuje audytu.
4. **Workflow loop tracer bullet:** dwa zależne same-phase items, apply effect, cursor, `dispatch_id`, resume.
5. **Codex adapter integration:** native port abstraction + fake role/dispatcher; po runner success outcome `continue` wraca do loop.
6. **Call-site migration:** research, product-design, development i inne inventory; naprawa phase-entry self-checków.
7. **Build projection:** adapter runtime do generated Codex; shared variants regenerowane deterministycznie.
8. **Host-native Codex E2E:** agreement, arbiter, same-phase, next-phase, resume i UI spy.
9. **Capability flip:** dopiero po `exit 0`, reproducible build i pełnym validate.

Ta kolejność ogranicza ryzyko: najpierw jeden kontrakt i szybkie dowody, potem host binding i capability.

## 9. Wykonywalna macierz testów

| Scenariusz | Poziom | Wymagane pozytywne asercje | Wymagane negatywne asercje |
|---|---|---|---|
| Advisor zgadza się | evaluator + Codex E2E | actor advisor; 1 terminal record; reports; next dispatch | arbiter 0; UI 0; brak duplikatów |
| Arbiter wybiera original | evaluator + adapter | 1 logical arbiter; selected original; continuation | advisor nie retry po disagreement; UI 0 |
| Arbiter wybiera advisor | evaluator + adapter | 1 logical arbiter; selected advisor | brak trzeciej opcji; UI 0 |
| Następny decision area | loop + Codex E2E | N completed; N+1 ready/started; ten sam turn | brak phase completion; brak double dispatch |
| Następna faza | runner + Codex E2E | transition + pierwszy checkpoint target phase | brak końca po samym transition |
| Advisor retry | evaluator | persisted attempts/backoff; final advisor | limit nieprzekroczony; brak arbitra bez disagreement |
| Arbiter retry | evaluator | jeden logical arbiter, wiele attempts | advisor nie wywołany ponownie |
| Resume pending | evaluator | ten sam key/role/budget | brak resetu prób/nowej roli |
| Retry exhaustion | evaluator + adapter | user_pending albo blocked | runner/dispatch 0 |
| Report failure | runner | terminal trwały; retry regeneruje i kontynuuje raz | brak duplicate history |
| Transition failure | runner | retry stosuje transition raz | brak dwóch active phases |
| Dispatch failure | adapter/loop | ten sam dispatch_id, idempotent effect | brak nowego gate/efektu logicznego |
| Denylist | wszystkie poziomy | manual/blocked | advisor 0; arbiter 0; runner 0; dispatch 0 |
| Low/escalation | evaluator | manual/blocked | brak automatic selection |
| Invalid output/option | evaluator | bounded retry/fallback | brak selection commit |
| Changed terminal selection | runner | non-zero | byte-exact state/reports/modes/topology |
| Build projection | build | adapter obecny; drugi build no diff | brak ręcznych generated edits |
| Unsupported runtime | capability | E2E exit 77 | declared/projected supported niemożliwe |

### Deterministyczne porty testowe

Fake role invoker przyjmuje ten sam immutable context co native Codex i zwraca dokładnie czteropolowy YAML. Call log zapisuje `gate_key`, rolę, `logical_arbiter_id`, attempt i input hash. Fake dispatcher deduplikuje po `dispatch_id` i zapisuje attempt/ack. UI spy failuje natychmiast, jeśli pozytywna ścieżka `fully_automatic` wywoła pytanie.

Host-native E2E musi nadal uruchomić rzeczywisty Codex entrypoint; fake zastępuje tylko niedeterministyczny model, nie host ani workflow loop.

## 10. Kryteria akceptacji

Naprawa jest kompletna tylko wtedy, gdy:

- zgodność original/advisor automatycznie wybiera opcję, z aktorem `advisor`, bez arbitra i UI;
- rozbieżność uruchamia jeden logical arbiter, a oba legalne rozstrzygnięcia mają executable test;
- pełny terminalny audyt i raporty są trwałe przed continuation;
- kolejny problem/decision area rzeczywiście zaczyna się w tej samej turze;
- next-phase test obserwuje body/checkpoint nowej fazy, nie tylko zmianę statusu;
- resume/retry nie duplikuje historii, logical arbitra ani logicznego dispatchu;
- denylista, low confidence, escalation, exhaustion, invalid state/output i failure paths pozostają fail-closed;
- realny workflow state przechodzi ten sam strict schema bez ad-hoc transformacji adaptera;
- `make build && make validate` przechodzi bez generated drift;
- Codex host-native E2E kończy się `0`; przy braku runtime kończy się `77` i capability pozostaje unsupported.

## 11. Rollout i reguła capability flip

Rollout powinien mieć trzy bramki:

1. **Shared contract ready:** evaluator, runner, schema, fixtures i loop integration są zielone; Codex nadal `unsupported`.
2. **Codex integration ready:** fake-port adapter integration i reproducible build są zielone; Codex nadal `unsupported`.
3. **Native evidence ready:** realny Codex E2E obserwuje agreement, arbitration, same-phase i next-phase continuation, brak UI oraz resume; dopiero wtedy zmienić `host-capabilities.yml` na `supported`.

Nie używać ręcznego override, smoke frazy ani shared runner testu jako substytutu bramki 3. Makefile już poprawnie odróżnia `exit 0`, `77` i failure — zachować ten fail-closed projection.

## 12. Ryzyka, luki i confidence

| Finding | Confidence | Ryzyko / luka |
|---|---|---|
| Brak executable Codex adaptera jest pierwotnym blockerem | High | Brak stabilnego native harnessu |
| Runner commit nie jest dispatcherem | High | Łatwo omyłkowo uznać stdout/transition za continuation |
| Potrzebny powrót do workflow loop bez końca tury | High | Zależność od hostowego modelu execution turn |
| Agreement/jeden arbiter algorytm jest jednoznaczny | High | Dziś tylko prose-tested |
| `current_phase` powinno być canonical | High | Migracja istniejących states/resume |
| Durable same-phase cursor i dispatch_id są konieczne | High | Finalna serializacja wymaga design review |
| Exact native Codex binding shape | Medium | Potrzebny spike headless CLI/tool port |
| Exactly-once logiczny efekt przez dedupe | Medium-high | Receiver musi honorować dispatch_id |

## 13. Źródła

Główne źródła pierwszego rzędu:

- `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md`
- `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md`
- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`
- `plugins/maister/skills/research/SKILL.md`
- `plugins/maister/skills/product-design/SKILL.md`
- `plugins/maister/skills/development/SKILL.md`
- `platforms/codex-cli/templates/advisor.toml`
- `platforms/codex-cli/build.sh`
- `platforms/codex-cli/smoke-cli.sh`
- `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh`
- `tests/gate-decision-engine.test.sh`
- `tests/fully-automatic-phase-continue.test.sh`
- `tests/phase-continue-contract.test.sh`
- `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml`
- `.maister/tasks/research/2026-07-13-issue-tracker-workflow/analysis/codex-fully-automatic-diagnosis.md`

Pełne dowody cząstkowe znajdują się w `../analysis/findings/01-gate-state-contract.md`, `02-continuation-dispatch.md`, `03-codex-host-adapter.md` i `04-verification-safety.md`.
