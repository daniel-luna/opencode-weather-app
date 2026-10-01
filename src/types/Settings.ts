import type { City } from "./City.ts";

export type TemperatureUnit = "celsius" | "fahrenheit";

export type Settings = {
  defaultCityId: number | null;
  unit: TemperatureUnit;
};

export type AppState = {
  cities: City[];
  settings: Settings;
};
