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

export const CONFIG_PATH = join(homedir(), ".config", "clip", "config.yaml");

// --- Load / Save ---

export async function loadConfig(): Promise<Config> {
  const file = Bun.file(CONFIG_PATH);
  if (!(await file.exists())) {
    return configSchema.parse({ backends: {} });
  }

  const raw = await file.text();
  let parsed: unknown;
  try {
    parsed = YAML.parse(raw);
  } catch (e) {
    die(`Failed to parse config at ${CONFIG_PATH}: ${e}`);
  }

  const result = configSchema.safeParse(parsed ?? { backends: {} });
  if (!result.success) {
    die(`Invalid config at ${CONFIG_PATH}:\n${result.error.message}`);
  }
  return result.data;
}

async function saveConfig(config: Config): Promise<void> {
  const dir = CONFIG_PATH.replace(/\/[^/]+$/, "");
  await Bun.spawn(["mkdir", "-p", dir]).exited;
  await Bun.write(CONFIG_PATH, YAML.stringify(config));
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
