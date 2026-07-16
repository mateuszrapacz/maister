import assert from "node:assert/strict";
import test from "node:test";

import { parseCliArgs } from "../../plugins/maister/lib/distribution/cli-contract.mjs";
import { validateJournal } from "../../plugins/maister/lib/distribution/journal-schema.mjs";
import { SUPPORTED_TARGET_IDS } from "../../plugins/maister/lib/distribution/targets.mjs";

const JOURNAL = Object.freeze({
  schema_version: 1,
  journal_id: "00000000-0000-4000-8000-000000000001",
  command: "recover",
  started_at: "2026-07-15T00:00:00.000Z",
  updated_at: "2026-07-15T00:00:00.000Z",
  state: "prepared",
  state_history: [{ state: "prepared", timestamp: "2026-07-15T00:00:00.000Z" }],
  stage_root: "/tmp/maister/staging/00000000-0000-4000-8000-000000000001",
  destination_root: "/tmp/maister/active",
  previous_receipt: null,
  candidate_receipt: null,
  lock: { path: "/tmp/maister/lock" },
  steps: [],
  failure: null,
});

test("every registered target is accepted by CLI and journal validation", () => {
  for (const target of SUPPORTED_TARGET_IDS) {
    assert.equal(parseCliArgs(["status", "--target", target]).target, target);
    assert.equal(validateJournal({ ...JOURNAL, target }).target, target);
  }
});

test("unknown targets are rejected by CLI and journal validation", () => {
  assert.throws(
    () => parseCliArgs(["status", "--target", "unknown-target"]),
    (error) => error?.kind === "E_USAGE" && error.message.includes(SUPPORTED_TARGET_IDS.join(", ")),
  );
  assert.throws(
    () => validateJournal({ ...JOURNAL, target: "unknown-target" }),
    (error) => error?.kind === "E_JOURNAL_SCHEMA",
  );
});
