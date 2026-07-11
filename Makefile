.PHONY: build build-copilot build-cursor build-kiro build-kilo build-codex validate validate-copilot validate-cursor validate-kiro validate-kilo validate-codex clean clean-copilot clean-cursor clean-kiro clean-kilo clean-codex watch

build: build-copilot build-cursor build-kiro build-kilo build-codex

build-copilot:
	bash platforms/copilot-cli/build.sh

build-cursor:
	bash platforms/cursor/build.sh

build-kiro:
	bash platforms/kiro-cli/build.sh

build-kilo:
	bash platforms/kilo-cli/build.sh

build-codex:
	bash platforms/codex-cli/build.sh

validate: validate-copilot validate-cursor validate-kiro validate-kilo validate-codex

validate-copilot:
	@echo "=== Copilot validation ==="
	@echo "Checking no colons in command names..."
	@! grep -r '^name:.*:' plugins/maister-copilot/commands/ 2>/dev/null || (echo "FAIL: colons in command names" && exit 1)
	@echo "Checking no multi-select references..."
	@! grep -ri 'multi.select\|multiSelect' plugins/maister-copilot/skills/ 2>/dev/null || (echo "FAIL: multi-select found in skills" && exit 1)
	@echo "Checking commands are flat (no subdirectories)..."
	@test $$(find plugins/maister-copilot/commands -mindepth 2 -name "*.md" 2>/dev/null | wc -l) -eq 0 || (echo "FAIL: nested command directories found" && exit 1)
	@echo "Checking no CLAUDE.md references in skills..."
	@! grep -ri 'CLAUDE\.md' plugins/maister-copilot/skills/ 2>/dev/null || (echo "FAIL: CLAUDE.md references found in skills" && exit 1)
	@echo "Checking no maister- prefix in copilot command names..."
	@! grep -r '^name: maister-' plugins/maister-copilot/commands/ 2>/dev/null || (echo "FAIL: maister- prefix in command names" && exit 1)
	@echo "Checking no maister: prefixes in copilot variant..."
	@! grep -r 'maister:' plugins/maister-copilot/ --include="*.md" 2>/dev/null || (echo "FAIL: maister: prefix found" && exit 1)
	@echo "Copilot checks passed"

