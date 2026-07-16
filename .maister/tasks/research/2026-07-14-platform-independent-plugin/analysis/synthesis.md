# Synteza: platformowo niezależny Maister

## TL;DR
Maister może mieć jedno źródło zachowania, jeden testowalny rdzeń i jeden bundle dystrybucyjny, ale nie jeden identyczny katalog instalacyjny ani jeden wspólny runtime hosta.
Najlepszy kierunek to portable core + wersjonowane kontrakty hostów + strukturalny materializer uruchamiany przez `install --target`.
Pełny neutralny IR warto wprowadzać ewolucyjnie tylko dla miejsc, których nie da się bezpiecznie opisać typowanymi primitives i templates.
Brak runtime Claude Code nie blokuje E1–E4 ani migracji, ale pozostawia discovery i wykonanie E5/E6 niezweryfikowane.

## Key Decisions
- Przyjąć trzy różne znaczenia „jednego rozwiązania”: jedno źródło, jeden bundle oraz jeden runtime; celem są dwa pierwsze i wspólny portable runtime, nie jeden runtime hosta.
- Wybrać architekturę portable behavior/runtime core + cienkie, wersjonowane host adapters + install-time materializer.
- Zastąpić globalne transformacje prozy jawnie oznaczonymi primitives, typed descriptors i host-aware templates; neutralny IR rozszerzać tylko tam, gdzie przynosi mierzalną wartość.
- Utrzymać testy per host wyłącznie dla kontraktu adaptera, materializacji, instalacji i prawdziwych probes hosta; pełną suitę core wykonywać raz.
- Nie usuwać commitowanych wariantów przed osiągnięciem deterministycznej parity, transakcyjnego installera i odtwarzalnych release artifacts.

## Open Questions / Risks
- Największym ryzykiem nie jest layout, lecz semantyczna transformacja gate/delegation/progress/hooks ukryta dziś w zamianach tekstowych.
- Host contracts, szczególnie Cursor i rozdział Kiro CLI/IDE, mogą zmieniać się szybciej niż wersjonowane descriptors.
- Install-time compilation przenosi awarię na maszynę użytkownika; bez staging, validation, receipt, atomic swap i rollback pogorszy niezawodność.
- Claude Code pozostanie `runtime-unverified` do czasu realnego E5/E6 na zapisanej wersji binarki i scenariusza.
- Trzeba rozstrzygnąć, czy marketplaces otrzymują prebuilt artifacts z tego samego materializera, czy uruchamiają compiler po stronie klienta.

## 1. Triangulacja ustaleń

Trzy niezależne strumienie dowodów zbiegają się w tym samym miejscu:

1. **Rdzeń jest realnie przenośny.** Pięć modułów ESM odpowiedzialnych za state, gate i continuation jest identycznych w targetach, a testy wykonują ich zachowanie poza hostem (`analysis/findings/canonical-core-boundary.md:57-81`; `analysis/findings/test-assurance-runtime-gap.md:34-58`).
2. **Źródło instrukcji nie jest neutralne.** `plugins/maister/` jest Claude-native, zaś inne targety odzyskują własny kontrakt poprzez rozległe, częściowo semantyczne rewrites (`analysis/findings/canonical-core-boundary.md:33-55`, `analysis/findings/canonical-core-boundary.md:83-123`).
3. **Installed shape musi pozostać host-native.** Manifesty, discovery, agents, hooks, MCP i invocation różnią się kontraktowo, więc wspólny bundle musi materializować różne outputy (`analysis/findings/host-contracts-installation.md:29-63`).
4. **Testy nie powinny być mnożone razem z outputami.** Core można testować raz; adapter i install potrzebują parametrycznego harnessu, a host runtime osobnych, jawnie warunkowych probes (`analysis/findings/test-assurance-runtime-gap.md:163-250`).

Nie ma sprzeczności między „jednym rozwiązaniem” a różnymi outputami. Sprzeczność powstaje dopiero wtedy, gdy „jedno rozwiązanie” zostanie błędnie utożsamione z jednym fizycznym drzewem lub pełną runtime parity.

## 2. Trzy poziomy niezależności

