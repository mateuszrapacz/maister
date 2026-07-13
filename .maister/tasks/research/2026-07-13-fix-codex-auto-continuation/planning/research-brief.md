# Research brief: automatyczna kontynuacja Codex

## TL;DR
Badanie ma przełożyć istniejącą diagnozę na konkretny, testowalny plan naprawy pełnej automatyzacji bramek Codex.
Oczekiwany algorytm: zgodność rekomendacji kończy decyzję przez advisora; rozbieżność uruchamia jednego arbitra; wynik zawsze trafia do trwałego runnera i następnego problemu bez UI.
Zakres obejmuje kontrakt stanu, adapter hosta, runner, pętlę problemów i testy; nie obejmuje implementacji.

## Key Decisions
- Traktować oczekiwaną logikę użytkownika jako wymaganie nadrzędne dla bezpiecznych, niedenylistowanych bramek w trybie `fully_automatic` — interakcja użytkownika nie jest częścią ścieżki sukcesu.
- Wymagać jednego kanonicznego kontraktu stanu i jednego wykonywalnego punktu kontynuacji — eliminuje rozjazd między prose orchestratora, adapterem i runnerem.

## Open Questions / Risks
- Trzeba ustalić, czy „następny problem” jest kolejnym decision area w tej samej fazie, następną fazą, czy oba przypadki muszą używać wspólnego mechanizmu dispatchu.
- Host-native Codex E2E może wymagać deterministycznego fake-advisora/arbiter harnessu zamiast zależności od rzeczywistego modelu.

## Pytanie badawcze

Jak naprawić Codex `fully_automatic` tak, aby:

1. zgodność rekomendacji głównego agenta i advisora automatycznie zatwierdzała tę opcję;
2. rozbieżność wywoływała dokładnie jednego arbitra;
3. ważny wynik advisora lub arbitra był trwale zapisany przed kontynuacją;
4. workflow automatycznie przechodził do kolejnego problemu/decision area albo fazy bez pytania i kliknięcia użytkownika;
5. denylista, niska pewność, eskalacja i błędy nadal zatrzymywały się bezpiecznie.

## Zakres

Włączone: canonical state schema, gate engine, `phase-continue.mjs`, Codex host adapter, capability projection, dispatch kolejnego problemu, retry/resume/idempotencja, raporty i testy.

Wyłączone: implementacja poprawki, automatyzacja chronionych bramek, rozszerzenie integracji trackerów.

## Kryteria sukcesu

- Jednoznaczna mapa aktualnego control flow z dokładnym miejscem zatrzymania.
- Docelowy algorytm agreement/disagreement/arbiter/continuation bez luki między decyzją a dispatch.
- Lista zmian per plik i kolejność wdrożenia bez edycji generated variants.
- Macierz testów obejmująca zgodność, obie decyzje arbitra, kolejny problem, kolejną fazę, resume, retry, denylistę i brak podwójnych wpisów.
- Jasne kryteria, po których Codex może zostać oznaczony jako `supported`.
