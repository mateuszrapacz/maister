# Granica kanonicznego rdzenia i adapterów platformowych

## TL;DR
Maister ma już realny, przenośny rdzeń wykonawczy: pięć modułów Node.js odpowiedzialnych za stan, bramki i kontynuację jest kopiowanych bajt w bajt do wszystkich trzech generowanych targetów.
Nie ma jednak neutralnego kanonicznego modelu instrukcji: `plugins/maister/` jest pakietem Claude Code, a Cursor, Kiro i Codex odzyskują własne kontrakty przez około 320 tekstowych substytucji, override'y i syntezę nowych plików.
Najstabilniejsza granica przebiega między neutralnym kontraktem zachowania (fazy, stan, gate semantics, role i artefakty) a jawnym adapterem capabilities/invocation/packaging; materializacja może odbywać się przy instalacji, ale sama zmiana momentu generowania nie usuwa potrzeby testowania adapterów.
Rekomendowany kierunek to wspólny behavior/runtime core plus cienkie, wersjonowane adaptery hostów i deterministyczny instalator `--target`, bez commitowania pełnych wygenerowanych drzew jako źródeł utrzymania.

## Key Decisions
- Traktować pięć wspólnych modułów ESM oraz kontrakty `orchestrator-state.yml` i gate engine jako zalążek właściwego portable core, a nie jako element adaptera Claude.
- Nie traktować obecnego `plugins/maister/` jako neutralnego IR: jest to Claude-native frontend zawierający nazwy narzędzi, plików, trybów i namespace'u Claude.
- Wydzielić mały, deklaratywny Host Contract oraz materializer instalacyjny; różnice semantyczne muszą być capability-controlled i jawnie testowane, nie realizowane globalnym `sed`.
- Przenieść wybór targetu do instalacji dopiero po uzyskaniu deterministycznych golden/contract tests dla każdego adaptera; install-time generation zmienia dystrybucję, nie obowiązek weryfikacji.

## Open Questions / Risks
- Czy hosty potrafią wykonać wspólną neutralną reprezentację workflow bez utraty jakości promptów, czy też potrzebny będzie kompilowany dokument per host?
- Kiro zmienia nie tylko składnię, lecz także model pytań, progress tracking, planowanie i sposób reprezentacji agentów; zbyt cienki adapter ukryje różnice semantyczne zamiast je kontrolować.
- Brak runtime Claude Code pozostawia jego host-native discovery i wykonanie niezweryfikowane; wspólny core i materializer mogą być dobrze przetestowane, ale nie zastępują E6.
- Rezygnacja z commitowanych targetów upraszcza repozytorium, ale wymaga hermetycznego, wersjonowanego materializera oraz release artifacts możliwych do odtworzenia offline.

## 1. Mapa aktualnego przepływu

Aktualny pipeline ma postać:

```text
plugins/maister/ (Claude-native source)
          |
          +--> platforms/cursor/build.sh ----> plugins/maister-cursor/
          +--> platforms/kiro-cli/build.sh --> plugins/maister-kiro/
          +--> platforms/codex-cli/build.sh -> plugins/maister-codex/
```

### Finding 1: „canonical” oznacza obecnie Claude-native source, nie neutralny model

- **Claim:** Źródło kanoniczne jest fizycznie i językowo związane z Claude Code: manifest znajduje się w `.claude-plugin`, opis nazywa Claude Code, instrukcje projektu są w `CLAUDE.md`, a współdzielony dokument orchestratora definiuje delegację przez `Skill`/`Task` oraz pytania przez `AskUserQuestion`.
- **Evidence:**
  - `plugins/maister/.claude-plugin/plugin.json:1-8` — host-native manifest i opis „for Claude Code”.
  - `plugins/maister/CLAUDE.md:1-16` oraz `plugins/maister/CLAUDE.md:26-41` — kanoniczna instrukcja i bezpośrednia zależność od `AskUserQuestion`.
  - `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:7-20` — delegacja jest opisana nazwami narzędzi Claude.
  - `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:58-80` — obowiązkowe bramki odwołują się do `AskUserQuestion` i permission modes Claude.
- **Evidence level:** E1 (static source inspection).
- **Confidence:** high — coupling jest jawny w manifestach i normatywnych instrukcjach.
- **Inference/limitation:** Dokumenty workflow są wykonywane przez model, więc tekst host-specific jest częścią programu, a nie wyłącznie komentarzem; nie zmierzono jeszcze wpływu neutralizacji słownika na jakość wykonania.

