window.MAISTER_DATA = {
  generated: "2026-07-18T11:51:51Z",
  task: {
    title: "Simplify Maister release installation through npx",
    type: "research",
    status: "completed",
    description: "Research and document an npx-based Maister installer owned by mateuszrapacz.",
    path: ".maister/tasks/research/2026-07-17-npx-release-distribution",
    current_activity: "Research completed; handoff approved"
  },
  characteristics: {},
  phases: [
    { id: "phase-1", name: "Research foundation", icon_hint: "analysis", status: "completed", started: "2026-07-17T21:37:19Z", completed: "2026-07-17T22:17:30Z", skip_reason: null, summary: "Research foundation completed.", decisions: [], risks: [], artifacts: [{ path: "outputs/research-report.md", label: "Research report", html: "outputs/research-report.html" }], gate: "phase-1-exit" },
    { id: "phase-2", name: "Evaluate optional phases", icon_hint: "plan", status: "completed", started: "2026-07-17T22:17:30Z", completed: "2026-07-17T22:28:03Z", skip_reason: null, summary: "Brainstorming and design enabled.", decisions: [], risks: [], artifacts: [], gate: "optional-phase-selection" },
    { id: "phase-3", name: "Generate solution alternatives", icon_hint: "spec", status: "completed", started: "2026-07-17T22:28:03Z", completed: "2026-07-17T23:27:31Z", skip_reason: null, summary: "Four alternatives generated and verified.", decisions: [], risks: [], artifacts: [{ path: "outputs/solution-exploration.md", label: "Solution exploration", html: "outputs/solution-exploration.html" }], gate: "phase-3-exit" },
    { id: "phase-4", name: "Evaluate solution alternatives", icon_hint: "plan", status: "completed", started: "2026-07-17T23:27:31Z", completed: "2026-07-18T11:23:52Z", skip_reason: null, summary: "Thin npx release launcher selected.", decisions: [{ decision: "Adopt the thin npx release launcher.", rationale: "It preserves maister-install.mjs as the sole mutation authority." }], risks: [], artifacts: [{ path: "outputs/solution-exploration.md", label: "Solution exploration", html: "outputs/solution-exploration.html" }], gate: "phase-4-exit" },
    { id: "phase-5", name: "Design high-level architecture", icon_hint: "spec", status: "completed", started: "2026-07-18T11:23:52Z", completed: "2026-07-18T11:46:14Z", skip_reason: null, summary: "Ports-and-adapters design completed with five accepted MADR decisions.", decisions: [{ decision: "Keep the launcher thin and maister-install.mjs authoritative.", rationale: "Preserves transactional lifecycle ownership." }], risks: ["Node engine floor, extraction implementation, publisher authentication, and non-atomic publication remain explicit concerns."], artifacts: [{ path: "outputs/high-level-design.md", label: "High-level design", html: "outputs/high-level-design.html" }, { path: "outputs/decision-log.md", label: "Decision log", html: "outputs/decision-log.html" }], gate: "phase-5-exit" },
    { id: "phase-6", name: "Summarize research and hand off", icon_hint: "done", status: "in_progress", started: "2026-07-18T11:46:14Z", completed: null, skip_reason: null, summary: "Final decision summary generated and protected handoff approved; research workflow completed.", decisions: [{ decision: "Start implementation in a fresh maister:development workflow.", rationale: "The accepted research and MADR records provide the implementation contract." }], risks: ["Implementation must preserve verification, safe extraction, version alignment, and one mutation authority."], artifacts: [{ path: "outputs/decision-summary.md", label: "Decision summary", html: "outputs/decision-summary.html" }], gate: "final-handoff-approval" }
  ],
  verification: { status: "passed", issues: [], fixes: ["Waited for Phase 3 agent completion and restored the missing design selection gate."], reverify_count: 1 },
  gate_history: [
    { phase_id: "phase-1", gate_type: "phase-1-exit", status: "decided", selected_option: "Continue to brainstorming evaluation", final_actor: "user", decided_at: "2026-07-17T22:17:30Z" },
    { phase_id: "phase-2", gate_type: "optional-phase-selection", status: "decided", selected_option: "Yes, explore alternatives", final_actor: "user", decided_at: "2026-07-17T22:28:03Z" },
    { phase_id: "phase-3", gate_type: "design-failure-recovery", status: "decided", selected_option: "Retry design", final_actor: "user", decided_at: "2026-07-17T22:36:16Z" },
    { phase_id: "phase-3", gate_type: "design-failure-recovery", status: "decided", selected_option: "Retry design", final_actor: "user", decided_at: "2026-07-17T22:46:46Z" },
    { phase_id: "phase-3", gate_type: "phase-3-exit", status: "decided", selected_option: "Continue to solution convergence", final_actor: "user", decided_at: "2026-07-17T23:27:31Z" },
    { phase_id: "phase-4", gate_type: "research-convergence", status: "decided", selected_option: "Thin npx release launcher (Recommended)", final_actor: "user", decided_at: "2026-07-18T09:58:57Z" },
    { phase_id: "phase-2", gate_type: "optional-phase-selection", status: "decided", selected_option: "Yes, generate design", final_actor: "user", decided_at: "2026-07-18T10:31:36Z" },
    { phase_id: "phase-4", gate_type: "phase-4-exit", status: "decided", selected_option: "Continue to high-level design", final_actor: "user", decided_at: "2026-07-18T11:23:52Z" },
    { phase_id: "phase-5", gate_type: "research-clarification", status: "decided", selected_option: "Confirm assumptions", final_actor: "user", decided_at: "2026-07-18T11:29:11Z" },
    { phase_id: "phase-5", gate_type: "phase-5-exit", status: "decided", selected_option: "Continue to output generation", final_actor: "user", decided_at: "2026-07-18T11:46:14Z" },
    { phase_id: "phase-6", gate_type: "final-handoff-approval", status: "decided", selected_option: "Complete workflow", final_actor: "user", decided_at: "2026-07-18T11:51:51.390Z" }
  ]
};
