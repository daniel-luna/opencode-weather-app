import { describe, expect, test } from "bun:test";
import {
  CITIES_FILE,
  CITY_CANDIDATE_COUNT,
  FORECAST_DAYS,
  FORECAST_URL,
  GEOCODING_URL,
  MENU_WIDTH,
  SETTINGS_FILE,
  STORAGE_DIR,
  WEATHER_CODE_DESCRIPTIONS,
} from "../../src/utils/constants.ts";

const WMO_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86,
  95, 96, 99,
];

describe("endpoints", () => {
  test("usa los hosts de OpenMeteo sin token", () => {
    expect(GEOCODING_URL).toBe("https://geocoding-api.open-meteo.com/v1/search");
    expect(FORECAST_URL).toBe("https://api.open-meteo.com/v1/forecast");
    for (const url of [GEOCODING_URL, FORECAST_URL]) {
      expect(url).not.toContain("apikey");
      expect(url).not.toContain("key=");
      expect(url).not.toContain("token");
    }
  });
});

describe("parámetros", () => {
  test("los valores por defecto coinciden con lo implementado", () => {
    expect(CITY_CANDIDATE_COUNT).toBe(5);
    expect(FORECAST_DAYS).toBe(7);
    expect(MENU_WIDTH).toBe(39);
  });
});

describe("rutas de almacenamiento", () => {
  test("viven en datos/ y son relativas al cwd", () => {
    expect(STORAGE_DIR).toBe("datos");
    expect(CITIES_FILE).toBe("datos/ciudades.json");
    expect(SETTINGS_FILE).toBe("datos/config.json");
  });
});

describe("WEATHER_CODE_DESCRIPTIONS", () => {
  test("cubre los 27 códigos estándar de WMO", () => {
    expect(Object.keys(WEATHER_CODE_DESCRIPTIONS).length).toBe(WMO_CODES.length);
    for (const code of WMO_CODES) {
      const description = WEATHER_CODE_DESCRIPTIONS[code];
      expect(typeof description).toBe("string");
      expect(description).not.toBe("");
    }
  });

  test("codigos representativos tienen la descripción esperada", () => {
    expect(WEATHER_CODE_DESCRIPTIONS[0]).toBe("Despejado");
    expect(WEATHER_CODE_DESCRIPTIONS[3]).toBe("Nublado");
    expect(WEATHER_CODE_DESCRIPTIONS[45]).toBe("Niebla");
    expect(WEATHER_CODE_DESCRIPTIONS[65]).toBe("Lluvia intensa");
    expect(WEATHER_CODE_DESCRIPTIONS[75]).toBe("Nieve intensa");
    expect(WEATHER_CODE_DESCRIPTIONS[99]).toBe("Tormenta con granizo fuerte");
  });

  test("códigos desconocidos no tienen entrada, para que caiga el fallback", () => {
    expect(WEATHER_CODE_DESCRIPTIONS[4]).toBeUndefined();
    expect(WEATHER_CODE_DESCRIPTIONS[100]).toBeUndefined();
    expect(WEATHER_CODE_DESCRIPTIONS[-1]).toBeUndefined();
  });
});
