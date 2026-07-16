# Source Plan: platform-independent Maister

## TL;DR
Pierwszeństwo mają źródła pierwotne: canonical code, adaptery, instalatory, testy, CI oraz oficjalne kontrakty czterech hostów.
Dokumentacja projektu opisuje intencję, natomiast kod i uruchamialne testy potwierdzają faktyczny stan.
Każde źródło zostanie przypisane do warstwy architektury i siły dowodu, aby szczególnie dla Claude Code nie pomylić walidacji statycznej z runtime proof.

## Key Decisions
- Lokalne źródła będą cytowane jako `path:line`; źródła internetowe jako oficjalny URL, data dostępu i wersja, jeśli jest dostępna.
- Generated variants będą traktowane jako dowód shape/materialization, a nie jako niezależne potwierdzenie wspólnej semantyki.
- Dowody testowe będą klasyfikowane na unit/contract, golden/structural, install, smoke i runtime E2E.
- Nieoficjalne artykuły mogą służyć wyłącznie do odkrywania tropów; kluczowe wymagania muszą wrócić do źródła host-owned.

## Open Questions / Risks
- Oficjalne dokumentacje mogą nie gwarantować stabilności wszystkich niejawnych zachowań CLI i marketplace.
- Lokalnie obecne skrypty `claude.e2e.sh` mogą wymagać runtime, którego badanie nie może uruchomić; sam plik nie jest dowodem udanego E2E.
- Brak lockfile dla opcjonalnych narzędzi może osłabić reprodukowalność dowodów środowiskowych.

## Source Priority

1. **P0 — executable primary evidence:** kod runtime, adaptery/materializery, instalatory, walidatory, testy i CI, które można odczytać lub uruchomić.
2. **P1 — contractual primary evidence:** oficjalne dokumentacje i schematy Claude Code, OpenAI Codex, Cursor i Kiro.
3. **P2 — project intent:** dokumentacja architektury, vision, roadmap, standards i README.
4. **P3 — secondary context:** materiały zewnętrzne tylko do porównania wzorców; nie mogą samodzielnie uzasadniać host compatibility.

## Local Primary Sources

### Canonical behavior and runtime

- `plugins/maister/CLAUDE.md` — kanoniczne instrukcje hosta źródłowego i sygnał Claude-oriented coupling.
- `plugins/maister/.claude-plugin/plugin.json` — canonical manifest i pola zależne od Claude Code.
- `plugins/maister/skills/*/SKILL.md` — model zachowania workflow, invocation i host vocabulary.
- `plugins/maister/agents/*.md` — role, narzędzia i kontrakty delegacji.
- `plugins/maister/commands/*.md` — canonical command wrappers i granica commands/skills.
- `plugins/maister/hooks/*` — canonical hook surface i safety behavior.
- `plugins/maister/skills/orchestrator-framework/references/orchestrator-patterns.md` — kontrakt faz, stanu, bramek i wznowienia.
- `plugins/maister/skills/orchestrator-framework/references/gate-decision-engine.md` — portable/manual/advisor gate semantics.
- `plugins/maister/skills/orchestrator-framework/references/host-capabilities.yml` — deklarowana macierz capabilities do zweryfikowania z implementacją i testami.
- `plugins/maister/skills/orchestrator-framework/bin/*.mjs` — wspólny executable runtime/core kandydat do jednokrotnego testowania.

### Build and transformation boundary

- `Makefile` — entry points build/validate oraz aktualna kolejność generacji.
- `platforms/cursor/build.sh` i `platforms/cursor/{transforms,patches,overrides,templates,rules}/` — typy transformacji Cursor.
- `platforms/kiro-cli/build.sh`, `generate-agent-json.sh` i `platforms/kiro-cli/{transforms,overrides,templates}/` — Kiro materialization i generation contracts.
- `platforms/codex-cli/build.sh` i `platforms/codex-cli/{templates,hooks,bin}/` — Codex materialization, TOML agents i runtime wrappers.
- `plugins/maister-cursor/`, `plugins/maister-kiro/`, `plugins/maister-codex/` — generated host-native shape, inventory i drift; analizować przez porównanie z wejściem/adaptorem.
- `.github/workflows/validate-generated-variants.yml` — CI drift contract.
- `.github/workflows/release.yml` — jakie artefakty są faktycznie dystrybuowane i wersjonowane.

