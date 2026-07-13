# Eksploracja rozwiązań: issue tracker workflow dla Maistera

## TL;DR
Najsilniejszy wariant łączy mały helper Node ESM z deklaratywnymi capabilities, korzeniowym `source_issue` i trwałym artifactem quick-plan na każdym hoście.
v1 powinno dostarczyć Local Markdown, następnie GitHub, oraz ograniczyć mutacje do jawnego capture; handoff pozostaje read-only.
Local Markdown wymaga atomic replace, per-record lock i CAS, ale wyłącznie na zwykłych lokalnych filesystemach.
Łączna pewność kierunku: 86% (średnio-wysoka); najpierw trzeba ujednolicić schemat `orchestrator-state.yml`.

## Key Decisions
- Granica providerów: wykonywalny helper Node ESM z exact JSON i deklaratywnym `CapabilitySet`.
- Proweniencja: korzeniowy `source_issue` wskazuje niezmienny snapshot, ale nie przejmuje własności backlogu.
- Quick-plan: wspólny `.maister/plans/*.md` na wszystkich hostach, także gdy host równolegle pokazuje native plan UI.
- v1 mutations: wyłącznie `capture/create`; comment, claim, close i transition są odroczone.
- Dostarczanie: Local Markdown jako tracer, potem GitHub za tym samym conformance contract.

## Open Questions / Risks
- Sprzeczne warianty schema state (`started_phase`/nested phases i `current_phase`/root phases) muszą zostać ujednolicone przed dodaniem `source_issue`.
- Założenia o `rename`, `fsync` i lockach nie obejmują network filesystems; preflight musi ograniczyć wspierany profil v1.
- GitHub write path nie ma potwierdzonego ogólnego idempotency key; timeout po dispatch może pozostać `ambiguous_commit`.
- Trwały artifact quick-plan zmienia dotychczasową praktykę Claude/Codex i wymaga testów parytetu hostów.

## 1. Metoda i reguły wyboru

Eksploracja zaczęła się od dywergencji HMW/SCAMPER, a dopiero potem oceniła warianty. Porządek obszarów jest sekwencyjny: decyzja 1 ustala granicę wykonawczą, 2 miejsce proweniencji, 3 jej zachowanie dla quick-plan, 4 dozwolone mutacje, 5 protokół Local Markdown, a 6 kolejność dostarczenia.

Każda macierz używa pięciu perspektyw w skali 1–5: **T** — wykonalność techniczna, **U** — wpływ na użytkownika, **S** — prostota, **R** — bezpieczeństwo i odwracalność, **Sc** — skalowalność/rozszerzalność. Wagi wynoszą odpowiednio 25%, 20%, 20%, 25% i 10%; wynik ważony jest następnie mnożony przez pewność dowodów, dlatego dobrze brzmiąca opcja z niską jakością dowodów nie wygrywa automatycznie.

### 1.1 Pytania HMW

1. Jak możemy dać każdemu hostowi ten sam bezpieczny UX trackera, zachowując jego natywne ograniczenia?
2. Jak możemy rozpocząć workflow z żywego issue, nie zamieniając workflow state w replikę backlogu?
3. Jak możemy zachować szybkie capture, a jednocześnie zagwarantować dokładnie jeden zapis i jednoznaczny rezultat?
4. Jak możemy zapewnić audytowalny quick-plan mimo różnych mechanizmów trwałości hostów?
5. Jak możemy uczynić Local Markdown bezpiecznym przy równoległych agentach bez dodawania bazy danych?
6. Jak możemy otworzyć seam na GitLab/Jira/Linear bez budowania spekulacyjnego SDK w v1?

### 1.2 Dywergencja SCAMPER

| Ruch | Wygenerowana możliwość | Gdzie oceniana |
|---|---|---|
| Substitute | Zastąpić prose-as-API exact-schema helperem | Obszar 1 |
| Combine | Połączyć immutable snapshot z małym pointerem w state | Obszar 2 |
| Adapt | Zaadaptować trwały brief z `mattpocock/skills` do wspólnego plan artifactu | Obszar 3 |
| Modify | Zmniejszyć mutation surface do jednego create | Obszar 4 |
| Put to other use | Użyć wzorca atomic write z continuation/Advisor config dla Local Markdown | Obszar 5 |
| Eliminate | Usunąć obowiązek równoczesnego dostarczenia GitHub z pierwszego vertical slice | Obszar 6 |
| Reverse | Zamiast synchronizować live issue do workflowu, zamrozić wejście i tylko sygnalizować drift | Obszary 2–3 |

