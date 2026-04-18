#!/usr/bin/env bun
import { checkAcl } from "./acl.ts";
import { executeCli } from "./cli-backend.ts";
import { type Backend, CONFIG_DIR, addBackend, getBackend, loadConfig, removeBackend } from "./config.ts";
import { die } from "./errors.ts";
import { executeMcp } from "./mcp-backend.ts";
import { formatOutput } from "./output.ts";

const VERSION = "0.1.0";

const HELP = `
clip — CLI proxy for MCP servers and CLI tools

Usage:
  clip [--json] <backend> <subcommand> [...args]
  clip add <name> <command-or-url> [--allow x,y] [--deny z]
  clip remove <name>
  clip list
  clip <backend> tools
  clip <backend> --help

Global flags:
  --json        Output as JSON (unwraps MCP content, wraps CLI stdout)
  --help, -h    Show this help
  --version, -v Show version

Config:
  ${CONFIG_DIR}/settings.{yml,json}

Examples:
  clip add gh gh --deny delete,apply
  clip add superset https://superset-mcp.kr/mcp --allow execute_sql
  clip list
  clip superset execute_sql --sql "SELECT 1"
  clip --json gh pr list
  clip gh get pods -n default
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

// --- list / add / remove ---

async function runList(): Promise<void> {
  const config = await loadConfig();
  const backends = Object.entries(config.backends);
  if (backends.length === 0) {
    console.log("No backends configured.");
    console.log(`\nAdd one:\n  clip add <name> <command>          # CLI tool`);
    console.log(`  clip add <name> <https://...>      # MCP server`);
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
}

async function runAdd(args: string[]): Promise<void> {
  const name = args[0];
  if (!name || name.startsWith("--")) {
    die("Usage: clip add <name> <command-or-url> [--allow x,y] [--deny z]");
  }

  // 두 번째 positional (플래그가 아닌 것) 수집
  const positionals: string[] = [];
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
    } else {
      positionals.push(a);
    }
  }

  const allow = flags["allow"] ? flags["allow"].split(",").map((s) => s.trim()) : undefined;
  const deny = flags["deny"] ? flags["deny"].split(",").map((s) => s.trim()) : undefined;

  // 타입 결정: --type 명시 > --url/--command 명시 > positional 자동 감지
  let type = flags["type"] as "mcp" | "cli" | undefined;
  if (!type && flags["url"]) type = "mcp";
  if (!type && flags["command"]) type = "cli";
  if (!type && positionals[0]) {
    type = positionals[0].startsWith("http://") || positionals[0].startsWith("https://") ? "mcp" : "cli";
  }
  if (!type) die("Cannot detect type. Provide <command-or-url> or --type mcp|cli");

  if (type === "mcp") {
    const url = flags["url"] ?? positionals[0];
    if (!url) die("MCP backend requires a URL (e.g. clip add myserver https://...mcp)");
    await addBackend(name, { type: "mcp", url, allow, deny });
    console.log(`Added MCP backend "${name}" → ${url}`);
  } else {
    const command = flags["command"] ?? positionals[0];
    if (!command) die("CLI backend requires a command (e.g. clip add gh gh)");
    const prependArgs = flags["args"] ? flags["args"].split(",").map((s) => s.trim()) : undefined;
    await addBackend(name, { type: "cli", command, args: prependArgs, allow, deny });
    console.log(`Added CLI backend "${name}" → ${command}`);
  }
}

async function runRemove(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) die("Usage: clip remove <name>");
  await removeBackend(name);
  console.log(`Removed backend "${name}".`);
}

// --- config 서브커맨드 (하위 호환) ---

async function runConfigCmd(args: string[]): Promise<void> {
  const sub = args[0];
  if (!sub || sub === "list") return runList();
  if (sub === "add") return runAdd(args.slice(1));
  if (sub === "remove") return runRemove(args.slice(1));
  die(`Unknown config subcommand: "${sub}"\nUsage: clip config list|add|remove`);
}

// --- backend help ---

async function printBackendHelp(name: string, backend: Backend): Promise<void> {
  const detail = backend.type === "mcp" ? `MCP server: ${backend.url}` : `CLI command: ${backend.command}`;
  console.log(`clip ${name} — ${detail}`);
  console.log(`\nUsage: clip ${name} <subcommand> [...args]`);

  if (backend.allow && backend.allow.length > 0) {
    console.log(`\nAllowed: ${backend.allow.join(", ")}`);
  }
  if (backend.deny && backend.deny.length > 0) {
    console.log(`Denied:  ${backend.deny.join(", ")}`);
  }
  if (!backend.allow?.length && !backend.deny?.length) {
    console.log(`\nNo ACL restrictions.`);
  }

  if (backend.type === "mcp") {
    console.log(`\nRun: clip ${name} tools  — to list available tools`);
  }

  // 원래 명령의 --help 출력도 표시
  if (backend.type === "cli") {
    const proc = Bun.spawn([backend.command, ...(backend.args ?? []), "--help"], {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...(backend.env ?? {}) } as Record<string, string>,
    });
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout as ReadableStream<Uint8Array>).text(),
      new Response(proc.stderr as ReadableStream<Uint8Array>).text(),
    ]);
    const helpText = (stdout || stderr).trim();
    if (helpText) {
      console.log(`\n--- ${backend.command} --help ---\n`);
      console.log(helpText);
    }
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

  // 내장 명령
  if (backendName === "config") { await runConfigCmd(rest.slice(1)); return; }
  if (backendName === "list") { await runList(); return; }
  if (backendName === "add") { await runAdd(rest.slice(1)); return; }
  if (backendName === "remove") { await runRemove(rest.slice(1)); return; }

  const config = await loadConfig();
  const backend = getBackend(config, backendName);

  const subcommand = rest[1];
  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    await printBackendHelp(backendName, backend);
    process.exit(0);
  }

  const backendArgs = rest.slice(2);

  // ACL 체크 제외: 내장 명령(tools) + --help in args
  const hasHelpFlag = backendArgs.includes("--help") || backendArgs.includes("-h");
  if (subcommand !== "tools" && !hasHelpFlag) {
    checkAcl(backend, subcommand, backendName);
  }

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
