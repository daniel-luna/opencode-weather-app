import { spyOn } from "bun:test";

export type CapturedOutput = {
  lines: () => string[];
  text: () => string;
  has: (needle: string) => boolean;
  count: (needle: string) => number;
};

export function captureOutput(): CapturedOutput {
  const written: string[] = [];
  spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    written.push(args.map((arg) => (typeof arg === "string" ? arg : Bun.inspect(arg))).join(" "));
  });

  const text = (): string => Bun.stripANSI(written.join("\n"));

  return {
    lines: () => written.slice(),
    text,
    has: (needle) => text().includes(needle),
    count: (needle) => text().split(needle).length - 1,
  };
}
