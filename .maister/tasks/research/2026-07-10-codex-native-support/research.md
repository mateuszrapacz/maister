# Research: natywne wsparcie Codex dla Maister

**Data:** 2026-07-10  
**Zakres:** Codex CLI + Codex IDE extension  
**Pytanie:** Czy wariant Maister powinien używać natywnych pluginów, skills, subagentów, hooków i konfiguracji Codex zamiast emulować model Cursor/Kiro? Jakie są ograniczenia i jak wybierane są modele?

## TL;DR

Natywne rozwiązania Codex mają sens jako podstawa dystrybucji, ale nie zapewniają pełnej zgodności strukturalnej z Maister. Rekomendacja to **native-first z cienką warstwą transformacji**:

1. Dystrybuować wariant jako natywny plugin Codex: `.codex-plugin/plugin.json`, `skills/`, `hooks/hooks.json`, `.mcp.json` oraz marketplace.
2. Przekształcić publiczne `commands/` w skills, ponieważ manifest pluginu Codex nie definiuje komponentu commands.
3. Użyć natywnego delegowania subagentów, ale nie próbować umieszczać Claude/Cursor-owych `agents/*.md` w pluginie. Custom agenty Codex są osobnymi plikami `.codex/agents/*.toml` lub `~/.codex/agents/*.toml`.
4. Zachować `orchestrator-state.yml` jako źródło prawdy dla faz i resume. Codex Goals/Plan mogą być dodatkowymi elementami UX, ale nie zastępują obecnego grafu faz.
5. Nie pinować modelu głównego w pluginie. Domyślnie subagenty powinny dziedziczyć model i reasoning effort sesji; dedykowane role z własnymi modelami powinny być opcjonalnym, osobnym profilem Codex.
6. Hooki Codex są użyteczne jako defense-in-depth, ale sandbox i approval policy muszą pozostać główną granicą bezpieczeństwa.

## Najważniejsze ustalenia

### 1. Plugin Codex pasuje do modelu dystrybucji Maister

