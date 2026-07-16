# Test assurance i luka runtime hostów

## TL;DR

Repozytorium ma już dobry zalążek platformowo niezależnego rdzenia: wykonywalne moduły bramek, stanu i kontynuacji są testowane bez hosta, a identyczne pliki runtime są kopiowane do targetów. Obecna macierz miesza jednak testy tekstu, materializacji, instalacji i runtime pod wspólnymi nazwami `smoke`/`e2e`. Najbardziej jaskrawy przypadek: cele `fully-automatic-continuation.e2e.sh` dla Claude, Cursor i Kiro zawsze zwracają `77 UNAVAILABLE`; tylko Codex uruchamia uwierzytelniony host.

Rekomendowany kierunek assurance to jedna pełna suita executable-contract dla wspólnego core, parametryczny contract harness dla cienkich adapterów/materializera oraz osobne, jawnie warunkowe host-runtime probes. Bez runtime Claude Code można uczciwie osiągnąć E4 (atomowa instalacja i poprawny installed shape), ale nie E5/E6. Obecny stan Claude to E1 jako dowód specyficzny dla hosta oraz E3 tylko dla wspólnego zachowania, które ma działać w każdym hoście.

## Key Decisions

- Testy należy klasyfikować po tym, co faktycznie wykonują, nie po nazwie pliku: `structural`, `transform`, `core-contract`, `install`, `host-smoke`, `host-runtime-e2e`.
- Wspólny runtime powinien przechodzić pełną suitę dokładnie raz; adaptery powinny przechodzić tylko kontrakt mapowania, materializacji, instalacji i minimalny runtime probe.
- Capability `supported` nie może wynikać z shared runnera ani static checks; musi być wyprowadzane z aktualnego host-native evidence target i fail-closed dla `77`, missing, skipped lub failed.
- Dla Claude Code bez runtime raport może deklarować najwyżej E4 po dodaniu izolowanego testu instalacji; E5/E6 pozostają `unverified`.

## Open Questions / Risks

- Nie ma repozytoryjnego testu instalacji canonical Claude pluginu ani adapter harnessu, więc poprawność host discovery pozostaje nieudowodniona.
- PR CI sprawdza reproducibility generated variants, ale nie uruchamia `make validate`; duża część testów działa dopiero przy tagu release albo lokalnie.
- Codex native E2E dowodzi aktywnego tool loop i kontynuacji, lecz nie instaluje pluginu ani nie wywołuje workflow przez host discovery; nie należy rozszerzać jego wniosku na pełny plugin E2E.
- Obecne instalatory Cursor i Kiro usuwają zawartość celu przed kopiowaniem, więc nie zapewniają transakcyjnego rollbacku przy przerwaniu instalacji.

## Zakres i metoda

Przeanalizowano `Makefile`, workflow GitHub Actions, macierz capabilities, wspólne testy executable, target-specific install/smoke/E2E oraz skrypty instalacji. Dodatkowo 2026-07-14 uruchomiono lokalnie, bez hostów i bez modyfikowania globalnej instalacji:

- `tests/gate-evaluator.test.sh` — 6/6;
- `tests/orchestrator-state-repository.test.sh` — 3/3;
- `tests/workflow-continuation.test.sh` — 5/5;
- `tests/phase-continue-contract.test.sh` dla source runnera — 6/6.

W środowisku nie było polecenia `claude`; dostępność pozostałych CLI została tylko wykryta przez `command -v`, bez ich uruchamiania.

## Findings

### Finding 1: wspólny executable core istnieje, ale quality gate nie uruchamia całej jego suity

- **Claim:** Moduły evaluator/state/continuation są bezpośrednio importowane z canonical `plugins/maister/.../bin` i mają rzeczywiste testy zachowania, w tym retry, transakcyjność, lease/reclaim i idempotencję. Jednak `make validate-contract` uruchamia tylko test dokumentacyjno-strukturalny engine, runner contract, jeden happy-path fully-automatic oraz capability projection; nie uruchamia osobno `gate-evaluator`, `orchestrator-state-repository` ani `workflow-continuation`.
- **Evidence:**
  - `tests/gate-evaluator.test.sh:14-17` — test importuje canonical evaluator i schema; `tests/gate-evaluator.test.sh:48-69` buduje pełny gate context i role config.
  - `tests/orchestrator-state-repository.test.sh:26-43` — wykonuje commit i sprawdza revision/mode; `tests/orchestrator-state-repository.test.sh:46-105` sprawdza byte-exact non-mutation, lock, symlink i injected failure.
  - `tests/workflow-continuation.test.sh:16-24` — importuje executable continuation/repository; `tests/workflow-continuation.test.sh:34-88` wykonuje same-phase, phase-entry, reclaim i acknowledgement safety.
  - `Makefile:24-30` — pełna lista poleceń `validate-contract` nie zawiera tych trzech suit.
