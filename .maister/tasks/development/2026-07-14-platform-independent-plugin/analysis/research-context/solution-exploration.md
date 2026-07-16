# Eksploracja rozwiązania: platformowo niezależny Maister

## TL;DR
Najbardziej spójny wariant to jeden portable core i jeden bundle, z małym wersjonowanym Host Contract oraz strukturalnym materializerem.
Instalator powinien domyślnie materializować target lokalnie, a CI ma publikować opcjonalne artefakty marketplace z dokładnie tej samej ścieżki kompilacji.
Commitowane drzewa należy usunąć dopiero po dwóch stabilnych wydaniach z deterministyczną parity, E1–E4 i odtwarzalnym rollbackiem.
Claude Code może być uczciwie wydawany przy E4 bez runtime, o ile E5/E6 pozostają jawnie `unavailable`, a okresowe zewnętrzne probe'y nie blokują zwykłego release.

## Key Decisions
- **Rekomendacja:** minimalny, ewolucyjny IR: typed primitives + host-aware templates, rozszerzane wyłącznie dla udowodnionych różnic semantycznych.
- **Rekomendacja:** hybrydowa dystrybucja: lokalny materializer jako referencyjna ścieżka oraz CI-prebuilt marketplace artifacts z tego samego wejścia i kompilatora.
- **Rekomendacja:** shadow-first migration i usunięcie generated trees po dwóch stabilnych release oraz spełnieniu jawnej macierzy exit criteria.
- **Rekomendacja:** dwupoziomowa kompatybilność nieznanych wersji: fail-closed dla mapowań semantycznych, ostrzeżenie dla zmian packaging-only potwierdzonych walidacją.
- **Rekomendacja:** Claude release gate E1–E4 + shared E3, z E5/E6 raportowanymi jako `unavailable` i oddzielnym programem okresowych native probes.

## Open Questions / Risks
- Granica między typed primitive a template może z czasem dryfować; potrzebny jest przegląd każdego nowego wyjątku adaptera.
- Marketplace może wymuszać podpisany lub prebuilt artefakt, więc lokalny materializer nie może być jedynym kanałem dystrybucji.
- Parity tekstowa nie dowodzi parity semantycznej; oracle musi porównywać inventory, descriptor, referencje i canary, nie tylko pełny diff.
- Brak Claude runtime pozostawia twardy evidence ceiling na E4; statusu `unavailable` nie wolno prezentować jako sukcesu.
- Nieznane wersje hostów mogą zmienić semantykę bez zmiany schematu; polityka kompatybilności wymaga wersjonowanego evidence record i daty ważności.

## 1. Ramy eksploracji

### Pytania HMW
- Jak moglibyśmy testować całą semantykę workflow raz, zachowując natywne kontrakty czterech hostów?
- Jak moglibyśmy przesunąć rozróżnienie hosta do instalacji bez przenoszenia kruchych transformacji tekstowych na maszynę użytkownika?
- Jak moglibyśmy wydać Claude Code uczciwie, mimo braku runtime, bez blokowania zmian wspólnego core?
- Jak moglibyśmy usunąć 610 commitowanych projekcji, zachowując audytowalność release i prosty rollback?

### SCAMPER — użyte kierunki
- **Substitute:** zastąpić globalne `sed`/regex typed primitives i host-aware templates.
- **Combine:** połączyć lokalną instalację i prebuilt marketplace artifacts jednym deterministycznym materializerem.
- **Adapt:** wykorzystać obecne fixtures, manifesty i testy jako oracle migracji, zamiast przepisywać je od razu.
- **Modify:** zmniejszyć macierz testów do pełnego E3 raz oraz krótkich E1/E2/E4 per host.
- **Put to another use:** użyć generated trees jako tymczasowych golden fixtures i rollback artifacts.
- **Eliminate:** po okresie shadow usunąć commitowane target trees i czterokrotne uruchamianie identycznych core contracts.
- **Reverse:** zamiast generować wszystko przed release, materializować host-native tree z wersjonowanego bundle przy instalacji; CI wykonuje tę samą operację dla marketplace.

### Pięć perspektyw oceny

