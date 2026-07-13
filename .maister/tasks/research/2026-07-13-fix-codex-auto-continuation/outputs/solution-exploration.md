# Eksploracja rozwiązań: automatyczna kontynuacja Codex

## TL;DR

Najmocniejszy wariant to wspólny wykonywalny evaluator z portami hosta, pełny terminalny rekord zapisywany przed continuation oraz workflow-owned durable work-item cursor z outbox/receipt.
Codex powinien dostać cienki binding, który uruchamia wspólne komponenty i oddaje `continue` do aktywnej pętli bez kończenia tury; nie powinien posiadać własnej kopii logiki decyzji ani routingu.
Zgodność original/advisor kończy gate aktorem `advisor`; rozbieżność tworzy jeden logiczny obiekt `arbiter`, a retry dopisują tylko attempts.
Capability pozostaje `unsupported`, dopóki host-native E2E nie zaobserwuje następnego same-phase work itemu i następnej fazy bez UI.

## Key Decisions

- Rekomendacja A3: wspólny executable evaluator/CLI z wstrzykiwanymi portami ról i bez wiedzy o domenowym routingu.
- Rekomendacja B1: evaluator jest jedynym właścicielem pełnego gate recordu; runner weryfikuje terminalny wybór, generuje projekcje i commituję transition/receipt.
- Rekomendacja C1: workflow materializuje stabilne work itemy, a durable outbox z `dispatch_id` prowadzi same-phase i next-phase continuation.
- Rekomendacja D1: cienki host-native binding Codex wokół wspólnych CLI i jawnego `continue | user_gate | blocked`, z fake portami w testach i realnym hostem w capability E2E.

## Open Questions / Risks

- Stabilny mechanizm utrzymania aktywnej tury i headless uruchomienia realnego Codex wymaga krótkiego spike'a; to wpływa na formę D1, ale nie na granice komponentów.
- Trzeba ustalić jeden wersjonowany schema/envelope używany przez evaluator, runner, workflowy i fixtures, łącznie z migracją `started_phase → current_phase`.
- Exactly-once oznacza jeden logiczny efekt deduplikowany przez `dispatch_id`; fizyczny retry hosta po przerwaniu pozostaje możliwy.
- Dwa procesy zapisujące ten sam YAML wymagają wspólnego repozytorium/lockowania lub ścisłej sekwencji z compare-and-swap po revision.

## 1. Kryteria i niezmienne ograniczenia

Każdy wariant oceniono w pięciu wymiarach: wykonalność techniczna, prostota, ryzyko, przenośność/skalowalność oraz poprawność audytu i resume.

Niezmienne wymagania:

1. Hard denylista, low confidence, eskalacja i wyczerpanie retry pozostają fail-closed.
2. Advisor i arbiter są read-only wobec artefaktów i stanu; zapis wykonuje deterministyczny komponent hosta/frameworka.
3. Jeden gate ma jeden idempotency key i jeden rekord przechodzący pending → terminal.
4. Rozbieżność tworzy dokładnie jeden logiczny arbiter; kolejne wywołania są attempts tego samego obiektu.
5. Terminalny wybór jest trwały przed raportami, cursorem i dispatch'em.
6. Edycje trafiają do `plugins/maister/` i `platforms/codex-cli/`; generated variants powstają przez build.
7. „Kontynuacja” jest udowodniona dopiero przez obserwowalny następny work item lub checkpoint nowej fazy, nie przez sam stdout lub zmianę statusu.

## 2. Obszar A — właściciel i packaging wykonywalnego evaluatora

Ta decyzja określa, gdzie naprawdę wykonywane są agreement, arbitration, retry, resume, denylista i walidacja czteropolowego outputu.

### A1. Logika wyłącznie w instrukcjach workflow hosta

Każdy SKILL opisuje state machine, a główny agent wykonuje ją przy użyciu natywnych subagentów i bez nowego programu.

**Plusy**

