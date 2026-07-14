# Weryfikacja, resume i granice bezpieczeństwa

## TL;DR
Istniejące testy dobrze dowodzą strict payload, terminal persistence, report recovery, phase transition i denylist w shared runnerze, ale testy gate engine są głównie asercjami na prose/fixtures, nie wykonaniem advisor/arbitration.
Brakuje testu, który uruchamia Codex, obserwuje brak user UI i potwierdza realny dispatch kolejnego problemu; obecny target zawsze zwraca `77`.
Macierz akceptacji musi osobno pokryć agreement, oba wyniki arbitra, same-phase cursor, next phase, retry/resume oraz transactional failure.
Bezpieczeństwo wymaga byte-exact non-mutation dla odrzuceń przed commit oraz trwałego, idempotentnego recovery dla awarii po terminalnym commit; tych dwóch klas nie wolno mieszać.

## Key Decisions
- Rozdzielić testy na executable evaluator/unit, runner contract, adapter integration i prawdziwy Codex host-E2E; tylko ostatni poziom jest dowodem capability.
- Używać deterministic fake role invoker z call logiem oraz deterministic fake dispatcher z `dispatch_id`, zamiast rzeczywistego modelu.
- Dla same-phase continuation dodać durable cursor/dispatch receipt; asercja tylko na `gate_history` nie dowodzi przejścia do następnego problemu.
- Dla invalid input/changed selection/invalid transition wymagać byte-exact state, reports, modes i directory topology; dla report/dispatch failure wymagać zachowania już zatwierdzonego terminal recordu i dokładnie-jednego recovery.
- Denylisted gate ma dowodzić braku wywołania advisora, arbitra, runner continuation i dispatchu; nie wystarczy sam non-zero exit.

## Open Questions / Risks
- Exactly-once zewnętrzny dispatch nie jest osiągalny samym zapisem state; odbiorca musi deduplikować `dispatch_id`. Test powinien deklarować gwarancję jako „exactly one logical dispatch/effect”, nie zakładać magicznego exactly-once transportu.
- Obecny runner zapisuje terminal record przed raportami. Report failure celowo mutuje state i jest naprawiany na resume; zastosowanie byte-exact non-mutation do tej ścieżki przeczyłoby istniejącemu recovery contractowi.
- `tests/gate-decision-engine.test.sh` nazywa przypadek „fully automatic continuation is executable”, ale sprawdza wyłącznie frazy w Markdownzie; nazwa może dawać fałszywe poczucie pokrycia.
- Real state zawiera bogatsze pola i `started_phase`, których obecne runner fixtures nie reprezentują; nowe testy muszą używać stanów wygenerowanych przez workflow, nie ręcznie zawężonego YAML.

## 1. Baseline z 2026-07-13

| Polecenie | Exit | Wynik | Co faktycznie dowodzi |
|---|---:|---|---|
| `bash tests/gate-decision-engine.test.sh` | 0 | 28 passed | Spójność normatywnego prose, katalog fixtures, wiring i syntax; nie wykonuje modelowego evaluator flow. |
| `bash tests/fully-automatic-phase-continue.test.sh` | 0 | PASS | Terminal decision, raport, phase-1 → phase-2, reuse i denylist dla shared runnera. |
| `bash tests/phase-continue-contract.test.sh` | 0 | 21 passed | Exact transport/schema, canonical-state validation, deterministic reports, non-mutation, recovery i phase transition dla source runnera. |
| `bash platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh` | 77 | UNAVAILABLE | Brak deterministycznego host-native Codex harnessu. |
| `make -s print-host-capabilities` | 0 | Codex declared/projected unsupported | Capability projection prawidłowo odpowiada niedostępnemu targetowi. |

Baseline był read-only względem źródeł. Exit `77` jest oczekiwanym fail-closed dowodem braku capability, nie niepowodzeniem shared runnera.

## 2. Co pokrywają istniejące testy

### 2.1 Shared runner: mocne dowody

`tests/fully-automatic-phase-continue.test.sh:32-46` wykonuje runner, sprawdza stdout, terminal state, raport, transition oraz reuse. Linie `48-51` potwierdzają blokadę denylisted gate.

