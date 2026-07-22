import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { compareNativeInventory, probeHost } from "./base.mjs";
import { runPiInvocationScenario } from "./scenarios/pi.mjs";
import { createPiNativeInvoker } from "./pi-runtime.mjs";
import { createEvidenceRecord } from "../evidence-schema.mjs";

export const PI_COMPATIBILITY = Object.freeze({
	pi: "0.80.10",
	node: "25.9.0",
	piSubagents: "0.35.1",
	delegationProtocol: 1,
});

const SUPPORTED_PI_VERSION_MIN = [0, 80, 10];
const SUPPORTED_PI_VERSION_MAX_EXCLUSIVE = [0, 82, 0];

function parsePiVersion(value) {
	const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(value);
	return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
	for (let index = 0; index < left.length; index += 1) {
		if (left[index] !== right[index]) return left[index] - right[index];
	}
	return 0;
}

function isSupportedPiVersion(value) {
	const version = parsePiVersion(value);
	return (
		version !== null &&
		compareVersions(version, SUPPORTED_PI_VERSION_MIN) >= 0 &&
		compareVersions(version, SUPPORTED_PI_VERSION_MAX_EXCLUSIVE) < 0
	);
}

export const PI_DELEGATION_PUBLIC_EXPORTS = Object.freeze([
	"SUBAGENT_DELEGATION_PROTOCOL_VERSION",
	"SUBAGENT_DELEGATION_REQUEST_EVENT",
	"SUBAGENT_DELEGATION_STARTED_EVENT",
	"SUBAGENT_DELEGATION_UPDATE_EVENT",
	"SUBAGENT_DELEGATION_RESPONSE_EVENT",
	"SUBAGENT_DELEGATION_CANCEL_EVENT",
]);

export const PI_DELEGATION_EVENT_VALUES = Object.freeze({
	request: "prompt-template:subagent:request",
	started: "prompt-template:subagent:started",
	update: "prompt-template:subagent:update",
	response: "prompt-template:subagent:response",
	cancel: "prompt-template:subagent:cancel",
});

const SHA256 = /^[0-9a-f]{64}$/u;

function sha256(value) {
	return crypto.createHash("sha256").update(value).digest("hex");
}

function realpathOrNull(candidate) {
	if (typeof candidate !== "string" || candidate.length === 0) return null;
	try {
		return fs.realpathSync(candidate);
	} catch {
		return null;
	}
}

function resolveExecutable(command) {
	const direct = realpathOrNull(command);
	if (direct) return direct;
	const result = spawnSync("which", [command], { encoding: "utf8" });
	if (result.status !== 0) return null;
	return realpathOrNull(result.stdout.trim().split("\n")[0]);
}

function resolveEnginePackage(executable) {
	if (typeof executable !== "string" || executable.length === 0) return null;
	let current;
	try {
		current = fs.statSync(executable).isDirectory()
			? executable
			: path.dirname(executable);
	} catch {
		return null;
	}
	while (true) {
		const candidate = readJsonFile(path.join(current, "package.json"));
		if (candidate?.value?.name === "@earendil-works/pi-coding-agent")
			return candidate;
		const parent = path.dirname(current);
		if (parent === current) return null;
		current = parent;
	}
}

function readJsonFile(filePath) {
	try {
		const stat = fs.lstatSync(filePath);
		if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 256 * 1024)
			return null;
		return {
			value: JSON.parse(fs.readFileSync(filePath, "utf8")),
			path: realpathOrNull(filePath),
		};
	} catch {
		return null;
	}
}

function prerequisiteCandidates({
	env = process.env,
	home = os.homedir(),
	packageJsonPath = null,
} = {}) {
	const configuredRoot =
		typeof env.PI_CODING_AGENT_DIR === "string" &&
		env.PI_CODING_AGENT_DIR.length > 0
			? path.isAbsolute(env.PI_CODING_AGENT_DIR)
				? env.PI_CODING_AGENT_DIR
				: path.resolve(home, env.PI_CODING_AGENT_DIR)
			: null;
	const agentRoot = configuredRoot ?? path.join(home, ".pi", "agent");
	return [
		packageJsonPath,
		env.PI_SUBAGENTS_PACKAGE_JSON,
		path.join(agentRoot, "npm", "node_modules", "pi-subagents", "package.json"),
		path.join(
			home,
			".pi",
			"agent",
			"npm",
			"node_modules",
			"pi-subagents",
			"package.json",
		),
	].filter(
		(candidate, index, values) =>
			typeof candidate === "string" &&
			candidate.length > 0 &&
			values.indexOf(candidate) === index,
	);
}

