# Codex host adapter i capability projection

## TL;DR
Codex nie ma dziś wykonywalnego adaptera `evaluate gate → advisor/arbiter → runner → następna praca`; ma tylko instrukcję w TOML i smoke test obecności tekstu.
Minimalna naprawa wymaga hostowej pętli, która wywołuje natywnego subagenta, waliduje jego czteropolowy YAML, a po terminalnej decyzji uruchamia runner i bez kończenia tury dispatchuje trwały continuation target.
Shared `phase-continue.mjs` może pozostać granicą trwałego zapisu decyzji i transition fazy, ale nie może być jedynym dispatcherem: brak `next_phase` nie przesuwa kolejnego decision area.
Codex wolno oznaczyć jako `supported` dopiero po E2E uruchamiającym rzeczywisty host Codex, z deterministycznym fake advisorem/arbitrem i obserwowalnym kolejnym dispatch’em bez UI.

## Key Decisions
- Umieścić host-specific orchestration w `platforms/codex-cli/`, a wspólny schema/evaluator/runner w `plugins/maister/`; `plugins/maister-codex/` pozostaje wyłącznie projekcją builda.
- Traktować wywołanie subagenta jako hostową prymitywę, nie próbować ukrywać go w `phase-continue.mjs`: skrypt Node nie ma API do przejęcia aktywnej tury Codex ani natywnego delegation tool.
- Wprowadzić jeden jawny continuation target: `same_phase_work_item` (kolejny problem/decision area) albo `next_phase`; terminalna decyzja bez targetu nie jest dowodem kontynuacji.
- Fake advisor i arbiter mają implementować dokładnie ten sam port co natywny Codex invoker oraz prowadzić call log; fixture wybiera agreement, disagreement i wynik arbitra bez udziału modelu.
- Nie zmieniać `declared_status: unsupported`, dopóki host-native target nie kończy się kodem `0` i nie obserwuje całego przepływu.

## Open Questions / Risks
- Dokładna stabilna komenda Codex CLI do headless E2E musi zostać potwierdzona przy implementacji; jeśli runtime nie jest dostępny, target ma nadal zwracać `77`, a nie symulować sukces shared harness’em.
- Obecny gate engine jest normatywnym Markdowniem, nie biblioteką wykonywalną. Bez wydzielenia deterministycznego evaluatora część walidacji agreement/arbitration pozostaje zależna od poprawnego wykonania instrukcji przez głównego agenta.
- Aktywny stan używa `orchestrator.started_phase`, podczas gdy runner transition wymaga `orchestrator.current_phase`; adapter nie powinien wykonywać ad-hoc transformacji stanu, bo utworzyłby drugie źródło prawdy.
- Dokładnie-once dla dispatchu wymaga trwałego identyfikatora/cursora i idempotentnego odbiorcy. Sam fakt, że runner ponownie użył terminalnego gate, nie dowodzi braku ponownego uruchomienia kolejnego problemu.

## 1. Stan obecny i miejsce zatrzymania

### 1.1 Template opisuje zachowanie, ale niczego nie wykonuje

`platforms/codex-cli/templates/advisor.toml:5-18` definiuje read-only rolę i czteropolowy YAML. Linie 10-15 twierdzą, że adapter wywoła tego samego advisora jako arbitra oraz wykona `phase_continue(selected_option)`, lecz jest to wyłącznie `developer_instructions`.

`platforms/codex-cli/build.sh:135-151` tylko kopiuje TOML do wygenerowanego skilla `init`. Ten sam build transformuje prose skills na Codex vocabulary (`platforms/codex-cli/build.sh:44-90`) i generuje tekstowe utility skills (`:182-212`, `:236-275`), ale nie emituje executable gate adaptera, wrappera odpowiedzi ani continuation loop. Linie `:327-329` jedynie sprawdzają, że capability row i ścieżka E2E istnieją.

`platforms/codex-cli/smoke-cli.sh:66-89` sprawdza obecność plików i fraz (`phase_continue(selected_option)`, role, denylist). Nie wywołuje advisora, arbitra, runnera ani kolejnej jednostki pracy. **Wniosek (high confidence):** faktyczny punkt zatrzymania leży w brakującej warstwie host adapter/loop, pomiędzy otrzymaniem rekomendacji a wykonaniem/ponownym wejściem w workflow.

### 1.2 Runner kończy persistence/phase transition, nie hostową turę

Runner przyjmuje tylko exact JSON z ośmioma polami wymaganymi i trzema opcjonalnymi (`plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs:18-35,209-244`). Po zapisie terminalnym generuje raporty i opcjonalnie zmienia fazę (`:741-795`). Stdout zwraca tylko `status`, key, selection i `continuation`; nie uruchamia skilla ani następnego decision area.