### Finding 2: Behavior model jest w większości wspólny mimo Claude-oriented powierzchni

- **Claim:** Fazy, kolejność persystencji, idempotency, denylist, gate history, phase-entry evidence i artefakty są definiowane niezależnie od hosta; nowsze workflow już nazywają pytanie prymitywem `host_adapter.present_user_gate`, co jest gotowym miejscem na seam.
- **Evidence:**
  - `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:94-128` — wspólna polityka gate/Advisor/Arbiter i porządek persystencji.
  - `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:139-159` — wspólny durable continuation protocol.
  - `plugins/maister/skills/development/SKILL.md:100-140` — workflow jawnie rozróżnia gate engine od adapterowego `present_user_gate`.
  - `plugins/maister/skills/research/SKILL.md:63-104` — research używa tego samego gate/state/continuation contract.
- **Evidence level:** E1 dla deklarowanego kontraktu; E3 dla jego wykonywalnych helperów opisanych w Finding 3.
- **Confidence:** high — te same invariants występują w frameworku i wielu workflow.
- **Inference/limitation:** Wspólny model jest dziś powielony w prozie workflow; samo podobieństwo instrukcji nie gwarantuje identycznej interpretacji przez różne hosty.

## 2. Rzeczywisty portable runtime

### Finding 3: Pięć modułów Node.js jest już bajtowo identycznym rdzeniem wszystkich targetów

- **Claim:** `gate-evaluator.mjs`, `orchestrator-state-repository.mjs`, `orchestrator-state-schema.mjs`, `phase-continue.mjs` i `workflow-continuation.mjs` są wspólną implementacją o łącznej wielkości 1 995 linii; bieżące kopie w Codex, Cursor i Kiro są byte-identical względem canonical.
- **Evidence:**
  - `Makefile:3-9` — macierz runnerów i lista wspólnych automatic runtime files.
  - `Makefile:57-66` — ten sam contract suite jest wykonywany przeciw czterem ścieżkom runnera.
  - `Makefile:68-87` — `cmp` wymusza identyczność wspólnego runtime w trzech projekcjach; wyjątkiem jest osobny Codex binding.
  - `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs:1-24` — czysty Node.js ESM, jawny denylist i ścisły kontrakt wejścia.
  - Reprodukowalny inventory w tym checkout: `wc -l plugins/maister/skills/orchestrator-framework/bin/*.mjs` = 1 995; `cmp` dla każdego z 5 plików i 3 targetów zakończył się sukcesem.
- **Evidence level:** E3 (isolated executable contract + byte-identity validation).
- **Confidence:** high — repo ma wykonujące się testy kontraktowe i jawne `cmp`.
- **Inference/limitation:** Byte-identical kopie dowodzą wspólnego core, ale ich fizyczne powielanie w targetach nadal jest problemem packagingu, nie semantyki.

### Finding 4: Capability-dependent binding jest mały i powinien pozostać poza core

- **Claim:** Fully automatic continuation ma wspólny evaluator/repository/runner, lecz host-native evidence i binding są rozdzielone; aktualnie tylko Codex ma `declared_status: supported`, a pozostałe hosty są fail-closed.
- **Evidence:**
  - `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml:1-18` — jedna macierz invariants i osobne host-native evidence targets.
  - `platforms/codex-cli/build.sh:172-176` — tylko host-specific binding jest podmieniany, a sąsiedni runtime pozostaje canonical.
  - `Makefile:47-55` — shared runner jest jawnie odrzucony jako native evidence; status wynika z wykonania targetu hosta.
- **Evidence level:** E3 dla wspólnego kontraktu, E1 dla deklarowanej macierzy bieżącego checkoutu.
- **Confidence:** high — granica jest jawnie opisana i egzekwowana w Makefile.
- **Inference/limitation:** Status capability jest migawką repozytorium, nie trwałą własnością hosta; adapter musi być wersjonowany wraz z evidence.

## 3. Inwentarz transformacji

Poniższa klasyfikacja rozróżnia transformacje **syntaktyczne** (zmiana reprezentacji przy zachowaniu intencji) od **semantycznych** (zmiana dostępnego zachowania, fallbacku lub modelu interakcji).

