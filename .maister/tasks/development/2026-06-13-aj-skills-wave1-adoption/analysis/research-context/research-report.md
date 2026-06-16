# Raport badawczy: Skille Architekt Jutra — analiza i rekomendacje adopcji do Maister

**Data:** 2026-06-09  
**Typ badania:** Mixed (analiza artefaktów + ocena techniczna fit)  
**Źródło:** `/Users/mrapacz/Projects/architekt-jutra-code` (14 skilli)  
**Cel:** Rekomendacja adopcji jako standalone invocable skills (wzorzec `grill-me` / `thermos`)

---

## Streszczenie wykonawcze

Przeanalizowano **14 skilli** z repozytorium Architekt Jutra (5 039 linii SKILL.md) w porównaniu z **18 skillami** Maister. Maister jest silny w orchestracji SDLC (development, research, product-design), weryfikacji (thermo-nuclear, implementation-verifier) i narzędziach on-demand (`grill-me`, `thermos`). **Brakuje mu jednak całego klastra DDD, krytyki jakości wymagań, audytu procesu decyzyjnego w spotkaniach oraz weryfikacji granic językowych bounded contextów.**

### Kluczowe wnioski

| Wniosek | Szczegóły |
|---------|-----------|
| **6 skilli — adopcja HIGH** | `requirements-critic`, `transcript-critic`, `problem-classifier`, `metaprogram-classifier`, `test-strategy-reviewer`, `linguistic-boundary-verifier` |
| **5 skilli — adopcja MEDIUM** (bundle DDD) | `context-distiller`, `aggregate-designer`, `accounting-archetype-mapper`, `pricing-archetype-mapper`, `archetype-scanner` |
| **1 skill — LOW** | `research-gatherer` — overlap z `maister:research`; lepiej `--gather-only` mode |
| **2 skille — NIE rekomendowane** | `aj-kg-query` (Neo4j MCP), `incident-diagnosis-review` (ATIF evaluator) |
| **Duplikat rozstrzygnięty** | `transcript-critic` ≠ `requirements-critic` — błąd frontmatter w AJ, różne workflow |

### Rekomendowany pierwszy krok

**Wave 1:** Port `requirements-critic`, `transcript-critic`, `problem-classifier` — natychmiastowa wartość, minimalne zależności, brak MCP/subagentów.

---

## 1. Kontekst i metodologia

### Pytanie badawcze

> Wyciągnij wszystkie skille z architekt-jutra-code, przeanalizuj i skategoryzuj każdy, i zarekomenduj które można adoptować do pluginu Maister jako standalone invocable skills (podobnie do `grill-me` lub `thermos`).

### Metodologia

1. **Katalog** — pełny odczyt 14 plików `SKILL.md` z AJ
2. **Klasyfikacja** — taksonomia 7 kategorii funkcjonalnych
3. **Baseline** — mapowanie 18 skilli Maister (orchestrator / engine / on-demand)
4. **Macierz porównawcza** — overlap / complement / gap (AJ × Maister)
5. **Scoring** — 6 wymiarów × 1–5 pkt → tier high/medium/low/not recommended
6. **Rekomendacje** — integracja, bundle, roadmap

### Kryteria adopcji (6 wymiarów)

| Wymiar | Wysoki fit | Niski fit |
|--------|------------|-----------|
| Generic SDLC value | Przydatne w każdym projekcie | Wymaga AJ platform / Neo4j KG |
| Standalone invocability | Jak `grill-me` — paste input, guided output | Wymaga orchestrator state / MCP |
| Maister gap | Brak pokrycia w Maister | Duplikuje development/research |
| Portability | AskUserQuestion, Read, Grep | Hard-coded non-Maister subagents |
| Plugin conventions | Kebab-case, <1k lines, thin command | Coupling do AJ paths |
| Distribution | Bez extra MCP | Neo4j, ATIF artifacts |

---

## 2. Pełny inwentarz 14 skilli AJ

### Tabela zbiorcza

