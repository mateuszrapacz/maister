# Pi subagents jako natywny runtime agentów Maister

## TL;DR
Zainstalowane `pi-subagents` 0.35.1 udostępnia właściwy, publiczny i wersjonowany punkt integracji: `pi-subagents/delegation` v1; próba na faktycznie uruchamianym Pi 0.80.10 zakończyła się natywnym wykonaniem agenta `researcher` i dokładnie obserwowalną tożsamością.
Kontrakt wystarcza jako wąski adapter wykonawczy dla `dispatchAgent`, wraz z progressem, anulowaniem, limitami i terminalnym wynikiem, ale nie zastępuje `resolveAgent` ani trwałego `readExecutionEventStream`.
Maister powinien nadal rozwiązywać rolę z własnego manifestu/projekcji i zapisywać własny haszowany event stream, mapując procesowe zdarzenia Pi `started/update/response` na istniejący kontrakt.
Nie należy opierać rozwiązania na niewyeksportowanym `src/extension/rpc.ts`, wewnętrznych katalogach async ani na wywołaniu narzędzia przez model rodzica.

## Key Decisions

- **Rekomendacja, wysoka pewność:** użyć wyłącznie eksportu `pi-subagents/delegation` v1 do foreground dispatch; jest przeznaczony dla integracji extension-to-extension i działa na zainstalowanym środowisku.
- **Rekomendacja, wysoka pewność:** zachować `resolveAgent` oraz `readExecutionEventStream` po stronie Maister; publiczny kontrakt Pi nie oferuje ani deterministycznego resolvera, ani trwałego replayu zdarzeń.
- **Rekomendacja, wysoka pewność:** wymagać zgodności terminalnego `response.agent` z `plan.native_role_external_id`; brak lub rozbieżność ma dawać `unavailable`/`failed`, nigdy sukces.
- **Rekomendacja, wysoka pewność:** nie używać parent-facing `subagent(...)` jako API adaptera. Negatywna próba narzędzia zwróciła `isError: false`, podczas gdy publiczny kontrakt delegation zwrócił jednoznaczne `status: "failed"`.
- **Rekomendacja, średnia pewność:** traktować `pi-subagents/background-work` wyłącznie jako pomocniczy, procesowy rejestr aktywnej pracy, nie jako źródło statusu, historii lub wznowienia wykonania Maister.

## Open Questions / Risks

- Uruchamiany plik `pi` raportuje 0.80.10, lecz kopia `@earendil-works/pi-coding-agent` w `/Users/mrapacz/.pi/agent/npm/node_modules` ma 0.79.10. Próby użyły binarki 0.80.10 i rozszerzenia 0.35.1 z katalogu użytkownika; instalator musi wiązać evidence z faktycznie rozwiązaną binarką, nie z przypadkową kopią pakietu.
- Publiczne foreground delegation nie ma API listowania agentów, utrwalonego event logu, odczytu po restarcie ani wznowienia tego samego wykonania. Te własności muszą pozostać w Maister albo być jawnie oznaczone jako niedostępne.
- `response.agent` jest dokładną obserwacją wykonanej nazwy, ale pojawia się dopiero po uruchomieniu dziecka. Preflight istnienia tożsamości nie jest publiczną funkcją pakietu.
- Zdarzenia update mogą zawierać argumenty narzędzi, ścieżki output/session i fragmenty wyniku. Adapter musi stosować limity oraz sanitizację przed trwałym zapisem.
- Próba zwróciła `status: completed` przy `acceptance.status: rejected, explicit: false`; ogólny status rozszerzenia nie może zastępować własnej polityki akceptacji Maister.
- Opublikowany npm package nie zawiera katalogu `test/`, mimo że `package.json` deklaruje skrypty testowe; ocena zachowania tej konkretnej instalacji opiera się na source + probes, nie na uruchomieniu upstream test suite.

## Zakres i wersje

**Fakt, wysoka pewność.** Empiryczny runtime:

- `pi` resolves to `/Users/mrapacz/.local/share/mise/installs/node/25.9.0/bin/pi` and reports `0.80.10`.
- Node reports `v25.9.0`.
- `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/package.json` reports `pi-subagents` `0.35.1`, exports `.`, `./delegation`, and `./background-work`, and declares Pi peer dependencies as optional wildcards. Its exact dev dependencies are 0.80.10.
- `/Users/mrapacz/.pi/agent/npm/node_modules/@earendil-works/pi-coding-agent/package.json` reports `0.79.10`; this is not the version reported by the resolved executable.
- Maister evidence was inspected at commit `debc79d65549de63f5edf0be75ee7d007fa6bd9c`; the worktree was already dirty, including unrelated task artifacts. No production source was changed by this gatherer.

