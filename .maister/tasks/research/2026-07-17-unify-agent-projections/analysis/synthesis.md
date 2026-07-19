# Synteza: ujednolicone projekcje agentów Maister

## TL;DR
Maister powinien parsować 28 kanonicznych plików `plugins/maister/agents/*.md` do jednego manifestu ról, a następnie deterministycznie projektować reprezentację wymaganą przez każdy host.
Codex powinien wstrzykiwać wybraną rolę do zwykłego subagenta; Cursor instalować wygenerowany Markdown plugin-agenta; Kiro instalować wygenerowaną parę JSON + prompt w natywnym `~/.kiro/agents`.
`advisor` przechodzi dokładnie tę samą ścieżkę co pozostałe role: bez profilu TOML, `readonly`, sandboxu i osobnej instalacji.
Projekcja musi odbywać się w kontrolowanym stagingu przed walidacją i wejść do receipt, drift detection, rollbacku oraz release package.

## Key Decisions
- Przyjąć `role_id = <filename stem> = frontmatter.name` jako jedyną przenośną tożsamość — obecne 28 plików spełnia ten kontrakt.
- Dodać jeden host-neutralny parser, manifest projekcji i czysty projector — usuwa to ręcznie utrzymywane kopie zachowania.
- Użyć runtime injection w Codex oraz natywnych projekcji w Cursor i Kiro — odpowiada to udokumentowanym możliwościom hostów bez sztucznego ujednolicania formatów.
- Rozszerzyć transakcję Kiro o ściśle wyliczone pliki w natywnym `~/.kiro/agents` — obecny prywatny root `.kiro-maister` nie jest rootem discovery.
- Usunąć stare `.codex/agents/{advisor,arbiter}.toml` ze źródła rozwiązania i nie projektować ścieżki migracyjnej — użytkownik potwierdził, że instalacje będą wykonywane od zera.

## Open Questions / Risks
- Publiczny kontrakt Codex nie stabilizuje programistycznego schematu `spawn_agent` ani per-spawn model override; wymagany model bez natywnej kontroli musi zakończyć się błędem.
- Cursor nie dokumentuje precedence plugin-agenta wobec projektowego/użytkownika o tej samej nazwie; do czasu probe instalator powinien odrzucać wykryte kolizje `maister-*`.
- Kiro wybiera delegowanego custom subagenta przez routing tekstowy; deterministyczność exact-name wymaga wersjonowanego probe i obserwowalnego identity.
- Schemat dowodu projekcji może wejść do receipt albo do związanego rekordu provenance; decyzja jest implementacyjna, ale wymagane digesty i walidacja nie podlegają negocjacji.

## Pytanie badawcze

Jak Maister powinien transformować, instalować, odkrywać i wywoływać wszystkich kanonicznych agentów spójnie na Codex, Cursor i Kiro CLI, gdy `maister-advisor` podlega tym samym regułom co każdy inny agent?

## Odpowiedź syntetyczna

Spójność nie oznacza identycznego pliku ani identycznego discovery na trzech hostach. Oznacza jeden zbiór ról, jedną regułę nazewniczą, jeden manifest mapowania, jednoznaczny wybór roli i ten sam fail-closed kontrakt. Fizyczna reprezentacja pozostaje natywna dla hosta:

```text
plugins/maister/agents/<role_id>.md
       -> parser + canonical agent IR
       -> versioned projection manifest
       -> staging projector
          |- Codex: packaged prompt resource + runtime injection
          |- Cursor: plugin agents/<role_id>.md
          `- Kiro: ~/.kiro/agents/maister-<role_id>.json
                   + ~/.kiro/agents/instructions/maister-<role_id>.md
       -> validation + provenance + receipt
       -> exact logical-role dispatch + native result evidence
