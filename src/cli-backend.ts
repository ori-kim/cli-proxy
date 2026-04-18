import type { CliBackend } from "./config.ts";
import { die } from "./errors.ts";
import type { BackendResult } from "./output.ts";

export async function executeCli(backend: CliBackend, subcommand: string, args: string[]): Promise<BackendResult> {
  const cmd = [backend.command, ...(backend.args ?? []), subcommand, ...args];

  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn(cmd, {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...(backend.env ?? {}) } as Record<string, string>,
    });
  } catch {
    die(`Command not found: ${backend.command}`, 127);
  }

  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout as ReadableStream<Uint8Array>).text();
  const stderr = await new Response(proc.stderr as ReadableStream<Uint8Array>).text();

  return { exitCode, stdout, stderr };
}