**Source:** installed `pi-subagents` 0.35.1 `package.json`; installed coding-agent package metadata; empirical `rtk which pi`, `rtk pi --version`, `rtk node --version`; Maister `rtk git rev-parse HEAD` and `rtk git status --short` (2026-07-19).

## Publiczna powierzchnia `pi-subagents`

### `pi-subagents/delegation` — właściwa granica adaptera

**Fakt, wysoka pewność.** `src/api/delegation.ts:1-9` definiuje protokół v1 i pięć zdarzeń: request, started, update, response i cancel. Request ma obowiązkowe `requestId`, `agent`, `task`, `context`, `cwd` oraz opcjonalne `model`, timeout, turn/tool budget, skill, output, acceptance i artifacts (`src/api/delegation.ts:76-92`). Update może ujawnić bieżące narzędzie, ograniczone ostatnie wyjście, model, liczniki, czas i tokeny (`:99-109`). Terminalne statusy są zamkniętą unią obejmującą m.in. completed, failed, timed_out, cancelled, interrupted, budget exhaustion, acceptance_failed, invalid_request i unavailable_context (`:111-121`). Response może zwrócić `runId`, `agent`, model, exit code, output/outputPath, sessionFile oraz metryki (`:139-156`).

**Fakt, wysoka pewność.** Adapter wewnętrzny wymusza `async: false`, `foregroundOnly: true`, `clarify: false` (`src/slash/delegation-adapters.ts:337-355`), a terminalny response bierze obserwowaną nazwę z wyniku dziecka i mapuje ją do `agent` (`:392-422`). Nie jest to nowy launcher: README, sekcja **Extension delegation API**, mówi, że używa tego samego executora co narzędzie subagent i nazywa ten eksport kanonicznym kontraktem dla nowych integracji.

**Fakt, wysoka pewność.** Bridge utrzymuje `AbortController` per request, odrzuca kradzież aktywnego requestId, zwraca `unavailable_context` bez aktywnego kontekstu, emituje started przed wykonaniem i update w trakcie, a cancel abortuje kolejkę lub aktywną pracę (`src/slash/prompt-template-bridge.ts:46-221`).

### `pi-subagents/background-work` — tylko procesowy snapshot

**Fakt, wysoka pewność.** Publiczny eksport v1 przechowuje providerów pod `Symbol.for("pi-subagents.background-work.v1")` w `globalThis`, więc jest rejestrem procesowym (`src/api/background-work.ts:1-2,37-61`). Provider udostępnia tylko `name`, `listActiveWork`, opcjonalne wake channels i reconcile; item ma wyłącznie `id` i `sessionId` (`:11-35`). `snapshotBackgroundWork` filtruje elementy do jednego dokładnego sessionId, ale nie zwraca lifecycle, wyniku, błędu, agenta ani eventów (`:153-197`).

**Wniosek, wysoka pewność.** Ten eksport pomaga Pi utrzymać headless session przy życiu, ale nie implementuje `readExecutionEventStream` i nie jest trwałym rejestrem do resume.

### Wewnętrzne powierzchnie, których nie używać

**Fakt, wysoka pewność.** `src/extension/rpc.ts` deklaruje RPC v1 z `ping/status/spawn/interrupt/stop`, jednak `package.json` go nie eksportuje. Publiczny `./delegation` jest foreground-only, a wewnętrzny RPC jest async-only. Katalogi async zapisują `status.json`, `events.jsonl`, outputy i session metadata, lecz ich format i lokalizacja należą do implementacji pakietu.

**Rekomendacja, wysoka pewność.** Nie importować deep paths i nie czytać bezpośrednio `.pi-subagents/async`/temp result dirs. Takie zależności obchodziłyby exports, wiązały Maister z prywatnym schematem i mieszały stan użytkownika ze stanem workflow.

## Discovery agentów i tożsamość

**Fakt, wysoka pewność.** Descriptor jest rekurencyjnie ładowanym Markdownem z frontmatter; brak `name` lub `description` powoduje pominięcie pliku, a runtime name powstaje z lokalnej nazwy i opcjonalnej nazwy pakietu (`src/agents/agents.ts:1208-1234`). Parser odczytuje m.in. tools, model/fallbacks, thinking, context, async, timeout, budget, acceptance, extensions, output i memory (`:1235-1355`).

