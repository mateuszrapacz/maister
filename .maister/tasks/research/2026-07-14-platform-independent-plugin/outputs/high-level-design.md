# High-level design: platformowo niezależny Maister

## TL;DR
Maister przechodzi na architekturę **portable documentation core + repository-owned host overlays + transactional installer**.
Wspólne skille są kopiowane bez zmian, a Codex, Cursor i Kiro CLI przechowują jawne agents, commands, hooks, manifests, settings oraz bindings tylko dla operacji semantycznie istotnych.
Installer składa `common + hosts/<target>` przez deterministyczne copy/merge, waliduje staging i zatwierdza instalację transakcyjnie z receipt oraz byte-exact rollbackiem.
Legacy generated trees i cały target Claude Code służą wyłącznie jako tymczasowy oracle migracji i muszą zniknąć przed zamknięciem zadania implementacyjnego.

## Key Decisions
- Architektura: **portable documentation core with explicit host overlays**, nie pełny workflow DSL ani install-time compiler promptów.
- Harness sam wybiera zwykłe narzędzia wykonawcze; jawne bindings obejmują wyłącznie control flow, safety, persistence i capability-sensitive behavior.
- Jedna kopia generic skills/runtime jest instalowana bez transformacji, a host-native assets są utrzymywane wprost w `hosts/codex`, `hosts/cursor` i `hosts/kiro-cli`.
- Własny installer obsługuje lokalne repo i GitHub source, staging, validation, lock, receipt, atomic commit, update, uninstall i rollback.
- Nieznana wersja hosta blokuje niepotwierdzone capabilities semantyczne; packaging-only może otrzymać jawny status `provisional`.
- Legacy build adapters, committed generated trees i Claude Code zostają usunięte w tym samym zadaniu po shadow comparison i spełnieniu Definition of Done.

## Open Questions / Risks
- Docelowe ścieżki discovery i format settings każdego hosta trzeba potwierdzić aktualnymi testami contract/runtime przed implementacją overlayu.
- Atomowa podmiana całego managed tree jest prosta; wieloplikowy merge do współdzielonych ustawień użytkownika wymaga journalu i byte-exact rollbacku.
- Neutralna proza może z czasem zacząć przemycać słownik jednego hosta; potrzebny jest forbidden-vocabulary contract oraz review wyjątków.
- Błędna klasyfikacja capability jako `packaging` zamiast `semantic` może przepuścić niezgodność; klasyfikacja musi być jawna i przeglądana.
- Usunięcie legacy w jednym zadaniu zwiększa wagę końcowej bramki parity, szczególnie dla hooks, agents i invocation semantics.

## 1. Kontekst i cele

Obecny system ma jedno Claude-oriented źródło, trzy adaptery tekstowe i trzy commitowane projekcje. Badanie wykazało około 610 plików projekcji, około 5,08 MB duplikowanych drzew i około 320 substytucji tekstowych, mimo że pięć kluczowych modułów runtime jest byte-identical w targetach ([canonical core evidence](../analysis/findings/canonical-core-boundary.md)). Testy potwierdzają też, że wspólna semantyka state/gate/continuation ma wykonywalny poziom E3, podczas gdy pełny runner contract jest niepotrzebnie powtarzany dla kopii ([assurance evidence](../analysis/findings/test-assurance-runtime-gap.md)).

Projekt ma osiągnąć:

1. jedno utrzymywane źródło generic skills i portable runtime;
2. jawne, małe różnice hostów bez globalnych transformacji prozy;
3. instalację z lokalnego checkoutu albo GitHuba pod pełną kontrolą projektu;
4. testowanie wspólnej semantyki raz i host contracts tylko tam, gdzie rzeczywiście się różnią;
5. brak nietestowalnego Claude Code oraz brak commitowanych generated trees po zakończeniu migracji.

Poza zakresem są marketplace, jeden identyczny installed tree, pełny workflow IR/DSL, generowanie host assets z promptów oraz emulowanie brakujących capabilities przez niejawne rewrite'y.

## 2. Styl architektury i granice

**Styl:** modular monolith dystrybuowany jako repozytoryjny bundle, z portable documentation core, deklaratywnymi Host Overlay Contracts i transakcyjnym adapterem instalacyjnym.

