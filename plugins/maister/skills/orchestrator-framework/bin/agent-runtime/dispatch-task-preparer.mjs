import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function mapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function roleOutput(projection, plan, kind) {
  const output = projection.outputs.find((candidate) => candidate.role_id === plan.role_id && candidate.kind === kind);
  if (!output || typeof output.content !== "string" || output.sha256 !== sha256(output.content)) throw new TypeError(`trusted projection has no valid ${kind} for ${plan.requested_logical_role_id}`);
  return output;
}

function privateDispatchDirectory(taskPath) {
  const declaredTaskRoot = path.resolve(taskPath);
  const root = fs.lstatSync(declaredTaskRoot, { throwIfNoEntry: false });
  if (!root?.isDirectory() || root.isSymbolicLink()) {
    throw new TypeError("trusted task root must be an existing real directory");
  }
  const trustedTaskRoot = fs.realpathSync(declaredTaskRoot);
  let directory = trustedTaskRoot;
  for (const component of ["execution", "agent-dispatches"]) {
    directory = path.join(directory, component);
    const existing = fs.lstatSync(directory, { throwIfNoEntry: false });
    if (existing?.isSymbolicLink() || (existing && !existing.isDirectory())) {
      throw new TypeError("private dispatch directory has an unsafe ancestor");
    }
    if (!existing) fs.mkdirSync(directory, { mode: 0o700 });
    const created = fs.lstatSync(directory);
    if (!created.isDirectory() || created.isSymbolicLink() || fs.realpathSync(directory) !== directory) {
      throw new TypeError("private dispatch directory is not a real directory");
    }
    fs.chmodSync(directory, 0o700);
  }
  return { directory, taskRoot: trustedTaskRoot };
}

function writeBoundSchema(filePath, content) {
  const existing = fs.lstatSync(filePath, { throwIfNoEntry: false });
  if (existing?.isSymbolicLink() || (existing && !existing.isFile())) throw new TypeError("dispatch schema destination is not a regular file");
  if (existing) {
    const descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
      if (fs.readFileSync(descriptor, "utf8") !== content) throw new TypeError("dispatch schema destination contains conflicting bytes");
      fs.fchmodSync(descriptor, 0o600);
    } finally {
      fs.closeSync(descriptor);
    }
    return;
  }
  const descriptor = fs.openSync(filePath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
  try {
    fs.writeFileSync(descriptor, content, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function gateContext(task) {
  if (!mapping(task) || !mapping(task.gate_context) || !mapping(task.gate_context.context)) throw new TypeError("runtime task must contain a gate context");
  const taskPath = task.gate_context.context.task_path;
  if (typeof taskPath !== "string" || !path.isAbsolute(taskPath)) throw new TypeError("gate context task_path must be absolute");
  return { taskPath, workflowId: task.gate_context.context.workflow_id ?? "maister", workItemId: task.work_item?.id };
}

function executionContext(task, context) {
  const idempotencyKey = task.idempotency_context?.idempotency_key;
  if (typeof idempotencyKey !== "string" || typeof context.workItemId !== "string") throw new TypeError("runtime task has no durable dispatch identities");
  return {
    idempotency_key: idempotencyKey,
    gate_decision_id: task.idempotency_context.gate_decision_id ?? null,
    workflow_id: String(context.workflowId),
    work_item_id: context.workItemId,
  };
}

export function createDispatchTaskPreparer({ projection, workingRoot = process.cwd() } = {}) {
  if (!mapping(projection) || !Array.isArray(projection.outputs)) throw new TypeError("dispatch task preparer requires the verified projection");
  if (!path.isAbsolute(workingRoot)) throw new TypeError("dispatch task preparer workingRoot must be absolute");
  return Object.freeze({
    prepare({ plan, task } = {}) {
      const context = gateContext(task);
      const privatePaths = privateDispatchDirectory(context.taskPath);
      const common = {
        task_path: privatePaths.taskRoot,
        working_root: workingRoot,
        bounded_task: JSON.stringify(task),
        canonical_source_digest: plan.role_source_digest,
        execution_context: executionContext(task, context),
      };
      if (plan.adapter_id !== "codex.exec") return { ...common, gate_context: structuredClone(task.gate_context), work_item: structuredClone(task.work_item) };
      const prompt = roleOutput(projection, plan, "prompt");
      const schema = roleOutput(projection, plan, "output-schema");
      const directory = privatePaths.directory;
      const outputSchemaPath = path.join(directory, `${plan.dispatch_id}.schema.json`);
      const lastMessagePath = path.join(directory, `${plan.dispatch_id}.last.json`);
      writeBoundSchema(outputSchemaPath, schema.content);
      const last = fs.lstatSync(lastMessagePath, { throwIfNoEntry: false });
      if (last?.isSymbolicLink() || (last && !last.isFile())) throw new TypeError("last-message destination is not a regular file");
      return {
        ...common,
        role_prompt: prompt.content,
        output_schema_path: outputSchemaPath,
        last_message_path: lastMessagePath,
        output_schema_id: plan.policy.output_schema_id,
        result_selector: "details.gate_response",
        nonce: crypto.randomUUID(),
      };
    },
  });
}
