# Synteza: konfigurowalne trackery issue i przekazanie do workflowu

## TL;DR
Maister powinien dodać małą wykonywalną warstwę providerów z deklaratywnymi capabilities, zaczynając od Local Markdown i GitHub.
Tracker pozostaje właścicielem żywego issue; workflow zapisuje kanoniczny `IssueRef`, niezmienny snapshot i rewizję, a `orchestrator-state.yml` wyłącznie stan wykonania.
Publiczny UX obejmuje konfigurację, capture, list/show/select oraz jawne uruchomienie research, quick-plan lub development z issue.
Rekomendacja ma pewność średnio-wysoką (87%); główne blokery to sprzeczny schemat stanu workflowu i brak wspólnej trwałości `quick-plan`.

## Key Decisions
- Wybrać mały helper wykonywalny + deklaratywne capabilities — daje jeden walidowalny kontrakt bezpieczeństwa na wszystkich hostach.
- Utrzymać ścisłą granicę własności — tracker posiada bieżący backlog, workflow posiada snapshot wejścia i stan wykonania.
- Utrwalać pełny `maister-issue://...`; skróty i URL-e są wyłącznie aliasami wejściowymi.
- Ograniczyć v1 do Local Markdown i GitHub oraz operacji potrzebnych przez capture/list/show/handoff; pozostałe operacje istnieją w kontrakcie jako capability-gated.
- Zachować bez zmian bezpośrednie wywołania workflowów tekstem i istniejącą ścieżkę resume.

## Open Questions / Risks
- Trzeba rozstrzygnąć sprzeczność schematu: `orchestrator.started_phase` i zagnieżdżone `orchestrator.phases` kontra `orchestrator.current_phase` i główne `phases` wymagane przez runner.
- `quick-plan` nie ma wspólnego trwałego stanu: Claude/Codex używają planowania hosta, Cursor/Kiro pliku `.maister/plans/*.md`.
- Do decyzji pozostaje, czy v1 ma wystawić mutation UX poza `capture`; rekomendacja bezpieczeństwa to odłożyć comment/close/claim do osobnego etapu.
- Atomowość i blokady Local Markdown należy ograniczyć w v1 do zwykłych lokalnych systemów plików; Git nadal może generować konflikty semantyczne.

## 1. Odpowiedź syntetyczna

**Rekomendacja (87%, średnio-wysoka).** Dodać kanoniczny skill `plugins/maister/skills/issue-tracker/` z cienkim UX i zależnościowo lekkim helperem Node ESM. Helper ma posiadać parser `IssueRef`, wybór providera/transportu, walidację targetu, Local Markdown transactions, znormalizowane wyniki, typed errors, redakcję sekretów i capability discovery. Workflowy rozwiązują issue i tworzą snapshot **przed** utworzeniem własnego stanu. To najlepiej łączy istniejący model documentation-as-code z precedensem wykonywalnej, fail-closed granicy `phase-continue.mjs` ([01-maister-internals.md, „Seam Map”](findings/01-maister-internals.md); [04-product-quality-tradeoffs.md, „Architecture Options”](findings/04-product-quality-tradeoffs.md)).

Nie należy kopiować modelu `mattpocock/skills` jeden do jednego. Jego repozytoryjna konfiguracja, neutralne czasowniki, frontiers, trwałe briefy i jawny handoff są dobrymi wzorcami; prose-as-API, niejednoznaczne referencje, dwa sprzeczne layouty lokalne, wspólne pole `Status:` i nieatomowe zapisy są zbyt słabe dla bezpiecznego, wielohostowego Maistera ([02-mattpocock-skills.md, „Reusable Patterns” i „Weaknesses”](findings/02-mattpocock-skills.md)).

## 2. Ujednolicona terminologia

