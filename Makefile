.PHONY: build build-copilot build-cursor validate validate-copilot validate-cursor clean clean-copilot clean-cursor watch

build: build-copilot build-cursor

build-copilot:
	bash platforms/copilot-cli/build.sh

build-cursor:
	bash platforms/cursor/build.sh

validate: validate-copilot validate-cursor

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
	@echo "Checking explore subagent (not Explore)..."
	@! grep -r 'subagent_type.*Explore' plugins/maister-cursor/ --include="*.md" 2>/dev/null || (echo "FAIL: Explore (capitalized) found" && exit 1)
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

clean: clean-copilot clean-cursor

clean-copilot:
	rm -rf plugins/maister-copilot/

clean-cursor:
	rm -rf plugins/maister-cursor/

watch:
	fswatch -o plugins/maister/ | xargs -n1 -I{} make build