`tests/phase-continue-contract.test.sh` ma zachowaniowe przypadki:

- `test_accepts_canonical_state_fixtures` (`:259-268`) — akceptacja dwóch wąskich fixtures;
- `test_normal_decision_writes_deterministic_reports` (`:365-374`) — deterministyczny MD/HTML i escaping;
- `test_denylist_stays_blocked_on_retry` (`:376-390`) — blocked persistence i unchanged retry;
- `test_changed_selection_is_rejected_without_mutation` (`:392-400`) — byte-exact state/report preservation;
- `test_no_transition_and_forward_transition_are_distinct` (`:417-430`) — decyzja bez `next_phase` vs transition;
- `test_report_failure_leaves_terminal_record_for_regeneration` (`:432-445`) — terminal commit przetrwał, retry regeneruje raport;
- `test_transition_failure_recovers_exactly_once` (`:447-463`) — retry transition i kolejny idempotentny reuse.

Helpery `snapshot_files`, `state_and_reports_unchanged` i `state_reports_and_directories_unchanged` (`:136-156`) realizują standard byte-exact rejection. Payload generator wprost odrzuca low confidence i obcego aktora (`:66-96`), ale nie dowodzi, kto i jak podjął decyzję przed wejściem do runnera.

Runner sam gwarantuje terminal write → reports → optional phase transition (`phase-continue.mjs:784-794`), a resume najpierw rozpoznaje terminal record, regeneruje raporty i aplikuje brakujący transition (`:741-762`). To jest dobry kontrakt durability dla faz.

### 2.2 Gate engine: deklaratywne, nie executable

`tests/gate-decision-engine.test.sh:65-110` odczytuje katalog 19 fixtures przy pomocy `awk` i potwierdza oczekiwane label/status/actor. Testy agreement/arbitration (`:173-180`), resume (`:197-203`) i persistence ordering (`:205-213`) używają `contains`/`in_order` na Markdownzie. Nie uruchamiają fake advisora ani state machine.

Szczególnie `test_fully_automatic_continuation_is_executable` (`:259-264`) sprawdza obecność fraz, nie execution. **Luka (high confidence):** agreement, oba rozstrzygnięcia arbitra, retry slots i resume pending są dziś specyfikacją, nie działającym testem algorytmu.

### 2.3 Host Codex: brak dowodu

`platforms/codex-cli/smoke-cli.sh:73-87` sprawdza template i prose. `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh:4-5` zawsze zwraca `77`. Nie ma asercji na advisor calls, arbiter calls, brak UI, runner invocation ani next dispatch.

Makefile celowo nie uznaje shared runner tests za native evidence (`Makefile:50`) i projektuje support tylko z exit `0` targetu (`Makefile:35-41`). To zabezpieczenie należy zachować.

## 3. Docelowa macierz weryfikacji