Bez `next_phase` runner celowo pozostawia fazę bez zmian (`tests/phase-continue-contract.test.sh`, named test `test_no_transition_and_forward_transition_are_distinct`, linie 417-430). To jest poprawne dla decyzji wewnątrz fazy, lecz oznacza, że następny problem musi dispatchować hostowa pętla. Research prose mówi „record choice, move to next area” (`plugins/maister/skills/research/SKILL.md:340-355`), ale nie ma durable cursor ani executable consumer. **Wniosek (high confidence):** `phase_continue` jest persistence/phase-transition runnerem, nie pełnym dispatcherem następnej pracy.

### 1.3 Codex capability prawidłowo pozostaje unsupported

Target Codex jest pięcioliniowym placeholderem, który zawsze kończy się `77` (`platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh:1-5`). Capability matrix deklaruje `unsupported` (`plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml:16-18`). Make interpretuje tylko exit `0` jako `passed/supported`, `77` jako unavailable, a wszystko inne jako unsupported (`Makefile:29-42`); odrzuca shared runner test jako host-native evidence (`Makefile:44-52`).

Normatywny kontrakt potwierdza ten próg: target musi istnieć, być executable i przejść do końca; skip, `77` i shared tests nie wystarczają (`gate-decision-engine.md:30-42`). **Wniosek (high confidence):** zmiana samego YAML byłaby fałszywą deklaracją i zostanie wykryta przez `validate-host-capabilities`.

## 2. Minimalny wykonywalny model adaptera

### 2.1 Podział na hostową prymitywę i deterministyczny rdzeń

Minimalny interfejs powinien być jawny i testowalny:

```text
CodexGateAdapter.evaluate_and_continue(request, ports) -> outcome

request:
  gate_context                 # exact ordered options + original recommendation
  state_path
  continuation_target         # {kind: same_phase_work_item, cursor...} | {kind: next_phase, phase_id...}
  report paths

ports:
  invoke_role(role, immutable_context) -> raw four-field YAML
  run_phase_continue(exact_json) -> compact JSON
  dispatch(target, dispatch_id) -> acknowledged
  present_user_gate(...)       # never called on valid fully_automatic path
```

Hostowa implementacja `invoke_role` używa natywnej delegacji Codex w tej samej turze. Advisor dostaje pełny read-only context; przy rozbieżności adapter zapisuje `arbiter_pending` i wykonuje jedną logiczną rolę arbiter, której retries pozostają próbami tego samego rekordu. Zgodność oznacza exact string equality pomiędzy `original_recommendation` i zwalidowanym `selected_option`; nie wolno fuzzy matching.

Deterministyczny rdzeń powinien:

1. odczytać canonical state i wykonać idempotency preflight;
2. zapisać `advisor_pending` oraz rozpoczęcie każdej próby przed `invoke_role`;
3. zwalidować dokładnie cztery klucze, option membership, confidence i escalation;
4. zakończyć advisorem przy agreement albo utworzyć jeden logical arbiter przy disagreement;
5. zbudować exact runner JSON dopiero dla `high|medium`, `escalate_to_user: false`, configurable/non-denylisted gate;
6. po sukcesie runnera kontynuować hostową pętlę do `dispatch(target, dispatch_id)` bez emitowania plain-text user question;
7. przy low confidence, exhaustion, invalid capability albo non-zero runner stopować/fail-closed.

Normatywny algorytm już określa agreement i arbitration (`gate-decision-engine.md:266-300`), ale musi otrzymać executable realization. Najmniejsza bezpieczna struktura to wspólny evaluator pod `plugins/maister/skills/orchestrator-framework/bin/` plus cienkie Codex binding/loop pod `platforms/codex-cli/`; kopiowanie całego algorytmu do adaptera zwiększyłoby ryzyko driftu między hostami.

### 2.2 Continuation target i brak końca tury

Adapter nie może utożsamiać `runner exit 0` z zakończeniem pracy. Po stdout `status: decided|reused` powinien odczytać z canonical state trwały target:

- `same_phase_work_item`: phase id, ordered collection id, next index/item id, `dispatch_id`;
- `next_phase`: source phase, target phase i `dispatch_id` (runner może wykonać status transition);
- `none`: legalne tylko dla decyzji, która semantycznie niczego nie kontynuuje; nie spełnia acceptance dla fully automatic workflow gate.

