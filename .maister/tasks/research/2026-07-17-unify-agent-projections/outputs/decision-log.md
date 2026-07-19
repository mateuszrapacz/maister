# Decision Log: ujednolicona projekcja agentów Maister

## TL;DR

Przyjęto sześć decyzji architektonicznych: jedno kanoniczne źródło i manifest, deterministyczną projekcję w stagingu, exact fail-closed dispatch, wąskie multi-root ownership Kiro, clean install bez migracji Codex TOML oraz trzy oddzielne poziomy evidence.
Najważniejsza korekta względem wcześniejszej syntezy to rezygnacja z hash-gated legacy migration: stare TOML-e są po prostu usuwane ze źródła rozwiązania, a implementacja nie obsługuje upgrade z poprzedniej topologii.

## Key Decisions

- 28 plików `plugins/maister/agents/*.md` pozostaje jedynym właścicielem zachowania ról.
- Projector generuje reprezentacje hostów wyłącznie w stagingu i wiąże je digestami z receipt/provenance.
- Runtime rozwiązuje `maister:<role_id>` dokładnie i nigdy nie przechodzi na inline, built-in ani podobnie nazwaną rolę.
- Kiro używa native `~/.kiro/agents`, ale Maister przejmuje tylko jawnie wyliczone leaf entries.
- `advisor` jest zwykłym wierszem manifestu; legacy TOML nie jest częścią instalacji ani migracji.
- Materialization, discovery i invocation mają osobne, wersjonowane dowody.

## Open Questions / Risks

- Codex per-spawn model control, Cursor agent precedence i obserwowalna identity Kiro pozostają zależne od wersji hosta i wymagają probe.
- Multi-root transaction schema musi zachować dotychczasowe gwarancje byte-exact rollbacku i race detection.
- Dopóki E5/E6 nie mają bezpiecznego natywnego scenario, operational support pozostaje `unavailable` mimo poprawnej projekcji.

## ADR-001: Jedno kanoniczne źródło ról i wersjonowany manifest

### Status

Accepted

### Context

Maister posiada 28 spójnych plików Markdown, ale Cursor i Kiro utrzymują osobne behavior-bearing assets, które już odbiegły od źródła. Wspólną własnością między hostami jest identity i zachowanie roli, nie format pliku wymagany przez host.

### Decision Drivers

- Jeden właściciel portable behavior.
- Normalized parity zamiast porównywania liczby plików.
- Jawne, wersjonowane różnice hostów.
- Możliwość związania wykonania z canonical digest.
- Brak specjalnej gałęzi dla `advisor`.

### Considered Options

1. Utrzymać ręczne zestawy agentów w każdym overlayu.
2. Wprowadzić pełny neutralny DSL ról i wygenerować również canonical Markdown.
3. Parsować istniejące canonical Markdowny do małego IR i wersjonowanego manifestu projekcji.

### Decision Outcome

Chosen option: **3**, ponieważ wykorzystuje istniejące 28 ról jako jedyne źródło zachowania, usuwa duplikację i nie wprowadza zbędnego nowego DSL. Manifest przechowuje tylko przenośne identity oraz hostowe mapowanie, transform IDs i tools profiles.

### Consequences

#### Good

- Zmiana instrukcji roli ma jedno miejsce i automatycznie propaguje się do wszystkich targetów.
- `role_id = stem = frontmatter.name` jest prostym, testowalnym invariantem.
- Support agents można liczyć osobno bez maskowania brakującej roli.

#### Bad

- Parser i manifest stają się krytyczną częścią build/install path.
- Każda potrzebna transformacja hostowa wymaga wersji, allowlisty i fixture.

---

## ADR-002: Deterministyczna projekcja w stagingu transakcji

### Status

Accepted

### Context

Generowanie do checkoutu tworzyłoby committed duplicates, a generowanie dopiero w runtime ominęłoby release closure, receipt ownership, drift detection i rollback. Istniejący materializer ma deterministyczny staging oraz walidację przed mutacją targetu.

### Decision Drivers

