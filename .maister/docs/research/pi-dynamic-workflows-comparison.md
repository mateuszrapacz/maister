# Research: Maister a `pi-dynamic-workflows`

## Podsumowanie

Oba projekty rozwiązują problem orkiestracji wielu agentów, równoległego wykonania, kontroli jakości i wznowienia pracy, lecz na innych poziomach. **Maister** jest przenośnym, audytowalnym systemem SDLC z kanonicznym zbiorem ról, deterministyczną projekcją na hosty i fail-closed exact-native runtime; **pi-dynamic-workflows (PDW)** jest natomiast produktywnym, ściśle związanym z Pi silnikiem dynamicznych skryptów JavaScript, TUI i zarządzania sesjami.

Mogą bezpiecznie działać na tym samym komputerze jako **oddzielne systemy**. Dziś nie ma jednak wspólnego oficjalnie obsługiwanego hosta: PDW działa na Pi, a baseline Maister wspiera Codex, Cursor i Kiro CLI. Istniejący projekt wsparcia Pi dla Maister zakłada osobny, generowany pakiet oraz publiczny bridge `pi-subagents/delegation`; po jego wdrożeniu oba pakiety mogą współistnieć w Pi, ale nie powinny współzarządzać jednym workflow. Nie należy podłączać PDW jako nieformalnego runtime'u ról Maister: arbitralne definicje `.pi/agents`, fallback modeli/tożsamości i miękkie zachowanie izolacji łamią semantykę kanonicznej projekcji i exact-native Maister.

**Ogólna pewność: wysoka (0,89).** Analiza opiera się na lokalnym źródle Maister oraz źródle i wydaniu `v3.2.0` PDW. Nie wykonano instalacji ani testu obu systemów na jednym rzeczywistym profilu użytkownika.

## Zakres i wersje

