# Raport badawczy: issue tracker workflow dla Maistera

## TL;DR
Zaimplementować kanoniczny skill `issue-tracker` i mały helper Node ESM z providerami Local Markdown oraz GitHub.
Tracker zachowuje żywe issue; workflow zapisuje pełny `IssueRef`, niezmienny snapshot i rewizję, a własny stan prowadzi wyłącznie w `orchestrator-state.yml`.
v1 udostępnia configure, capture, bounded list, show/select i jawny start research/quick-plan/development; bez automatycznego close/comment/claim.
Pewność rekomendacji: 87% (średnio-wysoka); przed implementacją trzeba ujednolicić workflow-state schema i zatwierdzić trwałość quick-plan.

## Key Decisions
- Wybrać helper wykonywalny + deklaratywne capabilities, nie prose-as-provider-API.
- Utrwalać `maister-issue://...`; przyjmować krótsze aliasy wyłącznie, gdy rozstrzygają się jednoznacznie.
- Rozwiązać i zsnapshotować issue przed utworzeniem workflow state; późniejszy drift tylko sygnalizować.
- W v1 wdrożyć Local Markdown i GitHub; zostawić GitLab/Jira/Linear za tym samym kontraktem, bez pustych stubów.
- Zachować direct-prompt invocation i istniejące resume jako ścieżki równoległe.

## Open Questions / Risks
- Sprzeczny schemat `orchestrator-state.yml` blokuje wybór jednego kanonicznego miejsca dla `source_issue`.
- `quick-plan` ma różną trwałość na hostach; rekomendowany wspólny artifact proweniencji wymaga decyzji produktowej.
- Nie jest zatwierdzone, czy v1 ma udostępniać tracker mutations poza create; raport rekomenduje osobny późniejszy etap.
- Local locks/atomic replace wymagają jasno zadeklarowanego wsparcia zwykłych lokalnych filesystemów; konflikty Git pozostają manualne.

## 1. Executive recommendation

**Rekomendacja (87%, średnio-wysoka):** zbudować jeden kanoniczny skill `plugins/maister/skills/issue-tracker/` i zależnościowo lekki helper `bin/issue-tracker.mjs`. Skill odpowiada za UX, autoryzację działań i handoff; helper za parser referencji, provider selection, exact schemas, filesystem/API/CLI execution, capability discovery, typed errors, redakcję, local transactions i write reconciliation. Wzorzec pasuje do istniejącego Node ESM i fail-closed runnera, a zarazem ogranicza różnice hostów ([01-maister-internals.md, „Existing Fail-Closed and Test Patterns”](../analysis/findings/01-maister-internals.md); [04-product-quality-tradeoffs.md, „Option C”](../analysis/findings/04-product-quality-tradeoffs.md)).

W v1 publiczny produkt powinien wykonywać tylko operacje potrzebne przez realne journeys: configure/preflight, capture/create, resolve/read, bounded list, show/select oraz handoff. Docelowy kontrakt opisuje również update/comment/labels/transition, lecz ich implementacja i UX powinny wejść dopiero z konkretnym callerem i testami, zgodnie z minimal-implementation standard ([04-product-quality-tradeoffs.md, „v1 Must-Haves vs Later Capabilities”](../analysis/findings/04-product-quality-tradeoffs.md)).

## 2. Model domeny i granica własności

### 2.1 Ubiquitous language

| Pojęcie | Definicja/inwariant |
|---|---|
| `Issue` | Aktualny, mutowalny work item providera. Nie jest workflowem ani źródłem resume. |
| `IssueRef` | Niezmienny kanoniczny locator: provider + authority + container + kind + native ID. |
| `TrackerProvider` | Adapter implementujący znormalizowane operacje i deklarujący capabilities. |
| `CapturedSnapshot` | Niezmienna, timestampowana treść faktycznie użyta do startu workflowu. |
| `SourceRevision` | Native version/ETag/update timestamp lub digest do drift/CAS. |
| `WorkflowTask` | Jedno wykonanie research/plan/development; wiele tasków może pochodzić z jednego issue. |
| `WorkflowState` | `orchestrator-state.yml`: jedyna prawda o fazach, gates, próbach i resume. |
| `Handoff` | Read-only resolve + read + snapshot + workflow initialization. Nie jest synchronizacją. |
| `Drift` | Live revision różni się od rewizji snapshotu; jest raportowany, nie scalany automatycznie. |