### Installation and host discovery

- `platforms/cursor/smoke-install.sh`, `platforms/cursor/tests/install.test.sh`, `platforms/cursor/smoke-cli.sh` — instalacja, filesystem layout i dostępne CLI proof.
- `platforms/kiro-cli/maister-kiro`, `platforms/kiro-cli/smoke-install.sh`, `smoke-uninstall.sh`, `smoke-cli.sh` — Kiro install/uninstall i entry point.
- `platforms/codex-cli/smoke-install.sh`, `platforms/codex-cli/tests/install.test.sh`, `smoke-cli.sh` — Codex install/config/CLI proof.
- `README.md`, `docs/codex-support.md`, `docs/cursor-agent-support.md`, `docs/kiro-cli-support.md`, `docs/on-demand-skills.md` — udokumentowany user journey do sprawdzenia z implementacją.

### Testing and assurance

- `tests/host-continuation/claude.e2e.sh` — intencja Claude runtime E2E; sprawdzić prerequisites i nie uznawać za wykonany dowód bez udanego runu.
- `tests/workflow-continuation.test.sh`, `tests/fully-automatic-phase-continue.test.sh`, `tests/phase-continue-contract.test.sh` — testy wspólnego continuation/state core.
- `tests/gate-decision-engine.test.sh`, `tests/gate-evaluator.test.sh`, `tests/orchestrator-state-repository.test.sh` — wspólny gate/state runtime contract.
- `tests/host-capability-matrix.test.sh` — spójność capability declarations.
- `tests/advisor-*.test.sh` oraz `tests/fixtures/advisor-*` — cross-platform configuration and safety evidence.
- `platforms/cursor/tests/*.test.sh` i `fully-automatic-continuation.e2e.sh` — structural/install/runtime boundary dla Cursor.
- `platforms/kiro-cli/tests/*.test.sh` i `fully-automatic-continuation.e2e.sh` — generation/install/runtime boundary dla Kiro.
- `platforms/codex-cli/tests/*.test.sh` i `fully-automatic-continuation.e2e.sh` — native evidence i runtime boundary dla Codex.
- `.github/workflows/cursor-cli-smoke.yml` — realne pokrycie środowiskowe i jego blocking/non-blocking status.

## Project Documentation Sources

- `.maister/docs/project/vision.md` — docelowe single-source, parity i safety principles.
- `.maister/docs/project/architecture.md` — opis aktualnego canonical + deterministic multi-target model.
- `.maister/docs/project/roadmap.md` — rozpoznane długi: runtime coverage, semantic transforms, golden fixtures i capability matrix.
- `.maister/docs/project/tech-stack.md` — dostępne runtime/tooling constraints i brak root dependency lock.
- `.maister/docs/standards/global/build-pipeline.md` — obowiązująca własność generated targets i release validation.
- `.maister/docs/standards/global/minimal-implementation.md` — ograniczenie spekulacyjnych abstrakcji.
- `.maister/docs/standards/global/validation.md` i `error-handling.md` — wymagania dla przyszłego install-time selector/materializer.
- `.maister/docs/standards/testing/test-writing.md` — behavior focus, risk-based depth i transactional rejection tests.

## External Primary Sources to Verify

Gatherer `host-contracts-installation` powinien wyszukać wyłącznie aktualne, oficjalne źródła i zapisać datę dostępu 2026-07-14:

### Claude Code / Anthropic