- Maister: lokalny checkout `/Users/mrapacz/Workspace/maister`; dokumentacja deklaruje baseline `v2.2.1` ([README lokalny, linie 1–18](/Users/mrapacz/Workspace/maister/README.md), [roadmap, linie 1–15](/Users/mrapacz/Workspace/maister/.maister/docs/project/roadmap.md)).
- PDW: `@quintinshaw/pi-dynamic-workflows` `3.2.0`, Pi `>=0.80.8`; analizowany commit to pełny SHA `f8c20d738dfd9180f41b0599f7fdcab0605b2979`, wskazywany przez tag [v3.2.0](https://github.com/QuintinShaw/pi-dynamic-workflows/releases/tag/v3.2.0) ([package.json](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/f8c20d738dfd9180f41b0599f7fdcab0605b2979/package.json#L1-L72)).
- Projektowany target Pi dla Maister: `.maister/tasks/research/2026-07-19-pi-support/outputs/research-report.md`. Raport potwierdza wykonalność koegzystencji pakietów, ale zaznacza, że Pi pozostaje niewspierane do czasu wdrożenia overlay, projekcji, instalatora, bridge'a i evidence E1–E6.
- Badanie było wyłącznie odczytowe względem obu repozytoriów. Jedynym utworzonym plikiem jest niniejszy raport w wymaganym katalogu artefaktów.

## 1. Nakładające się cele i mechanizmy

1. **Orkiestracja z fan-out/fan-in i specjalizowanymi agentami — wysoka pewność.** Maister deleguje do zamkniętego zestawu 28 ról i prowadzi wykonanie przez trzyoperacyjny port runtime (`resolveAgent`, `dispatchAgent`, `readExecutionEventStream`) ([architecture, linie 9–27](/Users/mrapacz/Workspace/maister/.maister/docs/project/architecture.md)). PDW udostępnia `agent()`, `parallel()`, `pipeline()` i `phase()` oraz limity współbieżności/łącznej liczby agentów ([README, linie 37–75](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/README.md#L37-L75), [config.ts, linie 1–18](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/config.ts#L1-L18)).

2. **Wznawialność i trwały dziennik — wysoka pewność.** Maister zapisuje prywatny, hash-chain JSONL dla dispatchy oraz oddziela stan instalatora od stanu workflow ([architecture, linie 21–32 i 43–48](/Users/mrapacz/Workspace/maister/.maister/docs/project/architecture.md)). PDW utrwala cały stan runu i journal wyników agentów, stosuje zapis `tmp + rename`, kopię `.bak` oraz lease per run ([run-persistence.ts, linie 14–112 i 199–310](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/run-persistence.ts#L14-L112)).

3. **Deterministyczność — wysoka pewność, ale inna definicja.** Maister wiąże źródło roli, projekcję, manifest i drzewo docelowe digestami i receiptami ([architecture, linie 9–15](/Users/mrapacz/Workspace/maister/.maister/docs/project/architecture.md)). PDW zamraża rejestr agentów na run, blokuje `Date.now()`, `Math.random()` i bezargumentowy `Date` w VM, a cache identyfikuje po pozycji wywołania i hashu ([workflow.ts, linie 87–110 i 231–294](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/workflow.ts#L87-L110), [README, sekcja Determinism](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/README.md#determinism-and-limits)).

4. **Gates, review i structured output — wysoka pewność.** Maister ma read-only Advisor/Arbiter, zamknięty YAML i eskalację przy niepewności ([advisor.md, linie 1–37](/Users/mrapacz/Workspace/maister/plugins/maister/agents/advisor.md)). PDW oferuje `checkpoint()`, `verify()`, `judgePanel()`, schemat JSON i bounded repair ([README, linie 119–148](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/README.md#L119-L148), [agent.ts, linie 47–130](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/agent.ts#L47-L130)).

5. **Kontrola kosztu i zasobów — wysoka pewność.** Oba ograniczają wykonanie; PDW ma jawne limity run/phase/agent, model tiers, timeouty, retry oraz realne tokeny/koszt ([workflow.ts, linie 112–225](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/workflow.ts#L112-L225)). Maister wymusza limity/closed schemas na granicach ownera i bounded capture, choć dokumentacja nie pokazuje równie bogatego interfejsu budżetowego ([README lokalny, sekcja „Agent-gate owner v1”, linie ok. 186–270](/Users/mrapacz/Workspace/maister/README.md)).

## 2. Elementy komplementarne

| Element PDW | Uzupełnienie dla Maister | Ocena |
| --- | --- | --- |
| TUI, panel postępu, `workflow_control` i background delivery | Maister ma mocny runtime/evidence, ale dokumentacja nie opisuje porównywalnego operator-facing run navigatora. | Wysoka wartość UX; wysoka pewność. [extension](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/extensions/workflow.ts#L20-L96) |
| Jawny DSL `parallel/pipeline/phase`, quality helpers i saved workflows | Może stanowić przenośną warstwę planowania nad canonical role IDs, bez zmiany dispatch contract. | Wysoka wartość; średnio-wysoki koszt. [README](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/README.md#runtime-reference) |
| Budżety tokenów i faz, routing model tiers, realny koszt | Uzupełnia audyt o kontrolę ekonomiczną i przewidywalność kosztu. W Maister polityka modelu musi pozostać explicit i capability-verified. | Wysoka wartość; średni koszt. [workflow-settings.ts](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/workflow-settings.ts#L10-L52) |
| Worktree per agent | Przydatne dla równoległych executorów, jeśli zostanie zmienione na fail-closed i receipt/event-owned. | Średnia wartość; średni koszt. [worktree.ts](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/worktree.ts#L1-L76) |
| Structured output z bounded repair | Wartość dla zwykłych ról wykonawczych; nie powinno rozluźniać zamkniętych kontraktów gate/owner. | Średnia wartość; niski–średni koszt. [agent.ts](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/agent.ts#L47-L130) |
| Auto-resume po provider usage limit | Użyteczne jako scheduler nad trwałym stanem Maister, pod warunkiem jawnego evidence/capability i limitu prób. | Średnia wartość; średni koszt. [v2.14.0](https://github.com/QuintinShaw/pi-dynamic-workflows/releases/tag/v2.14.0) |

Odwrotnie, Maister uzupełnia PDW o: wieloplatformową projekcję, transakcyjną instalację/rollback, receipts i immutable provenance, E1–E6 oraz fail-closed potwierdzenie obserwowanej tożsamości native role. PDW nie deklaruje odpowiednika tych granic; jego zakres to pojedynczy host Pi ([vision, linie 1–12](/Users/mrapacz/Workspace/maister/.maister/docs/project/vision.md), [package.json, linie 34–58](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/package.json#L34-L58)).

## 3. Konkretne konflikty

### 3.1 Semantyczne i runtime

1. **[KRYTYCZNY przy bezpośredniej integracji] Tożsamość roli: zamknięta projekcja kontra arbitralny rejestr.** Maister uznaje tylko dokładne `maister:<role>` i odrzuca alias, fuzzy/default fallback; role pochodzą z jednego kanonicznego źródła ([README lokalny, „Agent projections and dispatch”](/Users/mrapacz/Workspace/maister/README.md), [architecture, linie 9–15](/Users/mrapacz/Workspace/maister/.maister/docs/project/architecture.md)). PDW skanuje projektowe i użytkowe Markdowny, projekt wygrywa kolizję, błędne pliki są pomijane, a nieznany `agentType` kończy jako default tools/model z ostrzeżeniem ([agent-registry.ts, linie 1–24 i 109–191](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/agent-registry.ts#L1-L24), [workflow.ts, linie 392–405](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/workflow.ts#L392-L405)). To umożliwia shadowing i wykonanie bez potwierdzonej canonical identity.

2. **[KRYTYCZNY przy bezpośredniej integracji] Fallback model/runtime.** Maister wymaga explicit capability inspection, uwierzytelnienia, dozwolonej wersji/modelu/reasoning i nie ma fallbacku na root/inline/alternate host ([architecture, linie 17–27](/Users/mrapacz/Workspace/maister/.maister/docs/project/architecture.md)). PDW przy braku tier config wraca do modelu sesji, a nierozpoznany model tylko ostrzega i używa defaultu ([agent.ts, linie 147–191 i 499–531](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/agent.ts#L147-L191)). To jest sprzeczne z exact-native i dowodzeniem effective policy.

3. **[WYSOKI] Izolacja worktree jest fail-open.** Jeżeli PDW nie może utworzyć worktree, agent działa w współdzielonym checkoutcie; README kodu wprost nazywa to „logged no-op”, a wyników nie scala automatycznie ([worktree.ts, linie 1–12 i 46–66](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/worktree.ts#L1-L12)). Dla workflow zapisujących kod grozi to kolizją równoległych writerów. W Maister analogiczny brak wymaganej capability powinien dać typed unavailable/blocked, nie kontynuację.

4. **[WYSOKI] Inny kontrakt wznowienia.** PDW replayuje najdłuższy niezmieniony prefiks według pozycyjnego call index/hash; wstawienie wcześniejszego calla unieważnia dalszy cache ([README, Determinism](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/README.md#determinism-and-limits)). Maister wiąże dispatch z logical role, digestem źródła i hash-chain event stream. Pozycyjny journal jest dobrym cache'em UX, lecz niewystarczającym kluczem audytowym i nie powinien zastąpić dispatch ID/provenance.

5. **[WYSOKI] VM PDW nie jest granicą bezpieczeństwa.** Kod sam stwierdza, że wstrzyknięte funkcje bridge pozwalają obejść guard przez konstruktor i że VM chroni tylko przed przypadkową niedeterministycznością ([workflow.ts, linie 247–260](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/workflow.ts#L247-L260)). Maister nie powinien wykonywać generowanego JavaScript jako zaufanego elementu owner/runtime bez osobnej granicy procesu i walidowanego IR.

6. **[ŚREDNI] Gates mają inną władzę.** `checkpoint()` PDW w headless domyślnie przyjmuje `default`/`true`, chyba że jawnie ustawiono `headless: "abort"` ([workflow.ts, linie 211–225](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/workflow.ts#L211-L225)). Advisor Maister ma eskalować przy niepewności i nie może sam aprobować poza polityką ([advisor.md, linie 10–37](/Users/mrapacz/Workspace/maister/plugins/maister/agents/advisor.md)). Bez mapowania polityk headless-default może ominąć fail-closed gate.

7. **[ŚREDNI] Powiązanie z prywatnym API Pi.** PDW sięga do prywatnego pola `ModelRegistry.runtime` i tylko ostrzega, gdy kontrakt znika ([agent.ts, linie 300–324](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/agent.ts#L300-L324)). Historia wydań pokazuje realną podatność na zmiany hosta (`v2.14.2` ModelRuntime API; `v3.1.0` usunięcie custom-editor po crashu OMP) ([v2.14.2](https://github.com/QuintinShaw/pi-dynamic-workflows/releases/tag/v2.14.2), [v3.1.0](https://github.com/QuintinShaw/pi-dynamic-workflows/releases/tag/v3.1.0)). Maister wymaga wersjonowanego bridge i odnowienia E5/E6.

### 3.2 Instalacyjne i konfiguracyjne

1. **Brak bezpośredniej kolizji docelowych hostów — wysoka pewność.** PDW instaluje się przez `pi install npm:...`, deklaruje wyłącznie rozszerzenie Pi i peer dependencies Pi ([README, linie 22–34](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/README.md#L22-L34), [package.json, linie 34–58](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/package.json#L34-L58)). Maister obsługuje Codex, Cursor i Kiro CLI, nie Pi ([vision, linie 1–12](/Users/mrapacz/Workspace/maister/.maister/docs/project/vision.md)).

2. **Stan jest rozłączny.** PDW zapisuje pod `~/.pi/workflows`, z namespacem projektu, oraz czyta legacy `.pi/workflows` ([workflow-paths.ts, linie 1–56](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/workflow-paths.ts#L1-L56)). Maister trzyma receipts/journals/backups pod `$XDG_STATE_HOME/maister/<target>` i zarządza tylko receipt inventory/settings keys ([architecture, linie 29–48](/Users/mrapacz/Workspace/maister/.maister/docs/project/architecture.md)).

3. **[ŚREDNI] Wspólne repo może dostać niezarządzane artefakty PDW.** Worktrees PDW powstają w `<repo>/.pi/worktrees`, a legacy stan może być czytany z `.pi/workflows` ([worktree.ts, linie 43–66](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/worktree.ts#L43-L66)). Nie koliduje to z receipt-owned plikami Maister, ale może uczynić checkout „dirty” i spowodować prawidłowe odrzucenie go przez produkcyjny installer/parity Maister. Przed instalacją z `local:` trzeba usunąć/odizolować nieśledzone artefakty lub użyć czystego checkoutu; **nie** używać `MAISTER_ALLOW_DIRTY_LOCAL=1` jako obejścia produkcyjnego ([README lokalny, instalacja](/Users/mrapacz/Workspace/maister/README.md)).

4. **[ŚREDNI] Polityka uprawnień/prywatności jest słabsza w PDW.** PDW utrwala pełne prompty, wyniki, compact history, opcjonalnie pełne sesje, a katalogi tworzy standardowym `mkdirSync({recursive:true})`, bez widocznego wymuszenia `0700/0600` ([run-persistence.ts, linie 14–75 i 173–203](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/run-persistence.ts#L14-L75), [workflow-settings.ts, linie 29–40](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/workflow-settings.ts#L29-L40)). Maister jawnie wymaga prywatnego state root. Na wspólnym hoście należy ustawić restrykcyjny `umask`/ACL i świadomie wyłączyć `persistAgentSessions`, jeśli treść jest wrażliwa.

5. **[NISKI] Nazwy komend i trigger słowa nie kolidują obecnie z Maister, bo hosty są różne.** Gdyby powstał adapter Pi dla Maister, `/workflows`, `workflow_control` i automatyczny trigger PDW musiałyby zostać namespacowane; od 3.0 trigger jedynie autoryzuje narzędzie, ale nadal ingeruje w decyzję routingu ([v3.0.0](https://github.com/QuintinShaw/pi-dynamic-workflows/releases/tag/v3.0.0)).

## 4. Czy i jak mogą działać razem na tych samych hostach

### Wspólny komputer: tak

Rekomendowany układ:

```text
Pi                         Codex / Cursor / Kiro CLI
└─ PDW 3.2.0               └─ Maister 2.2.1
   ~/.pi/workflows/           $XDG_STATE_HOME/maister/<target>/
   Pi sessions                receipt-owned target projection
```

Warunki:

1. Instalować i aktualizować każdy projekt jego własnym mechanizmem; nie kopiować agentów między katalogami ręcznie.
2. Do instalacji Maister z lokalnego źródła używać czystego checkoutu i pełnego SHA. Nie uruchamiać PDW worktree workflow w tym checkoutcie w trakcie lifecycle Maister.
3. Nie wskazywać `.pi/agents/*.md` jako kanonicznych ról Maister i nie uznawać run JSON PDW za receipt/evidence Maister.
4. Ograniczyć współbieżne write-workflows do różnych checkoutów; szczególnie nie polegać na fail-open worktree PDW.
5. Trzymać osobne polityki credentials/model. PDW dziedziczy Pi runtime; Maister bridge ma jawnie posiadać credentials/version discovery i przejść E5/E6.

### Ten sam proces/host runtime: docelowo tak jako dwa pakiety, nie jako jeden runtime

Maister nie obsługuje jeszcze Pi jako targetu. Istniejący projekt wsparcia Pi przewiduje osobny pakiet Maister pod `~/.pi/agent/maister/**`, jedną zarządzaną pozycję `packages` oraz operator-owned `pi-subagents`; PDW pozostawałby drugim, niezależnym pakietem i własnością operatora. To daje zgodną ścieżkę współinstalacji bez kopiowania kodu PDW do Maister.

Na wspólnym Pi należy jednak utrzymać jednego właściciela danego runu:

1. workflow Maister deleguje wyłącznie przez swój exact-native bridge i własny event stream;
2. workflow PDW używa własnego managera, journalu i `workflow_control`;
3. nie zagnieżdżać jednego orkiestratora w drugim ani nie uznawać agentów/runów PDW za evidence Maister;
4. ograniczyć łączną współbieżność i nie uruchamiać dwóch writerów na tym samym checkoutcie;
5. wyłączyć lub zmienić keyword trigger PDW podczas jawnych workflow Maister, aby uniknąć niejednoznacznego routingu.

Bez overlay + bridge + exact identity observations + E5/E6 PDW nie jest zgodnym runtime'em Maister. Teoretycznie PDW może być zewnętrznym klientem owner CLI Maister, ale obecne `agent()` tworzy własne sesje Pi i nie zapewnia obserwowanej native identity; nie daje to skrótu wobec planowanego `pi.native` bridge.

**Pewność: wysoka (0,93)** dla koegzystencji na komputerze; **średnio-wysoka (0,82)** dla przyszłej współinstalacji w Pi według istniejącego projektu; **niska** dla bezpośredniego zagnieżdżania runtime'ów.

## 5. Co warto przenieść do Maister

### Priorytety według wartości i kosztu

| Priorytet | Element | Wartość | Koszt | Jak przenieść bez naruszenia architektury |
| ---: | --- | ---: | ---: | --- |
| 1 | Run-control API + background status/pause/stop/resume | bardzo wysoka | średni | Neutralny, wersjonowany port nad trwałym stanem Maister; żadnego Pi API w core. Każda akcja jako event audytowy. |
| 2 | Budżety run/phase/agent i realne usage/cost | wysoka | średni | Dodać do zamkniętej policy/observation; brak danych oznacza `unavailable`, nie zero. Budżet zamrażać przy starcie i przenosić przy resume, jak poprawka PDW v3.2.0. |
| 3 | Przenośne combinatory fan-out/fan-in/verify | wysoka | średnio-wysoki | Najpierw zamknięty deklaratywny IR, potem target adapters. `agent` przyjmuje tylko `maister:<role>`; nie wykonywać arbitralnego JS w ownerze. |
| 4 | Widok postępu/TUI | wysoka | średni na host | Budować jako read-only projekcję event stream. Host overlays renderują natywnie; core nie zależy od TUI konkretnego hosta. |
| 5 | Structured result helper z bounded repair | średnia | niski–średni | Tylko dla kontraktów, które dopuszczają repair; po naprawie ponowna walidacja i zapis obu prób. Gate/owner pozostają strict. |
| 6 | Worktree isolation | średnia | średni | `required`/fail-closed, canonical realpath, owner receipt/event, brak fallbacku do shared tree; cleanup i recovery jawne. |
| 7 | Biblioteka quality patterns i built-in research/review | średnia | średni | Definiować jako workflows składające kanoniczne role, nie jako nowe shadow-prompts/agent registry. |
| 8 | Auto-resume po quota reset | średnia | średni | Typed provider-limit event, bounded backoff/attempts, capability check, jawny opt-out i zachowanie start-time policy. |
| 9 | Shared key-value store między agentami | niska–średnia | średni | Dopiero przy potwierdzonym use-case; append/event-backed, bounded i namespaced. Obecnie YAGNI względem mocniejszego event stream. |

### Czego nie przenosić

- **Arbitralnego JavaScript VM jako kanonicznego workflow runtime'u.** Nie jest sandboxem bezpieczeństwa i utrudnia reprodukowalny, zamknięty IR.
- **Rejestru `.pi/agents` z project-wins shadowing i silent skip.** Sprzeczne z jedynym canonical ownerem 28 ról.
- **Fallbacków nieznanej roli/modelu/runtime'u.** Exact-native musi fail-closed.
- **Fail-open worktree.** Brak izolacji ma blokować workflow, jeśli izolacja była wymagana.
- **Pozycyjnego call-index jako głównej tożsamości audytowej.** Można użyć jako pomocniczego cache hint, nigdy zamiast dispatch ID, role digest i event hash chain.
- **Pi-specific TUI/editor/session internals w common core.** Historia v2.14.2/v3.1.0 pokazuje koszt takiego sprzężenia.
- **Automatycznego triggera słowa jako zachowania wieloplatformowego.** Jest wygodny tylko jako opcjonalna funkcja overlay; jawne komendy są bardziej przewidywalne i audytowalne.
- **Domyślnego headless approval.** Maister powinien zachować eskalację/fail-closed.

## Rekomendacja architektoniczna

**Nie integrować runtime'ów bezpośrednio.** Traktować PDW jako laboratorium UX i wzorców orkiestracji. Do Maister przenieść najpierw neutralny run-control, budżety/usage i read-only progress projection, następnie deklaratywny fan-out/fan-in IR nad wyłącznie kanonicznymi `maister:<role>`; wszystkie host-specific elementy pozostawić w overlay/bridge i objąć E5/E6. PDW może współistnieć jako osobne rozszerzenie Pi, ale Pi powinno zostać nowym targetem Maister dopiero po implementacji exact-native bridge, obserwowanej tożsamości, transakcyjnej projekcji i pełnego evidence.

## Źródła

### Zachowane

- [Maister README](/Users/mrapacz/Workspace/maister/README.md) — publiczny kontrakt instalacji, projekcji, ownera i evidence.
- [Maister Architecture](/Users/mrapacz/Workspace/maister/.maister/docs/project/architecture.md) — kanoniczna projekcja, exact runtime, instalator i granice stanu.
- [Maister Vision](/Users/mrapacz/Workspace/maister/.maister/docs/project/vision.md) — cele i wspierane hosty.
- [Maister Advisor](/Users/mrapacz/Workspace/maister/plugins/maister/agents/advisor.md) — bezpośredni kontrakt gate/escalation.
- [PDW README](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/README.md) — publiczne funkcje, DSL, instalacja i deklarowane ograniczenia.
- [PDW package.json](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/package.json) — wersja, dystrybucja, zależności i host Pi.
- [PDW workflow.ts](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/workflow.ts) — runtime, determinism, routing, resume i gates.
- [PDW agent.ts](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/agent.ts) — sesje Pi, modele, structured output i fallbacki.
- [PDW agent-registry.ts](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/agent-registry.ts) — discovery, precedence i tool policy.
- [PDW run-persistence.ts](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/run-persistence.ts) — journal, atomic save i leases.
- [PDW worktree.ts](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/src/worktree.ts) — rzeczywista semantyka izolacji/fallbacku.
- [PDW extension entrypoint](https://github.com/QuintinShaw/pi-dynamic-workflows/blob/main/extensions/workflow.ts) — rejestracja narzędzi, TUI, scheduler i host coupling.
- [PDW releases](https://github.com/QuintinShaw/pi-dynamic-workflows/releases) — zmiany kompatybilności i runtime do v3.2.0.

### Odrzucone

- Strona marketingowa/docs generowane z repo — redundantna względem README i kodu.
- npm/pi package landing pages — użyteczne do discovery, ale package.json i release są bardziej pierwotne.
- Blog Anthropic o dynamic workflows — inspiracja, nie dowód zachowania tych dwóch implementacji.
- Issues bez odpowiadającego kodu/release — pominięte, ponieważ nie opisują gwarantowanego bieżącego zachowania.

## Luki i ryzyka rezydualne

1. Nie wykonano `pi install`, `maister-install`, E5/E6 ani równoległego testu na tym samym `$HOME`; wnioski o koegzystencji wynikają z kontraktów ścieżek i ownership.
2. Nie sprawdzono efektywnych uprawnień plików PDW pod konkretnym `umask`; kod nie wymusza ich w analizowanych miejscach.
3. Nie ma istniejącego targetu Pi w Maister, więc koszt exact-native adaptera Pi jest szacunkiem, nie wynikiem prototypu.
4. Część odnośników szczegółowych nadal wskazuje `main`; analizowany commit i tag są przypięte wyżej, ale przed użyciem raportu jako formalnego evidence warto przepiąć wszystkie linki źródłowe na ten SHA.
5. Zakresy linii lokalnych odnoszą się do badanego checkoutu i mogą przesunąć się po zmianach dokumentacji.
