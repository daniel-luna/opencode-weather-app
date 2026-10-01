import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
export const CLI_ENTRY = join(ROOT, "src", "index.ts");
export const FETCH_PRELOAD = join(ROOT, "tests", "helpers", "fetchPreload.ts");

export type CliRun = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export async function runCli(input: string, cwd: string, env: Record<string, string> = {}): Promise<CliRun> {
  const proc = Bun.spawn({
    cmd: ["bun", "--preload", FETCH_PRELOAD, CLI_ENTRY],
    cwd,
    stdin: new TextEncoder().encode(input),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout: Bun.stripANSI(stdout), stderr: Bun.stripANSI(stderr), exitCode };
}
