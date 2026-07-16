# Decision log: platformowo niezależny Maister

## TL;DR
Przyjęto siedem decyzji prowadzących do jednego portable core, trzech jawnych host overlays i własnego transakcyjnego installera.
Zwykły dobór narzędzi pozostaje po stronie harnessu; formalizujemy tylko operacje wpływające na control flow, safety, persistence i capability claims.
Legacy generated trees oraz Claude Code zostaną usunięte przed zamknięciem zadania, po użyciu ich jako tymczasowego oracle migracji.
Każda decyzja ma status Accepted i wynika z konwergencji 1A/2D/3D/4C/5D albo z koniecznej konsekwencji transakcyjnego lifecycle.

## Key Decisions
- ADR-001: minimalne semantic primitives, bez pełnego workflow DSL.
- ADR-002: jedna warstwa common, jawne repo-owned overlays i własny copy/merge installer.
- ADR-003: shadow comparison tylko w czasie implementacji; legacy znika przed Definition of Done.
- ADR-004: compatibility per capability — semantic fail-closed, packaging może być provisional.
- ADR-005: Claude Code zostaje usunięty; jego ewentualny powrót jest nowym zadaniem host integration.
- ADR-006: installer posiada zarządzane drzewa i jawne keys settings, używa journalu, receipt i byte-exact rollbacku.
- ADR-007: core testujemy raz, a E1/E2/E4 i dostępne E5/E6 pozostają per host oraz per scenario.

## Open Questions / Risks
- Aktualne host contracts Codex/Cursor/Kiro muszą zostać ponownie potwierdzone podczas implementacji; ADR-y definiują politykę, nie zamrażają ich API.
- Granica primitive może puchnąć; każdy nowy binding wymaga dowodu powtarzalnej różnicy semantycznej albo ochrony safety/persistence.
- Multi-file settings transaction nie ma natywnej atomowości filesystemu; poprawność zależy od journalu, backupu i recovery tests.
- Task-scoped removal legacy nie zapewnia okresu obserwacji po release; parity i failure-injection gates muszą być kompletne przed deletion.
- E5/E6 zależą od dostępnego host runtime i auth; `unavailable` pozostaje jawną luką, nie sukcesem.

## Status legend

- **Accepted** — zatwierdzone przez użytkownika lub niezbędne do realizacji zatwierdzonego invariant.
- **Superseded** — zastąpione późniejszą decyzją; brak takich decyzji w tym logu.
- **Proposed** — wymaga decyzji; brak otwartych ADR-ów blokujących design.

## ADR-001 — Minimalne semantic primitives zamiast pełnego IR

**Status:** Accepted  
**Data:** 2026-07-14  
**Źródło konwergencji:** 1A, wybrane przez użytkownika; doprecyzowanie: harness wybiera zwykłe narzędzia.

### Context

