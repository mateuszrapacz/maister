# Cursor agents runtime discovery — operator guide

## TL;DR

Maister agents are delivered via the **Cursor plugin** (`~/.cursor/plugins/local/maister`). After `maister install` / `update --target cursor`, **reload or restart Cursor** before claiming Task / `subagent_type` discovery. Hybrid verify (E5) proves agents exist on disk in the plugin; it is **not** proof that live Task lists them. Optional `--agents-fallback` dual-writes agents to `~/.cursor/agents` and project `.cursor/agents` (secondary; priors under `.maister-backup/`). Smoke: after reload, Task should list/invoke at least `maister-explore` and `maister-code-reviewer`.

---

## What was fixed

| Area | What you get |
|------|----------------|
| **Task discovery (plugin-primary)** | Agents materialize under the Cursor plugin and are declared for the host. Primary path is plugin install — not dual-copy to `~/.cursor/agents`. |
| **Hybrid E5** | When probing with a plugin root, verify can observe `maister-*` names from on-disk `agents/*.md`. That is inventory presence, not live Task enum. |
| **E6 bridge package** | A loadable Cursor bridge (`createMaisterAgentBridgeV1`) ships in distribution + plugin overlay so native-runtime gates can register a packaged `bridge_module`. |
| **Optional fallback** | `--agents-fallback` dual-writes agent markdown after the plugin path succeeds — use only when the plugin path alone is not enough for Task. |

Skills already worked; this work targets agents missing from Task / `subagent_type`.

---

## Install / update

Primary delivery:

```sh
maister install --target cursor
# or
maister update --target cursor
```

Success messaging for Cursor install, update, and verify reminds you to reload before claiming Task discovery.

---

## Why reload / restart is required

Cursor may not re-enumerate plugin agents in the current session. Agent files on disk (and a green hybrid E5) **do not** mean Task has listed them.

**Do not claim Task discovery until you have reloaded or restarted Cursor** after install/update.

---

## Optional `--agents-fallback`

Secondary only — after primary plugin materialize:

```sh
maister install --target cursor --agents-fallback
# or
maister update --target cursor --agents-fallback
```

What it does:

- Copies plugin `agents/*.md` into `~/.cursor/agents` and `<cwd>/.cursor/agents`
- Backs up same-named priors under `<dest>/.maister-backup/` before overwrite
- Leaves the Cursor plugin path as primary; success text reports dual-write status honestly

Use after plugin-path exhaustion or on hosts known to miss plugin agents in Task. Not the default delivery path.

---

## How to verify (S7)

1. Install or update: `maister install|update --target cursor` (add `--agents-fallback` only if needed).
2. **Reload or restart Cursor.**
3. Open Task / `subagent_type` and confirm at least:
   - `maister-explore`
   - `maister-code-reviewer`
4. Optionally invoke one of those agents once.

Only this manual smoke proves product Task discovery. Automated hybrid E5 does not replace it.

---

## Hybrid E5 vs live Task (honest limits)

| | Hybrid E5 | Live Task |
|--|-----------|-----------|
| **What it checks** | Plugin-disk agent names match the expected inventory | Host Task / `subagent_type` actually lists/invokes `maister-*` |
| **When it runs** | Verify/probe with usable `pluginRoot` | After install + **reload**, by you |
| **What a pass means** | Projected agents are present on disk | Product discovery works for operators |
| **What it is not** | Not a public Cursor Task inventory API; not Task enum proof | — |

If hybrid E5 is unavailable (no usable plugin root), treat discovery as provisional and rely on manual smoke before release claims.

---

## Troubleshooting

| Symptom | What to do |
|---------|------------|
| Skills work, agents missing from Task | **Reload or restart Cursor**, then re-check Task. |
| Still missing after reload | Re-run install/update with **`--agents-fallback`**, reload again, re-smoke. |
| Still missing after fallback + reload | Likely a **Cursor product / session limitation** — Maister cannot invent a Task inventory API. Keep plugin path primary; escalate to Cursor host behavior, not further dual-install as “primary.” |

Also check install success text: if you used `--agents-fallback` and dual-write reported errors, the plugin path remains primary — fix destinations/permissions and retry.
