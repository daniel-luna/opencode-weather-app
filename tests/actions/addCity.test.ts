import { afterEach, beforeEach, describe, expect, test, mock } from "bun:test";
import { addCity } from "../../src/actions/addCity.ts";
import type { City } from "../../src/types/City.ts";
import type { AppState } from "../../src/types/Settings.ts";
import { captureOutput } from "../helpers/captureOutput.ts";
import { jsonResponse, stubFetch, type FetchStub } from "../helpers/fetchStub.ts";
import { makeCity, makeState } from "../helpers/fixtures.ts";
import { useSandbox, type Sandbox } from "../helpers/sandbox.ts";
import { capturePrompts, scriptInput, type ScriptedInput } from "../helpers/scriptedInput.ts";

const OTTAWA_RESULT = {
  id: 3031657,
  name: "Ottawa",
  latitude: 45.41117,
  longitude: -75.69812,
  country: "Canadá",
  admin1: "Ontario",
  timezone: "America/Toronto",
};

const GATINEAU_RESULT = {
  id: 2660646,
  name: "Gatineau",
  latitude: 45.34145,
  longitude: -75.72561,
  country: "Canadá",
  admin1: "Quebec",
  timezone: "America/Toronto",
};

const OTTAWA: City = {
  id: OTTAWA_RESULT.id,
  name: OTTAWA_RESULT.name,
  admin1: OTTAWA_RESULT.admin1,
  country: OTTAWA_RESULT.country,
  lat: OTTAWA_RESULT.latitude,
  lon: OTTAWA_RESULT.longitude,
  timezone: OTTAWA_RESULT.timezone,
};

const GATINEAU: City = {
  id: GATINEAU_RESULT.id,
  name: GATINEAU_RESULT.name,
  admin1: GATINEAU_RESULT.admin1,
  country: GATINEAU_RESULT.country,
  lat: GATINEAU_RESULT.latitude,
  lon: GATINEAU_RESULT.longitude,
  timezone: GATINEAU_RESULT.timezone,
};

const CITIES_FILE = "datos/ciudades.json";
const SETTINGS_FILE = "datos/config.json";

let sandbox: Sandbox;
let fetchStub: FetchStub | null = null;
let scripted: ScriptedInput | null = null;

function stubGeocoding(body: unknown, status = 200): void {
  fetchStub = stubFetch(() => jsonResponse(body, status));
}

function readCities(): City[] {
  return sandbox.readJson(CITIES_FILE) as City[];
}

function readSettings(): { defaultCityId: number | null; unit: string } {
  return sandbox.readJson(SETTINGS_FILE) as { defaultCityId: number | null; unit: string };
}

beforeEach(() => {
  mock.restore();
  sandbox = useSandbox();
});

afterEach(() => {
  mock.restore();
  fetchStub?.restore();
  fetchStub = null;
  scripted = null;
  sandbox.restore();
});

