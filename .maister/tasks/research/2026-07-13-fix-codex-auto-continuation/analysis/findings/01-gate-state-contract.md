# Kanoniczny kontrakt gate engine i stanu workflow

## TL;DR

Normatywna logika jest jednoznaczna: zgodność rekomendacji kończy gate decyzją advisora, a rozbieżność tworzy jeden rekord arbitra, którego kolejne wywołania są retry tego samego arbitra.
Obecny `phase-continue.mjs` nie wykonuje tej logiki; otrzymuje już wybraną opcję i zapisuje uboższą, syntetyczną historię bez odpowiedzi, modeli i prób advisora/arbitra.
Realny state workflow używa `started_phase`, lecz przejście runnera wymaga `current_phase`; z kolei pełny rekord wymagany przez gate engine jest odrzucany przez allowlistę runnera.
Kanonicznym kursorem fazy powinien zostać `orchestrator.current_phase`, weryfikowany względem `phases[]`; `gate_history[]` powinno przechowywać bezstratny pełny rekord engine, a runner tylko wykonywać utrwalony wynik.

## Key Decisions

- Przyjąć `orchestrator.current_phase` jako jedyne mutowalne źródło bieżącej fazy; `phases[]` jest rejestrem statusów i musi spełniać inwariant dokładnie jednej fazy `in_progress` wskazywanej przez `current_phase`.
- Przechowywać jedną mapę `advisor` i jedną mapę `arbiter` w rekordzie gate; retry dopisują `attempts[]`, nigdy nie tworzą kolejnego obiektu arbitra ani nie wracają do advisora.
- Ujednolicić `gate_history[]` jako pełny, bezstratny rekord wyniku engine wraz z tożsamością gate i informacją continuation; nie rekonstruować audytu z wąskiego payloadu runnera.
- Zachować kolejność: pending/attempt przed modelem, terminalny gate przed raportami, raporty przed dispatch/transition. Retry po awarii raportu lub transition wykorzystuje ten sam terminalny rekord.

## Open Questions / Risks

- Pełny `normalized_gate_result` z dokumentacji nie zawiera dziś `phase_id`, `gate_type`, `question`, `options`, `policy`, `safety_classification` ani `continuation`, choć te dane są wymagane w `gate_history`; trzeba formalnie rozszerzyć wynik albo zdefiniować jawny envelope historii.
- Dokumentacja mówi jednocześnie, że awaria raportu ma być terminalnym `failed`, i że po trwałym `decided` retry ma odtworzyć raport oraz dokończyć transition. Drugi model odpowiada istniejącym testom; status decyzji nie powinien być degradowany przez awarię projekcji.
- `phase-continue.mjs` zapisuje fazy przez tekstową transformację i nie aktualizuje `updated`, `phases[].completed` ani `phases[].started`; pełny kontrakt przejścia wymaga ustalenia właściciela tych pól.
- Ten finding definiuje stan decyzji i przejścia fazowego. Trwały cursor kolejnego problemu w tej samej fazie wymaga osobnego kontraktu dispatchu.

## 1. Obowiązujący algorytm decyzji

Źródłem normatywnym jest `gate-decision-engine.md`, ponieważ `orchestrator-patterns.md` jawnie deleguje do niego schemat i przejścia (`plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:94-101`).

### 1.1 Agreement

Advisor może zakończyć bezpieczny gate bez arbitra i użytkownika wtedy i tylko wtedy, gdy:

1. gate nie jest denylisted;
2. policy to `fully_automatic`;
3. odpowiedź jest poprawną mapą czteropolową, a `selected_option` jest dokładnym elementem uporządkowanych `options` (`gate-decision-engine.md:104-120`);
4. rekomendacja advisora jest równa `original_recommendation` albo rekomendacji pierwotnej nie było;
5. confidence to `high` lub `medium`;
6. `escalate_to_user` jest `false`;
7. adapter posiada zweryfikowane `phase_continue(selected_option)` (`gate-decision-engine.md:266-270`).

Wynik to jeden terminalny rekord `status: decided`, `final_actor: advisor`; nie ma wywołania arbitra ani user gate. W trybie `advisor`, nawet przy zgodności, aktorem końcowym pozostaje użytkownik (`gate-decision-engine.md:271-272`).

**Wniosek — confidence: high.** To dokładnie realizuje regułę użytkownika „gdy główny agent i advisor się zgadzają, bierzemy tę decyzję”, ale tylko dla bezpiecznej, wystarczająco pewnej ścieżki `fully_automatic`.

### 1.2 Disagreement i dokładnie jeden logiczny arbiter