- Immutable source provenance.
- Reproducible bytes, modes, paths i archive hashes.
- Wspólne gwarancje install/update/uninstall/rollback.
- Brak zatwierdzonych kopii promptów.
- Wykrywanie driftu przed publikacją.

### Considered Options

1. Zatwierdzić wygenerowane Cursor/Kiro prompt assets.
2. Generować pliki przy każdym invocation.
3. Uruchamiać czysty projector po source resolution, wewnątrz stagingu, przed final validation/hash/receipt.

### Decision Outcome

Chosen option: **3**, ponieważ włącza projekcję do już istniejącej granicy transakcji i release bez modyfikowania źródła. Provenance zawiera wersję projectora, canonical set hash, manifest hash i projected tree hash.

### Consequences

#### Good

- Ten sam candidate jest walidowany, instalowany, hashowany i pakowany.
- Błąd projection/closure daje zero zmian targetu.
- Hand-edited managed projection jest wykrywana jako drift.

#### Bad

- Materializer zyskuje nową fazę i więcej typed failure modes.
- Receipt/provenance schema musi zostać rozszerzona i wersjonowana.

---

## ADR-003: Dokładny fail-closed resolver i natywne adaptery

### Status

Accepted

### Context

Obecne semantic binding labels opisują zamiar, ale nie implementują lookupu, dispatch ani result evidence. Natural-language routing lub inline fallback może wykonać niewłaściwą rolę i ukryć brak host support.

### Decision Drivers

- Jednoznaczny wybór logicznej roli.
- Wspólne failure semantics na trzech hostach.
- Zachowanie natywnego mechanizmu każdego hosta.
- Audytowalne powiązanie wyniku z source i projection digest.
- Advisor equality.

### Considered Options

1. Pozostawić natural-language selection i pozwolić hostowi wybrać rolę.
2. Wykonywać instrukcję inline w root agencie przy niedostępnym subagencie.
3. Wprowadzić exact resolver tworzący `DispatchPlan` oraz trzy host-native adaptery bez fallbacku.

### Decision Outcome

Chosen option: **3**, ponieważ oddziela portable role identity od host execution i pozwala fail closed przed uruchomieniem złej roli. Codex używa generic subagent prompt injection, Cursor exact plugin agent, a Kiro exact custom agent; każdy adapter zwraca wspólny terminal record.

### Consequences

#### Good

- Unknown, duplicate, collision, unavailable i digest mismatch są widocznymi typed errors.
- Workflow wybiera wszędzie `maister:<role_id>` zamiast znać format hosta.
- `advisor` używa dokładnie tego samego resolvera i adapter portu.

#### Bad

- Hosty o niedostatecznym exact dispatch lub identity observation pozostaną `unavailable`.
- Adapter contracts muszą być utrzymywane per host version.

---

## ADR-004: Wielokatalogowe, lecz wąskie ownership dla Kiro

### Status

Accepted

### Context

Kiro odkrywa custom agents pod `.kiro/agents` lub `~/.kiro/agents`, podczas gdy obecny prywatny root `.kiro-maister` nie jest natywnym discovery rootem. Przejęcie całego `~/.kiro` naruszyłoby własność użytkownika i obecny kontrakt transakcyjny.

### Decision Drivers

- Native Kiro discovery.
- Zachowanie niezwiązanych agentów i settings użytkownika.
- Atomowy lifecycle oraz byte-exact rollback.
- Receipt-owned uninstall i stale-file cleanup.
- Ochrona przed project-local shadow/collision.

### Considered Options

1. Pozostawić agentów wyłącznie pod `.kiro-maister`.
2. Traktować całe `~/.kiro` jako Maister-owned root.
3. Rozszerzyć transakcję o jawny `kiro_native_agents` managed root z receipt-owned leaf set.

### Decision Outcome

Chosen option: **3**, ponieważ umożliwia native discovery bez przejmowania wspólnego katalogu hosta. Receipt identyfikuje pliki przez `root_id + relative path`, a journal obejmuje oba roots w jednej transakcji.

### Consequences

#### Good

