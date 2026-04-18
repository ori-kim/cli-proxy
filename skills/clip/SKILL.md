---
name: clip
description: CLI proxy gateway that enforces ACL rules on third-party CLIs and MCP servers. Routes all external tool calls through clip for access control and auditing.
---

# clip — CLI Proxy Gateway

Third-party CLI and MCP server calls MUST go through `clip`.
System CLIs (`grep`, `jq`) and dev tools (`bun`, `npm`, `git`) run directly.

## Rules
- `kaf topic describe` ✗ → `clip kaf topic describe` ✓
- `kubectl get pods` ✗ → `clip kubectl get pods` ✓

## Usage
- `clip <target> <subcommand> [...args]` — run a command
- `clip list` — show registered targets and ACL rules
- `clip <target> --help` — target help + ACL info

## Setup
- Config: `~/.clip/settings.yml`
- Full agent integration (hooks + instructions): `clip skills add <agent>`