function inspectDelegationExports(
	packageJsonPath,
	nodeExecutable = process.execPath,
) {
	if (typeof packageJsonPath !== "string" || packageJsonPath.length === 0)
		return null;
	const script = `
    import { createRequire } from "node:module";
    const requireFromPackage = createRequire(${JSON.stringify(packageJsonPath)});
    const entry = requireFromPackage.resolve("pi-subagents/delegation");
    // Pi loads the public package export through its TypeScript-aware runtime.
    // Node's native strip-types loader intentionally refuses .ts files below
    // node_modules, so the probe must use the same supported loader family
    // instead of treating that host limitation as a missing public export.
    const jitiEntry = requireFromPackage.resolve("jiti");
    const { createJiti } = await import(new URL(jitiEntry, "file:").href);
    const delegation = await createJiti(${JSON.stringify(packageJsonPath)}).import(entry);
    process.stdout.write(JSON.stringify({
      public_exports: Object.keys(delegation).sort(),
      protocol_version: delegation.SUBAGENT_DELEGATION_PROTOCOL_VERSION ?? null,
      public_event_values: {
        request: delegation.SUBAGENT_DELEGATION_REQUEST_EVENT ?? null,
        started: delegation.SUBAGENT_DELEGATION_STARTED_EVENT ?? null,
        update: delegation.SUBAGENT_DELEGATION_UPDATE_EVENT ?? null,
        response: delegation.SUBAGENT_DELEGATION_RESPONSE_EVENT ?? null,
        cancel: delegation.SUBAGENT_DELEGATION_CANCEL_EVENT ?? null,
      },
    }));
  `;
	const result = spawnSync(
		nodeExecutable,
		["--input-type=module", "--eval", script],
		{
			encoding: "utf8",
			timeout: 2_000,
		},
	);
	if (result.status !== 0 || result.error || typeof result.stdout !== "string")
		return null;
	try {
		const observation = JSON.parse(result.stdout);
		if (
			!observation ||
			typeof observation !== "object" ||
			Array.isArray(observation)
		)
			return null;
		return observation;
	} catch {
		return null;
	}
}

function resolveSettingsPackageSource(source, settingsPath, home) {
	if (typeof source !== "string" || source.length === 0) return null;
	const expanded =
		source === "~"
			? home
			: source.startsWith("~/")
				? path.join(home, source.slice(2))
				: source.startsWith("file:")
					? source.slice(5)
					: source;
	return path.isAbsolute(expanded)
		? path.resolve(expanded)
		: path.resolve(path.dirname(settingsPath), expanded);
}

function configuredPiPackageRoot({
	env = process.env,
	home = os.homedir(),
	packageRoot = null,
} = {}) {
	const agentRoot =
		typeof env.PI_CODING_AGENT_DIR === "string" &&
		env.PI_CODING_AGENT_DIR.length > 0
			? path.isAbsolute(env.PI_CODING_AGENT_DIR)
				? env.PI_CODING_AGENT_DIR
				: path.resolve(home, env.PI_CODING_AGENT_DIR)
			: path.join(home, ".pi", "agent");
	const settingsPath = path.join(agentRoot, "settings.json");
	const settings = readJsonFile(settingsPath)?.value;
	const settingsSources = Array.isArray(settings?.packages)
		? settings.packages
				.map((entry) => (typeof entry === "string" ? entry : entry?.source))
				.filter(Boolean)
		: [];
	const candidates = [
		packageRoot,
		env.PI_PACKAGE_DIR,
		...settingsSources.map((source) =>
			resolveSettingsPackageSource(source, settingsPath, home),
		),
		path.join(agentRoot, "maister"),
	];
	for (const candidate of candidates) {
		const resolved = realpathOrNull(candidate);
		if (!resolved) continue;
		const manifest = readJsonFile(path.join(resolved, "package.json"));
		if (manifest?.value?.name === "maister") return resolved;
	}
	return null;
}

function frontmatterValue(source, field) {
	if (typeof source !== "string") return null;
	const match = source.match(
		new RegExp(`^${field}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\r\\n]+))\\s*$`, "mu"),
	);
	return match ? (match[1] ?? match[2] ?? match[3] ?? "").trim() : null;
}

