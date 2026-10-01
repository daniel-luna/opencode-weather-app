import { afterEach, describe, expect, test, mock } from "bun:test";
import {
  blank,
  info,
  printError,
  printFooter,
  printOption,
  printTitle,
  success,
  warning,
} from "../../src/presentation/output.ts";
import { MENU_WIDTH } from "../../src/utils/constants.ts";
import { captureOutput } from "../helpers/captureOutput.ts";

afterEach(() => {
  mock.restore();
});

describe("presentation/output", () => {
  test("blank imprime una línea vacía", () => {
    const out = captureOutput();
    blank();
    expect(out.lines()).toEqual([""]);
  });

  test("printTitle dibuja el título entre dos reglas del ancho del menú", () => {
    const out = captureOutput();
    printTitle();

    const lines = out.lines();
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("═".repeat(MENU_WIDTH));
    expect(lines[1]).toContain("WEATHER CLI");
    expect(lines[2]).toBe("═".repeat(MENU_WIDTH));
  });

  test("printFooter dibuja una sola regla", () => {
    const out = captureOutput();
    printFooter();
    expect(out.lines()).toEqual(["═".repeat(MENU_WIDTH)]);
  });

  test("info indenta con dos espacios", () => {
    const out = captureOutput();
    info("mensaje");
    expect(out.lines()).toEqual(["  mensaje"]);
  });

  test("success, printError y warning usan los marcadores del README", () => {
    const out = captureOutput();
    success("todo bien");
    printError("algo falló");
    warning("ojo");

    expect(out.lines()).toEqual(["  ✓ todo bien", "  ✗ algo falló", "  ! ojo"]);
  });

  test("printOption imprime solo la etiqueta si no hay valor", () => {
    const out = captureOutput();
    printOption("3. Buscar y agregar ciudad");
    expect(out.lines()).toEqual(["  3. Buscar y agregar ciudad"]);
  });

  test("printOption separa la etiqueta del badge", () => {
    const out = captureOutput();
    printOption("2. Clima de todas las ciudades", "(3)");
    expect(out.lines()).toEqual(["  2. Clima de todas las ciudades (3)"]);
  });
});