| Poziom | Realistyczny cel | Ocena |
|---|---|---|
| Jedno źródło | Jeden neutralny model zachowania, assets, role intents i portable runtime | Tak; obecny core już to częściowo realizuje |
| Jeden bundle dystrybucyjny | Core + descriptors/templates + installer, wybór `--target` podczas instalacji | Tak; obecne buildy dowodzą wykonalności materializacji |
| Jeden runtime | Ten sam mechanizm discovery, tools, subagents, hooks i session semantics | Nie; runtime należy do hosta i pozostaje poza kontrolą Maister |

Wniosek: rozwiązanie może być niezależne od narzędzia na poziomie **intencji i zachowania domenowego**, ale integracja pozostaje zależna od hosta na granicy wejścia/wyjścia. To jest właściwa granica modułu, nie porażka portability.

## 3. Granica portable / platform-specific

### Portable core

- graf faz, bramki, safety invariants i reguły wznowienia;
- schema/repository `orchestrator-state.yml`, outbox, idempotency, gate history;
- portable ESM helpers i report projections;
- kontrakty artefaktów, role intents oraz wspólne bodies skills;
- neutralne metadata pluginu, MCP server definitions bez secretów i hook intent.

### Host adapter/materializer

- root marker, manifest/catalog, discovery root i namespace;
- mapping skills/commands oraz invocation syntax;
- MD/TOML/JSON agent serialization, tool names, trust i concurrency;
- `present_user_gate`, delegation, progress/planning projection i headless fallback;
- hook event schema, matchers, environment, root variables i output contract;
- MCP placement/policy, native marketplace/install scope i host session UX.

Dowody pokazują, że agents, gates i hooks są granicą semantyczną, a nie kosmetyczną (`analysis/findings/host-contracts-installation.md:81-111`). Dlatego adapter nie może być tylko mapą nazw plików.

## 4. Porównanie wariantów

Skala 1–5: 5 oznacza wynik najlepszy. Oceny są syntezą kosztu źródeł, udziału wspólnego testowalnego zachowania, fragility transformacji, host-native compatibility, reprodukowalności i migracji. Źródła bazowe: inventory transformacji i projekcji (`analysis/findings/canonical-core-boundary.md:83-133`), host contracts (`analysis/findings/host-contracts-installation.md:29-158`) oraz test ladder (`analysis/findings/test-assurance-runtime-gap.md:150-250`).

| Wariant | Utrzymanie | Testowalny core | Odporność transformacji | Host compatibility | Migracja/rollback | Razem /25 | Confidence |
|---|---:|---:|---:|---:|---:|---:|---|
| A. Obecne build-time variants | 2 | 3 | 2 | 4 | 4 | 15 | high |
| B. Obecne skrypty przeniesione 1:1 do installera | 3 | 3 | 1 | 4 | 2 | 13 | high |
| C. Portable core + typed thin adapters + install-time materializer | 5 | 5 | 4 | 5 | 4 | **23** | high dla kierunku, medium dla API |
| D. Pełny neutralny IR + generatory hostów | 4 | 5 | 5 | 4 | 2 | 20 | medium |

### A. Build-time generated variants

Zachowuje review diff i gotowe marketplace artifacts, ale wersjonuje 610 plików/~5,08 MB projekcji i powiela testowanie identycznego runtime. Jest bezpieczną bazą migracji, nie najlepszym stanem docelowym (`analysis/findings/canonical-core-boundary.md:125-133`).

### B. Install-time compiler bez zmiany modelu

Spełnia ergonomiczne `--target`, lecz relokuje około 320 substytucji i ich silent-failure surface na maszynę użytkownika. Upraszcza repo pozornie, a pogarsza transaction boundary. Tego wariantu nie rekomendujemy (`analysis/findings/canonical-core-boundary.md:101-123`; `analysis/findings/host-contracts-installation.md:126-142`).

### C. Shared portable core + thin adapters

Najlepiej wykorzystuje istniejący seam. Wspólne invariants i helpers są testowane raz; descriptor deklaruje capabilities, renderer tworzy native shape, a installer kontroluje transakcję. To rekomendowany target architecture.

### D. Neutralny IR

Docelowo może usunąć zależność prozy od host-specific vocabulary, lecz pełny AST/DSL podnosi koszt migracji i może pogorszyć ergonomię edycji promptów. IR jest uzasadniony dla strukturalnych elementów — gates, role, hooks, metadata i capability branches — ale nie jako warunek wstępny dla całej migracji. Należy go pogłębiać na podstawie prototypów, nie projektować kompletnie z góry (`analysis/findings/canonical-core-boundary.md:136-172`).

## 5. Rekomendowana architektura

