# Raport badawczy: jedno, platformowo niezależne rozwiązanie Maister

## TL;DR
Rekomenduję jedno źródło zachowania i jeden bundle, z którego `maister install --target <host>` tworzy natywny pakiet wybranego narzędzia.
Rdzeń state/gates/continuation testujemy raz; per host zostają tylko adapter, materializer, install i runtime probes.
Nie rekomenduję jednego identycznego installed tree ani prostego przeniesienia obecnych regex buildów do instalatora.
Claude Code bez runtime może osiągnąć E4 instalacji, ale discovery i wykonanie E5/E6 pozostają jawnie niezweryfikowane.

## Key Decisions
- Docelowo: portable behavior/runtime core + typed host contracts + install-time materializer.
- „Jedno rozwiązanie” oznacza jedno źródło, jeden testowalny core i jeden dystrybuowany bundle; nie oznacza jednego host runtime.
- Neutralny IR rozwijać ewolucyjnie dla gates/roles/hooks/capabilities, zamiast budować pełny DSL przed migracją.
- Instalacja musi używać staging, validation, receipt, atomic swap i byte-exact rollback.
- Commitowane target trees usunąć dopiero po potwierdzonej parity i stabilnych release artifacts.

## Open Questions / Risks
- Semantyka gate/delegation/progress może dryfować mimo poprawnego layoutu; globalne substytucje tekstu są głównym źródłem ryzyka.
- Cursor i Kiro contracts są ruchome, a Kiro CLI/IDE wymagają osobnych, precyzyjnie nazwanych targetów.
- Compiler na maszynie użytkownika zwiększa koszt awarii, jeśli nie jest transakcyjny i odtwarzalny offline.
- Claude Code E5/E6 nie może być deklarowane bez realnej binarki, auth, wersji i wykonanego scenariusza.
- Native marketplaces mogą wymagać prebuilt artifacts; wspólny installer powinien z nimi współistnieć, nie koniecznie je zastępować.

## Odpowiedź wprost

Tak — projekt można znacząco uprościć i uniezależnić od narzędzia. Najlepszy model to:

```text
jedno canonical behavior/runtime core
              +
małe, wersjonowane adaptery hostów
              +
jeden installer/materializer --target
              =
różne, natywne pakiety instalacyjne
```

Nie da się bezpiecznie osiągnąć pełnej niezależności jako jednego identycznego katalogu. Hosty wymagają różnych manifestów, discovery, agents, hooks, MCP placement i sposobów interakcji (`analysis/findings/host-contracts-installation.md:29-63`). Niezależność powinna oznaczać wspólne **zachowanie i źródło**, nie identyczną fizyczną integrację.

## Dlaczego obecny model jest kosztowny

- Canonical source jest Claude-native, nie neutralny (`analysis/findings/canonical-core-boundary.md:33-55`).
- Trzy adaptery mają łącznie 1 780 linii, generator Kiro kolejne 160, a inventory wykazał około 320 tekstowych substytucji (`analysis/findings/canonical-core-boundary.md:101-112`).
- Cztery drzewa pluginów to 610 plików i ok. 5,08 MB wersjonowanych projekcji; nie są niezależnymi implementacjami behavior (`analysis/findings/canonical-core-boundary.md:125-133`).
- Pełny runner contract jest wykonywany cztery razy dla byte-identical copies, mimo że edge cases mogą działać raz na core (`analysis/findings/test-assurance-runtime-gap.md:48-58`).
- PR CI sprawdza głównie rebuild/diff, a pełne `make validate` dopiero release (`analysis/findings/test-assurance-runtime-gap.md:125-134`).

## Warianty

| Wariant | Wynik /25 | Największa zaleta | Główny problem | Rekomendacja |
|---|---:|---|---|---|
| Build-time generated variants | 15 | niski koszt przejścia, czytelny diff | duplikacja i regex coupling | baza migracji |
| Install-time compiler 1:1 | 13 | prosty `--target` | przenosi kruche regexy do użytkownika | odrzucić |
| Portable core + typed adapters | **23** | test core raz, minimalna macierz hostów | wymaga nowego kontraktu | **wybrać** |
| Pełny neutralny IR | 20 | najsilniejsza separacja | wysoki koszt i ryzyko over-design | stosować selektywnie |

