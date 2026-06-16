# Kiro CLI — User Guide

Maister on Kiro CLI gives you the same structured development workflows as Claude Code and Cursor, adapted for Kiro's agent/skill model.

## Quick start

1. **Build** (from maister repo root):
   ```bash
   make build-kiro && make validate-kiro
   ```

2. **Install** to an isolated profile (`~/.kiro-maister`):
   ```bash
   bash platforms/kiro-cli/smoke-install.sh
   ```

3. **Run** from your project:
   ```bash
   ./platforms/kiro-cli/maister-kiro chat --agent maister
   ```

## Common workflows

| Goal | Command / prompt |
|------|------------------|
| Initialize project | `/maister-init` or `@init` |
| Full development | `/maister-development "your task"` or `@dev` |
| Quick plan | `/maister-quick-plan "feature"` |
| Quick bugfix | `/maister-quick-bugfix "bug description"` |
| Resume task | `@resume` with task path |
| Check status | `@status` |

## Headless / CI

```bash
maister-kiro chat --no-interactive --trust-all-tools --agent maister \
  '/maister-development "task description"'
```

Phase gates use **CHAT GATE** defaults in `--no-interactive` mode (documented in the development skill).

## Todo progress tracking

```bash
kiro-cli settings chat.enableTodoList true
```

## Uninstall

```bash
bash platforms/kiro-cli/smoke-uninstall.sh
```

## Full documentation

See [docs/kiro-cli-support.md](../../../docs/kiro-cli-support.md) for install details, E2E matrix, MCP setup, hook behavior, and known gaps.