- **Evidence level:** E3.
- **Confidence:** high — kod testów i wiring Makefile są bezpośrednim dowodem; lokalny run potwierdził przejście suit.
- **Inference/limitation:** Przejście core E3 nie dowodzi, że host dostarczy poprawne prymitywy UI/delegation/continuation.

### Finding 2: pełny runner contract jest powtarzany cztery razy na byte-identical projections

- **Claim:** `validate-phase-continue` uruchamia tę samą suitę kontraktową dla source, Codex, Cursor i Kiro, podczas gdy osobny target wymaga byte-identical kopii wspólnych runtime files. To daje pewność projection/import-path, ale powiela koszt pełnej suity dla kodu, który według kontraktu ma być identyczny.
- **Evidence:**
  - `Makefile:3-7` — macierz czterech ścieżek runnera.
  - `Makefile:57-66` — ta sama `tests/phase-continue-contract.test.sh` jest wykonywana dla każdego wpisu.
  - `Makefile:68-81` — binding i wspólne runtime files są porównywane przez `cmp` z canonical source.
  - `tests/phase-continue-contract.test.sh:4-6` — test różnicuje runner wyłącznie zmienną `PHASE_CONTINUE_RUNNER`.
- **Evidence level:** E3 dla zachowania source + E2/E3 dla projekcji targetów.
- **Confidence:** high.
- **Inference/limitation:** Nie rekomenduję usunięcia wszystkich target checks: każdy target nadal potrzebuje krótkiego `node --check`, checksum/import-resolution i jednego canary contract. Pełna macierz edge cases może działać raz na core.

### Finding 3: trzy z czterech nazwanych host E2E są wyłącznie sentinelami unavailable

- **Claim:** Claude, Cursor i Kiro `fully-automatic-continuation.e2e.sh` nie uruchamiają hosta, adaptera ani shared runnera. Każdy wypisuje komunikat i kończy kodem 77. Nie są nawet structural/golden tests — są jawnym rekordem braku dowodu.
- **Evidence:**
  - `tests/host-continuation/claude.e2e.sh:1-5` — bezwarunkowe `UNAVAILABLE` i `exit 77`.
  - `platforms/cursor/tests/fully-automatic-continuation.e2e.sh:1-5` — bezwarunkowe `UNAVAILABLE` i `exit 77`.
  - `platforms/kiro-cli/tests/fully-automatic-continuation.e2e.sh:1-5` — bezwarunkowe `UNAVAILABLE` i `exit 77`.
- **Evidence level:** E0 jako deklaracja luki; E5/E6 `unverified`.
- **Confidence:** high.
- **Inference/limitation:** Sama obecność pliku `.e2e.sh` nie podnosi assurance. Powinien być raportowany jako `evidence=unavailable`, nie jako test passed/skipped bez kontekstu.

### Finding 4: Codex target naprawdę uruchamia host, lecz zakres dowodu jest węższy niż pełny plugin E2E

- **Claim:** Codex E2E wymaga binarki i zalogowanego runtime, uruchamia `codex ... exec`, obserwuje kolejność tool command → marker → final message i weryfikuje persisted trace. Bootstrap importuje wygenerowany Codex binding/runtime. Test nie wykonuje jednak marketplace install ani hostowego wywołania skilla; prompt nakazuje bezpośrednio uruchomić repozytoryjny bootstrap.
- **Evidence:**
  - `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh:8-18` — fail-closed `77` bez uwierzytelnionego Codex.
  - `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh:34-56` — host dostaje prompt i uruchamia bootstrap w aktywnym `codex exec`.
  - `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh:64-88` — sprawdzenie markera, final message, trace i kolejności zdarzeń.
  - `platforms/codex-cli/tests/native-evidence-bootstrap.mjs:8-13` — bootstrap importuje generated Codex binding/repository i canonical capability matrix.
  - `platforms/codex-cli/tests/native-evidence-bootstrap.mjs:87-163` — wykonuje binding z mockowanymi portami Advisor/Arbiter/User/Target i sprawdza resume.
  - `platforms/codex-cli/tests/fully-automatic-continuation.e2e.sh:118-135` — izolacja bootstrapu i fail-closed unavailable.
