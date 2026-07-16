# Host contracts and install-time materialization

## TL;DR

Maister może być dystrybuowany jako **jeden pakiet z `install --target claude|codex|cursor|kiro-cli`**, ale hosty nie przyjmą jednego identycznego, już zmaterializowanego drzewa. Wspólny może być model workflow, katalog źródłowych skills, portable runtime/helpers, assets i neutralne metadane. Instalator musi natomiast wygenerować host-native manifest, layout, nazwy invocation, kontrakt agentów, hooki, MCP i ścieżki zasobów.

Najmniejsza stabilna granica to: **canonical behavior package + cienkie, wersjonowane host descriptors/materializers + atomowy installer**. Obecne buildy dowodzą wykonalności transformacji, lecz zawierają zbyt wiele globalnych `sed` i semantycznych wyjątków, aby po prostu przenieść je 1:1 do instalatora. Najpierw należy przenieść różnice do jawnego modelu capabilities i strukturalnych generatorów.

Runtime availability jest nierówna. Claude Code ma oficjalny non-interactive runtime (`claude -p`), ale w badanym środowisku nie jest on dostępny, więc dla tego hosta można uczciwie osiągnąć najwyżej E1–E4 zależnie od uruchomionych testów instalacji; E5/E6 pozostają `unverified`. Codex, Cursor i Kiro publikują ścieżki headless/non-interactive, lecz ich obecność w dokumentacji również nie jest dowodem wykonanego testu Maister.

## Key Decisions

- Traktować „jedno rozwiązanie” jako jedno canonical source i jeden dystrybuowany bundle, nie jeden identyczny installed tree.
- Materializować na etapie instalacji wyłącznie host binding: manifest/catalog, layout, invocation vocabulary, agent schema, hook schema/env, MCP placement i absolutyzację ścieżek.
- Zachować `orchestrator-state.yml` i executable helpers jako wspólny kontrakt continuation; natywne session-resume hosta traktować jako opcjonalny UX, nie source of truth Maister.
- Nie deklarować Claude runtime parity bez realnego `claude` E5/E6; oficjalna możliwość `claude -p` nie zastępuje dostępu do runtime, uwierzytelnienia i wykonanego scenariusza.

## Open Questions & Risks

- Cursor plugin contract jest bardzo świeży (plugin marketplace od Cursor 2.5, luty 2026; szeroki Customize/marketplace update w 3.9, czerwiec 2026) i może nadal szybko ewoluować.
- Kiro CLI i Kiro IDE mają obecnie różne agent formats (CLI JSON, IDE Markdown); `--target kiro-cli` musi być nazwany precyzyjnie, zamiast obiecywać abstrakcyjny target `kiro`.
- Install-time transforms zmniejszają liczbę commitowanych generated trees, ale przenoszą failure moment na maszynę użytkownika; wymagają schema validation, staging directory, atomic rename i rollback.
- Obecne textual substitutions ingerują w semantykę gate/delegation. Bez strukturalnego IR lub host-aware templates materializer będzie trudny do wersjonowania i audytu.

## Scope and evidence discipline

Źródła lokalne opisują Maister `2.2.1-fork.1`. Źródła internetowe są wyłącznie host-owned i zostały sprawdzone 2026-07-14. Poziomy dowodu: E0 dokument/intencja; E1 static/schema; E2 deterministic transform; E3 isolated executable contract; E4 install; E5 host CLI smoke; E6 host runtime E2E. Oficjalna dokumentacja hosta jest dowodem kontraktu, nie udanego uruchomienia Maister.

## Feature matrix

Legenda: **common** = może pochodzić bezpośrednio ze wspólnego pakietu; **adapter** = wymagany binding/materialization; **unsupported/unknown** = nie wolno emulować bez dowodu hosta.

