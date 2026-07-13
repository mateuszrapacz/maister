# Kontynuacja i dispatch następnej jednostki pracy

## TL;DR
`phase-continue.mjs` jest bezpiecznym writerem terminalnego gate'u, raportów i opcjonalnej zmiany statusu fazy, ale nie jest dispatcherem: po wypisaniu JSON proces kończy się.
Bez `next_phase` runner nie przesuwa żadnego kursora; z `next_phase` jedynie atomowo zmienia `current_phase` i statusy faz, lecz nie uruchamia kodu następnej fazy.
Najlepszy seam to: runner odpowiada za trwały commit, adapter hosta za transport i zwrot dyrektywy `continue`, a pętla workflow za semantyczny cursor, projekcję wyboru i natychmiastowy dispatch kolejnego problemu w tej samej turze.
Dokładnie-jednorazowy resume wymaga trwałych identyfikatorów work itemów i stanu `ready/in_progress/completed`; sam indeks lub samo `next_phase` nie wystarcza.

## Key Decisions
- Nie rozszerzać `phase-continue.mjs` do wykonywania workflowów ani wywoływania agentów. Runner nie zna domenowej kolejności decision areas, zależności między nimi ani hostowych narzędzi.
- Rozdzielić `commit` od `dispatch`: sukces runnera oznacza „decyzja i wymagane projekcje są trwałe”, a nie „następna praca została wykonana”.
- Trzymać canonical continuation cursor w `orchestrator-state.yml`, ale jego semantykę i wyliczanie następnego work itemu pozostawić workflowowi. Adapter Codex jedynie utrzymuje tę samą turę i przekazuje wynik runnera do pętli.
- Używać stabilnego `work_item_id`, `source_gate_key` i statusu itemu zamiast samego numeru indeksu. Indeks może być informacyjny, lecz zmiana artefaktu nie może skierować resume na inny problem.
- Phase entry self-check musi akceptować terminalny automatyczny rekord i trwałe przejście jako alternatywę dla historycznego call ID `AskUserQuestion`; obecny warunek wymusza UI mimo poprawnego `fully_automatic`.

## Open Questions / Risks
- Bieżące workflowy zapisują `orchestrator.started_phase`, a transition runner wymaga `orchestrator.current_phase`; realny stan aktywnego researchu nie przejdzie transition preflight (`orchestrator-state.yml:2`, `phase-continue.mjs:555,569`). To musi zostać ujednolicone przed adapterem.
- Runner tworzy własny wąski rekord gate, mimo że kontrakt engine wymaga wcześniej pełnego terminalnego rekordu. Bez ujednolicenia własności zapisu powstaje ryzyko dwóch writerów i utraty danych advisor/arbiter (`gate-decision-engine.md:301-314`, `phase-continue.mjs:766-785`).
- Ścisłe „exactly once” dla zewnętrznego model call/Task dispatch jest niemożliwe bez transakcyjnego host API. Można zagwarantować dokładnie jeden logiczny work item i idempotentny resume; fizyczne wywołanie po przerwaniu może być retry i musi używać tego samego `dispatch_id`/gate key.
- Produktowy refinement może wracać do wcześniejszej fazy, podczas gdy runner jawnie odrzuca backward transition (`product-design/SKILL.md:526-534`, `phase-continue.mjs:574-576`). Ten routing wymaga jawnego workflow resetu, nie `next_phase` obecnego runnera.

## 1. Co robi runner dzisiaj

### Payload bez `next_phase`

1. Payload przechodzi exact-schema validation; `next_phase` jest jedynie polem opcjonalnym (`phase-continue.mjs:18-35,209-244`).
2. Runner czyta i waliduje canonical state, oblicza idempotency key i szuka terminalnego rekordu (`phase-continue.mjs:741-749`).
3. Przy nowej decyzji appenduje terminalny rekord i atomowo zapisuje stan (`phase-continue.mjs:766-787`).
4. Generuje żądane raporty z ponownie odczytanego, persisted state (`phase-continue.mjs:786-788`, `711-739`).
5. Ponieważ brak `next_phase`, pomija `updatePhaseState` i wypisuje kompaktowy JSON (`phase-continue.mjs:789-794`). Potem `main()` wraca, a proces Node kończy się (`phase-continue.mjs:797-800`).