- Najmniej nowego kodu i zależności.
- Naturalny dostęp do natywnego delegation i aktywnej tury.
- Szybki prototyp jednego call site'u.

**Minusy**

- Obecny root cause pozostaje: prose nie jest wykonywalnym, deterministycznym kontraktem.
- Duplikacja i drift między research, product-design, development oraz hostami.
- Trudno dowieść retry budget, resume pending i jednego logicznego arbitra fixture'ami.
- Wysokie ryzyko ponownego wyświetlenia UI po compaction/resume.

**Ocena:** wykonalność wysoka; prostota początkowa wysoka; ryzyko wysokie; przenośność niska; audyt/resume niski.

### A2. Rozszerzyć `phase-continue.mjs` do monolitu gate + persistence + dispatch

Runner wywołuje role, wybiera, zapisuje, generuje raporty i dispatchuje następny target.

**Plusy**

- Jeden entrypoint i pozornie jedna transakcja kontroli.
- Łatwy test CLI bez angażowania wielu procesów.
- Mniej transportowych kontraktów między komponentami.

**Minusy**

- Node runner nie ma natywnego API do subagentów ani utrzymania tury Codex.
- Łączy wspólną logikę decyzji z domenowym routingiem i hostem.
- Rozszerza blast radius sprawdzonego writer'a oraz komplikuje portability.
- Same-phase work item nadal wymaga wiedzy z konkretnego workflow.

**Ocena:** wykonalność średnia; prostota średnia; ryzyko wysokie; przenośność niska; audyt/resume średni.

### A3. Wspólny executable evaluator z portami hosta — rekomendowane

Nowy wspólny moduł/CLI (np. `gate-evaluate.mjs`) posiada czystą state machine i korzysta z wstrzykiwanego `role_invoker`; host dostarcza wywołanie advisora/arbitra, ale nie implementuje reguł wyboru.

**Plusy**

- Agreement, jeden arbiter, retry i resume stają się executable i fixture-testable.
- Jeden kontrakt dla wszystkich workflowów i hostów.
- Role pozostają read-only, a wszystkie mutacje przechodzą przez deterministyczny state repository.
- Fake role port daje szybkie i pełne testy bez niedeterministycznego modelu.

**Minusy**

- Trzeba zdefiniować port natywnego delegation oraz granicę procesu/IPC.
- Wymaga wspólnego schema i ostrożnej migracji realnych states.
- Należy rozwiązać lock/revision przy wielu zapisach state.

**Ocena:** wykonalność wysoka; prostota średnia; ryzyko średnie-niskie; przenośność wysoka; audyt/resume wysoki.

### A4. Codex-only evaluator w adapterze platformy

Cały algorytm trafia do `platforms/codex-cli/`; shared runner pozostaje bez zmian.

**Plusy**

- Można optymalizować dokładnie pod natywne możliwości Codex.
- Ograniczony początkowy zakres wdrożenia.
- Nie blokuje się na pełnej migracji innych hostów.

**Minusy**

- Powstaje drugi gate engine obok kanonicznego kontraktu.
- Inne hosty nie korzystają z testów i poprawek.
- Adapter przestaje być cienki, a generated parity staje się trudniejsza.
- Wysokie ryzyko różnej semantyki denylisty i resume.

**Ocena:** wykonalność wysoka; prostota średnia; ryzyko wysokie; przenośność niska; audyt/resume średni.

**Rekomendacja:** A3. Zapewnia wykonywalność bez wciskania hostowych ani domenowych odpowiedzialności do runnera. A1 może posłużyć tylko jako spike portu; nie powinno być rozwiązaniem produkcyjnym.

## 3. Obszar B — właściciel kanonicznego stanu i terminalnego rekordu

Ta decyzja usuwa obecny konflikt: gate engine wymaga pełnego audytu, a runner syntetyzuje uboższy record z już wybranej opcji.

### B1. Evaluator zapisuje pełny rekord, runner konsumuje i weryfikuje — rekomendowane

