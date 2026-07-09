window.MAISTER_DATA = {
  generated: "2026-07-09T16:17:30Z",
  task: {
    title: "On-Demand Skills User Documentation",
    type: "development",
    status: "in_progress",
    description: "Implement user-facing documentation for Wave 1–3 on-demand skills: docs/on-demand-skills.md, docs/README.md hub, extend docs/commands.md, update README.md navigation.",
    path: ".maister/tasks/development/2026-07-09-on-demand-skills-user-documentation",
    current_activity: "Implementation complete — awaiting verification gate"
  },
  characteristics: {
    has_reproducible_defect: false,
    modifies_existing_code: true,
    creates_new_entities: true,
    involves_data_operations: false,
    ui_heavy: false
  },
  phases: [
    { id: "phase-1", name: "Analyze codebase & clarify requirements", icon_hint: "analysis", status: "completed", started: "2026-07-09T15:21:24Z", completed: "2026-07-09T15:25:00Z", skip_reason: null, summary: "Documentation-only task; 22 key files mapped.", decisions: [], risks: [], artifacts: [{ path: "analysis/codebase-analysis.md", label: "Codebase Analysis", html: null }, { path: "analysis/clarifications.md", label: "Clarifications", html: null }], gate: null },
    { id: "phase-2", name: "Analyze gaps & clarify scope", icon_hint: "analysis", status: "completed", started: "2026-07-09T15:33:45Z", completed: "2026-07-09T15:40:00Z", skip_reason: null, summary: "2 new files, extend commands.md, trim README. Risk low.", decisions: [], risks: ["README drift if P4 partial"], artifacts: [{ path: "analysis/gap-analysis.md", label: "Gap Analysis", html: null }], gate: { question: "Continue to Phase 5?", answer: "Yes" } },
    { id: "phase-3", name: "Write failing test (TDD Red)", icon_hint: "verify", status: "skipped", started: null, completed: null, skip_reason: "No reproducible defect", summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-4", name: "Generate UI mockups", icon_hint: "spec", status: "skipped", started: null, completed: null, skip_reason: "Not UI-heavy", summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-5", name: "Gather requirements & create specification", icon_hint: "spec", status: "completed", started: "2026-07-09T15:40:00Z", completed: "2026-07-09T15:45:00Z", skip_reason: null, summary: "19 FRs across P1-P4; documentation-only.", decisions: ["D1-D9 locked in spec"], risks: [], artifacts: [{ path: "implementation/spec.md", label: "Specification", html: "implementation/spec.html" }, { path: "analysis/requirements.md", label: "Requirements", html: null }], gate: { question: "Continue to specification audit?", answer: "Yes" } },
    { id: "phase-6", name: "Audit specification", icon_hint: "verify", status: "completed", started: "2026-07-09T15:45:00Z", completed: "2026-07-09T15:47:00Z", skip_reason: null, summary: "Pass with concerns — findings addressed in plan.", decisions: ["Run audit (recommended)"], risks: [], artifacts: [{ path: "verification/spec-audit.md", label: "Spec Audit", html: null }], gate: { question: "Continue to implementation planning?", answer: "Yes" } },
    { id: "phase-7", name: "Plan implementation", icon_hint: "plan", status: "completed", started: "2026-07-09T15:47:00Z", completed: "2026-07-09T15:48:44Z", skip_reason: null, summary: "5 task groups, 32 steps.", decisions: ["D5 grill-me/thermos explicit-request"], risks: ["P4 atomic trim required"], artifacts: [{ path: "implementation/implementation-plan.md", label: "Implementation Plan", html: "implementation/implementation-plan.html" }], gate: { question: "Continue to implementation?", answer: "Yes" } },
    { id: "phase-8", name: "Execute implementation", icon_hint: "code", status: "completed", started: "2026-07-09T16:08:53Z", completed: "2026-07-09T16:17:30Z", skip_reason: null, summary: "All 5 groups done. 2 files created, 2 modified. Grep verification pass.", decisions: [], risks: [], artifacts: [{ path: "implementation/work-log.md", label: "Work Log", html: null }], gate: null },
    { id: "phase-9", name: "Verify test passes (TDD Green)", icon_hint: "verify", status: "skipped", started: null, completed: null, skip_reason: "No TDD red gate", summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-10", name: "Prompt verification options", icon_hint: "verify", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-11", name: "Verify implementation & resolve issues", icon_hint: "verify", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-12", name: "Run E2E tests", icon_hint: "verify", status: "skipped", started: null, completed: null, skip_reason: "Not UI-heavy; e2e not enabled", summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-13", name: "Generate user documentation", icon_hint: "docs", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null },
    { id: "phase-14", name: "Finalize workflow", icon_hint: "done", status: "pending", started: null, completed: null, skip_reason: null, summary: null, decisions: [], risks: [], artifacts: [], gate: null }
  ],
  verification: { status: null, issues: [], fixes: [], reverify_count: 0 }
};
