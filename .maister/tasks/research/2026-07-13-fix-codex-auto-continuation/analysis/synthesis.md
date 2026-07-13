# Synteza: naprawa automatycznej kontynuacji Codex

## TL;DR

Naprawa wymaga wykonywalnego evaluatora bramek, cienkiego adaptera Codex oraz trwałego kursora pracy; sama zmiana `phase-continue.mjs` nie wystarczy.
Zgodność rekomendacji kończy gate aktorem `advisor`; rozbieżność tworzy dokładnie jeden logiczny rekord `arbiter`, którego kolejne wywołania są retry.
Terminalny wynik musi zostać zapisany przed raportami i continuation, a sukces adaptera musi oddać sterowanie pętli workflow bez kończenia tury.
Runner wykonuje commit i opcjonalny transition fazy — nie jest dispatcherem kolejnego problemu ani fazy.

## Key Decisions

- Ustanowić jeden wykonywalny evaluator jako właściciela agreement, arbitration, retry, denylisty i terminalnego rekordu.
- Użyć `orchestrator.current_phase` jako kanonicznego kursora fazy oraz trwałego `work_item_id`/`dispatch_id` dla pracy wewnątrz fazy.
- Rozdzielić odpowiedzialności: evaluator wybiera, runner utrwala, adapter Codex wykonuje transport, workflow loop stosuje efekt i dispatchuje następną pracę.
- Nie zmieniać capability Codex na `supported`, dopóki rzeczywisty host-native E2E nie potwierdzi braku UI i realnego następnego dispatchu.

## Open Questions / Risks

- Stabilna, headless komenda Codex i port wstrzykiwania fake roli wymagają krótkiego spike'a implementacyjnego.
- Finalny kształt pełnego rekordu `gate_history` i continuation receipt musi być jeden dla dokumentacji, evaluatora, runnera i fixtures.
- Fizyczne exactly-once wywołania hosta nie jest gwarantowalne bez transakcyjnego API; wymagany jest exactly-once logiczny efekt przez trwały `dispatch_id` i deduplikację.

## 1. Triangulowany root cause

Wszystkie cztery strumienie badania wskazują ten sam łańcuch:

1. Kanoniczne Markdowny opisują prawidłowy algorytm agreement/disagreement, lecz nie ma wykonywalnego evaluatora, który go egzekwuje. Test `tests/gate-decision-engine.test.sh` głównie sprawdza tekst i katalog fixtures, nie uruchamia state machine modeli.
2. Codex posiada read-only profil roli w `platforms/codex-cli/templates/advisor.toml`, ale nie ma kodu mapującego odpowiedź roli na terminalny wynik, runner i dalszy dispatch. Smoke test sprawdza frazę, nie zachowanie.
3. `phase-continue.mjs` przyjmuje już wybraną opcję. Trwale zapisuje wąski terminalny rekord, generuje raporty i opcjonalnie zmienia status fazy. Potem wypisuje JSON i proces się kończy.
4. Bez `next_phase` runner nie przesuwa niczego; z `next_phase` przesuwa `current_phase`, ale nie uruchamia handlera nowej fazy. Nie ma kursora kolejnego decision area ani konsumenta stdout, który wraca do workflow loop.
5. Obecne self-checki wejścia do fazy wymagają historycznego call ID pytania użytkownika, więc mogą wymusić UI nawet po poprawnej decyzji automatycznej.
6. Realny state używa `started_phase` i bogatego audytu, podczas gdy runner transition wymaga `current_phase` i odrzuca dodatkowe pola historii.

**Synteza — confidence: high.** Pierwotna diagnoza „brak adaptera Codex” jest poprawna, ale niewystarczająca: po adapterze potrzebny jest jeszcze jawny zwrot sterowania do pętli workflow i trwały next-work cursor.

## 2. Docelowa maszyna decyzji

### Agreement

Dla gate'u `fully_automatic`, który nie jest denylisted i ma wspieraną capability:

1. Trwale zapisz `advisor_pending` i próbę `started` przed wywołaniem roli.
2. Zwaliduj exact czteropolowy output, membership opcji, `confidence: high|medium` i `escalate_to_user: false`.
3. Jeśli `advisor.selected_option === original_recommendation` (exact string), zapisz jeden terminalny rekord `decided`, `final_actor: advisor`.
4. Nie wywołuj arbitra i nie pokazuj user gate.

### Disagreement

1. Trwale zapisz poprawny wynik advisora i przejdź do `arbiter_pending`.
2. Utwórz dokładnie jedną logiczną mapę arbitra z jednym `logical_arbiter_id`.
3. Każdy timeout/malformed output dopisuje próbę do `arbiter.attempts[]`; nie tworzy drugiego arbitra i nie wraca do advisora.
4. Arbiter może wybrać wyłącznie rekomendację pierwotną albo advisora.
5. Poprawny `high|medium`, bez eskalacji, kończy gate aktorem `arbiter`.

### Fail-closed

Denylista omija modele i automatyczny runner. Low confidence, escalation, brak capability, retry exhaustion, invalid output po wyczerpaniu prób, błąd terminalnego zapisu lub niepoprawna continuation zatrzymują automatyzację: interaktywnie do `user_pending`, bez interakcji do `blocked`. Żaden z tych przypadków nie może przesunąć fazy ani kursora pracy.

**Confidence: high.** Algorytm wynika bezpośrednio z `gate-decision-engine.md:266-300` i jest zgodny z wymaganiem użytkownika.

## 3. Jeden kontrakt stanu i kontynuacji