Skutek: gate jest trwały, lecz `current_phase`, statusy faz, domenowy wybór (`chosen_approach`) i pozycja w pętli nie zmieniają się. Test kontraktowy potwierdza tę odrębność: bez transition faza 1 pozostaje aktywna, faza 2 pending (`tests/phase-continue-contract.test.sh:417-429`).

### Payload z `next_phase`

1. Przed jakimkolwiek zapisem runner wymaga: `current_phase == phase_id`, bieżącej fazy `in_progress`, targetu `pending`, targetu późniejszego w `phases[]` (`phase-continue.mjs:564-577`).
2. Po terminalnym zapisie i raportach `updatePhaseState` ustawia źródło na `completed`, target na `in_progress`, podmienia `current_phase` i dopisuje źródło do `completed_phases` (`phase-continue.mjs:661-700,784-792`).
3. Na retry wykrywa już zastosowane przejście po kombinacji `current_phase`, dwóch statusów i nie wykonuje go ponownie (`phase-continue.mjs:579-589,751-761`).
4. Następnie ponownie tylko wypisuje JSON i kończy proces. Nie importuje workflow SKILL, nie wywołuje host toola i nie posiada callbacka dispatch (`phase-continue.mjs:741-800`).

Skutek: trwała maszyna stanów wskazuje nową fazę, ale execution turn nie przechodzi sam do kodu tej fazy. Istniejący test nazywa to „continuation”, choć obserwuje wyłącznie state/report, nie dispatch: asercje sprawdzają `current_phase`, statusy i JSON (`tests/fully-automatic-phase-continue.test.sh:32-46`).

## 2. Dokładne miejsce zatrzymania tury

```text
workflow call site
  │ evaluate_gate(...) / advisor / arbiter
  │ terminal normalized result
  ▼
Codex host adapter                         ← obecnie brak wykonywalnej warstwy
  │ exact JSON
  ▼
phase-continue.mjs
  ├─ validate state + idempotency
  ├─ persist terminal record
  ├─ render reports
  ├─ [optional] transition phase state
  └─ stdout {status, key, selected_option, continuation}
       │
       └─ process exits                    ← konkretny punkt zatrzymania

BRAK:
  stdout consumer → apply gate effect → advance cursor → dispatch next item
```

Historyczna diagnoza identyfikuje brak mapowania `valid advisor result → runner → observed transition` w Codex (`codex-fully-automatic-diagnosis.md:62-79`). Analiza runnera doprecyzowuje, że nawet po dodaniu tego mapowania pozostaje drugi brak: nie istnieje konsument sukcesu, który kontynuuje workflow w tej samej turze.

Kontrakt frameworka nakazuje przy AUTO-CONTINUE nie kończyć tury i natychmiast wykonać następną fazę (`orchestrator-patterns.md:130-139`). Jest to wymaganie wobec hosta/orchestratora, nie zachowanie wykonywane przez Node runner.

## 3. Dlaczego `next_phase` nie rozwiązuje kolejnego problemu w tej samej fazie

`next_phase` musi być innym, późniejszym elementem rootowego `phases[]` (`phase-continue.mjs:571-576`). Decision area w research Phase 4 nadal należy do `phase-4`, więc użycie `next_phase: phase-4` jest jawnie odrzucane. Payload nie ma `next_work_item`, `cursor` ani domenowej mutacji (`phase-continue.mjs:18-35`).

Call site research wymaga sekwencyjnego przetwarzania, bo późniejsze obszary zależą od wcześniejszych (`research/SKILL.md:340-350`). Jednocześnie resume sprawdza `phase_summaries.phase-4.decision_areas[].chosen_approach` (`research/SKILL.md:331-332`), którego runner nigdy nie zapisuje. Produktowy workflow ma ten sam wzorzec „record choice, move to next area” (`product-design/SKILL.md:514-524`).

