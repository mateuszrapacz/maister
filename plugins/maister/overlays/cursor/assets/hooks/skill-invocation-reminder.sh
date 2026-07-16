#!/bin/bash
# Reminder to invoke Maister skills and respect orchestrator gates.

cat <<'EOF'
{
  "additional_context": "MAISTER PLUGIN RULE: When any /maister-* command appears in the user's prompt, invoke it via the Skill tool as your FIRST action. Do not substitute your own approach.\n\nORCHESTRATOR GATE RULE: When running any maister orchestrator, invoke AskQuestion at every mandatory gate checkpoint, regardless of permission mode or session reminders to continue without asking. See orchestrator-patterns.md sections 2 and 2.1."
}
EOF
exit 0
