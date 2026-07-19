#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPOSITORY="$ROOT/plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-repository.mjs"
FIXTURES="$ROOT/tests/fixtures/orchestrator-state-v2"
WORK="$(mktemp -d)"
WORK="$(cd "$WORK" && pwd -P)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0

assert() {
  local description="$1"
  shift
  if "$@"; then
    echo "PASS: $description"
    pass=$((pass + 1))
  else
    echo "FAIL: $description"
    fail=$((fail + 1))
  fi
}

migrate_supported_legacy_once() {
  local state="$WORK/supported/orchestrator-state.yml"
  mkdir -p "$(dirname "$state")"
  cp "$FIXTURES/legacy-supported.yml" "$state"
  STATE="$state" REPOSITORY="$REPOSITORY" node --input-type=module <<'NODE'
const { migrateState, readState } = await import(process.env.REPOSITORY);
const first = await migrateState(process.env.STATE);
const second = await migrateState(process.env.STATE);
const state = readState(process.env.STATE);
if (!first.migrated || second.migrated || state.orchestrator.schema_version !== 2 || state.orchestrator.revision !== 1) process.exit(1);
  if (state.orchestrator.initial_phase !== "phase-1" || state.orchestrator.current_phase !== "phase-1") process.exit(1);
NODE
  local result=$?
  test "$result" -eq 0 || return 1

  local narrow="$WORK/supported/narrow.yml"
  local pending="$WORK/supported/pending.yml"
  cp "$FIXTURES/legacy-narrow-terminal.yml" "$narrow"
  cp "$FIXTURES/legacy-user-pending.yml" "$pending"
  NARROW="$narrow" PENDING="$pending" REPOSITORY="$REPOSITORY" node --input-type=module <<'NODE'
const { migrateState, readState } = await import(process.env.REPOSITORY);
await migrateState(process.env.NARROW);
await migrateState(process.env.PENDING);
const narrow = readState(process.env.NARROW).orchestrator.gate_history[0];
const pending = readState(process.env.PENDING).orchestrator.gate_history[0];
if (narrow.provenance_kind !== "legacy" || narrow.legacy_record.selected_option !== "Continue") process.exit(1);
if (pending.status !== "user_pending" || pending.selected_option !== null || pending.final_actor !== "system") process.exit(1);
NODE
}

migrate_rich_role_provenance() {
  local state="$WORK/rich/orchestrator-state.yml"
  mkdir -p "$(dirname "$state")"
  STATE="$state" ROOT="$ROOT" REPOSITORY="$REPOSITORY" node --input-type=module <<'NODE'
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const schema = await import(pathToFileURL(path.join(process.env.ROOT, "plugins/maister/skills/orchestrator-framework/bin/orchestrator-state-schema.mjs")));
const repository = await import(pathToFileURL(process.env.REPOSITORY));
const response = (selected_option, rationale) => ({ selected_option, rationale, confidence: "high", escalate_to_user: false });
const legacy = {
  orchestrator: {
    started_phase: "phase-1",
    current_phase: "phase-1",
    completed_phases: [],
    failed_phases: [],
    created: "2026-07-13T00:00:00Z",
    updated: "2026-07-13T00:00:04Z",
    gate_history: [{
      schema_version: 1,
      idempotency_key: "sha256:rich-legacy-gate",
      phase_id: "phase-1",
      gate_type: "research-convergence",
      question: "Continue?",
      options: ["A", "B"],
      original_recommendation: "A",
      configured_policy: "fully_automatic",
      policy: "fully_automatic",
      safety_classification: "configurable",
      status: "decided",
      selected_option: "A",
      final_actor: "arbiter",
      rationale: "Arbiter selected A",
      confidence: "high",
      escalate_to_user: false,
      user_override: false,
      error: null,
      continuation: null,
      advisor: {
        agent: "advisor",
        model: "legacy-advisor",
        response: response("B", "Advisor selected B"),
        attempts: [{ number: 1, status: "completed", started_at: "2026-07-13T00:00:01Z", completed_at: "2026-07-13T00:00:02Z", error: null }],
        exhausted: false,
      },
      arbiter: {
        agent: "arbiter",
        model: "legacy-arbiter",
        response: response("A", "Arbiter selected A"),
        attempts: [{ number: 1, status: "completed", started_at: "2026-07-13T00:00:03Z", completed_at: "2026-07-13T00:00:04Z", error: null }],
        exhausted: false,
      },
    }],
  },
  task: { status: "in_progress" },
  phases: [{ id: "phase-1", status: "in_progress" }, { id: "phase-2", status: "pending" }],
};
fs.writeFileSync(process.env.STATE, schema.stringifyCanonicalYaml(legacy), "utf8");
const first = await repository.migrateState(process.env.STATE);
const second = await repository.migrateState(process.env.STATE);
const gate = repository.readState(process.env.STATE).orchestrator.gate_history[0];
if (!first.migrated || second.migrated || gate.provenance_kind !== "complete" || gate.legacy_record !== null) process.exit(1);
if (gate.final_actor !== "arbiter" || gate.advisor.response.selected_option !== "B" || gate.arbiter.response.selected_option !== "A") process.exit(1);
if (gate.advisor.logical_role_id !== "maister:advisor" || gate.arbiter.logical_role_id !== "maister:advisor") process.exit(1);
if (gate.advisor.terminal_dispatch !== null || gate.arbiter.terminal_dispatch !== null) process.exit(1);
if (gate.advisor.attempts.length !== 1 || gate.arbiter.attempts.length !== 1) process.exit(1);
if (gate.advisor.attempts[0].terminal_dispatch !== null || gate.arbiter.attempts[0].terminal_dispatch !== null) process.exit(1);
NODE
}

reject_ambiguous_legacy_without_mutation() {
  local state="$WORK/ambiguous/orchestrator-state.yml"
  mkdir -p "$(dirname "$state")"
  cp "$FIXTURES/legacy-ambiguous.yml" "$state"
  chmod 640 "$state"
  cp -p "$state" "$state.before"
  find "$(dirname "$state")" -mindepth 1 -maxdepth 1 -print | sort > "$WORK/ambiguous.before"
  set +e
  STATE="$state" REPOSITORY="$REPOSITORY" node --input-type=module 2>"$WORK/ambiguous.err" <<'NODE'
const { migrateState } = await import(process.env.REPOSITORY);
await migrateState(process.env.STATE);
NODE
  local result=$?
  set -e
  find "$(dirname "$state")" -mindepth 1 -maxdepth 1 -print | sort > "$WORK/ambiguous.after"
  test "$result" -ne 0 && cmp -s "$state" "$state.before" && cmp -s "$WORK/ambiguous.before" "$WORK/ambiguous.after" && test ! -e "$state.lock"
}

assert "supported legacy state migrates deterministically" migrate_supported_legacy_once
assert "rich legacy Advisor and Arbiter provenance is preserved" migrate_rich_role_provenance
assert "ambiguous legacy state is rejected without mutation" reject_ambiguous_legacy_without_mutation

echo "$pass passed, $fail failed"
test "$fail" -eq 0