Evaluator aktualizuje jeden envelope od pending do terminal. Runner dostaje idempotency key i oczekiwany wybór, ponownie czyta state, weryfikuje terminalny rekord, generuje raporty i commituję continuation.

**Plusy**

- Komponent posiadający modelową state machine posiada także pełny provenance.
- Runner nie rekonstruuje rationale, original recommendation ani attempts.
- Resume może osobno naprawić raport/transition bez ponawiania modelu.
- Jasny inwariant: decyzja trwała przed efektami.

**Minusy**

- Evaluator i runner są dwoma writerami; potrzebują wspólnego repository API, revision/CAS lub ścisłej sekwencji.
- Payload runnera i schema history muszą zostać zmienione razem.
- Migracja istniejących wąskich terminal records wymaga decyzji kompatybilności.

**Ocena:** wykonalność wysoka; prostota średnia; ryzyko średnie; przenośność wysoka; audyt/resume wysoki.

### B2. Runner jest jedynym writerem pełnego recordu

Evaluator zwraca kompletny immutable result envelope; runner zapisuje pending, attempts i terminal records przez kolejne komendy.

**Plusy**

- Jeden filesystem writer i jedno miejsce atomic write.
- Łatwiej kontrolować exact schema i permissions.
- Runner może zachować istniejące wzorce failure injection.

**Minusy**

- Wymaga wielokrotnych round-tripów do runnera przed i po każdym model call.
- Host/evaluator musi utrzymywać state machine między procesami, a runner staje się RPC state service.
- Większy transport i więcej stanów częściowego sukcesu.
- Trudniej zachować prosty kontrakt obecnego `phase-continue.mjs`.

**Ocena:** wykonalność średnia-wysoka; prostota niska; ryzyko średnie; przenośność średnia; audyt/resume wysoki.

### B3. Jeden zintegrowany command transaction dla gate i continuation

Proces pozostaje żywy przez model calls, a na końcu zapisuje terminal record, raporty i target.

**Plusy**

- Jedno API wejściowe dla adaptera.
- Może centralizować locking i schema validation.
- Czytelny happy path.

**Minusy**

- Nie daje prawdziwej transakcji przez zewnętrzne model calls i host dispatch.
- Crash podczas długiego procesu nadal wymaga pending checkpointów.
- Zbliża się do monolitu A2 i utrudnia natywne delegation.
- Duży refactor przed uzyskaniem tracer-bullet proof.

**Ocena:** wykonalność średnia; prostota średnia-niska; ryzyko wysokie; przenośność średnia; audyt/resume średni.

### B4. Append-only event log jako jedyne źródło prawdy

Każdy pending, attempt, decision i dispatch jest osobnym eventem; bieżący state jest projekcją.

**Plusy**

- Najpełniejszy audyt i naturalny recovery timeline.
- Brak update-in-place pojedynczego gate recordu.
- Dobra podstawa do diagnostyki concurrency.

**Minusy**

- Nieproporcjonalna zmiana architektury projektu dokumentacyjnego bez bazy.
- Wymaga projektora, migracji wszystkich workflowów i nowego modelu dashboardu.
- Trudniejsza exact-schema kompatybilność i większy koszt operacyjny.
- Łamie minimal implementation dla konkretnego buga.

**Ocena:** wykonalność średnia; prostota niska; ryzyko wysokie; przenośność wysoka; audyt/resume bardzo wysoki.

**Rekomendacja:** B1, uzupełnione wspólnym małym `state-repository` helperem z atomic write, revision i invariant checks. B4 jest atrakcyjnym kierunkiem długoterminowym, lecz wykracza poza naprawę.

## 4. Obszar C — same-phase cursor i protokół dispatchu

Ta decyzja odpowiada za automatyczne przejście od area N do N+1 oraz za realne wejście do kolejnej fazy.

### C1. Workflow-owned inventory + durable outbox/receipt — rekomendowane