Potrzebny jest jeden pełny envelope `gate_history`, a nie uboższy rekord rekonstruowany przez runner. Musi zawierać tożsamość gate'u, uporządkowane opcje, pierwotną rekomendację, policy/safety, pełne wyniki i próby roli, terminalnego aktora oraz continuation intent/receipt.

Kanoniczne inwarianty:

- `orchestrator.current_phase` wskazuje dokładnie jedną fazę `in_progress` w `phases[]`;
- jeden idempotency key odpowiada jednemu rekordowi gate, aktualizowanemu pending → terminal, nigdy duplikowanemu;
- `advisor` i `arbiter` są pojedynczymi mapami, a retry są wpisami w `attempts[]`;
- same-phase praca ma stabilny `work_item_id`, `source_gate_key`, `dispatch_id` i status `ready|in_progress|completed|blocked`;
- continuation ma target `same_phase_work_item` albo `next_phase` i receipt `pending|applied|blocked`;
- raporty i dashboard są projekcjami canonical state, nigdy źródłem resume.

Kolejność trwałości:

```text
pending + attempt started
→ validated terminal gate record
→ reports/dashboard from persisted state
→ gate effect + cursor/phase transition intent
→ dispatch(target, dispatch_id)
→ durable acknowledgement / applied receipt
```

Awaria raportu pozostawia terminalny rekord do regeneracji. Awaria dispatchu wznawia ten sam `dispatch_id`. Odrzucone wejście przed legalnym commitem pozostawia state, raporty, tryby i topologię katalogów byte-exact bez zmian.

**Confidence: high** dla własności i kolejności; **medium-high** dla finalnej serializacji continuation envelope.

## 4. Ownership i continuation

| Warstwa | Własność | Granica |
|---|---|---|
| Evaluator | policy, denylist, advisor/arbiter state machine, retry, pełny terminalny record | Nie dispatchuje domenowej pracy |
| Runner | strict preflight, idempotentny commit, raporty, opcjonalny forward phase transition | Nie zna decision areas ani hostowych narzędzi |
| Adapter Codex | native role invocation, exact transport do runnera, walidacja stdout, zwrot `continue|user_gate|blocked` | Nie utrzymuje własnego state machine ani routingu domenowego |
| Workflow loop | apply selected option, trwały work-item cursor, wyliczenie następnego targetu, natychmiastowy dispatch | Nie implementuje ponownie safety/evaluatora |

Kluczowy kontrakt: **sukces adaptera nie kończy assistant turn**. Adapter zwraca `continue`, workflow ponownie czyta stan, aplikuje wybór, ustawia następny target i wykonuje go natychmiast.

- Same-phase: area N zostaje `completed`; dopiero wtedy workflow ponownie oblicza area N+1 i dispatchuje je z trwałym `dispatch_id`.
- Next-phase: runner atomowo ustawia source `completed`, target `in_progress`, `current_phase=target`; potem workflow loop uruchamia body nowej fazy. Sam commit runnera nie jest dispatch'em.

**Confidence: high.** `phase-continue.mjs:741-800` kończy proces po stdout, a call sites research/product-design zawierają domenową wiedzę potrzebną do kolejnego problemu.

## 5. Konwergencja findings i konsekwencje wdrożeniowe

Nie ma konfliktu między findings:

- Finding 01 wymaga pełnego schema i wykonywalnego evaluatora.
- Finding 02 pokazuje, że commit i dispatch to dwie operacje oraz definiuje cursor.
- Finding 03 lokuje host binding w `platforms/codex-cli/` i utrzymuje generated tree jako wynik builda.
- Finding 04 definiuje cztery poziomy dowodu i próg capability.

Najmniejszy bezpieczny tracer bullet to: executable evaluator fixture agreement → pełny terminalny state → runner/report → same-phase cursor → fake dispatcher ack → ten sam loop uruchamia drugi item. Dopiero potem dodać arbiter, phase transition i prawdziwy Codex host E2E.

## 6. Główne ryzyka

1. **Podwójny writer historii:** evaluator i runner nie mogą oba syntetyzować rekordów; runner powinien konsumować i weryfikować wcześniej utrwalony terminalny rekord.
2. **Fałszywe exactly-once:** używać terminu „jeden logiczny dispatch/effect”; fizyczne retry jest dopuszczalne z tym samym `dispatch_id`.
3. **Generated drift:** zmiany tylko w `plugins/maister/` i `platforms/`, potem `make build`; nigdy bezpośrednio w `plugins/maister-codex/`.
4. **Przedwczesny capability flip:** wspólny runner i fake-only integration nie są host-native dowodem.
5. **Self-check regresja:** brak UI call ID nie może oznaczać pominiętej bramki, jeśli istnieje terminalny automatyczny rekord i poprawna continuation receipt.
6. **Backward routing:** product-design refinement do wcześniejszej fazy wymaga osobnego reset protocol; nie należy osłabiać runnera, który dziś akceptuje tylko forward pending transition.

## 7. Źródła i poziom pewności

| Wniosek | Główne dowody | Confidence |
|---|---|---|
| Brak wykonywalnego adaptera Codex | `platforms/codex-cli/templates/advisor.toml`, `build.sh`, `smoke-cli.sh`, placeholder E2E | High |
| Runner nie jest dispatcherem | `phase-continue.mjs:741-800`, `test_no_transition_and_forward_transition_are_distinct` | High |
| Agreement/arbitration nie są executable-tested | `tests/gate-decision-engine.test.sh` | High |
| Potrzebny pełny schema i `current_phase` | gate engine contract, real task state, runner preflight | High |
| Potrzebny durable same-phase cursor | research/product-design sequential loops, brak pola w payloadzie runnera | High |
| Finalny kształt host bindingu | brak istniejącego headless harnessu | Medium |

