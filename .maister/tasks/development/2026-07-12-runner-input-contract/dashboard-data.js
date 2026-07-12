window.MAISTER_DATA = {
  generated: "2026-07-12T19:50:01Z",
  task: {
    title: "Harden phase-continue input contract",
    type: "development",
    status: "completed",
    description: "Replace multi-flag runner input with one validated JSON payload and harden the state boundary.",
    path: ".maister/tasks/development/2026-07-12-runner-input-contract",
    current_activity: "Workflow complete"
  },
  characteristics: {
    risk_level: "high",
    modifies_existing_code: true,
    creates_new_entities: false,
    involves_data_operations: true
  },
  phases: [
    { id: "phase-1", name: "Codebase Analysis", status: "completed", summary: "Legacy multi-flag runner and indentation-sensitive state mutation identified; strict JSON/state-boundary coverage is missing.", artifacts: [{ path: "analysis/codebase-analysis.md", label: "Codebase Analysis", html: null }] },
    { id: "phase-2", name: "Gap Analysis", status: "completed", summary: "All recommended transport, state, retry, enum, path, transition, generated-test, and documentation decisions approved.", artifacts: [{ path: "analysis/gap-analysis.md", label: "Gap Analysis", html: null }] },
    { id: "phase-3", name: "TDD Red", status: "skipped", skip_reason: "no reproducible defect identified yet" },
    { id: "phase-4", name: "UI Mockups", status: "skipped", skip_reason: "non-UI task" },
    { id: "phase-5", name: "Specification", status: "completed", summary: "12 requirements define strict JSON transport, canonical state validation, retry-safe persistence, source migration, and source/generated verification.", artifacts: [{ path: "implementation/spec.md", label: "Specification", html: "implementation/spec.html" }] },
    { id: "phase-6", name: "Specification Audit", status: "completed", summary: "Pass with concerns: duplicate-key parsing, canonical YAML fixtures, and retry failure injection must be explicit in the implementation plan.", artifacts: [{ path: "verification/spec-audit.md", label: "Specification Audit", html: null }] },
    { id: "phase-7", name: "Implementation Plan", status: "completed", summary: "Five serialized groups, 29 steps, and 34 focused tests cover strict JSON transport, canonical YAML/phase validation, durable recovery, source migration, and generated-variant verification.", artifacts: [{ path: "implementation/implementation-plan.md", label: "Implementation Plan", html: "implementation/implementation-plan.html" }] },
    { id: "phase-8", name: "Implementation", status: "completed", summary: "Five implementation groups completed. Shared matrix passed 19 cases across six runners; gate tests, syntax checks, make validate, and generated diff audit are green.", artifacts: [{ path: "implementation/work-log.md", label: "Implementation Work Log", html: null }] },
    { id: "phase-9", name: "TDD Green", status: "skipped", skip_reason: "no reproducible defect identified yet" },
    { id: "phase-10", name: "Verification Options", status: "completed" },
    { id: "phase-11", name: "Verification", status: "completed", summary: "Passed with residual production concerns: 126/126 runner cases, 28/28 gate tests, canonical state probe, full validation, and code review are green. Optional Kiro smoke and broader production controls remain.", artifacts: [{ path: "verification/implementation-verification.md", label: "Implementation Verification", html: "verification/implementation-verification.html" }] },
    { id: "phase-12", name: "E2E Testing", status: "skipped", skip_reason: "non-UI task" },
    { id: "phase-13", name: "User Documentation", status: "skipped", skip_reason: "not requested" },
    { id: "phase-14", name: "Finalization", status: "completed", summary: "Workflow finalized. Runner contract, canonical state validation, recovery semantics, source migration, generated variants, and verification artifacts are complete for the approved scope.", artifacts: [{ path: "finalization-summary.md", label: "Finalization Summary", html: null }] }
  ],
  gate_history: [
    { gate_type: "phase-1-exit", selected_option: "Continue to Phase 2", final_actor: "user", confidence: "high", rationale: "User approved continuation." },
    { gate_type: "phase-2-scope-decision", selected_option: "Approve all recommended decisions", final_actor: "user", confidence: "high", rationale: "User approved all recommendations." },
    { gate_type: "phase-2-routing", selected_option: "Continue to Phase 5", final_actor: "user", confidence: "high", rationale: "User approved continuation." }
    ,{ gate_type: "phase-5-exit", selected_option: "Run specification audit", final_actor: "user", confidence: "high", rationale: "User approved specification audit." }
    ,{ gate_type: "phase-6-exit", selected_option: "Continue to implementation planning", final_actor: "user", confidence: "high", rationale: "User approved continuation." }
  ]
};
