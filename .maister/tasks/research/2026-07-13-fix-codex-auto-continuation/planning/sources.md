# Źródła badania: automatyczna kontynuacja Codex

## TL;DR
Źródłami pierwszego rzędu są kanoniczny gate engine, runner, workflow call sites, adapter Codex i ich testy.
Wcześniejsza diagnoza stanowi punkt startowy, ale każdy jej wniosek musi zostać ponownie potwierdzony kodem lub testem.
Generated variants są materiałem porównawczym; nie są źródłowym miejscem naprawy.

## Key Decisions
- Priorytet dowodowy: wykonywalny kod i testy > normatywny kontrakt > dokumentacja architektury > wcześniejsza diagnoza.
- Nie planować researchu webowego, ponieważ oczekiwane zachowanie i capability są definiowane lokalnie przez Maister.
- Cytować `plik:linia` albo stabilną nazwę testu; dla generated variants wskazywać ich canonical origin.

## Open Questions / Risks
- Część zachowania jest documentation-as-code, więc sprzeczność między prose i runnerem wymaga jawnego rozstrzygnięcia źródła normatywnego.
- Brak implementacji adaptera oznacza, że niektóre przyszłe pliki można wskazać tylko jako proponowany seam, nie jako istniejący dowód.
- Linijki mogą przesunąć się po równoległych zmianach; nazwy funkcji, sekcji i testów są stabilniejszym drugim identyfikatorem.

## 1. Normatywne kontrakty

### `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md`

Najważniejsze sekcje:

- `evaluate_gate` i exact schemas: linie około 57-170;
- idempotency i terminal reuse: sekcja 2;
- agreement/disagreement/jeden arbiter: sekcja 3, zwłaszcza kroki 7-13;
- resume transitions: sekcja 4;
- denylista: sekcja 5.

Pytanie źródłowe: czy implementacje i workflow call sites realizują normatywny algorytm bez user UI w ścieżce `fully_automatic`?

### `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md`

Najważniejsze dowody:

- linie 94-128: policy floor, capability, agreement, arbiter i trwałość;
- linie 130-139: zakaz zatrzymania tury dla AUTO-CONTINUE;
- linie 275-325: common state fields, w tym `started_phase` i `gate_history`.

Pytanie źródłowe: gdzie prose kontraktu rozmija się z rzeczywistym schema runnera i z obowiązkowymi user-gate self-checks?

### `plugins/maister/skills/orchestrator-framework/references/gate-decision-fixtures.yml`

Fixtures do prześledzenia:

- `advisor-agrees`;
- `advisor-disagrees-arbiter-original`;
- `advisor-disagrees-arbiter-advisor`;
- `advisor-timeout-retry` i `advisor-retry-exhausted`;
- `resume-advisor-pending` i `resume-arbiter-pending`;
- `fully-automatic-phase-continue`.

Pytanie źródłowe: które fixtures są tylko deklaratywną specyfikacją, a które rzeczywiście uruchamia test harness?

### `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml`

Dowód: wiersz `host: codex` deklaruje `unsupported` i wskazuje host-native target.

Pytanie źródłowe: jakie dokładne kryteria przejścia targetu pozwalają bezpiecznie zmienić deklarację?

## 2. Wykonywalny runner i state fixtures

### `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`

Punkty wejścia i funkcje:

- linie 18-35 — wymagane i opcjonalne pola payloadu; jedynym routing field jest `next_phase`;
- `validatePayload` około linii 209-244 — exact membership, actor i confidence;
- `HISTORY_FIELDS` około linii 281-298 — wąski rekord persisted history;
- `validateHistoryRecord` linie 502-527 — odrzucenie dodatkowych pól;
- `validateCanonicalState` linie 529-562 — canonical anchors i opcjonalny `current_phase`;
- `validateTransition` linie 564-577 — przejście wyłącznie do późniejszej pending phase;
- `appendGateHistory` linie 642-659;
- `updatePhaseState` linie 661-700;
- `renderReports` około linii 711-739;
- `main` około linii 741-805 — terminal reuse, write ordering i transition.

Pytania źródłowe:

- Czy payload bez `next_phase` robi cokolwiek poza trwałym wyborem?
- Czy runner może bezpiecznie zaakceptować pełny rekord advisor/arbiter bez utraty exact-schema validation?
- Czy sequence terminal write → reports → transition jest naprawdę atomiczna na wszystkich failure paths?

### `tests/fixtures/phase-continue/`

Źródła fixture:

- `valid-empty.yml` i `valid-populated.yml`;
- `invalid-history-record.yml`;
- fixtures missing/duplicate/misplaced anchors;
- fixtures malformed phases i unsupported YAML.

Pytanie źródłowe: czy fixture przypomina realny state generowany przez aktywne workflowy, czy tylko węższy kontrakt runnera?

## 3. Workflow call sites i routing

### `plugins/maister/skills/research/SKILL.md`

Najważniejsze sekcje:

- linie 91-120 — JSON runner contract i inventory gate types;
- linie 320-361 — phase-3 exit, sekwencyjne decision areas i phase-4 exit;
- resume check przy `phase_summaries.phase-4.decision_areas`.

Pytanie źródłowe: jak po terminalnym `research-convergence` wykonać automatycznie krok `record choice → move to next area` bez konieczności następnej wiadomości użytkownika?

### `plugins/maister/skills/product-design/SKILL.md`

Najważniejsze sekcje: convergence i routing około linii 508-559.

Pytanie źródłowe: czy analogiczna pętla decision areas wymaga tego samego continuation cursor i czy poprawkę należy uogólnić na wszystkie call sites?

### `plugins/maister/skills/development/SKILL.md`

