import { spawn } from "node:child_process";

export const CHILD_STDOUT_TAIL_BYTES = 64 * 1024;

function appendRollingTail(current, chunk) {
  const bytes = Buffer.from(chunk);
  if (bytes.length >= CHILD_STDOUT_TAIL_BYTES) return Buffer.from(bytes.subarray(bytes.length - CHILD_STDOUT_TAIL_BYTES));
  const overflow = current.length + bytes.length - CHILD_STDOUT_TAIL_BYTES;
  return Buffer.concat(overflow > 0 ? [current.subarray(overflow), bytes] : [current, bytes]);
}

function waitForDrain(stream) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      stream.off?.("drain", onDrain);
      stream.off?.("error", onError);
    };
    const onDrain = () => { cleanup(); resolve(); };
    const onError = (error) => { cleanup(); reject(error); };
    stream.once("drain", onDrain);
    stream.once("error", onError);
  });
}

export async function delegateInstaller({ installerPath, argv, spawnImpl = spawn, stdout = process.stdout, stderr = process.stderr, processObject = process }) {
  const child = spawnImpl(process.execPath, [installerPath, ...argv], { shell: false, windowsHide: true, stdio: ["inherit", "pipe", "pipe"] });
  let capturedStdout = Buffer.alloc(0);
  let forwarding = Promise.resolve();
  let forwardingError = null;
  child.stdout?.on("data", (chunk) => {
    capturedStdout = appendRollingTail(capturedStdout, chunk);
    if (stdout.write(chunk) === false && typeof stdout.once === "function") {
      child.stdout.pause?.();
      const drained = waitForDrain(stdout);
      forwarding = forwarding
        .then(() => drained)
        .then(() => child.stdout.resume?.())
        .catch((error) => { forwardingError = error; });
    }
  });
  child.stderr?.on("data", (chunk) => stderr.write(chunk));
  let forwarded = false;
  const forward = (signal) => {
    if (!forwarded) {
      forwarded = true;
      child.kill(signal);
    }
  };
  const onInt = () => forward("SIGINT");
  const onTerm = () => forward("SIGTERM");
  processObject.on("SIGINT", onInt);
  processObject.on("SIGTERM", onTerm);
  try {
    return await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => {
        forwarding.then(
          () => forwardingError === null
            ? resolve(Object.freeze({ code, signal, stdout: capturedStdout.toString("utf8") }))
            : reject(forwardingError),
          reject,
        );
      });
    });
  } finally {
    processObject.off("SIGINT", onInt);
    processObject.off("SIGTERM", onTerm);
  }
}

export function childStatus({ code, signal }) {
  if (Number.isInteger(code)) return code;
  if (signal === "SIGINT") return 130;
  if (signal === "SIGTERM") return 143;
  return 7;
}