Scorecard opiera się na wspólnych kryteriach planu oraz triangulacji transformacji, host contracts i assurance (`analysis/findings/canonical-core-boundary.md:83-133`; `analysis/findings/host-contracts-installation.md:29-158`; `analysis/findings/test-assurance-runtime-gap.md:150-250`).

## Architektura docelowa

### 1. Portable behavior/runtime core

Zawiera fazy, state schema/repository, gates, safety invariants, continuation, role intents, artifact contracts i wspólne bodies skills. Pięć modułów ESM już jest byte-identical w targetach i ma executable contracts, więc to nie jest czysto teoretyczny kierunek (`analysis/findings/canonical-core-boundary.md:57-81`).

### 2. Versioned Host Contract

Descriptor definiuje `host_id`, zakres wersji, capabilities, layout, invocation mapping, agent/hook emitters, fallbacki i native evidence target. Nieznane capabilities są fail-closed.

### 3. Typed/structural materializer

Materializer generuje manifest, layout, namespaces, agent MD/TOML/JSON, hooks, MCP placement i help. Działa na jawnych fields/primitives/templates, a nie na dowolnej prozie.

### 4. Jeden bundle i prebuilt artifacts

Bundle zawiera core, adapters, schemas, assets, installer i golden fixtures. CI materializuje wszystkie targety i może publikować prebuilt marketplace artifacts z dokładnie tego samego compiler path.

## Co pozostaje platformowe

| Common | Adapter-required |
|---|---|
| workflow invariants, durable state, gate semantics | manifest, catalog, discovery root |
| portable ESM runtime/helpers | invocation names i commands/skills collapse |
| skill bodies, assets, references | agent schema, tools, trust, concurrency |
| role intent i hook intent | user gate, progress, planning, headless policy |
| neutral MCP server data bez credentials | hook schema/env, MCP placement/security |
| evidence record schema | native marketplace, install scope, session UX |

