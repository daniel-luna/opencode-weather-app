import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type Sandbox = {
  dir: string;
  path: (name: string) => string;
  exists: (name: string) => boolean;
  read: (name: string) => string;
  readJson: (name: string) => unknown;
  write: (name: string, contents: string) => Promise<void>;
  restore: () => void;
};

export function useSandbox(): Sandbox {
  const dir = mkdtempSync(join(tmpdir(), "weather-cli-test-"));
  const previousCwd = process.cwd();
  process.chdir(dir);

  const path = (name: string): string => join(dir, name);

  return {
    dir,
    path,
    exists: (name) => existsSync(path(name)),
    read: (name) => readFileSync(path(name), "utf8"),
    readJson: (name) => JSON.parse(readFileSync(path(name), "utf8")) as unknown,
    write: async (name, contents) => {
      await Bun.write(path(name), contents);
    },
    restore: () => {
      process.chdir(previousCwd);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