Rozbieżność przy włączonym arbitrażu przechodzi `advisor_pending → arbiter_pending`. Engine tworzy jedną mapę `arbiter`, przekazuje obie różne rekomendacje i oba uzasadnienia, a kolejne nieudane wywołania dopisuje do `arbiter.attempts[]`. Nie wolno tworzyć drugiego obiektu arbitra ani wracać do advisora (`gate-decision-engine.md:256-259,273-289`). Arbiter może wybrać wyłącznie jedną z dwóch konkurujących rekomendacji (`gate-decision-engine.md:115-120`).

Poprawny wynik `high|medium`, bez eskalacji, dla bezpiecznego gate daje `status: decided`, `final_actor: arbiter`. Wyczerpanie prób, low confidence lub eskalacja przechodzi do user gate w hoście interaktywnym albo do `blocked` bez interakcji (`gate-decision-engine.md:280-300`).

**Wniosek — confidence: high.** „Jeden arbiter” oznacza jedną logiczną decyzję i jeden trwały obiekt `arbiter`; limit `arbiter_attempts` oznacza retry tej decyzji, a nie N niezależnych arbitrów.

### 1.3 Resume i idempotency

Klucz jest SHA-256 kanonicznego JSON `[phase_id, gate_type, question, ordered_options]`; rekomendacja, policy i output modeli nie należą do klucza (`gate-decision-engine.md:202-220`). Przed każdym wywołaniem hosta engine musi odczytać historię. Terminalne `decided|blocked|failed` zwraca bez kolejnego modelu, użytkownika i bez duplikatu (`gate-decision-engine.md:222-229`).

Resume z `advisor_pending` wraca do tego samego advisora i zachowuje próby; z `arbiter_pending` wraca wyłącznie do tej samej mapy arbitra. Niedokończona próba `status: started` jest zamykana jako timeout/interruption i zużywa slot retry (`gate-decision-engine.md:332-346`).

**Wniosek — confidence: high.** Idempotency gate oraz pojedyncze mapy ról wystarczają, aby nie uruchomić drugiego logicznego arbitra, pod warunkiem że pending i każda próba są naprawdę zapisywane przed wywołaniem.

## 2. Dokładne rozjazdy schematu

### 2.1 `started_phase` kontra `current_phase` kontra `phases[]`

- Wspólny schemat dokumentuje `orchestrator.started_phase` (`orchestrator-patterns.md:275-283`).
- Realny stan bieżącego researchu ma `started_phase: phase-1`, nie ma `current_phase`, a rootowe `phases[]` oznacza phase-1 jako `in_progress` (`.maister/tasks/research/2026-07-13-fix-codex-auto-continuation/orchestrator-state.yml:1-4,57-67`).
- Runner dopuszcza brak `current_phase` w ogólnym preflight (`phase-continue.mjs:529-561`), lecz każde przejście z `next_phase` wymaga `model.currentPhase === phaseId` (`phase-continue.mjs:564-576`). W efekcie realny state przejdzie część walidacji, a następnie failnie przy transition.
- Wszystkie pozytywne fixtures runnera używają `current_phase`, np. `tests/fixtures/phase-continue/valid-empty.yml:1-11`; aktywne testy przejścia asertują zmianę `current_phase` (`tests/fully-automatic-phase-continue.test.sh:13-38`).

**Rekomendacja — confidence: high.** Kanoniczne pole to `current_phase`, bo opisuje zmienny cursor wykonania i jest już wymagane przez wykonywalny transition oraz hostowe resume hooks. `started_phase` należy usunąć z wspólnego schematu i generatorów stanów; jeśli potrzebna jest informacja historyczna o wejściu, powinna być niemutowalnym `initial_phase`, nie konkurencyjnym kursorem. `phases[]` pozostaje źródłem statusów, ale nie powinno samodzielnie zastępować kursora: wyprowadzanie fazy z listy utrudnia walidację uszkodzonego stanu.

### 2.2 Pełny wynik engine kontra wąska historia runnera

Normatywny wynik ma zagnieżdżone `advisor` i `arbiter`, w tym agent, model, response, wszystkie attempts oraz exhausted (`gate-decision-engine.md:136-166`). Orchestrator ma zapisać kompletny wynik, a wzorzec dodatkowo wymaga question, options, gate type, policy/safety, odpowiedzi, modeli, retries i override (`orchestrator-patterns.md:121-126`).

Runner przyjmuje tylko `selected_option`, `actor` i `confidence` jako dane decyzji (`phase-continue.mjs:18-35,209-234`). Sam tworzy rationale `Validated fully automatic continuation`, ustawia `original_recommendation` na wybraną opcję i nie posiada surowej odpowiedzi ani prób (`phase-continue.mjs:765-782`). Jego `HISTORY_FIELDS` nie obejmuje `policy`, `safety_classification`, `advisor` ani `arbiter` (`phase-continue.mjs:281-298`), a walidator odrzuca każdy nieznany field (`phase-continue.mjs:502-527`).

