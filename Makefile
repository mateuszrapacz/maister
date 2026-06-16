.PHONY: build build-copilot build-cursor build-kiro build-kilo validate validate-copilot validate-cursor validate-kiro validate-kilo clean clean-copilot clean-cursor clean-kiro clean-kilo watch

build: build-copilot build-cursor build-kiro build-kilo

build-copilot:
	bash platforms/copilot-cli/build.sh

build-cursor:
	bash platforms/cursor/build.sh

build-kiro:
	bash platforms/kiro-cli/build.sh

build-kilo:
	bash platforms/kilo-cli/build.sh

validate: validate-copilot validate-cursor validate-kiro validate-kilo

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

validate-cursor:
	@echo "=== Cursor validation ==="
	@test -d plugins/maister-cursor || (echo "FAIL: plugins/maister-cursor not built — run make build-cursor" && exit 1)
	@echo "Checking command names use maister- prefix (no colons)..."
	@! grep -r '^name:.*:' plugins/maister-cursor/commands/ 2>/dev/null || (echo "FAIL: colons in command names" && exit 1)
	@grep -q '^name: maister-' plugins/maister-cursor/commands/quick-plan.md || (echo "FAIL: expected maister- command prefix" && exit 1)
	@grep -q '^name: maister-' plugins/maister-cursor/commands/quick-dev.md || (echo "FAIL: quick-dev command override missing or wrong prefix" && exit 1)
	@echo "Checking quick-plan skill integrity..."
	@! grep -q 'plan approval gate' plugins/maister-cursor/skills/quick-plan/SKILL.md 2>/dev/null || (echo "FAIL: corrupted quick-plan skill (plan approval gate fragment)" && exit 1)
	@echo "Checking no EnterPlanMode/ExitPlanMode..."
	@! grep -rE 'EnterPlanMode|ExitPlanMode' plugins/maister-cursor/ --include="*.md" 2>/dev/null || (echo "FAIL: plan mode references found" && exit 1)
	@echo "Checking no CLAUDE.md in skills..."
	@! grep -ri 'CLAUDE\.md' plugins/maister-cursor/skills/ 2>/dev/null || (echo "FAIL: CLAUDE.md references in skills" && exit 1)
	@echo "Checking hooks.json version and events..."
	@grep -q '"version": 1' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: hooks.json missing version 1" && exit 1)
	@grep -q 'beforeShellExecution' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: beforeShellExecution missing" && exit 1)
	@grep -q 'preCompact' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: preCompact missing" && exit 1)
	@grep -q 'sessionStart' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: sessionStart missing" && exit 1)
	@grep -q 'subagentStart' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: subagentStart missing" && exit 1)
	@grep -q 'subagentStop' plugins/maister-cursor/hooks/hooks.json || (echo "FAIL: subagentStop missing" && exit 1)
	@echo "Checking agent frontmatter uses maister- prefix..."
	@! grep -h '^name: ' plugins/maister-cursor/agents/*.md 2>/dev/null | grep -v '^name: maister-' || (echo "FAIL: agent without maister- prefix" && exit 1)
	@test -f plugins/maister-cursor/agents/gap-analyzer.md && grep -q '^name: maister-gap-analyzer' plugins/maister-cursor/agents/gap-analyzer.md || (echo "FAIL: gap-analyzer name mismatch" && exit 1)
	@echo "Checking mcp.json exists, .mcp.json does not..."
	@test -f plugins/maister-cursor/mcp.json || (echo "FAIL: mcp.json missing" && exit 1)
	@test ! -f plugins/maister-cursor/.mcp.json || (echo "FAIL: .mcp.json should not exist" && exit 1)
	@echo "Checking explore subagent uses maister-explore..."
	@! grep -r 'subagent_type.*Explore' plugins/maister-cursor/ --include="*.md" 2>/dev/null || (echo "FAIL: Explore (capitalized) found" && exit 1)
	@! grep -rE 'subagent_type[=:][[:space:]]*"?explore"?' plugins/maister-cursor/ --include="*.md" 2>/dev/null || (echo "FAIL: built-in explore subagent reference found" && exit 1)
	@test -f plugins/maister-cursor/agents/explore.md || (echo "FAIL: maister-explore agent missing" && exit 1)
	@grep -q '^name: maister-explore' plugins/maister-cursor/agents/explore.md || (echo "FAIL: explore agent name mismatch" && exit 1)
	@grep -q '^model: inherit' plugins/maister-cursor/agents/explore.md || (echo "FAIL: explore agent must inherit parent model" && exit 1)
	@echo "Checking .cursor-plugin manifest..."
	@test -f plugins/maister-cursor/.cursor-plugin/plugin.json || (echo "FAIL: .cursor-plugin/plugin.json missing" && exit 1)
	@grep -q '"skills":' plugins/maister-cursor/.cursor-plugin/plugin.json || (echo "FAIL: plugin.json missing skills path" && exit 1)
	@grep -q '"commands":' plugins/maister-cursor/.cursor-plugin/plugin.json || (echo "FAIL: plugin.json missing commands path" && exit 1)
	@test ! -d plugins/maister-cursor/.claude-plugin || (echo "FAIL: .claude-plugin should not exist" && exit 1)
	@echo "Checking no maister: prefixes..."
	@! grep -r 'maister:' plugins/maister-cursor/ --include="*.md" 2>/dev/null || (echo "FAIL: maister: prefix found" && exit 1)
	@echo "Checking rules/maister-workflows.mdc..."
	@test -f plugins/maister-cursor/rules/maister-workflows.mdc || (echo "FAIL: maister-workflows.mdc missing" && exit 1)
	@echo "Checking no TaskCreate/TaskUpdate in cursor variant..."
	@! grep -rE 'TaskCreate|TaskUpdate' plugins/maister-cursor/ --include="*.md" 2>/dev/null || (echo "FAIL: TaskCreate/TaskUpdate found" && exit 1)
	@echo "Cursor checks passed"

# validate-kiro rules 1–28 (see .maister/tasks/.../implementation/spec.md)
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
	@echo "Rule 14: exactly 67 skill directories..."
	@test $$(find plugins/maister-kiro/skills -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ') -eq 67 || (echo "FAIL: expected 67 skill directories" && exit 1)
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
	@echo "Rule 23: exactly 25 unprefixed shortcut skill directories..."
	@test $$(find plugins/maister-kiro/skills -mindepth 1 -maxdepth 1 -type d ! -name 'maister-*' | wc -l | tr -d ' ') -eq 25 || (echo "FAIL: expected 25 unprefixed shortcut skill directories (rule 23)" && exit 1)
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
	@echo "Rule 28: exactly 42 maister-* skill directories..."
	@test $$(find plugins/maister-kiro/skills -mindepth 1 -maxdepth 1 -type d -name 'maister-*' | wc -l | tr -d ' ') -eq 42 || (echo "FAIL: expected 42 maister-* skill directories (rule 28)" && exit 1)
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

clean: clean-copilot clean-cursor clean-kiro clean-kilo

clean-copilot:
	rm -rf plugins/maister-copilot/

clean-cursor:
	rm -rf plugins/maister-cursor/

clean-kiro:
	rm -rf plugins/maister-kiro/

clean-kilo:
	rm -rf plugins/maister-kilo/

watch:
	fswatch -o plugins/maister/ | xargs -n1 -I{} make build