- **Evidence level:** E6 dla konkretnej aktywnej pętli host tool-use + continuation binding; nie E6 dla install/discovery/workflow invocation.
- **Confidence:** high.
- **Inference/limitation:** Nazwa „native continuation E2E” jest uzasadniona, ale claim powinien być scenariuszowy: „Codex executes and observes the continuation bridge”, nie „pełny Maister działa E2E w Codex”.

### Finding 5: capability matrix poprawnie odrzuca shared-runner evidence i fail-closed mapuje wynik

- **Claim:** Capability `supported` jest przyznawane tylko po `passed` target-specific executable. Missing, non-executable, `77` i failure mapują się na `unsupported`; shared contract targets są jawnie zakazane jako native evidence.
- **Evidence:**
  - `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml:6-18` — Claude/Cursor/Kiro są `unsupported`, Codex `supported`, każdy z własnym targetem.
  - `Makefile:32-45` — executable target jest uruchamiany, `0 → passed`, `77 → unavailable`, reszta → failed; tylko `passed → supported`.
  - `Makefile:47-55` — validator odrzuca shared targets i porównuje deklarację z projekcją evidence.
  - `tests/host-capability-matrix.test.sh:48-63` — missing/skipped/unavailable/inconclusive/failed fail closed, shared runner nie kwalifikuje hosta.
- **Evidence level:** E3 dla mechanizmu projekcji; poziom hosta zależy od targetu.
- **Confidence:** high.
- **Inference/limitation:** Stan capability jest globalnym booleanem dla continuation, nie opisuje wersji hosta, scenariusza ani świeżości evidence; przy większej liczbie capabilities potrzebny będzie record `{capability, host, version, evidence_level, timestamp, target}`.

### Finding 6: `make validate` jest głównie structural/contract/install; host smokes nie są jego częścią

- **Claim:** Cursor validation jawnie deklaruje structural-only, Kiro i Cursor uruchamiają `smoke-cli --contract`, a Codex `smoke-cli.sh` wyłącznie parsuje wygenerowane pliki i grepuje kontrakty. Żaden z tych trzech kroków w `make validate` nie jest host-runtime smoke.
- **Evidence:**
  - `Makefile:92-94` — komentarz definiuje Cursor checks jako structural only i wyklucza live hook behavior.
  - `Makefile:186-190` — Cursor inventory/install oraz `smoke-cli.sh --contract`.
  - `platforms/cursor/smoke-cli.sh:10-37` — `--contract` wykonuje tylko file/grep checks i wychodzi przed sprawdzeniem CLI.
  - `Makefile:286-287` i `platforms/kiro-cli/smoke-cli.sh:32-54` — Kiro validation również wybiera contract-only path.
  - `Makefile:289-295` i `platforms/codex-cli/smoke-cli.sh:9-21` — Codex smoke buduje i waliduje JSON/layout; nie wywołuje `codex`.
- **Evidence level:** E1–E4 zależnie od podtestu; nie E5.
- **Confidence:** high.
- **Inference/limitation:** Nazwa `smoke-cli.sh` przy Codex jest myląca w quality gate; lepsza nazwa to `plugin-contract.test.sh`.

### Finding 7: istnieją realne host smokes dla Cursor/Kiro, ale są opcjonalne i nierówne w CI