Research convergence wymaga sekwencyjności, ponieważ późniejsze alternatywy zależą od wcześniejszych (`plugins/maister/skills/research/SKILL.md:340-350`). Dlatego host po zaakceptowaniu area N ma najpierw trwale zapisać choice/cursor, ponownie odczytać artefakt/state, a dopiero potem renderować i oceniać area N+1. Nie wolno pre-dispatchować wszystkich areas.

### 2.3 Deterministyczny fake advisor/arbiter

Fake powinien używać identycznej granicy co native role invoker:

```text
fake-role --role advisor|arbiter
stdin: immutable gate/competition JSON
stdout: dokładnie czteropolowy YAML
side effect test-only: append {logical_gate_key, role, attempt, input_hash} to call log
```

Fixture mapuje `(scenario, role, attempt)` na: valid agreement, valid disagreement, arbiter-original, arbiter-advisor, timeout/malformed, low confidence lub escalation. Arbiter input assertion wymaga obu konkurencyjnych opcji i rationales; output może należeć tylko do tego dwuelementowego zbioru. Call log pozwala dowieść `advisor=1`, `logical_arbiter=1` niezależnie od liczby retry attempts oraz że resume nie wywołało zakończonej roli ponownie.

Fake nie może zapisywać workflow state ani reports, zgodnie z read-only kontraktem (`platforms/codex-cli/templates/advisor.toml:6-18`; `plugins/maister/agents/advisor.md:12-23`). E2E nadal musi uruchamiać rzeczywisty Codex adapter/session; fake zastępuje tylko niedeterministyczną decyzję modelu.

## 3. Build projection i proponowane źródła zmian

Prawdopodobny minimalny zestaw canonical source files:

- `plugins/maister/skills/orchestrator-framework/bin/gate-evaluate.mjs` — nowy wspólny executable evaluator lub równoważne rozszerzenie istniejącego rdzenia;
- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` — canonical schema/continuation receipt i kompatybilność z durable target;
- `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md` — zsynchronizowany kontrakt executable behavior;
- `plugins/maister/skills/research/SKILL.md` oraz analogiczne convergence call sites — jawny same-phase cursor i usunięcie założenia, że każda obowiązkowa bramka musi mieć UI call ID;
- `platforms/codex-cli/` nowy host binding/loop i deterministyczny test harness;
- `platforms/codex-cli/build.sh` — projekcja bindingu/harness-required runtime files do generated pluginu;
- `platforms/codex-cli/templates/advisor.toml` — pozostaje role profile, lecz odsyła do rzeczywistego adaptera zamiast tylko deklarować zachowanie;
- `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh` — zastępuje placeholder;
- `tests/fixtures/` i contract tests — real state, agreement/arbitration/cursor/outbox fixtures;
- `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml` — `supported` dopiero w ostatnim kroku.

Build musi nadal wykonywać edycje wyłącznie w `plugins/maister/` i `platforms/`, następnie `make build`; generated `plugins/maister-codex/` służy do porównania reprodukowalności (`.maister/docs/standards/global/build-pipeline.md`). Obecny build usuwa i odtwarza cały target (`platforms/codex-cli/build.sh:15-16`), więc bez jawnej reguły copy nowy binding zniknie.

## 4. Exact criteria dla `declared_status: supported`

Codex można zadeklarować jako supported wyłącznie gdy wszystkie poniższe warunki są jednocześnie spełnione:

1. Target z capability matrix jest executable i na dostępnej instalacji uruchamia rzeczywisty Codex host/entrypoint, nie tylko Node runner.
2. Agreement kończy się aktorem `advisor`, jednym terminalnym history recordem, raportem i realnym następnym dispatch’em bez user-question/UI.
3. Disagreement uruchamia dokładnie jednego logical arbitra; osobne fixtures dowodzą obu legalnych rozstrzygnięć.
4. E2E obserwuje oba target kinds: następny problem/decision area w tej samej fazie oraz następną fazę.
5. Resume po awarii report/transition/dispatch nie powtarza terminal history ani ukończonego dispatchu.
6. Denylista, low confidence, escalation, exhaustion i invalid output pozostają fail-closed.
7. Shared contract matrix przechodzi dla source i wszystkich generated runners, `make build` jest reprodukowalny, a `make validate-host-capabilities` projektuje `supported` z exit `0`.
8. Gdy Codex runtime jest niedostępny, test zwraca `77`, a deklaracja pozostaje `unsupported`; brak runtime nie może być zamaskowany fake-only sukcesem.

**Confidence:** high dla diagnozy braku adaptera, build projection i capability threshold; medium dla dokładnego kształtu nowego pliku/bindingu, bo stabilny headless Codex invocation nie istnieje jeszcze w repo i wymaga implementacyjnego spike’a.