function inspectGeneratedPiPackage({
	packageRoot,
	expectedPackageName = "maister",
} = {}) {
	const resolvedRoot = realpathOrNull(packageRoot);
	if (!resolvedRoot)
		return {
			package_identity: null,
			package_root: null,
			native_descriptors: null,
		};
	const packageManifest = readJsonFile(
		path.join(resolvedRoot, "package.json"),
	)?.value;
	const agentsRoot = path.join(resolvedRoot, "agents");
	if (
		packageManifest?.name !== expectedPackageName ||
		packageManifest?.pi?.subagents?.agents?.length !== 1 ||
		packageManifest.pi.subagents.agents[0] !== "./agents"
	) {
		return {
			package_identity:
				typeof packageManifest?.name === "string" ? packageManifest.name : null,
			package_root: resolvedRoot,
			native_descriptors: null,
		};
	}
	let entries;
	try {
		entries = fs
			.readdirSync(agentsRoot, { withFileTypes: true })
			.filter(
				(entry) =>
					entry.isFile() && /^maister-[a-z][a-z0-9-]*\.md$/u.test(entry.name),
			)
			.map((entry) => entry.name)
			.sort((left, right) => left.localeCompare(right, "en-US"));
	} catch {
		entries = null;
	}
	if (!entries)
		return {
			package_identity: expectedPackageName,
			package_root: resolvedRoot,
			native_descriptors: null,
		};
	const descriptors = [];
	for (const entry of entries) {
		const source = (() => {
			try {
				return fs.readFileSync(path.join(agentsRoot, entry), "utf8");
			} catch {
				return null;
			}
		})();
		const externalId = frontmatterValue(source, "native_role_external_id");
		const name = frontmatterValue(source, "name");
		const disabled = frontmatterValue(source, "disabled");
		if (externalId === null || name === null)
			return {
				package_identity: expectedPackageName,
				package_root: resolvedRoot,
				native_descriptors: null,
			};
		descriptors.push({
			native_role_external_id: externalId,
			name,
			disabled: disabled === "true",
			source_info: {
				package_name: expectedPackageName,
				package_root: resolvedRoot,
			},
		});
	}
	return {
		package_identity: expectedPackageName,
		package_root: resolvedRoot,
		native_descriptors: descriptors,
		native_role_external_ids: descriptors.map(
			({ native_role_external_id: id }) => id,
		),
	};
}

function inspectPiEnvironment({
	command,
	hostVersion,
	env = process.env,
	home = os.homedir(),
	packageJsonPath = null,
	enginePackageJsonPath = null,
	nodeVersion = process.versions.node,
	nodeExecutable = process.execPath,
	executableRealpath = null,
	packageRoot = null,
} = {}) {
	const executable =
		realpathOrNull(executableRealpath) ?? resolveExecutable(command);
	const enginePackage = enginePackageJsonPath
		? readJsonFile(enginePackageJsonPath)
		: resolveEnginePackage(executable);
	const packageCandidate =
		prerequisiteCandidates({ env, home, packageJsonPath })
			.map(readJsonFile)
			.find((candidate) => candidate?.value?.name === "pi-subagents") ?? null;
	const packageValue = packageCandidate?.value ?? null;
	const packageBytes = packageCandidate?.path
		? fs.readFileSync(packageCandidate.path)
		: null;
	const delegation = inspectDelegationExports(
		packageCandidate?.path,
		nodeExecutable,
	);
	const generatedPackage = inspectGeneratedPiPackage({
		packageRoot: configuredPiPackageRoot({ env, home, packageRoot }),
	});
	return {
		executable_realpath: executable,
		pi_version: hostVersion,
		pi_engine_version:
			typeof enginePackage?.value?.version === "string"
				? enginePackage.value.version
				: null,
		pi_engine_source: enginePackage?.path ?? null,
		node_version: nodeVersion,
		pi_subagents_version:
			typeof packageValue?.version === "string" ? packageValue.version : null,
		pi_subagents_source: packageCandidate?.path ?? null,
		pi_subagents_digest: packageBytes ? sha256(packageBytes) : null,
		public_exports: delegation?.public_exports ?? null,
		protocol_version: delegation?.protocol_version ?? null,
		public_event_values: delegation?.public_event_values ?? null,
		...generatedPackage,
	};
}