## 2. Obszar decyzyjny 1 — granica wykonawcza providerów

To decyzja bazowa: kolejne obszary zakładają jeden sposób resolve/read/create, jeden model błędów i jedno capability discovery na wszystkich hostach.

### Alternatywa 1A — instrukcje prose i bezpośrednie narzędzia hosta

Skill opisuje, jak wywołać `gh`, filesystem lub MCP, a host wykonuje instrukcje bez wspólnej warstwy runtime. To maksymalnie przypomina lekkie wzorce `mattpocock/skills`, lecz semantyka walidacji i błędów pozostaje rozproszona w promptach i adapterach.

**Pros:** najmniej nowego kodu; łatwe provider-specific escape hatches; szybki prototyp.

**Cons:** słaba testowalność i parytet hostów; quoting i redakcja sekretów są powielane; brak jednego fail-closed contractu.

**Dowody / pewność:** bezpośredni dowód z istniejących skills pokazuje dobry UX, ale także niejednoznaczne referencje i nieatomowe zapisy. Pewność oceny: 94% (wysoka).

### Alternatywa 1B — deklaratywne command templates wykonywane przez host

Config definiuje komendy i mapowanie pól, a każdy host uruchamia je przez własne narzędzia. Daje to wspólny opis capabilities, ale w praktyce tworzy mały język programowania obejmujący quoting, statusy wyjścia, retry i parsing.

**Pros:** brak stałego procesu lub SDK; provider może być konfigurowany bez zmiany core; umiarkowana przenośność.

**Cons:** semantyka procesu nadal zależy od hosta; trudne transactional rejection; command templates zwiększają powierzchnię injection.

**Dowody / pewność:** zgodne z documentation-as-code, lecz repo nie ma precedensu bezpiecznego ogólnego command DSL. Pewność oceny: 82% (średnia).

### Alternatywa 1C — mały helper Node ESM i deklaratywny CapabilitySet

Skill pozostaje cienką warstwą UX, a helper obsługuje exact JSON, parser `IssueRef`, provider dispatch, typed errors, redakcję i transakcje lokalne. Provider deklaruje `native|emulated|unsupported|unknown` wraz z transportem, permissions i constraints, więc różnice vendorów nie są spłaszczane.

**Pros:** jeden testowalny boundary; najwyższy parytet hostów; zgodność z precedensem `phase-continue.mjs`; mały dependency footprint.

**Cons:** więcej kodu początkowego; packaging zasobów na każdym hoście; helper staje się krytyczną granicą bezpieczeństwa.

**Dowody / pewność:** Node ESM, exact schemas i atomic write mają lokalny precedent; brak jeszcze realnych provider write tests. Pewność oceny: 87% (średnio-wysoka).

| Opcja | T | U | S | R | Sc | Wynik ważony | Po korekcie pewności |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1A | 3 | 3 | 4 | 1 | 2 | 2.65 | 2.49 |
| 1B | 3 | 3 | 3 | 3 | 4 | 3.10 | 2.54 |
| 1C | 5 | 4 | 4 | 5 | 4 | 4.50 | 3.92 |

**Rekomendacja obszaru:** wybrać 1C. Jest jedynym wariantem, który spełnia równocześnie parytet, fail-closed validation i testowalność bez wprowadzania pełnego frameworka; łączna pewność decyzji 87%.

## 3. Obszar decyzyjny 2 — kanoniczna kotwica `source_issue`

Po wyborze executable boundary trzeba zdecydować, gdzie trwa identyfikacja wejścia. Niezależnie od wariantu tracker pozostaje właścicielem live issue, a body snapshotu nie może być duplikowane w state.

### Alternatywa 2A — korzeniowy `source_issue` w `orchestrator-state.yml`

Top-level block przechowuje canonical ref, revision, digest, retrieved_at oraz ścieżki do `analysis/intake/issue-ref.yml` i `issue-snapshot.md`. Umieszczenie obok, a nie wewnątrz spornego `orchestrator.phases`, oddziela proweniencję od mechaniki faz i zapewnia jeden anchor dla research/development.