```text
Maintainer edits
      |
      v
+-------------------+       +-------------------------+
| common/           |       | hosts/<target>/          |
| skills + runtime  |       | explicit native overlay |
+-------------------+       +-------------------------+
          \                         /
           \                       /
            v                     v
             +-------------------+
             | custom installer  |
             | copy + merge only |
             +-------------------+
                       |
                stage -> validate
                       |
                  atomic commit
                       v
             host-native managed tree
```

Granica modułu jest celowo głęboka:

- `common` opisuje **co ma się wydarzyć** i utrzymuje invariants workflow;
- `hosts/<target>` opisuje **jak dany harness reprezentuje wymagane integracje**;
- `installer` odpowiada za **bezpieczne dostarczenie obu warstw**, ale nie interpretuje semantyki promptów;
- `tests` dostarczają oddzielny dowód core, overlay, install i native runtime.

## 3. Proponowana struktura repozytorium

```text
maister/
├── common/
│   ├── skills/                         # jedna kopia generic SKILL.md
│   ├── runtime/                        # state, gates, continuation, helpers
│   ├── references/                     # wspólne kontrakty i metodyki
│   ├── assets/                         # dashboard/report assets
│   └── primitives.yml                  # mały rejestr semantic invariants
├── hosts/
│   ├── codex/
│   │   ├── overlay.yml                 # Host Overlay Contract
│   │   ├── agents/
│   │   ├── commands/
│   │   ├── hooks/
│   │   ├── manifests/
│   │   ├── settings/
│   │   └── tests/
│   ├── cursor/                         # identyczny kontrakt katalogów
│   └── kiro-cli/
├── installer/
│   ├── bin/maister-install.mjs
│   └── lib/
│       ├── source-resolver.mjs
│       ├── overlay-loader.mjs
│       ├── compatibility.mjs
│       ├── assembler.mjs
│       ├── validator.mjs
│       ├── transaction.mjs
│       ├── settings-merge.mjs
│       └── receipt-store.mjs
├── schemas/
│   ├── host-overlay.schema.json
│   ├── primitive.schema.json
│   ├── receipt.schema.json
│   └── evidence.schema.json
├── tests/
│   ├── core/
│   ├── overlay-contract/
│   ├── installer/
│   ├── host-runtime/
│   └── fixtures/
└── docs/
    ├── installation.md
    ├── host-support.md
    └── adding-a-host.md
```

`common/skills` może pozostać fizycznie w obecnym `plugins/maister/skills` podczas pierwszych kroków migracji, ale końcowy owner nie może być nazwany ani ukształtowany jako Claude plugin. Nazwy docelowe są częścią migracji, nie wymaganiem wstecznej kompatybilności.

## 4. Komponenty i głębokie interfejsy

| Komponent | Odpowiedzialność | Publiczny interfejs | Czego nie robi |
|---|---|---|---|
| Portable core | Skills, workflow invariants, state/gate/continuation runtime | pliki `common/**`, primitive ids, executable core contracts | nie zna layoutu, tool names ani settings hosta |
| Primitive registry | Minimalny słownik operacji wymagających jawnej gwarancji | `id`, `class`, `required_effect`, `failure_policy` | nie jest DSL-em faz ani prompt AST |
| Host overlay | Natywne assets i bindings jednego harnessu | `overlay.yml` + repo-owned files | nie kopiuje generic skills i nie transformuje ich prozy |
| Source resolver | Lokalny checkout albo zweryfikowane źródło GitHub | `resolve(source, ref) -> immutableSource` | nie instaluje i nie ufa ruchomemu refowi bez receipt |
| Assembler | Deterministyczne `common + overlay` w staging | `assemble(source, overlay, staging)` | nie generuje agents/hooks/commands z promptów |
| Validator | Schema, inventory, paths, references, compatibility | `validate(staging, contract, hostFacts)` | nie naprawia niezgodnych danych |
| Settings merge | Plan kontrolowanych mutacji shared config | `plan/read/apply/restore` dla managed keys | nie nadpisuje niezarządzanych kluczy |
| Transaction manager | Lock, backup, commit, rollback i recovery | `prepare -> commit -> finalize` | nie uznaje częściowego sukcesu |
| Receipt store | Własność, hashes, evidence i historia instalacji | immutable receipt + active pointer | nie jest źródłem workflow state |
| Evidence harness | E1–E6 ze statusem i provenance | evidence record per host/capability/scenario | `unavailable` nigdy nie mapuje na pass |

