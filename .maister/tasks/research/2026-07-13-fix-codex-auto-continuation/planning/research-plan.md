# Plan badania: naprawa automatycznej kontynuacji Codex

## TL;DR
Badanie prześledzi pełny control flow od rekomendacji głównego agenta, przez advisora i opcjonalnego arbitra, do trwałego zapisu oraz dispatchu kolejnej jednostki pracy.
Cztery niezależne strumienie oddzielą: kontrakt gate/state, wykonanie i routing, adapter Codex oraz dowody testowe i bezpieczeństwo.
Wynikiem ma być jednoznaczny docelowy algorytm, mapa zmian per plik i macierz testów; bez implementowania poprawki.

## Key Decisions
- Użyć technicznej metodologii iterative deepening oraz triangulacji kod–workflow prose–testy.
- Traktować „kontynuację” jako dwa osobne przypadki do udowodnienia: następny decision area/problem w tej samej fazie oraz następna faza.
- Oceniać `plugins/maister/` i `platforms/codex-cli/` jako źródła edytowalne; generated variants służą wyłącznie do weryfikacji reprodukowalności.
- Nie używać zewnętrznych źródeł: problem dotyczy lokalnego, normatywnego kontraktu Maister i hostowego adaptera Codex.

## Open Questions / Risks
- Czy poprawny seam to rozszerzenie `phase-continue.mjs`, osobny ogólny continuation dispatcher, czy hostowa pętla nad niezmienionym runnerem fazowym?
- Kanoniczne workflowy zapisują `started_phase`, a runner wymaga `current_phase`; trzeba ustalić migrację bez dwóch źródeł prawdy.
- Normatywny rekord gate zawiera pełne dane advisora/arbitra, natomiast runner akceptuje obecnie węższy rekord; jego poszerzenie nie może osłabić walidacji exact-schema.
- Host-native E2E nie może zależeć od niedeterministycznej odpowiedzi rzeczywistego modelu; potrzebny może być fake adapter zgodny z rzeczywistym interfejsem Codex.

## 1. Cel i oczekiwany rezultat

Badanie ma odpowiedzieć, jak doprowadzić bezpieczny, niedenylistowany gate `fully_automatic` do następującego zachowania:

1. Główny agent tworzy gate z dokładnymi opcjami i `original_recommendation`.
2. Advisor zwraca zwalidowaną rekomendację.
3. Gdy rekomendacje są zgodne, advisor staje się aktorem terminalnej decyzji.
4. Gdy są rozbieżne, tworzony jest dokładnie jeden logiczny arbiter; retry są próbami tego samego arbitra.
5. Terminalny wynik, pełny audit i wymagane raporty są trwale zapisane przed jakąkolwiek kontynuacją.
6. Dispatcher automatycznie uruchamia następny decision area/problem albo następną fazę, bez user gate i bez syntetycznego kliknięcia.
7. Denylista, `confidence: low`, eskalacja, wyczerpanie retry, nieobsługiwana capability lub błąd trwałego zapisu kończą ścieżkę fail-closed.

Oczekiwane artefakty gathererów:

- `analysis/findings/01-gate-state-contract.md`
- `analysis/findings/02-continuation-dispatch.md`
- `analysis/findings/03-codex-host-adapter.md`
- `analysis/findings/04-verification-safety.md`

Każdy finding ma wskazać dowód `plik:linia` lub nazwę testu, confidence per wniosek, luki oraz minimalny zestaw plików, które prawdopodobnie trzeba zmienić. Gatherery nie implementują zmian.

## 2. Metodologia

### Etap A — broad discovery

- Wyszukać wszystkie użycia `fully_automatic`, `evaluate_gate`, `phase_continue`, `current_phase`, `started_phase`, `gate_history`, `research-convergence`, `decision_areas` i capability matrix.
- Oddzielić źródła kanoniczne, adaptery platformowe, generated variants i test fixtures.
- Zbudować inventory producentów i konsumentów `orchestrator-state.yml`.

### Etap B — targeted reading i flow tracing

- Przeczytać normatywne sekcje gate engine oraz orchestrator patterns.
- Prześledzić `phase-continue.mjs` od payload validation, przez canonical-state preflight, zapis terminalny/raporty, do transition.
- Prześledzić konkretne call sites phase-exit i sekwencyjnej convergence w workflowach.
- Prześledzić generowanie Codex pluginu i dowody capability.

### Etap C — porównanie kontraktów