```text
maister-dist/
  core/
    workflows/        # host-neutral behavior + oznaczone primitives
    runtime/          # state/gate/continuation ESM
    roles/            # intent, nie format MD/TOML/JSON
    assets/
  contracts/
    host.schema.json
    capability.schema.json
  adapters/
    claude/
    codex/
    cursor/
    kiro-cli/
  installer/
    materialize
    validate
    commit
    rollback
```

Interfejs adaptera powinien być wersjonowany i zawierać co najmniej: `host_id`, zakres wersji, capability states, layout/manifest schema, invocation mapping, agent/hook emitters, unsupported fallbacks i native evidence target. Default dla nieznanej capability powinien być fail-closed.

### Explicit non-goals

- Jeden identyczny installed tree dla wszystkich hostów.
- Emulowanie brakującej capability za pomocą niejawnego prompt rewrite.
- Zastąpienie natywnych marketplaces jednym prywatnym mechanizmem instalacji.
- Deklarowanie pełnej parity tylko na podstawie schema, golden lub wspólnego core.
- Budowa kompletnego DSL/IR przed walidacją minimalnych typed primitives.
- Usunięcie wszystkich testów per host.

## 6. Kontrakt `install --target`

Proponowana ergonomia:

```text
maister install --target claude|codex|cursor|kiro-cli \
  [--scope user|project|local] [--dest PATH] [--with-mcp NAME] \
  [--host-version VERSION] [--offline]
```

Pipeline:

1. **Resolve** — `--target` jest jawny; autodetection może tylko zasugerować lub potwierdzić, a konflikt kończy się błędem.
2. **Type-check** — załaduj descriptor zgodny ze schema i sprawdź zakres wersji/capabilities.
3. **Materialize** — wygeneruj kompletne native tree w pustym staging dir; nie modyfikuj destination.
4. **Validate** — schema, inventory, referential integrity, forbidden vocabulary, path containment, executable bits, semantic golden i installed-path canary.
5. **Receipt** — zapisz source version, adapter/contract version, target, detected host version, options, hashes, destination i previous receipt.
6. **Atomic commit** — backup istniejącego managed tree, rename staged tree w tej samej filesystem boundary, potem osobno kontrolowane config/marketplace mutations.
7. **Rollback** — przy dowolnym failure przywróć poprzedni tree, receipt, modes, symlinks i config byte-exact; nowy receipt staje się aktywny dopiero po pełnym commit.
8. **Verify** — zwróć maszynowy evidence record; runtime probe jest osobnym krokiem i nie może zmieniać wyniku E4 na E5 bez rzeczywistego hosta.

Update wykonuje ten sam deterministic compile. Uninstall usuwa tylko ścieżki zarządzane przez receipt. Prebuilt marketplace artifacts powinny powstawać w CI z tego samego materializera, dzięki czemu klient nie musi mieć build toolchainu (`analysis/findings/host-contracts-installation.md:186-214`).

## 7. Strategia testów

### Testowane raz

- schema/state repository, atomic state transitions i failure injection;
- gate evaluator, policy, denylist, Advisor/Arbiter records;
- continuation/outbox/idempotency/reclaim;
- report projection i wspólne workflow invariants;
- deterministyczne utilities niekorzystające z host APIs.

Repo ma już E3 dla istotnej części tego rdzenia, choć PR quality gate nie uruchamia wszystkich suit (`analysis/findings/test-assurance-runtime-gap.md:36-58`, `analysis/findings/test-assurance-runtime-gap.md:125-134`).

### Pozostające per host

- E1 adapter contract: descriptor, schema, vocabulary, required/forbidden files;
- E2 materializer: deterministyczność, semantic golden, checksums, installed-path canary;
- E4 install: fresh/reinstall/upgrade/uninstall, atomicity, rollback, permissions, topology;
- E5 host smoke: discovery + sentinel skill/agent;
- E6 scenario E2E: krytyczny workflow, user gate, delegation i continuation.

Wynik powinien mieć pola `{host, capability, host_version, adapter_version, evidence_level, status, scenario, timestamp, target}`. `exit 77` oznacza `unavailable`, nigdy pass (`analysis/findings/test-assurance-runtime-gap.md:60-95`).

## 8. Claude Code: evidence ceiling

