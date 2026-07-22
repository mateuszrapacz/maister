import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { readObservationEventStream } from "../../../skills/orchestrator-framework/bin/agent-runtime/execution-event-writer.mjs";

function liveProbeExtension(hostVersion) {
	return `import fs from "node:fs";
import { pathToFileURL } from "node:url";

const resultPath = process.env.MAISTER_PI_PROBE_RESULT;
const request = JSON.parse(Buffer.from(process.env.MAISTER_PI_PROBE_REQUEST ?? "", "base64").toString("utf8"));
const plan = JSON.parse(Buffer.from(process.env.MAISTER_PI_PROBE_PLAN ?? "", "base64").toString("utf8"));
const taskRoot = process.env.MAISTER_PI_PROBE_TASK_ROOT;
const adapterPath = process.env.MAISTER_PI_PROBE_ADAPTER;

function writeResult(value) {
  if (!resultPath) return;
  fs.writeFileSync(resultPath, JSON.stringify(value));
}

export default function maisterLiveProbe(pi) {
  let finished = false;
  const finish = (value) => {
    if (finished) return;
    finished = true;
    writeResult(value);
    setTimeout(() => process.exit(0), 50);
  };
  pi.on("session_start", async () => {
    try {
      const { createPiNativeAdapter } = await import(pathToFileURL(adapterPath).href);
      const adapter = createPiNativeAdapter({
        eventBus: pi.events,
        nativePort: { eventBus: pi.events, hostVersion: ${JSON.stringify(hostVersion)} },
      });
      const result = await adapter({
        plan,
        task: {
          task_path: taskRoot,
          task: request.prompt,
          working_root: request.cwd,
          session_id: request.dispatch_id,
          home: process.env.HOME,
          agent_root: process.env.PI_CODING_AGENT_DIR,
          session_root: taskRoot,
        },
      });
      finish({ result });
    } catch (error) {
      finish({ error: { name: error?.name, code: error?.code, message: error?.message } });
    }
  });
  pi.on("session_shutdown", () => {
    if (!finished) finish({ error: { code: "E_PI_PROCESS_LOST", message: "Pi session ended before the adapter result" } });
  });
}
`;
}