| Powierzchnia | Claude Code | Codex | Cursor | Kiro CLI | Klasyfikacja |
|---|---|---|---|---|---|
| Discovery/layout | Plugin root z opcjonalnym `.claude-plugin/plugin.json`; domyślne `skills/`, `commands/`, `agents/`, `hooks/hooks.json`, `.mcp.json`; marketplace kopiuje do cache | Wymagany `.codex-plugin/plugin.json`; `skills/`, `hooks/`, `.mcp.json`; repo marketplace w `.agents/plugins/marketplace.json` | `.cursor-plugin/plugin.json`; plugin może bundle skills, subagents, MCP, hooks i rules; Maister instaluje do `~/.cursor/plugins/local/maister-cursor` | Brak jednego manifestu pluginu w obecnym wariancie; profil `$KIRO_HOME` z `agents/*.json`, `skills/*/SKILL.md`, `settings/mcp.json`, steering/hooks | **adapter** dla root/layout i catalog; payload skills/assets częściowo **common** |
| Manifest/catalog | `.claude-plugin/plugin.json`; `.claude-plugin/marketplace.json`; manifest może być pominięty przy default discovery, ale dystrybucja wymaga stabilnej identity/version | `.codex-plugin/plugin.json` jest wymagany; katalog `.agents/plugins/marketplace.json` ma inne `source` i policy | `.cursor-plugin/plugin.json` zawiera host-specific `skills`, `agents`, `hooks`; osobny `.cursor-plugin/marketplace.json` | Agent JSON pełni funkcję entry configuration; discovery przez `$KIRO_HOME`; brak zgodnego marketplace manifestu w repo | **adapter**, ale neutralne metadata name/version/author/repository są **common** |
| Skills/commands | `skills/<name>/SKILL.md`; legacy `commands/*.md`; plugin skill namespace `/plugin:skill` | `skills/<name>/SKILL.md`; Maister konwertuje source commands do skills; invocation `$maister:...` | Skills i commands jako plugin capabilities, lecz Maister scala commands do skills i zmienia `maister:` na `maister-` | Skills jako `skill://` resources i slash skills; Maister generuje krótkie shortcut skills oraz `maister-*` | Body workflow może być **common**; namespace, entrypoints, frontmatter i command collapse są **adapter** |
| Project instructions | Claude-native context, ale oficjalnie plugin-root `CLAUDE.md` nie jest ładowany jako plugin context | `AGENTS.md` hierarchicznie; build zamienia `CLAUDE.md`→`AGENTS.md` | CLI czyta `AGENTS.md` i `CLAUDE.md`; Maister emituje `.mdc` rules | CLI ładuje `AGENTS.md`, steering i skill resources; isolated profile może zmienić inheritance | Semantyka standardów **common**; delivery channel **adapter** |
| Agents/subagents | Plugin `agents/*.md`, Claude frontmatter i Task/subagent vocabulary | Native/custom subagents; standalone TOML w `~/.codex/agents/` lub `.codex/agents/`; plugin Maister obecnie nie kopiuje source agents i używa native delegation | Plugin subagents jako Markdown; Maister prefiksuje names, wprowadza `maister-explore`, `readonly` i `model: inherit` | CLI custom agents to JSON; `tools`, `allowedTools`, `resources`, hooks i `toolsSettings.subagent`; Maister konwertuje MD→JSON+instruction files | Prompty/role intent częściowo **common**; agent schema, tool names, trust, concurrency i invocation **adapter** |
| User gates/progress | `AskUserQuestion`/host interaction and Task APIs in canonical vocabulary | Plain-text user question + optional Goals/native planning; Maister persystuje fazy w state | `AskQuestion`; Cursor-specific plan/progress behavior | Chat gate; headless nie ma mid-session input; `todo` activity-tray mapping | State transition invariant **common**; presentation/tool binding **adapter**; interactive gate w headless może być **unsupported** bez policy |
| Hooks | PascalCase event schema, nested `hooks[]`, `${CLAUDE_PLUGIN_ROOT}` | Zbliżony event schema, `PLUGIN_ROOT`/`PLUGIN_DATA`; plugin hooks wymagają review/trust | `version:1`, camelCase events, `${CURSOR_PLUGIN_ROOT}`, inny response contract | Hooks inline w agent JSON; inne triggers/tool matchers i absolute install paths; brak `preCompact` w obecnym wsparciu Maister | Hook intent/script logic częściowo **common**; schema, env, matchers, output i dostępne events **adapter** |
| MCP | Plugin `.mcp.json` / manifest `mcpServers` | `.mcp.json` + manifest `mcpServers`; user controls trust/approval | Plugin MCP; lokalny install Maister dodaje `mcp.json` tylko opt-in | `settings/mcp.json` lub agent `mcpServers`; `includeMcpJson`; CLI może fail-fast `--require-mcp-startup` | Server definitions mogą mieć neutralny model; file placement/policy **adapter** |
| Continuation/resume | Oficjalnie `--continue`/`--resume <session-id>`; Maister state nadal niezależny | `codex exec`; natywne sesje są oddzielne od `orchestrator-state.yml`; utility `$maister:resume` odczytuje state | Headless `-p`; Maister `/maister-resume` odczytuje state | `--resume`, `--resume-id`; Maister `/resume` odczytuje state | `orchestrator-state.yml` + helpers **common**; native session continuation **adapter/optional** |
| Headless/runtime testability | Oficjalnie `claude -p`, plugin przez `--plugin-dir`; **runtime niedostępny w tym badaniu** | Oficjalnie `codex exec`; lokalny repo ma plugin install flow | Oficjalnie `cursor-agent -p`, `--force` dla writes | Oficjalnie `kiro-cli chat --no-interactive`, wymaga `KIRO_API_KEY`; brak mid-session input | CLI harness **adapter**; scenario/evidence model **common**; osiągnięty level zależy od dostępnego binary/auth |
| Install/update | Marketplace add/install/update, scoped user/project/local, version/cache; `/reload-plugins` | CLI marketplace add/list/upgrade/remove; install plugin i nowa sesja; repo/personal catalog | Marketplace `/add-plugin` lub local copy; team marketplace policies; lokalny Maister rebuild+copy | Obecny Maister kopiuje do isolated `$KIRO_HOME`, rewrites absolute paths, ustawia default agent/aliases; update = rebuild+reinstall | Jeden installer UX **common**; backend per host **adapter** |