Najważniejsze sekcje:

- gate engine i runner contract około linii 113-169;
- routing phase około linii 275-290.

Pytanie źródłowe: czy istnieją już wzorce compute-and-persist routing, które mogą stanowić canonical seam dla automatycznej kontynuacji?

## 4. Adapter Codex i generowanie

### `platforms/codex-cli/templates/advisor.toml`

Dowody: linie 6-18 definiują read-only output, jeden advisor używany również jako arbiter i prose `phase_continue(selected_option)`.

Pytanie źródłowe: jaki wykonywalny komponent konsumuje ten czteropolowy YAML? Obecna diagnoza twierdzi, że żaden.

### `platforms/codex-cli/build.sh`

Najważniejsze dowody:

- linie 182-212 generują `resume` i odwołują się do `current_phase`;
- linie 315-331 opisują state i jedynie walidują wpis capability matrix;
- brak jawnego generatora continuation wrappera należy potwierdzić pełnym flow skryptu.

### `platforms/codex-cli/smoke-cli.sh`

Dowody: linie 66-89 sprawdzają obecność prose i struktury, w tym tekst `phase_continue(selected_option)`, lecz nie wykonują continuation.

### `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh`

Dowód: linie 1-5 bezwarunkowo wypisują `UNAVAILABLE` i kończą kodem `77`.

### `plugins/maister-codex/`

Użycie: tylko sprawdzić, czy `make build-codex` poprawnie projektuje canonical sources i adapter. Nie proponować bezpośrednich edycji.

## 5. Testy i capability enforcement

### `tests/fully-automatic-phase-continue.test.sh`

Dowody:

- linie 13-30 tworzą state z `current_phase`;
- linie 32-42 sprawdzają terminal decision, raport i transition phase-1 → phase-2;
- linie 44-46 sprawdzają terminal reuse;
- linie 48-51 sprawdzają denylistę.

Luka do sprawdzenia: test nie uruchamia advisora, arbitra ani następnego decision area i nie jest host-native.

### `tests/phase-continue-contract.test.sh`

Stabilne test names:

- `test_accepts_canonical_state_fixtures`;
- `test_normal_decision_writes_deterministic_reports`;
- `test_denylist_stays_blocked_on_retry`;
- `test_changed_selection_is_rejected_without_mutation`;
- `test_terminal_retry_validates_transition_before_reports`;
- `test_no_transition_and_forward_transition_are_distinct`;
- `test_report_failure_leaves_terminal_record_for_regeneration`;
- `test_transition_failure_recovers_exactly_once`.

Pytanie źródłowe: jakie dodatkowe asercje są potrzebne dla one-arbiter, no-user-UI, same-phase cursor i exactly-once dispatch?

### `tests/gate-decision-engine.test.sh`

Użycie: ustalić, czy deklaratywne fixtures agreement/arbitration są wykonywane, a nie tylko grep-checkowane.

### `Makefile`

Dowody:

- linie 3-7: runner contract jest wykonywany dla source i wszystkich generated variants;
- linie 29-42: exit `77` projektuje capability jako `unsupported`;
- linie 44-52: deklaracja musi odpowiadać host-native evidence;
- linie 54-63: shared runner matrix nie zastępuje host E2E.

## 6. Dokumentacja projektu i standardy

### `.maister/docs/project/architecture.md`

Reguły: canonical plugin + platform adapters, `orchestrator-state.yml` jako jedyne source of truth, terminal persistence przed continuation, jeden logiczny arbiter.

### `.maister/docs/project/vision.md`

Reguły: audytowalność, resumability, fail-closed i zachowanie native host constraints.

### `.maister/docs/project/roadmap.md`

Priorytety: runtime continuation coverage i Advisor/Arbiter assurance.

### `.maister/docs/project/tech-stack.md`

Kontekst: Node.js ESM jako runtime continuation; Bash i Make jako build/test harness.

### `.maister/docs/standards/global/build-pipeline.md`

Reguła: edytować `plugins/maister/` lub `platforms/`, następnie `make build`; nie edytować generated variants bezpośrednio.

### `.maister/docs/standards/global/validation.md`

Reguła: strict allowlists, early validation i spójne enforcement na każdym entry point.

### `.maister/docs/standards/testing/test-writing.md`

Reguła: testować zachowanie oraz byte-exact non-mutation/rollback dla odrzuconych i przerwanych zapisów stanu.

## 7. Materiał kontekstowy

### `.maister/tasks/research/2026-07-13-issue-tracker-workflow/analysis/codex-fully-automatic-diagnosis.md`

Rola: wcześniejsza reprodukcja i hipoteza root cause. Nie traktować jej jako końcowego dowodu bez potwierdzenia aktualnymi plikami i testami.

### `.maister/tasks/research/2026-07-13-fix-codex-auto-continuation/planning/research-brief.md`

Rola: zakres, wymagania użytkownika i kryteria sukcesu bieżącego badania.

### `.maister/tasks/research/2026-07-13-fix-codex-auto-continuation/orchestrator-state.yml`

Rola: realny przykład stanu wygenerowanego przez aktywny workflow; kluczowy do porównania z runner fixtures.

## 8. Polecenia baseline do użycia przez gathererów

Polecenia są diagnostyczne i nie zmieniają źródeł:

```bash
rtk bash tests/gate-decision-engine.test.sh
rtk bash tests/fully-automatic-phase-continue.test.sh
rtk bash tests/phase-continue-contract.test.sh
rtk bash platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh
rtk make -s print-host-capabilities
```

Oczekiwany baseline należy zapisać wraz z exit code. Kod `77` dla Codex E2E jest oczekiwanym dowodem obecnej niedostępności, nie sukcesem.