- Oficjalna dokumentacja plugin marketplace, plugin manifests i installation/discovery.
- Oficjalna dokumentacja skills, slash commands, subagents, hooks i MCP.
- Oficjalna dokumentacja headless/non-interactive CLI lub dostępnych mechanizmów walidacji; ustalić, czy istnieje wspierany sposób testów bez interaktywnego runtime.
- Release notes lub compatibility/version statements, jeśli kontrakt różni się między wersjami.

### OpenAI Codex

- Oficjalna dokumentacja Codex plugins/skills/agents oraz local marketplace/install layout.
- Oficjalna dokumentacja `AGENTS.md`, agent TOML, tools, subagent delegation i automation/CLI execution.
- Oficjalne źródła dla hooks/continuation tylko jeśli są częścią publicznego kontraktu używanego przez projekt.

### Cursor

- Oficjalna dokumentacja Agent CLI, plugins, rules/MDC, skills/commands, hooks i subagents.
- Oficjalna dokumentacja instalacji lokalnej, discovery paths i możliwości non-interactive/smoke testing.

### Kiro CLI

- Oficjalna dokumentacja custom agents, skills, hooks, steering i MCP.
- Oficjalna dokumentacja layoutu instalacji, agent JSON schema oraz headless/CLI execution.

### Portable installer/runtime constraints

- Oficjalna dokumentacja Node.js dla filesystem/process/path/crypto używanych w potencjalnym materializerze.
- POSIX/GNU/BSD źródła tylko dla konkretnego portability claim dotyczącego shell tools; preferować eliminację zależności od implementacyjnych różnic nad szeroką literaturą.

## Evidence Ladder

| Poziom | Rodzaj dowodu | Co można twierdzić | Czego nie można twierdzić |
|---|---|---|---|
| E0 | Dokument/intencja | Zamierzony kontrakt lub roadmapa | Że implementacja działa |
| E1 | Static/schema validation | Pliki mają oczekiwany shape i dozwolone wartości | Że host je odkryje lub wykona |
| E2 | Golden/reproducible transform | Materializacja jest deterministyczna i zgodna z fixture | Że semantyka jest równoważna w runtime |
| E3 | Isolated executable contract | Wspólny helper/core spełnia kontrakt na fixtures | Że integracja hosta działa |
| E4 | Install/uninstall test | Layout, rollback i lokalne config mutations są poprawne | Że workflow wykona się w hoście |
| E5 | Host CLI smoke | Host odkrywa plugin i wykonuje wąską ścieżkę | Że wszystkie workflow zachowują parity |
| E6 | Host runtime E2E | Konkretny scenariusz działa w określonej wersji hosta | Że przyszłe wersje zachowają kompatybilność |

Dla Claude Code raport musi wskazać najwyższy faktycznie osiągnięty poziom. Brak dostępnego runtime oznacza, że E6 pozostaje `unverified`, nawet jeśli E1–E4 są kompletne.

## Citation Record Template

Każdy finding powinien używać minimalnie tego formatu:

```markdown
### Finding: <krótka nazwa>

- Claim: <sprawdzalne twierdzenie>
- Evidence:
  - Local: `path/to/file:line` — <co dokładnie potwierdza>
  - Official: <URL> (accessed 2026-07-14, version <x/unknown>) — <co dokładnie potwierdza>
- Evidence level: E0–E6
- Confidence: high | medium | low
- Inference/limitation: <jawne rozdzielenie wniosku od źródła>
```

## Cross-Checks Required Before Synthesis

- Porównać `host-capabilities.yml` z adapterami, testami i oficjalnymi dokumentacjami.
- Porównać canonical manifest/instructions z każdym generated manifest/layout.
- Porównać wszystkie transform/patch/override classes i oznaczyć duplikacje lub semantyczne wyjątki.
- Porównać dokumentowane install flows z wykonywalnymi install tests.
- Dla każdego E2E ustalić, czy naprawdę uruchamia host CLI/runtime, czy tylko wspólny runner pod nazwą platformy.
- Ustalić, które testy mogą działać raz przeciw canonical core, a które muszą pozostać w target-specific contract matrix.

