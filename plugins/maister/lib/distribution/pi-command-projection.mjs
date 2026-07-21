import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  failAgentProjection,
} from "./agent-projection-validator.mjs";
import {
  normalizeRelativePath,
} from "./path-safety.mjs";
import { canonicalJson } from "./provenance.mjs";

const SHA256 = /^[0-9a-f]{64}$/u;

export const PI_COMMAND_PROJECTION_VERSION = "pi-command-projection-v1";

export const PI_COMMAND_ORIGINS = Object.freeze([
  ["modeling-aggregate-designer", "9f80a86f66a9a83e5a410851f087309d3dc0da486afc5693889948e33ff35087"],
  ["modeling-context-distiller", "8199bc624c4cf946ff08f0a05244e3cd65610388384723c750519cbcecbbecea"],
  ["quick-metaprogram-classifier", "0571d8b2165bd62bf1522cf6a41596c82b22b5db80c24462d96d52c417b92f60"],
  ["quick-problem-classifier", "68e2b2e255434e87b046deb7926799834b535e86965bb956a4f1425ac850bea9"],
  ["quick-requirements-critic", "a0c18c0f0799cebdcee7b22eae69c33cf5776584ffc071c17374ba353e9d9586"],
  ["quick-transcript-critic", "98ab55db3d0e7042d634cb32c50eecdf211dd96dd9fc6c7d8da709cd90021b25"],
  ["reviews-code", "41f74eddea48b0c95e7d0381317b23e6379a6a9d670f8585d6afabba6a58acca"],
  ["reviews-linguistic-boundaries", "7db5aabd22181440f4dac7a49be0d0ac0b3574071151c686a9c1fad1867b9594"],
  ["reviews-pragmatic", "b07186d87723010cb28ef8a4ba8eecbcaf854991125ed57c17857a6e00f6117f"],
  ["reviews-production-readiness", "6f743f360cbf3415d63d6befbdad4e762655e53a385ba170ccd18d620f930ae7"],
  ["reviews-reality-check", "a98ec01a40b89c04bef21ee25fc0445880a0fa12debf8489ff0a3ede6e86e38e"],
  ["reviews-spec-audit", "0103c7c2c504c343277a48d85326ad14e6628fec957041fff260d33a0edae8b6"],
  ["reviews-test-strategy", "c444cd58625ecbdb875af0a985f3149e0941992a1a69356635924667420dfd9c"],
  ["work", "f3fd5d90f76362c88df32a46fc1b7ba86dc67a13b83c0f8495a9f661d24326f7"],
].map(([id, sha256]) => Object.freeze({
  source: `commands/${id}.md`,
  destination: `prompts/${id}.md`,
  kind: "prompt",
  transform_id: "pi-prompt-v1",
  sha256,
})));

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function normalizedText(content) {
  return content.replaceAll("\r\n", "\n").replace(/\n*$/u, "\n");
}

function ensureOriginFields(origin, index) {
  if (!origin || typeof origin !== "object" || Array.isArray(origin)) {
    failAgentProjection("E_AGENT_PROJECTION_SCHEMA", `Pi command origin ${index} must be a mapping`);
  }
  const expectedFields = ["source", "destination", "kind", "transform_id", "sha256"];
  const actualFields = Object.keys(origin).sort();
  if (canonicalJson(actualFields) !== canonicalJson([...expectedFields].sort())) {
    failAgentProjection("E_AGENT_PROJECTION_SCHEMA", `Pi command origin ${index} has an invalid field set`, { index });
  }
  for (const field of ["source", "destination", "kind", "transform_id", "sha256"]) {
    if (typeof origin[field] !== "string" || origin[field].length === 0 || origin[field].includes("\0")) {
      failAgentProjection("E_AGENT_PROJECTION_SCHEMA", `Pi command origin ${index}.${field} is invalid`, { index, field });
    }
  }
  try {
    if (normalizeRelativePath(origin.source, `commands[${index}].source`) !== origin.source
      || normalizeRelativePath(origin.destination, `commands[${index}].destination`) !== origin.destination) {
      failAgentProjection("E_AGENT_PROJECTION_PATH", `Pi command origin ${index} is not normalized`, { index });
    }
  } catch (error) {
    failAgentProjection("E_AGENT_PROJECTION_PATH", `Pi command origin ${index} contains an unsafe path`, { index }, { cause: error });
  }
  if (!SHA256.test(origin.sha256)) {
    failAgentProjection("E_AGENT_PROJECTION_BINDING", `Pi command origin ${index} has an invalid digest`, { index });
  }
}