Każdy wariant oceniono jakościowo z pięciu perspektyw: **maintainer** (prostota i koszt zmian), **installer/user** (niezawodność i offline), **host contract** (natywność i kompatybilność), **assurance/release** (dowód E0–E6 i rollback) oraz **evolution** (dodawanie hostów i zmiany kontraktów). Pewność rekomendacji jest ważona jako wysoka dla granicy core/adapters/materializer i średnia dla dokładnego IR, marketplace oraz polityki wersji.

## 2. Obszar decyzyjny 1 — głębokość reprezentacji kanonicznej / IR

Ta decyzja określa, czy wspólne źródło będzie nadal głównie dokumentacją z lepszymi punktami rozszerzeń, czy stanie się pełnym modelem pośrednim. Ma największy wpływ na koszt migracji i ryzyko stworzenia drugiego języka workflow.

### Alternatywa 1A — minimalne typed primitives + host-aware templates **(REKOMENDOWANA)**

Behavior pozostaje w obecnych Markdown/YAML i przenośnych modułach ESM, lecz host-sensitive miejsca dostają jawne, walidowane pola: gate, role intent, delegation, progress, hooks, capabilities, invocation i layout. Adapter emituje natywne pliki przez małe strukturalne renderery oraz templates; IR rośnie dopiero, gdy konkretna różnica semantyczna powtórzy się w co najmniej dwóch miejscach.

**Pros**
- Najmniejsza migracja z obecnego canonical source; zachowuje czytelność dokumentacji-as-code.
- Eliminuje najbardziej ryzykowne globalne substytucje bez projektowania pełnego DSL.
- Pozwala wcześnie uruchomić wspólny core contract i parametryczny adapter harness.
- Dobrze pasuje do zasady minimal implementation oraz istniejącego stosu Markdown/YAML/ESM.

**Cons**
- Granica primitive/template wymaga dyscypliny i może z czasem stać się niespójna.
- Część prozy nadal pozostaje trudna do walidacji semantycznej.
- Nowa capability może początkowo wymagać kontrolowanego wyjątku adaptera.

**Dowody / założenia:** pięć modułów runtime jest byte-identical, a wspólna semantyka gate/state/continuation ma E3; największe ryzyko stanowią ponad 20 transformacji tekstowych. Zakładamy, że większość różnic daje się zamknąć w jawnych primitives i templates bez pełnego AST.

### Alternatywa 1B — pełny neutralny workflow IR od początku

Wszystkie workflow, role, fazy, gates, artifacts, hooks i invocation są opisane w nowym, wersjonowanym schemacie, z którego renderowane są również ludzkie instrukcje. Markdown staje się projekcją lub polem content w IR, a każdy host implementuje kompletny backend emitera.

**Pros**
- Najsilniejsza separacja semantyki od reprezentacji hosta.
- Umożliwia bogatą walidację, migracje schematu i narzędzia analityczne.
- Długoterminowo może uprościć dodawanie wielu kolejnych hostów.

**Cons**
- Wysoki koszt początkowy i ryzyko zbudowania własnego języka workflow.
- Podwójna migracja: najpierw obecnych instrukcji do IR, potem adapterów do nowych emitterów.
- Proza i zachowanie modeli nie zawsze dają się sensownie sprowadzić do AST.
- Opóźnia szybkie usunięcie obecnej duplikacji.

**Dowody / założenia:** research scorecard ocenił pełny IR na 20/25, lecz z medium confidence i wysokim ryzykiem over-design. Wariant opłaca się dopiero, jeśli typed primitives nie potrafią opisać rosnącej liczby hostów lub potrzebne są formalne transformacje całych workflow.

### Alternatywa 1C — canonical Markdown + ulepszone regex/golden snapshots

Zachowujemy obecny model generacji, porządkujemy skrypty transformacji, dodajemy markery sekcji i większe snapshoty/golden fixtures. Nie powstaje osobny Host Contract ani strukturalny model; bezpieczeństwo pochodzi głównie z diffów.

**Pros**
- Najniższy koszt krótkoterminowy i minimalna zmiana narzędzi.
- Wykorzystuje istniejące skrypty i doświadczenie zespołu.
- Pełne generated diffs są łatwe do ręcznego przeglądu.

