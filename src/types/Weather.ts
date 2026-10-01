import type { City } from "./City.ts";
import type { TemperatureUnit } from "./Settings.ts";

export type ForecastDay = {
  date: string;
  high: number;
  low: number;
  description: string;
};

export type Weather = {
  temperature: number;
  high: number;
  low: number;
  unitLabel: string;
  localTime: string;
  days: ForecastDay[];
};

export type WeatherRequest = {
  city: City;
  unit: TemperatureUnit;
};