## Findings

### Finding 1: identyczny installed tree jest sprzeczny z publicznymi kontraktami hostów

- Claim: Cztery hosty mają różne root markers i discovery contracts; wspólny katalog nie może równocześnie być natywnym pluginem bez host-specific files lub instalacyjnej transformacji.
- Evidence:
  - Local: `plugins/maister/.claude-plugin/plugin.json:1-9` — canonical manifest jest jawnie Claude-oriented.
  - Local: `plugins/maister-codex/.codex-plugin/plugin.json:1-22` — Codex wymaga innego marker directory i interface metadata.
  - Local: `plugins/maister-cursor/.cursor-plugin/plugin.json:1-16` — Cursor manifest wskazuje skills, agents i hooks.
  - Local: `plugins/maister-kiro/agents/maister.json:1-21` — Kiro entrypoint jest agent JSON z tool/resource policy, nie plugin manifest tego samego typu.
  - Official Claude: [Plugins reference](https://code.claude.com/docs/en/plugins-reference) (accessed 2026-07-14, version rolling/unknown) — default component roots i `.claude-plugin/plugin.json`; plugin-root `CLAUDE.md` nie jest ładowany jako plugin context.
  - Official Codex: [Build plugins](https://learn.chatgpt.com/docs/build-plugins) (accessed 2026-07-14, version rolling/unknown) — `.codex-plugin/plugin.json` jest required entry point, a `skills/`, `hooks/`, `.mcp.json` pozostają w plugin root.
  - Official Cursor: [Cursor 2.5 changelog](https://cursor.com/changelog/2-5) (accessed 2026-07-14, Cursor 2.5, 2026-02-17) — plugins bundle skills, subagents, MCP servers, hooks i rules.
  - Official Kiro CLI: [Agent configuration reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference/) (accessed 2026-07-14, current CLI docs; agent-create filename behavior v1.26.0+ noted elsewhere) — CLI agents are JSON in `.kiro/agents/` or `~/.kiro/agents/` with tools/resources/hooks/MCP fields.
- Evidence level: E1 for local shape; E0 for public contract.
- Confidence: high — niezależne manifesty i oficjalne layouts są jawne.
- Inference/limitation: Host może tolerować dodatkowe obce katalogi, ale to nie daje wspólnej identity, discovery ani update semantics.

### Finding 2: Agent Skills są najlepszą wspólną jednostką payload, lecz invocation nie jest wspólne

- Claim: Wszystkie hosty potrafią konsumować `SKILL.md`-like instruction packages, więc body, references, scripts i assets mogą być canonical; nazwy, namespaces, command wrappers, visibility i invocation syntax muszą pozostać bindingiem hosta.
- Evidence:
  - Local: `platforms/codex-cli/build.sh:135-170` — source skill jest kopiowany, frontmatter transformowany, a optional Codex `agents/openai.yaml` generowany.
  - Local: `platforms/codex-cli/build.sh:178-187` — Codex nie ma source command component w tym modelu; commands stają się skill entrypoints.
  - Local: `platforms/cursor/build.sh:50-63` — Cursor zmienia `maister:foo`→`maister-foo` w commands, skills i references.
  - Local: `platforms/kiro-cli/build.sh:43-91` — Kiro scala commands do skills i prefiksuje katalogi/names.
  - Official Codex: [Build skills](https://learn.chatgpt.com/docs/build-skills) (accessed 2026-07-14, version rolling/unknown) — skill to directory z required `SKILL.md` i optional scripts/references/assets; required `name` i `description`.
  - Official Claude: [Create plugins](https://code.claude.com/docs/en/plugins) (accessed 2026-07-14, Claude Code rolling; zip `--plugin-dir` requires v2.1.128+) — plugin skills use `skills/<name>/SKILL.md` and plugin-namespaced invocation.
  - Official Cursor: [Cursor 2.4 changelog](https://cursor.com/changelog/2-4) and [Cursor 2.5 changelog](https://cursor.com/changelog/2-5) (accessed 2026-07-14, Cursor 2.4/2.5) — Agent Skills and plugin packaging are native capabilities in editor and CLI.
  - Official Kiro: [Kiro IDE 0.9 changelog](https://kiro.dev/changelog/ide/0-9/) (accessed 2026-07-14, IDE 0.9) — Kiro imports portable Agent Skills packages; CLI agent config supports progressive `skill://.../SKILL.md` resources.
- Evidence level: E2 for current local materialization logic; E0/E1 for host contracts.
- Confidence: high for shared skill package shape, medium for byte-identical frontmatter portability.
- Inference/limitation: Common body does not imply common runtime semantics; tool names embedded in prose and gates still require structural binding.

### Finding 3: Agents, gates and hooks są semantyczną — nie tylko syntaktyczną — granicą adaptera

- Claim: Host bindings muszą modelować capabilities, ponieważ obecne adaptery zmieniają role agentów, user-gate mechanism, progress system, hook events i trust policy.
- Evidence:
  - Local: `platforms/codex-cli/build.sh:60-90` — transformuje AskUserQuestion, task/progress tools, plan mode, Skill/Task i agent-role vocabulary.
  - Local: `platforms/cursor/build.sh:65-101` — Cursor dodaje własny `maister-explore`, mapuje AskUserQuestion→AskQuestion, usuwa plan-mode references i usuwa default MCP.
  - Local: `platforms/kiro-cli/build.sh:94-120` — Kiro przepisuje mandatory user questions na chat gates i headless defaults.
  - Local: `platforms/kiro-cli/build.sh:245-300` — Kiro mapuje Explore i Task/Skill na `subagent` i slash skills.
  - Local: `plugins/maister/hooks/hooks.json:1-38`, `platforms/cursor/hooks/hooks.json:1-58`, `platforms/codex-cli/hooks/hooks.json:1-41`, `plugins/maister-kiro/agents/maister.json:22-60` — cztery różne hook envelopes, event names, root env/path conventions i matchers.
  - Official Codex: [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) (accessed 2026-07-14, version rolling/unknown) — custom agents są standalone TOML w `~/.codex/agents/` lub `.codex/agents/`; concurrency/depth są host config.
  - Official Codex: [Hooks](https://learn.chatgpt.com/docs/hooks) (accessed 2026-07-14, version rolling/unknown) — plugin hooks use `PLUGIN_ROOT`/`PLUGIN_DATA`, current definition requires review/trust, and events/matchers are host-defined.
  - Official Kiro CLI: [Agent configuration reference](https://kiro.dev/docs/cli/custom-agents/configuration-reference/) (accessed 2026-07-14, current docs) — hooks are inline agent fields with Kiro internal tool matcher names and agent-level tool/MCP policy.
- Evidence level: E2 for transforms, E1 for generated hook/config shape.
- Confidence: high — różnice są bezpośrednio zakodowane i potwierdzone przez host docs.
- Inference/limitation: Część scripts (np. destructive command policy) może być wspólna, ale tylko po zdefiniowaniu neutralnego input/output contract i host wrappers.

### Finding 4: MCP jest wspólną capability, lecz placement i security policy są platformowe

- Claim: Definicję serwera MCP można utrzymywać jako neutralne dane, ale installer musi wygenerować host-specific path/manifest wiring i respektować trust/governance.
- Evidence:
  - Local: `platforms/cursor/build.sh:99-101` oraz `platforms/cursor/smoke-install.sh:58-66` — MCP jest usuwany z default build i dodawany opt-in jako `mcp.json`.
  - Local: `platforms/codex-cli/smoke-install.sh:30-43` — installer materializuje `.mcp.json` i dodaje/usuwa `mcpServers` w Codex manifest.
  - Local: `platforms/kiro-cli/build.sh:582-587` i `platforms/kiro-cli/smoke-install.sh:265-272` — Kiro przenosi config do `settings/mcp.json`, a install bez opt-in usuwa config i `includeMcpJson`.
  - Official Claude: [MCP](https://code.claude.com/docs/en/mcp) and [Plugins reference](https://code.claude.com/docs/en/plugins-reference) (accessed 2026-07-14, version rolling/unknown) — plugins can bundle MCP config via `.mcp.json`/manifest.
  - Official Codex: [Build plugins](https://learn.chatgpt.com/docs/build-plugins) (accessed 2026-07-14, version rolling/unknown) — plugin `.mcp.json`, `mcpServers`, plus plugin-scoped approval/enable policy.
  - Official Cursor: [Cursor 3.9 changelog](https://cursor.com/changelog) (accessed 2026-07-14, Cursor 3.9, 2026-06-29) — team marketplaces distribute MCP across cloud agents, Agents window, IDE and CLI.
  - Official Kiro: [Configuration](https://kiro.dev/docs/cli/chat/configuration/) (accessed 2026-07-14, page updated 2026-05-27) — MCP priority is Agent > Project > Global and files live at global/workspace paths.
- Evidence level: E2 local materialization; E0/E1 official contract.
- Confidence: high.
- Inference/limitation: Secrets/auth must never be baked into common artifact; installer should only wire declarative server identity and leave credentials to host-native flow.

### Finding 5: wspólny continuation contract jest możliwy niezależnie od natywnej sesji hosta

- Claim: `orchestrator-state.yml` i deterministic helpers mogą pozostać host-independent; natywne session resume differs and should not be required for correctness.
- Evidence:
  - Local: `platforms/codex-cli/build.sh:189-218` — Codex utility resume odczytuje state i ponownie wywołuje właściwy workflow.
  - Local: `docs/kiro-cli-support.md:137-145` — Kiro `/resume` traktuje `orchestrator-state.yml` jako source of truth.
  - Local: `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml:6-18` — host continuation status jest jawnie różny: Codex supported; Claude/Cursor/Kiro unsupported w tej macierzy.
  - Official Claude: [Run programmatically](https://code.claude.com/docs/en/headless) (accessed 2026-07-14, Claude Code rolling) — `--continue` i `--resume <session-id>` są host session features.
  - Official Kiro: [CLI commands](https://kiro.dev/docs/cli/reference/cli-commands/) (accessed 2026-07-14, page updated 2026-06) — `--resume`, `--resume-id` i session listing są native CLI features.
  - Official Codex: [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) (accessed 2026-07-14, version rolling/unknown) — automation entrypoint is `codex exec`; it has its own session persistence semantics.
- Evidence level: E3 for portable helpers only when their contract tests run (covered by another gatherer); E0/E1 here for host/session contracts.
- Confidence: high for architectural separation, medium for full cross-host continuation parity.
- Inference/limitation: State portability does not guarantee a host will rehydrate identical conversational context; workflow must reconstruct needed context from durable artifacts.

### Finding 6: jeden bundle + `--target` jest wykonalny, ale installer staje się kompilatorem i transaction boundary

- Claim: Aktualne build/install flows pokazują wszystkie potrzebne kroki do target selection, lecz bezpieczna wersja musi materializować do staging, validate against selected host contract, then atomically install/rollback.
- Evidence:
  - Local: `platforms/cursor/build.sh:18-48` — build kopiuje canonical tree i generuje Cursor manifest.
  - Local: `platforms/codex-cli/build.sh:15-42` — build tworzy nowy Codex root/manifest zamiast kopiować identyczny plugin.
  - Local: `platforms/kiro-cli/generate-agent-json.sh:75-139` — Kiro generator strukturalnie tworzy JSON agent + instruction file.
  - Local: `platforms/cursor/smoke-install.sh:49-63` — Cursor build+replace-copy to local discovery path.
  - Local: `platforms/codex-cli/smoke-install.sh:99-124` — Codex build, marketplace registration, install path resolution i post-install MCP patch.
  - Local: `platforms/kiro-cli/smoke-install.sh:49-120` — Kiro rewrites hook/resource/prompt paths at install time; `platforms/kiro-cli/smoke-install.sh:105-120` replaces isolated profile.
  - Official Claude: [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) (accessed 2026-07-14, version rolling/unknown) — installed plugins are copied to versioned cache and cannot rely on files outside plugin directory; update is marketplace/version driven.
  - Official Codex: [Build plugins](https://learn.chatgpt.com/docs/build-plugins) (accessed 2026-07-14, version rolling/unknown) — CLI supports marketplace add/list/upgrade/remove and repo/personal catalogs.
  - Official Cursor: [Cursor 2.5 changelog](https://cursor.com/changelog/2-5) and [Cursor 3.9 changelog](https://cursor.com/changelog) (accessed 2026-07-14) — marketplace install and team distribution are native paths.
  - Official Kiro: [Settings](https://kiro.dev/docs/cli/reference/settings/) (accessed 2026-07-14, page updated 2026-06-05) — `KIRO_HOME` overrides discovery root for agents, skills, steering, settings and sessions.
- Evidence level: E2 for generation mechanics; E4 only for install scripts when their tests are actually run (not claimed here).
- Confidence: high for feasibility, medium for migration cost and long-term stability.
- Inference/limitation: Shipping source+materializer is not automatically simpler if transforms remain global regexes. Simplicity comes from deleting committed generated variants and replacing regexes with typed target descriptors/templates.

### Finding 7: runtime availability must be recorded per host and per run

- Claim: Public headless support exists for all four hosts, but evidence level depends on local binary, credentials, version and actual execution; Claude E5/E6 cannot be claimed in this research environment.
- Evidence:
  - Local: `.maister/tasks/research/2026-07-14-platform-independent-plugin/planning/research-brief.md:5-7` — problem statement says Claude runtime is unavailable for E2E.
  - Local: `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml:7-18` — only Codex fully-automatic continuation is declared supported; other host scenarios are unsupported.
  - Official Claude: [Run Claude Code programmatically](https://code.claude.com/docs/en/headless) (accessed 2026-07-14, Claude Code rolling; v2.1.128 mentioned for stdin/archive-related behavior) — `claude -p`, plugin loading and structured stream init exist.
  - Official Codex: [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) (accessed 2026-07-14, version rolling/unknown) — `codex exec` is supported for scripts/CI with explicit sandbox.
  - Official Cursor: [Headless CLI](https://docs.cursor.com/en/cli/headless) (accessed 2026-07-14, version unknown) — `cursor-agent -p`; writes require `--force`.
  - Official Kiro: [Headless mode](https://kiro.dev/docs/cli/headless/) (accessed 2026-07-14, page updated 2026-06-04) — `--no-interactive`, `KIRO_API_KEY`, no mid-session input, optional `--require-mcp-startup`.
- Evidence level: E0 for supported contract; achieved E5/E6 is `unverified` in this finding.
- Confidence: high.
- Inference/limitation: „Brak runtime Claude” jest ograniczeniem środowiska projektu, nie brakiem produktu Anthropic. Można budować static/contract/install assurance, ale nie nazywać go runtime parity.

## Unavoidable differences vs install-time materialization

### Różnice nieusuwalne

1. Marker/manifest/catalog i host namespace.
2. Tool and agent invocation vocabulary, available built-ins, concurrency/depth and trust model.
3. User-interaction API oraz zachowanie w non-interactive mode.
4. Hook event names, nesting, matcher names, environment variables, output/permission semantics i brakujące events.
5. MCP discovery/security/governance and credential flow.
6. Native session continuation, install scopes/cache/update and marketplace governance.

### Różnice właściwe do materializacji przy instalacji

1. Wybranie target descriptor i capability version range.
2. Wygenerowanie manifestu/catalog entry i final layout.
3. Utworzenie host-native skill entrypoints z canonical skill bodies.
4. Wygenerowanie agent MD/TOML/JSON z neutralnych role definitions; dla Codex można świadomie użyć native roles zamiast materializować wszystkich agentów.
5. Wygenerowanie hook config i cienkich wrappers do wspólnych scripts.
6. Przeniesienie MCP definitions do właściwego pliku i włączenie tylko jawnie wybranych optional capabilities.
7. Rozwiązanie `${PLUGIN_ROOT}`/`$KIRO_HOME`, absolutyzacja wymaganych resource paths i validation, że wszystkie paths pozostają w install root.
8. Wygenerowanie host-specific help, invocation examples i utility entrypoints.

### Czego nie przenosić do install-time regexów

- Globalnych substitutions typu `AskUserQuestion`→tekst, `Task tool`→inny tekst, plan-mode removal i headless defaults. To są decyzje semantyczne, które powinny pochodzić z jawnego bindingu/capability IR.
- Host detection na podstawie przypadkowych env vars bez explicit `--target`; installer powinien przyjmować target jawnie, a autodetection tylko potwierdzać lub zgłaszać konflikt.
- Secretów MCP i policy bypass; te pozostają host/user managed.

## Proposed single-package contract

```text
maister-dist/
  package.json|manifest-neutral.json
  core/
    skills/
    runtime/
    references/
    assets/
  bindings/
    claude/
    codex/
    cursor/
    kiro-cli/
  installer/
    maister install --target <host> [--scope ...] [--with-mcp ...]
    maister verify --target <host> --install-root <path>
```

Minimalny installer contract:

1. `--target` jest wymagany lub jednoznacznie autodetected i potwierdzony.
2. Target descriptor deklaruje supported host versions/capabilities; unknown version = warning lub fail zgodnie z policy.
3. Materialization odbywa się do pustego staging dir.
4. Validator sprawdza manifest/schema, referential integrity, brak obcych absolute paths, hook executable bits i target-specific forbidden vocabulary.
5. Installer tworzy backup/receipt z source version, target, host version, enabled options i hashes.
6. Commit to install root następuje przez atomic rename, a failure przywraca poprzedni receipt/tree.
7. Update powtarza ten sam deterministic compile; uninstall usuwa wyłącznie files z receipt.

## Recommendation to synthesizer

Preferowany wariant to **wspólny behavior/runtime core + cienkie host bindings materializowane przez jeden installer**. Jeden przenośny bundle jest realistyczny, natomiast „zero adapterów” nie jest. Największą redukcję złożoności da usunięcie commitowanych `plugins/maister-{cursor,codex,kiro}` po osiągnięciu deterministic install-time generation i golden/contract coverage, nie samo przeniesienie istniejących build scripts do komendy install.

Kolejność migracji sugerowana przez te dowody:

1. Ustabilizować neutralny inventory/IR dla skills, roles, gates, hooks i MCP.
2. Przepisać obecne regex transforms jako typed emitters per target; zachować golden outputs przejściowo.
3. Zbudować `install --target` ze staging/receipt/rollback i parity against existing generated trees.
4. Dopiero po parity usunąć committed variants; zostawić bindings i fixtures.
5. Uruchamiać wspólny core contract suite raz, target validators dla każdego hosta, E5/E6 tylko tam, gdzie binary/auth są dostępne. Claude pozostaje jawnie `runtime-unverified` do czasu wykonania rzeczywistego `claude -p` scenario.

## Decision and risk handoff

### Decisions

- One distributed package with explicit `--target` is plausible and recommended.
- Installed host trees must remain different; the target adapter surface is unavoidable.
- Install-time materialization should be structural/typed and transactional, not a relocation of broad textual substitutions.
- `orchestrator-state.yml` is the portable continuation source of truth; native session resume is supplementary.
- Claude runtime parity remains unverified until a real Claude Code CLI run is available.

### Risks

- Fast-moving host plugin contracts, especially Cursor and Kiro, can invalidate descriptors.
- Semantic drift can hide inside prose/tool-name transforms even when generated layouts validate.
- Install-time compilation can leave broken user state without staging, receipts and rollback.
- Kiro CLI absolute resource-path workaround and CLI/IDE agent-format split require target/version-specific handling.
- Marketplace update semantics differ; a common installer may coexist with native marketplaces rather than replace them.