Workflow materializuje stabilne work itemy. Po terminalnym gate idempotentnie aplikuje wybór, oznacza item completed i zapisuje następny target z `dispatch_id`; adapter dispatchuje, receiver deduplikuje i zapisuje ack.

**Plusy**

- Domenowa kolejność i zależne alternatywy pozostają w workflowie.
- Stabilny `work_item_id` i receipt dają logiczne exactly-once oraz precyzyjny resume.
- Ten sam protokół obsługuje `same_phase_work_item` i `phase_entry`.
- Test może obserwować rzeczywisty następny checkpoint, nie tylko status.

**Minusy**

- Więcej pól state i kilka crash windows do przetestowania.
- Każdy workflow z pętlą musi materializować inventory zgodnie ze wspólnym kontraktem.
- Receiver musi honorować deduplikację `dispatch_id`.

**Ocena:** wykonalność wysoka; prostota średnia; ryzyko średnie-niskie; przenośność wysoka; audyt/resume wysoki.

### C2. Tylko liczbowy cursor/index w phase summary

Workflow zapisuje `current_index`, inkrementuje po wyborze i natychmiast wykonuje następny element.

**Plusy**

- Minimalny schema i prosty happy path.
- Łatwe wdrożenie dla research Phase 4.
- Mało kodu do pierwszego demo.

**Minusy**

- Zmiana/reorder artefaktu może skierować resume na inny problem.
- Brak identity, source gate key, dispatch intent i ack.
- Crash po inkrementacji nie rozstrzyga, czy kolejny efekt już wykonano.
- Słabo przenosi się na zależne lub dynamiczne inventory.

**Ocena:** wykonalność bardzo wysoka; prostota wysoka; ryzyko wysokie; przenośność niska; audyt/resume niski.

### C3. Runner wylicza i zapisuje generyczny następny target

Payload zawiera pełną listę work itemów, a runner waliduje i przesuwa cursor.

**Plusy**

- Centralne durability i strict transition checks.
- Adapter dostaje gotowy target.
- Możliwe wspólne fixture'y dla cursora.

**Minusy**

- Runner musi znać semantykę itemów lub ufać dużemu payloadowi.
- Nie potrafi bez workflowu przeliczyć alternatyw zależnych od poprzedniego wyboru.
- Sprzęga shared runner z formatami phase summaries.
- Nadal nie dispatchuje aktywnej tury.

**Ocena:** wykonalność średnia; prostota średnia; ryzyko średnie-wysokie; przenośność średnia; audyt/resume wysoki.

### C4. Ephemeral same-turn loop bez durable dispatch state

Po sukcesie adapter po prostu kontynuuje `for each area`, a resume wyznacza pierwsze `chosen_approach: null`.

**Plusy**

- Najmniej zmian w schema.
- Naturalnie pasuje do obecnego prose call site'u.
- Szybko usuwa widoczny user click w happy path.

**Minusy**

- Crash między efektem i kolejnym dispatch'em jest niejednoznaczny.
- Brak dispatch dedupe i observation receipt.
- Re-derywacja z mutującego artefaktu może być niestabilna.
- Host-native E2E nie ma trwałego dowodu dokładnie którego itemu podjęto.

**Ocena:** wykonalność wysoka; prostota bardzo wysoka; ryzyko średnie-wysokie; przenośność średnia; audyt/resume niski.

**Rekomendacja:** C1. Minimalny pierwszy pion może ograniczyć inventory do dwóch research decision areas, ale musi od początku używać stabilnego ID i `dispatch_id`, aby prototyp nie utrwalił wadliwego indeksowego kontraktu.

## 5. Obszar D — binding Codex i seam host-native E2E

Ta decyzja rozstrzyga, jak połączyć natywne role Codex, wspólny evaluator/runner i pętlę workflow bez kończenia tury.

### D1. Cienki host-native binding wokół wspólnych CLI — rekomendowane

Generated skill wywołuje natywne subagenty przez jawny port, przekazuje ich outputs do wspólnego evaluatora, uruchamia runner, waliduje stdout i zwraca do workflow loop `continue | user_gate | blocked`.