Plugin Codex wymaga `.codex-plugin/plugin.json` i może wskazywać `skills/`, MCP, aplikacje oraz hooki. `skills/`, `hooks/`, `.mcp.json` i `.app.json` pozostają w katalogu głównym pluginu; tylko `plugin.json` znajduje się w `.codex-plugin/`. [Build plugins — Plugin structure](https://learn.chatgpt.com/docs/build-plugins#plugin-structure)

Codex CLI ma natywne zarządzanie marketplace: można dodać lokalne lub gitowe źródło przez `codex plugin marketplace add`, a następnie zainstalować plugin przez `codex plugin add`. Aktualny CLI w środowisku ma wersję `codex-cli 0.144.1` i udostępnia te komendy. Marketplace repozytorium używa `.agents/plugins/marketplace.json`. [Build plugins — Marketplace metadata](https://learn.chatgpt.com/docs/build-plugins#marketplace-metadata)

Wniosek: `plugins/maister-codex/` jako generowany artefakt jest zgodny z natywnym sposobem instalacji Codex, ale instalacja nie powinna kopiować wzorca `--plugin-dir` z Cursor. Należy oprzeć smoke test na lokalnym marketplace i `codex plugin add`.

### 2. Skills są właściwym komponentem workflow

Codex ładuje metadane skillu w celu odkrywania, a pełny `SKILL.md` dopiero po wybraniu skillu. Skill musi mieć `name` i `description`; może zawierać `scripts/`, `references/`, `assets/` oraz opcjonalne `agents/openai.yaml`. Skill może być wywołany jawnie przez `$skill-name` lub wybrany implicit na podstawie opisu. [Build skills](https://learn.chatgpt.com/docs/build-skills)

`agents/openai.yaml` służy do metadanych interfejsu, polityki wywołania i zależności narzędziowych; nie jest odpowiednikiem custom agenta z obecnego `plugins/maister/agents/`.

Wniosek dla builda:

- `maister:development` musi zostać przekształcone do kebab-case, np. `maister-development`;
- cienkie `commands/*.md` należy scalić z publicznymi skillami lub wygenerować jako skillowe entrypointy;
- wewnętrzne skills powinny mieć `agents/openai.yaml` z `allow_implicit_invocation: false`, aby nie zaśmiecać selektora workflow;
- odwołania `Skill tool` należy przepisać na natywne wywołanie/ładowanie skills Codex, a nie pozostawiać jako instrukcję Claude.

### 3. Subagenty natywne są użyteczne, ale custom role nie są elementem pluginu

Codex ma wbudowane agenty `default`, `worker` i `explorer`. Custom agenty są definiowane jako osobne pliki TOML w `~/.codex/agents/` albo `.codex/agents/` i muszą zawierać `name`, `description` oraz `developer_instructions`. Dokumentacja zaznacza, że ten format może ewoluować i jest cięższy niż dedykowany manifest agenta. [Codex subagents — Custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents)

Natywne delegowanie może być uruchamiane bezpośrednią instrukcją lub przez instrukcje projektu/skillu. Domyślne limity to `agents.max_threads = 6` i `agents.max_depth = 1`; głębsza rekurencja zwiększa koszt, opóźnienie i ryzyko niekontrolowanego fan-outu. Subagenty dziedziczą sandbox sesji, a custom agent może nadpisać m.in. model, reasoning effort, sandbox, MCP i konfigurację skills. [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

Wniosek: nie należy traktować `plugins/maister-codex/agents/` jako automatycznie działającego odpowiednika `plugins/maister-cursor/agents/`. Dla pluginu-only MVP należy użyć wbudowanych ról i natywnego delegowania, a instrukcje ról przechowywać w skillach/references. Jeśli wymagana będzie pełna zgodność 27 wyspecjalizowanych ról, potrzebny będzie dodatkowy, jawnie opt-in bootstrap do `.codex/agents/*.toml`; to jest osobny kanał instalacji i osobna decyzja bezpieczeństwa.

### 4. Wybór modeli jest kontrolowany przez hosta, a nie przez plugin

Model głównego agenta można wybrać w UI przez `/model`, przy uruchomieniu CLI przez `--model`/`-m` albo w `config.toml` przez `model`. Jeśli model nie jest ustawiony, Codex wybiera rekomendowany setup zależny od aktualnej oferty i kontekstu. Oficjalna dokumentacja opisuje bieżącą rodzinę GPT-5.6 jako Sol (największa jakość), Terra (balans) i Luna (szybkość/koszt), ale nie należy kodować tych nazw jako trwałego kontraktu pluginu. [Codex models](https://learn.chatgpt.com/docs/models)

Reasoning effort można zmieniać w UI/CLI config; wyższy poziom zwiększa czas i zużycie tokenów. Dokumentacja rekomenduje zaczynać od ustawienia domyślnego i podnosić je dla trudniejszej analizy. [Codex models](https://learn.chatgpt.com/docs/models)

Dla custom agentów `model` i `model_reasoning_effort` są opcjonalne. Gdy nie są podane, agent dziedziczy wartości rodzica. Dokumentacja podaje jako przykładowy wzorzec szybszy model dla eksploracji, mocniejszy model z wysokim reasoningiem dla review i model mini dla prostych zadań; są to profile konfiguracji, a nie zachowanie wymuszane przez plugin. [Codex subagents — Custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents#custom-agents)

Wniosek dla Maister:

- workflow nie powinien wymuszać konkretnego modelu głównego;
- natywne subagenty powinny domyślnie dziedziczyć model/effort sesji;
- rekomendacje typu `explorer = szybciej`, `reviewer = dokładniej` można opisać w dokumentacji;
- pinowanie modeli można dodać wyłącznie w opcjonalnych `.codex/agents/*.toml`, ponieważ plugin nie ma natywnego pola modelu w manifeście.

### 5. Plan, goals i progress nie są prostym zamiennikiem TaskCreate/TaskUpdate

Codex posiada `/plan`, `/goal` oraz app-serverowe metody dla goal i plan. Goal jest trwałym, wysokopoziomowym celem sesji; dokumentacja opisuje go jako kontrakt obejmujący outcome, kryteria sukcesu, ograniczenia, granice i warunek zatrzymania. [Using Goals in Codex](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex#how-to-write-a-goal)

W aktualnym CLI `goals` są oznaczone jako stable, natomiast w wygenerowanym schemacie app-servera plan streaming jest opisany jako experimental. Nie ma udokumentowanego pluginowego odpowiednika grafu zadań `TaskCreate`/`TaskUpdate` z zależnościami między fazami.

Wniosek: `orchestrator-state.yml` nadal powinien być źródłem prawdy dla faz, resume, decyzji i artefaktów. Codex Goal można ustawiać jako skrót celu workflow, ale nie powinien sterować stanem Maister. Native `/plan` nie powinien zastępować planu zapisywanego w artefakcie.

### 6. Ustrukturyzowane pytania użytkownika są ograniczone

App server dokumentuje `tool/requestUserInput`, ale jest to metoda oznaczona jako experimental. Lokalny `codex features list` dla wersji `0.144.1` pokazuje `default_mode_request_user_input` jako `under development` i wyłączone. [Codex App Server — API overview](https://learn.chatgpt.com/docs/app-server#api-overview)

Wniosek: obowiązkowe bramki Maister powinny używać zwykłego komunikatu tekstowego i oczekiwania na odpowiedź użytkownika. Nie należy uzależniać działania pluginu CLI/IDE od eksperymentalnego, strukturalnego request-user-input. Jeśli kiedyś Maister będzie miał własnego klienta app-server, może dodać adapter do tej metody.

### 7. Hooki są natywne, lecz wymagają zaufania i nie są pełną barierą

Codex obsługuje hooki z pluginu, domyślnie z `hooks/hooks.json`, oraz zdarzenia m.in. `PreToolUse`, `PermissionRequest`, `PostToolUse`, `PreCompact`, `PostCompact`, `SessionStart`, `SubagentStart`, `SubagentStop`, `UserPromptSubmit` i `Stop`. Plugin może używać `PLUGIN_ROOT` oraz `PLUGIN_DATA`; zmiennych Claude są utrzymywane dla kompatybilności. [Codex hooks — Plugin-bundled hooks](https://learn.chatgpt.com/docs/hooks#plugin-bundled-hooks)

Nowe lub zmienione hooki pluginu wymagają review/trust; instalacja pluginu nie oznacza automatycznego zaufania. Hooki command są obecnie obsługiwane, a handlery typu prompt/agent są parsowane, ale pomijane. Wszystkie pasujące command hooki mogą być uruchamiane równolegle. [Codex hooks](https://learn.chatgpt.com/docs/hooks)

`PreToolUse` może blokować Bash, `apply_patch` i MCP, ale dokumentacja zaznacza, że nie przechwytuje wszystkich ścieżek shell/unified-exec oraz nie obejmuje WebSearch i innych narzędzi spoza obsługiwanej grupy. [Codex hooks — PreToolUse](https://learn.chatgpt.com/docs/hooks#pretooluse)

Wniosek:

- przenieść hooki Maister do schematu Codex i użyć `PLUGIN_ROOT`;
- destructive-command hook traktować jako dodatkową ochronę;
- sandbox/approval policy pozostawić główną granicą bezpieczeństwa;
- smoke test musi obejmować trust hooków, a nie tylko obecność pliku JSON.

### 8. Sandbox i approval są ustawieniami sesji/projektu

Codex rozdziela `sandbox_mode` (`read-only`, `workspace-write`, `danger-full-access`) i `approval_policy` (`untrusted`, `on-request`, `never`). Subagenty dziedziczą sandbox sesji. Project-local `.codex/` layers są ładowane tylko dla zaufanych projektów. [Sandbox](https://learn.chatgpt.com/docs/sandboxing#configure-defaults), [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference#configtoml)

Wniosek: plugin nie powinien po cichu ustawiać `danger-full-access` ani `approval_policy = never`. README i smoke testy muszą jawnie opisywać wymagane ustawienia dla headless workflow, a build powinien pozostać neutralny względem polityki użytkownika.

## Rekomendacja architektoniczna

### Native-first z transformacją semantyczną

Wariant Codex powinien być natywnym pluginem, ale build nie może być mechaniczną kopią drzewa Claude:

| Obszar Maister | Wariant Codex |
|---|---|
| `plugins/maister/` | nadal source of truth |
| `commands/` | publiczne skills/entrypointy |
| `agents/*.md` | instrukcje ról w skills/references; opcjonalnie osobne `.codex/agents/*.toml` |
| `Task` | natywne delegowanie subagentów; limity Codex respektowane |
| `Skill tool` | `$skill-name`/ładowanie native skill |
| `AskUserQuestion` | tekstowa bramka; nie eksperymentalny requestUserInput |
| `TaskCreate`/`TaskUpdate` | `orchestrator-state.yml`; Goal tylko jako opcjonalny cel wysokiego poziomu |
| `EnterPlanMode`/`ExitPlanMode` | własny artifact planu + opcjonalny `/plan`, bez uzależnienia od niego |
| `CLAUDE.md` | `AGENTS.md` i native project guidance |
| `.mcp.json` | root `.mcp.json` wskazywany przez manifest |
| hooki Claude | `hooks/hooks.json` z Codex event schema i `PLUGIN_ROOT` |
| model agenta | host/user config; brak twardego pina w pluginie |

### Co powinno być poza MVP

- automatyczne instalowanie 27 custom agentów do `.codex/agents/`;
- wymuszanie konkretnych modeli lub reasoning effort;
- użycie app-server API jako warstwy wykonawczej pluginu;
- zależność od eksperymentalnych structured user-input lub plan-streaming;
- obchodzenie sandbox/approval przez hooki.

## Ryzyka do rozstrzygnięcia podczas grillowania

1. Czy akceptujemy funkcjonalną, a nie strukturalną zgodność agentów w MVP?
2. Czy później potrzebny będzie osobny opt-in bootstrap generujący `.codex/agents/*.toml`?
3. Czy domyślna polityka modeli ma być „dziedzicz model sesji”, czy dokumentowane profile ról?
4. Jakie smoke testy wymagają zalogowanego Codex i zaufania hooków?

## Źródła i weryfikacja lokalna

- Oficjalna dokumentacja OpenAI/Codex: linki przy poszczególnych tezach powyżej.
- Lokalna wersja CLI: `codex-cli 0.144.1`.
- Lokalna weryfikacja feature flags: `codex features list` — `plugins`, `multi_agent`, `hooks`, `goals`, `unified_exec` są oznaczone jako stable; `default_mode_request_user_input` jest oznaczone jako under development i wyłączone.
- Lokalna weryfikacja CLI: `codex --help`, `codex plugin --help`, `codex exec --help`, `codex app-server --help`.
