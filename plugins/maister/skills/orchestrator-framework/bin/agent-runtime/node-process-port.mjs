import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function trustedParent(filePath, taskPath) {
  const declaredTaskRoot = path.resolve(taskPath);
  const root = fs.lstatSync(declaredTaskRoot, { throwIfNoEntry: false });
  if (!root?.isDirectory() || root.isSymbolicLink()) throw new TypeError("task root must be a trusted real directory");
  const trustedTaskRoot = fs.realpathSync(declaredTaskRoot);
  const directory = path.dirname(path.resolve(filePath));
  const relative = path.relative(declaredTaskRoot, directory);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new TypeError("last-message parent is outside the trusted task root");
  const stat = fs.lstatSync(directory, { throwIfNoEntry: false });
  if (!stat?.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(directory) !== path.resolve(trustedTaskRoot, relative)) {
    throw new TypeError("last-message parent must be a trusted real directory");
  }
  return { directory, realDirectory: fs.realpathSync(directory), dev: stat.dev, ino: stat.ino };
}

function assertSameParent(identity) {
  const stat = fs.lstatSync(identity.directory, { throwIfNoEntry: false });
  if (!stat?.isDirectory() || stat.isSymbolicLink() || stat.dev !== identity.dev || stat.ino !== identity.ino || fs.realpathSync(identity.directory) !== identity.realDirectory) {
    throw new TypeError("last-message parent identity changed during process execution");
  }
}

function trustedRegularFile(filePath, taskPath, label) {
  const parent = trustedParent(filePath, taskPath);
  const stat = fs.lstatSync(filePath, { throwIfNoEntry: false });
  if (!stat?.isFile() || stat.isSymbolicLink()) throw new TypeError(`${label} must be a trusted regular file`);
  const descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || opened.dev !== stat.dev || opened.ino !== stat.ino) throw new TypeError(`${label} identity changed before process execution`);
  } finally {
    fs.closeSync(descriptor);
  }
  return { filePath, dev: stat.dev, ino: stat.ino, parent, label };
}

function assertSameRegularFile(identity) {
  assertSameParent(identity.parent);
  const stat = fs.lstatSync(identity.filePath, { throwIfNoEntry: false });
  if (!stat?.isFile() || stat.isSymbolicLink() || stat.dev !== identity.dev || stat.ino !== identity.ino) {
    throw new TypeError(`${identity.label} identity changed during process execution`);
  }
}

function utf8Tail(buffer, maximumBytes) {
  const tail = buffer.subarray(Math.max(0, buffer.length - maximumBytes));
  for (let offset = 0; offset <= Math.min(3, tail.length); offset += 1) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(tail.subarray(offset));
    } catch {
      // A byte tail can begin inside one UTF-8 code point; discard only that partial prefix.
    }
  }
  return "";
}

export function createNodeProcessPort() {
  return Object.freeze({
    async spawn({ executable, args, cwd, stdin, timeout_ms: timeoutMs, max_output_bytes: maxOutputBytes = 8 * 1024 * 1024, task_path: taskPath, output_schema_path: outputSchemaPath, last_message_path: lastMessagePath }) {
      if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes <= 0) throw new TypeError("max_output_bytes must be a positive safe integer");
      const parentIdentity = trustedParent(lastMessagePath, taskPath);
      const schemaIdentity = trustedRegularFile(outputSchemaPath, taskPath, "output schema");
      const existing = fs.lstatSync(lastMessagePath, { throwIfNoEntry: false });
      if (existing?.isSymbolicLink() || (existing && !existing.isFile())) throw new TypeError("last-message destination is unsafe");
      if (existing) fs.unlinkSync(lastMessagePath);
      const child = spawn(executable, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
      let stdout = Buffer.alloc(0);
      let stderr = Buffer.alloc(0);
      let timedOut = false;
      let overflow = false;
      const append = (current, chunk) => {
        const next = Buffer.concat([current, chunk]);
        if (next.length > maxOutputBytes) {
          overflow = true;
          child.kill("SIGTERM");
          return next.subarray(next.length - maxOutputBytes);
        }
        return next;
      };
      child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
      child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });
      child.stdin.end(stdin);
      const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, timeoutMs);
      const completion = new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("close", (exitCode, signal) => {
          clearTimeout(timer);
          assertSameParent(parentIdentity);
          assertSameRegularFile(schemaIdentity);
          const last = fs.lstatSync(lastMessagePath, { throwIfNoEntry: false });
          let lastMessage = "";
          if (last?.isFile() && !last.isSymbolicLink()) {
            const descriptor = fs.openSync(lastMessagePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
            try {
              const opened = fs.fstatSync(descriptor);
              if (!opened.isFile()) throw new TypeError("last-message destination is unsafe");
              fs.fchmodSync(descriptor, 0o600);
              if (opened.size > maxOutputBytes) {
                overflow = true;
              } else {
                lastMessage = fs.readFileSync(descriptor, "utf8");
              }
            } finally {
              fs.closeSync(descriptor);
            }
          }
          resolve({
            exit_code: exitCode,
            signal,
            timed_out: timedOut,
            output_overflow: overflow,
            stdout: utf8Tail(stdout, maxOutputBytes),
            stderr: utf8Tail(stderr, maxOutputBytes),
            last_message: lastMessage,
          });
        });
      });
      return {
        wait: () => completion,
        async cancel() { return child.kill("SIGTERM"); },
      };
    },
  });
}