**Cons**
- Nie usuwa podstawowego coupling do tekstu i host vocabulary.
- Snapshoty wykrywają zmianę, lecz nie dowodzą semantycznej poprawności.
- Koszt rośnie z każdym hostem i każdym nowym wyjątkiem.
- Nie realizuje celu jednego instalowanego bundle.

**Dowody / założenia:** obecny rebuild/diff wykrywa drift, ale PR CI nie uruchamia pełnego `make validate`, a cztery drzewa mają 610 plików. To rozsądny rollback baseline, lecz słaby model docelowy.

**Rekomendacja:** wybrać **1A**, z jawną zasadą „promote to primitive after repeated semantic divergence” i kwartalnym przeglądem wyjątków adapterów.

## 3. Obszar decyzyjny 2 — dystrybucja i miejsce materializacji

Host-native drzewa muszą się różnić, ale nie muszą być niezależnie utrzymywane. Decyzja dotyczy tego, czy tree powstaje na maszynie użytkownika, w CI, czy w obu miejscach z jednego deterministycznego compiler path.

### Alternatywa 2A — lokalny materializer jako jedyna ścieżka

Jeden bundle zawiera core, descriptors, schemas, templates i installer; `maister install --target HOST` tworzy staging tree lokalnie, waliduje i atomowo instaluje. Marketplace otrzymuje wyłącznie bootstrap lub nie jest wspierany.

**Pros**
- Najprostszy model źródłowy i jednoznaczny wybór hosta przy instalacji.
- Działa offline po pobraniu bundle i łatwo zapisuje receipt z dokładnymi opcjami.
- Nie wymaga przechowywania prebuilt target trees w repozytorium.

**Cons**
- Przenosi compiler i jego zależności do środowiska użytkownika.
- Awaria materializacji staje się awarią instalacji; rollback musi być perfekcyjny.
- Niektóre marketplace wymagają gotowego, podpisanego lub indeksowanego artefaktu.

**Dowody / założenia:** install-time compiler 1:1 otrzymał 13/25, głównie przez ryzyko przeniesienia kruchych transformacji. Wariant staje się bezpieczniejszy dopiero po zastąpieniu regexów strukturalnym materializerem.

### Alternatywa 2B — wyłącznie CI-prebuilt artifacts

CI materializuje i publikuje osobny artefakt dla każdego hosta; użytkownik lub marketplace pobiera już gotowy tree. Repo nie przechowuje generated trees, ale release nadal ma cztery paczki.

**Pros**
- Minimalne wymagania na maszynie użytkownika i przewidywalne marketplace integration.
- Każdy opublikowany artefakt można podpisać, zahaszować i zachować do audytu.
- Błąd compilera jest wykrywany przed publikacją, nie podczas instalacji.

**Cons**
- Instalacja spoza marketplace nadal wymaga wyboru i pobrania odpowiedniej paczki.
- Ryzyko rozjazdu między release artifacts i lokalnym developerskim install path.
- Dodanie targetu zwiększa liczbę publikowanych artefaktów i jobs.

**Dowody / założenia:** native marketplaces mogą wymagać prebuilt artifacts, a obecny release już publikuje platformowe warianty. Sam prebuild nie realizuje w pełni żądania jednego bundle.

### Alternatywa 2C — hybryda: referencyjny lokalny materializer + prebuild z tego samego path **(REKOMENDOWANA)**

Jeden wersjonowany bundle i jedna implementacja materializera są źródłem prawdy. Installer uruchamia materializer lokalnie, natomiast CI wywołuje dokładnie ten sam entry point z tym samym bundle, by stworzyć podpisane marketplace artifacts i zapisać receipt/SBOM/hash; parity test porównuje semantyczny output local vs CI.

**Pros**
- Łączy jedno rozwiązanie i wybór targetu przy instalacji z wymaganiami marketplace.
- Jeden compiler path zapobiega rozjazdowi logiki local/prebuilt.
- Umożliwia offline install, szybki marketplace install i reprodukowalny audit.
- Staging/validation/atomic swap pozostają wspólnym kontraktem E4.

**Cons**
- Dwa kanały dystrybucji zwiększają liczbę scenariuszy release/install.
- Wymaga deterministycznego build metadata i jednoznacznej polityki preferencji artefaktu.
- Należy pilnować identycznej wersji bundle, descriptor i materializera.