- **Claim:** Cursor full smoke naprawdę uruchamia `agent`, wykrywa plugin, deleguje custom agent i tworzy artifact. Kiro full smoke naprawdę uruchamia `kiro-cli` przez wrapper oraz testuje discovery/delegation/artifacts, ale bez binarki kończy sukcesem po komunikacie SKIP. Tylko Cursor ma dedykowany tygodniowy workflow, który również może zakończyć sukcesem bez smoke z powodu braku CLI/API key.
- **Evidence:**
  - `platforms/cursor/smoke-cli.sh:39-60` — wymagane `agent`, auth i host invocation z `--plugin-dir`.
  - `platforms/cursor/smoke-cli.sh:63-100` — runtime plugin detection, subagent, quick-plan artifact i sentinel skill resolution.
  - `platforms/kiro-cli/smoke-cli.sh:98-109` — rzeczywisty `kiro-cli chat --no-interactive` przez wrapper.
  - `platforms/kiro-cli/smoke-cli.sh:111-148` — detection, delegation oraz plan artifacts.
  - `platforms/kiro-cli/smoke-cli.sh:185-188` — brak CLI daje SKIP i exit 0.
  - `.github/workflows/cursor-cli-smoke.yml:1-10` — weekly/manual, non-blocking wobec PR/push.
  - `.github/workflows/cursor-cli-smoke.yml:27-59` oraz `:61-76` — instalacja lub brak secretu może pominąć smoke bez failure.
- **Evidence level:** E5, kiedy host smoke faktycznie się wykona i przejdzie; E0, gdy tylko istnieje skrypt; `unavailable` przy skip.
- **Confidence:** high.
- **Inference/limitation:** Kiro `tests/e2e-matrix.test.sh` nie jest runtime E2E: sam opisuje się jako structural/doc (`platforms/kiro-cli/tests/e2e-matrix.test.sh:1-3`) i sprawdza dokumentację/output (`:32-99`).

### Finding 8: PR CI nie uruchamia validate; release jest pierwszym automatycznym pełnym gate

- **Claim:** Workflow PR/push tylko buduje trzy warianty i sprawdza `git diff`. `make validate` jest uruchamiane dopiero w workflow tagów `v*`. To oznacza, że nawet obecne E1–E4 quality gates nie są obowiązkowe na pull requestach.
- **Evidence:**
  - `.github/workflows/validate-generated-variants.yml:15-24` — jedyny job buduje warianty.
  - `.github/workflows/validate-generated-variants.yml:24-48` — jedyna walidacja to diff generated trees.
  - `.github/workflows/release.yml:1-13` — dopiero tag `v*` uruchamia `make build && make validate`.
- **Evidence level:** E0/E2 (pipeline intent i reproducibility).
- **Confidence:** high.
- **Inference/limitation:** Dokumentacja architektury mówi łącznie „make validate and CI ... run structural/contract checks” (`.maister/docs/project/architecture.md:52-58`), co może sugerować silniejsze PR coverage niż implementuje obecny workflow.

### Finding 9: install tests są użyteczne, lecz nie tworzą jednolitego, transakcyjnego kontraktu

- **Claim:** Cursor i Codex testują MCP default/opt-in na temp trees. Kiro ma szerszy izolowany install test. Nie ma odpowiednika dla Claude. Cursor/Kiro production-like install najpierw czyszczą dest i kopiują nowy tree, więc przerwanie może zostawić częściową instalację; Codex helper używa tmp+mv tylko dla pojedynczego manifestu po host-managed install.
- **Evidence:**
  - `platforms/cursor/tests/install.test.sh:9-18` — temp install i MCP assertions.
  - `platforms/codex-cli/tests/install.test.sh:13-28` — temp trees i apply/remove MCP helper; nie uruchamia `codex plugin add`.
  - `platforms/kiro-cli/tests/smoke.test.sh:39-60` — izolacja od personal `~/.kiro`; `:62-93` — default/alias/MCP checks.
  - `platforms/cursor/smoke-install.sh:49-60` — build, `rm -rf DEST`, copy.
  - `platforms/kiro-cli/smoke-install.sh:105-121` — build, clear target, copy, post-copy transforms.
  - `platforms/codex-cli/smoke-install.sh:30-43` — manifest mutation przez tmp+mv; `:99-120` — rzeczywisty host marketplace install jest poza testem temp-tree.
- **Evidence level:** E4 dla testowanych temp install behaviors; E1 dla Claude packaging; brak E4 Claude.
- **Confidence:** high.
- **Inference/limitation:** Install-time materializer powinien najpierw tworzyć pełny staged tree, walidować go, a następnie atomowo zamieniać docelowy katalog albo przywracać snapshot.

