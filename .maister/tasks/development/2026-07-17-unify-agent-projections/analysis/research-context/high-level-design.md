# High-Level Design: ujednolicona projekcja i uruchamianie agentów Maister

## TL;DR

Maister przyjmie architekturę **portable core + ports and adapters**: 28 plików `plugins/maister/agents/*.md` pozostanie jedynym źródłem zachowania, a wspólny parser utworzy z nich wersjonowany manifest ról.
Deterministyczny projector wygeneruje reprezentacje hostów w stagingu instalatora, po rozwiązaniu niezmiennego źródła i przed walidacją, hashowaniem oraz publikacją receipt.
Workflow wybierze dokładny identyfikator `maister:<role_id>`; resolver i adapter hosta zakończą operację błędem przy braku, kolizji, niedostępności lub niezgodności digestu.
`advisor` przejdzie tę samą ścieżkę co wszystkie role, a stare pliki Codex TOML zostaną usunięte ze źródła rozwiązania bez migracji lub kompatybilności wstecznej.

## Key Decisions

- **Jedno źródło zachowania:** 28 kanonicznych Markdownów jest parsowanych do jednego IR i manifestu; projekcje hostów nie są ręcznie utrzymywane ([ADR-001](decision-log.md#adr-001-jedno-kanoniczne-źródło-ról-i-wersjonowany-manifest)).
- **Projekcja w stagingu:** hostowe artefakty powstają deterministycznie wewnątrz transakcyjnego materializera i są objęte walidacją, provenance oraz receipt ([ADR-002](decision-log.md#adr-002-deterministyczna-projekcja-w-stagingu-transakcji)).
- **Dokładne wywołanie:** workflow przekazuje logiczny identyfikator roli do fail-closed resolvera, który wybiera dokładnie jeden adapter hosta bez fallbacku ([ADR-003](decision-log.md#adr-003-dokładny-fail-closed-resolver-i-natywne-adaptery)).
- **Natywna projekcja Kiro:** Maister zarządza wyłącznie wyliczonym zestawem własnych plików pod `~/.kiro/agents`, nie całym katalogiem `.kiro` ([ADR-004](decision-log.md#adr-004-wielokatalogowe-lecz-wąskie-ownership-dla-kiro)).
- **Czysta instalacja:** legacy `.codex/agents/*.toml` znika z repozytorium i projektu rozwiązania; nie powstaje ścieżka migracyjna, backup ani cleanup runtime ([ADR-005](decision-log.md#adr-005-czysta-instalacja-bez-migracji-legacy-codex-toml)).
- **Trzy poziomy dowodu:** materializacja, native discovery i exact invocation są raportowane osobno; brak prerequisite daje `unavailable`, nigdy `passed` ([ADR-006](decision-log.md#adr-006-oddzielne-dowody-materializacji-discovery-i-invocation)).

## Open Questions / Risks

- Publiczny kontrakt Codex nie gwarantuje stabilnego programistycznego schematu spawn ani per-spawn model override; wymaganie, którego host nie potrafi wymusić, musi dać `unavailable` albo `unsupported_model_override`.
- Cursor nie dokumentuje precedence plugin-agenta wobec projektowego lub użytkownika o tej samej nazwie; do czasu wersjonowanego probe instalacja lub dispatch musi odrzucić wykrytą kolizję `maister-*`.
- Kiro deleguje custom subagentów przez mechanizm zależny od wersji hosta; exact identity wymaga obserwowalnego, wersjonowanego probe zamiast uznania routingu tekstowego za dowód.
- Rozszerzenie transaction receipt z jednego aktywnego root na wąski zestaw zarządzanych roots wymaga pełnych testów rollbacku, race detection i zachowania niezwiązanych plików.

## Design Overview

Maister ma dostarczać ten sam zestaw wyspecjalizowanych ról na Codex, Cursor i Kiro CLI bez ręcznie synchronizowanych kopii oraz bez pozornej zgodności opartej wyłącznie na liczbie plików. Zmiana usuwa drift zachowania, naprawia brakującą rolę Cursor i niedomknięte referencje Kiro oraz daje workflow jednoznaczny kontrakt wywołania.

Wybrano **warstwowy portable core z adapterami hostów**, **deterministyczną projekcją build/install-time** oraz **transakcyjny filesystem delivery**. Kanoniczna warstwa definiuje identity i instrukcję roli; manifest definiuje mapowanie; projector odpowiada za natywny format, a adapter za uruchomienie. Format fizyczny może różnić się między hostami, lecz identity, digest, semantyka błędu i evidence pozostają wspólne.

**Kluczowe zasady:**

- `role_id = filename stem = frontmatter.name`; pełna nazwa workflow to `maister:<role_id>`, a host-facing ID to `maister-<role_id>`.
- Wszystkie 28 ról, w tym `advisor`, używa identycznego parsera, projectora, resolvera, adaptera i macierzy testowej.
- `explore` i Kiro `maister` są overlay-owned support agents, liczone i walidowane poza kanonicznym inventory.
- Generowane reprezentacje są efemerycznym rezultatem stagingu i release package, nie zatwierdzoną kopią źródła zachowania.
- Każdy błąd identity, closure, collision, availability lub digest zatrzymuje operację przed mutacją albo przed dispatch.

## Architecture

### System Context (C4 Level 1)

```text
[Maintainer / release pipeline]
        | immutable checkout + target
        v
[Maister distribution system]
        | transactional installation + receipts
        v
[Codex / Cursor / Kiro CLI host] <---- workflow request: maister:<role_id>
        | native generic spawn / plugin agent / Kiro custom agent
        v
[Selected Maister role execution]
        |
        `----> [Evidence store: materialization, discovery, invocation]
```

Maintainer publikuje jedno kanoniczne źródło. Maister tworzy reprezentację właściwą dla hosta i instaluje ją z pełnym ownership. Workflow przekazuje logiczną rolę, host wykonuje dokładnie wskazaną reprezentację, a wynik jest związany z identity i digestami w rekordzie evidence.

### Container Overview (C4 Level 2)

```text
[Immutable canonical checkout]
  plugins/maister/agents/*.md
          |
          v
+---------------- Portable agent core ----------------+
| [Role Parser] -> [Agent IR] -> [Projection Manifest]|
|                       |             |                |
|                       `----> [Exact Role Resolver]   |
+-----------------------|-------------|----------------+
                        |
                        v
+--------------- Distribution boundary ----------------+
| [Staged Agent Projector] -> [Materializer Validators] |
|             |                        |                 |
|             v                        v                 |
|    [Host projection tree] -> [Transaction + Receipt]  |
+-------------|------------------------------------------+
              | installs receipt-owned artifacts
              v
  +-----------+-------------+-------------------+
  |                         |                   |
[Codex resources]     [Cursor agents/*.md] [Kiro native leaf set]
  |                         |               JSON + prompt
  +-----------+-------------+-------------------+
              | logical role + verified digest
              v
+---------------- Runtime ports -------------------------+
| [Resolver] -> [Codex | Cursor | Kiro adapter]          |
|                         |                               |
|                         v                               |
|              [Execution/Evidence Recorder]             |
+---------------------------------------------------------+
```

Portable core nie zna szczegółów transakcji ani host API. Distribution boundary nie podejmuje decyzji o roli workflow. Runtime ports nie generują plików i przyjmują tylko zwalidowany manifest oraz materialized provenance.

## Key Components

| Component | Purpose | Responsibilities | Key Interfaces | Dependencies |
|---|---|---|---|---|
| Canonical Role Parser | Zmienia 28 Markdownów w stabilny host-neutralny model. | Parsuje frontmatter i body; weryfikuje `stem = name`; oblicza source SHA-256; odrzuca duplicate, case-fold i path collisions. | `parseCanonicalRoles(sourceRoot) -> AgentIR[]` | Immutable source resolver, Markdown/frontmatter parser, hash utilities. |
| Versioned Projection Manifest | Jest jedyną tabelą mapowania logical role na reprezentacje hostów. | Sortuje 28 ról; przechowuje external IDs, destinations, transform IDs i tools profiles; oddziela `support_agents`; wiąże schema/projector version. | `loadAgentManifest()`, `validateAgentManifest(ir)` | Agent IR, overlay contracts. |
| Staged Agent Projector | Tworzy natywne, powtarzalne pliki bez modyfikowania źródła. | Emisja Codex resources, Cursor Markdown i Kiro JSON+prompt; allowlisted transforms; stabilna kolejność, bytes i modes; per-output digest. | `projectAgents({target, ir, manifest, stagingRoot})` | Manifest, overlay assets, materializer staging. |
| Projection Validator | Dowodzi kompletności i integralności projekcji przed commitem. | Bijection 28/28; syntax; Kiro reference closure; forbidden Advisor exceptions; support inventory; collision i projected-tree digest checks. | `validateAgentProjection(candidate)` | Projected staging tree, overlay schema, hash-tree. |
| Transaction & Managed Roots | Atomowo publikuje zwalidowane projekcje i zapisuje ich ownership. | Snapshot, drift check, commit, rollback i recovery; primary root; dodatkowy Kiro leaf root; receipt-listed uninstall; race revalidation. | Existing install/update/verify/uninstall/recover commands | Transaction manager, receipt/journal schemas, target paths. |
| Exact Role Resolver | Zamienia `maister:<role_id>` na dokładnie jeden zweryfikowany dispatch plan. | Normalizacja wyłącznie według jawnej gramatyki; lookup; source/projection digest check; capability/collision preflight; zero fallbacku. | `resolveAgentRole({logicalId, target, manifest, receipt}) -> DispatchPlan` | Manifest, active receipt/provenance, target registry. |
| Host Adapter Port | Ukrywa różnice wykonania między trzema hostami. | Codex prompt injection do generic subagenta; Cursor exact native plugin-agent dispatch; Kiro exact custom-agent dispatch; propagacja terminalnego wyniku. | `dispatchAgent(plan, taskContext) -> ExecutionResult` | Host runtime contract, resolver plan. |
| Execution & Evidence Recorder | Oddziela dowód plików, discovery i właściwego wykonania. | Rekorduje identity, digesty, host/version, dispatch ID, attempts i result; produkuje E5/E6 `passed`/`failed`/`unavailable`; pilnuje freshness. | Evidence schema/policy, native host probes | Host adapters, provenance, scenario version. |

## Data Flow

### Build, install i receipt

```text
immutable source
  -> parse 28 canonical roles
  -> validate identity and build sorted manifest
  -> project target representation into empty transaction staging
  -> validate 28/28, support inventory, syntax, references, modes and hashes
  -> calculate agent_projection provenance
  -> snapshot all candidate managed roots
  -> commit receipt-owned files
  -> verify installed bytes and publish active receipt
```

`provenance.agent_projection` powinno zawierać `schema_version`, `projector_version`, `canonical_set_hash`, `manifest_hash` i `projected_tree_hash`. Każdy receipt inventory entry wskazuje `root_id`, ścieżkę względną, typ, mode i hash. Dla Codex i Cursor wystarcza primary plugin root; Kiro używa primary `.kiro-maister` oraz dodatkowego `kiro_native_agents` ograniczonego do jawnie wyliczonych plików `maister-*.json` i `instructions/maister-*.md`.

### Runtime dispatch

```text
workflow asks for maister:<role_id>
  -> validate exact logical ID
  -> resolve one manifest row
  -> verify active receipt + source/projection digests
  -> preflight adapter, host version and collisions
  -> dispatch exact host representation
  -> verify observed identity where host exposes it
  -> persist terminal execution/evidence record
  -> return result to workflow
```

Codex message envelope zawiera logical role ID, canonical source digest, pełną instrukcję, task context i output contract. Cursor używa exact `maister-<role_id>` w natywnym plugin inventory. Kiro używa descriptor/prompt pary oraz support-agenta `maister` z wygenerowaną exact allowlist, ale support agent nie staje się 29. rolą kanoniczną.

## Host Projections

| Host | Materialized representation | Dispatch | Ownership | Fail-closed preflight |
|---|---|---|---|---|
| Codex | Packaged canonical prompt resources w pluginie; bez `.codex/agents/*.toml`. | Generic native subagent z pełną instrukcją roli w message envelope. | Primary plugin receipt. | Generic delegation unavailable, digest mismatch, unsupported required model. |
| Cursor | 28 wygenerowanych `agents/<role_id>.md` z `name: maister-<role_id>`. | Exact native plugin-agent identity. | Primary plugin receipt. | Missing/extra role, unmanaged `maister-*` collision, unverified host contract. |
| Kiro CLI | 28 par `maister-<role_id>.json` + `instructions/maister-<role_id>.md` pod `~/.kiro/agents`. | Exact custom subagent przez wersjonowany adapter/scenario; support parent ma allowlist. | Receipt-owned leaf set w dodatkowym managed root. | Broken URI closure, project-local shadow, unavailable identity observation. |

`advisor` nie ma specjalnego pola, destination, readonly flag, sandbox policy, TOML profile ani alternatywnego adaptera. Test negatywny ma odrzucać każdy taki wyjątek.

## Integration Points

| Integration point | Existing seam / likely touchpoint | Contract introduced or changed |
|---|---|---|
| Immutable source resolution | `plugins/maister/lib/distribution/source-resolver.mjs` | Parser otrzymuje wyłącznie zweryfikowany source root i pełny commit. |
| Agent IR i projection manifest | Nowe `plugins/maister/lib/distribution/agent-ir.mjs` oraz `plugins/maister/agent-projection-v1.json` | Wersjonowany schema, 28 canonical rows, osobna sekcja support agents. |
| Staged projection | Nowe `plugins/maister/lib/distribution/agent-projector.mjs`; integracja w `materializer.mjs` | Projector działa po assembly/source resolution, przed final validation i `hashTree`. |
| Overlay contracts | `plugins/maister/overlays/{codex,cursor,kiro-cli}/overlay.yml`, `inventory.yml`, schema overlay | Overlay wybiera format/destinations/transforms; nie przechowuje kopii canonical behavior. |
| Transactional ownership | `transaction-manager.mjs`, `target-paths.mjs`, `receipt-schema.mjs`, `journal-schema.mjs` | `managed_roots` + inventory `root_id`; Kiro leaf-set uczestniczy w snapshot/rollback/verify/uninstall. |
| Provenance | `provenance.mjs`, receipt schema, release metadata | Dodanie zwalidowanego `agent_projection` bindingu i projected tree hash. |
| Exact resolution | Nowe `plugins/maister/lib/runtime/agent-resolver.mjs` | Logical ID -> jeden `DispatchPlan`; unknown/duplicate/mismatch zwraca typed error. |
| Host dispatch | Nowe `plugins/maister/lib/runtime/host-adapters/{codex,cursor,kiro-cli}.mjs` lub równoważne natywne porty overlay | Jedno wejście `DispatchPlan`, brak inline/natural-language fallbacku. |
| Execution record | Nowe `plugins/maister/lib/runtime/execution-record.mjs`; istniejące evidence schema/policy | Bind workflow ID, role ID, source/manifest digest, external/dispatch ID i terminal result. |
| Native probes | `plugins/maister/lib/distribution/host-probes/*.mjs` | E5 sprawdza discovery, E6 exact invocation dwóch rozróżnialnych ról i zwykłego `advisor`. |
| Test suites | `source-materializer`, `overlay-contract`, `installer-transaction`, `target-registry`, `repository-topology`, `evidence-parity-topology`, `parity-release`, `release-package` | Bijection, deterministic projection, multi-root rollback, exact dispatch i clean topology. |
| Operator docs | Project docs, `docs/commands.md`, `docs/workflows.md`, init skill | Usunięcie legacy Advisor TOML claims; opis logical IDs, destinations, evidence i clean-install assumption. |

Nazwy nowych modułów są proponowanymi seamami do doprecyzowania w `maister:development`; odpowiedzialności i kierunek zależności są wiążące. Runtime może być zrealizowany jako host-native port, jeżeli dany host nie udostępnia wspólnego JS API, ale musi zachować ten sam `DispatchPlan` i record contract.

## Receipt, Provenance and Ownership

- Receipt posiada jawne `managed_roots`; każdy ma stabilny `id`, absolutny zwalidowany path i politykę `whole_tree` albo `leaf_set`.
- Inventory nie używa absolutnych ścieżek jako identity; wpis łączy `root_id` i bezpieczną ścieżkę względną.
- Kiro `leaf_set` zawiera wyłącznie artefakty wynikające z bieżącego manifestu i receipt; niezwiązane pliki w `~/.kiro/agents` nie są snapshotowane jako własność, nadpisywane ani usuwane.
- Journal i rollback obejmują wszystkie roots w jednej transakcji i nie publikują receipt, dopóki verify każdego root nie przejdzie.
- Projection provenance jest liczona przed commitem z candidate staging i weryfikowana ponownie po instalacji.
- Update usuwa tylko stale receipt-owned entries; hand-edit pliku managed daje drift i zero zmian.

## Validation and Evidence

| Gate | Co dowodzi | Wynik przy braku prerequisite |
|---|---|---|
| Structural projection | 28 unique canonical roles, deterministyczne bytes/modes, support agents osobno, zero unresolved refs. | `failed`; instalacja nie mutuje targetu. |
| Transaction materialization | Candidate został poprawnie zainstalowany, zreceiptowany i zweryfikowany we wszystkich managed roots. | `failed`; rollback lub zachowany recovery state. |
| Native discovery (E5) | Host w określonej wersji rzeczywiście odkrywa oczekiwane external IDs. | `unavailable`, jeśli brak runtime/auth/safe scenario; nigdy `passed`. |
| Exact invocation (E6) | Host uruchamia wskazaną rolę, a wynik/identity wiąże się z manifestem i digestem. | `unavailable`, jeśli exact scenario nie jest możliwe; wrong identity to `failed`. |

Scenario versions muszą wiązać host version, overlay version, source commit, manifest digest i projection digest. Evidence wygasa po zmianie któregokolwiek z tych elementów.

## Rollout in Dependency Order

1. Wprowadzić parser/IR, schema manifestu, canonical inventory oraz invariants `stem = name`, 28/28 i Advisor equality.
2. Zbudować czysty projector i projection validator; dodać deterministic fixtures i projection provenance bez zmiany aktywnej instalacji.
3. Włączyć projector do materializer stagingu; usunąć ręczne behavior copies i Kiro reference exemption dopiero po przejściu closure tests.
4. Rozszerzyć receipt/journal/transaction o `managed_roots` i Kiro leaf-set, wraz z injected-failure rollback tests.
5. Przełączyć Cursor i Kiro na generowane natywne reprezentacje; utrzymać support agents w oddzielnym inventory.
6. Dodać exact resolver, host adapter ports i execution record; przełączyć workflow bindings na `maister:<role_id>`.
7. Usunąć legacy Codex TOML z repozytorium, init i dokumentacji; nie dodawać migration runtime ani backward compatibility.
8. Dodać wersjonowane E5/E6 probes, zaktualizować parity baselines dopiero po nowych gates, a następnie wykonać pełny target-aware release lifecycle.

## Design Decisions

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](decision-log.md#adr-001-jedno-kanoniczne-źródło-ról-i-wersjonowany-manifest) | Jedno kanoniczne źródło ról i wersjonowany manifest | Accepted |
| [ADR-002](decision-log.md#adr-002-deterministyczna-projekcja-w-stagingu-transakcji) | Deterministyczna projekcja w stagingu transakcji | Accepted |
| [ADR-003](decision-log.md#adr-003-dokładny-fail-closed-resolver-i-natywne-adaptery) | Exact fail-closed resolver i natywne adaptery | Accepted |
| [ADR-004](decision-log.md#adr-004-wielokatalogowe-lecz-wąskie-ownership-dla-kiro) | Wielokatalogowe, wąskie ownership dla Kiro | Accepted |
| [ADR-005](decision-log.md#adr-005-czysta-instalacja-bez-migracji-legacy-codex-toml) | Czysta instalacja bez migracji legacy Codex TOML | Accepted |
| [ADR-006](decision-log.md#adr-006-oddzielne-dowody-materializacji-discovery-i-invocation) | Oddzielne dowody materializacji, discovery i invocation | Accepted |

## Concrete Examples

### Scenario 1: zwykły Advisor na Codex

**Given** immutable source zawiera `agents/advisor.md`, a aktywny receipt wiąże ten plik z bieżącym manifestem, **when** workflow żąda `maister:advisor`, **then** resolver wybiera dokładnie jeden wiersz, Codex adapter wstrzykuje pełną kanoniczną instrukcję do generic subagenta i zapisuje ten sam zestaw pól evidence co dla każdej innej roli. Nie powstaje ani nie jest odczytywany żaden TOML, readonly lub sandbox branch.

### Scenario 2: instalacja Kiro obok własnego agenta użytkownika

**Given** `~/.kiro/agents/personal-reviewer.json` należy do użytkownika, **when** Maister instaluje 28 descriptorów i promptów, **then** receipt obejmuje tylko wyliczone pliki `maister-*`, osobisty agent pozostaje byte-exact, wszystkie `file://./instructions/...` mają closure, a uninstall usuwa wyłącznie receipt-owned leaf entries.

### Scenario 3: host nie potrafi dowieść dokładnego wywołania

**Given** Cursor lub Kiro materializuje poprawne 28/28, ale wersja hosta nie oferuje bezpiecznego scenario pozwalającego obserwować exact identity, **when** zbierane są dowody, **then** structural/materialization gates mogą przejść, E5 zależy od rzeczywistego discovery, a E6 ma wynik `unavailable`. Release nie raportuje native invocation jako `passed` i workflow nie używa fallbacku.

## Out of Scope

- Migracja, backup, hash-gated cleanup, preservation lub journal dla legacy `.codex/agents/*.toml`; instalacje są clean/from-scratch.
- Nowy ogólny workflow DSL albo redesign całego orchestratora.
- Specjalne uprawnienia, model, readonly, sandbox lub polityka dla `advisor`.
- Dodawanie nowych canonical roles poza istniejącymi 28.
- Ujednolicanie wszystkich hostów do jednego formatu fizycznego.
- Uznanie niewykonanego lub nieweryfikowalnego native probe za sukces.
- Przejmowanie całego `~/.kiro`, projektowych agentów użytkownika albo niespokrewnionych host settings.

## Success Criteria

1. Parser tworzy dokładnie 28 unikalnych ról, a każda spełnia `role_id = filename stem = frontmatter.name`; `advisor` nie posiada wyjątku w IR, manifestach, projekcji ani adapterach.
2. Dwa uruchomienia projectora z tym samym source commit, targetem i wersją manifestu dają identyczne ścieżki, bytes, modes, kolejność oraz `projected_tree_hash`.
3. Każdy target przechodzi normalized parity 28/28, support agents są raportowani osobno, a Kiro ma 100% descriptor-to-prompt reference closure.
4. Install/update/verify/uninstall/rollback zachowuje receipt ownership we wszystkich roots; injected failure odtwarza bytes, modes, symlinki, existence i topology, a niezwiązane `~/.kiro/agents/*` pozostają nietknięte.
5. Każdy workflow logical role rozwiązuje się do jednego dispatch planu; unknown, duplicate, missing projection, collision, unavailable adapter lub digest mismatch kończy się typed error i zerowym fallbackiem.
6. E5 i E6 używają wersjonowanych host-native scenarios; przynajmniej dwie rozróżnialne role oraz zwykły `advisor` przechodzą exact invocation tam, gdzie prerequisite istnieje, a brak prerequisite pozostaje `unavailable`.
7. Repozytorium, init i dokumentacja nie zawierają legacy Advisor/Arbiter TOML installation path ani backward-compatibility code; clean extracted archives przechodzą target-aware lifecycle dla wszystkich trzech hostów.