| Termin kanoniczny | Znaczenie | Terminologie źródłowe i rozstrzygnięcie |
|---|---|---|
| `Issue` | Bieżący, mutowalny work item odczytany z providera | GitHub issue, GitLab issue/note, Jira issue, Linear issue, lokalny ticket. Nie jest workflowem. |
| `IssueRef` | Niezmienny, provider-qualified locator | Zastępuje niejednoznaczne `#42`, ścieżki i vendor URL jako zapis trwały. |
| `TrackerProvider` | Adapter antykorupcyjny providera | Zastępuje niejawne instrukcje „publish/fetch/claim” jako kontrakt wykonywalny. |
| `ProviderCapability` | Stan operacji: `native`, `emulated`, `unsupported`, `unknown` wraz z ograniczeniami | Nie redukować do boolean, bo tier, wersja, uprawnienia i obiekt wpływają na dostępność. |
| `CapturedSnapshot` | Niezmienna kopia treści użytej do startu workflowu | Nie jest repliką żywego issue; odpowiada na „na jakim wejściu pracowano?”. |
| `SourceRevision` | ETag/update token/timestamp lub digest | Służy do drift/CAS, nie do identyfikacji. |
| `WorkflowTask` | Katalog wykonania research/development lub trwały plan | Może być wiele workflowów z jednego issue. |
| `WorkflowState` | `orchestrator-state.yml`, stan faz/gates/resume | Nie jest backlogiem i nie dziedziczy tracker statusu. |
| `TrackerStatus` | Stan życia issue | Nie nazywać `PhaseStatus`; brak automatycznej synchronizacji. |
| `Handoff` | Resolve + read + snapshot + initialization | Operacja graniczna, nie synchronizacja ani claim. |
| `Drift` | Różnica między live revision a snapshot revision | Pokazać, nigdy nie scalać po cichu. |

Bezpośrednie źródła wspierają rozdział: architektura mówi, że `orchestrator-state.yml` jest źródłem resume, a brief badawczy wyłącza backlog z jego odpowiedzialności ([research-brief.md, „Key Decisions”](../planning/research-brief.md); [04-product-quality-tradeoffs.md, „Domain Glossary”](findings/04-product-quality-tradeoffs.md)). **Pewność: 98%, wysoka.**

## 3. Triangulacja dowodów i sprzeczności

### 3.1 Punkty zgodne

1. **Oddzielenie tracker/workflow.** Wszystkie cztery analizy wspierają model ref + snapshot + workflow state. Bezpośrednim precedensem jest istniejący `research_reference` i kopiowanie kontekstu przez development ([01-maister-internals.md, „State and Content Ownership”](findings/01-maister-internals.md)). **Pewność: 94%, wysoka.**
2. **Jeden wykonywalny boundary.** Repo ma precedens Node ESM, exact schema, idempotency i transactional rejection w `plugins/maister/skills/orchestrator-framework/bin/phase-continue.mjs` oraz testach kontraktowych ([01-maister-internals.md, „Existing Fail-Closed and Test Patterns”](findings/01-maister-internals.md)). **Pewność rekomendacji: 87%, średnia.**
3. **Capabilities zamiast udawanej portowalności.** Oficjalne API różnią się workflowami, relacjami, rich text, assignees i identyfikacją; common core musi być wąski ([03-tracker-providers.md, „Capabilities That Must Not Be Flattened”](findings/03-tracker-providers.md)). **Pewność: 90%, wysoka.**
4. **Local Markdown wymaga prawdziwego protokołu zapisu.** Zainstalowane skills używają sekwencyjnych numerów i edit-in-place; jednocześnie wayfinder dopuszcza równoległą pracę. Opaque ID + lock + expected revision + atomic replace usuwa największe ryzyka ([02-mattpocock-skills.md, „Weaknesses”](findings/02-mattpocock-skills.md); [04-product-quality-tradeoffs.md, „Local Markdown Persistence”](findings/04-product-quality-tradeoffs.md)). **Pewność: 90%, wysoka.**

### 3.2 Sprzeczności i sposób ich zachowania