describe("actions/addCity", () => {
  test("agrega la única coincidencia y ofrece dejarla como default", async () => {
    stubGeocoding({ results: [OTTAWA_RESULT] });
    const out = captureOutput();
    capturePrompts();
    scripted = scriptInput(["Ottawa", "s"]);

    const state: AppState = await addCity(makeState());

    expect(state.cities).toEqual([OTTAWA]);
    expect(state.settings.defaultCityId).toBe(OTTAWA.id);
    expect(readCities()).toEqual([OTTAWA]);
    expect(readSettings()).toEqual({ defaultCityId: OTTAWA.id, unit: "celsius" });
    expect(out.has("✓ Ciudad agregada: Ottawa — Ontario, Canadá")).toBe(true);
    expect(out.has("es ahora la ciudad default")).toBe(true);
    expect(fetchStub?.param("name")).toBe("Ottawa");
  });

  test("deja la unidad configurada si el usuario no quiere la ciudad default", async () => {
    stubGeocoding({ results: [OTTAWA_RESULT] });
    captureOutput();
    capturePrompts();
    scripted = scriptInput(["Ottawa", "n"]);

    const state = await addCity(makeState());

    expect(state.settings.defaultCityId).toBeNull();
    expect(sandbox.exists(SETTINGS_FILE)).toBe(false);
    expect(readCities()).toEqual([OTTAWA]);
  });

  test("no pregunta por el default si ya hay uno configurado", async () => {
    stubGeocoding({ results: [OTTAWA_RESULT] });
    const previous = makeCity({ id: 5, name: "Rosario", admin1: "Santa Fe", country: "Argentina" });
    await sandbox.write(CITIES_FILE, `${JSON.stringify([previous], null, 2)}\n`);
    const out = captureOutput();
    capturePrompts();
    scripted = scriptInput(["Ottawa"]);

    const state = await addCity(
      makeState({ cities: [previous], settings: { defaultCityId: previous.id, unit: "celsius" } }),
    );

    expect(state.settings.defaultCityId).toBe(previous.id);
    expect(state.cities).toEqual([previous, OTTAWA]);
    expect(scripted.remaining()).toBe(0);
    expect(sandbox.exists(SETTINGS_FILE)).toBe(false);
    expect(out.has("Establecerla como ciudad default")).toBe(false);
  });

  test("permite elegir entre varios resultados", async () => {
    stubGeocoding({ results: [OTTAWA_RESULT, GATINEAU_RESULT] });
    const out = captureOutput();
    capturePrompts();
    scripted = scriptInput(["Ottawa", "2", "n"]);

    const state = await addCity(makeState());

    expect(state.cities).toEqual([GATINEAU]);
    expect(readCities()).toEqual([GATINEAU]);
    expect(out.has("Encontré varias, elegí una:")).toBe(true);
  });

  test("no escribe nada si se cancela la lista", async () => {
    stubGeocoding({ results: [OTTAWA_RESULT, GATINEAU_RESULT] });
    const out = captureOutput();
    capturePrompts();
    scripted = scriptInput(["Ottawa", "0"]);
    const before = makeState();

    const state = await addCity(before);

    expect(state).toBe(before);
    expect(sandbox.exists(CITIES_FILE)).toBe(false);
    expect(out.has("Ciudad agregada")).toBe(false);
  });

  test("no escribe nada si la ciudad ya está en la lista", async () => {
    stubGeocoding({ results: [OTTAWA_RESULT] });
    const out = captureOutput();
    capturePrompts();
    scripted = scriptInput(["Ottawa"]);
    const original = `${JSON.stringify([OTTAWA], null, 2)}\n`;
    await sandbox.write(CITIES_FILE, original);

    const before = makeState({ cities: [OTTAWA] });
    const state = await addCity(before);

    expect(state).toBe(before);
    expect(sandbox.read(CITIES_FILE)).toBe(original);
    expect(out.has("! Ottawa ya está en tu lista.")).toBe(true);
  });

  test("no escribe nada si no hay coincidencias", async () => {
    stubGeocoding({ generationtime_ms: 0.3 });
    const out = captureOutput();
    capturePrompts();
    scripted = scriptInput(["zzzz"]);

    const before = makeState();
    const state = await addCity(before);

    expect(state).toBe(before);
    expect(sandbox.exists(CITIES_FILE)).toBe(false);
    expect(out.has('! No se encontró ninguna ciudad llamada "zzzz".')).toBe(true);
  });

  test("no escribe nada si falla el servicio de ciudades", async () => {
    stubGeocoding({}, 500);
    const out = captureOutput();
    capturePrompts();
    scripted = scriptInput(["Ottawa"]);

    const before = makeState();
    const state = await addCity(before);

    expect(state).toBe(before);
    expect(sandbox.exists(CITIES_FILE)).toBe(false);
    expect(out.has("✗ No se pudo buscar la ciudad: el servicio de ciudades respondió 500")).toBe(true);
  });

  test("insiste si el nombre viene vacío", async () => {
    stubGeocoding({ results: [OTTAWA_RESULT] });
    const out = captureOutput();
    capturePrompts();
    scripted = scriptInput(["", "Ottawa", "s"]);

    const state = await addCity(makeState());

    expect(state.cities).toEqual([OTTAWA]);
    expect(out.has("! Escribí algo, o Ctrl+C para salir.")).toBe(true);
    expect(scripted.remaining()).toBe(0);
  });
});
