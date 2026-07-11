window.MAISTER_DATA = {
  generated: "2026-07-11T22:07:03Z",
  task: {
    title: "Implement advisor and arbiter mode for Maister orchestrators",
    type: "development",
    status: "completed",
    description: "Configurable advisor/arbiter gate decisions with durable state and final MD/HTML reports",
    path: ".maister/tasks/development/2026-07-11-advisor-mode",
    current_activity: "Executable phase-continue runner complete; fully_automatic uses validated non-denylisted continuation"
  },
  characteristics: {
    risk_level: "high",
    modifies_existing_code: true,
    creates_new_entities: true,
    involves_data_operations: true
  },
  phases: [
    { id: "phase-1", name: "Codebase Analysis", status: "completed", summary: "Mapped the shared gate, state, config, dashboard, and platform transform seams" },
    { id: "phase-2", name: "Gap Analysis", status: "completed", summary: "Defined the advisor/arbiter policy and protected implementation boundary" },
    { id: "phase-3", name: "TDD Red", status: "skipped", skip_reason: "no reproducible defect" },
    { id: "phase-4", name: "UI Mockups", status: "skipped", skip_reason: "non-UI task" },
    { id: "phase-5", name: "Specification", status: "completed" },
    { id: "phase-6", name: "Specification Audit", status: "completed" },
    { id: "phase-7", name: "Implementation Plan", status: "completed" },
    { id: "phase-8", name: "Implementation", status: "completed", summary: "Source contract, workflows, permissions, dashboard, and build checks implemented" },
    { id: "phase-9", name: "TDD Green", status: "skipped", skip_reason: "no reproducible defect" },
    { id: "phase-10", name: "Verification Options", status: "completed" },
    { id: "phase-11", name: "Verification", status: "completed", summary: "15/15 engine checks, make build, make validate, Cursor/Kiro smoke, and Kiro matrices passed", artifacts: [{ path: "verification/implementation-verification.md", label: "Implementation Verification", html: null }] },
    { id: "phase-12", name: "E2E Testing", status: "skipped", skip_reason: "non-UI task" },
    { id: "phase-13", name: "User Documentation", status: "skipped", skip_reason: "not requested" },
    { id: "phase-14", name: "Finalization", status: "completed", summary: "Decision summary written in Markdown and HTML", artifacts: [{ path: "outputs/decision-summary.md", label: "Decision Summary", html: "outputs/decision-summary.html" }] }
  ],
  gate_history: [
    {
      gate_type: "architecture",
      selected_option: "Akceptuję architekturę wspólnego gate engine z adapterami per host",
      final_actor: "user",
      confidence: "high",
      rationale: "User explicitly approved the architecture gate."
    },
    {
      gate_type: "scope",
      selected_option: "Akceptuję pełny zakres Groups 0–6",
      final_actor: "user",
      confidence: "high",
      rationale: "User explicitly approved the full follow-up scope."
    },
    {
      gate_type: "implementation-approval",
      selected_option: "Zatwierdzam rozpoczęcie implementacji pełnego zakresu Groups 0–6",
      final_actor: "user",
      confidence: "high",
      rationale: "User explicitly approved implementation after the mandatory gate."
    }
  ]
};
