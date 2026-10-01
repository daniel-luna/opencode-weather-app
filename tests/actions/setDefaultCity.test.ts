import { afterEach, beforeEach, describe, expect, test, mock } from "bun:test";
import { setDefaultCity } from "../../src/actions/setDefaultCity.ts";
import type { City } from "../../src/types/City.ts";
import type { AppState } from "../../src/types/Settings.ts";
import { captureOutput } from "../helpers/captureOutput.ts";
import { makeCity, makeState } from "../helpers/fixtures.ts";
import { useSandbox, type Sandbox } from "../helpers/sandbox.ts";
import { capturePrompts, scriptInput } from "../helpers/scriptedInput.ts";

const CITIES_FILE = "datos/ciudades.json";
const SETTINGS_FILE = "datos/config.json";

const OTTAWA = makeCity();
const GATINEAU = makeCity({ id: 2, name: "Gatineau", admin1: "Quebec" });

let sandbox: Sandbox;

function stateWith(cities: City[], defaultCityId: number | null = null): AppState {
  return makeState({ cities, settings: { defaultCityId, unit: "celsius" } });
}

beforeEach(() => {
  mock.restore();
  sandbox = useSandbox();
});

afterEach(() => {
  mock.restore();
  sandbox.restore();
});

describe("actions/setDefaultCity", () => {
  test("avisa si no hay ciudades guardadas", async () => {
    const out = captureOutput();
    const before = makeState();

    const state = await setDefaultCity(before);

    expect(state).toBe(before);
    expect(sandbox.exists(SETTINGS_FILE)).toBe(false);
    expect(out.has("! No tenés ciudades guardadas. Agregá una con la opción 3.")).toBe(true);
  });

  test("guarda la ciudad elegida y solo toca config.json", async () => {
    const out = captureOutput();
    capturePrompts();
    scriptInput(["2"]);
    const original = `${JSON.stringify([OTTAWA, GATINEAU], null, 2)}\n`;
    await sandbox.write(CITIES_FILE, original);

    const state = await setDefaultCity(stateWith([OTTAWA, GATINEAU]));

    expect(state.settings.defaultCityId).toBe(GATINEAU.id);
    expect(state.cities).toEqual([OTTAWA, GATINEAU]);
    expect(sandbox.readJson(SETTINGS_FILE)).toEqual({ defaultCityId: GATINEAU.id, unit: "celsius" });
    expect(sandbox.read(CITIES_FILE)).toBe(original);
    expect(out.has("✓ Ciudad default: Gatineau — Quebec, Canadá")).toBe(true);
  });

  test("reemplaza la ciudad default anterior", async () => {
    captureOutput();
    capturePrompts();
    scriptInput(["1"]);

    const state = await setDefaultCity(stateWith([OTTAWA, GATINEAU], GATINEAU.id));

    expect(state.settings.defaultCityId).toBe(OTTAWA.id);
    expect(sandbox.readJson(SETTINGS_FILE)).toEqual({ defaultCityId: OTTAWA.id, unit: "celsius" });
  });

  test("conserva la unidad configurada", async () => {
    captureOutput();
    capturePrompts();
    scriptInput(["1"]);
    const state = makeState({
      cities: [OTTAWA],
      settings: { defaultCityId: null, unit: "fahrenheit" },
    });

    const next = await setDefaultCity(state);

    expect(next.settings.unit).toBe("fahrenheit");
    expect(sandbox.readJson(SETTINGS_FILE)).toEqual({ defaultCityId: OTTAWA.id, unit: "fahrenheit" });
  });

  test("no escribe nada si se cancela", async () => {
    captureOutput();
    capturePrompts();
    scriptInput(["0"]);

    const before = stateWith([OTTAWA, GATINEAU]);
    const state = await setDefaultCity(before);

    expect(state).toBe(before);
    expect(sandbox.exists(SETTINGS_FILE)).toBe(false);
  });

  test("no escribe nada si la elección es inválida", async () => {
    const out = captureOutput();
    capturePrompts();
    scriptInput(["7"]);

    const before = stateWith([OTTAWA, GATINEAU]);
    const state = await setDefaultCity(before);

    expect(state).toBe(before);
    expect(sandbox.exists(SETTINGS_FILE)).toBe(false);
    expect(out.has("✗ Opción inválida.")).toBe(true);
  });
});