**Pros:** jedno miejsce audytu i resume; łatwy drift check; nie replikuje treści issue; naturalne rozszerzenie istniejącego state contractu.

**Cons:** wymaga wersjonowania i ujednolicenia schema; quick-plan bez orchestratora potrzebuje analogicznego source blocku; błędna implementacja mogłaby sugerować własność backlogu.

**Dowody / pewność:** architektura ustanawia state jako prawdę resume, a research potwierdza ref + snapshot + pointer. Pewność oceny: 86% (średnio-wysoka), ograniczona sprzecznością schema.

### Alternatywa 2B — authoritative intake manifest poza state

`analysis/intake/issue-ref.yml` jest jedynym źródłem proweniencji, a state zawiera co najwyżej ścieżkę lub digest. Rozwiązuje to konflikt schema i pozwala współdzielić manifest między różnymi workflowami, lecz resume wymaga odczytu drugiego authoritative pliku.

**Pros:** mała zmiana state; bogatsza ewolucja metadata intake; łatwe zachowanie immutable snapshotu.

**Cons:** dwa pliki uczestniczą w resume; większe ryzyko rozjazdu lub brakującego manifestu; słabszy single-source-of-truth audit.

**Dowody / pewność:** layout intake jest dobrze uzasadniony, ale obecny kontrakt mówi, że state jest jedynym źródłem resume. Pewność oceny: 80% (średnia).

### Alternatywa 2C — workflow-specific source fields

Research, development i quick-plan definiują własne pola oraz własne miejsca snapshotu. Minimalizuje to zmianę wspólnego frameworka, ale koduje tę samą domenę w kilku kontraktach i przenosi rozbieżności hostów do warstwy trwałości.

**Pros:** lokalne zmiany; niezależna ewolucja workflowów; brak migracji wspólnego state na starcie.

**Cons:** duplikacja parserów i drift semantics; trudny `/work` handoff; słaba AI-nawigowalność i parytet.

**Dowody / pewność:** aktualna rozbieżność quick-plan pokazuje koszt takiego podejścia. Pewność oceny: 91% (wysoka).

| Opcja | T | U | S | R | Sc | Wynik ważony | Po korekcie pewności |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2A | 4 | 4 | 5 | 4 | 5 | 4.30 | 3.70 |
| 2B | 4 | 4 | 3 | 3 | 4 | 3.55 | 2.84 |
| 2C | 4 | 3 | 2 | 2 | 2 | 2.70 | 2.46 |

**Rekomendacja obszaru:** wybrać 2A po uprzednim ujednoliceniu i fixture-testowaniu jednego state schema. Root `source_issue` ma być wyłącznie pointerem proweniencji, podczas gdy snapshot przechowuje treść, a tracker — stan żywy; pewność 86%.

## 4. Obszar decyzyjny 3 — proweniencja quick-plan między hostami

Quick-plan nie zawsze tworzy `orchestrator-state.yml`, dlatego decyzja 2 nie wystarcza. Ten obszar wybiera wspólny trwały rezultat, z którego później może skorzystać development.

### Alternatywa 3A — tylko native plan hosta

Claude/Codex zachowują plan w swoim mechanizmie planowania, a Cursor/Kiro nadal zapisują plik. Jest to najmniejsza zmiana UX, ale proweniencja i możliwość handoffu zależą od hosta, na którym plan powstał.

**Pros:** minimalny koszt; zachowuje natywny flow; brak dodatkowego artifactu dla części hostów.

**Cons:** brak wspólnego audytu; plan może nie być dostępny po zmianie hosta; issue snapshot nie ma trwałego, przenośnego konsumenta.

**Dowody / pewność:** rozbieżność jest potwierdzona w bieżących adapterach, lecz trwałość native UI nie jest wspólnym kontraktem Maistera. Pewność oceny: 92% (wysoka).

### Alternatywa 3B — wspólny `.maister/plans/*.md` plus native UI

Każdy host zapisuje minimalny trwały plan z source blockiem zawierającym ref, revision, digest i snapshot path; host może równolegle prezentować ten plan natywnie. Artifact jest formatem handoffu, nie próbą zastąpienia hostowego UI.

**Pros:** pełny audyt i parytet; prosty development handoff; plan można reviewować w Git; wykorzystuje istniejący format Cursor/Kiro.

