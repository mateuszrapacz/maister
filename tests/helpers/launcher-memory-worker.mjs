import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

import { extractArchiveFile, inspectArchiveFile } from "../../lib/launcher/archive-port.mjs";

const DATA_CHUNK_BYTES = 64 * 1024;

function writeOctal(buffer, offset, length, value) {
  buffer.write(`${value.toString(8).padStart(length - 1, "0")}\0`, offset, length, "ascii");
}

function tarHeader(name, { type = "0", mode = 0o644, size = 0 } = {}) {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  writeOctal(header, 100, 8, mode);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, type === "5" ? 0 : size);
  writeOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header.write(type, 156, 1, "ascii");
  header.write("ustar\0", 257, 6, "latin1");
  header.write("00", 263, 2, "ascii");
  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
  return header;
}

function nextPseudoRandom(state) {
  let value = state.value;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.value = value >>> 0;
  return value & 0xff;
}

async function* tarBytes({ expanded_bytes: expandedBytes, entropy_stride: entropyStride }) {
  yield tarHeader("plugins/maister", { type: "5", mode: 0o755 });
  yield tarHeader("plugins/maister/payload", { type: "5", mode: 0o755 });
  yield tarHeader("plugins/maister/payload/memory.bin", { size: expandedBytes });
  const random = { value: 0x6d2b79f5 };
  let emitted = 0;
  while (emitted < expandedBytes) {
    const length = Math.min(DATA_CHUNK_BYTES, expandedBytes - emitted);
    const chunk = Buffer.alloc(length);
    for (let index = 0; index < length; index += 1) {
      if ((emitted + index) % entropyStride === 0) chunk[index] = nextPseudoRandom(random);
    }
    emitted += length;
    yield chunk;
  }
  const padding = (512 - (expandedBytes % 512)) % 512;
  if (padding > 0) yield Buffer.alloc(padding);
  yield Buffer.alloc(1024);
}

async function createFixtureArchive(destination, fixture) {
  await pipeline(
    Readable.from(tarBytes(fixture)),
    createGzip({ level: 6, mtime: 0, chunkSize: DATA_CHUNK_BYTES }),
    fs.createWriteStream(destination, { flags: "wx", mode: 0o600 }),
  );
}

async function main() {
  const [scratch, fixtureJson, expected] = process.argv.slice(2);
  const fixture = JSON.parse(fixtureJson);
  const archivePath = path.join(scratch, "archive.tar.gz");
  const baselineRssBytes = process.memoryUsage.rss();
  let peakRssBytes = baselineRssBytes;
  const sampler = setInterval(() => {
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage.rss());
  }, 2);
  const started = performance.now();
  try {
    await createFixtureArchive(archivePath, fixture);
    const plan = await inspectArchiveFile(archivePath);
    const extractionRoot = path.join(scratch, "extracted");
    const extracted = await extractArchiveFile(plan, archivePath, extractionRoot);
    const extractedEntries = extracted.entries.length;
    fs.rmSync(extractionRoot, { recursive: true, force: false });
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage.rss());
    if (expected !== "accepted") throw new Error(`expected ${expected} but archive was accepted`);
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 1,
      status: "accepted",
      baselineRssBytes,
      peakRssBytes,
      elapsedMs: performance.now() - started,
      archiveSha256: plan.archiveSha256,
      counters: plan.counters,
      extractedEntries,
    })}\n`);
  } catch (error) {
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage.rss());
    if (expected !== "rejected") throw error;
    process.stdout.write(`${JSON.stringify({
      schemaVersion: 1,
      status: "rejected",
      kind: error.kind ?? null,
      baselineRssBytes,
      peakRssBytes,
      elapsedMs: performance.now() - started,
    })}\n`);
  } finally {
    clearInterval(sampler);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