| Klasa | Przykład | Typ | Dowód | Poziom / confidence |
|---|---|---|---|---|
| Manifest i layout | `.claude-plugin` jest zastępowany `.cursor-plugin`; Codex tworzy `.codex-plugin`; Kiro usuwa manifest Claude i buduje `agents/`, `steering/`, `settings/` | syntactic/packaging | `platforms/cursor/build.sh:18-48`; `platforms/codex-cli/build.sh:15-42`; `platforms/kiro-cli/build.sh:382-387` | E2 / high |
| Namespace i discovery nazw | `maister:foo` → `maister-foo`, zmiana nazw katalogów i frontmatter | syntactic | `platforms/cursor/build.sh:50-63`; `platforms/kiro-cli/build.sh:389-421`; `platforms/codex-cli/build.sh:51-57` | E2 / high |
| Commands → skills | Host bez command component materializuje command wrappers jako skills | syntactic z ryzykiem inventory collision | `platforms/cursor/build.sh:254-288`; `platforms/kiro-cli/build.sh:43-74`; `platforms/codex-cli/build.sh:178-187` | E2 / high |
| Invocation vocabulary | `Skill tool`, `Task tool`, `subagent_type` są przepisywane na slash skills/subagent/native delegation | semantic boundary, bo zmienia dostępne primitive i nesting | `platforms/kiro-cli/build.sh:263-344`; `platforms/codex-cli/build.sh:60-90`; canonical kontrakt: `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:7-20` | E1-E2 / high |
| User gates | Claude `AskUserQuestion`, Cursor `AskQuestion`, Kiro chat-native gate, Codex plain-text question | semantic, zwłaszcza multi-select/headless fallback | `platforms/cursor/build.sh:74-92`; `platforms/kiro-cli/build.sh:94-163`; `platforms/codex-cli/build.sh:60-68` | E1-E2 / high |
| Progress | Claude tasks są mapowane na Cursor `TodoWrite`, Kiro `todo`, a Codex na wpisy w authoritative state | semantic projection | `platforms/cursor/build.sh:413-456`; `platforms/kiro-cli/build.sh:346-367`; `platforms/codex-cli/build.sh:64-68` | E1-E2 / high |
| Planning | Claude plan-mode vocabulary jest usuwane lub zastępowane file/native planning | semantic UX/capability | `platforms/kiro-cli/build.sh:165-181`; `platforms/codex-cli/build.sh:67-68`; `platforms/cursor/build.sh:86-92` | E1-E2 / high |
| Agent representation | Kiro konwertuje Markdown+frontmatter do JSON i osobnych instruction files, mapując tools/resources/trusted agents | syntactic + capability mapping | `platforms/kiro-cli/generate-agent-json.sh:75-139`; `platforms/kiro-cli/build.sh:589-689` | E2 / high |
| Hooks | Każdy target zastępuje lub syntetyzuje host-native event schema i ścieżki | semantic integration | `platforms/cursor/build.sh:137-142`; `platforms/kiro-cli/build.sh:595-689`; `platforms/codex-cli/build.sh:299-303` | E2 / high |
| Content override | quick-plan/quick-bugfix i utility skills otrzymują osobne ciała; Kiro generuje dodatkowe shortcuts | semantic divergence | `platforms/cursor/build.sh:256-260`; `platforms/cursor/build.sh:463-576`; `platforms/kiro-cli/build.sh:184-243`; `platforms/kiro-cli/build.sh:698-814`; `platforms/codex-cli/build.sh:189-297` | E1-E2 / high |
| Context optimization | Kiro wycina katalog z always-loaded steering do lazy reference | semantic/performance | `platforms/kiro-cli/build.sh:525-580` | E2 / high |

### Finding 5: Większość ryzyka leży w transformacji prozy, nie w packagingu

- **Claim:** Trzy build adapters mają razem 1 780 linii (`582 + 860 + 338`), a pomocniczy generator agentów Kiro kolejne 160. W bieżącej migawce prosty inventory wykrywa około 320 wyrażeń substytucji (`91 Cursor + 169 Kiro + 60 Codex`), przy czym wiele dopasowuje warianty naturalnego języka zamiast stabilnych pól schema.
- **Evidence:**
  - `platforms/cursor/build.sh:310-374` — długa lista ręcznych wariantów nazw i fraz.
  - `platforms/kiro-cli/build.sh:94-153` — kilkadziesiąt zamian tylko dla sposobów zapisania gate.
  - `platforms/kiro-cli/build.sh:263-344` — kolejna lista wariantów delegacji i nazw skills.
  - `platforms/codex-cli/build.sh:44-132` — ten sam słownik zamian jest duplikowany w dwóch funkcjach transformujących Markdown.
  - Reprodukowalny inventory w tym checkout: `wc -l` dla skryptów oraz `rg` wyrażeń `sedi`/`sed -e`.