| Scenariusz | Poziom | Setup / stimulus | Pozytywne asercje | Negatywne / safety asercje |
|---|---|---|---|---|
| Advisor zgadza się | evaluator contract + Codex E2E | original=A, fake advisor=A/high/no escalation | actor=advisor; jeden terminal record; reports; cursor/transition; dispatch następnej pracy | arbiter=0; user gate/UI=0; brak duplicate history/dispatch |
| Arbiter wybiera original | evaluator contract + adapter integration | original=A, advisor=B, arbiter=A/high | jeden logical arbiter; terminal actor=arbiter, selected=A; continuation | brak drugiego arbitra; brak powrotu do advisora; UI=0 |
| Arbiter wybiera advisor | evaluator contract + adapter integration | original=A, advisor=B, arbiter=B/high | analogicznie, selected=B | brak trzeciej opcji; UI=0 |
| Kolejny decision area/problem | workflow integration + Codex E2E | area N accepted, durable collection z N+1 | choice N zapisana; cursor=N+1; `dispatch_id` ack; N+1 rzeczywiście rozpoczęty w tej samej turze | faza nie kończy się przedwcześnie; N+1 nie dispatchowany dwa razy; brak user click |
| Następna faza | runner contract + Codex E2E | phase-exit z `next_phase` | source completed; target in_progress; current_phase target; target handler rozpoczęty | brak transition przed reports; brak backward/self transition |
| Advisor transient retries | evaluator unit | timeout/malformed na próbach, potem valid | każda próba i backoff trwale zapisana; final actor advisor | liczba wywołań ≤ limit; nie tworzy arbitra bez disagreement |
| Arbiter transient retries | evaluator unit | disagreement, arbiter timeout potem valid | jeden logical arbiter record, wiele attempt records | advisor nie jest ponawiany; brak drugiego logical arbitra |
| Retry exhaustion | evaluator + adapter | wszystkie próby failure | interactive → user_pending; noninteractive → terminal blocked | runner/dispatch=0; automatic approval=0 |
| Resume `advisor_pending` | evaluator resume | interrupted started attempt | attempt zamknięty jako interruption i zużywa slot; resume następnej próby | nie restartuje completed attempt; nie zeruje backoff |
| Resume `arbiter_pending` | evaluator resume | persisted disagreement + pending arbiter | resume tego samego logical arbiter id | advisor=0 po resume; nowy logical arbiter=0 |
| Report failure | runner contract + adapter integration | inject report failure po terminal write | terminal record durable; phase/cursor nieprzesunięty; retry generuje raport i kontynuuje raz | stary raport pozostaje nieuszkodzony; duplicate history/dispatch=0 |
| Phase transition failure | runner contract | inject transition failure | terminal+reports durable; retry aplikuje transition raz | brak duplicate history; brak partially active dwóch faz |
| Same-phase dispatch failure | adapter integration | inject failure przed/po receiver ack | durable dispatch intent/receipt pozwala resume; ten sam `dispatch_id` | nie tworzy kolejnego gate; efekt logiczny dokładnie raz |
| Denylist | evaluator + runner + Codex E2E | gate_type z hard denylist | user_pending/manual albo blocked noninteractive | advisor=0; arbiter=0; automatic runner=0; dispatch=0 |
| Low confidence / escalation | evaluator | valid option, low lub escalate=true | manual/user_pending albo blocked | nie wolno obniżyć do medium; runner/dispatch=0 |
| Invalid/extra YAML, invalid option | evaluator unit | malformed fake output | retry lub terminal fallback zgodnie z limitem | state/report/source files unchanged przed pending/attempt commit poza auditem błędu; żadnego selection commit |
| Changed terminal selection | runner contract | ten sam idempotency key, inna selection | non-zero | byte-exact state, reports, modes i directories unchanged |
| Unsupported capability | adapter + capability test | phase_continuation_supported=false | manual/user_pending albo blocked | nie wywołuje automatic runner/dispatch; declared supported niemożliwe |
| Build projection | build test | clean `make build-codex` dwa razy | adapter/runtime/test references w generated target; drugi build no diff | brak bezpośredniej edycji generated tree; brak stale contract |

## 4. Fixtures i obserwowalność

Minimalny nowy katalog fixture powinien zawierać nie tylko oczekiwany actor/status, lecz pełne executable inputs i call expectations:

- `advisor-agrees.yml`;
- `arbiter-selects-original.yml`;
- `arbiter-selects-advisor.yml`;
- `advisor-retry-then-valid.yml`, `advisor-exhausted.yml`;
- `arbiter-retry-then-valid.yml`, `resume-advisor-pending.yml`, `resume-arbiter-pending.yml`;
- `same-phase-next-item.yml`, `next-phase.yml`;
- `denylisted.yml`, `low-confidence.yml`, `escalated.yml`;
- real workflow states: empty history, rich advisor terminal history, rich arbiter terminal history, pending dispatch, acknowledged dispatch.

Każdy fixture powinien definiować:

```yaml
role_script:                       # response/error per role + attempt
expected_calls:                    # advisor attempts, one logical arbiter, UI count
expected_terminal_record:          # complete normalized audit
expected_continuation:             # target + dispatch_id + final receipt
expected_files:                    # content hashes/modes/topology where relevant
```

Call log musi rozróżniać `logical_arbiter_id` od `attempt_no`: dwa retry to dwa calls, ale jeden logical arbiter. UI spy powinien failować test natychmiast po każdym `present_user_gate` na pozytywnej fully-automatic ścieżce. Dispatcher spy zapisuje próbę przed efektem i acknowledgement po efekcie; receiver deduplikuje po `dispatch_id`.