- Descriptor i prompt trafiają do wspieranego przez Kiro rootu i mogą przejść reference closure.
- Uninstall/update dotyka wyłącznie wpisów z receipt.
- Własne pliki użytkownika pod `~/.kiro/agents` pozostają poza ownership.

#### Bad

- Transaction, journal, receipt, recovery i race tests muszą obsłużyć wiele roots.
- Commit wielu leaf entries nie daje magicznej atomowości wobec arbitralnego zewnętrznego writera; wymagane pozostają lock, identity recheck i operator quiescence.

---

## ADR-005: Czysta instalacja bez migracji legacy Codex TOML

### Status

Accepted — **supersedes the legacy migration recommendation in the research synthesis and report**

### Context

Wcześniejsza rekomendacja proponowała hash-gated, odwracalną migrację `.codex/agents/{advisor,arbiter}.toml`. Użytkownik doprecyzował, że rozwiązanie będzie instalowane od zera i nie wymaga obsługi upgrade ani zachowania topologii poprzedniej wersji.

### Decision Drivers

- Jawne założenie clean/from-scratch installation.
- Minimal implementation i brak niepotrzebnej backward compatibility.
- Advisor equality bez native TOML lifecycle.
- Mniejsza powierzchnia transaction/recovery i dokumentacji.

### Considered Options

1. Hash-gated migration z backupem i restore.
2. Best-effort runtime deletion wszystkich znalezionych legacy TOML-i.
3. Usunąć legacy TOML files i ich generowanie ze źródła rozwiązania; nie implementować migration/cleanup runtime.

### Decision Outcome

Chosen option: **3**, ponieważ clean install eliminuje potrzebę bezpiecznego rozpoznawania historycznych plików. Repozytorium, init, release topology i dokumentacja nie zawierają TOML path; instalator nie ma migratora, preservation branch, cleanup journal ani compatibility flag.

### Consequences

#### Good

- Brak nieużywanego kodu migracji i wyjątków Advisor/Arbiter.
- Mniej schema, testów i failure modes przed uruchomieniem `maister:development`.
- Jasny kontrakt: Codex używa wyłącznie generic subagent prompt injection.

#### Bad

- Upgrade istniejącej instalacji z legacy TOML nie jest wspierany w tym zakresie.
- Operator środowiska nieczystego odpowiada za wcześniejsze przygotowanie go jako clean install; rozwiązanie nie skanuje ani nie naprawia historycznych plików.

---

## ADR-006: Oddzielne dowody materializacji, discovery i invocation

### Status

Accepted

### Context

Poprawny inventory lub istniejący descriptor nie dowodzi, że host odkryje agenta, a discovery nie dowodzi, że workflow wywołał właściwą rolę. Niektóre środowiska nie mają executable, authentication, safe adapter lub obserwowalnego exact scenario.

### Decision Drivers

- Brak fałszywych native support claims.
- Evidence freshness zależna od host/scenario/provenance.
- Diagnostyka dokładnej warstwy failure.
- Fail-closed semantics dla wrong identity.
- Zgodność z istniejącymi E1-E6 policy i `unavailable`.

### Considered Options

1. Uznawać structural validation za pełny support hosta.
2. Łączyć discovery i invocation w jeden binarny probe.
3. Zachować oddzielne gates: structural/materialization, native discovery (E5) i exact invocation (E6).

### Decision Outcome

Chosen option: **3**, ponieważ tylko oddzielne rekordy pokazują, gdzie kończą się potwierdzone gwarancje. Brak prerequisite daje `unavailable`; wrong observed identity, digest mismatch lub rzeczywisty błąd scenario daje `failed`.

### Consequences

#### Good

- Release i dokumentacja mogą precyzyjnie odróżnić packaged, discovered i operational support.
- Zmiana host version, source commit, manifest/projection digest lub scenario unieważnia stary dowód.
- E6 może testować dwie rozróżnialne role oraz zwykłego `advisor`.

#### Bad

- Native evidence wymaga wersjonowanych fixtures, runtime i czasem authentication.
- Część targetów pozostanie provisional/`unavailable` mimo pełnej structural parity.