- **Evidence level:** E1 (static inventory); deterministyczność samej materializacji jest E2 tam, gdzie build jest porównywany z committed output.
- **Confidence:** high dla liczb w checkout; medium dla wniosku o awaryjności bez historii defectów.
- **Inference/limitation:** Liczba substytucji nie jest miarą złożoności semantycznej jeden-do-jednego, ale wielokrotne warianty tej samej frazy zwiększają surface na silent miss i order-dependent rewrite.

### Finding 6: Canonical vocabulary rozlewa coupling na większość aktywnych workflow

- **Claim:** W bieżącym checkout 52 pliki Markdown canonical zawierają co najmniej jeden z host-specific tokenów (`AskUserQuestion`, task/plan/delegation tools, `subagent_type`, `CLAUDE.md`); samo `AskUserQuestion` występuje w 33 plikach, `Task tool` w 23, `Skill tool` w 18, a `subagent_type` w 17.
- **Evidence:**
  - Reprodukowalny inventory: `rg -l --glob '*.md' <token> plugins/maister`.
  - Reprezentatywne miejsca: `plugins/maister/agents/implementation-planner.md:239-244`; `plugins/maister/commands/reviews-code.md:20-37`; `plugins/maister/skills/codebase-analyzer/SKILL.md:97-110`.
  - Centralny kontrakt: `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:7-20` i `:58-80`.
- **Evidence level:** E1.
- **Confidence:** high dla inventory; medium dla oceny kosztu, bo część trafień jest dokumentacyjna.
- **Inference/limitation:** Globalne token counts mogą zawierać przykłady lub opisy anti-patterns, ale adapter i tak musi odróżnić je od instrukcji wykonywalnych, co samo jest źródłem fragility.

### Finding 7: Commitowane projekcje zwielokrotniają powierzchnię repo, ale nie dają niezależnego dowodu semantyki

- **Claim:** Cztery drzewa pluginów zawierają obecnie 610 plików i około 5,08 MB wersjonowanej treści łącznie; trzy targety są deterministycznymi projekcjami canonical + adapter, więc ich obecność ułatwia dystrybucję i drift diff, lecz nie stanowi trzech niezależnych implementacji behavior.
- **Evidence:**
  - `Makefile:11-22` — każdy build generuje osobny target, a validate uruchamia wszystkie target gates.
  - `.maister/docs/standards/global/build-pipeline.md:1-17` — generated targets są nieedytowalne i muszą odtwarzać się ze źródła.
  - Reprodukowalny inventory w tym checkout: `find plugins/maister* -type f` oraz `git ls-files ... | xargs wc -c` = 610 plików / 5 084 215 bajtów dla czterech drzew.
- **Evidence level:** E1 dla rozmiaru i ownership; E2 dla deterministycznej projekcji objętej build/drift check.
- **Confidence:** high.
- **Inference/limitation:** Usunięcie targetów z Git nie zmniejszy wielkości instalowanego pluginu i może pogorszyć review diffs, jeśli release pipeline nie zachowa czytelnych artifacts/snapshots.

## 4. Proponowana granica core/adapter

### Finding 8: Stabilny seam powinien opisywać intencję, nie nazwy narzędzi

- **Claim:** Najmniejszy sensowny portable core obejmuje: phase graph, domain workflow rules, artifact contracts, state schema/repository, gate policy/evaluator, continuation protocol, role intents i safety invariants. Poza core powinny znaleźć się: discovery layout, manifest, invocation syntax, user-gate presentation, delegation primitive, progress projection, planning UX, hook events, agent serialization i capability evidence.
- **Evidence:**
  - Core candidates: `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md:94-159`; `plugins/maister/skills/research/SKILL.md:56-130`; `Makefile:3-9`.
  - Adapter candidates są dokładnie miejscami obecnych transformacji: `platforms/cursor/build.sh:21-151`; `platforms/kiro-cli/build.sh:382-508`; `platforms/codex-cli/build.sh:15-132`.
  - Istniejący seam nazwany wprost: `plugins/maister/skills/development/SKILL.md:109-140`.