Canonical source jest obecnie powiązany z nazwami narzędzi i konstrukcjami jednego hosta, a adaptery wykonują setki transformacji tekstowych. Jednocześnie workflow jest w dużej części czytelną dokumentacją, której zamiana na pełny AST/DSL byłaby kosztowna i spekulatywna. Badanie oceniło minimalne typed primitives jako najlepszy stosunek separacji do kosztu ([canonical boundary](../analysis/findings/canonical-core-boundary.md), [alternatives](solution-exploration.md#2-obszar-decyzyjny-1--głębokość-reprezentacji-kanonicznej--ir)).

### Decision drivers

- jedna kopia generic skills;
- brak globalnego regex rewrite;
- zachowanie documentation-as-code;
- swoboda harnessu w doborze zwykłych narzędzi;
- formalne gwarancje na safety/control-flow/persistence boundaries;
- minimal implementation.

### Considered options

1. **1A — minimalne typed primitives + host-aware contract**.
2. 1B — pełny neutralny workflow IR/DSL.
3. 1C — canonical Markdown + ulepszone regex/golden snapshots.

### Outcome

Przyjmujemy 1A. Generic skills opisują intencję i są kopiowane bez zmian. `grep`, `rg`, read/search/explore i inne zwykłe strategie pozostają decyzją harnessu. Jawne primitives istnieją dla `present_user_gate`, wymaganej delegacji roli, safety hooks, persistence-before-continue, phase continuation i innych operacji, których błędna realizacja zmienia semantykę lub bezpieczeństwo.

### Consequences

- nie powstaje pełny DSL ani prompt compiler;
- potrzebny jest mały `primitives.yml` oraz binding completeness contract;
- generic vocabulary test blokuje nazwy host-specific tools;
- każdy nowy primitive wymaga uzasadnienia powtarzalną różnicą lub safety invariant;
- część neutralnej prozy nadal jest walidowana scenariuszowo, nie statycznie.

## ADR-002 — Repo-owned host overlays i custom installer

**Status:** Accepted  
**Data:** 2026-07-14  
**Źródło konwergencji:** 2D, wybrane po odrzuceniu marketplace-oriented wariantów.

### Context

Użytkownik instaluje Maister z lokalnego repo albo GitHuba i chce pełnej kontroli nad installerem. Generic skills są identyczne, natomiast agents, commands, hooks, manifests, settings i wymagane semantic bindings są natywnie różne. Generowanie tych assetów w czasie instalacji przeniosłoby obecną złożoność adapterów do środowiska użytkownika ([host contracts](../analysis/findings/host-contracts-installation.md)).

### Decision drivers

- jawny diff host-specific behavior w repo;
- prosta, deterministyczna instalacja;
- brak marketplace i prebuilt release matrix;
- brak runtime generation z prozy;
- jedno utrzymywane common source;
- łatwe dodanie następnego hosta przez nowy overlay.

### Considered options

1. **2D — common + explicit host overlays + custom copy/merge installer**.
2. Installer generuje host-specific assets z descriptors/templates.
3. Repo przechowuje kompletne prebuilt trees z duplikowanymi skills.
4. CI/marketplace hybrid z materializerem — odrzucone jako poza zakresem.

### Outcome

Repo zawiera `common/` oraz `hosts/codex`, `hosts/cursor`, `hosts/kiro-cli`. Installer wybiera target, kopiuje common byte-for-byte, dokłada repo-owned overlay, wykonuje tylko jawny path/config merge, waliduje i transakcyjnie instaluje wynik. GitHub source jest resolve'owany do immutable commit SHA.

### Consequences

- każda różnica hosta jest widoczna w code review;
- overlay contract i test harness są obowiązkowe;
- podobne pliki hostów mogą pozostać małą, świadomą duplikacją;
- installer jest assemblerem i transaction managerem, nie compilerem workflow;
- dokumentacja dystrybucji nie zawiera marketplace assumptions.

## ADR-003 — Legacy tylko jako oracle w zadaniu implementacyjnym

**Status:** Accepted  
**Data:** 2026-07-14  
**Źródło konwergencji:** 3D, wybrane przez użytkownika.

### Context

Commitowane target trees i obecne adaptery są wartościowym punktem porównania podczas migracji, ale stanowią główne źródło duplikacji. Długie utrzymywanie dual path przeczyłoby celowi zadania. Użytkownik zaakceptował użycie legacy w trakcie implementacji, pod warunkiem jego usunięcia przed zakończeniem zadania.

### Decision drivers

- wykrycie brakujących assets i semantic drift;
- finalny brak generated trees;
- brak dwóch ścieżek przez kolejne release;
- jednoznaczna Definition of Done;
- możliwość porównania hooks, permissions, inventory i references.

### Considered options

1. Usunąć legacy natychmiast po pierwszym działającym installerze.
2. Utrzymywać je przez dwa stabilne release.
3. Pozostawić jako stałe snapshots.
4. **3D — shadow w czasie zadania, obowiązkowe deletion przed jego zamknięciem**.

### Outcome

Legacy generated trees i build adapters są migration-only oracle. Po uzyskaniu zero niewyjaśnionych różnic oraz zielonych E1–E4 zostają usunięte w tym samym zadaniu. Końcowe CI i docs nie mogą się do nich odwoływać.

### Consequences

- branch implementacyjny czasowo zawiera dual path;
- końcowa bramka parity musi być silniejsza niż zwykły textual diff;
- rollback po merge opiera się na Git history/receipts, nie aktywnym legacy builderze;
- repository inventory test powinien blokować ponowne pojawienie się generated trees.

## ADR-004 — Capability-sensitive compatibility

**Status:** Accepted  
**Data:** 2026-07-14  
**Źródło konwergencji:** 4C, wybrane przez użytkownika.

### Context

Numer wersji hosta nie mówi, czy zmienił się wyłącznie layout, czy semantyka gate/delegation/hooks. Globalne „fail” blokowałoby kompatybilne releases, a globalny warning mógłby przepuścić safety regression. Obecny boolean capability ukrywa host version, scenario, freshness i evidence level ([assurance findings](../analysis/findings/test-assurance-runtime-gap.md)).

### Decision drivers

- fail-closed safety boundaries;
- brak niepotrzebnego blokowania packaging changes;
- audytowalne claims;
- brak globalnego unsafe override;
- możliwość aktualizacji evidence bez zmiany common core.

### Considered options

1. Zawsze fail-closed poza zakresem wersji.
2. Zawsze warning i best-effort.
3. **4C — semantic fail-closed, packaging provisional**.

### Outcome

Overlay klasyfikuje każdą capability jako `semantic` albo `packaging`. Niepotwierdzony semantic fingerprint/binding blokuje instalację. Packaging-only może przejść po walidacji E1/E2/E4 ze statusem `provisional`. Evidence jest per host/capability/version/scenario/timestamp/target.

### Consequences

- klasyfikacja capability jest częścią review i schema;
- błędna klasyfikacja jest nowym istotnym ryzykiem;
- UI/CLI musi jasno odróżniać `supported`, `provisional`, `unavailable`, `failed`;
- nie ma globalnego `--force` dla semantic/safety invariants.

## ADR-005 — Usunięcie Claude Code

**Status:** Accepted  
**Data:** 2026-07-14  
**Źródło konwergencji:** 5D, wybrane przez użytkownika.

### Context

Claude Code nie ma dostępnego runtime ani obecnie potwierdzonej potrzeby. Zachowanie targetu wymagałoby utrzymywania overlayu, testów i wyjątków przy niższym assurance, a obecne canonical source jest historycznie Claude-native. Zamiast raportować trwałe E5/E6 `unavailable`, użytkownik zdecydował usunąć host i wrócić do niego dopiero przy realnej potrzebie.

### Decision drivers

- redukcja zakresu i nietestowalnych claims;
- rzeczywiście neutralny common core;
- tylko hosty z aktywną potrzebą;
- brak projektowania pod hipotetyczną przyszłość;
- jasna lista supportu.

### Considered options

1. Blokować completion bez Claude E5/E6.
2. Zachować Claude z E1–E4 i jawnym E5/E6 unavailable.
3. Zewnętrzna/community certification.
4. **5D — usunąć Claude, dodać później jako nowy host**.

### Outcome

Claude znika ze supported targets, installera, overlays, canonical manifests, agents, commands, hooks, settings, tests, capability matrix i dokumentacji. Claude-native vocabulary zostaje usunięte z generic layer. Ponowne dodanie wymaga osobnego zadania z aktualnym Host Overlay Contract i dostępnością wymaganych testów.

### Consequences

- support matrix obejmuje Codex, Cursor i Kiro CLI;
- obecni użytkownicy Claude, jeśli istnieją, tracą wsparcie i wymagają komunikacji migracyjnej;
- nie powstaje placeholder `hosts/claude` ani future stub;
- docs project vision/architecture/roadmap wymagają aktualizacji.

## ADR-006 — Transakcyjna własność konfiguracji

**Status:** Accepted  
**Data:** 2026-07-14  
**Źródło:** konsekwencja zatwierdzonego custom installera i istniejącego standardu byte-exact rollback.

### Context

Host settings często współdzielą plik z konfiguracją użytkownika. Obecne instalatory Cursor/Kiro mogą najpierw usuwać destination, co pozostawia partial state po przerwaniu; standard projektu wymaga dowodu byte-exact non-mutation lub rollbacku dla transactional writers ([install evidence](../analysis/findings/test-assurance-runtime-gap.md), `.maister/docs/standards/testing/test-writing.md`).

### Decision drivers

- brak utraty danych użytkownika;
- update/uninstall tylko w granicach własności Maister;
- crash recovery;
- deterministyczny audit;
- wspólna implementacja lifecycle.

### Considered options

1. Nadpisywanie całych settings files.
2. Best-effort merge bez receipt.
3. Dedykowane pliki tam, gdzie host pozwala, oraz managed-key merge z journalem dla shared config.
4. Pozostawienie settings do ręcznej konfiguracji.

### Outcome

Installer deklaruje `whole_file` albo `managed_keys` per mutation. Przed commit zapisuje backup bytes/modes/topology, używa temp+atomic rename, transaction journalu i immutable receipt. Active receipt zmienia się dopiero po pełnym sukcesie. Uninstall usuwa tylko nadal zarządzane wartości; user drift pozostaje nietknięty.

### Consequences

- transaction/receipt schemas stają się krytycznym interfejsem;
- recovery musi uruchamiać się przed nową operacją;
- failure-injection tests obejmują każdy punkt commit;
- serializacja config może zmienić formatting, więc preferowane są dedicated files; shared merge wymaga świadomego formatter contract.

## ADR-007 — Granica testów i dowodu

**Status:** Accepted  
**Data:** 2026-07-14  
**Źródło:** research evidence oraz zatwierdzone rozdzielenie common/overlay.

### Context

Portable runtime ma wykonywalne E3, ale pełne suite'y są powtarzane dla byte-identical target copies. Jednocześnie host tests mają nierówne znaczenie: część to strukturalne checks, część realnie uruchamia CLI, a `exit 77` sygnalizuje brak dowodu. Nazwa testu nie może zastępować jawnego evidence level ([test assurance findings](../analysis/findings/test-assurance-runtime-gap.md)).

### Decision drivers

- szybki PR feedback bez czterokrotnego core;
- host-specific assurance tam, gdzie host rzeczywiście się różni;
- brak fałszywie zielonych skipów;
- claims powiązane z wersją i scenariuszem;
- możliwość dodania kolejnego hosta bez kopiowania całej suite.

### Considered options

1. Pełna suite dla każdego złożonego tree.
2. Tylko common core tests.
3. **Pełny E3 raz + parametryczne E1/E2/E4 per host + native E5/E6 per scenario**.

### Outcome

CI uruchamia pełne `test-core` raz. Dla Codex/Cursor/Kiro uruchamia wspólny overlay harness, deterministic assembly canary i pełny transactional lifecycle. Native host smoke/E2E są oddzielne i zapisują structured evidence. `77` oznacza `unavailable` i nigdy pass.

### Consequences

- krótszy, czytelniejszy PR quality gate;
- per-host tests nie mogą ponownie duplikować core edge cases;
- evidence schema i freshness validation są częścią release governance;
- host support jest per capability/scenario, nie jednym booleanem.

## Decision dependency map

```text
ADR-001 minimal primitives
        |
        +------> ADR-002 common + overlays + installer
                         |            |
                         |            +--> ADR-006 transactional ownership
                         |
                         +--> ADR-003 legacy removal
                         +--> ADR-004 capability compatibility
                         +--> ADR-007 evidence boundary

ADR-005 Claude removal --------> narrows ADR-002/003/007 to 3 hosts
```

## Traceability matrix

| Convergence choice | ADR | Design section |
|---|---|---|
| 1A | ADR-001 | High-level design §5 |
| 2D | ADR-002 | High-level design §3, §6–9 |
| 3D | ADR-003 | High-level design §12–13 |
| 4C | ADR-004 | High-level design §10 |
| 5D | ADR-005 | High-level design §12–13 |
| transactional installer invariant | ADR-006 | High-level design §7–9 |
| core once / host evidence | ADR-007 | High-level design §11 |

