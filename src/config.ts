import { homedir } from "os";
import { join } from "path";
import YAML from "yaml";
import { z } from "zod";
import { die } from "./errors.ts";

// --- Schemas ---

const mcpBackendSchema = z.object({
  type: z.literal("mcp"),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  allow: z.array(z.string()).optional(),
  deny: z.array(z.string()).optional(),
});

const cliBackendSchema = z.object({
  type: z.literal("cli"),
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  allow: z.array(z.string()).optional(),
  deny: z.array(z.string()).optional(),
});

const backendSchema = z.discriminatedUnion("type", [mcpBackendSchema, cliBackendSchema]);

const configSchema = z.object({
  headers: z.record(z.string()).optional(),
  backends: z.record(backendSchema).default({}),
});

// --- Types ---

export type McpBackend = z.infer<typeof mcpBackendSchema>;
export type CliBackend = z.infer<typeof cliBackendSchema>;
export type Backend = z.infer<typeof backendSchema>;
export type Config = z.infer<typeof configSchema>;

// --- Paths ---

const CONFIG_DIR = join(homedir(), ".clip");
const CONFIG_YML = join(CONFIG_DIR, "settings.yml");
const CONFIG_JSON = join(CONFIG_DIR, "settings.json");

export { CONFIG_DIR };

/** 실제 사용 중인 설정 파일 경로를 반환. yml 우선, json fallback. */
async function resolveConfigPath(): Promise<{ path: string; format: "yml" | "json" } | null> {
  if (await Bun.file(CONFIG_YML).exists()) return { path: CONFIG_YML, format: "yml" };
  if (await Bun.file(CONFIG_JSON).exists()) return { path: CONFIG_JSON, format: "json" };
  return null;
}

/** 외부에서 현재 설정 파일 경로를 표시할 때 사용 */
export async function getConfigPath(): Promise<string> {
  const resolved = await resolveConfigPath();
  return resolved?.path ?? CONFIG_YML;
}

// --- Load / Save ---

export async function loadConfig(): Promise<Config> {
  const resolved = await resolveConfigPath();
  if (!resolved) return configSchema.parse({ backends: {} });

  const raw = await Bun.file(resolved.path).text();
  let parsed: unknown;
  try {
    parsed = resolved.format === "json" ? JSON.parse(raw) : YAML.parse(raw);
  } catch (e) {
    die(`Failed to parse config at ${resolved.path}: ${e}`);
  }

  const result = configSchema.safeParse(parsed ?? { backends: {} });
  if (!result.success) {
    die(`Invalid config at ${resolved.path}:\n${result.error.message}`);
  }
  return result.data;
}

/** 기존 파일 포맷 유지. 파일이 없으면 yml로 생성. */
async function saveConfig(config: Config): Promise<void> {
  await Bun.spawn(["mkdir", "-p", CONFIG_DIR]).exited;
  const resolved = await resolveConfigPath();
  const format = resolved?.format ?? "yml";
  const path = resolved?.path ?? CONFIG_YML;

  const content = format === "json" ? JSON.stringify(config, null, 2) : YAML.stringify(config);
  await Bun.write(path, content);
}

// --- Management helpers ---

export async function addBackend(name: string, backend: Backend): Promise<void> {
  const config = await loadConfig();
  config.backends[name] = backend;
  await saveConfig(config);
}

export async function removeBackend(name: string): Promise<void> {
  const config = await loadConfig();
  if (!config.backends[name]) {
    die(`Backend "${name}" not found.`);
  }
  delete config.backends[name];
  await saveConfig(config);
}

export function getBackend(config: Config, name: string): Backend {
  const backend = config.backends[name];
  if (!backend) {
    die(
      `Backend "${name}" not found.\nRun: clip config list  — to see registered backends.`,
    );
  }
  return backend;
}

export function mergeHeaders(
  global: Record<string, string> | undefined,
  local: Record<string, string> | undefined,
): Record<string, string> {
  return { ...(global ?? {}), ...(local ?? {}) };
}