Wniosek: „gate decided” i „gate effect applied to workflow work item” są dziś dwiema różnymi operacjami, ale nie mają jawnego protokołu pomiędzy sobą.

## 4. Rekomendowany podział odpowiedzialności

| Warstwa | Powinna posiadać | Nie powinna posiadać |
|---|---|---|
| Runner | strict validation, terminal idempotency, atomowy zapis, raporty, idempotentny phase transition/checkpoint | wybór kolejnego decision area, czytanie alternatyw, wywoływanie agentów, kończenie/utrzymywanie host turn |
| Adapter hosta Codex | mapowanie normalized result → exact runner JSON, uruchomienie runnera, sprawdzenie exit/stdout, zwrot dyrektywy `continue` bez UI i bez zakończenia tury | domenowy routing, modyfikacja artifactów, własna kopia state machine |
| Pętla workflow | stabilne work itemy, zastosowanie wybranej opcji, next-item computation, phase routing, natychmiastowe wykonanie kolejnej jednostki | ponowne implementowanie gate validation, arbitrażu i bezpieczeństwa runnera |

To jest najgłębszy bezpieczny seam: runner pozostaje deterministycznym persistence boundary, adapter jest cienkim hostowym wykonawcą, a workflow zachowuje wiedzę domenową. Wpychanie dispatchu do runnera sprzęgnęłoby wspólny skrypt z Codex tool API oraz prose-defined fazami; wpychanie kursora do adaptera utworzyłoby drugie source of truth obok `orchestrator-state.yml`.

## 5. Proponowany cursor i kontrakt dispatchu

Przykładowy canonical fragment stanu:

```yaml
orchestrator:
  current_phase: phase-4
  continuation:
    schema_version: 1
    revision: 7
    source_gate_key: "sha256:..."
    dispatch_id: "sha256:..."       # hash(task, phase, work_item_id, logical iteration)
    status: ready                   # ready | in_progress | completed | blocked
    target:
      kind: same_phase_work_item    # same_phase_work_item | phase_entry
      phase_id: phase-4
      work_item_type: decision_area
      work_item_id: persistence-boundary
      ordinal: 2
```

Domenowy cursor powinien być oparty na stabilnym inventory:

```yaml
research_context:
  phase_summaries:
    phase-4:
      decision_areas:
        - id: execution-owner
          ordinal: 1
          status: completed
          gate_key: "sha256:..."
          chosen_approach: host-workflow-loop
        - id: persistence-boundary
          ordinal: 2
          status: ready
          gate_key: null
          chosen_approach: null
```

Zasady kontraktu:

1. Workflow materializuje listę work itemów z artefaktu przed pierwszym gate'em. `work_item_id` jest stabilny i unikalny w fazie; ordinal nie jest tożsamością.
2. Przed oceną gate'u workflow ustawia item i `continuation` na `in_progress`, potem engine zapisuje `advisor_pending`/`arbiter_pending` przed model call zgodnie z normatywnym resume (`gate-decision-engine.md:244-259,316-346`).
3. Terminalny gate jest source of truth dla wyboru. Po sukcesie runnera pętla ponownie czyta stan i idempotentnie projektuje `selected_option` do itemu, zapisując `gate_key`.
4. W tym samym atomowym checkpointcie workflow oznacza item `completed` i ustawia następny nierozwiązany item na `ready`. Jeśli nie ma kolejnego itemu, ustawia target `phase_entry` i przekazuje runnerowi prawidłowy `next_phase`.
5. Adapter otrzymuje wyłącznie wynik typu `continue | user_gate | blocked`. `continue` nie kończy assistant turn; pętla natychmiast czyta `continuation.target` i wykonuje go.
6. Dispatch zawsze nosi `dispatch_id`. Powtórzenie tego samego id po resume jest wznowieniem jednego logicznego dispatchu, nie nowym itemem.