```

`advisor` jest zwykłym `role_id`. Jego ograniczenia behawioralne mogą pozostać w kanonicznej instrukcji, lecz projector, instalator i adapter nie mogą rozpoznawać go w celu nadania dodatkowych uprawnień, profilu ani ścieżki.

## Analiza krzyżowa źródeł

### Potwierdzone fakty

1. **Kanoniczny zbiór jest zamknięty i spójny.** Jest 28 plików, a stem każdego pliku równa się `frontmatter.name`. Potwierdza to przegląd plików oraz zgodność z projekcjami (`analysis/findings/01-canonical-projection.md`, „Normalized canonical inventory”). Pewność: wysoka.

2. **Materializer obecnie nie transformuje agentów.** Codex dostaje byte-copy kanonicznego drzewa, Cursor i Kiro dostają byte-copy ręcznie utrzymywanych `assets/agents`. Kod rozwiązania source, assembly plan i `copyFileSync` zgadza się z overlayami (`plugins/maister/lib/distribution/materializer.mjs:147-273`, `plugins/maister/lib/distribution/materializer.mjs:758-803`). Pewność: wysoka.

3. **Cursor ma poprawny natywny kształt, ale błędny zbiór i ownership treści.** Plugin discovery obsługuje `agents/*.md`, lecz obecne assets zawierają 27/28 ról, zamieniają `e2e-test-verifier` na helper `explore`, a `advisor` jako jedyny dostaje `readonly: true`. Repo nie ma projectora agentów ani testu ich derywacji. Dokumentacja Cursor potwierdza format i discovery: [Plugins reference](https://cursor.com/docs/reference/plugins.md) oraz [Subagents](https://cursor.com/docs/subagents.md). Pewność: wysoka dla struktury i driftu; natywne wykonanie niedostępne.

4. **Kiro projection nie jest operacyjna.** Descriptorów jest 30, ale każdy z nich odwołuje się do brakującego `file://./instructions/*.md`, a `.kiro-maister` nie jest udokumentowanym rootem discovery. Native Kiro 2.12.1 potwierdził brak discovery i błąd walidacji URI. Oficjalny kontrakt wskazuje `.kiro/agents` lub `~/.kiro/agents` oraz rozwiązywanie URI względem descriptor file: [Kiro configuration reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference/). Pewność: wysoka.

5. **Deklaracje adapterów nie są adapterami wykonawczymi.** `codex.subagent`, `cursor.subagent` i `kiro-cli.subagent` występują w overlayach, ale wspólny runtime tworzy jedynie durable outbox; nie ładuje promptu, nie mapuje roli, nie wywołuje hosta i nie zbiera wyniku. Pewność: wysoka.

6. **Obecna transakcja jest dobrym fundamentem.** Staged inventory przechodzi do receipt; update usuwa tylko stare receipt-owned pliki; drift blokuje nadpisanie zmian; snapshot/rollback/recovery przywracają typ, bytes, mode, symlink i topologię. Projekcje umieszczone w stagingu mogą korzystać z tych gwarancji (`analysis/findings/04-installer-tests-docs.md`, „Current ownership and lifecycle boundary”). Pewność: wysoka.

### Rozstrzygnięte pozorne sprzeczności

- **„Wszystkie role są zainstalowane w Codex” vs „nie ma agentów Codex”:** wszystkie 28 Markdownów jest materializowane, ale jako zasoby pluginu. Nie są custom-agentami z `.codex/agents/*.toml`. Obie obserwacje dotyczą różnych etapów: materialization i native discovery. [OpenAI plugin structure](https://learn.chatgpt.com/docs/build-plugins#plugin-structure) oraz [OpenAI custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents) rozdzielają te powierzchnie.
- **„Kiro ma komplet 28 ról” vs „Kiro ma 0 działających promptów”:** descriptor identity jest kompletne, ale reference closure wynosi 0/30, a root nie jest odkrywany. Inventory descriptorów nie dowodzi materialization ani discovery.
- **„Cursor ma 28 agentów” vs „brakuje jednej roli”:** liczba 28 zawiera host helper `explore`; canonical parity wynosi 27/28. Helpery muszą być liczone osobno.
- **„Projector przed materializerem” vs „projector w stagingu materializera”:** rekomendacja oznacza logicznie pre-validation stage po immutable source resolution, ale przed finalnym validation/content hash. Nie oznacza modyfikacji source ani runtime generation.

## Wzorce i motywy

| Wzorzec | Obserwacja | Ocena |
|---|---|---|
| Jedno źródło, wiele natywnych reprezentacji | Canonical Markdown już istnieje, ale Cursor/Kiro obchodzą go przez assets | Kierunek architektury dojrzały, implementacja niepełna |
| Deklaracja bez executable seam | Overlay binding opisuje zamiar, lecz runtime nie realizuje dispatch | Krytyczna luka operacyjna |
| Count parity maskuje semantic parity | 28 Cursor agentów i 30 Kiro descriptorów wygląda poprawnie bez normalizacji | Testy muszą porównywać role i closure, nie liczby |
| Historyczne wyjątki konserwują błąd | Parity baselines akceptują brak E2E i promptów Kiro | Baselines aktualizować dopiero po nowych invariants |
| Ownership jest silniejszy niż format | Receipt i rollback mogą objąć dowolny deterministyczny output | Projector powinien wejść przed transaction commit |
| Host support miesza się z rolami domenowymi | `explore` i Kiro `maister` zawyżają inventory | Manifest potrzebuje osobnej sekcji `support_agents` |

## Kluczowe insighty

### 1. Wspólnym kontraktem jest tożsamość i dispatch, nie format pliku

Najmniejszy stabilny IR zawiera `role_id`, canonical source/digest, opis, opcjonalny model, skill dependencies oraz instrukcje. Per-host mapping dodaje `external_id`, representation, destinations, transforms i tools profile. Dzięki temu ta sama rola może być promptem dynamicznym w Codex, Markdownem w Cursor i JSON+promptem w Kiro bez utraty jednolitej semantyki. Pewność: wysoka.

### 2. Codex injection jest prostszą i bezpieczniejszą odpowiedzią niż 28 TOML-i

Oficjalny Codex opisuje prompt-driven subagents, a obserwowany runtime przyjmuje dynamiczny message. Zatem pakiet może załadować canonical role resource i wstrzyknąć go do generic subagenta. Nie zależy wtedy od native agent discovery, precedence ani plików projektowych. Pewność: wysoka lokalnie, średnia dla stabilnego publicznego API.

### 3. Kiro wymusza nowe multi-root ownership

Samo wygenerowanie brakujących promptów pod `.kiro-maister` nie naprawi discovery. Agentowe pliki muszą trafić do `~/.kiro/agents`, podczas gdy pozostałe prywatne zasoby mogą pozostać pod `.kiro-maister`. Instalator musi więc journalować i receipt-ownować ściśle wyliczone leaf paths w dodatkowym natywnym root, bez przejmowania całego `~/.kiro`. Pewność: wysoka co do potrzeby, średnia co do szczegółowego mechanizmu.

### 4. Advisor equality jest testowalnym invariantem negatywnym

Nie wystarczy, że `advisor` istnieje w trzech inventory. Test powinien aktywnie odrzucać Advisor-only destination, `.toml`, `readonly`, `sandbox`, specjalny adapter lub oddzielną politykę instalacji. To zamienia decyzję użytkownika w trwały kontrakt regresyjny. Pewność: wysoka.

### 5. Operational support zaczyna się dopiero na invocation evidence

Structural validation, materialization i native discovery są konieczne, ale nie dowodzą, że workflow wybrał właściwą rolę. Probe musi uruchomić co najmniej dwie rozróżnialne role oraz zwykłego `advisor`, a execution record musi związać wynik z `role_id`, source digest i host dispatch ID. Pewność: wysoka.

## Relacje i zależności

```text
canonical parser
  -> role manifest / collision checks
      -> projector
          -> Codex packaged prompt resources
          -> Cursor native Markdown
          -> Kiro native descriptor + prompt
      -> materializer validation / reference closure
      -> transaction receipt / provenance
      -> release closure

workflow logical role
  -> exact resolver (manifest)
      -> host adapter
          -> native capability/discovery preflight
          -> explicit dispatch
          -> execution record
          -> role-specific result
```

Najważniejsza zależność implementacyjna: host adapters nie mogą powstać przed stabilnym resolverem i manifestem, a parity baselines nie mogą zostać zaktualizowane przed przejściem nowych testów bijekcji i reference closure.

## Synteza według mixed framework

### Stan obecny

- Mocne strony: kompletne canonical source, deterministyczny materializer, dojrzała transakcja, receipt/drift/rollback, target-aware test i release pipeline.
- Słabości: brak projectora agentów, brak executable adapters, Cursor drift, Kiro broken root/refs, workflow names bez resolvera, specjalny Advisor metadata branch.
- Możliwość: mały IR i czysty projector wykorzystują istniejące seams bez redesignu całych workflows.
- Zagrożenie: host contracts i routing są wersjozależne; structural pass może być błędnie raportowany jako runtime support.

### Potrzeby i constraints

- Krytyczne: 28/28 canonical roles na każdym host; single behavior owner; reference closure; explicit selection; fail closed; transactional ownership; Advisor equality.
- Ważne: support-agent classification; versioned transforms/tools profiles; collision preflight; execution evidence; legacy cleanup.
- Poza zakresem: nowy workflow DSL, specjalne uprawnienia Advisora, niesupportowane hosty i generalny redesign skills.

### Trade-off

Wybrany model — staged deterministic projector + per-host adapter — ma większy koszt początkowy niż dopisanie brakujących plików, ale jako jedyny usuwa drugie źródło zachowania, zachowuje natywność hostów i wiąże output z transakcją. Pełny neutralny DSL byłby kosztowniejszy i niepotrzebny; runtime-only generation osłabiłoby ownership.

## Luki i niepewności

- Brak produkcyjnego `codex.subagent`, `cursor.subagent` i `kiro-cli.subagent`.
- Brak E5/E6-style probes dowodzących exact role selection i execution.
- Brak udokumentowanego Cursor plugin-vs-project/user precedence.
- Brak stabilnego publicznego Codex spawn schema i deterministic per-spawn model override.
- Brak maszynowo czytelnego potwierdzenia identity delegowanego Kiro subagenta.
- Nieustalone miejsce projection digests w receipt/provenance.
- Niezweryfikowane, które z dziewięciu obecnych Cursor substitutions i które Kiro tools profiles są rzeczywiście wymagane; każda zachowana transformacja wymaga ID i fixture.

Te luki nie tworzą drugiej równorzędnej architektury. Wpływają na szczegóły adapterów, schema receipts i native probes.

## Wnioski

1. Jedna architektura docelowa jest wystarczająco uzasadniona: canonical agent IR + staged projector + exact resolver + trzy natywne adaptery.
2. Codex powinien używać generic runtime injection, Cursor plugin Markdown, a Kiro native JSON+prompt w `~/.kiro/agents`.
3. `advisor` musi być zwykłym wierszem tego samego manifestu i tej samej macierzy testów.
4. Instalator zachowuje swoje obecne gwarancje, ale Kiro wymaga dodatkowego, ściśle ograniczonego managed root/leaf-set; legacy Codex TOML znika ze źródła bez migracji i kompatybilności wstecznej.
5. Feature nie jest operacyjnie zakończony, dopóki native probes nie odróżnią materialization, discovery i exact invocation.

## Wejście do `maister:development`

Realizacja powinna być podzielona zależnościowo:

1. Parser/IR, manifest i normalized collision/inventory tests.
2. Pure staged projector, source digests, transform registry i projection check.
3. Cursor oraz Kiro projections, Kiro native leaf ownership, reference closure i parity-baseline cleanup.
4. Exact role resolver, execution record oraz trzy adaptery hostów.
5. Hash-gated legacy Codex cleanup.
6. Transaction/release/native probe matrix i dokumentacja.

Pełne kryteria, mapowanie ról, pliki dotknięte implementacją i test matrix znajdują się w `outputs/research-report.md`.