**Dowody / założenia:** raport rekomenduje jeden bundle i prebuilt artifacts z tego samego compiler path; confidence jest wysokie dla materializera, średnie dla konkretnej integracji marketplace. Zakładamy możliwość publikowania host-specific projections bez ich commitowania.

**Rekomendacja:** wybrać **2C**. Lokalny materializer jest referencją, a marketplace artifact jest cache'owaną, podpisaną projekcją z identycznym receipt.

## 4. Obszar decyzyjny 3 — przejście i kryteria usunięcia generated trees

Dzisiejsze drzewa są jednocześnie kosztem utrzymania, wizualnym diffem i awaryjnym artefaktem dystrybucyjnym. Ich usunięcie powinno być konsekwencją dowiedzionej zastępowalności, nie daty kalendarzowej.

### Alternatywa 3A — natychmiastowe usunięcie po uruchomieniu materializera

Gdy nowy compiler potrafi wygenerować cztery targety, commitowane drzewa znikają w tym samym wydaniu. Rollback opiera się na tagu sprzed migracji lub odtworzeniu z bundle.

**Pros**
- Natychmiast usuwa 610 plików i drift-check overhead.
- Wymusza używanie nowej architektury bez długiego dual path.
- Upraszcza regułę własności repozytorium.

**Cons**
- Brak czasu na wykrycie semantycznych różnic i problemów marketplace.
- Rollback podczas pierwszych wydań jest trudniejszy operacyjnie.
- Może ukryć regresje, jeśli parity oracle porównuje tylko strukturę.

**Dowody / założenia:** obecne fixtures i target trees są wartościowym baseline; research jawnie odradza usunięcie przed potwierdzoną parity i stabilnymi release artifacts.

### Alternatywa 3B — shadow-first, dwa stabilne release i jawne exit criteria **(REKOMENDOWANA)**

Nowy materializer działa w shadow CI obok legacy build, a generated trees służą jako oracle oraz rollback artifact. Usunięcie następuje po dwóch kolejnych stabilnych release, gdy każdy target ma deterministic E2, adapter E1, isolated transactional E4, installed-path canary E3, reprodukowalny marketplace artifact i zero nierozwiązanych semantic parity exceptions.

**Pros**
- Najlepszy balans między szybkim uproszczeniem i kontrolowanym ryzykiem.
- Exit criteria są mierzalne i niezależne od dostępności host runtime.
- Umożliwia byte-exact rollback i porównanie dwóch ścieżek.
- Daje czas na walidację lokalnego oraz marketplace install.

**Cons**
- Przez co najmniej dwa release utrzymujemy dual path i podwójne CI.
- Wymaga semantic parity oracle oraz rejestru zaakceptowanych różnic.
- „Stabilny release” musi mieć precyzyjną definicję i ownera decyzji.

**Dowody / założenia:** raport proponuje M2 shadow, M3 opt-in, M4 dwa stabilne release, M5 removal. Zakładamy, że dwa release obejmują rzeczywiste instalacje oraz brak rollback-triggering defects, nie tylko zielony pipeline.

### Alternatywa 3C — pozostawić generated trees jako stale publikowane snapshots

Materializer staje się główną implementacją, ale wszystkie target trees nadal są commitowane po każdym buildzie jako audytowalne snapshoty. CI wymusza brak diffu tak jak obecnie.

**Pros**
- Najłatwiejszy ręczny review outputu i szybka inspekcja host-native plików.
- Zachowuje obecną ścieżkę marketplace i rollback.
- Niski koszt zmiany procesu release.

**Cons**
- Nie usuwa dużej części repozytoryjnej duplikacji ani drift workflow.
- Zachęca do traktowania projekcji jako równorzędnego źródła.
- Skaluje się słabo z liczbą hostów i wersji kontraktów.

**Dowody / założenia:** obecna architektura działa w ten sposób i daje deterministyczność, ale jest dokładnie źródłem zgłaszanego kosztu generowania/testowania wielu platform.

**Rekomendacja:** wybrać **3B**. Po usunięciu drzew zachować release artifacts, receipts, semantyczne manifesty i możliwość offline rebuild z tagu.

