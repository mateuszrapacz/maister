# Research Plan: platform-independent Maister

## TL;DR
Badanie zastosuje metodologię mieszaną: analizę repozytorium, rekonstrukcję kontraktów hostów oraz porównanie oficjalnych wymagań z obecną macierzą testów.
Trzy niezależne strumienie zbiorą dowody o kanonicznym rdzeniu, granicy instalacyjnych adapterów i możliwym poziomie assurance bez runtime Claude Code.
Synteza porówna co najmniej trzy warianty i wskaże jeden docelowy model, który maksymalizuje wspólne, uruchamialne testy bez ukrywania nieuniknionych różnic hostów.

## Key Decisions
- Typ badania: mixed — technical, requirements i literature research.
- Jednostką porównania będzie kontrakt zachowania, packagingu, instalacji i weryfikacji, a nie tylko układ plików wygenerowanych pluginów.
- Gathering Strategy ma trzy stabilne, niezależne kategorie, aby zmieścić analizę w dostępnym limicie agentów i umożliwić późniejsze łączenie ustaleń po identyfikatorach.
- Hipoteza „różnice dopiero przy instalacji” będzie oceniana obok co najmniej dwóch alternatyw, a nie traktowana jako z góry wybrana architektura.

## Open Questions / Risks
- Dokumentacja hostów może opisywać możliwości nowsze niż dostępne lokalnie CLI lub marketplace; wersje i daty muszą być zapisane przy dowodzie.
- Brak runtime Claude Code uniemożliwia uczciwe potwierdzenie pełnego E2E; trzeba oddzielić dowód semantyczny, instalacyjny, statyczny i runtime.
- Tekstowe transformacje mogą zawierać ukryte różnice semantyczne, których nie ujawni samo porównanie struktury katalogów.
- Termin „jedno rozwiązanie” może oznaczać jedno źródło, jeden artefakt dystrybucyjny albo jeden runtime; synteza musi rozdzielić te poziomy.

## Research Question

W jaki sposób uprościć Maister i uniezależnić go od platform AI coding hostów, tak aby utrzymywać jedno testowalne rozwiązanie, a ewentualne różnice wybierać dopiero podczas instalacji — również dla Claude Code, gdzie nie ma dostępnego runtime do testów?

## Methodology

### Classification

Badanie jest mieszane:

1. **Technical research** — rekonstrukcja aktualnego przepływu canonical source → platform adapters → generated variants → installation/runtime.
2. **Requirements research** — ekstrakcja nieusuwalnych kontraktów Claude Code, Codex, Cursor i Kiro oraz kryteriów kompatybilności, migracji i dystrybucji.
3. **Literature research** — weryfikacja kontraktów hostów w oficjalnych dokumentacjach oraz porównanie wzorców single-source, install-time materialization i contract testing.

### Core method

1. Rozłożyć pytanie na cztery płaszczyzny: model zachowania, host-native invocation, packaging/installation oraz assurance/testing.
2. Zmapować każdy istotny wariant platformowy do konkretnego źródła: kodu, manifestu, dokumentacji, fixture lub testu.
3. Zrekonstruować obecną macierz build/install/smoke/E2E oraz oznaczyć, które dowody uruchamiają wspólny rdzeń, a które tylko walidują wygenerowany tekst.
4. Porównać co najmniej trzy warianty architektoniczne wspólną kartą oceny.
5. Wyprowadzić rekomendację oraz etapową ścieżkę migracji z jawnym poziomem pewności dla Claude Code.

## Analytical Model

### Layer decomposition

Każde ustalenie będzie przypisane do jednej lub kilku warstw:

- **Behavior model** — fazy, bramki, stan, safety invariants, Advisor/Arbiter i reguły wznowienia.
- **Portable runtime/helpers** — JavaScript ESM, shell helpers, schema/state repository i deterministyczne operacje możliwe do testowania bez hosta.
- **Host contract** — narzędzia, role/agenci, invocation, continuation, hooks i ograniczenia wykonawcze.
- **Packaging and discovery** — layout, manifesty, marketplace, commands/skills/rules i wymagane nazwy.
- **Installation/materialization** — wybór hosta, transformacja, walidacja wejścia i atomowość instalacji.
- **Assurance** — unit/contract/golden/install/smoke/E2E oraz brakujące dowody runtime.

### Alternatives to compare

Synteza ma ocenić co najmniej:

1. **Obecny canonical source + build-time generated targets** — wariant bazowy.
2. **Jeden przenośny pakiet + install-time compiler/materializer** — użytkownik wybiera host podczas instalacji, a instalator tworzy host-native layout.
3. **Wspólny behavior/runtime core + cienkie, wersjonowane host adapters** — wspólne testy rdzenia, minimalne adaptery packaging/invocation instalowane per host.
4. **Wspólny neutralny IR/schema + generatory hostów** — ocenić tylko jeśli dowody pokażą, że tekst kanoniczny jest zbyt powiązany z Claude Code, by służyć jako neutralne źródło.

### Evaluation scorecard

Każdy wariant będzie oceniony jakościowo i, gdzie dowody pozwalają, w skali 1–5 według:

- liczby i złożoności utrzymywanych źródeł;
- procentu zachowania wykonywanego przez jeden testowalny rdzeń;
- ilości host-specific transformations i ich fragility;
- jakości dowodu możliwego bez runtime Claude Code;
- zgodności z natywnym discovery, manifestami, tools i hooks;
- deterministyczności, reprodukowalności i możliwości działania offline;
- kompatybilności wstecznej, rollbacku i kosztu migracji;
- ergonomii instalacji i diagnostyki błędów;
- ryzyka dryfu wersji hostów.

## Gathering Strategy

