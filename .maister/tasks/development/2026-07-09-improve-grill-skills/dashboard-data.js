window.MAISTER_DATA = {
  generated: "2026-07-09T19:42:31Z",
  task: {
    title: "Improve Grill Skills",
    type: "development",
    status: "in_progress",
    description: "Strengthen grill-me protocol, add grill-with-docs skill, update plugin catalog and platform generation, rebuild generated variants.",
    path: ".maister/tasks/development/2026-07-09-improve-grill-skills",
    current_activity: "Awaiting Phase 2 scope gate"
  },
  characteristics: {
    has_reproducible_defect: false,
    modifies_existing_code: true,
    creates_new_entities: true,
    involves_data_operations: false,
    ui_heavy: false
  },
  phases: [
    { id: "phase-1", name: "Analyze codebase & clarify requirements", icon_hint: "analysis", status: "completed", started: "2026-07-09T19:37:50Z", completed: "2026-07-09T19:42:31Z", skip_reason: null, summary: "grill-me minimal (11 lines); grill-with-docs missing. Moderate complexity, low-medium risk.", decisions: ["User docs in scope", "ADR default .maister/docs/decisions/", "Explicit request only in catalog"], risks: ["Kiro count drift if not updated together", "grill-me lacks disable-model-invocation today"], artifacts: [{ path: "analysis/codebase-analysis.md", label: "Codebase Analysis", html: null }, { path: "analysis/clarifications.md", label: "Clarifications", html: null }], gate: null },
    { id: "phase-2", name: "Analyze gaps & clarify scope", icon_hint: "analysis", status: "in_progress", started: "2026-07-09T19:42:31Z", completed: null, skip_reason: null, summary: "Rewrite grill-me, create grill-with-docs, Kiro 67→69, catalog + user docs, make build/validate. Risk low-medium.", decisions: ["Two explicit modes locked", "No shared grilling engine", "language.md not CONTEXT.md", "TDD-first Kiro counts"], risks: ["Plan omitted explicit user-docs step — spec must include", "Kiro count sync across 6 sites", "Skill boundary overlap with modeling skills"], artifacts: [{ path: "analysis/gap-analysis.md", label: "Gap Analysis", html: null }], gate: null },
    { id: "phase-3", name: "Write failing test (TDD Red)", icon_hint: "verify", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-4", name: "Generate UI mockups", icon_hint: "spec", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-5", name: "Gather requirements & create specification", icon_hint: "spec", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-6", name: "Audit specification", icon_hint: "verify", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-7", name: "Plan implementation", icon_hint: "plan", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-8", name: "Execute implementation", icon_hint: "code", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-9", name: "Verify test passes (TDD Green)", icon_hint: "verify", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-10", name: "Prompt verification options", icon_hint: "verify", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-11", name: "Verify implementation & resolve issues", icon_hint: "verify", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-12", name: "Run E2E tests", icon_hint: "verify", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-13", name: "Generate user documentation", icon_hint: "docs", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-14", name: "Finalize workflow", icon_hint: "done", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null }
  ],
  verification: { status: null, issues: [], fixes: [], reverify_count: 0 }
};