| # | Skill | Kategoria | Język | Linie | Tier adopcji |
|---|-------|-----------|-------|-------|--------------|
| 1 | `transcript-critic` | Requirements & critique | EN | 213 | **High** |
| 2 | `requirements-critic` | Requirements & critique | PL/EN | 261 | **High** |
| 3 | `problem-classifier` | Domain modeling — classification | PL/EN | 487 | **High** |
| 4 | `metaprogram-classifier` | Communication / stakeholder | PL/EN | 472 | **High** |
| 5 | `aggregate-designer` | Domain modeling — transformation | PL/EN | 540 | **Medium** |
| 6 | `pricing-archetype-mapper` | Domain modeling — transformation | PL/EN | 591 | **Medium** |
| 7 | `archetype-scanner` | Domain modeling — orchestration | EN | 237 | **Medium** |
| 8 | `accounting-archetype-mapper` | Domain modeling — transformation | PL/EN | 547 | **Medium** |
| 9 | `context-distiller` | Domain modeling — transformation | PL/EN | 483 | **Medium** |
| 10 | `research-gatherer` | Research & gathering | EN | 480 | **Low** |
| 11 | `test-strategy-reviewer` | Review & verification | EN | 196 | **High** |
| 12 | `linguistic-boundary-verifier` | Architecture & boundaries | EN | 334 | **High** |
| 13 | `incident-diagnosis-review` | Review & verification (AJ-specific) | EN | 61 | **Not recommended** |
| 14 | `aj-kg-query` | Platform-specific | EN | 137 | **Not recommended** |

### Opisy poszczególnych skilli

#### 1. `transcript-critic`

**Kategoria:** Requirements & critique (faktycznie: audyt procesu decyzyjnego w spotkaniach)

Audytuje transkrypty spotkań pod kątem ukrytych problemów decyzyjnych: fałszywy konsensus, eskalacja opinii do faktów, marginalizowane głosy, ukryte zależności, dryf scope'u, niedopasowanie severity, dynamika władzy. Produkuję raport z cytatami dowodowymi i pytaniami diagnostycznymi — **nie** podsumowanie. 7 niezależnych checków, brak interakcji z użytkownikiem (`AskUserQuestion` nieużywane). **Uwaga:** frontmatter jest błędnie skopiowany z `requirements-critic` — body implementuje inny workflow.

#### 2. `requirements-critic`

**Kategoria:** Requirements & critique