**Plusy**

- Zachowuje natywne delegation i aktywną turę Codex.
- Shared core pozostaje testowalny fake portami; adapter pozostaje cienki.
- Brak dodatkowego długo żyjącego serwisu.
- Najlepiej pasuje do istniejącego single-source/build modelu.

**Minusy**

- Exact mechanizm callbacku/utrzymania tury wymaga spike'a z realnym Codex.
- Część bindingu może nadal być instruction-driven, jeśli host nie wystawia stabilnego programmatic hooka.
- E2E musi odróżniać rzeczywisty host od testu samego Node CLI.

**Ocena:** wykonalność średnia-wysoka; prostota średnia; ryzyko średnie; przenośność wysoka; audyt/resume wysoki.

### D2. Lokalny MCP/tool server jako runtime adapter

Plugin dostarcza narzędzia `evaluate_gate`, `continue_gate` i `dispatch_next`, a Codex wywołuje je w jednej turze.

**Plusy**

- Jawne, wykonywalne API i łatwe strict schemas.
- Dobre miejsce na locking, fake ports i observability.
- Potencjalnie przenośne na inne hosty z MCP.

**Minusy**

- Nowy proces/usługa, lifecycle i konfiguracja MCP zwiększają koszt instalacji.
- Tool nadal nie może sam zmusić modelu-host do kontynuacji po odpowiedzi; instrukcja loop pozostaje potrzebna.
- Wykracza poza minimalny dependency/runtime footprint.
- Większa powierzchnia bezpieczeństwa.

**Ocena:** wykonalność wysoka; prostota niska; ryzyko średnie; przenośność wysoka; audyt/resume wysoki.

### D3. Zewnętrzny headless Codex wrapper sterujący całą sesją

Skrypt uruchamia `codex exec`, przechwytuje outputs i ponawia kolejne prompty/work items aż do completion.

**Plusy**

- Pełna kontrola nad loopem i łatwa automatyzacja CI.
- Jasny host-native E2E entrypoint.
- Niezależność od zachowania pojedynczej odpowiedzi skillu.

**Minusy**

- Ryzyko zagnieżdżonych sesji, utraty bieżącego kontekstu i różnic CLI/IDE.
- Trudne bezpieczne wstrzyknięcie fake role invokera.
- Może nie reprezentować realnego plugin invocation użytkownika.
- Wysokie ryzyko niestabilności wersji CLI.

**Ocena:** wykonalność średnia; prostota niska; ryzyko wysokie; przenośność niska; audyt/resume średni.

### D4. Codex-specific background daemon/outbox consumer

Daemon obserwuje `orchestrator-state.yml`, pobiera ready dispatches i uruchamia kolejne zadania niezależnie od assistant turn.

**Plusy**

- Naturalny durable outbox consumer i recovery po zakończeniu tury.
- Może przetwarzać wiele workflowów i retry.
- Łatwe acknowledgement oraz metryki.

**Minusy**

- Zmienia model produktu z lokalnego pluginu bez usługi na proces w tle.
- Nie spełnia dosłownie wymogu kontynuacji w tej samej aktywnej turze.
- Problemy lifecycle, concurrency, uprawnień i instalacji.
- Nadmiarowe dla pojedynczego buga.

**Ocena:** wykonalność średnia; prostota niska; ryzyko wysokie; przenośność niska; audyt/resume wysoki.

**Rekomendacja:** D1, z D2 jako fallback tylko jeśli spike wykaże, że Codex nie zapewnia stabilnego portu/bindingu w aktywnej turze. Host-native E2E musi uruchomić realny Codex entrypoint, podczas gdy fake zastępuje wyłącznie role i dispatcher.

## 6. Zależności między decyzjami

```text
A3 executable evaluator
    └── wymaga B1 pełnego terminalnego envelope
            └── runner może bezstratnie commitować projekcje/transition

C1 workflow inventory + outbox
    ├── konsumuje terminalny wybór z B1
    └── dostarcza target i dispatch_id dla D1

D1 Codex binding
    ├── dostarcza role_invoker do A3
    ├── uruchamia runner po B1
    └── oddaje continue do loopu realizującego C1
```