Runner może zapisywać generyczny envelope `orchestrator.continuation`, ale nie powinien sam wyliczać targetu. Target powstaje w call site/workflow i musi być zwalidowany względem bieżącego phase/work-item inventory. Alternatywnie pierwsza implementacja może pozostawić runner bez nowego pola, pod warunkiem że workflow zapisze powyższy checkpoint zaraz po idempotentnym terminal reuse; envelope jest jednak czytelniejszy i testowalny przy crashach.

## 6. Failure i resume — wymagane zachowanie

| Punkt przerwania | Trwały stan | Zachowanie resume |
|---|---|---|
| Przed advisor call | item `in_progress`, gate `advisor_pending`, attempt `started` | wznowić ten sam gate; zamknąć przerwany attempt jako timeout i zużyć slot |
| Po terminal state, przed raportem | terminal gate istnieje, item może być `in_progress` | runner reuse regeneruje raport; nie duplikuje gate; dopiero potem workflow aplikuje effect |
| Po raporcie, przed gate effect/cursor | terminal gate + raport, stary cursor | workflow odczytuje terminal selection, idempotentnie uzupełnia item i ustawia następny target |
| Po cursor advance, przed dispatch | next item `ready` z `dispatch_id` | adapter/workflow dispatchuje dokładnie ten target |
| Po dispatch start, przed odpowiedzią modelu | item `in_progress`, pending gate/attempt | resume tego samego logicznego gate'u; ewentualny fizyczny retry zachowuje key i retry budget |
| Po phase transition, przed phase body | stara faza `completed`, nowa `in_progress`, `phase_entry` ready | wejść do nowej fazy bez ponownego transition i bez user UI |
| Transition write failure | terminal gate i raport istnieją, fazy niezmienione | retry runnera stosuje transition raz; istniejący test to potwierdza (`tests/phase-continue-contract.test.sh:447-462`) |

Obecny runner już dobrze realizuje dwa fragmenty: report failure pozostawia terminalny record do regeneracji (`tests/phase-continue-contract.test.sh:432-445`), a transition failure wraca do tej samej decyzji i przechodzi raz (`tests/phase-continue-contract.test.sh:447-462`). Brakuje analogicznych testów dla effect/cursor/dispatch.

## 7. Call-site’y wymagające korekty

### Research

- `research/SKILL.md:93-107`: kontrakt runnera powinien opisywać nie tylko durable phase transition, lecz także obowiązek konsumowania sukcesu i utrzymania tury.
- `research/SKILL.md:331-357`: pętla decision areas powinna mówić „terminal result”, nie „If user picks”, oraz zapisywać item/cursor przed przejściem dalej.
- `research/SKILL.md:367` i `416`: phase entry self-check musi uznać terminalny auto gate + trwały transition, a nie wymagać wyłącznie call ID user gate.

### Product design

- `product-design/SKILL.md:514-524`: ta sama pętla same-phase decision areas potrzebuje wspólnego cursor contractu.
- `product-design/SKILL.md:526-545`: refinement/return-to-Phase-4 potrzebuje osobnej, jawnej reset transition, bo obecny runner obsługuje tylko forward pending target.
- `product-design/SKILL.md:551-559`: entry check i routing muszą konsumować persisted terminal/continuation, nie zakładać user click.

### Development

- `development/SKILL.md:121-149`: wspólny call-site contract kończy się na runnerze; trzeba dopisać konsumpcję JSON, re-read state i dispatch w tej samej turze.
- `development/SKILL.md:256-290`: wiele `phase-2-scope-decision` jest kolejnymi problemami w jednej fazie i wymaga identycznego stable work-item cursor.
- Powtarzające się phase entry self-checks, np. `development/SKILL.md:296-315`, muszą odróżniać poprawne `fully_automatic` od pominiętego gate'u.

## 8. Testy, których dziś brakuje

Istniejący contract matrix dowodzi strict payload/state validation, rozdzielenia no-transition/transition oraz recovery report/transition (`tests/phase-continue-contract.test.sh:365-462`). Nie dowodzi kontynuacji execution turn ani kolejnego same-phase itemu. Minimalne nowe przypadki:

1. **same-phase two-item contract**: advisor kończy area A; state ma A completed i B ready; adapter w tej samej turze uruchamia gate B; brak user gate.
2. **crash after terminal before effect**: retry nie dopisuje gate, aplikuje A raz i dispatchuje B raz logicznie.
3. **crash after cursor before dispatch**: resume dispatchuje B z tym samym `dispatch_id`.
4. **phase-entry continuation**: runner przechodzi fazę, adapter konsumuje stdout, workflow faktycznie tworzy pierwszy checkpoint/artifact następnej fazy — sama zmiana statusu nie wystarcza.
5. **auto entry self-check**: persisted automatic exit gate nie wywołuje user UI; brak terminalnego rekordu nadal fail-closed odpala gate.
6. **dependent area recomputation**: wybór A może zmienić dozwolone warianty B; inventory/cursor waliduje B dopiero po zaaplikowaniu A, nie pre-renderuje wszystkich gate'ów.
7. **duplicate dispatch rejection**: drugi `dispatch_id` dla tego samego source gate/item jest odrzucony bez mutacji; retry tego samego id jest reuse.

Host-native E2E powinien obserwować nie tylko `current_phase`, lecz konkretny side effect następnego dispatchu (np. trwały marker pierwszego work itemu kolejnej fazy lub drugiego decision area) oraz brak wywołania user gate.

## 9. Pliki prawdopodobnie wymagające zmiany

### Źródła kanoniczne

- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` — ujednolicony state schema; ewentualny generyczny continuation checkpoint i bogatszy wynik stdout.
- `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md` — jednoznaczna granica terminal persistence vs gate effect/dispatch oraz resume cursor.
- `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` — canonical `current_phase`/cursor i auto phase-entry self-check.
- `plugins/maister/skills/research/SKILL.md` — same-phase loop i auto transition consumer.
- `plugins/maister/skills/product-design/SKILL.md` — wspólna pętla decision areas oraz refinement reset.
- `plugins/maister/skills/development/SKILL.md` — sekwencja scope decisions i phase routing.

### Adapter Codex

- Nowy wykonywalny wrapper/adapter pod `platforms/codex-cli/` — transport normalized result, runner invocation, stdout validation i dyrektywa continue bez UI.
- `platforms/codex-cli/build.sh` — projekcja adaptera do generated pluginu.
- `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh` — prawdziwy same-turn/same-phase oraz next-phase dispatch zamiast `exit 77`.

### Testy wspólne

- `tests/phase-continue-contract.test.sh` i `tests/fixtures/phase-continue/*.yml` — realny state, cursor, crash windows i byte-exact rejection.
- Nowy deterministic workflow-loop/dispatch contract test — dwa same-phase work itemy i jeden phase entry.
- `tests/gate-decision-engine.test.sh` — wymagania prose/fixture na terminal → effect → cursor → dispatch.

Generated variants (`plugins/maister-codex/`, Cursor, Kiro) powinny powstać przez `make build`, nie być edytowane bezpośrednio.

## 10. Confidence

- **High** — runner bez `next_phase` nie wykonuje żadnego advance; z `next_phase` mutuje wyłącznie phase state i kończy proces. Dowód jest bezpośrednio w kodzie i testach.
- **High** — obecne same-phase convergence call-site’y nie mają wykonywalnego durable cursor/dispatch contractu.
- **High** — właściwy owner domenowego next-item computation to workflow loop; runner i adapter nie mają wymaganej wiedzy.
- **High** — obecne phase-entry self-checks są sprzeczne z automatycznym terminal gate'em, bo wymagają call ID `AskUserQuestion`.
- **Medium** — dokładny kształt generycznego `orchestrator.continuation` powinien zostać potwierdzony podczas designu state schema; kluczowe inwarianty (`work_item_id`, `source_gate_key`, `dispatch_id`, status) są konieczne niezależnie od finalnej serializacji.