## 5. Transactional safety i kolejność commitów

Docelowa kolejność:

```text
pending/attempt state
→ validated terminal gate record (atomic)
→ dashboard/report projection (atomic per file)
→ continuation intent + cursor/phase transition (atomic canonical state)
→ dispatch(target, dispatch_id)
→ durable acknowledgement/completed receipt
```

Granice asercji:

1. **Przed pierwszym dozwolonym commit** — malformed payload/state, invalid option, changed selection, invalid transition: non-zero oraz byte-exact non-mutation wszystkich state/report files, modes i topology. Obecne testy dają dobry wzorzec (`tests/phase-continue-contract.test.sh:136-156,226-256,392-400`).
2. **Po terminal commit, przed continuation** — report failure: terminal record ma pozostać durable, stare raporty nieuszkodzone, phase/cursor nieprzesunięty. Resume nie dopisuje historii, tylko regeneruje projekcje i kontynuuje (`test_report_failure_leaves_terminal_record_for_regeneration`).
3. **Po continuation intent, przed ack** — dispatch failure: resume ponawia ten sam `dispatch_id`; idempotent receiver nie wykonuje drugi raz efektu. Bez receipt test nie może stwierdzić, czy efekt zaszedł przed przerwaniem.
4. **Denylist/low/escalation/exhaustion** — audyt pending/attempt/blocked może być legalną mutacją, ale selection, phase/cursor i dispatch pozostają niezmienione.

Atomic write runnera używa temp directory, `fsync` i rename (`phase-continue.mjs:597-616`). To chroni pojedynczy plik, nie stan+raporty+dispatch jako jedną transakcję; dlatego recovery state machine i idempotency są częścią poprawności, a nie dodatkiem.

## 6. Rozdział testów szybkie vs capability E2E

### Szybkie, obowiązkowe w każdym validate

- executable evaluator fixtures: agreement, arbitration, retry, resume, denylist;
- shared runner contract dla source i generated variants;
- adapter integration z fake role invoker i fake dispatcher;
- build/smoke assertions na obecność wykonywalnych artefaktów, nie tylko prose;
- failure injection i byte-exact/recovery assertions.

### Host-native Codex E2E — jedyny capability proof

Target `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh` powinien:

1. wykryć actual Codex runtime; przy braku zwrócić `77`;
2. zbudować/zainstalować świeży plugin lub użyć jawnej izolowanej testowej instalacji;
3. uruchomić rzeczywisty workflow/adapter Codex z fake role portem;
4. przeprowadzić co najmniej agreement + arbiter disagreement oraz same-phase + next-phase continuation;
5. obserwować canonical state, reports, role call log, UI spy i dispatch receipts;
6. sprawdzić resume/re-run bez duplicate history/dispatch;
7. zakończyć `0` tylko po wszystkich asercjach.

Nie wystarczy uruchomić `phase-continue.mjs` bez Codex hosta ani sprawdzić tekstu w generated SKILL/TOML. Ten wymóg jest już egzekwowany przez `Makefile:44-52` i `gate-decision-engine.md:36-42`.

## 7. Prawdopodobne pliki testowe do zmiany

- `tests/gate-decision-engine.test.sh` — zastąpić/uzupełnić prose-only przypadki executable evaluator tests;
- `tests/phase-continue-contract.test.sh` i `tests/fixtures/phase-continue/` — rich real-state schema, cursor/receipt i nowe failure paths;
- nowy katalog `tests/fixtures/gate-evaluator/` oraz executable evaluator suite;
- nowy adapter integration test pod `platforms/codex-cli/tests/`;
- `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh` — real host test zamiast exit 77;
- `platforms/codex-cli/smoke-cli.sh` — sprawdzenie executable binding/build projection;
- `Makefile` — wiring szybkich testów bez osłabienia osobnej capability projection.

**Confidence:** high dla luk istniejącego pokrycia, baseline i wymaganych scenariuszy safety; medium dla dokładnego mechanizmu actual Codex E2E/fake injection, ponieważ repo nie zawiera jeszcze stabilnego host harnessu.