function unavailable(reason, provenance = {}) {
	return { result: "unavailable", reason, provenance };
}

function exactPublicExports(value) {
	if (!Array.isArray(value)) return false;
	const actual = [...value].sort();
	const expected = [...PI_DELEGATION_PUBLIC_EXPORTS].sort();
	return (
		actual.length === expected.length &&
		actual.every((name, index) => name === expected[index])
	);
}

function exactPublicEventValues(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		return false;
	return Object.entries(PI_DELEGATION_EVENT_VALUES).every(
		([key, expected]) => value[key] === expected,
	);
}

function piDiscovery({
	manifest,
	target,
	hostVersion,
	observation,
	expectedExecutableRealpath = null,
	platform = process.platform,
} = {}) {
	if (
		observation === null ||
		typeof observation !== "object" ||
		Array.isArray(observation)
	) {
		return unavailable("public_export_missing");
	}
	const metadata = Object.fromEntries(
		Object.entries({
			executable_realpath: observation.executable_realpath,
			node_version: observation.node_version,
			prerequisite: "pi-subagents",
			prerequisite_version: observation.pi_subagents_version,
			prerequisite_source: observation.pi_subagents_source,
			prerequisite_digest: observation.pi_subagents_digest,
			protocol_version: observation.protocol_version,
			public_event_values: observation.public_event_values,
			package_identity: observation.package_identity,
			package_root: observation.package_root,
		}).filter(([, value]) => value !== null && value !== undefined),
	);
	if (platform !== "darwin" && platform !== "linux")
		return unavailable("platform_unsupported", metadata);
	if (typeof observation.executable_realpath !== "string")
		return unavailable("pi_executable_identity_unavailable", metadata);
	if (
		expectedExecutableRealpath !== null &&
		observation.executable_realpath !== expectedExecutableRealpath
	) {
		return unavailable("pi_executable_mismatch", metadata);
	}
	if (
		!isSupportedPiVersion(hostVersion) ||
		!isSupportedPiVersion(observation.pi_version)
	) {
		return unavailable("pi_version_mismatch", metadata);
	}
	if (
		Object.hasOwn(observation, "pi_engine_version") &&
		(typeof observation.pi_engine_version !== "string" ||
			!isSupportedPiVersion(observation.pi_engine_version))
	) {
		return unavailable("pi_version_mismatch", metadata);
	}
	if (observation.node_version !== PI_COMPATIBILITY.node)
		return unavailable("node_engine_mismatch", metadata);
	if (
		typeof observation.pi_subagents_version !== "string" ||
		typeof observation.pi_subagents_source !== "string" ||
		!SHA256.test(observation.pi_subagents_digest ?? "")
	) {
		return unavailable("delegation_package_missing", metadata);
	}
	if (observation.pi_subagents_version !== PI_COMPATIBILITY.piSubagents)
		return unavailable("delegation_version_mismatch", metadata);
	if (observation.readiness === false || observation.ready === false)
		return unavailable("readiness_unavailable", metadata);
	if (!exactPublicExports(observation.public_exports))
		return unavailable("public_export_missing", metadata);
	if (observation.protocol_version !== PI_COMPATIBILITY.delegationProtocol)
		return unavailable("protocol_mismatch", metadata);
	if (!exactPublicEventValues(observation.public_event_values))
		return unavailable("public_event_mismatch", metadata);
	if (
		observation.package_identity !== "maister" ||
		typeof observation.package_root !== "string"
	) {
		return unavailable("generated_package_source_missing", metadata);
	}
	const descriptors = observation.native_descriptors;
	if (!Array.isArray(descriptors))
		return unavailable("source_info_missing", metadata);
	const expected = (manifest?.rows ?? [])
		.filter((row) => row?.target === target)
		.map((row) => row?.native_role_external_id);
	if (descriptors.length !== expected.length)
		return unavailable("native_descriptor_inventory_incomplete", metadata);
	const seen = new Set();
	for (const descriptor of descriptors) {
		if (
			!descriptor ||
			typeof descriptor !== "object" ||
			typeof descriptor.native_role_external_id !== "string"
		) {
			return unavailable("native_descriptor_malformed", metadata);
		}
		if (seen.has(descriptor.native_role_external_id))
			return unavailable("native_inventory_collision", metadata);
		seen.add(descriptor.native_role_external_id);
		if (descriptor.disabled === true)
			return unavailable("native_descriptor_disabled", metadata);
		if (descriptor.name !== descriptor.native_role_external_id)
			return unavailable("native_descriptor_identity_mismatch", metadata);
		if (
			descriptor.source_info?.package_name !== "maister" ||
			descriptor.source_info?.package_root !== observation.package_root
		) {
			return unavailable("source_info_mismatch", metadata);
		}
	}
	const inventory = compareNativeInventory({ manifest, target, observation });
	return {
		...inventory,
		provenance: {
			...metadata,
			...(inventory.provenance ?? {}),
		},
	};
}

