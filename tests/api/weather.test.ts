import { afterEach, describe, expect, test } from "bun:test";
import { fetchWeather } from "../../src/api/weather.ts";
import { makeCity } from "../helpers/fixtures.ts";
import { jsonResponse, stubFetch, type FetchStub } from "../helpers/fetchStub.ts";

let stub: FetchStub | null = null;

function stubForecast(body: unknown, status = 200): FetchStub {
  stub = stubFetch(() => jsonResponse(body, status));
  return stub;
}

function fullForecast(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    timezone: "America/Toronto",
    current: { time: "2026-10-01T12:00", temperature_2m: 12.3 },
    current_units: { temperature_2m: "°C" },
    daily: {
      time: ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"],
      weather_code: [0, 1, 2, 3, 61, 63, 95],
      temperature_2m_max: [15, 16, 14, 12, 13, 11, 17],
      temperature_2m_min: [5, 6, 4, 3, 7, 2, 9],
    },
    ...overrides,
  };
}

afterEach(() => {
  stub?.restore();
  stub = null;
});

describe("api/fetchWeather", () => {
  test("consulta la URL de pronóstico con los parámetros esperados", async () => {
    const fetchStub = stubForecast(fullForecast());
    await fetchWeather(makeCity(), "celsius");

    expect(fetchStub.callCount()).toBe(1);
    expect(fetchStub.lastUrl().hostname).toBe("api.open-meteo.com");
    expect(fetchStub.param("latitude")).toBe("45.4215");
    expect(fetchStub.param("longitude")).toBe("-75.6972");
    expect(fetchStub.param("current")).toBe("temperature_2m");
    expect(fetchStub.param("daily")).toBe("temperature_2m_max,temperature_2m_min,weather_code");
    expect(fetchStub.param("timezone")).toBe("auto");
    expect(fetchStub.param("forecast_days")).toBe("7");
    expect(fetchStub.param("temperature_unit")).toBe("celsius");
  });

  test("pide fahrenheit cuando la unidad lo indica", async () => {
    const fetchStub = stubForecast(fullForecast());
    await fetchWeather(makeCity(), "fahrenheit");
    expect(fetchStub.param("temperature_unit")).toBe("fahrenheit");
  });

  test("trae lectura actual y pronóstico de 7 días en una sola llamada", async () => {
    stubForecast(fullForecast());
    const weather = await fetchWeather(makeCity(), "celsius");

    expect(weather.temperature).toBe(12.3);
    expect(weather.high).toBe(15);
    expect(weather.low).toBe(5);
    expect(weather.unitLabel).toBe("°C");
    expect(weather.localTime).toBe("2026-10-01T12:00");
    expect(weather.days).toHaveLength(7);
    expect(weather.days[0]).toEqual({
      date: "2026-10-01",
      high: 15,
      low: 5,
      description: "Despejado",
    });
    expect(weather.days[6]?.description).toBe("Tormenta");
  });

  test("lee la etiqueta de unidad de la respuesta y no la asume", async () => {
    stubForecast(
      fullForecast({
        current_units: { temperature_2m: "°F" },
      }),
    );
    const weather = await fetchWeather(makeCity(), "celsius");
    expect(weather.unitLabel).toBe("°F");
  });

  test("cae a la etiqueta de la unidad pedida si la API no manda current_units", async () => {
    const body = fullForecast();
    delete (body as { current_units?: unknown }).current_units;
    stubForecast(body);

    expect((await fetchWeather(makeCity(), "celsius")).unitLabel).toBe("°C");
    expect((await fetchWeather(makeCity(), "fahrenheit")).unitLabel).toBe("°F");
  });

  test("usa la temperatura actual cuando un valor del día falta", async () => {
    stubForecast(
      fullForecast({
        daily: {
          time: ["2026-10-01", "2026-10-02"],
          weather_code: [0, null],
          temperature_2m_max: [null, 16],
          temperature_2m_min: [5, null],
        },
      }),
    );
    const weather = await fetchWeather(makeCity(), "celsius");

    expect(weather.high).toBe(12.3);
    expect(weather.low).toBe(5);
    expect(weather.days).toEqual([
      { date: "2026-10-01", high: 12.3, low: 5, description: "Despejado" },
      { date: "2026-10-02", high: 16, low: 12.3, description: "Desconocido" },
    ]);
  });

  test("los códigos WMO desconocidos y nulos caen en Desconocido", async () => {
    stubForecast(
      fullForecast({
        daily: {
          time: ["2026-10-01", "2026-10-02", "2026-10-03"],
          weather_code: [999, null, 61],
          temperature_2m_max: [1, 2, 3],
          temperature_2m_min: [0, 0, 1],
        },
      }),
    );
    const weather = await fetchWeather(makeCity(), "celsius");

    expect(weather.days.map((day) => day.description)).toEqual([
      "Desconocido",
      "Desconocido",
      "Lluvia ligera",
    ]);
  });

  test("descarta días sin fecha en vez de inventar una", async () => {
    stubForecast(
      fullForecast({
        daily: {
          time: ["2026-10-01", null, "2026-10-03"],
          weather_code: [0, 1, 2],
          temperature_2m_max: [15, 16, 14],
          temperature_2m_min: [5, 6, 4],
        },
      }),
    );
    const weather = await fetchWeather(makeCity(), "celsius");

    expect(weather.days.map((day) => day.date)).toEqual(["2026-10-01", "2026-10-03"]);
  });

  test("tolera una respuesta sin bloque daily", async () => {
    const body = fullForecast();
    delete (body as { daily?: unknown }).daily;
    stubForecast(body);

    const weather = await fetchWeather(makeCity(), "celsius");
    expect(weather.days).toEqual([]);
    expect(weather.high).toBe(12.3);
    expect(weather.low).toBe(12.3);
  });

  test("falla si la respuesta no trae la temperatura actual", async () => {
    stubForecast({ current: { time: "2026-10-01T12:00" } });
    await expect(fetchWeather(makeCity(), "celsius")).rejects.toThrow(
      "la respuesta del clima no trae la temperatura actual",
    );
  });

  test("falla si la respuesta no trae nada de current", async () => {
    stubForecast({});
    await expect(fetchWeather(makeCity(), "celsius")).rejects.toThrow(
      "la respuesta del clima no trae la temperatura actual",
    );
  });

  test("usa localTime vacío si la API no manda la hora", async () => {
    stubForecast(
      fullForecast({
        current: { temperature_2m: 7 },
      }),
    );
    expect((await fetchWeather(makeCity(), "celsius")).localTime).toBe("");
  });

  test("propaga el error si el servicio no responde bien", async () => {
    stubForecast({}, 503);
    await expect(fetchWeather(makeCity(), "celsius")).rejects.toThrow(
      "el servicio de clima respondió 503",
    );
  });
});
