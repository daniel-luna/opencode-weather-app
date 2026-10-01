import { afterEach, describe, expect, test, mock } from "bun:test";
import {
  renderForecast,
  renderWeather,
  renderWeatherError,
} from "../../src/presentation/weatherView.ts";
import { makeCity, makeForecastDay, makeWeather } from "../helpers/fixtures.ts";
import { captureOutput } from "../helpers/captureOutput.ts";

afterEach(() => {
  mock.restore();
});

const SEVEN_DAYS = [
  makeForecastDay({ date: "2026-10-01", high: 15, low: 5, description: "Despejado" }),
  makeForecastDay({ date: "2026-10-02", high: 16, low: 6, description: "Mayormente despejado" }),
  makeForecastDay({ date: "2026-10-03", high: 14, low: 4, description: "Parcialmente nublado" }),
  makeForecastDay({ date: "2026-10-04", high: 12, low: 3, description: "Nublado" }),
  makeForecastDay({ date: "2026-10-05", high: 13, low: 7, description: "Lluvia ligera" }),
  makeForecastDay({ date: "2026-10-06", high: 11, low: 2, description: "Lluvia" }),
  makeForecastDay({ date: "2026-10-07", high: 17, low: 9, description: "Tormenta" }),
];

describe("presentation/renderWeather", () => {
  test("imprime ciudad, hora local, actual y máx/mín de hoy", async () => {
    const out = captureOutput();
    await renderWeather(makeCity(), makeWeather({ days: [] }));

    expect(out.lines()[0]).toBe("  Ottawa — Ontario, Canadá  (2026-10-01 12:00)");
    expect(out.lines()[1]).toBe("    Ahora: 12.3 °C");
    expect(out.lines()[2]).toBe("    Hoy:   máx 15 °C / mín 5 °C");
  });

  test("omite la hora local si la API no la mandó", async () => {
    const out = captureOutput();
    await renderWeather(makeCity(), makeWeather({ localTime: "", days: [] }));
    expect(out.lines()[0]).toBe("  Ottawa — Ontario, Canadá");
  });

  test("usa la etiqueta de unidad que vino en la respuesta", async () => {
    const out = captureOutput();
    await renderWeather(makeCity(), makeWeather({ unitLabel: "°F", temperature: 54, days: [] }));
    expect(out.lines()[1]).toBe("    Ahora: 54 °F");
  });

  test("incluye el pronóstico de 7 días después de la lectura actual", async () => {
    const out = captureOutput();
    await renderWeather(makeCity(), makeWeather({ days: SEVEN_DAYS }));

    const lines = out.lines();
    expect(lines[3]).toBe("    Próximos 7 días:");
    expect(lines).toHaveLength(11);
    expect(lines[4]).toContain("hoy");
    expect(lines[4]).toContain("Despejado");
    expect(lines[4]).toContain("15 °C / 5 °C");
    expect(lines[10]).toContain("Tormenta");
    expect(lines[10]).toContain("17 °C / 9 °C");
  });
});

describe("presentation/renderForecast", () => {
  test("marca el primer día como hoy y lista los siete", () => {
    const out = captureOutput();
    renderForecast(SEVEN_DAYS, "°C");

    const rows = out.lines().slice(1);
    expect(rows).toHaveLength(7);
    expect(rows[0]).toContain("hoy");
    expect(rows[0]).not.toContain("2026");
    expect(rows[1]).toContain("vie, 02 oct");
    expect(rows[6]).toContain("mié, 07 oct");
  });

  test("alinea las temperaturas en todas las filas", () => {
    const out = captureOutput();
    renderForecast(SEVEN_DAYS, "°C");

    const rows = out.lines().slice(1);
    expect(new Set(rows.map((row) => row.indexOf("°C"))).size).toBe(1);

    for (const row of rows) {
      expect(row.startsWith("      ")).toBe(true);
      expect(row).toMatch(/°C \/ -?\d+(\.\d+)? °C$/);
    }
  });

  test("no imprime nada si no hay días", () => {
    const out = captureOutput();
    renderForecast([], "°C");
    expect(out.lines()).toEqual([]);
  });

  test("respeta la etiqueta de unidad recibida", () => {
    const out = captureOutput();
    renderForecast([makeForecastDay({ high: 54, low: 41 })], "°F");
    expect(out.lines()[1]).toBe("      hoy          Despejado                54 °F / 41 °F");
  });
});

describe("presentation/renderWeatherError", () => {
  test("muestra la ciudad y el motivo del fallo", () => {
    const out = captureOutput();
    renderWeatherError(makeCity(), "el servicio de clima respondió 500");

    expect(out.lines()[0]).toBe("  Ottawa — Ontario, Canadá");
    expect(out.lines()[1]).toBe(
      "  ✗ No se pudo obtener el clima: el servicio de clima respondió 500",
    );
  });
});