## 5. Obszar decyzyjny 4 — polityka nieznanych wersji hosta

Hosty ewoluują niezależnie i sama zgodność schematu nie gwarantuje zgodności zachowania. Polityka musi unikać zarówno niepotrzebnego blokowania patch releases, jak i cichego uruchamiania niezweryfikowanych mapowań bramek czy delegacji.

### Alternatywa 4A — zawsze fail-closed poza zadeklarowanym zakresem

Installer odrzuca każdą wersję hosta spoza `min_version..max_tested_version`, niezależnie od rodzaju użytych capabilities. Użytkownik musi zaktualizować adapter lub jawnie użyć niebezpiecznego override.

**Pros**
- Najprostsza, audytowalna reguła bezpieczeństwa.
- Nie pozwala pomylić braku dowodu z kompatybilnością.
- Chroni safety-sensitive gates, delegation i continuation.

**Cons**
- Blokuje prawdopodobnie kompatybilne patch/minor releases.
- Wymaga bardzo szybkich aktualizacji adapterów.
- Zachęca użytkowników do globalnego override, jeśli false positives są częste.

**Dowody / założenia:** fail-closed jest właściwy na safety boundaries, lecz wersja hosta nie zawsze koreluje ze zmianą używanego kontraktu.

### Alternatywa 4B — zawsze warning i best-effort install

Każda nieznana wersja otrzymuje ostrzeżenie, ale materializacja i instalacja postępują po przejściu walidacji strukturalnej. Evidence record zapisuje niezweryfikowaną wersję.

**Pros**
- Najmniej blokuje użytkowników i nowe wydania hostów.
- Dobrze toleruje zmiany packaging-only oraz backward-compatible additions.
- Prosty UX instalacji.

**Cons**
- Może dopuścić cichy semantic drift w gate, agent lub hook behavior.
- Static validation nie wykryje zmian runtime/discovery.
- Osłabia wiarygodność deklaracji compatibility.

**Dowody / założenia:** dokumentacja hostów jest ruchoma, a E1/E2 nie dowodzą E5/E6. Globalny warning jest zbyt słaby dla safety-sensitive mappings.

### Alternatywa 4C — capability-sensitive policy: semantic fail, packaging warning **(REKOMENDOWANA)**

Host Contract klasyfikuje mapowania jako `semantic/safety-sensitive` albo `packaging-only` i zapisuje zweryfikowany zakres wersji/capability fingerprint. Nieznana wersja blokuje instalację, jeśli dotyka gates, delegation, continuation, tool trust lub hooks; dla niezmienionego packagingu może przejść z ostrzeżeniem po E1/E2/E4, tworząc `provisional` evidence record i ograniczony czas ważności.

**Pros**
- Zachowuje fail-closed dokładnie tam, gdzie błąd zmienia bezpieczeństwo lub workflow.
- Nie blokuje bez potrzeby czysto strukturalnych patch releases.
- Łączy wersję z capability/evidence zamiast globalnego booleanu.
- Dostarcza jasny mechanizm aktualizacji confidence po native probe.

**Cons**
- Wymaga klasyfikacji capabilities i utrzymania fingerprintów.
- Błędna klasyfikacja packaging vs semantic może być źródłem ryzyka.
- UX musi jasno wyjaśnić `supported`, `provisional` i `unavailable`.

**Dowody / założenia:** obecny boolean capability ukrywa wersję, scenariusz i świeżość; badanie rekomenduje record `{host, capability, version, evidence_level, timestamp, target}`. Zakładamy, że adapter potrafi jawnie oznaczyć safety-sensitive mappings.

**Rekomendacja:** wybrać **4C**, bez globalnego `--force`; ewentualny override ma być per capability, jawnie audytowany i niedostępny dla denylisted safety invariants.

## 6. Obszar decyzyjny 5 — release assurance Claude Code bez runtime

Brak binarki/auth nie uniemożliwia testowania wspólnego core, materializacji i instalacji, ale uniemożliwia dowód discovery oraz runtime. Decyzja dotyczy uczciwego progu wydania, nie sposobu udawania E5/E6.

### Alternatywa 5A — blokować każdy release bez Claude E5/E6