- **Evidence level:** E1 + architectural inference.
- **Confidence:** high dla przypisania obecnych odpowiedzialności; medium dla dokładnego przyszłego API bez prototypu.
- **Inference/limitation:** Neutralny core nie musi być jednym plikiem ani pełnym AST. Minimalna migracja może zacząć się od jawnych placeholderów/primitives w Markdown, zanim uzasadniony będzie pełny IR.

Proponowany kontrakt hosta powinien być mały i deklaratywny, np. koncepcyjnie:

```yaml
host:
  id: codex
  capabilities:
    user_gate: plain_text
    nested_subagents: true
    progress_projection: state_only
    fully_automatic_continuation: native_evidence_required
  vocabulary:
    project_instructions: AGENTS.md
    skill_invocation: "$maister:{name}"
  packaging:
    manifest: .codex-plugin/plugin.json
    skills_root: skills/
    commands: materialize_as_skills
  bindings:
    present_user_gate: codex_plain_text
    delegate_role: codex_native_subagent
    project_progress: orchestrator_state
```

Ten przykład jest **hipotezą projektową, E0, confidence medium**: nazwy pól wymagają prototypu i golden fixtures, ale odpowiedzialności wynikają bezpośrednio z istniejących adapterów.

## 5. Ocena install-time materialization

### Finding 9: Wybór platformy przy instalacji jest wykonalny, ale powinien materializować host-native artefakt

- **Claim:** Wszystkie trzy adaptery już działają jako deterministyczne materializery `CORE + PLATFORM -> OUT`; przeniesienie wywołania z `make build-*` do `maister install --target <host>` jest zmianą momentu i miejsca wykonania, a nie nowym modelem transformacji.
- **Evidence:**
  - `platforms/cursor/build.sh:4-19`, `platforms/kiro-cli/build.sh:4-8` i `:380-384`, `platforms/codex-cli/build.sh:4-16` — każdy adapter ma jawne wejście canonical, katalog platformy i output.
  - `Makefile:11-20` — obecny selector targetu istnieje jako trzy build targets.
  - `platforms/kiro-cli/build.sh:18-34` — materializacja już wymaga ochrony przed współbieżną mutacją outputu, co wskazuje na potrzebę atomowego instalatora.
- **Evidence level:** E2 dla obecnej materializacji; E0 dla przyszłego install-time CLI.
- **Confidence:** high dla wykonalności, medium dla ergonomii i kompatybilności bez prototypu instalatora.
- **Inference/limitation:** Jeden dystrybuowany bundle nadal musi zawierać adaptery i host-specific assets. Nie będzie jednym identycznym katalogiem odkrywanym przez wszystkie hosty; będzie jednym inputem generującym jeden wybrany native layout.

### Rekomendowany model docelowy

1. **Portable behavior/runtime core** — neutralne workflow contracts i obecne moduły ESM, testowane raz na fixtures. **E3 / confidence high** na podstawie istniejącego runtime matrix (`Makefile:57-87`).
2. **Versioned Host Contract** — capabilities oraz wiązania dla gate/delegation/progress/planning/hooks, z fail-closed defaults. **E1 + inference / confidence high** na podstawie istniejącej capability matrix (`host-capabilities.yml:1-18`).
3. **Per-host renderer/materializer** — generuje manifest, layout, agent format i host-native instrukcje do katalogu tymczasowego, waliduje, a następnie atomowo instaluje. **E0 / confidence medium**; obecne build scripts dowodzą wejść/wyjść, nie atomowego unified installera.
4. **Release bundle zamiast trzech utrzymywanych drzew** — canonical core + adapters + assets + golden fixtures; CI materializuje wszystkie targety i publikuje gotowe artifacts dla marketplace, ale pełne drzewa nie muszą być commitowane. **E0 / confidence medium**; wymaga decyzji o review ergonomics i offline reproducibility.

## 6. Co uprościć najpierw

### Etap A — bez zmiany dystrybucji