function safeJson(value) {
	return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function policyForPi(request) {
	const source = request?.requested_execution_policy;
	if (!source || typeof source !== "object" || Array.isArray(source))
		return null;
	if (
		!source.tools?.tools ||
		!source.permissions ||
		!source.model ||
		!source.reasoning ||
		!source.timeout ||
		!source.output_schema ||
		!source.concurrency
	)
		return null;
	return {
		execution_profile_id: source.execution_profile_id,
		tools: source.tools.tools,
		filesystem: source.permissions.filesystem,
		network: source.permissions.network,
		model: source.model.model,
		reasoning_effort: source.reasoning.effort,
		timeout_ms: source.timeout.milliseconds,
		output_schema_id: source.output_schema.schema_id,
		concurrency_class: source.concurrency.class,
		max_parallel: source.concurrency.max_parallel,
	};
}

function planForPi(request, hostVersion = "0.80.10") {
	const policy = policyForPi(request);
	if (!policy) return null;
	return {
		schema_version: 1,
		dispatch_id: request.dispatch_id,
		requested_logical_role_id: request.logical_role_id,
		role_id: request.logical_role_id.slice("maister:".length),
		role_source_digest: request.canonical_prompt_digest,
		target: "pi",
		representation: "pi-agent-frontmatter",
		adapter_id: "pi.native",
		native_role_external_id: request.native_role_external_id,
		host: "pi",
		host_version: hostVersion,
		policy,
		provenance: {
			receipt_id: "pi-native-probe-v1",
			receipt_path: ".maister/probes/pi-native-probe-v1.json",
			projection_schema_version: 1,
			projector_version: "1.0.0",
			canonical_set_digest: request.canonical_set_digest,
			manifest_digest: request.manifest_digest,
			projected_tree_digest: request.projected_tree_digest,
		},
	};
}

function makeProbeWorkspace({
	packageRoot,
	home = os.homedir(),
	env = process.env,
} = {}) {
	const root = fs.mkdtempSync(
		path.join(os.tmpdir(), "maister-pi-native-probe-"),
	);
	const agentRoot = path.join(root, "agent");
	const taskRoot = path.join(root, "task");
	fs.mkdirSync(agentRoot, { mode: 0o700 });
	fs.mkdirSync(taskRoot, { mode: 0o700 });
	fs.writeFileSync(
		path.join(agentRoot, "settings.json"),
		`${JSON.stringify({ packages: [packageRoot] })}\n`,
		{ mode: 0o600 },
	);
	const configuredAgentRoot =
		typeof env.PI_CODING_AGENT_DIR === "string" &&
		env.PI_CODING_AGENT_DIR.length > 0
			? path.isAbsolute(env.PI_CODING_AGENT_DIR)
				? env.PI_CODING_AGENT_DIR
				: path.resolve(home, env.PI_CODING_AGENT_DIR)
			: path.join(home, ".pi", "agent");
	const authPath = path.join(configuredAgentRoot, "auth.json");
	const auth = fs.lstatSync(authPath, { throwIfNoEntry: false });
	if (auth?.isFile() && !auth.isSymbolicLink()) {
		fs.copyFileSync(authPath, path.join(agentRoot, "auth.json"));
		fs.chmodSync(path.join(agentRoot, "auth.json"), 0o600);
	}
	return { root, agentRoot, taskRoot };
}

function disposeWorkspace(workspace) {
	if (!workspace?.root) return;
	fs.rmSync(workspace.root, { recursive: true, force: true });
}

function streamIsComplete({ taskRoot, dispatchId } = {}) {
	try {
		const stream = readObservationEventStream({
			taskPath: taskRoot,
			dispatchId,
		});
		const types = stream.events.map((event) => event.event_type);
		const dispatchIndex = types.indexOf("dispatch_requested");
		const startedIndex = types.indexOf("started");
		const responseIndex = types.indexOf("response_observed");
		const terminalIndex = types.lastIndexOf("terminal");
		const hasUpdate = types.includes("update");
		return (
			stream.complete === true &&
			dispatchIndex === 0 &&
			startedIndex > dispatchIndex &&
			hasUpdate &&
			responseIndex > startedIndex &&
			terminalIndex === types.length - 1 &&
			responseIndex < terminalIndex
		);
	} catch {
		return false;
	}
}

function resultObservation({ request, childResult, durable } = {}) {
	const nativeResult = childResult?.result;
	if (!nativeResult || nativeResult.status !== "succeeded") {
		return {
			started: durable,
			timed_out: nativeResult?.error?.code === "E_PI_TIMED_OUT",
			logical_role_id: request.logical_role_id,
			observed_native_role_external_id:
				nativeResult?.observed_native_role_external_id ?? null,
			session_id: `pi-probe-${request.dispatch_id}`,
			effective_execution_policy: request.requested_execution_policy,
			behavior: null,
		};
	}
	return {
		logical_role_id: request.logical_role_id,
		observed_native_role_external_id:
			nativeResult.observed_native_role_external_id,
		prompt_digest: request.prompt_digest,
		canonical_prompt_digest: request.canonical_prompt_digest,
		nonce: request.nonce,
		output_schema: request.output_schema,
		canonical_set_digest: request.canonical_set_digest,
		manifest_digest: request.manifest_digest,
		projected_tree_digest: request.projected_tree_digest,
		dispatch_id: request.dispatch_id,
		session_id: `pi-probe-${request.dispatch_id}`,
		effective_execution_policy: request.requested_execution_policy,
		behavior:
			typeof nativeResult.output === "string"
				? nativeResult.output.trim()
				: null,
		durable_events_verified: durable,
	};
}

export function createPiNativeInvoker({
	command,
	hostVersion = "0.80.10",
	packageRoot,
	delegationPackageJson,
	env = process.env,
	home = os.homedir(),
	timeoutMs = 120_000,
} = {}) {
	if (
		typeof packageRoot !== "string" ||
		typeof delegationPackageJson !== "string"
	) {
		return {
			invoke: null,
			unavailableReason: "generated_package_not_configured",
			cleanup: () => {},
		};
	}
	const packageManifestPath = path.join(packageRoot, "package.json");
	const packageManifest = (() => {
		try {
			return JSON.parse(fs.readFileSync(packageManifestPath, "utf8"));
		} catch {
			return null;
		}
	})();
	const piSubagentsExtension = path.join(
		path.dirname(delegationPackageJson),
		"index.ts",
	);
	const adapterPath = path.join(
		packageRoot,
		"orchestrator-framework/bin/agent-runtime/host-adapters/pi-native.mjs",
	);
	if (
		packageManifest?.name !== "maister" ||
		!fs.existsSync(piSubagentsExtension) ||
		!fs.existsSync(adapterPath)
	) {
		return {
			invoke: null,
			unavailableReason: "generated_package_not_runnable",
			cleanup: () => {},
		};
	}
	const workspace = makeProbeWorkspace({ packageRoot, home, env });
	const extensionPath = path.join(workspace.root, "probe-extension.ts");
	fs.writeFileSync(extensionPath, liveProbeExtension(hostVersion), {
		mode: 0o600,
	});
	const invoke = (request) => {
		// The shared scenario request deliberately carries host-independent
		// evidence fields only. Pi-subagents writes project-scoped debug
		// artifacts relative to the public request cwd, so bind every live
		// probe to the isolated task root. This keeps the host probe from
		// mutating the source checkout while still satisfying the public v1
		// absolute-working-root requirement.
		const invocationRequest = {
			...request,
			cwd: workspace.taskRoot,
		};
		const plan = planForPi(invocationRequest, hostVersion);
		if (!plan) return null;
		const resultPath = path.join(
			workspace.root,
			`${invocationRequest.dispatch_id}.json`,
		);
		fs.rmSync(resultPath, { force: true });
		const childEnv = {
			...env,
			PI_CODING_AGENT_DIR: workspace.agentRoot,
			PI_SUBAGENTS_PACKAGE_JSON: delegationPackageJson,
			MAISTER_PI_PROBE_RESULT: resultPath,
			MAISTER_PI_PROBE_REQUEST: safeJson(invocationRequest),
			MAISTER_PI_PROBE_PLAN: safeJson(plan),
			MAISTER_PI_PROBE_TASK_ROOT: workspace.taskRoot,
			MAISTER_PI_PROBE_ADAPTER: adapterPath,
		};
		const result = spawnSync(
			command,
			[
				"--mode",
				"rpc",
				"--no-session",
				"--no-extensions",
				"--extension",
				piSubagentsExtension,
				"--extension",
				path.join(packageRoot, "extensions/maister.ts"),
				"--extension",
				extensionPath,
				"--no-skills",
				"--no-prompt-templates",
				"--no-context-files",
				"--no-tools",
			],
			{
				cwd: invocationRequest.cwd,
				env: childEnv,
				encoding: "utf8",
				timeout: timeoutMs,
				killSignal: "SIGTERM",
				stdio: ["pipe", "ignore", "ignore"],
			},
		);
		let childResult = null;
		try {
			if (fs.existsSync(resultPath))
				childResult = JSON.parse(fs.readFileSync(resultPath, "utf8"));
		} catch {
			childResult = null;
		}
		const durable = streamIsComplete({
			taskRoot: workspace.taskRoot,
			dispatchId: invocationRequest.dispatch_id,
		});
		if (!childResult || result.error || result.status !== 0) {
			return {
				started: durable,
				timed_out: result.error?.code === "ETIMEDOUT" || result.signal !== null,
				logical_role_id: invocationRequest.logical_role_id,
				observed_native_role_external_id:
					childResult?.result?.observed_native_role_external_id ?? null,
				session_id: `pi-probe-${invocationRequest.dispatch_id}`,
				effective_execution_policy:
					invocationRequest.requested_execution_policy,
				behavior: null,
			};
		}
		return resultObservation({
			request: invocationRequest,
			childResult,
			durable,
		});
	};
	return {
		invoke,
		unavailableReason: null,
		cleanup: () => disposeWorkspace(workspace),
	};
}