**Cons:** wymaga zmian adapterów Claude/Codex; trzeba uniknąć dwóch rozbieżnych kopii planu; zapis musi nastąpić przy właściwej bramce approval.

**Dowody / pewność:** wzorzec trwałych briefów i istniejące plany plikowe wspierają wariant, ale brak zatwierdzonego cross-host contractu. Pewność oceny: 76% (średnia).

### Alternatywa 3C — centralny registry proweniencji bez trwałego planu

Wspólny `.maister/issue-handoffs.yml` rejestruje powiązanie issue z natywnym planem lub identyfikatorem sesji. Ujednolica lookup, lecz nie gwarantuje, że sam plan nadal istnieje albo jest dostępny innemu hostowi.

**Pros:** mały wspólny artifact; wiele planów może wskazywać jedno issue; łatwa enumeracja handoffów.

**Cons:** registry może wskazywać nietrwałe obiekty; nowy globalny punkt konfliktów; nie rozwiązuje cross-host content handoffu.

**Dowody / pewność:** brak precedensu takiego registry w projekcie, a Git-friendly persistence przemawia za osobnymi artifactami. Pewność oceny: 68% (średnia-niska).

| Opcja | T | U | S | R | Sc | Wynik ważony | Po korekcie pewności |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3A | 5 | 3 | 5 | 2 | 2 | 3.55 | 3.27 |
| 3B | 4 | 5 | 4 | 4 | 4 | 4.20 | 3.19 |
| 3C | 3 | 3 | 2 | 2 | 3 | 2.55 | 1.73 |

Wynik po korekcie pewności nieznacznie premiuje status quo 3A, ale to efekt lepiej potwierdzonego niskiego kosztu, a nie spełnienia krytycznego wymagania parytetu. Stosujemy eliminację: 3A odpada, bo nie zapewnia przenośnego handoffu, a 3C odpada, bo registry nie zachowuje treści planu.

**Rekomendacja obszaru:** wybrać 3B i potraktować trwały plik jako canonical handoff artifact, a native UI jako projekcję. To świadome pierwszeństwo kryterium krytycznego nad czystym rankingiem; pewność 76% i obowiązkowe golden fixtures dla czterech hostów.

## 5. Obszar decyzyjny 4 — mutation surface w v1

Po ustaleniu read-only handoffu trzeba zdecydować, czy uruchomienie i zakończenie workflowu ma automatycznie zmieniać tracker. Zewnętrzne mutacje są trudniej odwracalne niż lokalny state, dlatego perspektywa ryzyka ma tu charakter eliminacyjny.

### Alternatywa 4A — tylko jawne capture/create

v1 pozwala utworzyć dokładnie jedno issue, ale list/show/select/handoff/drift pozostają read-only. Comment, claim, close, labels i transitions nie są publicznym UX i nie wynikają automatycznie ze startu lub zakończenia workflowu.

**Pros:** najmniejsza powierzchnia skutków ubocznych; prosty model zgody; można dopracować ambiguous-commit reconciliation; zgodność z minimal implementation.

**Cons:** użytkownik ręcznie aktualizuje tracker po pracy; mniej automatyzacji; część wzorców frontier/claim pozostaje poza Maisterem.

**Dowody / pewność:** research wskazuje brak ogólnego idempotency key oraz potrzebę konkretnych callerów przed dodaniem operacji. Pewność oceny: 85% (średnio-wysoka).

### Alternatywa 4B — capture plus comment/claim/transition za approval

Provider oferuje podstawowy lifecycle, każda mutacja wymaga jawnego approval, precondition i receipt. Daje pełniejszy flow, lecz wymusza już w v1 model różnic między labels, assignees i native workflow states.

**Pros:** mniej przełączania kontekstu; można adaptować frontier/claim; jawny receipt poprawia audyt.

**Cons:** większa macierz capabilities i permissions; provider-specific semantyka; timeout po dispatch jest trudny do rozstrzygnięcia.

**Dowody / pewność:** API dostawców wspierają część operacji, ale różnią się modelem stanu i uprawnień; nie ma jeszcze callerów/testów. Pewność oceny: 72% (średnia).

### Alternatywa 4C — pełna synchronizacja statusu workflow ↔ tracker

Start workflowu claimuje issue, fazy aktualizują jego status, a zakończenie komentuje i zamyka. Zapewnia atrakcyjny „one-click lifecycle”, lecz miesza TrackerStatus z PhaseStatus i tworzy dwukierunkową synchronizację dwóch źródeł prawdy.

