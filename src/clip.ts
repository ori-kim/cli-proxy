#!/usr/bin/env bun
import { checkAcl } from "./acl.ts";
import { executeCli } from "./cli-backend.ts";
import { CONFIG_DIR, addBackend, getBackend, loadConfig, removeBackend } from "./config.ts";
import { die } from "./errors.ts";
import { executeMcp } from "./mcp-backend.ts";
import { formatOutput } from "./output.ts";

const VERSION = "0.1.0";

const HELP = `
clip — CLI proxy for MCP servers and CLI tools

Usage:
  clip [--json] <backend> <subcommand> [...args]
  clip config list|add|remove
  clip <backend> tools
  clip <backend> <tool> --help

Global flags:
  --json        Output as JSON (unwraps MCP content, wraps CLI stdout)
  --help, -h    Show this help
  --version, -v Show version

Config:
  ${CONFIG_DIR}/settings.{yml,json}

Examples:
  clip superset execute_sql --sql "SELECT 1"
  clip --json gh pr list
  clip kubectl get pods -n default
  clip config add superset --type mcp --url https://superset-mcp.kr/mcp
  clip config add kubectl --type cli --command kubectl --deny delete,apply
  clip config list
`.trim();

// --- argv 수동 파싱 ---
// clip [글로벌 플래그...] <backend> <subcommand> [...backend-args]
// 글로벌 플래그는 앞에서만 소비하고, backend 이름 이후는 전부 passthrough

function parseGlobalFlags(argv: string[]): {
  jsonMode: boolean;
  configPath: string | undefined;
  rest: string[];
} {
  let jsonMode = false;
  let configPath: string | undefined;
  let i = 0;

  while (i < argv.length) {
    const a = argv[i] ?? "";
    if (a === "--json") {
      jsonMode = true;
      i++;
    } else if (a === "--help" || a === "-h") {
      console.log(HELP);
      process.exit(0);
    } else if (a === "--version" || a === "-v") {
      console.log(`clip ${VERSION}`);
      process.exit(0);
    } else if ((a === "--config" || a === "-c") && argv[i + 1]) {
      configPath = argv[++i];
      i++;
    } else {
      break; // 첫 비플래그 인자 = backend 이름
    }
  }

  return { jsonMode, configPath, rest: argv.slice(i) };
}

// --- config 서브커맨드 ---

async function runConfigCmd(args: string[]): Promise<void> {
  const sub = args[0];

  if (!sub || sub === "list") {
    const config = await loadConfig();
    const backends = Object.entries(config.backends);
    if (backends.length === 0) {
      console.log("No backends configured.");
      console.log(`\nAdd one:\n  clip config add <name> --type mcp --url <url>`);
      console.log(`  clip config add <name> --type cli --command <cmd>`);
      return;
    }
    console.log("Backends:");
    for (const [name, b] of backends.sort()) {
      const detail = b.type === "mcp" ? b.url : b.command;
      const acl = [
        b.allow && b.allow.length > 0 ? `allow: ${b.allow.join(",")}` : "",
        b.deny && b.deny.length > 0 ? `deny: ${b.deny.join(",")}` : "",
      ]
        .filter(Boolean)
        .join("  ");
      console.log(`  ${name.padEnd(16)} [${b.type}] ${detail}${acl ? `  (${acl})` : ""}`);
    }
    return;
  }

  if (sub === "add") {
    parseAndAddBackend(args.slice(1));
    return;
  }

  if (sub === "remove") {
    const name = args[1];
    if (!name) die('Usage: clip config remove <name>');
    await removeBackend(name);
    console.log(`Removed backend "${name}".`);
    return;
  }

  die(`Unknown config subcommand: "${sub}"\nUsage: clip config list|add|remove`);
}

async function parseAndAddBackend(args: string[]): Promise<void> {
  const name = args[0];
  if (!name || name.startsWith("--")) die("Usage: clip config add <name> --type mcp|cli --url <url> | --command <cmd>");

  const flags: Record<string, string> = {};
  for (let i = 1; i < args.length; i++) {
    const a = args[i] ?? "";
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = args[i + 1] ?? "";
      if (val && !val.startsWith("--")) {
        flags[key] = val;
        i++;
      } else {
        flags[key] = "true";
      }
    }
  }

  const type = flags["type"];
  if (type !== "mcp" && type !== "cli") die("--type must be 'mcp' or 'cli'");

  const allow = flags["allow"] ? flags["allow"].split(",").map((s) => s.trim()) : undefined;
  const deny = flags["deny"] ? flags["deny"].split(",").map((s) => s.trim()) : undefined;

  if (type === "mcp") {
    const url = flags["url"];
    if (!url) die("MCP backend requires --url");
    await addBackend(name, { type: "mcp", url, allow, deny });
    console.log(`Added MCP backend "${name}" → ${url}`);
  } else {
    const command = flags["command"];
    if (!command) die("CLI backend requires --command");
    const prependArgs = flags["args"] ? flags["args"].split(",").map((s) => s.trim()) : undefined;
    await addBackend(name, { type: "cli", command, args: prependArgs, allow, deny });
    console.log(`Added CLI backend "${name}" → ${command}`);
  }
}

// --- 메인 ---

async function main(): Promise<void> {
  const argv = Bun.argv.slice(2);
  const { jsonMode, rest } = parseGlobalFlags(argv);

  if (rest.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const backendName = rest[0]!;

  // config 서브커맨드
  if (backendName === "config") {
    await runConfigCmd(rest.slice(1));
    return;
  }

  const subcommand = rest[1];
  if (!subcommand) {
    die(`Usage: clip ${backendName} <subcommand> [...args]\nRun: clip ${backendName} tools`);
  }

  const config = await loadConfig();
  const backend = getBackend(config, backendName);

  // "tools" 는 ACL 체크 제외 (내장 명령)
  if (subcommand !== "tools") {
    checkAcl(backend, subcommand, backendName);
  }

  const backendArgs = rest.slice(2);

  if (backend.type === "mcp") {
    const result = await executeMcp(backend, config.headers, subcommand, backendArgs);
    formatOutput(result, jsonMode ? "json" : "plain", "mcp");
  } else {
    const result = await executeCli(backend, subcommand, backendArgs);
    formatOutput(result, jsonMode ? "json" : "plain", "cli");
  }
}

main().catch((e: unknown) => {
  die(String(e));
});