**Wniosek — confidence: high.** To nie jest tylko różnica szerokości: runner traci provenance i może fałszywie zapisać `original_recommendation = selected_option` po arbitrażu. Obecny runner nie może być producentem kanonicznego rekordu decyzji. Powinien konsumować wcześniej utrwalony, zwalidowany terminalny rekord i wykonywać continuation; ewentualnie payload musi nieść klucz/oczekiwany wybór do weryfikacji, a nie dane do rekonstrukcji historii.

### 2.3 Testy nie wykonują advisora ani arbitra

`gate-decision-fixtures.yml` deklaruje agreement, dwa wyniki arbitra i resume (`gate-decision-fixtures.yml:4-15,48-63`), ale test tylko sprawdza, czy odpowiednie linie istnieją w YAML (`tests/gate-decision-engine.test.sh:70-109`). Reguła jednego arbitra również jest weryfikowana przez wyszukiwanie fraz w Markdown (`tests/gate-decision-engine.test.sh:173-180`).

Runnerowe testy wykonują persistence, raporty, transition i retry awarii, lecz przekazują już finalne `actor` i `selected_option`; nie uruchamiają state machine modeli (`tests/fully-automatic-phase-continue.test.sh:32-46`). Lokalny baseline przeszedł: 28 testów prose/fixture engine, smoke phase continuation oraz 21 przypadków kontraktu runnera. Zielony baseline potwierdza obecny wąski kontrakt, nie agreement/arbitration end-to-end.

**Wniosek — confidence: high.** Fixture agreement/arbitration jest specyfikacją deklaratywną, nie wykonywalnym dowodem. Potrzebny jest deterministyczny evaluator testujący kolejne durable stany i liczbę wywołań ról.

## 3. Proponowany kanoniczny schemat

Poniższy envelope scala tożsamość gate, politykę, pełny `normalized_gate_result` i continuation bez utraty danych:

```yaml
orchestrator:
  current_phase: phase-4
  completed_phases: []
  failed_phases: []
  gate_history:
    - schema_version: 1
      idempotency_key: "sha256:<64 lowercase hex>"
      phase_id: phase-4
      gate_type: research-convergence
      question: "Które podejście wybrać?"
      options: ["A", "B", "Need more info"]
      original_recommendation: "A"
      policy: fully_automatic
      safety_classification: configurable
      status: decided
      selected_option: "B"
      final_actor: arbiter
      advisor:
        agent: advisor
        model: gpt-5.6-sol
        response:
          selected_option: "B"
          rationale: "..."
          confidence: high
          escalate_to_user: false
        attempts: []
        exhausted: false
      arbiter:
        agent: arbiter
        model: gpt-5.6-sol
        response:
          selected_option: "B"
          rationale: "..."
          confidence: high
          escalate_to_user: false
        attempts: []
        exhausted: false
      rationale: "..."
      confidence: high
      escalate_to_user: false
      user_override: false
      continuation:
        kind: same_phase # same_phase | phase_transition | none
        target: "decision-area:2"
        status: pending # pending | applied | blocked
      error: null
```

Zasady:

- Rekord pending i terminalny mają ten sam envelope i idempotency key; aktualizacja rekordu nie dodaje drugiego wpisu.
- `advisor` i `arbiter` zawsze są pojedynczymi mapami (nullable response, lista prób). Nie modelować arbitra jako listy.
- `continuation` jest durable intent/receipt, a nie tylko string `phase_continue`; umożliwia rozróżnienie decyzji od wykonanego dispatchu i dokładne resume. Szczegóły targetu same-phase należą do kontraktu dispatchera.
- `current_phase` musi wskazywać jedyną fazę `in_progress`; wszystkie identyfikatory w `completed_phases` muszą odpowiadać fazom `completed`.
- Exact-schema validation pozostaje, ale allowlista musi być wspólna dla evaluator/runner/fixtures zamiast utrzymywania dwóch niezgodnych ręcznych list.

**Confidence: medium-high.** Pełny audyt i `current_phase` wynikają bezpośrednio z kontraktu. Strukturalny obiekt `continuation` jest rekomendowanym rozszerzeniem, ponieważ obecny scalar nie odróżnia durable intent od applied receipt; ostateczny kształt powinien zostać uzgodniony z modelem dispatchu kolejnych problemów.

## 4. Tabela przejść stanu gate

