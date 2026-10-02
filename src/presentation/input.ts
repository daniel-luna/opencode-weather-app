import { createInterface, type Interface } from "node:readline/promises";
import { paint } from "../utils/colors.ts";
import { warning } from "./output.ts";

type Resolver = (line: string) => void;

let readline: Interface | null = null;
let queue: string[] = [];
let pending: Resolver | null = null;
let inputClosed = false;

function flush(): void {
  if (pending !== null && queue.length > 0) {
    const resolve = pending;
    const next = queue.shift() ?? "";
    pending = null;
    resolve(next);
  }
}

function closePending(): void {
  inputClosed = true;
  const resolve = pending;
  if (resolve !== null) {
    pending = null;
    resolve("");
  }
}

export function startInput(): void {
  if (readline !== null) {
    return;
  }
  readline = createInterface({ input: process.stdin, output: process.stdout });
  readline.on("line", (line: string) => {
    queue.push(line.trim());
    flush();
  });
  readline.on("close", () => {
    closePending();
  });
}

export function closeInput(): void {
  readline?.close();
  readline = null;
}

export function prompt(message: string): Promise<string> {
  process.stdout.write(paint(message, "cyan"));
  if (queue.length > 0) {
    return Promise.resolve(queue.shift() ?? "");
  }
  if (inputClosed) {
    return Promise.reject(new Error("se terminó la entrada por teclado"));
  }
  return new Promise<string>((resolve) => {
    pending = resolve;
  });
}

export async function promptRequired(message: string): Promise<string> {
  for (;;) {
    const answer = (await prompt(message)).trim();
    if (answer !== "") {
      return answer;
    }
    if (inputClosed) {
      throw new Error("se terminó la entrada por teclado");
    }
    warning("Escribí algo, o Ctrl+C para salir.");
  }
}

export async function confirm(message: string): Promise<boolean> {
  const answer = (await prompt(message)).toLowerCase();
  return answer === "s" || answer === "si" || answer === "sí" || answer === "y";
}
