window.MAISTER_DATA = {
  generated: "2026-07-14T16:25:57Z",
  task: {
    title: "Uproszczenie i uniezależnienie Maister od platformy",
    type: "research",
    status: "completed",
    description: "Zbadać model jednego testowalnego rozwiązania z różnicami hostów materializowanymi podczas instalacji.",
    path: ".maister/tasks/research/2026-07-14-platform-independent-plugin",
    current_activity: null
  },
  characteristics: { research_type: "mixed" },
  phases: [
    { id: "phase-1", name: "Research foundation", icon_hint: "analysis", status: "completed", started: "2026-07-14T13:25:50Z", completed: "2026-07-14T14:15:37Z", skip_reason: null, summary: "One neutral behavior/runtime core and one distribution bundle are feasible; typed, versioned host adapters should materialize distinct native trees at install time.", decisions: [
      { decision: "Typ badania: mixed — technical, requirements i literature research.", rationale: "Wymagane jest połączenie analizy kodu, kontraktów hostów i źródeł oficjalnych." },
      { decision: "Jednostką porównania będzie kontrakt zachowania, packagingu, instalacji i weryfikacji, a nie tylko układ plików wygenerowanych pluginów.", rationale: "Sam filesystem shape nie dowodzi parity semantycznej." },
      { decision: "Gathering Strategy ma trzy stabilne, niezależne kategorie, aby zmieścić analizę w dostępnym limicie agentów i umożliwić późniejsze łączenie ustaleń po identyfikatorach.", rationale: "Kategorie pokrywają core/transforms, host contracts/installation oraz assurance/runtime gap." },
      { decision: "Hipoteza „różnice dopiero przy instalacji” będzie oceniana obok co najmniej dwóch alternatyw, a nie traktowana jako z góry wybrana architektura.", rationale: "Rekomendacja musi wynikać z porównywalnych dowodów." }
      ,{ decision: "Docelowo: portable behavior/runtime core + typed host contracts + install-time materializer.", rationale: "Maksymalizuje jednokrotne testowanie wspólnej semantyki i ogranicza adaptery do wymaganych kontraktów hostów." }
      ,{ decision: "„Jedno rozwiązanie” oznacza jedno źródło, jeden testowalny core i jeden dystrybuowany bundle; nie oznacza jednego host runtime.", rationale: "Hosty wymagają różnych manifestów, discovery, agents, hooks i MCP placement." }
      ,{ decision: "Neutralny IR rozwijać ewolucyjnie dla gates/roles/hooks/capabilities, zamiast budować pełny DSL przed migracją.", rationale: "Ogranicza koszt i ryzyko over-design." }
      ,{ decision: "Instalacja musi używać staging, validation, receipt, atomic swap i byte-exact rollback.", rationale: "Materializacja na maszynie użytkownika musi być transakcyjna." }
      ,{ decision: "Commitowane target trees usunąć dopiero po potwierdzonej parity i stabilnych release artifacts.", rationale: "Pozwala migrować shadow-first i zachować rollback." }
      ,{ decision: "Continue to brainstorming evaluation", rationale: "User explicitly chose to continue after reviewing the completed research foundation and report." }
    ], risks: [
      "Dokumentacja hostów może opisywać możliwości nowsze niż dostępne lokalnie CLI lub marketplace; wersje i daty muszą być zapisane przy dowodzie.",
      "Brak runtime Claude Code uniemożliwia uczciwe potwierdzenie pełnego E2E; trzeba oddzielić dowód semantyczny, instalacyjny, statyczny i runtime.",
      "Tekstowe transformacje mogą zawierać ukryte różnice semantyczne, których nie ujawni samo porównanie struktury katalogów.",
      "Termin „jedno rozwiązanie” może oznaczać jedno źródło, jeden artefakt dystrybucyjny albo jeden runtime; synteza musi rozdzielić te poziomy."
      ,"Semantyka gate/delegation/progress może dryfować mimo poprawnego layoutu; globalne substytucje tekstu są głównym źródłem ryzyka."
      ,"Cursor i Kiro contracts są ruchome, a Kiro CLI/IDE wymagają osobnych, precyzyjnie nazwanych targetów."
      ,"Compiler na maszynie użytkownika zwiększa koszt awarii, jeśli nie jest transakcyjny i odtwarzalny offline."
      ,"Claude Code E5/E6 nie może być deklarowane bez realnej binarki, auth, wersji i wykonanego scenariusza."
      ,"Native marketplaces mogą wymagać prebuilt artifacts; wspólny installer powinien z nimi współistnieć, nie koniecznie je zastępować."
    ], artifacts: [
      { path: "planning/research-brief.md", label: "Research brief", html: null },
      { path: "planning/research-plan.md", label: "Research plan", html: null },
      { path: "planning/sources.md", label: "Source plan", html: null },
      { path: "analysis/findings/canonical-core-boundary.md", label: "Canonical core boundary findings", html: null },
      { path: "analysis/findings/host-contracts-installation.md", label: "Host contracts and installation findings", html: null },
      { path: "analysis/findings/test-assurance-runtime-gap.md", label: "Test assurance and runtime gap findings", html: null }
      ,{ path: "analysis/synthesis.md", label: "Research synthesis", html: null }
      ,{ path: "outputs/research-report.md", label: "Research report", html: "outputs/research-report.html" }
      ,{ path: "outputs/decision-summary.md", label: "Decision summary", html: "outputs/decision-summary.html" }
    ], gate: { question: "Research foundation complete (initialized, planned, gathered, synthesized). Continue to brainstorming evaluation?", answer: "Continue to brainstorming evaluation" } },
    { id: "phase-2", name: "Evaluate brainstorming value", icon_hint: "plan", status: "completed", started: "2026-07-14T14:15:37Z", completed: "2026-07-14T14:24:33Z", skip_reason: null, summary: "Brainstorming and high-level design are enabled because the solution has multiple viable variants and changes several architectural seams.", decisions: [{ decision: "Yes, explore alternatives", rationale: "User accepted the recommendation to explore alternatives." }, { decision: "Yes, generate design", rationale: "User accepted the recommendation to generate a high-level design after solution convergence." }], risks: [], artifacts: [], gate: { question: "Rekomendacja obejmuje nową granicę portable core/Host Contract/materializer, transakcyjną instalację, przebudowę CI oraz etapową migrację dystrybucji, więc high-level design jest wartościowy. Would you like to generate a high-level design?", answer: "Yes, generate design" } },
    { id: "phase-3", name: "Generate solution alternatives", icon_hint: "spec", status: "completed", started: "2026-07-14T14:24:33Z", completed: "2026-07-14T14:33:56Z", skip_reason: null, summary: "Five decision areas and fifteen alternatives are ready; the coherent recommendation is 1A + 2C + 3B + 4C + 5B.", decisions: [
      { decision: "Recommend minimal, evolutionary typed primitives plus host-aware templates instead of a full neutral IR at migration start.", rationale: "Ogranicza ryzyko over-design i pozwala migrować stopniowo." },
      { decision: "Recommend a hybrid distribution model in which local installation and CI-prebuilt marketplace artifacts invoke the same deterministic materializer and bundle.", rationale: "Łączy jeden compiler path z wymaganiami marketplace." },
      { decision: "Recommend removing committed generated trees only after two consecutive stable releases satisfy E1, E2, E4, installed-path E3 canary, reproducible artifact, rollback, and zero unresolved semantic-parity exceptions for every target.", rationale: "Zapewnia mierzalne, odwracalne exit criteria." },
      { decision: "Recommend capability-sensitive unknown-version handling: fail closed for semantic or safety-sensitive mappings, and allow packaging-only provisional compatibility after validation with explicit warning and expiring evidence.", rationale: "Unika zarówno nadmiernego blokowania, jak i ryzykownego best-effort." },
      { decision: "Recommend Claude Code releases use E1–E4 plus shared-core E3 as the enforceable gate, while E5/E6 remain explicitly unavailable until a versioned native probe runs.", rationale: "Utrzymuje uczciwy evidence ceiling bez blokowania całego projektu." },
      { decision: "Recommend the coherent architecture combination 1A + 2C + 3B + 4C + 5B.", rationale: "Wybrane rekomendacje wzajemnie się wspierają." }
    ], risks: [
      "The boundary between a typed primitive and a host-aware template can drift and become another implicit transformation layer without an exception-review policy.",
      "Marketplace packaging or signing constraints may require prebuilt artifacts, so local materialization cannot be the only supported distribution channel.",
      "Textual parity does not prove semantic parity; the migration oracle must validate inventory, references, descriptors, semantic goldens, and installed-path canaries.",
      "Two-release shadow operation temporarily increases CI and maintenance cost and needs a precise definition of a stable release.",
      "Capability classification can be wrong; misclassifying a semantic mapping as packaging-only could permit unsafe provisional compatibility.",
      "Claude Code E5/E6 remain unverified without a real binary, authentication, version, and executed scenario; unavailable evidence must never be shown as passing.",
      "External host documentation and marketplaces can change faster than adapter evidence, so compatibility records need version, scenario, timestamp, and freshness policy."
    ], artifacts: [{ path: "outputs/solution-exploration.md", label: "Solution exploration", html: "outputs/solution-exploration.html" }], gate: { question: "Continue to solution convergence?", answer: "Continue to solution convergence" } },
    { id: "phase-4", name: "Evaluate brainstorming alternatives", icon_hint: "plan", status: "completed", started: "2026-07-14T14:33:56Z", completed: "2026-07-14T15:38:33Z", skip_reason: null, summary: "Convergence completed with 1A + 2D + 3D + 4C + 5D: minimal primitives, custom installer, explicit host overlays, task-scoped shadow removal, capability-sensitive compatibility, and no Claude target.", decisions: [{ decision: "1A — minimalne typed primitives + host-aware templates", rationale: "Low-level tool selection normally remains with the host harness; explicit bindings cover control-flow, safety, persistence, and capability-sensitive operations." }, { decision: "Marketplace jest poza zakresem docelowego modelu instalacji.", rationale: "Instalacja ma działać z lokalnego lub GitHub repo przez własny installer pod pełną kontrolą projektu." }, { decision: "2D — custom installer + wspólne skille + jawne host overlays w repo", rationale: "Generic skills są kopiowane bez transformacji, a hooks, agents, commands, manifests i settings pozostają jawnie zdefiniowane per harness." }, { decision: "3D — shadow podczas implementacji, usunięcie legacy trees przed zamknięciem zadania", rationale: "User confirmed task-scoped shadow comparison with mandatory removal before implementation completion." }, { decision: "4C — capability-sensitive: semantic fail-closed, packaging provisional", rationale: "Semantic and safety-sensitive incompatibilities block installation; packaging-only differences may proceed provisionally after validation." }, { decision: "5D — usunąć Claude Code ze wspieranych targetów", rationale: "Future Claude support is a separate new-harness task driven by real need and available runtime." }], risks: ["Zbyt szerokie mapowanie nazw narzędzi stworzy kosztowną warstwę translacji; zbyt wąskie mapowanie może oddać harnessowi operacje wpływające na kontrolę przepływu i bezpieczeństwo.", "Jawne host overlays mogą dryfować, jeśli wspólne skille zaczną zawierać ukryte zależności od nazw narzędzi konkretnego harnessu.", "Usunięcie legacy oracle w tym samym zadaniu wymaga mocniejszej bramki parity, ponieważ nie będzie dwóch release obserwacji."], artifacts: [], gate: { question: "Brainstorming complete. Continue to high-level design?", answer: "Continue to high-level design" } },
    { id: "phase-5", name: "Design high-level architecture", icon_hint: "spec", status: "completed", started: "2026-07-14T15:38:33Z", completed: "2026-07-14T16:19:37Z", skip_reason: null, summary: "A repository-bundle modular monolith is designed with a portable documentation core, explicit Host Overlay Contracts, a transactional custom installer, and seven accepted ADRs.", decisions: [
      { decision: "Architektura: portable documentation core with explicit host overlays, nie pełny workflow DSL ani install-time compiler promptów.", rationale: "Minimalizuje semantyczną translację i utrzymuje generic skills jako jedno źródło." },
      { decision: "Harness sam wybiera zwykłe narzędzia wykonawcze; jawne bindings obejmują wyłącznie control flow, safety, persistence i capability-sensitive behavior.", rationale: "Unika mapowania implementacyjnych nazw narzędzi." },
      { decision: "Jedna kopia generic skills/runtime jest instalowana bez transformacji, a host-native assets są utrzymywane wprost w hosts/codex, hosts/cursor i hosts/kiro-cli.", rationale: "Różnice harnessów pozostają jawne i reviewowalne." },
      { decision: "Własny installer obsługuje lokalne repo i GitHub source, staging, validation, lock, receipt, atomic commit, update, uninstall i rollback.", rationale: "Instalacja pozostaje kontrolowana i transakcyjna." },
      { decision: "Nieznana wersja hosta blokuje niepotwierdzone capabilities semantyczne; packaging-only może otrzymać jawny status provisional.", rationale: "Fail-closed chroni semantykę bez sztucznego blokowania packagingu." },
      { decision: "Legacy build adapters, committed generated trees i Claude Code zostają usunięte w tym samym zadaniu po shadow comparison i spełnieniu Definition of Done.", rationale: "Tymczasowy oracle nie staje się drugą architekturą produkcyjną." }
    ], risks: [
      "Docelowe ścieżki discovery i format settings każdego hosta trzeba potwierdzić aktualnymi testami contract/runtime przed implementacją overlayu.",
      "Atomowa podmiana całego managed tree jest prosta; wieloplikowy merge do współdzielonych ustawień użytkownika wymaga journalu i byte-exact rollbacku.",
      "Neutralna proza może z czasem zacząć przemycać słownik jednego hosta; potrzebny jest forbidden-vocabulary contract oraz review wyjątków.",
      "Błędna klasyfikacja capability jako packaging zamiast semantic może przepuścić niezgodność; klasyfikacja musi być jawna i przeglądana.",
      "Usunięcie legacy w jednym zadaniu zwiększa wagę końcowej bramki parity, szczególnie dla hooks, agents i invocation semantics."
    ], artifacts: [{ path: "outputs/high-level-design.md", label: "High-level design", html: "outputs/high-level-design.html" }, { path: "outputs/decision-log.md", label: "Decision log", html: "outputs/decision-log.html" }], gate: { question: "Design complete. Continue to output generation?", answer: "Continue to output generation" } },
    { id: "phase-6", name: "Summarize research and suggest next steps", icon_hint: "done", status: "completed", started: "2026-07-14T16:19:37Z", completed: "2026-07-14T16:25:57Z", skip_reason: null, summary: "Research, convergence, and high-level design are complete; the user approved the final handoff.", decisions: [{ decision: "Complete workflow", rationale: "User explicitly approved the final research handoff and completion of the workflow." }], risks: ["Implementation should start in a fresh session using the high-level design and decision log as scope sources."], artifacts: [{ path: "outputs/research-report.md", label: "Research report", html: "outputs/research-report.html" }, { path: "outputs/solution-exploration.md", label: "Solution exploration", html: "outputs/solution-exploration.html" }, { path: "outputs/high-level-design.md", label: "High-level design", html: "outputs/high-level-design.html" }, { path: "outputs/decision-log.md", label: "Decision log", html: "outputs/decision-log.html" }, { path: "outputs/decision-summary.md", label: "Decision summary", html: "outputs/decision-summary.html" }], gate: { question: "Research workflow complete. Complete workflow?", answer: "Complete workflow" } }
  ],
  verification: { status: null, issues: [], fixes: [], reverify_count: 0 },
  gate_history: [{
    idempotency_key: "sha256:8dc80ac772693c815f0dfac96f7baa45a3cded3e406f16c6f5a42756f1e157d4",
    phase_id: "phase-1",
    gate_type: "phase-1-exit",
    question: "Research foundation complete (initialized, planned, gathered, synthesized). Continue to brainstorming evaluation?",
    options: ["Continue to brainstorming evaluation", "Pause workflow"],
    original_recommendation: "Continue to brainstorming evaluation",
    status: "decided",
    selected_option: "Continue to brainstorming evaluation",
    final_actor: "user",
    rationale: "User explicitly chose to continue after reviewing the completed research foundation and report.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:aa3bd0f18b9311593067d380929d9f07dfe632faf4dd36a02904bf603026be24",
    phase_id: "phase-2",
    gate_type: "optional-phase-selection",
    question: "Badanie wykazało cztery realne warianty oraz nierozstrzygnięte decyzje dotyczące IR, marketplace artifacts, momentu usunięcia generated trees i polityki nieznanych wersji hostów. Would you like to explore solution alternatives?",
    options: ["Yes, explore alternatives", "No, skip brainstorming"],
    original_recommendation: "Yes, explore alternatives",
    status: "decided",
    selected_option: "Yes, explore alternatives",
    final_actor: "user",
    rationale: "User accepted the recommendation to explore alternatives.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:65ca0aed2a12829399eaccb4883a2f0dd909b2b475c9172a924d5be41018fae3",
    phase_id: "phase-2",
    gate_type: "optional-phase-selection",
    question: "Rekomendacja obejmuje nową granicę portable core/Host Contract/materializer, transakcyjną instalację, przebudowę CI oraz etapową migrację dystrybucji, więc high-level design jest wartościowy. Would you like to generate a high-level design?",
    options: ["Yes, generate design", "No, skip design"],
    original_recommendation: "Yes, generate design",
    status: "decided",
    selected_option: "Yes, generate design",
    final_actor: "user",
    rationale: "User accepted the recommendation to generate a high-level design after solution convergence.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:b44cce49b270e039db9825c224697b82b1f7ac236d4a1a361cd36e21a6e3cd13",
    phase_id: "phase-3",
    gate_type: "phase-3-exit",
    question: "Continue to solution convergence?",
    options: ["Continue to solution convergence", "Pause workflow"],
    original_recommendation: "Continue to solution convergence",
    status: "decided",
    selected_option: "Continue to solution convergence",
    final_actor: "user",
    rationale: "User explicitly chose to continue from generated alternatives to sequential solution convergence.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:1c0159ead600b2c3ba1d2b1a28bee5b4dec632b0378564f1bb75386b3f380e6b",
    phase_id: "phase-4",
    gate_type: "research-convergence",
    question: "Jak głęboka powinna być kanoniczna reprezentacja workflow Maister?",
    options: ["1A — minimalne typed primitives + host-aware templates (Recommended)", "1B — pełny neutralny workflow IR od początku", "1C — canonical Markdown + ulepszone regex/golden snapshots", "Need more info"],
    original_recommendation: "1A — minimalne typed primitives + host-aware templates (Recommended)",
    status: "decided",
    selected_option: "1A — minimalne typed primitives + host-aware templates (Recommended)",
    final_actor: "user",
    rationale: "User selected minimal typed primitives and clarified that low-level tool choice should normally remain with the host harness, while explicit bindings are reserved for control-flow, safety, persistence, or capability-sensitive operations.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:b9678e25714b36a77ab80c6b8e99dce1ae251775ffd0668e7f0d24736a65279c",
    phase_id: "phase-4",
    gate_type: "research-convergence",
    question: "Gdzie powinien działać materializer i jak dystrybuować host-native artefakty?",
    options: ["2A — lokalny materializer jako jedyna ścieżka", "2B — wyłącznie CI-prebuilt artifacts", "2C — hybryda: referencyjny lokalny materializer + prebuild z tego samego path (Recommended)", "Need more info"],
    original_recommendation: "2C — hybryda: referencyjny lokalny materializer + prebuild z tego samego path (Recommended)",
    status: "decided",
    selected_option: "Need more info",
    final_actor: "user",
    rationale: "User rejected the marketplace-oriented framing and clarified that installation is from a local or GitHub repository through a fully controlled custom installer, with generic skills copied unchanged and host-specific assets explicit in the repository.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:153a61d692e97ae1ac47bef311677bf1c1f7e2eab3e0c23c703ce5087414a4bf",
    phase_id: "phase-4",
    gate_type: "research-convergence",
    question: "Jaki model instalacji i przechowywania host-specific assets powinniśmy przyjąć po wykluczeniu marketplace?",
    options: ["2D — custom installer + wspólne skille + jawne host overlays w repo (Recommended)", "2A — custom installer generuje host-specific assets podczas instalacji", "2B — kompletne prebuilt host trees przechowywane w repo", "Need more info"],
    original_recommendation: "2D — custom installer + wspólne skille + jawne host overlays w repo (Recommended)",
    status: "decided",
    selected_option: "2D — custom installer + wspólne skille + jawne host overlays w repo (Recommended)",
    final_actor: "user",
    rationale: "User confirmed the repository-owned overlay model with a fully controlled custom installer, shared generic skills, and explicit harness-specific assets.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:d883bbce776c4f95ce19c8db040193ced1eafa5255bdbae75888d5515e32e785",
    phase_id: "phase-4",
    gate_type: "research-convergence",
    question: "Kiedy i na jakich warunkach usunąć obecne commitowane generated trees?",
    options: ["3A — natychmiastowe usunięcie po uruchomieniu nowego installera", "3B — shadow-first, dwa stabilne release i jawne exit criteria (Recommended)", "3C — pozostawić generated trees jako stale publikowane snapshots", "Need more info"],
    original_recommendation: "3B — shadow-first, dwa stabilne release i jawne exit criteria (Recommended)",
    status: "decided",
    selected_option: "Need more info",
    final_actor: "user",
    rationale: "User refined the migration model: keep legacy generated trees only as a comparison oracle during implementation, then remove them before the implementation task is completed rather than waiting for two releases.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:9eef80c3b88f94ca365644236f7e7f5b860fb3086e4fa6018f4b1d6b3bfa81c2",
    phase_id: "phase-4",
    gate_type: "research-convergence",
    question: "Jaką bramkę usunięcia legacy generated trees przyjąć dla zadania implementacyjnego?",
    options: ["3D — shadow podczas implementacji, usunięcie legacy trees przed zamknięciem zadania (Recommended)", "3A — usunięcie legacy trees od razu po uruchomieniu installera", "3B — utrzymanie legacy trees przez dwa stabilne release", "Need more info"],
    original_recommendation: "3D — shadow podczas implementacji, usunięcie legacy trees przed zamknięciem zadania (Recommended)",
    status: "decided",
    selected_option: "3D — shadow podczas implementacji, usunięcie legacy trees przed zamknięciem zadania (Recommended)",
    final_actor: "user",
    rationale: "User confirmed task-scoped shadow comparison with mandatory removal of legacy generated trees before implementation completion.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:87b6b2a02b6c2c1783c7192766cce253a77b31ca8518131c34293c4c9aaccd5b",
    phase_id: "phase-4",
    gate_type: "research-convergence",
    question: "Jak custom installer powinien obsługiwać nieznaną lub niepotwierdzoną wersję harnessu?",
    options: ["4A — zawsze fail-closed poza zadeklarowanym zakresem", "4B — zawsze warning i best-effort install", "4C — capability-sensitive: semantic fail-closed, packaging provisional (Recommended)", "Need more info"],
    original_recommendation: "4C — capability-sensitive: semantic fail-closed, packaging provisional (Recommended)",
    status: "decided",
    selected_option: "4C — capability-sensitive: semantic fail-closed, packaging provisional (Recommended)",
    final_actor: "user",
    rationale: "User selected capability-sensitive compatibility with fail-closed semantic boundaries and provisional packaging-only compatibility.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:9d56a4cec456a5958dbefc581a6fe1ac046278c265f19685240d902cbf817948",
    phase_id: "phase-4",
    gate_type: "research-convergence",
    question: "Jaką bramkę jakości przyjąć dla overlay i instalacji Claude Code bez dostępnego runtime?",
    options: ["5A — blokować ukończenie zadania bez Claude E5/E6", "5B — wymagać E1–E4 + shared-core E3, a E5/E6 oznaczyć jako unavailable (Recommended)", "5C — community/canary certification przed stable promotion", "Need more info"],
    original_recommendation: "5B — wymagać E1–E4 + shared-core E3, a E5/E6 oznaczyć jako unavailable (Recommended)",
    status: "decided",
    selected_option: "Need more info",
    final_actor: "user",
    rationale: "User rejected retaining an untestable Claude Code target and requested removing it until a real need and runtime exist.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:af63e4bae8d90431fe69ac253a4d766f0f4d06f92f0b0310a72f2fa59edfae1a",
    phase_id: "phase-4",
    gate_type: "research-convergence",
    question: "Co zrobić z targetem Claude Code w docelowej architekturze?",
    options: ["5D — usunąć Claude Code ze wspieranych targetów i dodać ponownie dopiero przy realnej potrzebie (Recommended)", "5B — zachować Claude z E1–E4 i jawnym E5/E6 unavailable", "5A — zachować Claude i blokować ukończenie bez E5/E6", "Need more info"],
    original_recommendation: "5D — usunąć Claude Code ze wspieranych targetów i dodać ponownie dopiero przy realnej potrzebie (Recommended)",
    status: "decided",
    selected_option: "5D — usunąć Claude Code ze wspieranych targetów i dodać ponownie dopiero przy realnej potrzebie (Recommended)",
    final_actor: "user",
    rationale: "User confirmed removal of Claude Code from supported targets; future support will be a separate new-harness task driven by real need and available runtime.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:deff7dc9407e4bf7bd8e9827eea83f0943d11d5daa1793b43db636eb584db001",
    phase_id: "phase-4",
    gate_type: "phase-4-exit",
    question: "Brainstorming complete. Continue to high-level design?",
    options: ["Continue to high-level design", "Pause workflow"],
    original_recommendation: "Continue to high-level design",
    status: "decided",
    selected_option: "Continue to high-level design",
    final_actor: "user",
    rationale: "User explicitly chose to continue from completed solution convergence to high-level design.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:27838d495a10abcfeb14322b18149cd45829a1c61bda25c3992a388e58244645",
    phase_id: "phase-5",
    gate_type: "research-clarification",
    question: "Założenia projektu: wspieramy Codex, Cursor i Kiro CLI; Claude Code i marketplace są poza zakresem; generic skills są kopiowane bez transformacji; jawne host overlays zawierają hooks, agents, commands, manifests i settings; custom installer składa i instaluje wynik transakcyjnie; legacy generated trees znikają przed zamknięciem zadania. Czy potwierdzasz te założenia?",
    options: ["Confirm assumptions", "Correct assumptions", "Provide more context"],
    original_recommendation: "Confirm assumptions",
    status: "decided",
    selected_option: "Confirm assumptions",
    final_actor: "user",
    rationale: "User confirmed the consolidated architecture assumptions without corrections.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:6bdf08499f5ea52adcb109887df08612b87fed5c1a2a6ba779d4fc70c9cb160e",
    phase_id: "phase-5",
    gate_type: "phase-5-exit",
    question: "Design complete. Continue to output generation?",
    options: ["Continue to output generation", "Pause workflow"],
    original_recommendation: "Continue to output generation",
    status: "decided",
    selected_option: "Continue to output generation",
    final_actor: "user",
    rationale: "User explicitly chose to continue from the completed high-level design to final output generation.",
    confidence: "high"
  }, {
    idempotency_key: "sha256:b35883e703798a8680ccae7ccae72418a71acd780faaa9c19d3a12a5723f17ce",
    phase_id: "phase-6",
    gate_type: "final-handoff-approval",
    question: "Research workflow complete. Complete workflow?",
    options: ["Complete workflow", "Keep workflow open"],
    original_recommendation: "Complete workflow",
    status: "decided",
    selected_option: "Complete workflow",
    final_actor: "user",
    rationale: "User explicitly approved the final research handoff and completion of the workflow.",
    confidence: "high"
  }]
};