## 5. Taksonomia semantic primitives

Zasada wyboru jest prosta: **jeżeli harness może swobodnie wybrać sposób wykonania bez zmiany obserwowalnej semantyki workflow, nie tworzymy bindingu**. Primitive powstaje dopiero wtedy, gdy błędny wybór może ominąć pauzę, zmienić trwały stan, naruszyć safety policy albo fałszywie zadeklarować capability.

### 5.1 Harness-owned ordinary operations

| Intencja w generic skill | Decyzja harnessu | Dlaczego bez bindingu |
|---|---|---|
| znajdź pliki lub użycia symbolu | `rg`, grep, index, search tool, Explore | wynik nie zależy od nazwy narzędzia |
| przeczytaj i przeanalizuj kod | native read, shell, semantic index | prompt określa cel i zakres |
| uruchom lokalny test | shell/process runner | exit code i artefakt są wystarczającym kontraktem |
| sformatuj plik | repo formatter lub edycja natywna | repo standards definiują wynik |
| zbierz read-only informacje | wykonanie inline albo pomocniczy agent | delegacja nie jest wymagana semantycznie |

Generic skills używają języka intencji: „wyszukaj”, „przeczytaj”, „zweryfikuj”. Nie zawierają `Grep`, `Task tool`, `Explore tool`, `AskUserQuestion`, `Skill tool` ani odpowiedników konkretnych hostów.

### 5.2 Explicit semantic bindings

| Primitive | Klasa | Wymagany efekt | Przykład bindingu overlayu |
|---|---|---|---|
| `present_user_gate` | control-flow/safety | zatrzymuje fazę, prezentuje dokładne opcje, zwraca jedną decyzję | native user-input UI albo host-specific blocking protocol |
| `delegate_role` | capability | uruchamia rolę z przekazanym context i ograniczeniami read/write | native subagent schema lub udokumentowany inline fallback |
| `persist_before_continue` | persistence | terminalny record jest trwały przed kolejną fazą | portable runtime + host invocation wrapper |
| `continue_phase` | control-flow | idempotentna kontynuacja tylko po ważnej decyzji | host hook/command/binding do shared runnera |
| `enforce_safety_hook` | safety | blokuje denylisted mutation przed wykonaniem | native hook event i matcher |
| `report_progress` | capability | pokazuje status bez zmiany source of truth | native plan/progress surface albo jawny no-op |
| `resolve_project_instructions` | safety/context | ładuje właściwe instrukcje przed pracą | host discovery rule/manifest |

Minimalny wpis `common/primitives.yml` opisuje invariant, nie składnię hosta:

```yaml
- id: present_user_gate
  class: control-flow
  required_effect: block_until_one_exact_option_is_selected
  failure_policy: fail_closed
- id: search_repository
  class: ordinary
  binding: harness_owned
```

