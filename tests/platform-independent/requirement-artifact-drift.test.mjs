import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const ROOT = ".maister/tasks/development/2026-07-19-npx-release-distribution";

function markdownRows(filePath) {
  const rows = [];
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const match = /^\|\s*(R-\d{3})\s*\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|$/u.exec(line);
    if (match) rows.push([match[1], match[2], match[3]]);
  }
  return rows;
}

function decodeHtml(value) {
  return value
    .replace(/<[^>]*>/gu, "")
    .replace(/&#(\d+);/gu, (_match, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([0-9a-f]+);/giu, (_match, hexadecimal) => String.fromCodePoint(Number.parseInt(hexadecimal, 16)))
    .replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&quot;/gu, '"').replace(/&apos;/gu, "'").replace(/&amp;/gu, "&")
    .trim();
}

function htmlRows(filePath) {
  const rows = [];
  const html = fs.readFileSync(filePath, "utf8");
  for (const row of html.matchAll(/<tr>([\s\S]*?)<\/tr>/gu)) {
    const cells = [...row[1].matchAll(/<td(?:\s+[^>]*)?>([\s\S]*?)<\/td>/gu)].map((match) => decodeHtml(match[1]));
    if (/^R-\d{3}$/u.test(cells[0] ?? "")) rows.push(cells);
  }
  return rows;
}

test("R-001 through R-038 remain exact and ordered across requirements, spec, and decoded HTML", () => {
  const requirements = markdownRows(`${ROOT}/analysis/requirements.md`);
  const specification = markdownRows(`${ROOT}/implementation/spec.md`);
  const html = htmlRows(`${ROOT}/implementation/spec.html`);
  const expectedIds = Array.from({ length: 38 }, (_unused, index) => `R-${String(index + 1).padStart(3, "0")}`);
  assert.deepEqual(requirements.map(([id]) => id), expectedIds);
  assert.deepEqual(specification, requirements);
  assert.deepEqual(html, requirements);
  assert.equal(new Set(requirements.map(([id]) => id)).size, 38);
  assert.equal(requirements.every(([_id, priority, acceptance]) => priority === "Must" && acceptance.length > 0), true);
});