**Fakt, wysoka pewność.** `discoverAgents(cwd, scope)` scala builtin, package, user i project descriptors, stosuje ustawienia/override'y i usuwa disabled entries (`src/agents/agents.ts:1419-1488`). Dokładna precedencja jest zaimplementowana w `mergeAgentsForScope`, ale ta funkcja i `discoverAgents` nie są częścią publicznych exports package.

**Wniosek, wysoka pewność.** `resolveAgent` Maister nie powinien próbować odtwarzać discovery Pi. Powinien rozwiązać logiczną rolę do kontrolowanego `native_role_external_id` z projekcji/receiptu, a dispatch przekazać tę nazwę do Pi. Terminalny `response.agent` jest niezależną obserwacją wymaganą do exact-native assertion.

## Empirical Evidence Ledger

Wszystkie próby wykonano z aktywnym mechanizmem uwierzytelnienia tylko do odczytu, z `--no-session`, bez ujawniania kluczy, tokenów ani treści istniejących sesji. Pi settings i zainstalowane package files nie zostały zmienione. Workdir: `/tmp/maister-pi-subagents-probe.B83yov` (macOS raportował kanonicznie `/private/tmp/...`). Po zebraniu wyników tymczasowy katalog przeniesiono do systemowego Kosza (operacja odzyskiwalna); nie pozostał aktywnym katalogiem roboczym.

### P1 — natywny foreground przez parent-facing tool

- **Hipoteza:** Pi 0.80.10 uruchomi dziecko przez zainstalowane `pi-subagents` 0.35.1.
- **UTC:** `2026-07-19T12:33:00Z`.
- **Sanitized command:** `rtk pi --no-session --no-extensions --extension /Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/index.ts --no-skills --no-prompt-templates --no-context-files --no-builtin-tools --tools subagent --print '<prompt: one researcher, fresh context, timeoutMs=60000, maxTurns=2, exact output NATIVE_PROBE_OK>'`.
- **Trail/result:** parent reported `status=completed`, `runId=b1649196`, `agent=researcher`, output `NATIVE_PROBE_OK`; model and child exit code were not exposed by the parent's summary.
- **Process exit:** 0; wall time ~20.4 s.
- **Conclusion:** native child launch works. Parent-model mediation loses determinism/fields and is not the recommended adapter. **Confidence: high.**

### P2 — public delegation v1: pełny sukces i event trail

- **Hipoteza:** extension-to-extension contract can provide bounded dispatch, progress and exact identity without asking the parent model to choose/call the tool.
- **UTC:** `2026-07-19T12:38:58Z`.
- **Sanitized command:** `rtk pi --no-session --no-extensions --extension /Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/index.ts --extension <temp>/success-api-probe.ts --no-skills --no-prompt-templates --no-context-files --no-tools --print 'Reply exactly PARENT_DONE.'`.
- **Request:** v1, requestId `maister-success-probe-v1`, agent `researcher`, fresh context, temp cwd, timeout 60 s, maxTurns 2, task exact-output `NATIVE_API_OK`.
- **Observable trail:** one `started`; seven `update` events showing effective model, counters, one `write` to the isolated output artifact, then recent output; one terminal `response`.
- **Terminal response:** `status=completed`, `runId=1b25ec38`, `childIndex=0`, `agent=researcher`, `model=openai-codex/gpt-5.6-luna:medium`, `exitCode=0`, `output=NATIVE_API_OK`, `turns=2`, `toolCount=1`, `durationMs=8142`, `tokens=3950`; output/session paths were under temp locations. Acceptance was `rejected, explicit=false` while execution completed.
- **Process exit:** 0; wall time ~12.9 s.
- **Conclusion:** the public v1 API is sufficient for deterministic exact-native foreground dispatch and live observation. The event trail is not itself durable/replayable. **Confidence: high.**

### P3 — nieznany agent

- **UTC:** tool probe `2026-07-19T12:33:34Z`; public API probe `2026-07-19T12:38:23Z`.
- **Tool command:** same isolated Pi flags as P1, asking once for `agent=definitely-not-an-agent`.
- **Tool outcome:** text `Unknown agent: definitely-not-an-agent`, `details={mode:"single",results:[]}`, but `isError=false`; parent process exited 0.
- **Public API command:** same flags as P2 with `<temp>/unknown-api-probe.ts`, request v1 for the unknown identity.
- **Public outcome:** `response={version:1, requestId:"maister-unknown-agent-probe-v1", status:"failed", error:"Unknown agent: definitely-not-an-agent"}`; no child identity/run id; parent process exited 0.
- **Conclusion:** process exit cannot classify dispatch. Public delegation provides the typed terminal outcome needed by Maister; the conversational tool result does not. **Confidence: high.**