function replaceRecordReason(record, reason) {
	return createEvidenceRecord({
		target: record.target,
		capability: record.capability,
		hostVersion: record.host_version,
		scenario: record.scenario,
		result: "unavailable",
		provenance: { ...record.provenance, reason },
		timestamp: record.timestamp,
		expiresAt: record.expires_at,
	});
}

export function probePi(options = {}) {
	const expectedExecutableRealpath = options.expectedExecutableRealpath ?? null;
	const inspect =
		typeof options.inspect === "function"
			? options.inspect
			: inspectPiEnvironment;
	const requestedCommand = options.command ?? "pi";
	const command = resolveExecutable(requestedCommand) ?? requestedCommand;
	const packageRoot = configuredPiPackageRoot({
		env: options.env ?? process.env,
		home: options.home ?? os.homedir(),
		packageRoot: options.packageRoot ?? null,
	});
	let discoveryOutcome = null;
	let discoveryObservation = null;
	let liveRuntime = null;
	try {
		const result = probeHost({
			...options,
			target: "pi",
			command,
			discoveryScenario: "pi-native-discovery-v1",
			scenario: "pi-native-runtime-v1",
			// probeHost intentionally keeps its synchronous contract. The default
			// Pi invoker is installed lazily after E5 has verified the supported host
			// range and generated package, while tests and callers may inject an invoke
			// function as before.
			invoke:
				typeof options.invoke === "function" ? options.invoke : () => null,
			discover: (context) => {
				const observation =
					typeof options.discover === "function"
						? options.discover(context)
						: inspect({
								command: context.command,
								hostVersion: context.hostVersion,
								env: options.env,
								home: options.home,
								packageJsonPath: options.packageJsonPath,
								enginePackageJsonPath: options.enginePackageJsonPath,
								nodeVersion: options.nodeVersion,
								nodeExecutable: options.nodeExecutable,
								executableRealpath: options.executableRealpath,
								packageRoot,
							});
				discoveryObservation = observation;
				discoveryOutcome = piDiscovery({
					manifest: context.manifest,
					target: "pi",
					hostVersion: context.hostVersion,
					observation,
					expectedExecutableRealpath,
					platform: options.platform ?? process.platform,
				});
				return discoveryOutcome;
			},
			runScenario: ({ hostVersion, ...context }) => {
				if (!isSupportedPiVersion(hostVersion))
					return unavailable("pi_version_mismatch");
				if (discoveryOutcome?.result !== "passed")
					return unavailable(
						discoveryOutcome?.reason ?? "native-discovery-unavailable",
					);
				let invoke = options.invoke;
				if (typeof invoke !== "function") {
					liveRuntime ??= createPiNativeInvoker({
						command,
						hostVersion,
						packageRoot: discoveryObservation?.package_root ?? packageRoot,
						delegationPackageJson: discoveryObservation?.pi_subagents_source,
						env: options.env ?? process.env,
						home: options.home ?? os.homedir(),
						timeoutMs: options.liveTimeoutMs ?? 120_000,
					});
					if (liveRuntime.unavailableReason)
						return unavailable(liveRuntime.unavailableReason);
					invoke = liveRuntime.invoke;
				}
				const scenario = runPiInvocationScenario({
					hostVersion,
					...context,
					invoke,
				});
				return {
					...scenario,
					provenance: {
						...discoveryOutcome.provenance,
						...(scenario.provenance ?? {}),
					},
				};
			},
		});
		if (result.records[0]?.provenance.reason === "runtime-not-installed") {
			return {
				...result,
				records: result.records.map((record) =>
					replaceRecordReason(record, "pi_missing"),
				),
			};
		}
		return result;
	} finally {
		liveRuntime?.cleanup?.();
	}
}

export { inspectPiEnvironment, piDiscovery };