Zestawić w jednej macierzy:

- wymagane pola state i gate history;
- aktorów i przejścia statusów;
- warunki agreement/disagreement/arbitration;
- moment trwałego zapisu;
- rezultat runnera;
- routing do kolejnej jednostki pracy;
- zachowanie resume/retry/failure.

### Etap D — weryfikacja hipotez

- Uruchamiać istniejące testy read-only, by potwierdzić obecny baseline.
- Dla brakujących przypadków opisać przyszłe deterministic fixtures i oczekiwane asercje.
- Nie zmieniać capability na `supported`, dopóki host-native E2E nie udowodni całej ścieżki.

## 3. Gathering strategy — cztery niezależne kategorie

### Kategoria 1 — Kanoniczny gate engine i schema stanu

**Cel:** ustalić jedyny obowiązujący algorytm decyzji i znaleźć dokładne rozjazdy schema.

**Źródła obowiązkowe:**

- `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md:57-170, 222-330`
- `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:94-128, 275-325`
- `plugins/maister/skills/orchestrator-framework/references/gate-decision-fixtures.yml` — fixtures `advisor-agrees`, oba warianty arbitra, resume i `fully-automatic-phase-continue`
- `.maister/tasks/research/2026-07-13-fix-codex-auto-continuation/orchestrator-state.yml`
- `.maister/tasks/research/2026-07-13-issue-tracker-workflow/analysis/codex-fully-automatic-diagnosis.md`

**Pytania:**

1. Jaki dokładnie warunek pozwala advisorowi zakończyć gate bez arbitra i bez użytkownika?
2. Jak reprezentować „dokładnie jednego logicznego arbitra” oraz jego retry, żeby resume nie uruchomił drugiego arbitra ani advisora ponownie?
3. Który model fazy jest kanoniczny: `started_phase`, `current_phase`, czy pochodna statusów `phases[]`?
4. Czy pełny `normalized_gate_result` powinien być bezpośrednio rekordem `gate_history`, czy potrzebuje jawnej, bezstratnej projekcji runnera?
5. Które zapisy muszą być atomiczne i w jakiej kolejności przed dispatch?

**Wynik:** proponowany canonical schema, tabela state transitions i lista niezgodności z dokładnymi producentami/konsumentami.

### Kategoria 2 — Runner, call sites i dispatch następnej pracy

**Cel:** znaleźć miejsce, w którym decyzja jest zapisana, lecz execution turn nie przechodzi do kolejnego problemu.

**Źródła obowiązkowe:**

- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs:18-35, 210-244, 269-298, 502-589, 591-700, 711-805`
- `plugins/maister/skills/research/SKILL.md:91-120, 320-361`
- `plugins/maister/skills/product-design/SKILL.md:508-559`
- `plugins/maister/skills/development/SKILL.md:113-169, 275-290`
- `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:130-139`

**Pytania:**

1. Co runner robi dla payloadu bez `next_phase`, a co dla payloadu z `next_phase`?
2. Czy `phase_continue` jest właściwą abstrakcją dla kolejnego decision area w tej samej fazie, czy jedynie dla zmiany statusu faz?
3. Gdzie powinien żyć trwały continuation cursor, np. indeks decision area/problem, aby resume kontynuował dokładnie raz?
4. Kto po sukcesie runnera ma wykonywać następny dispatch: runner, host adapter czy pętla workflow orchestratora?
5. Jak rozróżnić „wybierz opcję” od „uruchom następną jednostkę pracy”, aby terminalny record nie był mylony z zakończeniem tury hosta?
6. Jak zachować sekwencyjność zależnych decision areas bez wracania do UI?

**Wynik:** mapa control flow `gate → persistence → report → dispatch`, rekomendowany seam oraz osobne kontrakty dla same-phase advance i phase transition.

### Kategoria 3 — Codex host adapter i capability projection

**Cel:** ustalić minimalny host-native mechanizm, który wykonuje zwalidowany wynik, a nie tylko opisuje go w promptcie.

**Źródła obowiązkowe:**

- `platforms/codex-cli/templates/advisor.toml:1-18`
- `platforms/codex-cli/build.sh:182-212, 315-331`
- `platforms/codex-cli/smoke-cli.sh:66-89`
- `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh:1-5`
- `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml`
- `Makefile:29-63`
- `plugins/maister-codex/` tylko jako wygenerowany rezultat do porównania z adapterem, nigdy jako miejsce proponowanej edycji źródłowej

**Pytania:**

1. Jakie rzeczywiste prymitywy Codex są dostępne do wywołania advisora/arbitra i natychmiastowej kontynuacji tej samej tury?
2. Jaki kanoniczny plik lub wrapper pod `platforms/codex-cli/` powinien mapować normalized result na dokładny JSON runnera?
3. Jak adapter odróżni zgodność od rozbieżności oraz zagwarantuje jednego logicznego arbitra?
4. Jak host ma obserwować sukces: terminal state, raport, same-phase cursor/phase transition oraz uruchomienie następnej jednostki pracy?
5. Jaki deterministyczny fake advisor/arbiter zachowuje hostowy kontrakt bez zależności od modelu?
6. Kiedy dokładnie można zmienić `declared_status` Codex z `unsupported` na `supported`?

**Wynik:** projekt interfejsu adaptera, mapa build/generation oraz dowód wymagany przez capability matrix.

### Kategoria 4 — Testy kontraktowe, E2E, resume i safety

**Cel:** zbudować kompletną macierz dowodów zachowania i regresji bezpieczeństwa.

**Źródła obowiązkowe:**

- `tests/fully-automatic-phase-continue.test.sh:13-53`
- `tests/phase-continue-contract.test.sh` — `test_accepts_canonical_state_fixtures`, `test_normal_decision_writes_deterministic_reports`, `test_denylist_stays_blocked_on_retry`, `test_changed_selection_is_rejected_without_mutation`, `test_report_failure_leaves_terminal_record_for_regeneration`, `test_transition_failure_recovers_exactly_once`
- `tests/gate-decision-engine.test.sh`
- `tests/fixtures/phase-continue/*.yml`
- `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh`
- `.maister/docs/standards/testing/test-writing.md`
- `.maister/docs/standards/global/build-pipeline.md`

**Pytania:**

1. Jakie istniejące testy dowodzą persistence i phase transition, a czego nie dowodzą w zakresie advisora, arbitra i kolejnego problemu?
2. Jakie fixtures są potrzebne dla: agreement, arbiter wybiera original, arbiter wybiera advisor, kolejny decision area, następna faza, interrupted resume i retry exhaustion?
3. Jak asercjami udowodnić: jeden wpis historii, jeden logical arbiter, brak user prompt, brak podwójnego dispatchu i byte-exact non-mutation po odrzuceniu?
4. Jak wstrzykiwać awarie state/report/dispatch, żeby wykazać właściwą kolejność trwałości?
5. Jak rozdzielić szybkie testy kontraktowe od host-native E2E, które jest jedynym dowodem capability?

**Wynik:** macierz testów z poziomem (fixture/unit/contract/host-E2E), setupem, oczekiwanym stanem i negatywnymi asercjami.

## 4. Plan syntezy

Synteza ma scalić findings w następującej kolejności:

1. **Aktualny control flow** — dokładny diagram od gate call site do miejsca zatrzymania tury.
2. **Rozjazdy kontraktowe** — state schema, gate record, runner payload, continuation target.
3. **Docelowy algorytm** — agreement, disagreement, jeden arbiter, fail-closed i idempotentny resume.
4. **Continuation model** — wspólny model kolejnego problemu i kolejnej fazy albo uzasadnione rozdzielenie tych mechanizmów.
5. **Zmiany per plik** — wyłącznie źródła kanoniczne i adapter Codex; generated variants jako wynik `make build`.
6. **Kolejność wdrożenia** — schema/fixtures → runner/dispatcher → adapter → workflow call sites → E2E/capability.
7. **Macierz akceptacji** — wszystkie ścieżki pozytywne, resume/retry oraz granice bezpieczeństwa.

## 5. Kryteria zakończenia badania

Badanie jest kompletne, gdy raport:

- wskazuje jeden konkretny punkt obecnego zatrzymania oraz odpowiedzialną warstwę;
- podaje bezsprzeczny algorytm agreement/disagreement/arbitration;
- definiuje durable cursor/dispatch dla kolejnego decision area i transition dla kolejnej fazy;
- wskazuje dokładne pliki źródłowe do zmiany i generated outputs do regeneracji;
- zawiera test host-native, który kończy się kodem `0` i obserwuje brak UI oraz realny następny dispatch;
- zachowuje denylistę, low confidence, escalation, retry exhaustion i transactional failure jako fail-closed;
- nie rekomenduje `supported` przed przejściem pełnego Codex E2E.
