import type { City } from "../../src/types/City.ts";
import type { AppState } from "../../src/types/Settings.ts";
import type { ForecastDay, Weather } from "../../src/types/Weather.ts";

export function makeCity(overrides: Partial<City> = {}): City {
  return {
    id: 1,
    name: "Ottawa",
    admin1: "Ontario",
    country: "Canadá",
    lat: 45.4215,
    lon: -75.6972,
    timezone: "America/Toronto",
    ...overrides,
  };
}

export function makeForecastDay(overrides: Partial<ForecastDay> = {}): ForecastDay {
  return {
    date: "2026-10-01",
    high: 15,
    low: 5,
    description: "Despejado",
    ...overrides,
  };
}

export function makeWeather(overrides: Partial<Weather> = {}): Weather {
  return {
    temperature: 12.3,
    high: 15,
    low: 5,
    unitLabel: "°C",
    localTime: "2026-10-01T12:00",
    days: [],
    ...overrides,
  };
}

export function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    cities: [],
    settings: { defaultCityId: null, unit: "celsius" },
    ...overrides,
  };
}