Nowy primitive jest dopuszczalny, gdy ta sama różnica semantyczna wystąpiła w co najmniej dwóch workflow lub gdy pojedyncza operacja chroni safety/persistence invariant. To ogranicza ryzyko zbudowania pełnego DSL, zgodnie z decyzją 1A ([solution convergence](solution-exploration.md#2-obszar-decyzyjny-1--głębokość-reprezentacji-kanonicznej--ir)).

## 6. Host Overlay Contract

Każdy `hosts/<target>/overlay.yml` przechodzi wspólny schema i ma następujący kontrakt:

```yaml
schema_version: 1
host_id: codex
overlay_version: 1
supported_source_version: ">=3.0.0 <4"

layout:
  managed_root: ".codex/plugins/maister"
  copy_common:
    - from: common/skills
      to: skills
    - from: common/runtime
      to: runtime
  overlay_assets:
    - from: hosts/codex/agents
      to: agents

capabilities:
  present_user_gate:
    class: semantic
    binding: hooks/user-gate.md
    evidence_required: E5
    compatible_fingerprints: ["sha256:..."]
  plugin_layout:
    class: packaging
    binding: manifests/plugin.json
    evidence_required: E2

settings:
  - id: advisor_agent
    format: toml
    destination: ".codex/agents/advisor.toml"
    ownership: whole_file
    source: settings/advisor.toml

validation:
  required_paths: [skills, agents]
  forbidden_vocabulary: ["AskUserQuestion", "Task tool"]
```

Kontrakt wymaga:

- jawnej allowlisty target paths; żaden wpis nie może wyjść poza root;
- braku kolizji między `copy_common` i `overlay_assets`, chyba że schema wskazuje dozwolony `replace` dla host-owned path;
- bindingu albo jawnego `unsupported` dla każdego wymaganego semantic primitive;
- klasy `semantic` albo `packaging` dla każdej capability;
- wskazania evidence target i ostatnio potwierdzonego fingerprint/version;
- kompletnego inventory agents, commands, hooks, manifests i settings wymaganych przez host;
- host contract tests w `hosts/<target>/tests`.

Overlay jest małym, repo-owned modułem. Nie ma renderera prozy ani templates generujących jego zawartość w czasie instalacji. Jeśli dwa hosty mają identyczny plik, mogą korzystać ze wspólnego assetu tylko wtedy, gdy semantyka i format są rzeczywiście wspólne; nie tworzymy abstrakcji wyłącznie dla kilku podobnych linii.

## 7. Custom installer

### 7.1 CLI

```text
maister install   --target codex|cursor|kiro-cli [--source PATH|GH_URL] [--ref TAG_OR_SHA]
                  [--scope user|project] [--dest PATH] [--host-version VERSION]
                  [--dry-run] [--json]
maister update    --target HOST [--source PATH|GH_URL] [--ref TAG_OR_SHA] [--dry-run]
maister uninstall --target HOST [--scope user|project] [--dry-run]
maister rollback  --target HOST [--to RECEIPT_ID]
maister verify    --target HOST [--native]
maister status    [--target HOST] [--json]
```

Domyślne źródło to bieżący local checkout. GitHub source jest pobierany do tymczasowego immutable checkoutu; `--ref` zostaje rozwiązany do commit SHA i zapisany w receipt. Installer nie korzysta z marketplace i nie utrzymuje osobnych kanałów prebuilt.

### 7.2 Pipeline instalacji

```text
resolve source -> load overlay -> probe host facts -> compatibility decision
       -> acquire lock -> build plan -> stage copies/settings -> validate
       -> backup managed state -> commit managed tree -> commit settings
       -> write receipt -> switch active pointer -> cleanup
                       failure at any point
                              |
                              v
              restore bytes + modes + topology, keep old receipt active
```

1. **Resolve:** waliduje target/source/ref; autodetection może zasugerować host, ale nie nadpisuje jawnego `--target`.
2. **Probe:** odczytuje host version i capability fingerprints bez mutacji.
3. **Compatibility:** semantic unknown/incompatible kończy się przed staging; packaging-only unknown może przejść jako `provisional`.
4. **Lock:** per `{target, scope, destination}` zapobiega równoległym mutacjom.
5. **Plan:** wylicza pełne copy operations, settings mutations, ownership i expected hashes.
6. **Stage:** kopiuje wspólną warstwę i overlay do pustego katalogu na tym samym filesystemie co destination.
7. **Validate:** schema, inventory, referencje, vocabulary, permissions, path containment, deterministic hash i installed-path canary.
8. **Backup:** zachowuje wszystkie zarządzane pliki, współdzielone config bytes, modes, symlinks i directory topology.
9. **Commit:** rename managed tree, potem kontrolowane atomic writes settings; receipt pozostaje pending.
10. **Finalize:** zapisuje immutable receipt i atomowo przełącza active pointer dopiero po sukcesie wszystkich mutacji.
11. **Rollback:** przy błędzie odtwarza pełny snapshot i poprzedni active receipt; recovery może dokończyć rollback po przerwaniu procesu.

### 7.3 Receipt i stan transakcji

Receipt nie zastępuje `orchestrator-state.yml`; opisuje wyłącznie instalację:

```json
{
  "receipt_version": 1,
  "id": "2026-07-14T...-codex-<hash>",
  "status": "active",
  "target": "codex",
  "scope": "project",
  "source": {"kind":"github","url":"...","commit":"<sha>"},
  "versions": {"maister":"3.0.0","overlay":1,"host":"..."},
  "compatibility": {"status":"supported","capabilities":[]},
  "managed_tree": {"root":"...","files":[{"path":"...","sha256":"...","mode":"..."}]},
  "settings_mutations": [{"path":"...","owned_keys":["..."],"before_sha256":"...","after_sha256":"..."}],
  "previous_receipt_id": "...",
  "evidence": []
}
```

Stan przejściowy (`prepared`, `committing`, `rolling_back`) żyje w journalu obok receipt store. Po restarcie installer najpierw odzyskuje niedokończoną transakcję, a dopiero potem przyjmuje nowe polecenie.

## 8. Własność i merge ustawień

Każda mutacja ustawień deklaruje jedną z dwóch polityk:

1. `whole_file` — Maister jest wyłącznym właścicielem pliku w dedykowanej ścieżce; update może go zastąpić atomowo.
2. `managed_keys` — plik jest współdzielony; overlay deklaruje dokładne JSON/TOML/YAML paths, a installer zmienia tylko te klucze.

Reguły:

- brak niejawnego deep merge i brak tekstowych `sed` na configu;
- parse -> validate -> mutate allowlisted keys -> serialize deterministycznie do temp -> atomic rename;
- konflikt z wartością użytkownika kończy się czytelnym błędem albo wymaga jawnej opcji wyboru, nigdy silent overwrite;
- receipt zapisuje owned keys oraz before/after hash; backup zachowuje oryginalne bytes, mode i symlink topology;
- uninstall usuwa tylko wartości nadal równe wartościom zarządzanym z aktywnego receipt; wykryty user drift jest raportowany i pozostawiony bez zmian;
- update liczy plan względem aktywnego receipt i aktualnego filesystemu; nie zakłada czystego stanu.

## 9. Przepływy lifecycle

### Install

- wymaga braku aktywnego receipt albo jawnego `update`;
- tworzy pełny staging i nie dotyka destination przed przejściem walidacji;
- commit kończy się jednym aktywnym receipt lub pełnym rollbackiem.

### Update

- sprawdza integralność aktualnie zarządzanych plików i user drift;
- składa nowy staging od zera z nowego immutable source;
- zachowuje poprzedni receipt i backup jako bezpośredni rollback target;
- nie wykonuje in-place patchowania generic skills.

### Uninstall

- usuwa wyłącznie pliki/rooty i managed settings wskazane przez aktywny receipt;
- zachowuje zmodyfikowane przez użytkownika elementy, zgłasza conflict i nie usuwa parent directory, jeśli nie jest puste;
- tworzy uninstall receipt, aby operacja była audytowalna i odwracalna do czasu cleanup policy.

### Rollback

- domyślnie wraca do `previous_receipt_id`; opcjonalnie do jawnego receipt zgodnego z tym samym target/scope;
- przywraca bytes, modes, symlinks, directory topology i settings snapshot;
- po weryfikacji atomowo przełącza active pointer; nie rekonstruuje starej instalacji z aktualnego source.

## 10. Compatibility i evidence

Capability record rozdziela semantykę od packagingu:

```yaml
host: cursor
capability: present_user_gate
class: semantic
host_version: "x.y.z"
overlay_version: 1
fingerprint: "sha256:..."
evidence_level: E5
status: passed
scenario: blocking-exact-options
timestamp: "..."
target: test-host-smoke-cursor
```

Polityka:

| Stan | Semantic/safety | Packaging-only |
|---|---|---|
| known fingerprint + wymagany evidence passed | `supported` | `supported` |
| unknown host version, fingerprint unchanged | dozwolone tylko jeśli kontrakt jawnie uznaje fingerprint za wystarczający | `provisional` po E1/E2/E4 |
| fingerprint changed lub brak wymaganego bindingu | fail-closed | fail, jeśli validation nie przechodzi; inaczej `provisional` |
| runtime probe niedostępny | `unavailable`, nigdy pass; zgodnie z wymaganym progiem może blokować | nie podnosi ponad E4 |

Nie ma globalnego `--force` omijającego safety invariants. Ewentualny override jest per packaging capability, zapisany w receipt i niedostępny dla denylisted semantic primitives. Badanie wykazało, że globalny boolean capability ukrywa wersję, scenariusz i świeżość, dlatego record musi pozostać wielowymiarowy ([test assurance findings](../analysis/findings/test-assurance-runtime-gap.md)).

## 11. Walidacja i macierz testów

### 11.1 Testowane raz dla common core

- schema/state repository oraz byte-exact transactional rejection;
- gate engine, denylist, Advisor/Arbiter provenance i idempotency;
- continuation/outbox/reclaim/acknowledgement;
- generic skill inventory, references i forbidden host vocabulary;
- report/dashboard projections i installed-path portable runtime canary;
- failure injection wspólnych utilities.

### 11.2 Testowane per host overlay

- `overlay.yml` schema, required inventory i referential integrity;
- agents/commands/hooks/manifests/settings native syntax;
- kompletność semantic primitive bindings i unsupported fallbacks;
- brak foreign-host vocabulary;
- deterministic `common + overlay` assembly;
- install/update/uninstall/rollback w izolowanym root;
- host discovery E5 oraz krytyczne scenariusze E6, gdy runtime jest dostępny.

| Target | Zakres | Częstotliwość | Dowód |
|---|---|---|---|
| `test-core` | pełny portable core | każdy PR | E3 |
| `test-generic-skills` | inventory, links, neutral vocabulary | każdy PR | E1/E3 |
| `test-overlay HOST` | schema/native assets/bindings | każdy PR, 3 hosty | E1 |
| `test-assembly HOST` | determinism, hashes, installed canary | każdy PR, 3 hosty | E2/E3 |
| `test-installer HOST` | lifecycle + injected rollback | każdy PR, 3 hosty | E4 |
| `test-host-smoke HOST` | discovery + sentinel | required, jeśli środowisko hosta jest dostępne; inaczej jawne 77 | E5 |
| `test-host-e2e HOST SCENARIO` | gate/delegation/continuation | release/scheduled | E6 |
| `validate-evidence` | status, freshness, version, target | każdy PR/release | governance |

`exit 77` jest `unavailable`, nie zielonym skipem. Claim supportu jest per capability/scenario, nie per samą nazwę hosta. Obecne testy pokazują realne, lecz nierówne poziomy host evidence, więc migracja nie może sprowadzić ich do jednego booleanu ([current evidence matrix](../analysis/findings/test-assurance-runtime-gap.md)).

## 12. Migracja w jednym zadaniu implementacyjnym

Migracja zachowuje legacy tylko jako tymczasowy oracle na branchu. Końcowy stan zadania nie zawiera dual path.

### M0 — baseline

- zinwentaryzować exact legacy outputs, testy, docs, CI i install paths;
- zapisać semantic manifest każdego wspieranego docelowo hosta;
- uruchomić obecne build/validate i zachować wyniki jako porównanie.

### M1 — neutral common core

- przenieść generic skills/runtime/references/assets do neutralnej własności;
- usunąć Claude-native vocabulary z generic layer;
- dodać minimalny primitive registry i common core suite.

### M2 — repo-owned overlays

- utworzyć `hosts/codex`, `hosts/cursor`, `hosts/kiro-cli` z pełnym native inventory;
- przenieść host-specific agents, commands, hooks, manifests i settings bez generowania;
- dodać overlay schema oraz parametryczny contract harness.

### M3 — custom installer

- wdrożyć local/GitHub source resolution, copy/merge assembly, validation, receipt, lifecycle i recovery;
- uruchomić E4 dla każdego z trzech hostów z failure injection;
- sprawdzić installed-path canaries.

### M4 — shadow comparison

- dla Codex, Cursor i Kiro złożyć nowy tree i porównać z legacy generated tree;
- klasyfikować różnice jako expected architectural change albo defect;
- wymagać zero nierozstrzygniętych różnic w manifestach, referencjach, executable bits, hooks i semantic primitives.

### M5 — deletion before completion

- usunąć `plugins/maister-codex`, `plugins/maister-cursor`, `plugins/maister-kiro` oraz stare build adapters, generatory i drift jobs;
- usunąć canonical Claude plugin, Claude manifest/hooks/commands/agents, `claude.e2e.sh`, capability entries, dokumentację i vocabulary;
- przepiąć CI, Makefile, release/docs na nowy installer i trzy hosty;
- wykonać finalne testy na czystym checkout i potwierdzić czysty `git status`.

## 13. Definition of Done

Zadanie implementacyjne jest ukończone tylko wtedy, gdy wszystkie warunki są spełnione:

1. `common/skills` jest jedyną utrzymywaną kopią generic skills i installer kopiuje ją byte-for-byte dla Codex, Cursor i Kiro CLI.
2. Generic layer nie zawiera Claude-native ani foreign-host tool vocabulary; ordinary operations pozostają harness-owned.
3. Każdy wymagany semantic primitive ma binding lub jawny, walidowany unsupported fallback w każdym overlayu.
4. `hosts/codex`, `hosts/cursor` i `hosts/kiro-cli` zawierają jawne agents, commands, hooks, manifests, settings oraz host contract tests.
5. Installer działa z lokalnego checkoutu i GitHub source resolved do SHA; nie korzysta z marketplace ani runtime prompt generation.
6. Fresh install, reinstall policy, update, uninstall i rollback przechodzą dla wszystkich trzech hostów w izolowanych rootach.
7. Invalid input i injected failure pozostawiają bytes, modes, symlinks i directory topology bez zmian albo przywrócone byte-exact.
8. Settings merge modyfikuje wyłącznie zadeklarowane managed keys; user drift jest zachowany i raportowany.
9. Compatibility records rozróżniają semantic/safety od packaging; semantic unknown fail-closed, packaging provisional jest audytowalne.
10. Pełny common-core E3 działa raz; per-host E1/E2/E4 oraz dostępne E5/E6 emitują wersjonowane evidence records, a `unavailable` nie jest pass.
11. Shadow comparison ma zero niewyjaśnionych różnic dla Codex, Cursor i Kiro CLI.
12. Stare build adapters, transform scripts, generated drift jobs i kompletne generated trees nie istnieją w końcowym repo.
13. Claude Code nie istnieje w supported targets, installerze, overlays, manifests, commands, agents, hooks, tests, capability matrix, docs ani generic vocabulary.
14. Repo docs i `.maister/docs/project/{vision,architecture,tech-stack,roadmap}.md` opisują nową architekturę i tylko trzy wspierane hosty.
15. Czysty checkout potrafi zainstalować, zweryfikować i odinstalować każdy target bez modyfikowania repo; końcowy `git status` jest czysty.

## 14. Ryzyka i obserwowalność

| Ryzyko | Mitigacja | Sygnał |
|---|---|---|
| semantic drift w generic prose | forbidden vocabulary + primitive review + scenario contracts | diff inventory i failed semantic canary |
| partial install/config corruption | staging, journal, backups, atomic writes, injected failures | transaction id, recovery status, before/after hashes |
| overlay niekompletny po zmianie hosta | schema + capability fingerprint + fail-closed | compatibility decision per capability |
| installer usuwa dane użytkownika | receipt ownership + managed-key comparison | drift/conflict report przed commit/uninstall |
| dual path pozostaje na stałe | M5 i DoD wymagają fizycznego usunięcia legacy | repository inventory check |
| fałszywie zielone host tests | structured E0–E6 evidence, `77=unavailable` | dashboard/report by status and freshness |

Każde polecenie installera z `--json` emituje `operation_id`, `target`, `source_commit`, `phase`, `compatibility_status`, `changed_paths`, `receipt_id`, `rollback_performed` i listę evidence. Logi nie zawierają credentials ani pełnej treści ustawień. Domyślny human output podaje następny krok naprawczy oraz ścieżkę receipt/journalu.

## 15. Integracja z istniejącym systemem

- `orchestrator-state.yml` pozostaje jedynym źródłem prawdy workflow; receipt jest osobnym stanem instalacyjnym.
- Istniejące ESM state/gate/continuation stają się `common/runtime` i zachowują swoje executable contracts.
- Obecne Cursor/Kiro/Codex host assets są wejściem do jawnych overlayów, nie szablonami generatora.
- Obecne generated trees są wyłącznie baseline M0/M4 i są usuwane w M5.
- Make/CI zostają uproszczone do core + parametrycznych overlay/installer tests oraz oddzielnych native probes.

## 16. Ślad decyzji i dowodów

Siedem decyzji architektonicznych zapisano w [decision-log.md](decision-log.md): boundary reprezentacji, overlay/installer, task-scoped legacy removal, capability-sensitive compatibility, usunięcie Claude, transactional settings ownership oraz evidence boundary. Decyzje 1A, 2D, 3D, 4C i 5D pochodzą z potwierdzonej konwergencji zapisanej w `orchestrator-state.yml`; szczegółowe pierwotne alternatywy są w [solution-exploration.md](solution-exploration.md).