| Sprzeczność | Dowód | Synteza |
|---|---|---|
| Pełny kontrakt mutation vs minimalny v1 | Category 3 rekomenduje CRUD/comments/labels/state; Category 4 ogranicza v1 UX do capture/list/show/handoff. | Ustalić pełne typy operacji kontraktu, lecz implementować i wystawiać tylko wywoływane operacje v1: capabilities, resolve, create, read, bounded list. Rozszerzać dopiero z callerem i testami. |
| Lokalny układ plików | Template: `.scratch/<feature>/issues/NN-*.md`; `to-tickets`: jeden `tickets.md`. | Nie migrować automatycznie żadnego. Nowy kanoniczny root `.maister/issues/` i opaque IDs; stare layouty pozostają niezarządzane do jawnego importu. |
| Znaczenie `ready-for-agent` | `to-spec` i `to-tickets` nadają je automatycznie; `triage` wymaga autorytatywnego briefu. | W v1 traktować jako opcjonalną tracker-owned politykę wejścia, nie stan workflowu ani wymóg core handoff. |
| Stan workflowu | Dokumentacja/aktywny task używa `started_phase` + `orchestrator.phases`; runner testuje `current_phase` + root `phases`. | To blocker schematu `source_issue`; najpierw wybrać i fixture-testować jeden anchor, nie obsługiwać obu w providerze. |
| Trwałość quick-plan | Native plan na Claude/Codex; plik na Cursor/Kiro. | Rekomendować wspólny minimalny plan/provenance artifact, ale oznaczyć jako decyzję wymagającą zatwierdzenia przed implementacją. |

## 4. Wymagania pochodne

| ID | Wymaganie | Podstawa | Priorytet / pewność |
|---|---|---|---|
| R1 | Project-local, nie-sekretny config providerów z jednoznaczną precedence | Existing `.maister/config.yml`; installed repo-local config | Must / 92% |
| R2 | Capture ma tworzyć dokładnie jedno issue i zwracać pełny `IssueRef` | UX journeys + ambiguous commit analysis | Must / 90% |
| R3 | List/show/select są bounded, read-only, deterministic i wspierają JSON | Continuation stdout/stderr precedent | Must / 91% |
| R4 | Handoff rozwiązuje/refetchuje issue przed init, utrwala snapshot/revision/digest | State ownership triangulation | Must / 94% |
| R5 | Direct prose i task-path resume pozostają kompatybilne | Current workflow contracts | Must / 98% |
| R6 | Capability payload zawiera status, transport, permissions i constraints | Official provider divergence | Must / 90% |
| R7 | Typed errors rozróżniają invalid/ambiguous/auth/conflict/offline/rate/ambiguous commit | Official APIs + fail-closed standards | Must / 91% |
| R8 | Hosted writes nie przełączają transportu po dispatch bez reconciliation | Brak ogólnego idempotency key | Must / 85% |
| R9 | Local records mają opaque ID, strict metadata, atomic writes, locks i CAS | Concurrency analysis | Must / 90% |
| R10 | Issue content jest untrusted data; secrets są poza config/snapshot/log | OWASP + vendor auth docs | Must / 94% |
| R11 | Canonical edits trafiają do `plugins/maister/` i `platforms/`; generated variants tylko przez build | Project architecture/build standard | Must / 99% |
| R12 | GitLab/Jira/Linear wykorzystują ten sam seam bez implementowania ich w v1 | Capability matrix | Should / 86% |

## 5. Porównanie opcji architektonicznych

Skala 1–5; wyższa wartość jest lepsza. Oceny są rekomendacją porównawczą, nie pomiarem.

| Kryterium | A. Prose/config instructions | B. Deklaratywny kontrakt wykonywany przez host | C. Helper wykonywalny + capabilities |
|---|---:|---:|---:|
| Prostota początkowa | 5 | 3 | 3 |
| Deterministyczna generacja | 2 | 4 | 5 |
| Rozszerzalność | 3 | 4 | 4 |
| Escape hatches providera | 5 | 3 | 4 |
| Walidacja/fail-closed | 1 | 3 | 5 |
| Testowalność | 1 | 3 | 5 |
| Bezpieczeństwo | 2 | 3 | 5 |
| Offline Local Markdown | 4 | 4 | 5 |
| Parzystość hostów | 2 | 3 | 5 |
| Koszt migracji | 5 | 4 | 3 |
| Minimalne zależności | 5 | 5 | 4 |

**A — odrzucona jako sole architecture.** Dobra jako dokumentacja/escape hatch, lecz nie daje typów, atomowości ani walidacji. Bezpośredni dowód stanowią templates `mattpocock/skills` ([02-mattpocock-skills.md, „Implicit Provider Interface”](findings/02-mattpocock-skills.md)). **Pewność: 94%.**

**B — niewystarczająca dla write path.** Deklarowanie command templates tworzy mały język programowania i powiela quoting/error semantics między hostami. Może uzupełniać C jako config, nie zastępować boundary. **Pewność: 82%.**

