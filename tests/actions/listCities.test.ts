import { afterEach, describe, expect, test, mock } from "bun:test";
import { printCityList, pickFromList } from "../../src/actions/listCities.ts";
import { makeCity, makeState } from "../helpers/fixtures.ts";
import { captureOutput } from "../helpers/captureOutput.ts";
import { capturePrompts, scriptInput } from "../helpers/scriptedInput.ts";

const OTTAWA = makeCity();
const GATINEAU = makeCity({ id: 2, name: "Gatineau", admin1: "Quebec" });

afterEach(() => {
  mock.restore();
});

describe("actions/printCityList", () => {
  test("numera las ciudades e imprime su ubicación", () => {
    const out = captureOutput();
    printCityList([OTTAWA, GATINEAU], makeState());

    expect(out.lines()).toEqual([
      "  1. Ottawa — Ontario, Canadá",
      "  2. Gatineau — Quebec, Canadá",
    ]);
  });

  test("marca solo la ciudad default", () => {
    const out = captureOutput();
    printCityList([OTTAWA, GATINEAU], makeState({ settings: { defaultCityId: 2, unit: "celsius" } }));

    expect(out.lines()[0]).toBe("  1. Ottawa — Ontario, Canadá");
    expect(out.lines()[1]).toBe("  2. Gatineau — Quebec, Canadá  (default)");
  });

  test("no imprime nada si no hay ciudades", () => {
    const out = captureOutput();
    printCityList([], makeState());
    expect(out.lines()).toEqual([]);
  });
});

describe("actions/pickFromList", () => {
  test("devuelve la ciudad elegida por número", async () => {
    const out = captureOutput();
    capturePrompts();
    const scripted = scriptInput(["2"]);

    const chosen = await pickFromList([OTTAWA, GATINEAU], makeState(), "Elegí una:");

    expect(chosen).toEqual(GATINEAU);
    expect(scripted.remaining()).toBe(0);
    expect(out.has("Elegí una:")).toBe(true);
    expect(out.has("1. Ottawa")).toBe(true);
  });

  test("devuelve null si se cancela con 0", async () => {
    const out = captureOutput();
    capturePrompts();
    scriptInput(["0"]);

    expect(await pickFromList([OTTAWA], makeState(), "Elegí una:")).toBeNull();
    expect(out.has("Opción inválida")).toBe(false);
  });

  test("devuelve null si se responde vacío", async () => {
    captureOutput();
    capturePrompts();
    scriptInput([""]);

    expect(await pickFromList([OTTAWA], makeState(), "Elegí una:")).toBeNull();
  });

  test("devuelve null y avisa si el número no existe", async () => {
    const out = captureOutput();
    capturePrompts();
    scriptInput(["5"]);

    expect(await pickFromList([OTTAWA, GATINEAU], makeState(), "Elegí una:")).toBeNull();
    expect(out.has("✗ Opción inválida.")).toBe(true);
  });

  test("devuelve null si la respuesta no es un entero", async () => {
    captureOutput();
    capturePrompts();
    scriptInput(["dos"]);

    expect(await pickFromList([OTTAWA], makeState(), "Elegí una:")).toBeNull();
  });

  test("devuelve null con 0 o negativo", async () => {
    const out = captureOutput();
    capturePrompts();
    scriptInput(["-1"]);

    expect(await pickFromList([OTTAWA], makeState(), "Elegí una:")).toBeNull();
    expect(out.has("✗ Opción inválida.")).toBe(true);
  });
});