- Zastąpić w canonical workflow bezpośrednie nazwy narzędzi małym słownikiem intencji (`present_user_gate`, `delegate_role`, `invoke_capability`, `project_progress`) tam, gdzie pliki już mówią o `host_adapter`. **E0 / confidence high** co do kierunku; dowód istniejącego seam: `plugins/maister/skills/development/SKILL.md:109-140`.
- Utrzymywać semantyczne capability branches jawnie; nie zamieniać ich regexami. **E0 / confidence high**, bo Kiro gate/progress/delegation transforms zmieniają zachowanie (`platforms/kiro-cli/build.sh:94-163`, `:263-367`).
- Wyciągnąć wspólne utility skills (`resume/status/next/bye/dev`) do jednego neutralnego źródła z rendererem invocation syntax. Dziś są generowane osobno w Cursor, Codex i Kiro. **E1 / confidence high**: `platforms/cursor/build.sh:463-576`, `platforms/codex-cli/build.sh:189-297`, `platforms/kiro-cli/build.sh:746-814`.

### Etap B — semantic materializer

- Zastąpić globalne `sed` strukturą transformacji opartą o jawne pola/frontmatter/placeholdery; tekst naturalny pozostawić nietknięty, chyba że dany blok jest oznaczonym host bindingiem. **E0 / confidence medium** — potrzebny prototyp na reprezentatywnych workflow.
- Rozdzielić transformacje na `package`, `render-vocabulary`, `bind-capability`, `host-assets`; każdy etap ma schema validation i golden output. **E0 / confidence medium**.
- Utrzymać native evidence target jako osobny element capability record, nie jako właściwość wspólnego runtime. **E3 / confidence high**: `Makefile:47-55`.

### Etap C — install-time selection

- Dodać jeden entrypoint w stylu `maister install --target claude|codex|cursor|kiro [--dest ...]`.
- Materializować do katalogu tymczasowego, walidować manifest/inventory/references, wykonywać atomic rename lub pełny rollback; zapisać target, adapter version i content hash w install receipt.
- W CI nadal materializować i testować **wszystkie** targety; lokalny użytkownik wybiera jeden. Nie używać install-time wyboru do ograniczenia macierzy projektu.
- Dla marketplace publikować prebuilt artifacts z tego samego materializera, aby konsument nie potrzebował toolchainu build.

Wszystkie cztery punkty Etapu C są **E0 / confidence medium**: są rekomendacją wyprowadzoną z obecnych deterministic builds, lecz nie istnieją jeszcze w repo.

## 7. Konsekwencja dla Claude Code bez runtime

### Finding 10: Neutralny core zwiększy zakres dowodu bez Claude runtime, lecz nie zamknie luki hostowej

- **Claim:** Po wydzieleniu core można raz udowodnić gate/state/continuation semantics na E3 i materializację Claude adaptera na E1-E2; bez uruchomienia Claude Code nie można dowieść discovery, tool binding ani pełnego workflow na E5-E6.
- **Evidence:**
  - `Makefile:24-30` i `:57-87` — shared contracts i byte-identity runtime są testowane niezależnie od hosta.
  - `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml:7-9` — Claude native target jest obecnie zadeklarowany jako unsupported.
  - `Makefile:47-55` — shared runner nie może zastąpić native evidence.
- **Evidence level:** E3 dla core, E1-E2 dla możliwej materializacji, `unverified` dla Claude E5-E6.
- **Confidence:** high.
- **Inference/limitation:** Nawet idealny kontrakt statyczny nie wykryje zmian nieudokumentowanego zachowania hosta; potrzebny jest okresowy zewnętrzny/native canary, gdy runtime stanie się dostępny.

## 8. Ostateczna rekomendacja dla syntezy

**Rekomendacja:** wybrać wariant **„wspólny behavior/runtime core + cienkie adaptery + install-time materializer”**, a neutralny pełny IR wprowadzać tylko tam, gdzie oznaczone primitives i templates nie wystarczą.

- **Dlaczego:** repo już dowodzi, że executable state/continuation core może być identyczny na wszystkich hostach (`Makefile:57-87`), natomiast setki prozatorskich rewrite'ów pokazują, że Claude-native Markdown nie jest stabilnym neutralnym wejściem (`platforms/kiro-cli/build.sh:94-367`, `platforms/cursor/build.sh:310-456`, `platforms/codex-cli/build.sh:44-132`).
- **Evidence level:** E3 + architectural inference.
- **Confidence:** high dla wyboru granicy; medium dla szczegółowego formatu materializera.
- **Najważniejsze zastrzeżenie:** „jedno rozwiązanie” powinno oznaczać jedno źródło zachowania, jeden testowalny runtime i jeden bundle instalacyjny — nie jeden identyczny output filesystem dla czterech hostów.