## Macierz aktualnego dowodu

| Warstwa / host | Claude | Cursor | Kiro | Codex |
|---|---:|---:|---:|---:|
| Canonical/shared core behavior | E3, applicable by inference | E3 | E3 | E3 |
| Generated/static host shape | E1 (canonical manifest) | E1 | E1 | E1 |
| Deterministic materialization | n/a dla canonical source | E2 | E2 | E2 |
| Install contract | brak | E4 temp tree | E4 isolated profile | E4 helpers, nie marketplace install |
| Host discovery/smoke | brak | E5 warunkowo | E5 warunkowo | brak ogólnego plugin smoke w gate |
| Host runtime continuation E2E | unavailable | unavailable | unavailable | E6 dla wąskiego continuation scenario |

**Ważne rozróżnienie:** najwyższy dowód zachowania wspólnego, który można przypisać Claude, to E3; najwyższy aktualny dowód specyficzny dla Claude host contract to E1. Bez runtime można podnieść host-specific assurance do E4, ale nie do E5/E6.

## Proponowany evidence ladder E0–E6

| Poziom | Wymagany dowód | Dozwolony claim | Niedozwolony claim |
|---|---|---|---|
| E0 | dokument, capability declaration, manual checklist | zamierzony kontrakt / znana luka | implementacja działa |
| E1 | parser/schema/static adapter contract | host-native tree ma wymagany shape i vocabulary | host odkrywa lub wykonuje plugin |
| E2 | deterministic materializer + golden/inventory/checksum | ten input i adapter dają reprodukowalny output | semantyka hosta jest równoważna |
| E3 | executable core contract na fixtures/ports | portable behavior spełnia invarianty niezależnie od hosta | adapter dostarcza prawidłowe prymitywy |
| E4 | isolated install/update/uninstall/rollback test | staged tree, config mutations i rollback są poprawne | host odkrywa plugin |
| E5 | prawdziwy host CLI smoke z wersją i auth | host odkrywa package i wykonuje wąską ścieżkę | pełna parity workflows |
| E6 | host runtime E2E konkretnego scenariusza | scenariusz działa na zapisanej wersji hosta | pełna/przyszła kompatybilność |

Każdy wynik powinien emitować rekord maszynowy, np. `host`, `capability`, `host_version`, `evidence_level`, `status`, `scenario`, `timestamp`, `target`, zamiast pojedynczego globalnego `supported`.

## Proponowany contract harness

### 1. Jedna suita portable core

Uruchamiać raz przeciw canonical modułom:

- schema + state repository;
- gate evaluator i policy/denylist;
- continuation/outbox/idempotency;
- report projection;
- failure injection i transactional non-mutation.

Włączyć istniejące `gate-evaluator`, `orchestrator-state-repository`, `workflow-continuation` i runner contract do jednego `make test-core`; podpiąć go do PR CI.

### 2. Wersjonowany kontrakt adaptera

Każdy adapter implementuje mały descriptor/port contract, np.:

- `host_id`, `contract_version`, minimal/max host version;
- layout/manifest schema i discovery root;
- mapowanie invocation names, skills/commands/agents/hooks;
- prymitywy `present_user_gate`, `invoke_subagent`, `phase_continue` i capability status;
- install transforms i dozwolone post-processing;
- unsupported capabilities z jawnym fallbackiem.

Parametryczny harness uruchamia tę samą tabelę testów dla `claude|cursor|kiro|codex`, ale nie kopiuje pełnych testów core. Sprawdza tylko mapping, brak host-obcego vocabulary, required files, schema, permissions i referential integrity.

### 3. Materializer contract E2

Dla wspólnego package + `install --target HOST`:

1. materializuj do temp staging directory;
2. waliduj descriptor/schema/inventory;
3. porównaj semantyczny manifest z golden fixture (nie cały duży snapshot tekstowy);
4. sprawdź deterministic rebuild;
5. wykonaj jeden canary core runner z installed path, aby wykryć broken imports;
6. dopiero potem atomic swap do destination.

To zachowuje wartość obecnej czterokrotnej runner matrix bez czterokrotnego wykonywania wszystkich edge cases.

### 4. Install contract E4 dla każdego hosta, także Claude

Wspólna tabela przypadków:

- fresh install, reinstall same version, upgrade, downgrade policy;
- invalid target/version/config;
- injected failure przed i po validation;
- byte-exact rollback, modes, symlinks i directory topology;
- uninstall usuwa wyłącznie managed files;
- offline mode bez globalnych side effects.

Dla Claude można to wykonać bez `claude`: materializer instaluje do tymczasowego `CLAUDE_CONFIG_DIR`/fixture discovery root, waliduje `.claude-plugin/plugin.json`, commands/skills/agents/hooks oraz rollback. To jest E4, nie host discovery.

### 5. Minimalne host-native probes E5/E6

Oddzielne targety, które zawsze zwracają jeden z: `passed`, `failed`, `unavailable(77)`, nigdy cichy sukces po skipie:

- E5: install/discover + invoke sentinel skill/agent;
- E6: jeden krytyczny workflow scenario, gate interaction i continuation;
- zapis host version, model/config constraints i raw trace artifact;
- scheduled dla niestabilnych/sekretnych hostów, required tylko tam, gdzie runtime jest dostępny i stabilny.

Claude pozostaje E4 do czasu pozyskania runtime/CI credential lub wykonania ręcznego E5/E6 na zarejestrowanej wersji. Sentinel `claude.e2e.sh` jest dobrym fail-closed placeholderem, ale dashboard powinien pokazywać go jako lukę, nie zielony test.

## Rekomendowana zmiana macierzy testów

| Target | Częstotliwość | Zawartość |
|---|---|---|
| `test-core` | każdy PR | pełny E3 raz na canonical core |
| `test-materializer` | każdy PR | E2 dla wszystkich adapter descriptors |
| `test-adapter-contract HOST` | każdy PR | E1 + canary E3 installed-path per host |
| `test-install HOST` | każdy PR | E4 na izolowanym root, atomicity/rollback |
| `test-host-smoke HOST` | nightly/manual/available PR | E5, fail/77 rozróżnione |
| `test-host-e2e HOST SCENARIO` | scheduled/release evidence | E6 scenariuszowe |
| `validate-capabilities` | każdy PR/release | projekcja tylko z odpowiedniego targetu i świeżego evidence record |

## Wnioski architektoniczne

1. **Jedno rozwiązanie jest realne na poziomie behavior/runtime core.** Obecne testy już pokazują, że state/gate/continuation wykonują się poza hostem.
2. **Nie należy dążyć do jednego fizycznego installed tree.** E1/E4 pozostają host-specific, bo layout, manifest, discovery, agents i hooks są częścią kontraktu hosta.
3. **Najlepsza granica to wspólny core + install-time materializer + cienkie adapter descriptors.** Testy core działają raz, a host matrix mierzy tylko różnice, które rzeczywiście należą do hosta.
4. **Brak Claude runtime nie blokuje migracji.** Blokuje wyłącznie E5/E6 claim; E1–E4 można i należy budować lokalnie, jawnie oznaczając granicę dowodu.

## Decisions (verbatim handoff)

- Adopt one full E3 executable-contract suite for the canonical portable core and run it once per change.
- Retain per-host checks only for adapter mapping, installed-path canary execution, materialization, installation, and native runtime behavior.
- Treat `exit 77` as explicit unavailable evidence and never as a passing or silently skipped host test.
- Define Claude Code assurance as current host-specific E1 / shared-core E3; target E4 without runtime, while keeping E5/E6 unverified.
- Make install-time materialization staged, validated, atomic, and rollback-tested before it replaces any host destination.
- Add core, materializer, adapter-contract, and isolated install suites to pull-request CI; keep credentialed host probes separately visible.

## Risks (verbatim handoff)

- PR CI currently proves generated reproducibility but not the repository's complete structural, contract, or install validation.
- Claude Code has no repository-owned install contract or native runtime evidence; host discovery and execution remain unknown.
- Codex native continuation E2E can be overinterpreted because it drives a repository bootstrap directly rather than invoking an installed Maister workflow through discovery.
- Cursor and Kiro installation scripts can leave partial destinations because they delete before copying instead of staging and atomically swapping.
- A single boolean host capability can hide scenario, host-version, freshness, and evidence-level differences.
- Renaming tests without changing their execution semantics will not fix assurance ambiguity; result metadata and CI routing must enforce the ladder.