Rozdział ten wynika bezpośrednio z projektowego persistence modelu i briefu ([`.maister/docs/project/architecture.md`, „Persistence Model`](../../../../docs/project/architecture.md); [research-brief.md, „Key Decisions”](../planning/research-brief.md)). **Pewność: 98%, wysoka.**

### 2.2 Strict tracker-vs-workflow ownership

| Dane/operacja | Właściciel | Co workflow zachowuje |
|---|---|---|
| Bieżący title/body/comments/labels/assignees/dependencies | Tracker | Snapshot wartości as-of capture, nie live replica |
| Tracker status i native workflow | Tracker | Status as-of capture wyłącznie informacyjnie |
| Stable identity i URL/path | Provider/tracker | Canonical `IssueRef` i użyty URL/path |
| Revision/capture time/digest | Boundary/snapshot | Dokładne metadata wejścia |
| Fazy, gates, decisions, attempts, verification, resume | Maister | Wyłącznie workflow/task state i artefakty |
| Comment/close/claim po workflow | Jawna operacja providera | Receipt/audit, nigdy automatyczne mirrorowanie statusu |

Po inicjalizacji tracker może się zmienić. Resume używa snapshotu; opcjonalny read-only drift check zwraca `unchanged`, `changed`, `deleted_or_inaccessible` albo `unknown_offline`. Nie wolno po cichu przepisać objective ani ukończonych decyzji ([04-product-quality-tradeoffs.md, „Later tracker changes”](../analysis/findings/04-product-quality-tradeoffs.md)). **Rekomendacja: 87%.**

## 3. Architektura v1 i dokładne seam locations

### 3.1 Struktura kanoniczna

```text
plugins/maister/skills/issue-tracker/
├── SKILL.md
├── bin/
│   └── issue-tracker.mjs
├── providers/
│   ├── local.mjs
│   └── github.mjs
└── references/
    ├── provider-contract.md
    └── issue-ref.md
```

Nazwy nowych plików są rekomendacją; miejsca integracji wynikają z kanonicznego/generated ownership ([01-maister-internals.md, „Canonical versus generated ownership” i „Seam Map”](../analysis/findings/01-maister-internals.md)).

| Concern | Kanoniczna lokalizacja | Dokładna zmiana |
|---|---|---|
| Provider config/setup | `.maister/config.yml`; `plugins/maister/skills/init/SKILL.md` | Dodać walidowany `tracker` block; config bez sekretów; read-only preflight. Nie rozszerzać narrow Advisor reconciler — użyć jego transaction pattern w dedykowanym helperze. |
| Publiczny UX | `plugins/maister/skills/issue-tracker/SKILL.md` | Configure, capture, list, show, select, start. Thin commands tylko jeśli alias hosta jest naprawdę potrzebny. |
| Parser/contract/execution | `plugins/maister/skills/issue-tracker/bin/issue-tracker.mjs` | Exact JSON stdin/stdout, stderr diagnostics, fixed argv/API, typed errors, provider dispatch. |
| Unified `/work` | `plugins/maister/commands/work.md`, Steps 1/3; `plugins/maister/agents/task-classifier.md`, Phase 1/output | Resolve raz; classifier dostaje normalized snapshot; ten sam snapshot trafia do wybranego workflowu. |
| Research | `plugins/maister/skills/research/SKILL.md`, Initialization przed utworzeniem workflow | Obsłużyć `--issue`; zapisać `analysis/intake/issue-snapshot.md` i provenance przed briefem. |
| Development | `plugins/maister/skills/development/SKILL.md`, po Detect Research Context, przed Initialize Workflow | Dodać issue intake obok research/design refs; zachować precedence istniejących task paths i direct prose. |
| Quick plan | `plugins/maister/skills/quick-plan/SKILL.md` step 1 + Cursor/Kiro overrides | Resolve/snapshot przed planowaniem; zapisać source block w trwałym plan artifact. |
| Shared state contract | `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md`, obok `research_reference` | Dodać `source_issue` dopiero po ujednoliceniu state schema. Provider execution nie trafia do frameworku. |
| Platform build | `platforms/codex-cli/build.sh`, `platforms/cursor/build.sh`, `platforms/kiro-cli/build.sh` | Packaging resources, command-collapse/argument allowlists, host prompts i plan overrides; potem `make build && make validate`. |

### 3.2 Rekomendowany snapshot layout

Dla research/development:

```text
analysis/intake/
├── issue-ref.yml
└── issue-snapshot.md
```

`issue-ref.yml` zawiera ref, provider key/kind, retrieved_at, source revision, digest, transport, used capabilities, truncation/warnings i path snapshotu — bez credentials. `issue-snapshot.md` zachowuje normalized title/body/status/labels/URL/timestamps oraz wyraźnie oznacza treść jako niezaufaną. `orchestrator-state.yml` przechowuje tylko wspólny `source_issue` pointer/metadata, nie duplikuje body.

**Quick-plan decision:** ujednolicić wszystkie hosty przez trwały `.maister/plans/YYYY-MM-DD-<name>.md` z source block, nawet jeśli Claude/Codex nadal renderują plan w native planning UI. To rekomendacja o **76% pewności**; alternatywa utrzymuje różne audyty na hostach i komplikuje handoff.

## 4. Proposed configuration shape

```yaml
tracker:
  schema_version: 1
  default_provider: local
  providers:
    local:
      kind: local-markdown
      root: .maister/issues
    github:
      kind: github
      host: github.com
      repository: openai/codex
      transport: auto     # api | gh | auto; MCP później jako host adapter
      api_version: "2026-03-10"
      token_env: GITHUB_TOKEN
  policy:
    max_list_items: 100
    require_write_confirmation: true
    allow_stale_snapshot_handoff: false
```

Semantyka:

- `.maister/config.yml` jest jedynym project-local policy source w v1; brak user-global defaults.
- Credentials nie mogą wystąpić w configu. `token_env` jest allowlisted nazwą zmiennej, nigdy wartością.
- Pełny `IssueRef` ustala provider/container. Sprzeczny `--provider` jest błędem.
- Dla capture/list bez ref precedence to: explicit override → configured default → jedyny enabled provider → interaktywne pytanie → fail w noninteractive.
- Po skonfigurowaniu nie wybierać providera z Git remote; remote służy tylko jako setup suggestion.
- Duplicate YAML keys, aliases/anchors w managed blocku, unknown kinds i unsafe paths odrzucać przed I/O i bez zmiany bajtów/mode/topology ([04-product-quality-tradeoffs.md, „Configuration Precedence and Failure Behavior”](../analysis/findings/04-product-quality-tradeoffs.md)). **Pewność: 89–92%.**

## 5. Provider contract

### 5.1 Envelope i operacje

Helper przyjmuje jeden exact-schema JSON request na stdin i wypisuje jeden JSON result na stdout; diagnostics trafiają na stderr. Każdy request zawiera `schemaVersion`, `operation`, `provider`, `context`, `payload`, opcjonalny `operationId` i `precondition`.

Docelowy kontrakt semantic:

```text
capabilities(scope?) -> CapabilitySet
resolve(input, context) -> IssueRef
create(containerRef, draft, operationId?) -> Issue
read(issueRef, fields?) -> Issue
list(containerRef, query, page?) -> IssuePage
update(issueRef, patch, precondition?) -> Issue
comment(issueRef, body, operationId?) -> Comment
setLabels(issueRef, add[], remove[], precondition?) -> Issue
transition(issueRef, targetCategoryOrNativeTransition, precondition?) -> Issue
```

**Implemented/called in v1:** `capabilities`, `resolve`, `create`, `read`, bounded `list`. **Reserved, capability-gated for a later caller:** `update`, `comment`, `setLabels`, `transition`. Nie tworzyć pustych stubów; provider może raportować `unsupported` dopiero, gdy operacja jest częścią zbudowanego kontraktu testowego ([03-tracker-providers.md, „Smallest Common Operation Set”](../analysis/findings/03-tracker-providers.md); [04-product-quality-tradeoffs.md, „Minimum executable boundary”](../analysis/findings/04-product-quality-tradeoffs.md)).

### 5.2 Normalized entities

`Issue` zawiera tylko: `ref`, `webUrl/path`, `title`, raw-source `body`, coarse state (`open|active|done|cancelled|unknown`), labels/tags, opaque assignee refs, created/updated timestamps, `sourceRevision` i `extensions`. Nie round-tripować wszystkich providerów przez Markdown: Jira v3 używa ADF dla rich text ([Jira REST v3 introduction](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)).

`CapabilitySet` dla każdej operacji podaje:

```yaml
status: native | emulated | unsupported | unknown
transport: filesystem | api | cli | mcp
access: read | write
permission: <provider-specific requirement or null>
constraints:
  tier: null
  version: null
  preview: false
  fields: []
reason: <human-readable explanation>
```

Takie constraints są konieczne, bo np. GitLab links zależą od tieru, Jira transitions od workflow/permissions, a Linear states od teamu ([03-tracker-providers.md, „Capabilities That Must Not Be Flattened”](../analysis/findings/03-tracker-providers.md)). **Pewność: 90%.**

### 5.3 Typed errors

```text
invalid_ref | ambiguous_ref | unauthenticated | forbidden | not_found |
validation | conflict | unsupported | rate_limited | unavailable |
offline | precondition_failed | ambiguous_commit | provider_error
```

Każdy error zawiera `retryable`, opcjonalny `retryAt`, `operationDispatched: true|false|unknown`, sanitized provider status/code/request ID, constraint i actionable remediation. Nie zgadywać różnicy 403/404 dla private resources. Linear może zwrócić GraphQL errors z HTTP 200; parser musi sprawdzać envelope, nie tylko status ([Linear GraphQL, „Handling errors”](https://linear.app/developers/graphql#handling-errors)).

### 5.4 Auth, offline, pagination, transport i idempotency

- **Auth:** Local używa OS permissions. GitHub v1 używa fine-grained token/GitHub App/OAuth/`gh` auth z repo-specific Issues read/write; nie logować headerów/tokenów ([GitHub REST authentication](https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api)).
- **Offline:** Local ma `offlineRead=true`, `offlineWrite=true`. Hosted providers nie mają authoritative offline read/write; jawnie wybrany cached snapshot może uruchomić workflow tylko z `stale=true`. Nie kolejkować writes w v1.
- **Pagination:** wszystkie listy mają `limit`, cursor/page metadata i `complete`; GitHub ma domyślnie 30 i `Link` pagination ([GitHub REST pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api)).
- **Rate limits:** honorować `Retry-After` i provider headers; GitHub ma primary i secondary/content-generation limits ([GitHub rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2026-03-10)).
- **Transport:** preflight wybiera jeden transport przed operacją. Read może fallbackować wyłącznie po pewnym non-dispatch failure. Write nie może przełączyć transportu po dispatch bez dowodu braku mutacji.
- **Idempotency:** każda mutation ma lokalny `operationId` zapisany przed dispatch. Create/comment po timeout dostaje `ambiguous_commit`; nie retry automatycznie. Reconciliation po markerze/recent items może nadal zakończyć się `ambiguous_commit`, bo przejrzane create APIs nie gwarantują ogólnego client idempotency key ([03-tracker-providers.md, „Idempotency and concurrency”](../analysis/findings/03-tracker-providers.md)). **Pewność: 85%, średnia.**

## 6. Canonical IssueRef i aliasy

### 6.1 Grammar

```text
maister-issue://<provider>/<authority>/<container-segment>.../<kind>/<native-id>
```

Przykłady:

```text
maister-issue://github/github.com/openai/codex/issue/123
maister-issue://gitlab/gitlab.com/group/subgroup/project/issue/123
maister-issue://jira/acme.atlassian.net/PROJ/issue/PROJ-123
maister-issue://linear/acme-workspace/ENG/issue/ENG-123
maister-issue://local/workspace/issues/issue/550e8400-e29b-41d4-a716-446655440000
```

Reguły: allowlist provider/kind; każdy segment percent-encoded osobno; odrzucić `.`, `..`, encoded separators, control chars i nieskonfigurowane authorities. GitHub/GitLab muszą zawierać pełny repo/project path, bo numery są container-scoped; GitLab rozróżnia globalne `id` i project-scoped `iid` ([GitLab REST, „id vs iid”](https://docs.gitlab.com/api/rest/#id-vs-iid)). Local ID jest UUIDv4/innym opaque random ID i nie zależy od slugu.

### 6.2 Human-friendly aliases

```text
gh:OWNER/REPO#123
gl:GROUP/PROJECT#123
jira:SITE/PROJ-123
lin:WORKSPACE/ENG-123
local:<uuid>
```

Akceptować również allowlisted vendor URLs i `OWNER/REPO#123`. Bare `#123` jest legalne tylko, gdy dokładnie jeden configured provider/container rozstrzyga kontekst i kind. W przeciwnym razie `ambiguous_ref` zwraca kandydatów i przykłady. Alias nigdy nie zastępuje persisted canonical ref ([03-tracker-providers.md, „Canonical Reference Options”](../analysis/findings/03-tracker-providers.md)). **Pewność: 92%.**

## 7. Command/skill UX

Semantyka jest stała, nawet jeśli host renderuje ją jako slash command lub skill.

### 7.1 Configure

```text
$maister:issue-tracker configure
$maister:issue-tracker configure --provider local --root .maister/issues
$maister:issue-tracker configure --provider github --repo OWNER/REPO
```

Workflow: inspect → propose → show diff → validate read-only preflight → ask before config write → atomic reconciliation. GitHub setup nie tworzy labels ani issue. Brak auth kończy się guidance, nie zapisem tokenu.

### 7.2 Capture/add

```text
$maister:issue-tracker capture "Krótki tytuł" --body "..."
$maister:issue-tracker add "Krótki tytuł" --provider github
```

`add` jest aliasem UX dla `capture`, nie osobną operacją provider contract. Capture previewuje provider/target w interactive mode, tworzy dokładnie jedno issue, wypisuje canonical ref i niczego nie uruchamia automatycznie.

### 7.3 List, show i select

```text
$maister:issue-tracker list --status open --limit 20
$maister:issue-tracker show gh:OWNER/REPO#123
$maister:issue-tracker select --provider local --status open
```

List jest bounded i pokazuje provider/status/ref/freshness oraz incomplete marker. Select jest read-only numbered choice i zwraca jedno `IssueRef`; cancel nie mutuje. Noninteractive `--format json` nigdy nie promptuje i używa JSON-only stdout/stderr diagnostics.

### 7.4 Start workflow from issue

```text
$maister:research --issue gh:OWNER/REPO#123
$maister:quick-plan --issue maister-issue://local/workspace/issues/issue/<uuid>
$maister:development --issue https://github.com/OWNER/REPO/issues/123
$maister:work gh:OWNER/REPO#123
```

`work` rozwiązuje issue raz, klasyfikuje snapshot i przekazuje go do wybranego workflowu. Direct text nadal działa. Start workflow nie oznacza claim/comment/close. Jeśli upstream jest offline, task nie powstaje, chyba że użytkownik jawnie wybrał dozwolony stale snapshot.

## 8. Local Markdown design

### 8.1 Layout i schema

```text
.maister/issues/
├── <uuid>.md
└── .locks/
    └── <uuid>.lock/
```

Record ma strict bounded frontmatter: `schema_version`, `id`, `title`, `tracker_status`, `created_at`, `updated_at`, integer `revision`, optional labels; body pozostaje Markdown. Filename authority to UUID, slug jest wyłącznie prezentacyjny. Odrzucić duplicate keys, aliases, unsupported types, NUL, invalid UTF-8, conflict markers w managed metadata i ID niezgodne z filename ([04-product-quality-tradeoffs.md, „Record and identity design”](../analysis/findings/04-product-quality-tradeoffs.md)). **Pewność: 92%.**

### 8.2 Atomic create

1. Zweryfikować schema, bounds, containment i symlinks przed zapisem.
2. Wygenerować random ID; collision oznacza ponowienie ID, nigdy overwrite.
3. Zapisać kompletny record do exclusive, unpredictable temp w tym samym katalogu.
4. Ustawić mode, flush/fsync file, ponownie sprawdzić nonexistence, atomowo opublikować i gdzie wspierane fsync directory.
5. Cleanup temp/lock; po publikacji zwrócić ref i nie retry create w ciemno.

Precedensem są `phase-continue.mjs` `atomicWrite` i Advisor config staging/rollback ([01-maister-internals.md, „Existing Fail-Closed and Test Patterns”](../analysis/findings/01-maister-internals.md)).

### 8.3 Atomic update/concurrency

Per-issue lock jest tworzony atomowo jako `.locks/<id>.lock/` i zawiera owner token, PID, host, timestamp. Po locku provider czyta current record, porównuje `expected_revision`/digest, buduje pełny candidate z `revision+1`, zapisuje same-directory temp, ponownie sprawdza digest i lock ownership, atomowo replace i zwalnia wyłącznie własny token. Timeout kończy się konfliktem bez mutacji. v1 nie kradnie stale locków automatycznie.

Niezależne creates łączą się w Git łatwiej dzięki stable random IDs. Edycje tego samego recordu mogą dać konflikt; provider odrzuca conflict markers i wymaga ręcznego rozwiązania. Nie budować semantic merge drivera w v1. **Pewność: 88%, średnia.**

## 9. GitHub v1 i przyszłe providery

### 9.1 GitHub execution recommendation

Normatywna semantyka v1: GitHub REST API `2026-03-10`, headers `X-GitHub-Api-Version: 2026-03-10` i `Accept: application/vnd.github+json`; `gh 2.96+` może być convenience/auth transport z explicit `--repo`, noninteractive flags i structured JSON. MCP jest opcjonalnym host adapterem, nie core contract ([GitHub API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions?apiVersion=2026-03-10); [official `gh issue`](https://cli.github.com/manual/gh_issue)).

Guaranteed v1 profile:

- resolve canonical URI, GitHub issue URL, `OWNER/REPO#N`, unambiguous `#N`;
- create issue title + optional Markdown body;
- read issue i odrzucić response z `pull_request`, gdy kind=`issue`;
- bounded list repository issues z `type:issue` guard;
- preflight auth/repository/capabilities;
- canonical ref, URL, raw IDs, timestamps, coarse state, source revision i request/rate metadata.

Provider contract może opisywać update/comment/labels/open-close, ale v1 publiczny UX nie musi ich wywoływać. Assignees, milestones, projects, issue types/fields, sub-issues i dependencies są extension capabilities; GitHub API je ma, ale permissions/context mogą je ograniczać lub silently drop metadata, więc constrained writes wymagają read-after-write verification ([GitHub REST Issues](https://docs.github.com/en/rest/issues/issues?apiVersion=2026-03-10); [GitHub issue dependencies](https://docs.github.com/en/rest/issues/issue-dependencies?apiVersion=2026-03-10)). **Pewność: 93%.**

### 9.2 Extension path

- **GitLab:** ten sam core, authority=host, pełny project path, project-scoped IID; state przez `state_event`; links/tier jako native extension ([GitLab Issues API](https://docs.gitlab.com/api/issues/), [Issue links](https://docs.gitlab.com/api/issue_links/)).
- **Jira Cloud:** site + project + issue key; create/edit metadata discovery, ADF, jawne transition IDs; nie mapować open/closed na write operation ([Jira issues/transitions](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)).
- **Linear:** workspace + team + identifier/UUID; GraphQL Relay pagination, team-specific workflow states i OAuth scopes ([Linear GraphQL](https://linear.app/developers/graphql), [pagination](https://linear.app/developers/pagination)).

Każdy nowy provider najpierw przechodzi wspólny conformance suite, potem dostaje real caller. Nie dodawać dynamicznego third-party plugin SDK w v1.

## 10. Co dokładnie reuse/adapt/avoid z `mattpocock/skills`

### Reuse

- repo-local, reviewable configuration i root discovery pointer;
- provider-neutral verbs i human-readable titles z machine refs;
- canonical role vocabulary mapowane na provider labels;
- durable behavioral brief: current/desired behavior, interfaces, acceptance criteria, scope;
- explicit approval przed external publication;
- create blockers first, wire relationships second;
- parent jako index, child jako detail;
- frontier = open + unblocked + unclaimed oraz claim-before-work jako opcjonalna polityka;
- one-ticket/fresh-context handoff;
- audytowalny authorship/AI disclosure jako konfigurowalna polityka.

### Adapt

- prose provider guidance → validated config + typed provider contract + opcjonalna dokumentacja;
- native-first/fallback → capability negotiation z zapisanym wyborem i powodem;
- `ready-for-agent` → opcjonalna tracker-owned intake policy z jasno zdefiniowanym invariantem;
- agent brief/spec/ticket → snapshot z `derived_from`/revision i jednym authoritative input marker;
- frontier/claim/resolve → jawne operacje providerowe poza workflow state, z precondition/receipt;
- labels-as-roles → schema obejmująca oddzielnie category, readiness i native state;
- local Markdown → `.maister/issues/<uuid>.md`, strict metadata, lock/CAS/atomic replace.

### Avoid

- prose jako jedyny executable provider API;
- free-form „Other” bez minimalnego kontraktu i preflight;
- bare numbers/paths jako trwałe identity;
- sprzeczne `.scratch/.../issues/NN-*.md` i `tickets.md` jako dwa canonical layouty;
- wspólne pole `Status:` dla triage role, claim i resolution;
- sequential IDs, „first by number”, edit-in-place i append bez lock/idempotency;
- silent fallback między native relation i body metadata bez source-of-truth;
- automatyczne close/comment/commit wynikające z samego handoff;
- przekazywanie issue content jako instrukcji modelu;
- credentials w repo config, promptach lub logs.

Dowody: [02-mattpocock-skills.md, „Reusable Patterns” i „Weaknesses”](../analysis/findings/02-mattpocock-skills.md). **Pewność: 89–99% zależnie od wzorca.**

## 11. End-to-end journeys

### Journey A — Local capture → research

1. `configure --provider local --root .maister/issues`; walidacja i atomic config write.
2. `capture "Zbadać strategię cache"`; preview, UUID, atomic record, canonical ref.
3. `show` lub oferta startu; user wybiera research.
4. Handoff re-readuje issue pod revision protection, zapisuje `analysis/intake/*`, tworzy research state i brief ze snapshotu.
5. Resume używa `orchestrator-state.yml`; read-only drift może ostrzec o zmianie local recordu.

### Journey B — GitHub capture/select → quick plan

1. Config ustala host/repository/transport; preflight sprawdza auth i issues capability.
2. `capture --provider github` wykonuje jeden create albo `list` + `select` wybiera istniejące issue.
3. `quick-plan --issue <ref>` fetchuje raz, zapisuje trwały source block/snapshot i planuje z normalized objective.
4. Plan approval pozostaje mechanizmem quick-plan; tracker status nie staje się phase status.

### Journey C — existing issue → development

1. `$maister:development --issue <full-ref-or-URL>`; parser waliduje provider/authority/container/kind/id.
2. Provider readuje issue, zapisuje revision/digest i snapshot; start nie mutuje trackera.
3. Development prowadzi analizę/spec/approval/implementation/verification i resume we własnym tasku.
4. Zmiana upstream generuje drift warning; snapshot i ukończone decyzje pozostają bez zmian.
5. Ewentualne completion comment/close jest późniejszą, osobną, idempotency-aware komendą.

## 12. Incremental implementation and migration

### Faza 0 — prerequisites

- Ujednolicić workflow-state schema (`started_phase`/nested phases vs `current_phase`/root phases) i fixture-testować jeden kształt.
- Zatwierdzić quick-plan provenance artifact oraz mutation scope v1.

### Faza 1 — contract + Local Markdown

- Dodać parser `IssueRef`, exact envelopes, errors, capabilities i config validation.
- Wdrożyć Local create/read/list, atomic records, locks/CAS i JSON CLI contract.
- Dodać configure/capture/list/show/select skill UX bez workflow integrations.

### Faza 2 — handoff

- Dodać `source_issue` i snapshot artifacts.
- Zintegrować research, quick-plan, development i `/work`, zachowując direct prose/task paths.
- Dodać drift read-only i transactional task initialization: przy błędzie przed commit nie powstaje task/state.

### Faza 3 — GitHub

- REST-versioned GitHub provider + opcjonalny `gh` transport; mock fixtures, no real writes.
- Auth/repository preflight, bounded pagination, PR rejection, ambiguous-commit behavior.

### Faza 4 — adapters/build/docs

- Zmienić tylko canonical plugin i `platforms/`; zbudować generated variants.
- `make build`, inspect generated diff, `make validate`; zaktualizować config/ref/auth/offline/UX docs.

### Faza 5 — later mutations/providers

- Dopiero z zatwierdzonym callerem: update/comment/labels/transition/claim/resolve.
- GitLab, Jira, Linear kolejno po conformance suite; bez migracji istniejących `.scratch` bez jawnej komendy importu.

Backward compatibility: brak `tracker` blocku nie zmienia istniejących workflowów ani nie tworzy `.maister/issues`; issue features są opt-in. Existing direct descriptions i task-folder resume zachowują znaczenie ([01-maister-internals.md, „Minimum Deterministic Change Set”](../analysis/findings/01-maister-internals.md)).

## 13. Risk-based tests i cross-platform validation

### Critical tests

- contract fixtures Local/GitHub: resolve/create/read/list/capabilities, exact schema, bounded pagination, malformed provider output;
- config precedence i transactional rejection: duplicate/unsafe YAML, contradictory flags, exact unchanged bytes/modes/topology;
- concurrent local create/update, ID collision, stale revision, lock timeout, injected fsync/rename failure, no leaked temp/lock;
- filesystem security: traversal, absolute paths, separators/NUL, symlink root/record/lock, oversized/conflicted records;
- research/quick-plan/development handoff: snapshot/ref/revision/digest, one task on success, zero task/state on precommit failure;
- `/work`: issue resolved once, same snapshot to classifier/workflow, existing task folder still resumes;
- injection/secrets/wrong repo/expired auth/duplicate create timeout; no token in stdout/stderr/snapshot;
- external tests use mocks/fixtures only.

### High/medium tests

- unchanged/changed/deleted/private/offline source; resume from labeled snapshot; no silent rewrite;
- list empty/cancel/JSON/truncated/incomplete; noninteractive never promptuje;
- Git independent creates, same-record conflict, conflict markers;
- API/CLI transport preselection, missing command, rate limit/retry hint, ambiguous dispatch;
- existing config bez tracker blocku i direct workflow regression.

### Cross-platform impact

- **Claude:** canonical skill/helper działa bez generated adapter; thin command opcjonalny.
- **Codex:** command-to-skill transforms kopiują resources; testować collisions, invocation syntax i brak stale Claude vocabulary.
- **Cursor:** public skills są rename'owane; command aliases wymagają `merge_commands_to_skills`; quick-plan override musi dostać source artifact.
- **Kiro:** nowe public entry może wymagać command merge i `$ARGUMENTS` allowlist; external writes nie mogą odziedziczyć headless defaultu; testować chat gates/TUI/delegation/JSON agents.
- Wszystkie host-native automatic-continuation capabilities są obecnie `unsupported`; provider nie może syntetyzować odpowiedzi ani zakładać auto-gate ([01-maister-internals.md, „Cross-host automatic continuation posture”](../analysis/findings/01-maister-internals.md)).

Release gate: `make build && make validate`, z committed generated variants i CI drift check zgodnie z [build-pipeline.md, „Build and Validate Every Platform Before Release”](../../../../docs/standards/global/build-pipeline.md). **Pewność: 99%.**

## 14. Unresolved decisions

1. **Workflow-state schema contradiction — blocker.** Dokumentacja i aktywny research task używają `orchestrator.started_phase` i zagnieżdżonego `orchestrator.phases`; `phase-continue.mjs` wymaga `orchestrator.current_phase` i jednego root `phases`, co potwierdzają fixtures/tests. Przed dodaniem `source_issue` wybrać jeden schema i nie implementować dual-read w providerze ([01-maister-internals.md, „Verified state-schema contradiction”](../analysis/findings/01-maister-internals.md)). **Pewność faktu: 97%.**
2. **Quick-plan persistence.** Zatwierdzić wspólny `.maister/plans/*.md` source/provenance artifact na wszystkich hostach lub jawnie zaakceptować słabszy audyt Claude/Codex. Rekomendacja: wspólny artifact. **Pewność: 76%.**
3. **Mutation scope v1.** Czy poza create wystawić comment/close/claim? Rekomendacja: nie; zachować contract semantics, ale wdrażać dopiero z osobnym UX i approval/receipt. **Pewność: 85%.**
4. **Interactive first-use.** Czy zaoferować atomic one-step Local setup, czy odesłać do configure/init? Rekomendacja: offer z pełnym preview i confirm, bez silent config write. **Pewność: 78%.**
5. **Network filesystems.** Zdefiniować v1 jako supported na ordinary local filesystem; w innych przypadkach preflight/fail diagnostic. **Pewność: 80%.**
6. **Snapshot refresh.** Rekomendacja v1: read-only drift; archived explicit refresh później. **Pewność: 91%.**

## 15. Confidence i implementation handoff

Całościowa pewność: **87% (średnio-wysoka)**. Granice własności, canonical locations, GitHub semantics i build ownership mają wysokie potwierdzenie. Wynik obniżają nierozstrzygnięte schema state, quick-plan provenance, mutation scope i brak realnych write tests/network-filesystem qualification. Szczegółowy reconciliation log znajduje się w [analysis/synthesis.md](../analysis/synthesis.md).

Po zatwierdzeniu decyzji z §14 proponowany handoff do nowej sesji:

```text
$maister:development --research=.maister/tasks/research/2026-07-13-issue-tracker-workflow
```

Pierwszy development scope powinien obejmować wyłącznie Fazy 0–2 (schema prerequisite, contract + Local Markdown + handoff); GitHub można utrzymać jako osobny tracer-bullet po przejściu local/provider conformance suite.