Każde wydanie wieloplatformowe wymaga uruchomienia Claude host discovery i krytycznego scenariusza E2E. Brak runtime zatrzymuje release albo usuwa Claude ze wsparcia.

**Pros**
- Najsilniejsza deklaracja parity dla każdego wydania.
- Natychmiast wykrywa host-native regressions.
- Nie dopuszcza niezweryfikowanego artefaktu Claude.

**Cons**
- Obecnie praktycznie blokuje wszystkie release niezależnie od zakresu zmiany.
- Uzależnia wspólny produkt od zewnętrznej binarki, auth i model behavior.
- Nie rozróżnia zmian core, packaging i Claude-specific adapter.

**Dowody / założenia:** repo nie ma Claude runtime; E5/E6 są nieosiągalne lokalnie, a obecny sentinel zwraca 77. To polityka możliwa dopiero po zapewnieniu stabilnego środowiska native evidence.

### Alternatywa 5B — E1–E4 jako release gate, jawne unavailable E5/E6 + okresowe native probes **(REKOMENDOWANA)**

Każdy release wymaga Claude adapter E1, deterministic materialization E2, wspólnego core E3, izolowanego transactional install/update/uninstall E4 i installed-path canary. E5/E6 są zapisywane jako `unavailable`, nigdy `passed`; niezależny scheduled/manual probe na realnym Claude zbiera wersjonowany evidence, a Claude-specific zmiany mogą wymagać takiego probe przed oznaczeniem pełnej kompatybilności.

**Pros**
- Umożliwia rozwój i release bez fałszywego claimu runtime parity.
- Maksymalizuje testy możliwe bez hosta, w tym brakujący dziś Claude E4.
- Status evidence jest precyzyjny, scenariuszowy i audytowalny.
- Native probe można uruchomić w innym środowisku bez włączania credentials do zwykłego PR CI.

**Cons**
- Regresja discovery/runtime może dotrzeć do użytkownika między probe'ami.
- Wymaga komunikowania różnych poziomów assurance zamiast jednego zielonego badge.
- Należy określić freshness window i zasady dla Claude-specific changes.

**Dowody / założenia:** E1–E4 są wykonalne bez runtime; E5/E6 wymagają prawdziwego hosta. `exit 77` ma pozostać jawnym `unavailable`, a nie cichym sukcesem.

### Alternatywa 5C — community/canary certification przed stable promotion

CI publikuje Claude artifact jako candidate po E1–E4. Zaufany maintainer lub grupa canary uruchamia podpisany sentinel/discovery i jeden workflow scenario; dopiero ich evidence promuje artifact do stable, podczas gdy inne hosty mogą wydać się wcześniej.

**Pros**
- Dostarcza realne E5/E6 bez centralnego runtime w projekcie.
- Oddziela publikację candidate od deklaracji stable compatibility.
- Może skalować na hosty wymagające płatnych lub interaktywnych credentials.

**Cons**
- Złożony, częściowo manualny release i ryzyko opóźnienia Claude artifact.
- Wymaga zaufania, podpisów, provenance i ochrony przed zmanipulowanym reportem.
- Asynchroniczne wersje per host komplikują wsparcie i komunikację.

**Dowody / założenia:** zewnętrzny probe jest technicznie możliwy, ale projekt nie ma dziś zdefiniowanego trust/provenance modelu. Ten wariant może uzupełnić 5B dla krytycznych wydań, lecz nie powinien być warunkiem startu migracji.

**Rekomendacja:** wybrać **5B**. Dla zmian wyłącznie core release jest dozwolony przy E1–E4; dla zmian Claude semantic adapter status kompatybilności pozostaje `provisional` aż do świeżego E5/E6.

## 7. Spójna kombinacja rekomendowana

Rekomendacje **1A + 2C + 3B + 4C + 5B** tworzą jeden model:

1. Canonical Markdown/YAML/ESM pozostaje jednym portable behavior core.
2. Minimalny, wersjonowany Host Contract opisuje wyłącznie realne różnice semantyczne i packagingowe.
3. Jeden strukturalny materializer tworzy target w staging; lokalny installer i CI-prebuild używają tego samego entry pointu.
4. PR CI uruchamia pełne E3 raz oraz E1/E2/E4 i installed-path canary dla każdego hosta.
5. Shadow parity wykorzystuje obecne generated trees przez dwa release, po czym projekcje znikają z repo, lecz zostają w release artifacts.
6. Unknown-version policy działa per capability; safety-sensitive semantics są fail-closed.
7. Claude wydaje się uczciwie z E1–E4, a E5/E6 pozostają widocznie `unavailable` do czasu prawdziwego probe.