**C — rekomendowana.** Jeden helper zapewnia exact JSON, fixed argv/API, local transactions, typed errors i mocks; skill pozostaje UX/orchestration. Node ESM jest już elementem tech stacku. **Pewność: 87%, ograniczona przez decyzje quick-plan i stan schema.**

## 6. Rekomendowany model v1

### 6.1 Ścisła własność

| Obszar | Tracker | Snapshot | Workflow/task | `orchestrator-state.yml` |
|---|---:|---:|---:|---:|
| Live title/body/comments/labels/assignees/dependencies | Tak | Wartości as-of capture | Nie | Nie |
| Canonical ref i URL/path | Tak | Dokładna użyta wartość | Link/pointer | Pointer + digest |
| Tracker status | Tak | As-of capture | Nie | Nie |
| Revision/capture time/digest | Bieżąca rewizja | Tak | Pliki source | Pointer/digest |
| Fazy/gates/attempts/decisions/verification | Nie | Nie | Artefakty | Wyłączna prawda resume |
| External mutation receipts | Provider/audit | Nie | Audyt operacji | Opcjonalny receipt, nigdy replika statusu |

### 6.2 Canonical seam locations

- `plugins/maister/skills/issue-tracker/SKILL.md` — publiczny UX configure/capture/list/show/select/start.
- `plugins/maister/skills/issue-tracker/bin/issue-tracker.mjs` — strict request/result boundary.
- `plugins/maister/skills/issue-tracker/references/issue-ref.md` — grammar i aliasy.
- `plugins/maister/skills/issue-tracker/providers/local.mjs` i `github.mjs` — v1 adapters; nazwy są rekomendacją.
- `.maister/config.yml` oraz `plugins/maister/skills/init/SKILL.md` — repozytoryjna konfiguracja i setup/upgrade.
- `plugins/maister/commands/work.md` + `plugins/maister/agents/task-classifier.md` — resolve raz, classify snapshot, przekazać ten sam snapshot dalej.
- `plugins/maister/skills/research/SKILL.md` przed initialization; `development/SKILL.md` przed utworzeniem state; `quick-plan/SKILL.md` i Cursor/Kiro overrides przed planning.
- `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` — wspólny typ `source_issue`, dopiero po ujednoliceniu state schema.
- `platforms/codex-cli/build.sh`, `platforms/cursor/build.sh`, `platforms/kiro-cli/build.sh` — tylko niezbędne transformacje, argument allowlists i packaging.

Pełne uzasadnienie tych lokalizacji pochodzi z [01-maister-internals.md, „Seam Map”](findings/01-maister-internals.md). **Pewność: 86%.**

## 7. Confidence i luki dowodowe

| Konkluzja | Pewność | Uzasadnienie |
|---|---:|---|
| Rozdział tracker/workflow | 94% wysoka | Brief + architecture + cztery niezależne analizy. |
| Canonical/generated ownership | 99% wysoka | Dokumentacja, build scripts i testy platformowe. |
| Helper executable jako v1 | 87% średnia | Silny precedent lokalny; wybór architektoniczny, nie istniejąca implementacja. |
| `IssueRef` URI | 92% wysoka | Provider identity requirements + official scoping; dokładna składnia jest decyzją produktu. |
| GitHub v1 core | 93% wysoka | Aktualne oficjalne REST/CLI docs; brak real write testów. |
| Local atomic/concurrency protocol | 88% średnia | Silne precedensy i analiza, ale network filesystem/power-loss niezweryfikowane. |
| Quick-plan provenance | 76% średnia | Faktyczna rozbieżność hostów; brak zatwierdzonego wspólnego modelu. |
| Cała rekomendacja | 87% średnio-wysoka | Ograniczona przez state schema, quick-plan i mutation scope. |

Nie przeprowadzono realnych zapisów do trackerów. GitLab/Jira/Linear zostały ocenione z aktualnej oficjalnej dokumentacji, ale nie mają lokalnych conformance tests. Brak ogólnego idempotency key w przejrzanych create endpoints jest evidence-of-absence, nie dowodem absolutnym ([03-tracker-providers.md, „Idempotency and concurrency”](findings/03-tracker-providers.md)).
