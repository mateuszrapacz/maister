# Raport badawczy: ujednolicone projekcje agentów Maister

## TL;DR
Utrzymaj 28 kanonicznych ról w `plugins/maister/agents/*.md`, parsuj je do jednego manifestu i projektuj deterministycznie w stagingu transakcji.
Codex ma używać generic subagenta z wstrzykniętym promptem, Cursor wygenerowanego plugin-agenta Markdown, a Kiro wygenerowanej pary JSON + prompt w `~/.kiro/agents`.
Każdy workflow wybiera logiczny `role_id`, a adapter mapuje go jawnie na host; brak, kolizja lub niedostępny runtime kończy się fail-closed.
`advisor` jest zwykłą rolą: bez `.codex/agents`, `readonly`, sandboxu i osobnej ścieżki instalacji.

## Key Decisions
- Jedyny behavior owner to `plugins/maister/agents/*.md` — projekcje nie mogą być ręcznie utrzymywanymi kopiami.
- `role_id` jest stemem pliku równym `frontmatter.name`; host-facing ID to deterministyczne `maister-<role_id>`.
- Projector działa po immutable source resolution, wewnątrz staging lifecycle i przed validation/content hash.
- Codex korzysta z runtime injection; Cursor i Kiro z natywnych projekcji hosta.
- Helpery `explore` i Kiro `maister` są `support_agents`, nigdy zamiennikami canonical roles.
- Legacy Codex TOML zostaje usunięty ze źródła rozwiązania; instalacje są clean/from-scratch i nie otrzymują ścieżki migracyjnej.

## Open Questions / Risks
- Codex nie publikuje stabilnego programistycznego spawn schema ani pewnego per-spawn model override.
- Cursor nie dokumentuje precedence plugin-agenta wobec projektu/użytkownika o tej samej nazwie.
- Exact-name delegacja Kiro wymaga wersjonowanego native probe; natural-language routing nie jest wystarczającym dowodem.
- Do ustalenia pozostaje umieszczenie projection digests w receipt lub związanym provenance.

## Odpowiedź wprost

Docelowy przepływ:

```text
canonical Markdown -> agent IR + manifest -> staged projector -> host representation
      -> validation/reference closure -> transaction/receipt -> explicit adapter dispatch
      -> execution record(role_id, source digest, host dispatch ID, result)
```

To jest jedna architektura z trzema natywnymi reprezentacjami. Równość agentów dotyczy identity, behavior source, mapping, failure semantics, ownership i evidence — nie identycznego formatu pliku.

| Metadane | Wartość |
|---|---|
| Typ badania | Mixed technical/requirements research |
| Data | 2026-07-17 |
| Researcher | Maister `research-synthesizer` |

## Metoda i zakres

Badanie połączyło cztery strumienie: canonical projection, Codex runtime, Cursor/Kiro runtime oraz installer/tests/docs. Synteza wyodrębniła sześć potwierdzonych findings. Source trail obejmuje cztery finding artifacts, sześć bezpośrednio linkowanych oficjalnych stron hostów oraz cytowane pliki repozytorium. Źródłami były canonical files, overlaye, materializer i transaction code, testy platform-independent, dokumentacja projektu oraz oficjalne kontrakty hostów. Oddzielnie oceniono declaration, materialization, discovery i invocation.

Zakres obejmuje transformację, instalację, discovery, dispatch, migrację, testy i dokumentację. Nie obejmuje implementacji ani specjalnych uprawnień Advisora.

## Stan obecny

| Host | Obecna projekcja | Canonical parity | Discovery | Invocation | Ocena |
|---|---|---:|---|---|---|
| Codex | 28 canonical Markdownów jako `skills/orchestrator-framework/agents/*.md` | 28/28 | Nie dotyczy native agents; są to plugin resources | `codex.subagent` tylko zadeklarowany; wykonanie niedostępne | Prompt pool poprawny, adapter brak |
| Cursor | 28 ręcznych `agents/*.md` | 27/28; brak `e2e-test-verifier`, extra `explore` | Natywny plugin shape jest udokumentowany | Exact call występuje w prozie, adapter i probe brak | Drift i niepełna parity |
| Kiro CLI | 30 ręcznych JSON pod `.kiro-maister/agents` | 28/28 descriptorów + 2 helpery; 0/30 prompt closure | Root nie jest natywny; Kiro 2.12.1 nie odkrył agentów | Naming mismatch i nieważne referencje blokują dispatch | Projekcja nieoperacyjna |

