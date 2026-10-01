import { spyOn } from "bun:test";
import * as input from "../../src/presentation/input.ts";

export type ScriptedInput = {
  remaining: () => number;
};

export function scriptInput(answers: string[]): ScriptedInput {
  const queue = [...answers];
  spyOn(input, "prompt").mockImplementation(async (): Promise<string> => {
    const next = queue.shift();
    if (next === undefined) {
      throw new Error("entrada guionizada agotada: el test no contempló ese prompt");
    }
    return next;
  });

  return {
    remaining: () => queue.length,
  };
}

export function capturePrompts(): () => string {
  const chunks: string[] = [];
  spyOn(process.stdout, "write").mockImplementation((chunk: unknown): boolean => {
    chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk as Uint8Array));
    return true;
  });
  return () => Bun.stripANSI(chunks.join(""));
}