export function validatePiCommandOrigins(origins) {
  if (!Array.isArray(origins) || origins.length !== PI_COMMAND_ORIGINS.length) {
    failAgentProjection("E_AGENT_PROJECTION_INVENTORY", "Pi command origins must contain the closed command inventory", {
      expected: PI_COMMAND_ORIGINS.length,
      actual: origins?.length ?? null,
    });
  }
  const sources = new Set();
  const destinations = new Set();
  origins.forEach((origin, index) => {
    ensureOriginFields(origin, index);
    if (sources.has(origin.source.toLocaleLowerCase("en-US"))
      || destinations.has(origin.destination.toLocaleLowerCase("en-US"))) {
      failAgentProjection("E_AGENT_PROJECTION_COLLISION", `Pi command origins collide at index ${index}`, { index });
    }
    sources.add(origin.source.toLocaleLowerCase("en-US"));
    destinations.add(origin.destination.toLocaleLowerCase("en-US"));
    const expected = PI_COMMAND_ORIGINS[index];
    if (canonicalJson(origin) !== canonicalJson(expected)) {
      failAgentProjection("E_AGENT_PROJECTION_BINDING", `Pi command origin ${index} differs from the closed map`, {
        expected,
        actual: origin,
      });
    }
  });
  return origins;
}

export function projectPiCommands({ sourceRoot, origins = PI_COMMAND_ORIGINS } = {}) {
  if (typeof sourceRoot !== "string" || sourceRoot.length === 0) {
    failAgentProjection("E_AGENT_PROJECTION_IO", "sourceRoot is required for Pi command projection");
  }
  validatePiCommandOrigins(origins);
  const outputs = origins.map((origin) => {
    const sourcePath = path.join(sourceRoot, origin.source);
    let raw;
    try {
      raw = fs.readFileSync(sourcePath);
    } catch (error) {
      failAgentProjection("E_AGENT_PROJECTION_IO", `Pi command source is unreadable: ${origin.source}`, { source: origin.source }, { cause: error });
    }
    const sourceDigest = sha256(raw);
    if (sourceDigest !== origin.sha256) {
      failAgentProjection("E_AGENT_PROJECTION_BINDING", `Pi command source digest is stale: ${origin.source}`, {
        source: origin.source,
        expected: origin.sha256,
        actual: sourceDigest,
      });
    }
    const content = normalizedText(raw.toString("utf8"));
    const digest = sha256(Buffer.from(content, "utf8"));
    return Object.freeze({
      path: origin.destination,
      source: origin.source,
      kind: origin.kind,
      mode: "0644",
      ownership: "canonical",
      role_id: null,
      support_id: null,
      transform_id: origin.transform_id,
      source_sha256: sourceDigest,
      content,
      size: Buffer.byteLength(content, "utf8"),
      sha256: digest,
    });
  });
  return Object.freeze(outputs);
}

export function createPiCommandProjection({ sourceRoot, origins = PI_COMMAND_ORIGINS } = {}) {
  const outputs = projectPiCommands({ sourceRoot, origins });
  const rows = outputs.map(({ source, path: destination, kind, transform_id: transformId, source_sha256: sourceDigest }) => ({
    source,
    destination,
    kind,
    transform_id: transformId,
    sha256: sourceDigest,
  }));
  const projection = {
    schema_version: 1,
    contract: PI_COMMAND_PROJECTION_VERSION,
    entries: rows,
    digest: sha256(canonicalJson(rows)),
  };
  return Object.freeze(projection);
}