Oficjalne kontrakty potwierdzają różne entry points: [Claude plugins reference](https://code.claude.com/docs/en/plugins-reference), [Codex build plugins](https://learn.chatgpt.com/docs/build-plugins), [Cursor plugins](https://cursor.com/changelog/2-5), [Kiro custom agents](https://kiro.dev/docs/cli/custom-agents/configuration-reference/). Są to dowody kontraktu, nie dowody udanego Maister runtime.

## Kontrakt instalacji

```text
maister install --target claude|codex|cursor|kiro-cli
  [--scope user|project|local]
  [--dest PATH]
  [--with-mcp NAME]
  [--host-version VERSION]
  [--offline]
```

1. Jawnie wybierz target; autodetection jedynie potwierdza.
2. Zweryfikuj descriptor/schema i compatibility policy.
3. Materializuj do pustego staging directory.
4. Sprawdź manifest, inventory, referencje, paths, permissions, forbidden vocabulary, semantic golden i installed-path canary.
5. Utwórz receipt: source/adapter/contract/host version, options, destination i hashes.
6. Zrób atomic swap managed tree; config mutations wykonaj transakcyjnie.
7. Przy failure przywróć tree, receipt, modes, symlinks i config byte-exact.
8. Update używa tego samego compile; uninstall usuwa wyłącznie managed files z receipt.

Obecne instalatory Cursor i Kiro czyszczą destination przed copy, więc nie spełniają takiego rollback contract (`analysis/findings/test-assurance-runtime-gap.md:136-148`).

## Testowanie: co raz, co per host

### Raz na każdą zmianę core

- state schema/repository, transactional rejection;
- gate evaluator/policy/denylist;
- continuation/outbox/idempotency/reclaim;
- report projection i portable workflow invariants;
- failure injection.

### Dla każdego hosta

- E1 descriptor/adapter contract;
- E2 deterministic materialization + semantic golden + canary;
- E4 isolated install/update/uninstall/rollback;
- E5 prawdziwe discovery + sentinel invocation, gdy binary/auth dostępne;
- E6 wersjonowany krytyczny scenario E2E.

Rekomendowane targety CI: `test-core` na każdy PR; `test-materializer`, `test-adapter-contract HOST` i `test-install HOST` na każdy PR; `test-host-smoke` nightly/manual; `test-host-e2e` scheduled/release (`analysis/findings/test-assurance-runtime-gap.md:241-250`).

## Claude Code bez runtime

W tym badaniu `claude` nie był dostępny. Claude Code oficjalnie oferuje tryb programistyczny `claude -p` i plugin loading ([headless docs](https://code.claude.com/docs/en/headless)), ale sama dokumentacja nie jest runtime proof.

| Dowód | Aktualnie | Możliwe bez runtime |
|---|---|---|
| E1 static/schema | tak | tak |
| E2 deterministic materialization | canonical n/a / przyszły adapter | tak |
| E3 shared core executable | tak | tak |
| E4 isolated install/rollback | brak dla Claude | **tak, cel** |
| E5 host discovery/smoke | brak | nie |
| E6 scenario runtime | `exit 77 unavailable` | nie |

Zatem release może jawnie raportować: `Claude host-specific E4; shared-core E3; E5/E6 unavailable`. Nie może raportować „pełna parity Claude”. To ograniczenie jest dobrze zdefiniowanym evidence ceiling, nie blokadą dla całej migracji (`analysis/findings/test-assurance-runtime-gap.md:150-175`).

## Migracja

| Etap | Exit criterion | Rollback |
|---|---|---|
| M0 Baseline | `test-core` w PR CI, evidence inventory | powrót do dotychczasowego CI |
| M1 Host Contract v1 | E1 dla 4 targetów, pierwsze typed primitives | emituj legacy text, stare buildy aktywne |
| M2 Shadow materializer | deterministyczna semantic parity z obecnymi outputami | wyłącz shadow job |
| M3 Opt-in installer | E4 dla 4 hostów, byte-exact injected rollback | legacy install path + previous receipt |
| M4 Jedna release path | dwa stabilne release z odtwarzalnymi artifacts | republish legacy artifact |
| M5 Usuń committed variants | offline rebuild, audit diff, E1–E4 stabilne | odtwórz z bundle/tagu |

## Explicit non-goals

- Jeden identyczny installed tree.
- Jeden wspólny host runtime.
- Pełna parity bez host-native evidence.
- Regexowe emulowanie brakujących capabilities.
- Pełny DSL/IR jako warunek startu.
- Usunięcie wszystkich testów per platform.

## Decyzje do konwergencji

1. Minimalne typed primitives + templates czy pełny IR od początku? **Rekomendacja: minimalne primitives.**
2. CI-prebuilt marketplace artifacts czy compiler zawsze u użytkownika? **Rekomendacja: prebuilt z tego samego materializera.**
3. Kiedy usunąć generated trees? **Rekomendacja: po dwóch stabilnych release z parity oracle.**
4. Co robić z nieznaną wersją hosta? **Rekomendacja: fail dla semantycznych mappings, warning dla packaging-only.**
5. Czy Claude E4 wystarcza jako release gate? **Rekomendacja: tak, przy jawnym E5/E6 unavailable.**

## Ryzyka i confidence

- **High confidence:** portable core istnieje; installed outputs muszą być różne; jeden bundle + target materialization jest wykonalny; Claude E5/E6 jest obecnie niezweryfikowane.
- **Medium confidence:** format descriptor/IR, atomic integration z marketplaces, moment usunięcia generated trees.
- **Low/unknown:** pełna runtime parity Claude bez realnego testu.

Najważniejsze ryzyka to semantic drift w prozie, zmienność host contracts, nietransakcyjny install i mylące zielone statusy dla testów unavailable. Każdy evidence record powinien zawierać host, capability, version, level, status, scenario, timestamp i target.

