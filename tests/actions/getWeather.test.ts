import { afterEach, beforeEach, describe, expect, test, mock } from "bun:test";
import { showAllCitiesWeather, showDefaultCityWeather } from "../../src/actions/getWeather.ts";
import type { AppState } from "../../src/types/Settings.ts";
import { captureOutput } from "../helpers/captureOutput.ts";
import { jsonResponse, stubFetch, type FetchStub } from "../helpers/fetchStub.ts";
import { makeCity, makeState } from "../helpers/fixtures.ts";
import { useSandbox, type Sandbox } from "../helpers/sandbox.ts";

const OTTAWA = makeCity();
const GATINEAU = makeCity({ id: 2, name: "Gatineau", admin1: "Quebec", lat: 45.34145, lon: -75.72561 });

let sandbox: Sandbox;
let fetchStub: FetchStub | null = null;

function stubForecast(body: unknown, status = 200): FetchStub {
  fetchStub = stubFetch((url) => {
    const fahrenheit = url.searchParams.get("temperature_unit") === "fahrenheit";
    return jsonResponse(
      {
        current: { time: "2026-10-01T12:00", temperature_2m: fahrenheit ? 54.1 : 12.3 },
        current_units: { temperature_2m: fahrenheit ? "°F" : "°C" },
        daily: {
          time: ["2026-10-01", "2026-10-02"],
          weather_code: [0, 61],
          temperature_2m_max: [fahrenheit ? 59 : 15, fahrenheit ? 61 : 16],
          temperature_2m_min: [fahrenheit ? 41 : 5, fahrenheit ? 43 : 6],
        },
      },
      status,
    );
  });
  return fetchStub;
}

function stateWithDefault(): AppState {
  return makeState({ cities: [OTTAWA, GATINEAU], settings: { defaultCityId: OTTAWA.id, unit: "celsius" } });
}

beforeEach(() => {
  mock.restore();
  sandbox = useSandbox();
});

afterEach(() => {
  mock.restore();
  fetchStub?.restore();
  fetchStub = null;
  sandbox.restore();
});

describe("actions/showDefaultCityWeather", () => {
  test("avisa si no hay ciudad default y no consulta la API", async () => {
    const out = captureOutput();
    const before = makeState({ cities: [OTTAWA] });

    const state = await showDefaultCityWeather(before);

    expect(state).toBe(before);
    expect(fetchStub).toBeNull();
    expect(out.has("! No tenés ciudad default. Establecela con la opción 5.")).toBe(true);
  });

  test("muestra el clima de la ciudad default y devuelve el mismo estado", async () => {
    const out = captureOutput();
    const fetchMock = stubForecast({});
    const before = stateWithDefault();

    const state = await showDefaultCityWeather(before);

    expect(state).toBe(before);
    expect(fetchMock.callCount()).toBe(1);
    expect(fetchMock.param("latitude")).toBe(String(OTTAWA.lat));
    expect(out.has("Ottawa — Ontario, Canadá")).toBe(true);
    expect(out.has("Ahora: 12.3 °C")).toBe(true);
    expect(out.has("Hoy:   máx 15 °C / mín 5 °C")).toBe(true);
    expect(out.has("Próximos 7 días:")).toBe(true);
  });

  test("usa la unidad configurada al pedir el pronóstico", async () => {
    captureOutput();
    const fetchMock = stubForecast({});
    await showDefaultCityWeather(
      makeState({ cities: [OTTAWA], settings: { defaultCityId: OTTAWA.id, unit: "fahrenheit" } }),
    );
    expect(fetchMock.param("temperature_unit")).toBe("fahrenheit");
  });

  test("muestra el error sin cortar el programa si la API falla", async () => {
    const out = captureOutput();
    stubForecast({}, 500);
    const before = stateWithDefault();

    const state = await showDefaultCityWeather(before);

    expect(state).toBe(before);
    expect(out.has("✗ No se pudo obtener el clima: el servicio de clima respondió 500")).toBe(true);
  });
});

describe("actions/showAllCitiesWeather", () => {
  test("avisa si no hay ciudades guardadas", async () => {
    const out = captureOutput();
    const before = makeState();

    const state = await showAllCitiesWeather(before);

    expect(state).toBe(before);
    expect(out.has("! No tenés ciudades guardadas. Agregá una con la opción 3.")).toBe(true);
  });

  test("consulta una vez por ciudad y no persiste nada", async () => {
    const out = captureOutput();
    const fetchMock = stubForecast({});
    const before = stateWithDefault();

    const state = await showAllCitiesWeather(before);

    expect(state).toBe(before);
    expect(fetchMock.callCount()).toBe(2);
    expect(fetchMock.calls().map((url) => url.searchParams.get("latitude"))).toEqual([
      String(OTTAWA.lat),
      String(GATINEAU.lat),
    ]);
    expect(out.has("Ottawa — Ontario, Canadá")).toBe(true);
    expect(out.has("Gatineau — Quebec, Canadá")).toBe(true);
    expect(sandbox.exists("datos/config.json")).toBe(false);
    expect(sandbox.exists("datos/ciudades.json")).toBe(false);
  });

  test("sigue con la siguiente ciudad si una falla", async () => {
    const out = captureOutput();
    fetchStub = stubFetch((url) => {
      const first = url.searchParams.get("latitude") === String(OTTAWA.lat);
      if (first) {
        return jsonResponse({}, 500);
      }
      return jsonResponse({
        current: { time: "2026-10-01T12:00", temperature_2m: 9 },
        current_units: { temperature_2m: "°C" },
        daily: { time: ["2026-10-01"], weather_code: [3], temperature_2m_max: [11], temperature_2m_min: [2] },
      });
    });

    const state = await showAllCitiesWeather(stateWithDefault());

    expect(state.cities).toHaveLength(2);
    expect(out.has("✗ No se pudo obtener el clima: el servicio de clima respondió 500")).toBe(true);
    expect(out.has("Gatineau — Quebec, Canadá  (2026-10-01 12:00)")).toBe(true);
  });
});
