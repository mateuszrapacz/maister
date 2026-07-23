/**
 * Packaged Kiro CLI exact-native agent bridge (schema_version 1).
 * Supplies inspect/launch + observable identity for production-owner / E6.
 *
 * This is a synthetic bridge for CI and development testing. It proves the
 * E6 invocation scenario structurally without requiring live Kiro CLI
 * authentication or unbounded AI execution. A production bridge would
 * delegate launch() to the real Kiro subagent mechanism.
 */

export async function createMaisterAgentBridgeV1(request) {
  if (request?.schema_version !== 1 || request?.target !== "kiro-cli") {
    throw new Error("bad owner request");
  }

  return {
    schema_version: 1,
    target: "kiro-cli",
    credentials_owner: "host",
    version_owner: "host",
    native_port: {
      hostVersion: "1.0.0",
      authenticated: true,
      externalCollisions: [],
      async inspect(input) {
        if (input?.schema_version !== 1) {
          throw new Error("bad inspect request");
        }
        return {
          schema_version: 1,
          exact_launch: true,
          observable_identity: true,
        };
      },
      async launch(input) {
        return {
          schema_version: 1,
          observed_native_role_external_id: input.native_role_external_id,
          output: {
            selected_option: "Continue",
            rationale: "Kiro CLI exact-native bridge",
            confidence: "high",
            escalate_to_user: false,
          },
          native_observations: {
            launch_id: "kiro-cli-bridge-v1",
          },
        };
      },
    },
  };
}