**Pros:** najwyższa automatyzacja; tracker pokazuje aktywność bez ręcznych kroków; łatwy monitoring zespołowy.

**Cons:** narusza granicę własności; częściowe błędy są trudne do naprawy; drift i resume mogą wykonywać nieoczekiwane mutacje; słaba portowalność.

**Dowody / pewność:** wszystkie analizy domenowe wspierają rozdział tracker/workflow i odrzucają silent sync. Pewność oceny: 96% (wysoka).

| Opcja | T | U | S | R | Sc | Wynik ważony | Po korekcie pewności |
|---|---:|---:|---:|---:|---:|---:|---:|
| 4A | 5 | 3 | 5 | 5 | 3 | 4.40 | 3.74 |
| 4B | 3 | 5 | 2 | 3 | 4 | 3.30 | 2.38 |
| 4C | 2 | 5 | 1 | 1 | 3 | 2.25 | 2.16 |

**Rekomendacja obszaru:** wybrać 4A. Capture jest osobną, jawną komendą; handoff i resume nigdy nie mutują trackera, a dalsze operacje wracają dopiero z własnym callerem, approval policy i conformance tests; pewność 85%.

## 6. Obszar decyzyjny 5 — trwałość i współbieżność Local Markdown

Local provider jest write path, więc zwykłe `writeFile` lub edit-in-place nie wystarcza przy równoległych agentach. Wariant musi zachować byte-exact brak zmian przy odrzuceniu i nie może polegać na kolejności nazw plików.

### Alternatywa 5A — rekord per UUID, per-record lock, CAS i atomic replace

Każde issue jest `.maister/issues/<uuid>.md` ze strict frontmatter i integer revision. Create używa exclusive same-directory temp i atomic publish; update po atomowym locku sprawdza expected revision/digest, zapisuje pełnego kandydata i wykonuje atomic replace.

**Pros:** czytelne pliki; niezależne creates dobrze łączą się w Git; jawny conflict zamiast lost update; reuse istniejących atomic-write patterns.

**Cons:** złożony cleanup i fsync; stale lock wymaga operatora; gwarancje zależą od filesystemu; same-record Git conflicts pozostają manualne.

**Dowody / pewność:** istniejące runtime i Advisor reconciliation dają bezpośredni precedent, a analiza współbieżności wspiera UUID+CAS. Pewność oceny: 88% (średnio-wysoka).

### Alternatywa 5B — append-only journal z materializowaną projekcją

Każda zmiana dopisuje zdarzenie z unikalnym operation ID, a list/show odtwarza aktualny stan lub czyta cache projection. Append redukuje overwrite, ale wprowadza event ordering, compaction i naprawę częściowych logów — de facto mały event store.

**Pros:** naturalny audit log; idempotency po operation ID; brak replace tego samego rekordu dla większości operacji.

**Cons:** znacząca złożoność; trudniejsze ręczne review; globalny lub shardowany ordering; wymaga projekcji i recovery protocol.

**Dowody / pewność:** technicznie wykonalne, lecz brak precedensu i brak potrzeby skali uzasadniającej event store. Pewność oceny: 74% (średnia).

### Alternatywa 5C — Git jako jedyny mechanizm współbieżności

Provider zapisuje pliki bez runtime locków, a konflikty są wykrywane dopiero przy commit/merge. To upraszcza lokalny kod, ale równoległe procesy w jednym worktree nadal mogą nadpisać dane przed wejściem Git do gry.

**Pros:** najmniej mechaniki runtime; znany workflow naprawy konfliktów; pełna historia po commitach.

**Cons:** brak ochrony samego worktree; capture może się zduplikować; użytkownik poznaje konflikt zbyt późno; repo bez Git nie jest wspierane.

**Dowody / pewność:** research wykazał równoległe użycie agentów oraz słabość sekwencyjnych IDs/edit-in-place. Pewność oceny: 93% (wysoka).

| Opcja | T | U | S | R | Sc | Wynik ważony | Po korekcie pewności |
|---|---:|---:|---:|---:|---:|---:|---:|
| 5A | 4 | 4 | 3 | 5 | 4 | 4.05 | 3.56 |
| 5B | 2 | 3 | 1 | 4 | 5 | 2.80 | 2.07 |
| 5C | 4 | 2 | 5 | 1 | 2 | 2.85 | 2.65 |