### P4 — cancellation

- **UTC:** `2026-07-19T12:35:14Z`.
- **Sanitized command:** same isolated Pi flags as P2 with `<temp>/cancel-probe.ts`; driver emitted v1 cancel immediately before the matching request.
- **Outcome:** `response={version:1, requestId:"maister-cancel-probe-v1", status:"cancelled"}`; forbidden child task did not start; parent output `PARENT_DONE`; process exit 0 in ~3.9 s.
- **Conclusion:** pending cancellation is correlated by exact requestId and terminally typed. Active cancellation is also implemented with the same AbortController path, but was not separately forced against a live mutating child. **Confidence: high for queued cancel; medium for live process termination semantics.**

### P5 — background-work provider

- **UTC:** `2026-07-19T12:35:48Z`.
- **Sanitized command:** `rtk /Users/mrapacz/.pi/agent/npm/node_modules/jiti/lib/jiti-cli.mjs <temp>/background-probe.mjs`.
- **Outcome:** protocol 1 snapshot included only `{provider:"maister-probe", id:"owned", sessionId:"session-a"}` and filtered a foreign session item; after disposer, providers/items were empty. Process exit 0.
- **Conclusion:** provider registry is correctly session-scoped and disposable, but intentionally contains no execution history or results. **Confidence: high.**

## Macierz względem portu runtime Maister

| Port / wymaganie | Pi 0.80.10 + `pi-subagents` 0.35.1 | Ocena | Zalecana odpowiedzialność |
|---|---|---|---|
| `resolveAgent` — logiczna rola → exact plan | Brak publicznego resolvera/list API; discovery jest prywatne i wieloźródłowe | Luka | Maister manifest + projection + receipt; Pi name jako `native_role_external_id` |
| Preflight host/version | `pi --version` i extension package metadata dostępne poza API | Dostępne | Adapter preflight wiąże resolved executable + exact package version |
| Enforce cwd/context/model | Request v1 ma cwd, fresh/fork, model; strict parser | Dostępne | Mapować bezpośrednio z plan/task, fail closed na unsupported policy |
| Timeout / turn / tool budget | Pola request v1; osobne terminalne statusy | Dostępne | Mapować, ale nie używać count budgets dla mutujących childów bez polityki |
| Natywna tożsamość | Terminal `response.agent`; empirycznie `researcher` | Dostępne po dispatch | Porównać dokładnie z `plan.native_role_external_id` |
| `dispatchAgent` wynik | status, error, runId, model, exitCode, output, paths, metryki | Dostępne | Wąski adapter event-bus → terminal observation |
| Anulowanie | Correlated cancel v1; queued cancel verified | Dostępne | Adapter przechowuje requestId/abort ownership |
| Live progress | started/update events z model/tool/output/metrykami | Dostępne procesowo | Sanitizować i appendować do event writer Maister |
| Trwały `readExecutionEventStream` | Brak publicznego replay/read API dla foreground | Niedostępne | Wyłącznie canonical Maister event stream |
| Resume/reconnect po restarcie | Brak dla publicznego foreground contract | Niedostępne | Odczyt historyczny z Maister; retry jako nowy dispatch, nie fałszywy resume |
| Background status | Prywatny async engine bogaty; publiczny background-work tylko active ids | Niewystarczające | Nie deep-importować; osobna przyszła capability, jeśli upstream ją opublikuje |
| Typed unknown identity | Public response `failed`; tool path nie ustawia `isError` | Dostępne tylko przez API | Używać delegation v1, nie parent tool |
| Evidence integrity | Pi events bez digest chain | Luka | Existing Maister append-before-side-effect + hash-chained JSONL |

## Najmniejsza granica adaptera

**Rekomendacja, wysoka pewność.** Pi target powinien dodać jeden cienki host adapter uruchamiany jako Pi extension, bez własnego subagent executora:

1. Maister `resolveAgent` wykonuje obecne kontrole manifestu, projekcji, receipt, host/version i polityki, produkując plan z `native_role_external_id` równym wygenerowanej nazwie Pi.
2. Przed `emit(request)` runtime trwale zapisuje własne zdarzenie dispatch-requested przez istniejący event writer; jeśli zapis się nie uda, nie wolno uruchomić dziecka.
3. Adapter tworzy unikalny `requestId = dispatch_id`, subskrybuje response przed emisją request i wysyła strict v1 request do `SUBAGENT_DELEGATION_REQUEST_EVENT`.
4. `started` i `update` są mapowane na ograniczone, zsanityzowane zdarzenia Maister. Raw session transcript ani nieograniczone args/output nie trafiają do evidence.
5. Terminal `response` jest mapowany do observation: completed → candidate succeeded; wszystkie pozostałe statusy → typed failed/unavailable według polityki. `response.agent` musi istnieć i być byte-exact równe planowanej tożsamości przed sukcesem.
6. Maister zapisuje terminalne zdarzenie i zwraca obecny dispatch terminal. `readExecutionEventStream` czyta tylko plik Maister, niezależnie od życia procesu Pi.
7. Przy cancellation emitowane jest v1 cancel z tym samym requestId; wynik cancellation jest również zapisywany w strumieniu Maister.

To rozwiązanie reużywa natywne discovery, child process, tool/model policy, progres i cancellation z `pi-subagents`, a zarazem zachowuje deterministyczną tożsamość, provenance i resumable evidence po stronie Maister.

## API stability assessment

- **Public delegation: medium-high stability.** Jest jawnie wyeksportowane, wersjonowane jako protocol 1, nazwane kanonicznym kontraktem dla nowych integracji i dodane w 0.35.0; 0.35.1 nie zmieniło tego API. Nadal jest świeże (dodane 2026-07-17), więc installer powinien wymagać minimum 0.35.0 i dokładnie rejestrować tested version 0.35.1.
- **Public background-work: medium-high stability for its narrow purpose.** Również wersjonowane i eksportowane od 0.35.0, lecz jego cel nie obejmuje dispatch history.
- **Parent tool schema: medium stability, wrong boundary.** Bogate i działające, ale model-mediated, UI-oriented i mniej jednoznaczne błędy nie spełniają exact adapter contract.
- **Internal RPC/async files: low stability for external use.** Mimo własnego protocol version nie są package exports; deep import lub direct filesystem coupling należy uznać za unsupported.

## Gaps requiring implementation tests

1. Test adaptera: response bez `agent`, z innym `agent`, duplicate requestId i brak terminal response muszą fail closed.
2. Test orderingu: durable dispatch event musi istnieć przed `emit`; terminal/result nie może wyprzedzić started w canonical stream.
3. Test sanitization/limits dla `currentToolArgs`, recentOutput, sessionFile/outputPath i warnings.
4. Test cancellation aktywnego read-only childa oraz zachowania, gdy Pi process zginie między started a response.
5. Version matrix: resolved Pi executable 0.80.10 + extension 0.35.1 jako verified baseline; osobny negatywny przypadek dla znalezionej, ale nieuruchamianej kopii coding-agent 0.79.10.
6. Test, że brak publicznego delegation export lub niezgodna protocol version daje typed `unavailable`, bez inline fallback do rodzica.

## Sources

- Installed package: `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/package.json`, `pi-subagents` 0.35.1 — package exports, Pi manifest, dependency policy.
- Installed API: `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/src/api/delegation.ts:1-158` — v1 request/events/status/response.
- Installed bridge: `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/src/slash/prompt-template-bridge.ts:46-221` — ownership, active context, start/update/response/cancel.
- Installed mapping: `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/src/slash/delegation-adapters.ts:337-422` — foreground enforcement and terminal projection including identity.
- Installed discovery: `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/src/agents/agents.ts:1208-1355,1419-1488` — descriptor parsing and source merge.
- Installed background API: `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/src/api/background-work.ts:1-197` — process registry and exact-session snapshot.
- Installed docs: `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/README.md`, sections **Extension delegation API**, **Background-work provider API**, **Status and control actions**.
- Installed changelog: `/Users/mrapacz/.pi/agent/npm/node_modules/pi-subagents/CHANGELOG.md`, releases 0.35.1 and 0.35.0 — addition/stability chronology.
- Maister runtime: `plugins/maister/skills/orchestrator-framework/bin/agent-runtime/agent-resolver.mjs`, exported `resolveAgent`; `dispatch-agent.mjs`, exported `dispatchAgent`; `execution-event-writer.mjs`, exported `readExecutionEventStream`, at commit `debc79d65549de63f5edf0be75ee7d007fa6bd9c`.
- Empirical probes P1-P5, executed 2026-07-19 in isolated temp workdir; sanitized commands and outcomes recorded above. No external web source was necessary because installed exact-version source plus reproducible runtime behavior answered the category questions.