Interaktywna krytyka jakości wymagań. 4 checki: problem vs rozwiązanie, CRUD vs observable behavior (z interaktywną reformulacją user stories), mapa sygnałów ukrytych decyzji domenowych, sondowanie sztywnych kwantyfikatorów. Silny guard invocation: tylko na explicit request („criticize", „critique", „review this ticket"). Heavy `AskUserQuestion` przy Check 2 i 3. Wzorzec idealny dla Maister on-demand utility.

#### 3. `problem-classifier`

**Kategoria:** Domain modeling — classification

Klasyfikuje wymagania do 4 klas problemów DDD: CRUD, Transformation & Processing (T&P), Integration, Resource Contention (RC). Sondy dyskryminacyjne via `AskUserQuestion`, confidence + evidence, opcjonalna dekompozycja composite requirements. Przy RC oferuje handoff do `aggregate-designer`. Fundament całego DDD pack — standalone bez kontekstu kursu AJ.

#### 4. `metaprogram-classifier`

**Kategoria:** Communication / stakeholder interaction

Rozpoznaje 7 NLP metaprogramów (similarities/differences, detail/big-picture, internal/external reference, away-from/toward, reactive/proactive, necessity/possibility, self/others). Generuje strategie komunikacji — **nie** typowanie osobowości. Uzupełnia `grill-me` (który stress-testuje *twój* plan, a nie filtry komunikacyjne rozmówcy). Wiele przykładów markerów po polsku.

#### 5. `aggregate-designer`

**Kategoria:** Domain modeling — transformation

Interaktywny wizard projektowania jednostek spójności (aggregates): fit check, ekstrakcja komend, macierz konfliktów, sekwencjonowanie procesów biznesowych, sondy volume/frequency, scope danych, decyzje inclusion/exclusion, strategia locking, finalny diagram ASCII + model. Multi-phase z confirmation gates. Naturalny follow-on po `problem-classifier` (ścieżka RC).

#### 6. `pricing-archetype-mapper`

**Kategoria:** Domain modeling — transformation

Mapuje domeny z obliczanymi cenami/stawkami na model Pricing Archetype (poziomy złożoności 1–9): Calculator, Component tree, Validity versioning, Applicability, Parameters, product-pricing mapping. Fit test odrzuca domeny accounting/state-machine. Hard stop przy misfit.

#### 7. `archetype-scanner`

**Kategoria:** Domain modeling — orchestration

Orkiestruje równoległą ocenę fit wszystkich archetypów z registry. Jeden Agent per archetype w single parallel message, merge agent konsoliduje wyniki (`fit/` directory). Wymaga adaptacji: hard-coded `subagent_type` → Maister Task tool + skill dir refs. Ship **po** mapperach.

#### 8. `accounting-archetype-mapper`

**Kategoria:** Domain modeling — transformation

Mapuje domeny śledzenia wartości (pieniądze, punkty, quota, kredyty) na model ledger: accounts, transactions, double-entry, reversals, validity, allocation strategy. Fit test odrzuca state machines i relationship graphs.

#### 9. `context-distiller`

**Kategoria:** Domain modeling — transformation

Destyluje bounded contexts przez dwukierunkową analizę lingwistyczną (generalizacja + ambiguity). Dwa tryby: pełna destylacja domeny lub single-concept probe. Produkuję mapę kontekstów z generalized/specific contexts i integration notes. Pary z `linguistic-boundary-verifier` (discovery vs verification).

#### 10. `research-gatherer`

**Kategoria:** Research & gathering

Lekki orchestrator research: plan → parallel information-gatherer-lite → merge + cross-verify. **Zatrzymuje się przed syntezą** — raw findings corpus. Unique features: declarative conclusion tagging, actor-map, rejected-info audit trail. **Substantial overlap** z `maister:research` Phase 1–2. Nie adoptować jako top-level skill.

#### 11. `test-strategy-reviewer`

**Kategoria:** Review & verification

Read-only review: klasyfikuje kod produkcyjny wg problem class (Transformation, Stateful Object, Integration), porównuje strategię testów (output/state/interaction-based) z rekomendacją, raportuje MISMATCH z sugestiami. Nie reviewuje naming/coverage. Uzupełnia `reviews-code` i thermo reviews — inna rubryka.

#### 12. `linguistic-boundary-verifier`

**Kategoria:** Architecture & boundaries

Wykrywa language leakage między bounded contexts (strings, events, API calls) via `language.md` per module. Dwa tryby: cross-module boundary check lub single-module `--pr` mode. Proponuje fixy (generalization, ACL, dependency inversion). Wymaga konwencji `language.md` w projekcie docelowym.

#### 13. `incident-diagnosis-review` — NIE rekomendowane

**Kategoria:** Review & verification (AJ-specific)

Evaluator rubric dla AI agentów w scenariuszach incydentów produkcyjnych. Wymaga ATIF trajectory (`agent/trajectory.json`), `ground_truth_decisions.json`, workspace artifacts. Nie przenośliwe do generic Maister distribution.

#### 14. `aj-kg-query` — NIE rekomendowane

**Kategoria:** Platform-specific

Query AJ platform knowledge graph via Neo4j MCP (`neo4j-aj-kb`). Cypher recipes dla strukturalnych pytań o moduły, encje, endpointy. Lock-in na AJ ontology — zastąpić codebase search / `codebase-analyzer`.

---

## 3. Analiza luk vs Maister (gap analysis)

### Macierz overlap / complement / gap

| Obszar capability Maister | Status | AJ skills wypełniające lukę |
|---------------------------|--------|-------------------------------|
| Requirements quality critique | **Gap** | `requirements-critic` |
| Meeting decision-process audit | **Gap** | `transcript-critic` |
| DDD problem classification | **Gap** | `problem-classifier` |
| DDD strategic design | **Gap** | `context-distiller` |
| DDD archetype mapping | **Gap** | `accounting-archetype-mapper`, `pricing-archetype-mapper` |
| DDD aggregate design | **Gap** | `aggregate-designer` |
| DDD archetype orchestration | **Gap** | `archetype-scanner` |
| Bounded-context language verification | **Gap** | `linguistic-boundary-verifier` |
| Test strategy vs problem class | **Complement** | `test-strategy-reviewer` |
| Stakeholder communication analysis | **Complement** | `metaprogram-classifier` |
| Research gathering | **Overlap** | `research-gatherer` ≈ `maister:research` |
| Platform KG query | **AJ-specific** | `aj-kg-query` |
| Incident AI evaluation | **AJ-specific** | `incident-diagnosis-review` |

### Co Maister już ma (bez potrzeby adopcji AJ)

| Maister capability | Skills / commands |
|--------------------|-------------------|
| Workflow orchestration | `development`, `research`, `product-design`, `migration`, `performance` |
| Interactive stress-test | `grill-me` |
| Parallel branch review | `thermos`, `thermo-nuclear-*` |
| Code/spec/production review | `reviews-code`, `reviews-pragmatic`, `reviews-spec-audit`, `reviews-reality-check`, `reviews-production-readiness` |
| Post-implementation verification | `implementation-verifier` |
| Standards management | `standards-discover`, `standards-update` |
| Quick bugfix | `quick-bugfix` |

### Kluczowy wniosek gap analysis

**11 z 14 skilli AJ wypełnia genuine gaps** w Maister. Jedyny meaningful overlap to `research-gatherer` (rozwiązać przez rozszerzenie `maister:research`, nie nowy skill). Dwa pozostałe są platform-specific i wykluczone z briefu.

---

## 4. Ranking adopcji (wszystkie 14 skilli)

### Scoring (6 wymiarów, max 30 pkt)

| Skill | Score | Tier | Rekomendacja |
|-------|:-----:|:----:|--------------|
| `transcript-critic` | 30 | **High** | Adopt — fix frontmatter |
| `requirements-critic` | 29 | **High** | Adopt — strip `maister:` prefix |
| `problem-classifier` | 29 | **High** | Adopt — fundament DDD pack |
| `metaprogram-classifier` | 28 | **High** | Adopt — stakeholder pack |
| `test-strategy-reviewer` | 28 | **High** | Adopt — reviews-* command |
| `context-distiller` | 28 | **Medium** | Adopt — DDD pack Phase B2 |
| `aggregate-designer` | 28 | **Medium** | Adopt — DDD pack Phase B4 |
| `accounting-archetype-mapper` | 28 | **Medium** | Adopt — DDD pack Phase B3 |
| `pricing-archetype-mapper` | 28 | **Medium** | Adopt — DDD pack Phase B3 |
| `linguistic-boundary-verifier` | 27 | **High** | Adopt — wymaga `language.md` convention |
| `archetype-scanner` | 22 | **Medium** | Adapt — po mapperach + registry |
| `research-gatherer` | 16 | **Low** | Embed w `maister:research` |
| `incident-diagnosis-review` | 14 | **Not rec.** | Exclude |
| `aj-kg-query` | 9 | **Not rec.** | Exclude |

**Progi:** High ≥27 | Medium 22–26 | Low 17–21 | Not recommended ≤16

---

## 5. Notatki integracyjne — top 5 kandydatów

### 1. `requirements-critic`

| Aspekt | Wartość |
|--------|---------|
| **Katalog** | `plugins/maister/skills/requirements-critic/` |
| **Frontmatter** | `name: requirements-critic` (bez `maister:` prefix) |
| **Command** | `commands/quick-requirements-critic.md` → `/maister:quick-requirements-critic` |
| **Pattern** | `grill-me` + `disable-model-invocation: true` |
| **Dependencies** | `AskUserQuestion` only |
| **Effort** | S (<1 dzień) |
| **Overlap mitigation** | Explicit-only guard — nie uruchamia się podczas pisania wymagań w `development` |
| **Adaptacje** | Strip `maister:` prefix z AJ; zachować bilingual PL/EN; dodać wpis CLAUDE.md |

### 2. `transcript-critic`

| Aspekt | Wartość |
|--------|---------|
| **Katalog** | `plugins/maister/skills/transcript-critic/` |
| **Command** | `commands/quick-transcript-critic.md` |
| **Pattern** | Explicit-only, no state, EN-native |
| **Dependencies** | None |
| **Effort** | S |
| **Adaptacje** | **Naprawić frontmatter** (obecnie kopiuje opis requirements-critic); dodać `disable-model-invocation: true` |

### 3. `problem-classifier`

| Aspekt | Wartość |
|--------|---------|
| **Katalog** | `plugins/maister/skills/problem-classifier/` |
| **Command** | `commands/quick-problem-classifier.md` |
| **Pattern** | Trigger-phrase on-demand + `AskUserQuestion` probes |
| **Dependencies** | Optional chain → `aggregate-designer` (Wave 3) |
| **Effort** | S |
| **Adaptacje** | EN description parity w frontmatter; fix cross-ref typo w aggregate-designer (`problem-class-classifier` → `problem-classifier`) |

### 4. `test-strategy-reviewer`

| Aspekt | Wartość |
|--------|---------|
| **Katalog** | `plugins/maister/skills/test-strategy-reviewer/` |
| **Command** | `commands/reviews-test-strategy.md` → `/maister:reviews-test-strategy` |
| **Pattern** | Read-only rubric + `disable-model-invocation: true` |
| **Dependencies** | Read test + production code paths |
| **Effort** | S |
| **Overlap mitigation** | Pozycjonować obok `reviews-code` — strategy alignment vs code quality |

### 5. `linguistic-boundary-verifier`

| Aspekt | Wartość |
|--------|---------|
| **Katalog** | `plugins/maister/skills/linguistic-boundary-verifier/` |
| **Command** | `commands/reviews-linguistic-boundaries.md` |
| **Pattern** | Read-only audit, grep-based |
| **Dependencies** | `language.md` per module (nowa konwencja Maister) |
| **Effort** | M (port + convention docs) |
| **Adaptacje** | Udokumentować prerequisite `language.md`; rozważyć future skill do generowania `language.md` draft |

### Wspólny checklist portowania (każdy skill)

1. Utworzyć `plugins/maister/skills/<kebab-name>/SKILL.md`
2. Ustawić frontmatter: plain `name:` dla on-demand
3. Znormalizować `AskUserQuestion` (build transform obsługuje platformy)
4. Opcjonalnie `disable-model-invocation: true` dla explicit-only
5. Opcjonalnie thin command w `plugins/maister/commands/`
6. Wpis 5–15 linii w CLAUDE.md Available Skills
7. `make build && make validate` + update Kiro Makefile skill counts
8. **Nigdy** nie edytować `plugins/maister-cursor/`, `maister-copilot/`, `maister-kiro/` bezpośrednio

---

## 6. Rekomendowane bundle

### Bundle A: Requirements Quality Pack

| Element | Wartość |
|---------|---------|
| **Skille** | `requirements-critic`, `transcript-critic` |
| **Commands** | `quick-requirements-critic`, `quick-transcript-critic` |
| **Use case** | Hardening wymagań przed implementacją — audyt spotkań *i* krytyka speców |
| **Flow** | Spotkanie → `transcript-critic` → pytania → `requirements-critic` na user stories |
| **Faza** | Wave 1 — ship razem, brak inter-skill deps |

### Bundle B: DDD Modeling Pack (fazowany)

| Faza | Skille | Zależność |
|------|--------|-----------|
| **B1 — Classification** | `problem-classifier` | Brak |
| **B2 — Strategic design** | `context-distiller`, `linguistic-boundary-verifier` | B1 opcjonalnie; `language.md` dla verifier |
| **B3 — Pattern mapping** | `accounting-archetype-mapper`, `pricing-archetype-mapper` | B1 fit tests |
| **B4 — Consistency units** | `aggregate-designer` | B1 ścieżka RC |
| **B5 — Orchestration** | `archetype-scanner` | B3 mappers + Maister registry adapt |

**Commands:** `modeling-*` (nowa kategoria, 5 commands)  
**Use case:** DDD/event storming w ramach Maister SDLC bez kontekstu kursu AJ

### Bundle C: Architecture Review Pack

| Element | Wartość |
|---------|---------|
| **Skille** | `linguistic-boundary-verifier`, `test-strategy-reviewer` |
| **Commands** | `reviews-linguistic-boundaries`, `reviews-test-strategy` |
| **Use case** | Periodic architecture health — language boundaries + test strategy |
| **Pairing** | Po `thermos` na tym samym PR scope: code risk + linguistic leakage + test strategy |

### Bundle D: Stakeholder Communication Pack

| Element | Wartość |
|---------|---------|
| **Skille** | `metaprogram-classifier` + existing `grill-me` |
| **Use case** | Przygotowanie do trudnych rozmów — diagnoza filtrów rozmówcy, potem stress-test propozycji |
| **Nowy skill** | Tylko `metaprogram-classifier`; pairing udokumentować w CLAUDE.md |

### Bundle E: Wykluczone / defer

| Skill | Disposition |
|-------|-------------|
| `research-gatherer` | `--gather-only` mode w `maister:research` |
| `aj-kg-query` | Exclude — Neo4j MCP |
| `incident-diagnosis-review` | Exclude — ATIF evaluator |

---

## 7. Fazowany roadmap adopcji

```
Wave 1 (natychmiastowa wartość)
├── requirements-critic      [S]
├── transcript-critic        [S]
└── problem-classifier       [S]

Wave 2 (review + komunikacja)
├── test-strategy-reviewer           [S]
├── linguistic-boundary-verifier     [M]
└── metaprogram-classifier           [S]

Wave 3 (DDD pack core)
├── context-distiller                [S]
├── aggregate-designer               [S]
├── accounting-archetype-mapper      [S]
└── pricing-archetype-mapper         [S]

Wave 4 (orchestracja DDD)
└── archetype-scanner                [M/L]

Defer / Exclude
├── research-gatherer → maister:research extension
├── aj-kg-query → exclude
└── incident-diagnosis-review → exclude
```

| Wave | Skille | Effort | Wartość dla użytkownika |
|------|--------|--------|-------------------------|
| **Wave 1** | requirements-critic, transcript-critic, problem-classifier | 3× S | On-demand utility; krytyka wymagań + klasyfikacja DDD |
| **Wave 2** | test-strategy-reviewer, linguistic-boundary-verifier, metaprogram-classifier | 2× S + 1× M | Architecture review + stakeholder communication |
| **Wave 3** | context-distiller, aggregate-designer, 2× mappers | 4× S | Pełny DDD modeling toolkit |
| **Wave 4** | archetype-scanner | 1× M/L | Parallel archetype scan |
| **Defer** | research-gatherer | — | Rozszerzenie istniejącego orchestratora |
| **Exclude** | aj-kg-query, incident-diagnosis-review | — | Platform lock-in |

**Effort key:** S = port SKILL.md + command + CLAUDE.md (<1 dzień) | M = + convention docs | L = + subagents/registry

### Szacowany effort całkowity

| Scope | Skills | Effort |
|-------|--------|--------|
| Wave 1–2 (high priority) | 6 | ~6–8 dni |
| Wave 3 (DDD core) | 4 | ~4 dni |
| Wave 4 (scanner) | 1 | ~2–3 dni |
| **Total adoptable** | **11** | **~12–15 dni** implementacji |

---

## 8. Relacje między skillami (do zachowania przy adopcji)

```
problem-classifier ──(RC)──► aggregate-designer
context-distiller ──(boundaries)──► linguistic-boundary-verifier
archetype-scanner ──(parallel)──► accounting-archetype-mapper
                               └──► pricing-archetype-mapper
problem-classifier ──(classifies code)──► test-strategy-reviewer
transcript-critic ──(questions)──► requirements-critic
metaprogram-classifier + grill-me ──(pairing)──► stakeholder prep
```

Cross-references w SKILL.md powinny używać kebab dir names (`problem-classifier`, nie `maister:problem-classifier`).

---

## 9. Otwarte pytania i poziom pewności

| Pytanie | Odpowiedź | Pewność |
|---------|-----------|---------|
| Czy transcript-critic i requirements-critic to duplikaty? | **Nie** — błąd frontmatter | Wysoka |
| Czy DDD skills działają bez kursu AJ? | **Tak** — self-contained | Wysoka |
| Czy adoptować research-gatherer? | **Nie** — overlap z research | Wysoka |
| Czy archetype-scanner jest przenośliwy? | **Częściowo** — registry adapt needed | Średnia |
| Czy party mapper jest planowany w AJ? | Template refs party; registry ma 2 | Średnia |
| `disable-model-invocation` dla critique? | Rekomendowane dla requirements/transcript | Średnia |
| Nowa kategoria `modeling-*` commands? | Compatible z flat layout | Wysoka |

---

## 10. Następne kroki (post-research)

1. **Decyzja produktowa:** Zatwierdzenie Wave 1 scope (3 skille)
2. **Implementacja:** `/maister-development` per skill lub batched epic
3. **Dokumentacja:** Backfill `grill-me`/`thermos` w CLAUDE.md + nowe wpisy
4. **Konwencja `language.md`:** Standard w `.maister/docs/standards/` przed Wave 2
5. **research-gatherer:** Feature request `--gather-only` w `maister:research` zamiast portu

---

## Źródła

| Artefakt | Ścieżka |
|----------|---------|
| AJ skills (14) | `/Users/mrapacz/Projects/architekt-jutra-code/**/SKILL.md` |
| Maister skills (18) | `plugins/maister/skills/**/SKILL.md` |
| Maister commands | `plugins/maister/commands/*.md` |
| Plugin standards | `.maister/docs/standards/global/plugin-development.md` |
| Build pipeline | `.maister/docs/standards/global/build-pipeline.md` |
| Research brief | `planning/research-brief.md` |
| Research plan | `planning/research-plan.md` |
| Gatherer findings | `analysis/findings/*.md` |
| Synthesis | `analysis/synthesis.md` |

---

*Raport wygenerowany w ramach workflow `maister:research`. Implementacja skilli — osobny epic development.*
