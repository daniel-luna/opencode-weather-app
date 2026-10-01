import { describe, expect, test } from "bun:test";
import type { ForecastDay, Weather } from "../../src/types/Weather.ts";
import { makeForecastDay, makeWeather } from "../helpers/fixtures.ts";

describe("types/Weather", () => {
  test("tiene exactamente las claves que consume weatherView", () => {
    const weather: Weather = makeWeather();

    expect(Object.keys(weather).sort()).toEqual([
      "days",
      "high",
      "localTime",
      "low",
      "temperature",
      "unitLabel",
    ]);
  });

  test("high y low son los valores de hoy, y days el resto del pronóstico", () => {
    const weather = makeWeather({ days: [makeForecastDay(), makeForecastDay({ date: "2026-10-02" })] });

    expect(weather.days).toHaveLength(2);
    expect(weather.days[0]?.date).toBe("2026-10-01");
  });
});

describe("types/ForecastDay", () => {
  test("lleva la descripción ya traducida, no el código WMO", () => {
    const day: ForecastDay = makeForecastDay();

    expect(Object.keys(day).sort()).toEqual(["date", "description", "high", "low"]);
    expect(Object.keys(day)).not.toContain("weatherCode");
  });
});