| Stan źródłowy | Zdarzenie | Trwały zapis przed akcją | Stan docelowy | Aktor / dalsza akcja |
|---|---|---|---|---|
| brak | valid gate, manual/denylist | `user_pending` | `user_pending` | user gate |
| brak | valid gate, advisor/fully automatic | `advisor_pending` + attempt `started` | `advisor_pending` | invoke advisor |
| `advisor_pending` | malformed/timeout, retry pozostaje | zakończona próba + backoff + nowa próba `started` | `advisor_pending` | ten sam advisor |
| `advisor_pending` | advisor agrees, high/medium, no escalation, supported AUTO | pełny terminalny rekord | `decided` | `final_actor: advisor`; raport, potem continuation |
| `advisor_pending` | advisor disagrees, arbitration enabled | advisor valid + jedna mapa arbitra + attempt `started` | `arbiter_pending` | invoke arbiter |
| `arbiter_pending` | malformed/timeout, retry pozostaje | zakończona próba + backoff + nowa próba w tej samej mapie | `arbiter_pending` | ten sam logiczny arbiter |
| `arbiter_pending` | valid high/medium, no escalation, supported AUTO | pełny terminalny rekord | `decided` | `final_actor: arbiter`; raport, potem continuation |
| `advisor_pending` / `arbiter_pending` | low/escalation/exhaustion | wynik/exhausted | `user_pending` albo `blocked` | user jeśli interaktywny, inaczej stop |
| dowolny pending | błąd trwałości/contract | pełny błąd, jeśli zapis możliwy | `failed` | stop |
| `decided|blocked|failed` | resume z tym samym kluczem | brak nowego wpisu i brak modeli | ten sam terminalny stan | odtwórz brakujące projekcje/continuation tylko zgodnie z receipt |

## 5. Kolejność trwałości i atomowość

Normatywna kolejność to: state read/key → pending/attempt atomic write → dashboard → model → updated attempt lub terminal atomic write → dashboard → raporty ze stanu → continuation (`gate-decision-engine.md:418-438`). Runner realizuje terminal state → ponowny odczyt → raporty → transition (`phase-continue.mjs:784-792`) i ma indywidualne atomic writes przez temp file, `fsync` i rename (`phase-continue.mjs:597-617`). Testy potwierdzają, że awaria raportu zostawia jeden terminalny wpis do regeneracji, a awaria transition jest dokańczana dokładnie raz (`tests/phase-continue-contract.test.sh:432-462`).

Nie jest to jedna transakcja obejmująca trzy pliki; bezpieczeństwo pochodzi z trwałego terminalnego checkpointu i idempotentnego recovery. Minimalny wymagany porządek:

1. przed modelem: utrwal pending i `attempt: started`;
2. po modelu: utrwal wynik próby;
3. po końcowym wyborze: utrwal kompletny terminalny rekord z `continuation.status: pending`;
4. odśwież dashboard i wygeneruj raporty wyłącznie z kanonicznego stanu;
5. wykonaj dispatch/transition;
6. utrwal `continuation.status: applied` i nowy cursor/status fazy w jednym atomicznym zapisie stanu albo zapewnij równoważny inwariant rozpoznawalny na resume.

**Confidence: high dla kolejności 1-5, medium dla receipt w kroku 6.** Obecny phase transition wykrywa applied po `current_phase` i statusach (`phase-continue.mjs:579-588`), ale same-phase dispatch będzie wymagał jawnego receipt/cursora.

## 6. Minimalne źródła prawdopodobnie wymagające zmiany

1. `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md` — jeden pełny schema/envelope, jawna semantyka pending update vs append, continuation receipt i usunięcie sprzeczności `failed` po awarii raportu.
2. `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` — zastąpić `started_phase` przez `current_phase`, dopisać inwariant względem `phases[]` i wskazać pełny record.
3. `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` — konsumować pełny istniejący terminalny rekord zamiast syntetyzować uboższą historię; walidować wspólny schema i aktualizować kanoniczny cursor/receipt.
4. `plugins/maister/skills/orchestrator-framework/references/gate-decision-fixtures.yml` — rozwinąć deklaracje do pełnych input/state/expected transitions dla agreement, obu wyników arbitra, retry i resume.
5. `tests/gate-decision-engine.test.sh` — zastąpić lub uzupełnić grep-tests wykonywalnym deterministic evaluator harness, z licznikami advisor/arbiter/user i asercją jednego obiektu historii.
6. `tests/fixtures/phase-continue/*.yml`, `tests/phase-continue-contract.test.sh`, `tests/fully-automatic-phase-continue.test.sh` — użyć realnego pełnego stanu tworzonego przez workflow oraz testować migration/inwariant `current_phase`.
7. Źródłowe `plugins/maister/skills/{research,product-design,development,migration,performance}/SKILL.md` — generowanie i resume muszą używać tego samego kursora i pełnego rekordu; generated variants powinny powstać dopiero przez build.

Minimalny pierwszy pion zmian to schema + real fixtures + evaluator test. Dopiero na tym kontrakcie runner i adapter Codex mogą bezpiecznie wykonywać decyzję bez utraty audytu.