**Rekomendacja obszaru:** wybrać 5A, ale zadeklarować wsparcie v1 tylko dla ordinary local filesystems i failować preflightem poza tym profilem. Nie kraść stale locks automatycznie i nie budować semantic merge drivera; pewność 88%.

## 7. Obszar decyzyjny 6 — kolejność providerów i rozszerzalność

Ostatnia decyzja przekłada architekturę na inkrementy. Każdy wariant zachowuje Local Markdown i GitHub jako docelowe providery v1, ale różni się sposobem uzyskania dowodu, że seam naprawdę działa.

### Alternatywa 6A — Local Markdown i GitHub równolegle w jednym wydaniu

Kontrakt, oba providery i wszystkie integracje workflowowe powstają przed pierwszym release. Szybko pokazuje realną przenośność, lecz łączy ryzyka filesystemu, auth, pagination, rate limits i ambiguous commit w jednym kroku.

**Pros:** pełna wartość v1 od razu; szybka walidacja common core; mniej przejściowych stanów produktu.

**Cons:** szeroki blast radius; trudniejsze diagnozowanie kontraktu; wydłuża feedback loop; łatwo przeciążyć pierwszy scope.

**Dowody / pewność:** obie ścieżki są dobrze opisane, ale żadna nie ma jeszcze conformance tests. Pewność oceny: 80% (średnia).

### Alternatywa 6B — Local tracer, handoff, następnie GitHub tracer

Najpierw powstaje schema prerequisite, contract i pełny Local vertical slice wraz z handoffem; GitHub wchodzi jako drugi tracer za tym samym suite. To pozwala skorygować seam na deterministycznym providerze przed dodaniem sieciowych failure modes.

**Pros:** małe, weryfikowalne inkrementy; szybszy feedback; Local działa offline; GitHub dowodzi rozszerzalności zamiast ją definiować.

**Cons:** przejściowo tylko jeden provider; możliwe dopasowanie contractu zbyt mocno do filesystemu; wymaga pilnowania provider-neutral types.

**Dowody / pewność:** raport wskazuje dokładnie taki incremental handoff i oddzielny GitHub tracer. Pewność oceny: 90% (wysoka).

### Alternatywa 6C — najpierw ogólne SDK i czterech hosted providerów

Core definiuje publiczny plugin SDK, po czym GitHub, GitLab, Jira i Linear powstają przed integracją workflowową. Maksymalizuje wczesną abstrakcyjność, ale projektuje rozszerzenia bez realnych callerów i conformance feedbacku.

**Pros:** szeroka macierz providerów; formalne extension points; mniejsze późniejsze zmiany publicznego API.

**Cons:** spekulacyjna abstrakcja; duża powierzchnia auth i rich-text semantics; narusza minimal implementation; wysoki koszt utrzymania.

**Dowody / pewność:** różnice oficjalnych API są dobrze potwierdzone, ale nie ma dowodu potrzeby dynamicznego third-party SDK w v1. Pewność oceny: 92% (wysoka).

| Opcja | T | U | S | R | Sc | Wynik ważony | Po korekcie pewności |
|---|---:|---:|---:|---:|---:|---:|---:|
| 6A | 3 | 5 | 3 | 2 | 4 | 3.25 | 2.60 |
| 6B | 5 | 4 | 4 | 5 | 4 | 4.50 | 4.05 |
| 6C | 2 | 4 | 1 | 1 | 5 | 2.25 | 2.07 |

**Rekomendacja obszaru:** wybrać 6B. Pierwszy development scope obejmuje schema prerequisite, contract, Local i handoff; GitHub jest następnym tracerem, a GitLab/Jira/Linear pozostają testem projektowym seam, nie implementacją v1; pewność 90%.

## 8. Zintegrowany wariant docelowy

```text
user/host UX
    │
    ▼
issue-tracker skill
    │ exact JSON + explicit approvals
    ▼
Node ESM provider boundary ── capabilities / typed errors / redaction
    ├── Local Markdown: UUID + lock + CAS + atomic replace
    └── GitHub: versioned REST or preselected gh transport
              │
              ▼
resolve + read + immutable snapshot (before workflow initialization)
              │
              ├── research/development → root source_issue pointer in state
              └── quick-plan → durable .maister/plans/*.md source block

Later source change → drift signal only; no silent merge, claim, comment or close
```