W badanym środowisku nie ma runtime `claude`. Oficjalna dokumentacja opisuje `claude -p`, plugin loading i session continuation, ale jest to dowód kontraktu produktu, nie wykonania Maister: [Claude Code headless](https://code.claude.com/docs/en/headless), [Claude Code plugins reference](https://code.claude.com/docs/en/plugins-reference).

Aktualnie:

- host-specific shape: E1;
- wspólny core: E3, stosowalny do Claude przez wspólny kontrakt;
- install: brak repo-owned E4 dla Claude;
- discovery/runtime: E5/E6 `unverified`.

Po wdrożeniu izolowanego testu staged install do fixture `CLAUDE_CONFIG_DIR` można uczciwie osiągnąć E4 bez binarki. Nadal nie wolno twierdzić, że Claude odkrywa plugin, wiąże tools lub wykonuje workflow. Granicę tę potwierdzają zarówno sentinel `exit 77`, jak i fail-closed capability matrix (`analysis/findings/test-assurance-runtime-gap.md:60-95`, `analysis/findings/test-assurance-runtime-gap.md:150-175`).

## 9. Migracja z kryteriami wyjścia i rollbacku

### M0 — Baseline i nazwanie testów

- Exit: inventory current outputs, evidence records, `test-core` w PR CI, obecne buildy pozostają źródłem release.
- Rollback: tylko zmiany CI/nazw; powrót do dotychczasowych targets bez wpływu na użytkownika.

### M1 — Portable primitives i Host Contract v1

- Zastąpić reprezentatywne gate/delegation/progress rewrites oznaczonymi primitives; descriptor dla czterech hostów.
- Exit: canonical behavior nie zawiera wybranych host tokens; parametryczny E1 przechodzi dla wszystkich targetów.
- Rollback: renderer może emitować dotychczasowy tekst; build-time variants nadal obowiązują.

### M2 — Typed materializer w trybie shadow

- Generować targety obok obecnych buildów, bez instalacji użytkownika.
- Exit: semantic parity na inventory/manifest/references i deterministyczny rebuild; wszystkie rozbieżności sklasyfikowane.
- Rollback: wyłączyć shadow job; stare skrypty nadal publikują artifacts.

### M3 — Transactional installer opt-in

- Dodać `install --target`, staging, receipt, atomic swap, rollback oraz E4 dla czterech hostów.
- Exit: injected failures dowodzą byte-exact rollback; fresh/update/uninstall przechodzą offline na temp roots.
- Rollback: feature flag/legacy install path; receipt umożliwia odtworzenie poprzedniej wersji.

### M4 — Jedno źródło dystrybucji

- CI generuje prebuilt marketplace artifacts wyłącznie nowym materializerem; stare buildy pozostają comparison oracle przez jeden cykl release.
- Exit: dwa kolejne release bez nieobjaśnionego driftu i z odtworzeniem artifacts z tagu.
- Rollback: republish ostatni legacy artifact; nie usuwaj legacy builderów przed zakończeniem obserwacji.

### M5 — Usunięcie commitowanych variants

- Exit: release, offline rebuild, audit diff, receipts i per-host E1–E4 są stabilne; dostępne E5/E6 pozostają zielone lub jawnie unavailable.
- Rollback: odtworzyć warianty z release bundle/materializer; tag zachowuje dokładne adapter versions i hashes.

## 10. Decyzje do późniejszej konwergencji

1. **Zakres neutralnego modelu:** minimalne typed primitives + templates (rekomendowane) czy pełny IR/DSL od początku.
2. **Dystrybucja:** jeden source bundle + CI-prebuilt marketplace artifacts (rekomendowane) czy compiler zawsze uruchamiany na kliencie.
3. **Usunięcie generated trees:** po jednym czy dwóch stabilnych release; rekomendowane dwa cykle z parity oracle.
4. **Nieznana wersja hosta:** fail dla krytycznych capability mappings, warning dla packaging-only różnic (rekomendowane) czy global fail/warn.
5. **Claude assurance:** zaakceptować E4 jako release gate przy jawnym E5/E6 unavailable (rekomendowane) czy blokować release do uzyskania runtime.

## Confidence

- **High:** istnienie portable core, konieczność host-native outputów, wykonalność jednego bundle + target materialization, obecny evidence ceiling Claude.
- **Medium:** dokładny format descriptor/IR, ergonomia atomic swap across native marketplace flows, moment usunięcia generated trees.
- **Low/unknown:** realna pełna parity Claude Code, dopóki nie zostanie wykonany wersjonowany E5/E6.