Z perspektywy pięciu interesariuszy ten zestaw ma najlepszy bilans: maintainer testuje core raz, użytkownik wybiera host przy instalacji, host zachowuje natywny layout, release ma reprodukowalny evidence chain, a nowe hosty wymagają descriptor/emittera zamiast kopii produktu.

## 8. Porównanie rekomendacji

| Obszar | Rekomendowany wariant | Maintainer | Installer/user | Host contract | Assurance | Evolution | Confidence |
|---|---|---|---|---|---|---|---|
| Canonical representation | 1A minimal typed primitives | wysoki | neutralny | wysoki | wysoki | wysoki | medium-high |
| Distribution | 2C hybrid same compiler path | wysoki | wysoki | wysoki | wysoki | wysoki | medium-high |
| Generated-tree removal | 3B two-release shadow | średni krótkoterminowo | wysoki | wysoki | bardzo wysoki | wysoki | medium-high |
| Unknown host versions | 4C capability-sensitive | średni | średni | bardzo wysoki | bardzo wysoki | wysoki | medium |
| Claude assurance | 5B E1–E4 + explicit unavailable | wysoki | uczciwy status | wysoki | wysoki w granicy dowodu | wysoki | high |

## 9. Pomysły odroczone

- Pełny neutralny DSL/IR dla wszystkich workflow — odroczyć do czasu, gdy rejestr wyjątków typed primitives pokaże mierzalną potrzebę.
- Zdalny hosted compiler/materialization service — niepotrzebny przy wymaganiu local/offline i zwiększa powierzchnię zaufania.
- Jeden identyczny installed tree dla wszystkich hostów — sprzeczny z natywnymi manifestami, discovery, agents, hooks i MCP placement.
- Automatyczny target detection bez jawnego `--target` — może potwierdzać wybór, ale nie powinien sam decydować przy wielu hostach.
- Globalny compatibility `--force` — zbyt szeroki; ewentualne override musi być per capability i audytowane.
- Community certification jako jedyny release gate — możliwy później jako uzupełnienie programu native probes.

## Decisions (verbatim handoff)

- Recommend minimal, evolutionary typed primitives plus host-aware templates instead of a full neutral IR at migration start.
- Recommend a hybrid distribution model in which local installation and CI-prebuilt marketplace artifacts invoke the same deterministic materializer and bundle.
- Recommend removing committed generated trees only after two consecutive stable releases satisfy E1, E2, E4, installed-path E3 canary, reproducible artifact, rollback, and zero unresolved semantic-parity exceptions for every target.
- Recommend capability-sensitive unknown-version handling: fail closed for semantic or safety-sensitive mappings, and allow packaging-only provisional compatibility after validation with explicit warning and expiring evidence.
- Recommend Claude Code releases use E1–E4 plus shared-core E3 as the enforceable gate, while E5/E6 remain explicitly unavailable until a versioned native probe runs.
- Recommend the coherent architecture combination 1A + 2C + 3B + 4C + 5B.

## Risks (verbatim handoff)

- The boundary between a typed primitive and a host-aware template can drift and become another implicit transformation layer without an exception-review policy.
- Marketplace packaging or signing constraints may require prebuilt artifacts, so local materialization cannot be the only supported distribution channel.
- Textual parity does not prove semantic parity; the migration oracle must validate inventory, references, descriptors, semantic goldens, and installed-path canaries.
- Two-release shadow operation temporarily increases CI and maintenance cost and needs a precise definition of a stable release.
- Capability classification can be wrong; misclassifying a semantic mapping as packaging-only could permit unsafe provisional compatibility.
- Claude Code E5/E6 remain unverified without a real binary, authentication, version, and executed scenario; unavailable evidence must never be shown as passing.
- External host documentation and marketplaces can change faster than adapter evidence, so compatibility records need version, scenario, timestamp, and freshness policy.