Kluczowe dowody repozytorium: Codex overlay `plugins/maister/overlays/codex/overlay.yml:21-25`; Cursor assets `plugins/maister/overlays/cursor/assets/agents`; Kiro refs i wyjątek `plugins/maister/lib/distribution/materializer.mjs:627-669`; transaction inventory `plugins/maister/lib/distribution/transaction-manager.mjs:557-647`.

Oficjalne kontrakty: [OpenAI plugin structure](https://learn.chatgpt.com/docs/build-plugins#plugin-structure), [OpenAI subagents/custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents), [Cursor plugins](https://cursor.com/docs/reference/plugins.md), [Cursor subagents](https://cursor.com/docs/subagents.md), [Kiro agent configuration](https://kiro.dev/docs/cli/custom-agents/configuration-reference/) i [Kiro subagents](https://kiro.dev/docs/cli/chat/subagents/). Dostęp: 2026-07-17.

## Kanoniczny inventory i mapowanie logiczne

28 `role_id`:

`advisor`, `bottleneck-analyzer`, `code-quality-pragmatist`, `code-reviewer`, `codebase-analysis-reporter`, `docs-operator`, `e2e-test-verifier`, `gap-analyzer`, `html-companion-writer`, `implementation-completeness-checker`, `implementation-planner`, `information-gatherer`, `production-readiness-checker`, `project-analyzer`, `reality-assessor`, `research-planner`, `research-synthesizer`, `solution-brainstormer`, `solution-designer`, `spec-auditor`, `specification-creator`, `task-classifier`, `task-group-implementer`, `test-suite-runner`, `thermo-nuclear-code-quality-review-subagent`, `thermo-nuclear-review-subagent`, `ui-mockup-generator`, `user-docs-generator`.

| Pole | Reguła |
|---|---|
| Logical ID | `<role_id>`; filename stem musi równać się `frontmatter.name` |
| Workflow ID | `maister:<role_id>` |
| Host-facing ID | `maister-<role_id>` |
| Codex resource | `skills/orchestrator-framework/agents/<role_id>.md` |
| Codex dispatch identity | `maister_<role_id>_<stable-work-item-suffix>`; nie służy do behavior lookup |
| Cursor artifact/name | `agents/<role_id>.md`; frontmatter `name: maister-<role_id>` |
| Kiro descriptor | `~/.kiro/agents/maister-<role_id>.json` |
| Kiro prompt | `~/.kiro/agents/instructions/maister-<role_id>.md` |

Każdy z 28 wierszy stosuje powyższą funkcję. `advisor` nie ma dodatkowych pól. `support_agents.cursor.explore`, `support_agents.kiro-cli.explore` i `support_agents.kiro-cli.maister` mają osobny inventory i nie liczą się do 28/28.

Minimalny IR zawiera: `role_id`, source path, source SHA-256, description, optional model, presentation metadata, skill dependencies i instruction body. Manifest dodaje representation, destinations, external ID, allowlisted transform IDs oraz host tools profile.

## Architektura end-to-end

### Projector

1. Parsuje wszystkie canonical Markdowny z immutable checkout.
2. Odrzuca mismatch filename/name, case-fold/path collision i duplicate ID.
3. Buduje posortowany 28-row manifest oraz osobny support inventory.
4. Emisja odbywa się wyłącznie do pustego transaction staging.
5. Każda zmiana treści jest albo canonical byte source, albo named allowlisted transform z fixture.
6. Validation sprawdza syntax, bijekcję, reference closure, modes, collisions i hashes.
7. Provenance wiąże projector version, manifest digest, canonical-set digest i projected-tree digest.

Projector nie modyfikuje checkout i nie generuje plików w runtime.

### Codex

Canonical role pozostaje packaged prompt resource. Adapter:

1. przyjmuje `maister:<role_id>`;
2. rozwiązuje dokładnie jeden manifest row i weryfikuje digest;
3. składa message envelope z role ID, digestem, pełną instrukcją, task context i output contract;
4. uruchamia generic native subagenta;
5. zapisuje dispatch/result i czeka na wynik.

Nie używa `.codex/agents`, native name discovery ani fallbacku do built-in. Brak generic delegation daje `unavailable`. Required model override bez prawdziwego host control daje `unsupported_model_override`.

### Cursor

Projector emituje wszystkie 28 plugin Markdownów z `name: maister-<role_id>`, przywraca `e2e-test-verifier` i usuwa Advisor-only `readonly`. Workflow mapuje logical ID na exact native type; user boundary może użyć `/maister-<role_id>`. Preflight odrzuca wykrytą unmanaged kolizję, dopóki precedence nie zostanie potwierdzone.

### Kiro CLI

Projector emituje descriptor i prompt razem w natywnym `~/.kiro/agents`. `prompt` ma postać `file://./instructions/maister-<role_id>.md` i musi przejść closure validation względem descriptor directory. Synthetic `maister` parent dostaje `subagent` tool oraz generated exact allowlist. Preflight wykrywa project-local shadow w `.kiro/agents` i fail-closed odrzuca konflikt.

## Instalacja i transakcja

### Zwykły lifecycle

- Projektor działa przed snapshot/commit, a output staje się receipt-owned inventory.
- Update usuwa wyłącznie stare receipt-owned projekcje nieobecne w candidate tree.
- User-modified managed file powoduje drift conflict; brak overwrite/delete.
- Failure po dowolnej mutacji przywraca bytes, modes, symlinks, existence, directory topology, settings i receipt.
- Uninstall usuwa tylko receipt-listed entries i managed settings keys.

### Kiro multi-root

Nie wolno uczynić całego `~/.kiro` Maister-owned. Target Kiro powinien zachować prywatny root `.kiro-maister`, ale dodać deklaratywny leaf-set pod `~/.kiro/agents`: wyłącznie `maister-*.json` oraz odpowiadające receipt-owned prompts. Journal snapshotuje oba obszary; commit używa temp sibling + rename dla wyliczonych plików; verify obejmuje oba; failure odtwarza oba. To jest wymagane rozszerzenie obecnego single-tree transaction seam.

### Czysta instalacja Codex

Legacy `.codex/agents/advisor.toml` i `arbiter.toml` zostają usunięte ze źródła, init i dokumentacji. Instalator nie skanuje poprzedniej topologii, nie wykonuje backupu ani cleanup runtime i nie implementuje kompatybilności wstecznej. Ta decyzja użytkownika zastępuje wcześniejszą rekomendację migracyjną; środowisko wejściowe jest traktowane jako clean/from-scratch.

## Fail-closed invocation contract

Unknown ID, duplicate normalized ID, missing projection, digest mismatch, unresolved reference, unmanaged name collision, niedostępny adapter, unsupported required model i wrong observed identity zatrzymują dispatch. Zabroniony jest cichy fallback do root agent, default, built-in, inline execution lub podobnie nazwanego custom agent.

Execution record minimum: workflow/work-item ID, logical role ID, source digest, external ID, host/version, model/inheritance status, dispatch ID, attempts, timestamps i terminal result/evidence.

## Kryteria akceptacji i macierz testów

| Warstwa | Positive acceptance | Negative proof |
|---|---|---|
| Canonical IR | 28 unique rows, filename=name | duplicate/case/path collision: typed error, zero output |
| Projection | Dwa runy dają identyczne bytes/modes/order/hash | canonical/manifest change invalidates `--check` |
| Parity | 28/28 per host; helpery osobno | missing/extra/substitution daje role-level diff |
| Derivation | Prompt wiąże canonical digest + named transforms | hand edit/undeclared transform fail |
| References | Wszystkie Kiro URI rozwiązują się w staging | brak promptu daje `E_MATERIALIZE_REFERENCE`; brak exemption |
| Advisor equality | Ten sam IR/projector/root/adapter/test path | reject TOML, readonly, sandbox, special destination/branch |
| Ownership | Wszystkie outputs w receipt | omission/tamper fail verify |
| Update/drift | Stale owned pliki usunięte; unrelated preserved | modified stale file: zero-state-change drift error |
| Rollback | Exact restore na każdym injected failure point | porównanie bytes/modes/symlinks/existence/topology |
| Kiro multi-root | Native leaf-set commit/verify/uninstall | unrelated `~/.kiro/agents` zachowany |
| Legacy cleanup | Known templates removed idempotently after backup | modified/unknown/symlink untouched; failure restored |
| Role resolver | Każdy workflow role rozwiązuje się raz | unknown/missing/duplicate/unavailable: no fallback |
| Native discovery | Cursor plugin i Kiro list pokazują oczekiwane IDs | brak runtime/auth/scenario = `unavailable`, nie pass |
| Native invocation | Dwie rozróżnialne role + `advisor` zwracają role-specific result | wrong identity/implicit fallback fail |
| Release | Target-isolated archive, deterministic hash, extracted lifecycle | foreign artifact/missing prompt/stale copy blokuje package |

Istniejące suites do rozszerzenia: `source-materializer.test.mjs`, `overlay-contract.test.mjs`, `installer-transaction.test.mjs`, `target-registry.test.mjs`, `repository-topology.test.mjs`, `evidence-parity-topology.test.mjs`, `parity-release.test.mjs` i `release-package.test.mjs`.

## Dokumentacja do zmiany

- `.maister/docs/project/architecture.md`: IR/projector, staged projection, multi-root Kiro, receipt/provenance i legacy cleanup.
- `.maister/docs/project/tech-stack.md`, `roadmap.md`: projector/manifest i ephemeral generated projections.
- `.maister/docs/standards/global/build-pipeline.md`: projection generate/check, bijection i reference gates.
- `.maister/docs/standards/testing/test-writing.md`: multi-root transaction, stale projections, legacy exact rollback i native evidence.
- `docs/commands.md`: destinations, lifecycle, migration statuses i logical IDs; usunąć Codex Advisor profile claims.
- `docs/workflows.md`: exact role resolver, adapter dispatch, fail-closed unavailable i Advisor equality.
- Init skill/output: `advisor.enabled` pozostaje gate policy; usunąć TOML creation/reconciliation.

## Odrzucone alternatywy

| Alternatywa | Powód odrzucenia |
|---|---|
| 28 native Codex TOML profiles | Nie są plugin component, wymagają project/user discovery i collision policy; generic injection wystarcza |
| Specjalny Codex Advisor profile/read-only/sandbox | Łamie jawną zasadę równości i tworzy drugi lifecycle |
| Ręczne naprawienie Cursor/Kiro assets | Zachowuje drugiego behavior ownera i dalszy drift |
| Runtime generation plików | Omija receipt, release closure, provenance, drift i rollback |
| Generator modyfikujący source checkout | Łamie immutable source binding i komplikuje reproducibility |
| Liczenie plików jako parity | Helpery maskują brak canonical role, a descriptor nie dowodzi prompt closure |
| Natural-language fallback | Nie gwarantuje exact identity i może wykonać złą rolę |
| Przejęcie całego `~/.kiro` | Narusza unmanaged ownership; potrzebny jest wyliczony leaf-set |

## Confidence i niedostępne dowody

- **Wysoka:** canonical inventory, obecne overlay/materializer paths, Cursor 27/28, Kiro wrong root i 0/30 closure, brak executable adapters, transaction ownership/rollback.
- **Średnia-wysoka:** brak repo projectora agentów i rekomendacja staged projector, oparte na pełnym search oraz istniejących seams.
- **Średnia:** przenośność Codex dynamic spawn contract i konkretny Kiro multi-root commit design.
- **Unavailable:** pomyślne native Cursor invocation, Cursor collision precedence, pomyślne exact Kiro delegation, publiczny Codex per-spawn model control i produkcyjne E5/E6 probes.

Ogólna pewność rekomendacji architektonicznej: **wysoka**. Operational support pozostaje **niezweryfikowany**, dopóki native probes nie przejdą.

## Konkretne wejście do `maister:development`

### Komponenty

1. Nowy `agent-projector` + canonical parser + versioned projection manifest/transform registry.
2. Integracja z `materializer.mjs` przed validation/hash oraz usunięcie Kiro reference exemption.
3. Overlaye: Codex resource manifest, wygenerowany Cursor inventory 28/28, wygenerowany Kiro descriptor+prompt i osobne support agents.
4. Target/transaction: deklaratywne additional managed leaf roots dla Kiro, receipt/provenance digests.
5. Runtime: exact resolver, execution record, adaptery Codex/Cursor/Kiro i fail-closed errors.
6. Clean topology: usunięcie legacy Codex TOML ze źródła, init i dokumentacji bez migration runtime.
7. Tests/docs wymienione wyżej; parity baselines zmienić dopiero po przejściu projection gates.

### Kolejność

`IR/manifest -> projector -> materializer/transaction -> host projections -> resolver/adapters -> clean topology -> native/release evidence -> docs`.

### Definition of done

Clean build raportuje 28/28 dla trzech hostów, support roles osobno, zero unresolved refs i zero undeclared prompt drift; install/update/uninstall/rollback zachowują ownership; każdy workflow role mapuje się raz; Advisor nie ma specjalnej gałęzi; pinned native probes rozróżniają co najmniej dwie role i zwykłego Advisora. Brak prerequisites pozostaje `unavailable`, nie pass.

## Konkluzja

Nie pozostają dwie równorzędne architektury. Rekomendowany jest jeden manifest/projector/resolver z host-native reprezentacją: injection dla Codex, Markdown dla Cursor, JSON+prompt dla Kiro. Otwarte kwestie dotyczą schema i native evidence, a nie kierunku architektury.
