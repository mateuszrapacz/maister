# Research Brief: platform-independent Maister

## TL;DR
Badanie ma ustalić, czy Maister może mieć jeden kanoniczny, testowalny model zachowania, a różnice hostów materializować dopiero podczas instalacji.
Głównym problemem jest koszt generowania i utrzymywania kilku wariantów oraz brak dostępnego runtime Claude Code do testów end-to-end.
Wynik ma porównać realne opcje architektoniczne, wskazać granicę niezależności od platformy i zaproponować bezpieczną ścieżkę migracji.

## Key Decisions
- Badanie ma charakter mieszany — wymaga analizy kodu, kontraktów hostów, instalacji i strategii testowania.
- Rozróżnienie platformy na etapie instalacji jest hipotezą do zweryfikowania, nie z góry przyjętym rozwiązaniem.

## Open Questions / Risks
- Hosty mogą wymagać różnych fizycznych layoutów, manifestów, nazw narzędzi i modeli agentów, których nie da się ujednolicić w artefakcie instalowanym bez transformacji.
- Brak runtime Claude Code ogranicza możliwy poziom dowodu do walidacji statycznej, kontraktowej i testów wspólnego rdzenia, chyba że znajdziemy wiarygodny emulator lub oficjalny validator.

## Research question

W jaki sposób uprościć Maister i uniezależnić go od platform AI coding hostów, tak aby utrzymywać jedno testowalne rozwiązanie, a ewentualne różnice wybierać dopiero podczas instalacji — również dla Claude Code, gdzie nie mamy dostępnego runtime do testów?

## Scope

### Included

- Kanoniczne źródła pluginu, platform adapters i generowane warianty.
- Host-native wymagania Claude Code, Codex, Cursor i Kiro.
- Instalacja, discovery, manifesty, role/agents, skills/commands i runtime helpers.
- Build oraz test matrix, w tym luka runtime Claude Code.
- Warianty: wspólny artefakt, instalacyjny compiler/materializer, cienkie host adapters i wspólny runtime/core.
- Migracja, ryzyka kompatybilności i sposób dowodzenia parity.

### Excluded

- Implementacja rozwiązania.
- Zmiany funkcjonalne workflow niezwiązane z portability.
- Twierdzenie o pełnej zgodności Claude Code bez dostępnego runtime proof.

## Success criteria

1. Każda istotna różnica platformowa ma dowód w kodzie, dokumentacji, konfiguracji lub teście.
2. Raport oddziela model zachowania od host-native packaging i invocation.
3. Co najmniej trzy warianty uproszczenia są ocenione pod kątem utrzymania, testowalności, zgodności i migracji.
4. Rekomendacja określa, co może być wspólne, co musi pozostać platformowe i na jakim etapie wykonywać transformację.
5. Strategia testów wyjaśnia uczciwie, co można udowodnić dla Claude Code bez jego runtime.