| Stable category ID | Zakres niezależnego badania | Kluczowe pytania | Output prefix |
|---|---|---|---|
| `canonical-core-transform-boundary` | Kanoniczny plugin, wspólne workflow/runtime helpers, adaptery build i generowane warianty | Co jest rzeczywiście wspólnym modelem zachowania? Które transformacje są mechaniczne, a które semantyczne? Czy canonical jest neutralny, czy Claude-oriented? Gdzie może przebiegać stabilny interfejs core/adapter? | `canonical-core-` |
| `host-contracts-installation` | Kontrakty Claude Code, Codex, Cursor i Kiro; layout, manifesty, commands/skills/agents/hooks/MCP; install/uninstall i marketplace | Jakie różnice są wymagane przez hosta? Które można materializować przy instalacji? Czy możliwy jest jeden dystrybuowany pakiet z wyborem `--target`, zachowując host-native discovery i aktualizacje? | `host-contracts-` |
| `test-assurance-runtime-gap` | Make/CI, validation, fixtures, golden/contract/install/smoke/E2E, capability matrix oraz luka Claude Code runtime | Co dzisiaj jest wykonywane, a co tylko sprawdzane strukturalnie? Jak testować wspólny core raz? Jaki evidence ladder i contract harness da uczciwe assurance dla Claude Code bez twierdzenia o pełnym E2E? | `test-assurance-` |

Każdy gatherer zapisuje jeden lub więcej plików `analysis/findings/<output-prefix>*.md`. Kategorie nie powinny zmieniać wspólnych źródeł ani stanu workflow. Mogą cytować te same pliki tylko wtedy, gdy odpowiadają na różne pytania; synteza rozstrzyga rozbieżności.

## Evidence and Citation Discipline

1. Każde twierdzenie o aktualnym zachowaniu musi mieć cytat do pliku z numerem linii: ``path/to/file:line`` albo zakres krótkich, bezpośrednio związanych linii.
2. Każde twierdzenie o wymaganiu hosta musi wskazać oficjalną dokumentację lub host-owned schema/CLI output, wraz z URL, datą dostępu i — jeśli dostępne — wersją.
3. Test jest dowodem wyłącznie zachowania, które rzeczywiście wykonuje. Structural grep, snapshot/golden, install test, smoke i E2E muszą być jawnie rozróżnione.
4. Dokumentacja projektowa jest źródłem intencji, nie automatycznie dowodem implementacji; rozbieżności kod–docs mają być zapisane jako finding.
5. Wnioski architektoniczne muszą odwoływać się do co najmniej dwóch niezależnych źródeł lub być oznaczone jako hipoteza/inference.
6. Dla każdego findingu podać confidence: `high`, `medium` lub `low`, oraz krótkie uzasadnienie braków.
7. Nie cytować wygenerowanego wariantu jako niezależnego dowodu canonical behavior, jeśli jest deterministyczną kopią tego samego źródła; używać go do dowodu materializacji lub host-native shape.

## Investigation Procedure

### 1. Broad discovery

- Zbudować mapę katalogów canonical, `platforms/`, generated variants, testów, CI, instalatorów i dokumentacji hostów.
- Wyszukać host-specific vocabulary, warunki platformowe, overrides/patches/transforms oraz duplikowane helpery.
- Zinwentaryzować wejścia i wyjścia `make build`, `make validate`, install/smoke/E2E i release jobs.

### 2. Targeted tracing

- Prześledzić reprezentatywny workflow od `plugins/maister/skills/*/SKILL.md` do każdego targetu.
- Prześledzić wspólne runtime helpers i ich platformowe kopie/wrappers.
- Prześledzić instalację dla każdego hosta: source artifact, wybór miejsca, manifest, konfigurację i walidację.
- Prześledzić po jednym dowodzie z każdej klasy testu, zapisując dokładnie co wykonuje.

### 3. Contract extraction

- Utworzyć macierz cech hostów: discovery/layout, invocation, tools, subagents, user gates, hooks, continuation, MCP, config i marketplace.
- Dla każdej komórki oznaczyć `common`, `adapter-required`, `unsupported` lub `unknown`.
- Oddzielić różnice składniowe od semantycznych oraz instalacyjne od runtime.

### 4. Verification and synthesis handoff

- Cross-check kluczowych różnic w co najmniej dwóch źródłach.
- Zidentyfikować sprzeczności między dokumentacją, adapterami i testami.
- Przekazać synthesizerowi findings, macierz dowodów, warianty i nierozstrzygnięte luki bez przedwczesnego wyboru architektury.

## Required Synthesis Outputs

Raport końcowy powinien zawierać:

1. mapę aktualnej architektury i kosztów złożoności;
2. macierz host contracts oraz granicę portable/platform-specific;
3. macierz testów i evidence ladder, w tym dokładny status Claude Code;
4. porównanie co najmniej trzech wariantów;
5. rekomendowany model docelowy i uzasadnienie;
6. propozycję install-time selection oraz wymagania fail-fast/atomic rollback;
7. migrację etapami z kryteriami wejścia/wyjścia i możliwością rollbacku;
8. ryzyka, założenia, otwarte pytania i confidence per major finding.

## Completion Criteria

- Wszystkie cztery hosty mają udokumentowany kontrakt i źródło dowodu albo jawny status `unknown`.
- Wszystkie istotne platform transforms są przypisane do warstwy i sklasyfikowane jako syntactic lub semantic.
- Dla każdego rodzaju testu wiadomo, czy testuje core, materializer, instalację czy host runtime.
- Co najmniej trzy warianty są ocenione tą samą scorecard.
- Rekomendacja definiuje jeden canonical/testable solution oraz minimalny install-time adapter surface.
- Raport nie utożsamia static/contract validation z Claude Code runtime E2E.

