import { describe, expect, test } from "bun:test";

const ENV_KEYS = ["NO_COLOR", "TERM", "FORCE_COLOR"] as const;
type EnvKey = (typeof ENV_KEYS)[number];

type ColorsModule = typeof import("../../src/utils/colors.ts");

let loads = 0;

async function loadColors(env: Partial<Record<EnvKey, string>>, isTTY: boolean): Promise<ColorsModule> {
  const saved = ENV_KEYS.map((key) => [key, process.env[key]] as const);
  const savedIsTTY = process.stdout.isTTY;
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(env) as [EnvKey, string][]) {
    process.env[key] = value;
  }
  process.stdout.isTTY = isTTY;
  loads += 1;
  try {
    return await import(`../../src/utils/colors.ts?load=${loads}`);
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    process.stdout.isTTY = savedIsTTY;
  }
}

const RESET = "\u001b[0m";

describe("utils/colors", () => {
  test("pinta cuando stdout es TTY", async () => {
    const { paint, colorsEnabled } = await loadColors({}, true);
    expect(colorsEnabled()).toBe(true);
    expect(paint("hola", "red")).toBe(`\u001b[31mhola${RESET}`);
  });

  test("no pinta cuando stdout no es TTY", async () => {
    const { paint, colorsEnabled } = await loadColors({}, false);
    expect(colorsEnabled()).toBe(false);
    expect(paint("hola", "red")).toBe("hola");
  });

  test("TERM=dumb desactiva los colores aun con TTY", async () => {
    const { paint, colorsEnabled } = await loadColors({ TERM: "dumb" }, true);
    expect(colorsEnabled()).toBe(false);
    expect(paint("hola", "cyan")).toBe("hola");
  });

  test("NO_COLOR desactiva los colores aun con TTY", async () => {
    const { colorsEnabled } = await loadColors({ NO_COLOR: "1" }, true);
    expect(colorsEnabled()).toBe(false);
  });

  test("FORCE_COLOR fuerza los colores sin TTY", async () => {
    const { paint, colorsEnabled } = await loadColors({ FORCE_COLOR: "1" }, false);
    expect(colorsEnabled()).toBe(true);
    expect(paint("hola", "cyan")).toBe(`\u001b[36mhola${RESET}`);
  });

  test("FORCE_COLOR con valor de cualquier tipo no vacío fuerza los colores", async () => {
    const { colorsEnabled } = await loadColors({ FORCE_COLOR: "sí" }, false);
    expect(colorsEnabled()).toBe(true);
  });

  test("NO_COLOR gana sobre FORCE_COLOR", async () => {
    const { colorsEnabled } = await loadColors({ NO_COLOR: "1", FORCE_COLOR: "1" }, true);
    expect(colorsEnabled()).toBe(false);
  });

  test("TERM=dumb gana sobre FORCE_COLOR", async () => {
    const { colorsEnabled } = await loadColors({ FORCE_COLOR: "1", TERM: "dumb" }, true);
    expect(colorsEnabled()).toBe(false);
  });

  test("FORCE_COLOR=0 desactiva los colores aun con TTY y FORCE_COLOR forzado", async () => {
    const { colorsEnabled } = await loadColors({ FORCE_COLOR: "0" }, true);
    expect(colorsEnabled()).toBe(false);
  });

  test("varios estilos se anidan en un solo reset", async () => {
    const { paint } = await loadColors({}, true);
    expect(paint("x", "cyan", "bold")).toBe(`\u001b[36m\u001b[1mx${RESET}`);
  });

  test("sin estilos devuelve el texto tal cual", async () => {
    const enabled = await loadColors({}, true);
    expect(enabled.paint("x")).toBe("x");
    const disabled = await loadColors({}, false);
    expect(disabled.paint("x", "bold")).toBe("x");
  });

  test("la paleta de la app es la documentada", async () => {
    const { paint } = await loadColors({}, true);
    expect(paint("a", "cyan")).toBe(`\u001b[36ma${RESET}`);
    expect(paint("a", "yellow")).toBe(`\u001b[33ma${RESET}`);
    expect(paint("a", "green")).toBe(`\u001b[32ma${RESET}`);
    expect(paint("a", "red")).toBe(`\u001b[31ma${RESET}`);
    expect(paint("a", "bold")).toBe(`\u001b[1ma${RESET}`);
    expect(paint("a", "dim")).toBe(`\u001b[2ma${RESET}`);
  });
});
