#!/bin/bash
# Reminder to invoke Maister slash skills and respect orchestrator CHAT GATEs (Kiro CLI).

cat <<'EOF'
{
  "additional_context": "MAISTER PLUGIN RULE: When any /maister-* command appears in the user's prompt, invoke that slash skill as your FIRST action. Do not substitute your own approach.\n\nORCHESTRATOR GATE RULE: When running any maister orchestrator, fire **CHAT GATE** at every mandatory checkpoint — present options in chat and wait for reply. In --no-interactive mode, use documented Headless Defaults. See orchestrator-patterns.md sections 2 and 2.1."
}
EOF
exit 0
