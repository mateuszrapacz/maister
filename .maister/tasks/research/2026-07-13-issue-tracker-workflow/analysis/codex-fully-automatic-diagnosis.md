# Diagnoza: `fully_automatic` nie kontynuuje workflowu na Codex

## TL;DR
Wspólny runner `phase-continue.mjs` działa, lecz adapter Codex nie posiada host-native warstwy, która przekazuje zatwierdzoną decyzję advisora do runnera i obserwuje przejście fazy.
Codex E2E jest celowym placeholderem, który bezwarunkowo kończy się kodem `77`, więc macierz capability prawidłowo projektuje host jako `unsupported`.
Dodatkowym blockerem jest rozjazd kanonicznego schematu: aktywne workflowy używają `started_phase` i bogatych rekordów gate, podczas gdy runner oczekuje `current_phase` i węższego `gate_history`.
Naprawa wymaga najpierw ujednolicenia state contractu, następnie adaptera wykonawczego Codex i prawdziwego testu host-native E2E.

## Key Decisions
- Nie oznaczać Codex jako `fully_automatic: supported` bez przechodzącego host-native E2E — wspólne testy runnera nie dowodzą integracji hosta.
- Ujednolicić jeden kanoniczny schema contract przed podłączeniem adaptera — obecny runner odrzuci stan generowany przez workflowy.
- Zachować ręczny fail-closed fallback do czasu uzyskania dowodu przejścia fazy na Codex.

## Open Questions / Risks
- Trzeba wybrać kanoniczne pole aktywnej fazy: obecne `started_phase` czy wymagane przez runner `current_phase`.
- Trzeba rozstrzygnąć, czy pełne dane `advisor`/`arbiter` pozostają bezpośrednio w `gate_history`, czy runner ma zaakceptować rozszerzony rekord.
- Brakuje deterministycznego harnessu Codex, który uruchamia advisora, waliduje wynik, wywołuje runner i obserwuje trwałe przejście.
- Zmiana samego `declared_status` na `supported` ukryłaby lukę i złamała fail-closed capability contract.

## 1. Objaw i deterministyczna reprodukcja

Polecenie:

```bash
bash platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh
```

Wynik:

```text
UNAVAILABLE: no deterministic Codex adapter harness executes and observes native continuation
```

Proces kończy się kodem `77`. Reprodukcja jest natychmiastowa i deterministyczna, ponieważ test zawiera wyłącznie komunikat diagnostyczny oraz bezwarunkowe `exit 77`.

Macierz interpretuje wynik `77` jako `evidence=unavailable`, a każdy wynik inny niż `passed` projektuje jako `unsupported`. `make -s print-host-capabilities` potwierdza:

```text
HOST_CAPABILITY host=codex declared=unsupported projected=unsupported evidence=unavailable target=platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh
```

## 2. Co działa

Wspólny runner nie jest przyczyną pierwotną. Polecenie:

```bash
bash tests/fully-automatic-phase-continue.test.sh
```

przechodzi i potwierdza:

- zapis terminalnej decyzji,
- `continuation: phase_continue`,
- przejście `phase-1 → phase-2`,
- idempotentne ponowienie,
- blokadę automatyzacji dla denylisted gate.

To izoluje usterkę do integracji hosta Codex i zgodności jego realnego stanu z runnerem.

## 3. Root cause

### 3.1 Brak wykonywalnego adaptera Codex

`platforms/codex-cli/templates/advisor.toml` opisuje w promptcie, że orchestrator ma wywołać `phase_continue(selected_option)`, ale opis nie stanowi implementacji. Poza template i smoke assertion w `platforms/codex-cli/` nie istnieje kod mapujący:

```text
valid advisor result
  → terminal persistence/report
  → phase-continue.mjs
  → observed phase transition
```

`platforms/codex-cli/build.sh` jedynie sprawdza, czy macierz zawiera wiersz Codex i ścieżkę targetu E2E. Nie generuje wrappera, hooka ani innego host-native continuation adaptera.

### 3.2 E2E jest placeholderem

`platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh` nie próbuje uruchomić Codex ani adaptera. Jego treść celowo dokumentuje brak harnessu i zawsze zwraca `77`.

Jest to prawidłowy fail-closed marker, ale oznacza, że capability nie zostało jeszcze zaimplementowane.

### 3.3 Runner i workflow używają różnych schematów

Runner waliduje:

- rootowe `phases`,
- `orchestrator.current_phase` przy przejściu,
- dokładnie określony zestaw pól `gate_history`, w tym `continuation`,
- brak dodatkowych pól w rekordzie historii.

Bieżące workflow zapisuje:

- `orchestrator.started_phase`, bez `current_phase`,
- rootowe `phases`,
- rozszerzone rekordy z `policy`, `safety_classification`, `advisor` i `arbiter`,
- brak `continuation` w rekordach tworzonych przez orchestrator.

W efekcie samo podłączenie istniejącego runnera do obecnego stanu nie wystarczy: preflight odrzuci state przed wykonaniem przejścia.

## 4. Odrzucone hipotezy

1. **Uszkodzony wspólny runner** — odrzucone, ponieważ test pełnego runner contractu przechodzi.
2. **Błędna konfiguracja advisora jako jedyna przyczyna** — odrzucone; nawet poprawna odpowiedź advisora nie ma obecnie host-native ścieżki wykonania.
3. **Wyłącznie błędny wpis capability matrix** — odrzucone; wpis `unsupported` odpowiada faktycznemu wynikowi targetu `77`.

## 5. Zalecana kolejność naprawy

1. Wybrać i udokumentować jeden kanoniczny schema state dla wszystkich orchestratorów i runnera.
2. Dostosować generator workflow state oraz `phase-continue.mjs` do tego samego schematu i dodać contract fixtures na realnych rekordach advisor/arbiter.
3. Zaimplementować adapter Codex, który przyjmuje wyłącznie zwalidowany wynik advisora i wywołuje runner przez dokładny JSON contract.
4. Zastąpić placeholder prawdziwym E2E obserwującym zapis stanu, raport oraz przejście fazy.
5. Dopiero po zielonym E2E zmienić `declared_status` Codex na `supported`.

## 6. Kryteria akceptacji

- Codex host-native E2E kończy się kodem `0`, a nie `77`.
- Advisor zgodny z rekomendacją automatycznie przechodzi przez bezpieczny gate bez pytania użytkownika.
- Stan i raport są trwałe przed zmianą fazy.
- Ponowne wykonanie tego samego gate nie duplikuje historii ani przejścia.
- Denylisted gate nadal wymaga użytkownika.
- Ten sam realny `orchestrator-state.yml` przechodzi walidację runnera bez transformacji ad hoc.

## 7. Pliki dowodowe

- `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh`
- `platforms/codex-cli/build.sh`
- `platforms/codex-cli/templates/advisor.toml`
- `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml`
- `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs`
- `tests/fully-automatic-phase-continue.test.sh`
- `Makefile` (`print-host-capabilities`, `validate-host-capabilities`)