Decyzje A3+B1 są fundamentem wspólnym. C1 może być wdrażane tracer-bulletem w research Phase 4. D1 zamyka ostatnią milę hosta i dopiero jego native E2E uprawnia capability flip.

## 7. Macierz rekomendowanego zestawu

| Wymiar | A3 evaluator | B1 ownership | C1 cursor/outbox | D1 Codex binding |
|---|---|---|---|---|
| Techniczna wykonalność | Wysoka | Wysoka | Wysoka | Średnia-wysoka |
| Prostota | Średnia | Średnia | Średnia | Średnia |
| Ryzyko | Średnie-niskie | Średnie | Średnie-niskie | Średnie |
| Portability | Wysoka | Wysoka | Wysoka | Wysoka przez cienki adapter |
| Audyt/resume | Wysoki | Wysoki | Wysoki | Wysoki przy native E2E |
| Krytyczny dowód | executable fixtures | full-record recovery | same-phase crash/resume | no-UI real host dispatch |

## 8. Proponowany tracer bullet

1. Ustalić wersjonowany gate envelope, `current_phase`, revision oraz `continuation` z `work_item_id` i `dispatch_id`.
2. Zaimplementować evaluator dla agreement i disagreement z jednym logicznym arbitrem oraz fake `role_invoker`.
3. Zmienić runner tak, by reużywał pełny terminalny record, a nie syntetyzował historię.
4. Zaimplementować dwa zależne work itemy w research Phase 4: area A → durable choice → area B ready → dispatch/ack.
5. Dodać cienki Codex binding zwracający `continue` do pętli oraz UI spy.
6. Udowodnić agreement, oba wyniki arbitra, crash po terminalu, crash po cursorze, same-phase i next-phase w testach.
7. Zbudować generated variants i uruchomić reproducibility/validate.
8. Uruchomić realny host-native Codex E2E; capability zmienić dopiero po exit `0`.

## 9. Dlaczego nie pozostałe zestawy

- A1+C4 usuwa kliknięcie w happy path, lecz nie naprawia deterministycznego resume i pozostawia root cause jako prose-only.
- A2+C3 centralizuje za dużo w runnerze, który nie zna domeny ani aktywnej tury hosta.
- A4 daje szybki Codex-only sukces kosztem drugiej semantyki gate i przyszłego driftu platform.
- B4+D4 tworzy solidną platformę eventową, ale jest nieproporcjonalne do lokalnego pluginu i obecnego minimalnego runtime.
- D2 jest technicznie czyste, lecz nowy MCP runtime warto przyjąć dopiero po dowodzie, że D1 nie może być stabilnie wykonane.

## 10. Stretch ideas / poza zakresem

- Wspólny machine-readable JSON Schema generujący validators, docs i fixtures dla gate/continuation envelope.
- Append-only diagnostyczny journal obok canonical snapshotu, bez zastępowania state jako source of truth.
- Generyczny workflow work-item SDK dla research, product-design i development po udanym tracer bullecie.
- Chaos/failure-injection suite dla wszystkich crash windows i filesystem modes.
- Capability manifest raportujący osobno `decision_automation`, `same_phase_continuation` i `phase_entry_continuation` zamiast jednego boolean.
- Background outbox consumer dla przyszłych nieinteraktywnych/batch workflowów; nie dla obecnej interaktywnej ścieżki.

## 11. Źródła

- `../analysis/synthesis.md`
- `research-report.md`
- `../analysis/findings/01-gate-state-contract.md`
- `../analysis/findings/02-continuation-dispatch.md`
- `../analysis/findings/03-codex-host-adapter.md`
- `../analysis/findings/04-verification-safety.md`
- `.maister/docs/project/architecture.md`
- `.maister/docs/project/vision.md`