Sekwencja wdrożenia wynikająca z decyzji:

1. Ujednolicić jeden state schema i jego migration/fixtures.
2. Zdefiniować exact provider contract, `IssueRef`, errors, config i capabilities.
3. Dostarczyć Local create/read/list/resolve oraz bezpieczny capture UX.
4. Dodać snapshot-before-init, root `source_issue`, quick-plan artifact i read-only drift.
5. Przepuścić ten vertical slice przez cross-host build/golden fixtures.
6. Dodać GitHub jako drugi provider korzystający z niezmienionego core contractu.

## 9. Trzy strefy zakresu

### In-scope

- Project-local konfiguracja bez sekretów i jednoznaczna precedence.
- `IssueRef`, capabilities, typed errors i helper Node ESM.
- Local Markdown i GitHub: capabilities, resolve, create, read, bounded list.
- Capture/list/show/select oraz jawny start research/quick-plan/development/`work`.
- Immutable snapshot, `source_issue`, trwały quick-plan artifact i read-only drift.
- Cross-host packaging, conformance fixtures, transactional rejection i build validation.

### Stretch

- Jawny refresh tworzący nową zarchiwizowaną wersję snapshotu.
- Read-after-write verification dla opcjonalnych GitHub metadata.
- Import istniejących `.scratch/.../issues` lub `tickets.md` przez osobną komendę.
- Policy-based readiness/frontier jako read-only filtr po ustabilizowaniu core.

### Out-of-scope

- Dwukierunkowa synchronizacja tracker status ↔ workflow phases.
- Dynamiczny third-party provider SDK i marketplace providerów.
- Semantyczny Git merge driver lub wsparcie rozproszonych/network filesystem locks.
- Offline queue dla hosted mutations.
- Automatyczne commit/push/close/comment wynikające z samego handoffu lub resume.

## 10. Odroczone pomysły

| Pomysł | Strefa | Dlaczego warto później | Warunek powrotu |
|---|---|---|---|
| Comment/claim/close z receipt | Stretch | Domyka tracker UX i może adaptować frontier/claim | Konkretny caller, approval policy, idempotency/reconciliation tests |
| GitLab provider | Stretch | Sprawdza nested project paths i tiered capabilities | Local+GitHub conformance suite stabilny |
| Jira provider | Stretch | Sprawdza rich text i native transitions | Extension model bez spłaszczania ADF/workflows |
| Linear provider | Stretch | Sprawdza GraphQL envelope i team states | Pagination/error conformance gotowe |
| Provider SDK | Out-of-scope | Może umożliwić ekosystem adapterów | Co najmniej trzy stabilne providery i realni autorzy zewnętrzni |
| Semantic local merge | Out-of-scope | Może zmniejszyć ręczne konflikty Git | Udokumentowane częste same-record conflicts |
| Hosted offline mutation queue | Out-of-scope | Ułatwia pracę bez sieci | Trwały operation log i bezpieczna reconciliation semantics |

## 11. Założenia zmieniające wybór

- Jeśli Node.js przestanie być gwarantowanym runtime na którymkolwiek wspieranym hoście, obszar 1 trzeba ponownie otworzyć i porównać standalone binary z host-native execution.
- Jeśli `orchestrator-state.yml` ma pozostać absolutnie wolny od proweniencji wejścia, obszar 2 przechodzi na 2B i wymaga jawnego rozszerzenia definicji resume source.
- Jeśli native plan hosta uzyska przenośny, wersjonowany export contract, koszt 3A spada i trwały plik może stać się generowaną projekcją.
- Jeśli realne telemetry pokażą częste concurrent updates tego samego local issue, append-only model 5B może wymagać ponownej oceny.
- Jeśli GitHub jest krytycznym pierwszym użytkownikiem i Local nie ma adopcji, kolejność 6B można odwrócić, zachowując dwa osobne tracery.

## 12. Źródła decyzji

- [Research report](research-report.md)
- [Synthesis](../analysis/synthesis.md)
- [Project vision](../../../../docs/project/vision.md)
- [Project roadmap](../../../../docs/project/roadmap.md)
- [Technology stack](../../../../docs/project/tech-stack.md)
- [System architecture](../../../../docs/project/architecture.md)