# Structural checks only (prefixes, manifest, hook wiring). Does not verify runtime
# hook behavior — e.g. destructive-command deny requires a live Cursor session.
validate-cursor:
	@echo "=== Cursor validation ==="
	@test -d plugins/maister-cursor || (echo "FAIL: plugins/maister-cursor not built — run make build-cursor" && exit 1)
	@echo "PR1: orchestrator-framework in lib/..."
	@test ! -d plugins/maister-cursor/skills/orchestrator-framework || (echo "FAIL: orchestrator-framework still under skills/" && exit 1)
	@test -f plugins/maister-cursor/lib/orchestrator-framework/references/orchestrator-patterns.md || (echo "FAIL: lib orchestrator-patterns missing" && exit 1)
	@! grep -rq 'skills/orchestrator-framework' plugins/maister-cursor/ --include="*.md" || (echo "FAIL: stale skills/orchestrator-framework path" && exit 1)
	@echo "PR2: skills-only manifest (no commands/)..."
	@test ! -d plugins/maister-cursor/commands || (echo "FAIL: commands/ still exists" && exit 1)
	@! grep -q '"commands":' plugins/maister-cursor/.cursor-plugin/plugin.json || (echo "FAIL: plugin.json still has commands field" && exit 1)
	@test -f plugins/maister-cursor/skills/maister-work/SKILL.md || (echo "FAIL: maister-work skill missing" && exit 1)
	@test -f plugins/maister-cursor/skills/maister-reviews-code/SKILL.md || (echo "FAIL: maister-reviews-code skill missing" && exit 1)
	@test ! -d plugins/maister-cursor/skills/maister-quick-problem-classifier || (echo "FAIL: duplicate collapse dir maister-quick-problem-classifier" && exit 1)
	@echo "PR3: all public skills use maister- prefix..."
	@! grep -h '^name: ' plugins/maister-cursor/skills/*/SKILL.md | grep -v '^name: maister-' || (echo "FAIL: skill without maister- prefix" && exit 1)
	@! grep -h '^name: maister:' plugins/maister-cursor/skills/*/SKILL.md 2>/dev/null || (echo "FAIL: colon in skill name" && exit 1)
	@! find plugins/maister-cursor/skills -mindepth 1 -maxdepth 1 -type d ! -name 'maister-*' | grep -q . || true
	@test -f plugins/maister-cursor/skills/maister-quick-plan/SKILL.md || (echo "FAIL: maister-quick-plan missing" && exit 1)
	@test -f plugins/maister-cursor/skills/maister-quick-dev/SKILL.md || (echo "FAIL: maister-quick-dev missing" && exit 1)
	@for skill in maister-resume maister-status maister-next maister-bye maister-dev; do \
		test -f "plugins/maister-cursor/skills/$$skill/SKILL.md" || (echo "FAIL: $$skill utility skill missing" && exit 1); \
	done
	@test -d plugins/maister-cursor/skills/maister-problem-classifier || (echo "FAIL: maister-problem-classifier missing" && exit 1)
	@test ! -d plugins/maister-cursor/skills/problem-classifier || (echo "FAIL: plain-kebab dir problem-classifier remains" && exit 1)
	@echo "PR3: quick-plan skill integrity..."
	@! grep -q 'plan approval gate' plugins/maister-cursor/skills/maister-quick-plan/SKILL.md 2>/dev/null || (echo "FAIL: corrupted quick-plan skill" && exit 1)
	@echo "PR3: quick-dev is rich workflow (not thin wrapper)..."
	@lines=$$(wc -l < plugins/maister-cursor/skills/maister-quick-dev/SKILL.md | tr -d ' '); \
		test $$lines -ge 20 || (echo "FAIL: quick-dev must be rich skill (>=20 lines), got $$lines" && exit 1)
	@echo "PR3: no plain skill: delegations..."
	@plain=$$(grep -rE 'skill: "[^m]' plugins/maister-cursor/skills/ --include="*.md" 2>/dev/null | grep -v 'maister-' || true); \
		test -z "$$plain" || (echo "FAIL: plain skill: reference: $$plain" && exit 1)
	@echo "PR3: agent skills preload uses maister- prefix..."
	@grep -A2 '^skills:' plugins/maister-cursor/agents/docs-operator.md | grep -q 'maister-docs-manager' || (echo "FAIL: docs-operator skills preload" && exit 1)
	@echo "PR4: internal engines relocated..."
	@test ! -d plugins/maister-cursor/skills/maister-docs-manager || (echo "FAIL: docs-manager still in skills/" && exit 1)
	@test ! -d plugins/maister-cursor/skills/maister-codebase-analyzer || (echo "FAIL: codebase-analyzer still in skills/" && exit 1)
	@test ! -d plugins/maister-cursor/skills/maister-implementation-plan-executor || (echo "FAIL: implementation-plan-executor still in skills/" && exit 1)
	@test ! -d plugins/maister-cursor/skills/maister-implementation-verifier || (echo "FAIL: implementation-verifier still in skills/" && exit 1)
	@test -d plugins/maister-cursor/lib/skills/maister-docs-manager || (echo "FAIL: lib/skills/maister-docs-manager missing (4B)" && exit 1)
	@test ! -d plugins/maister-cursor/lib/skills/maister-sentinel-lib-skill || (echo "FAIL: sentinel committed to generated tree" && exit 1)
	@echo "Checking no EnterPlanMode/ExitPlanMode..."
	@! grep -rE 'EnterPlanMode|ExitPlanMode' plugins/maister-cursor/ --include="*.md" 2>/dev/null || (echo "FAIL: plan mode references found" && exit 1)
	@echo "Checking no CLAUDE.md in skills..."
	@! grep -ri 'CLAUDE\.md' plugins/maister-cursor/skills/ 2>/dev/null || (echo "FAIL: CLAUDE.md references in skills" && exit 1)
	@echo "Checking hooks.json version and events..."
	@grep -q '"version": 1' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: hooks.json missing version 1" && exit 1)
	@grep -q 'beforeShellExecution' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: beforeShellExecution missing" && exit 1)
	@grep -q 'preToolUse' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: preToolUse missing" && exit 1)
	@grep -q 'block-risky-subagents.sh' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: block-risky-subagents hook missing" && exit 1)
	@test -x plugins/maister-cursor/hooks/block-risky-subagents.sh || (echo "FAIL: block-risky-subagents.sh not executable" && exit 1)
	@grep -q 'preCompact' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: preCompact missing" && exit 1)
	@grep -q 'sessionStart' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: sessionStart missing" && exit 1)
	@grep -q 'subagentStart' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: subagentStart missing" && exit 1)
	@grep -q 'subagentStop' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: subagentStop missing" && exit 1)
	@echo "Checking agent frontmatter uses maister- prefix..."
	@! grep -h '^name: ' plugins/maister-cursor/agents/*.md 2>/dev/null | grep -v '^name: maister-' || (echo "FAIL: agent without maister- prefix" && exit 1)
	@test -f plugins/maister-cursor/agents/gap-analyzer.md && grep -q '^name: maister-gap-analyzer' plugins/maister-cursor/agents/gap-analyzer.md || (echo "FAIL: gap-analyzer name mismatch" && exit 1)
	@echo "Checking default build has no Playwright MCP..."
	@test ! -f plugins/maister-cursor/mcp.json || (echo "FAIL: default Cursor build must not include mcp.json" && exit 1)
	@test ! -f plugins/maister-cursor/.mcp.json || (echo "FAIL: .mcp.json should not exist" && exit 1)
	@echo "Checking explore subagent uses maister-explore..."
	@! grep -r 'subagent_type.*Explore' plugins/maister-cursor/ --include="*.md" 2>/dev/null || (echo "FAIL: Explore (capitalized) found" && exit 1)
	@! grep -rE 'subagent_type[=:][[:space:]]*"?explore"?' plugins/maister-cursor/ --include="*.md" 2>/dev/null || (echo "FAIL: built-in explore subagent reference found" && exit 1)
	@test -f plugins/maister-cursor/agents/explore.md || (echo "FAIL: maister-explore agent missing" && exit 1)
	@grep -q '^name: maister-explore' plugins/maister-cursor/agents/explore.md || (echo "FAIL: explore agent name mismatch" && exit 1)
	@grep -q '^model: inherit' plugins/maister-cursor/agents/explore.md || (echo "FAIL: explore agent must inherit parent model" && exit 1)
	@grep -q '^readonly: true' plugins/maister-cursor/agents/explore.md || (echo "FAIL: explore agent must be readonly" && exit 1)
	@echo "Checking read-only agents have readonly: true..."
	@for agent in bottleneck-analyzer code-quality-pragmatist code-reviewer implementation-completeness-checker production-readiness-checker reality-assessor test-suite-runner spec-auditor gap-analyzer task-classifier research-synthesizer research-planner information-gatherer codebase-analysis-reporter thermo-nuclear-review-subagent thermo-nuclear-code-quality-review-subagent solution-brainstormer e2e-test-verifier; do \
		grep -q '^readonly: true' "plugins/maister-cursor/agents/$$agent.md" || (echo "FAIL: $$agent missing readonly: true" && exit 1); \
	done
	@echo "Checking writer agents are not readonly..."
	@for agent in docs-operator user-docs-generator ui-mockup-generator html-companion-writer task-group-implementer implementation-planner specification-creator solution-designer; do \
		grep -q '^readonly: true' "plugins/maister-cursor/agents/$$agent.md" && (echo "FAIL: $$agent should not be readonly" && exit 1) || true; \
	done
	@test $$(grep -l '^readonly: true' plugins/maister-cursor/agents/*.md 2>/dev/null | wc -l | tr -d ' ') -ge 19 || (echo "FAIL: expected at least 19 readonly agents" && exit 1)
	@echo "Checking .cursor-plugin manifest..."
	@test -f plugins/maister-cursor/.cursor-plugin/plugin.json || (echo "FAIL: .cursor-plugin/plugin.json missing" && exit 1)
	@grep -q '"skills":' plugins/maister-cursor/.cursor-plugin/plugin.json || (echo "FAIL: plugin.json missing skills path" && exit 1)
	@! grep -q '"commands":' plugins/maister-cursor/.cursor-plugin/plugin.json || (echo "FAIL: plugin.json must not have commands path" && exit 1)
	@test ! -d plugins/maister-cursor/.claude-plugin || (echo "FAIL: .claude-plugin should not exist" && exit 1)
	@echo "Checking no maister: prefixes..."
	@! grep -r 'maister:' plugins/maister-cursor/ --include="*.md" 2>/dev/null || (echo "FAIL: maister: prefix found" && exit 1)
	@echo "Checking rules/maister-workflows.mdc..."
	@test -f plugins/maister-cursor/rules/maister-workflows.mdc || (echo "FAIL: maister-workflows.mdc missing" && exit 1)
	@echo "Checking rules/maister-no-fast-models.mdc..."
	@test -f plugins/maister-cursor/rules/maister-no-fast-models.mdc || (echo "FAIL: maister-no-fast-models.mdc missing" && exit 1)
	@grep -q 'alwaysApply: true' plugins/maister-cursor/rules/maister-no-fast-models.mdc || (echo "FAIL: maister-no-fast-models.mdc must be alwaysApply" && exit 1)
	@grep -qi 'fast' plugins/maister-cursor/rules/maister-no-fast-models.mdc || (echo "FAIL: maister-no-fast-models.mdc missing fast-model policy" && exit 1)
	@echo "Checking no TaskCreate/TaskUpdate in cursor variant..."
	@! grep -rE 'TaskCreate|TaskUpdate' plugins/maister-cursor/ --include="*.md" 2>/dev/null || (echo "FAIL: TaskCreate/TaskUpdate found" && exit 1)
	@echo "PR5: skill inventory test..."
	@bash platforms/cursor/tests/skill-inventory.test.sh
	@echo "PR6: default installation MCP test..."
	@bash platforms/cursor/tests/install.test.sh
	@echo "Cursor checks passed"

# validate-kiro rules 1–32 (see .maister/tasks/.../implementation/spec.md)
validate-kiro:
	@echo "=== Kiro validation ==="
	@echo "Rule 1: plugins/maister-kiro/ exists..."
	@test -d plugins/maister-kiro || (echo "FAIL: plugins/maister-kiro not built — run make build-kiro" && exit 1)
	@echo "Rule 2: no maister: prefixes..."
	@! grep -r 'maister:' plugins/maister-kiro/ --include="*.md" 2>/dev/null || (echo "FAIL: maister: prefix found" && exit 1)
	@echo "Rule 3: no colons in skill name frontmatter..."
	@! grep -r '^name:.*:' plugins/maister-kiro/skills/ --include="SKILL.md" 2>/dev/null || (echo "FAIL: colons in skill names" && exit 1)
	@echo "Rule 4: no EnterPlanMode/ExitPlanMode..."
	@matches=$$(grep -rE 'EnterPlanMode|ExitPlanMode' plugins/maister-kiro/ --include="*.md" 2>/dev/null | grep -v 'no EnterPlanMode' | grep -v 'no ExitPlanMode' || true); \
	test -z "$$matches" || (echo "FAIL: plan mode references found" && echo "$$matches" && exit 1)
	@echo "Rule 5: no CLAUDE.md references in skills..."
	@! grep -ri 'CLAUDE\.md' plugins/maister-kiro/skills/ 2>/dev/null || (echo "FAIL: CLAUDE.md references in skills" && exit 1)
	@echo "Rule 6: no .claude-plugin/ or .cursor-plugin/..."
	@test ! -d plugins/maister-kiro/.claude-plugin || (echo "FAIL: .claude-plugin should not exist" && exit 1)
	@test ! -d plugins/maister-kiro/.cursor-plugin || (echo "FAIL: .cursor-plugin should not exist" && exit 1)
	@echo "Rule 7: all agents/*.json parse with jq..."
	@for f in plugins/maister-kiro/agents/*.json; do jq empty "$$f" || (echo "FAIL: invalid JSON $$f" && exit 1); done
	@echo "Rule 8: agent names are maister or maister-*..."
	@for f in plugins/maister-kiro/agents/*.json; do \
		name=$$(jq -r '.name' "$$f"); \
		echo "$$name" | grep -qE '^(maister|maister-.*)$$' || (echo "FAIL: agent name $$name invalid (rule 8)" && exit 1); \
	done
	@echo "Rule 9: settings/mcp.json exists; no .mcp.json at root..."
	@test -f plugins/maister-kiro/settings/mcp.json || (echo "FAIL: settings/mcp.json missing" && exit 1)
	@test ! -f plugins/maister-kiro/.mcp.json || (echo "FAIL: .mcp.json should not exist at root" && exit 1)
	@echo "Rule 10: steering/maister-workflows.md exists..."
	@test -f plugins/maister-kiro/steering/maister-workflows.md || (echo "FAIL: steering/maister-workflows.md missing" && exit 1)
	@echo "Rule 11: no AskUserQuestion or AskQuestion..."
	@matches=$$(grep -rE 'AskUserQuestion|AskQuestion' plugins/maister-kiro/ --include="*.md" 2>/dev/null | grep -v 'no AskQuestion' | grep -v 'no AskUserQuestion' || true); \
	test -z "$$matches" || (echo "FAIL: AskUserQuestion/AskQuestion found" && echo "$$matches" && exit 1)
	@echo "Rule 12: no capitalized Explore subagent_type..."
	@! grep -r 'subagent_type.*Explore' plugins/maister-kiro/ --include="*.md" 2>/dev/null || (echo "FAIL: Explore (capitalized) found" && exit 1)
	@echo "Rule 13: SKILL.md name matches parent directory..."
	@for d in plugins/maister-kiro/skills/*/; do \
		dir=$$(basename "$$d"); \
		name=$$(grep -m1 '^name:' "$$d/SKILL.md" 2>/dev/null | sed 's/^name: *//'); \
		test "$$name" = "$$dir" || (echo "FAIL: skill name mismatch $$dir vs $$name (rule 13)" && exit 1); \
	done
	@echo "Rule 14: exactly 69 skill directories..."
	@test $$(find plugins/maister-kiro/skills -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ') -eq 69 || (echo "FAIL: expected 69 skill directories" && exit 1)
	@echo "Rule 15: no standalone hooks/hooks.json..."
	@test ! -f plugins/maister-kiro/hooks/hooks.json || (echo "FAIL: hooks/hooks.json should not exist" && exit 1)
	@echo "Rule 16: no commands/ directory..."
	@test ! -d plugins/maister-kiro/commands || (echo "FAIL: commands/ should not exist in output" && exit 1)
	@echo "Rule 17: agents/maister.json exists with hooks field..."
	@test -f plugins/maister-kiro/agents/maister.json || (echo "FAIL: agents/maister.json missing" && exit 1)
	@jq -e '.hooks != null' plugins/maister-kiro/agents/maister.json >/dev/null || (echo "FAIL: maister.json missing hooks field" && exit 1)
	@echo "Rule 18: agents/maister-explore.json exists..."
	@test -f plugins/maister-kiro/agents/maister-explore.json || (echo "FAIL: maister-explore.json missing" && exit 1)
	@echo "Rule 19: no agents/*.md (JSON + instructions only)..."
	@test $$(find plugins/maister-kiro/agents -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ') -eq 0 || (echo "FAIL: agents/*.md found" && exit 1)
	@echo "Rule 20: no TaskCreate/TaskUpdate..."
	@! grep -rE 'TaskCreate|TaskUpdate' plugins/maister-kiro/ --include="*.md" 2>/dev/null || (echo "FAIL: TaskCreate/TaskUpdate found" && exit 1)
	@echo "Rule 21: trustedAgents in maister.json toolsSettings..."
	@jq -e '.toolsSettings.subagent.trustedAgents | length > 0' plugins/maister-kiro/agents/maister.json >/dev/null || (echo "FAIL: maister.json missing trustedAgents (rule 21)" && exit 1)
	@echo "Rule 22: hook scripts in hooks/ are executable..."
	@for f in plugins/maister-kiro/hooks/*.sh; do \
		test -x "$$f" || (echo "FAIL: hook not executable $$f (rule 22)" && exit 1); \
	done
	@echo "Rule 23: exactly 26 unprefixed shortcut skill directories..."
	@test $$(find plugins/maister-kiro/skills -mindepth 1 -maxdepth 1 -type d ! -name 'maister-*' | wc -l | tr -d ' ') -eq 26 || (echo "FAIL: expected 26 unprefixed shortcut skill directories (rule 23)" && exit 1)
	@echo "Rule 24: maister-kiro wrapper in platforms/kiro-cli/..."
	@test -x platforms/kiro-cli/maister-kiro || (echo "FAIL: maister-kiro wrapper not executable (rule 24)" && exit 1)
	@echo "Rule 25: no AskUserQuestion/AskQuestion in output tree (incl. hooks)..."
	@matches=$$(grep -rE 'AskUserQuestion|AskQuestion' plugins/maister-kiro/ --include="*.md" --include="*.sh" 2>/dev/null | grep -v 'no AskQuestion' | grep -v 'no AskUserQuestion' || true); \
	test -z "$$matches" || (echo "FAIL: AskUserQuestion/AskQuestion found (rule 25)" && echo "$$matches" && exit 1)
	@echo "Rule 26: CHAT GATE count threshold (see chat-gate-audit.md)..."
	@test $$(grep -c 'CHAT GATE' plugins/maister-kiro/skills/maister-development/SKILL.md) -ge 53 || (echo "FAIL: maister-development CHAT GATE count below 53 (rule 26)" && exit 1)
	@test $$(grep -r 'CHAT GATE' plugins/maister-kiro/skills/ --include="*.md" 2>/dev/null | wc -l | tr -d ' ') -ge 200 || (echo "FAIL: total CHAT GATE count below 200 (rule 26)" && exit 1)
	@echo "Rule 27: transforms/askuser-to-chat-gate.md exists..."
	@test -f platforms/kiro-cli/transforms/askuser-to-chat-gate.md || (echo "FAIL: askuser-to-chat-gate.md missing (rule 27)" && exit 1)
	@echo "Rule 28: exactly 43 maister-* skill directories..."
	@test $$(find plugins/maister-kiro/skills -mindepth 1 -maxdepth 1 -type d -name 'maister-*' | wc -l | tr -d ' ') -eq 43 || (echo "FAIL: expected 43 maister-* skill directories (rule 28)" && exit 1)
	@echo "Rule 29: no agents/*.json promptFile key..."
	@for f in plugins/maister-kiro/agents/*.json; do \
		jq -e 'has("promptFile")' "$$f" >/dev/null 2>&1 && (echo "FAIL: promptFile key in $$f (rule 29)" && exit 1) || true; \
	done
	@echo "Rule 30: no agents/*.json model inherit..."
	@for f in plugins/maister-kiro/agents/*.json; do \
		jq -e '.model == "inherit"' "$$f" >/dev/null 2>&1 && (echo "FAIL: model inherit in $$f (rule 30)" && exit 1) || true; \
	done
	@echo "Rule 31: all agents/*.json prompt uses file:// URI..."
	@for f in plugins/maister-kiro/agents/*.json; do \
		jq -e '(.prompt | type) == "string" and (.prompt | startswith("file://"))' "$$f" >/dev/null || (echo "FAIL: prompt missing or not file:// URI in $$f (rule 31)" && exit 1); \
	done
	@echo "Rule 32: maister.json hooks.stop includes stop-state-reminder-kiro..."
	@jq -e '(.hooks.stop // []) | map(.command) | any(test("stop-state-reminder-kiro"))' \
		plugins/maister-kiro/agents/maister.json >/dev/null || \
		(echo "FAIL: maister.json missing stop-state-reminder-kiro on hooks.stop (rule 32)" && exit 1)
	@echo "Kiro checks passed"

validate-kilo:
	@echo "=== Kilo validation ==="
	@echo "Checking plugins/maister-kilo exists..."
	@test -d plugins/maister-kilo || (echo "FAIL: plugins/maister-kilo not built — run make build-kilo" && exit 1)
	@echo "Checking docs-operator has edit permission..."
	@grep -A2 '^permission:' plugins/maister-kilo/.kilo/agents/maister-docs-operator.md | grep -q 'edit: allow' || (echo "FAIL: docs-operator missing edit permission" && exit 1)
	@echo "Checking all agent references use maister- prefix..."
	@! grep -rnE 'subagent_type:' plugins/maister-kilo/.kilo/skills/ | grep -vE 'maister-|general-purpose' || (echo "FAIL: unprefixed subagent_type found" && exit 1)
	@echo "Checking all skill directories have SKILL.md..."
	@test $$(find plugins/maister-kilo/.kilo/skills -mindepth 1 -maxdepth 1 -type d ! -exec test -f {}/SKILL.md \; -print | wc -l | tr -d ' ') -eq 0 || (echo "FAIL: skill directory missing SKILL.md" && exit 1)
	@echo "Checking skill names match directory names..."
	@for d in plugins/maister-kilo/.kilo/skills/*/; do \
		dir=$$(basename "$$d"); \
		name=$$(grep -m1 '^name:' "$$d/SKILL.md" 2>/dev/null | sed 's/^name: *//'); \
		test "$$name" = "$$dir" || (echo "FAIL: skill name mismatch $$dir vs $$name" && exit 1); \
	done
	@echo "Checking no colon-prefixed commands in smoke-install.sh..."
	@! grep -q '/maister:' platforms/kilo-cli/smoke-install.sh || (echo "FAIL: colon-prefixed /maister: command found in smoke-install.sh" && exit 1)
	@echo "Kilo checks passed"

validate-codex:
	@echo "=== Codex validation ==="
	@bash platforms/codex-cli/smoke-cli.sh

clean: clean-copilot clean-cursor clean-kiro clean-kilo clean-codex

clean-copilot:
	rm -rf plugins/maister-copilot/

clean-cursor:
	rm -rf plugins/maister-cursor/

clean-kiro:
	rm -rf plugins/maister-kiro/

clean-kilo:
	rm -rf plugins/maister-kilo/

clean-codex:
	rm -rf plugins/maister-codex/

watch:
	fswatch -o plugins/maister/ | xargs -n1 -I{} make build
