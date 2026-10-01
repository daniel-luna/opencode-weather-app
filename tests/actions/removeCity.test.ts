import { afterEach, beforeEach, describe, expect, test, mock } from "bun:test";
import { removeCity } from "../../src/actions/removeCity.ts";
import type { City } from "../../src/types/City.ts";
import type { AppState } from "../../src/types/Settings.ts";
import { captureOutput } from "../helpers/captureOutput.ts";
import { makeCity, makeState } from "../helpers/fixtures.ts";
import { useSandbox, type Sandbox } from "../helpers/sandbox.ts";
import { capturePrompts, scriptInput, type ScriptedInput } from "../helpers/scriptedInput.ts";

const CITIES_FILE = "datos/ciudades.json";
const SETTINGS_FILE = "datos/config.json";

const OTTAWA = makeCity();
const GATINEAU = makeCity({ id: 2, name: "Gatineau", admin1: "Quebec" });
const ROSARIO = makeCity({ id: 3, name: "Rosario", admin1: "Santa Fe", country: "Argentina" });

let sandbox: Sandbox;
let scripted: ScriptedInput | null = null;

function seed(cities: City[]): string {
  const raw = `${JSON.stringify(cities, null, 2)}\n`;
  return raw;
}

function stateWith(cities: City[], defaultCityId: number | null = null): AppState {
  return makeState({ cities, settings: { defaultCityId, unit: "celsius" } });
}

function readCities(): City[] {
  return sandbox.readJson(CITIES_FILE) as City[];
}

function answer(answers: string[]): ScriptedInput {
  captureOutput();
  capturePrompts();
  scripted = scriptInput(answers);
  return scripted;
}

beforeEach(() => {
  mock.restore();
  sandbox = useSandbox();
});

afterEach(() => {
  mock.restore();
  scripted = null;
  sandbox.restore();
});

describe("actions/removeCity", () => {
  test("no hace nada si no hay ciudades", async () => {
    const out = captureOutput();
    const before = makeState();

    const state = await removeCity(before);

    expect(state).toBe(before);
    expect(scripted).toBeNull();
    expect(sandbox.exists(CITIES_FILE)).toBe(false);
    expect(out.has("! No hay ciudades para eliminar. Agregá una con la opción 3.")).toBe(true);
  });

  test("no permite dejar la lista vacía", async () => {
    const out = captureOutput();
    const original = seed([OTTAWA]);
    await sandbox.write(CITIES_FILE, original);

    const state = await removeCity(stateWith([OTTAWA]));

    expect(state.cities).toEqual([OTTAWA]);
    expect(sandbox.read(CITIES_FILE)).toBe(original);
    expect(out.has("! Debe quedar al menos una ciudad guardada.")).toBe(true);
  });

  test("elimina la ciudad elegida y guarda el resto", async () => {
    const out = captureOutput();
    capturePrompts();
    scripted = scriptInput(["2"]);
    await sandbox.write(CITIES_FILE, seed([OTTAWA, GATINEAU, ROSARIO]));

    const state = await removeCity(stateWith([OTTAWA, GATINEAU, ROSARIO], OTTAWA.id));

    expect(state.cities).toEqual([OTTAWA, ROSARIO]);
    expect(readCities()).toEqual([OTTAWA, ROSARIO]);
    expect(sandbox.exists(SETTINGS_FILE)).toBe(false);
    expect(out.has("✓ Ciudad eliminada: Gatineau. Quedan 2.")).toBe(true);
  });

  test("limpia la ciudad default si era la eliminada", async () => {
    const out = captureOutput();
    capturePrompts();
    scripted = scriptInput(["1"]);
    await sandbox.write(CITIES_FILE, seed([OTTAWA, GATINEAU]));

    const state = await removeCity(stateWith([OTTAWA, GATINEAU], OTTAWA.id));

    expect(state.cities).toEqual([GATINEAU]);
    expect(state.settings.defaultCityId).toBeNull();
    expect(sandbox.readJson(SETTINGS_FILE)).toEqual({ defaultCityId: null, unit: "celsius" });
    expect(out.has("! Ottawa era la ciudad default. Usá la opción 5 para elegir otra.")).toBe(true);
  });

  test("deja los archivos intactos si se cancela", async () => {
    captureOutput();
    capturePrompts();
    scripted = scriptInput(["0"]);
    const original = seed([OTTAWA, GATINEAU]);
    await sandbox.write(CITIES_FILE, original);

    const before = stateWith([OTTAWA, GATINEAU], OTTAWA.id);
    const state = await removeCity(before);

    expect(state).toBe(before);
    expect(sandbox.read(CITIES_FILE)).toBe(original);
    expect(sandbox.exists(SETTINGS_FILE)).toBe(false);
  });

  test("deja los archivos intactos si la elección es inválida", async () => {
    const out = captureOutput();
    capturePrompts();
    scripted = scriptInput(["9"]);
    const original = seed([OTTAWA, GATINEAU]);
    await sandbox.write(CITIES_FILE, original);

    const state = await removeCity(stateWith([OTTAWA, GATINEAU], OTTAWA.id));

    expect(state.cities).toEqual([OTTAWA, GATINEAU]);
    expect(sandbox.read(CITIES_FILE)).toBe(original);
    expect(out.has("✗ Opción inválida.")).toBe(true);
  });
});
