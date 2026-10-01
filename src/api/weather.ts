import type { ForecastDay, Weather } from "../types/Weather.ts";
import type { City } from "../types/City.ts";
import type { TemperatureUnit } from "../types/Settings.ts";
import {
  FORECAST_DAYS,
  FORECAST_URL,
  WEATHER_CODE_DESCRIPTIONS,
} from "../utils/constants.ts";
import { unitLabel } from "../utils/format.ts";

type ForecastResponse = {
  current?: {
    time?: string;
    temperature_2m?: number;
  };
  current_units?: {
    temperature_2m?: string;
  };
  daily?: {
    time?: (string | null)[];
    weather_code?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
  };
};

function describeWeatherCode(code: number | null | undefined): string {
  if (code === null || code === undefined) {
    return "Desconocido";
  }
  return WEATHER_CODE_DESCRIPTIONS[code] ?? "Desconocido";
}

export async function fetchWeather(city: City, unit: TemperatureUnit): Promise<Weather> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(city.lat));
  url.searchParams.set("longitude", String(city.lon));
  url.searchParams.set("current", "temperature_2m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weather_code");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));
  url.searchParams.set("temperature_unit", unit);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`el servicio de clima respondió ${response.status}`);
  }

  const data = (await response.json()) as ForecastResponse;
  const temperature = data.current?.temperature_2m;
  if (temperature === undefined) {
    throw new Error("la respuesta del clima no trae la temperatura actual");
  }

  const highs = data.daily?.temperature_2m_max ?? [];
  const lows = data.daily?.temperature_2m_min ?? [];
  const codes = data.daily?.weather_code ?? [];
  const dates = data.daily?.time ?? [];

  const days: ForecastDay[] = [];
  for (let i = 0; i < FORECAST_DAYS; i++) {
    const date = dates[i];
    if (date === undefined || date === null) {
      continue;
    }
    days.push({
      date,
      high: highs[i] ?? temperature,
      low: lows[i] ?? temperature,
      description: describeWeatherCode(codes[i]),
    });
  }

  return {
    temperature,
    high: highs[0] ?? temperature,
    low: lows[0] ?? temperature,
    unitLabel: data.current_units?.temperature_2m ?? unitLabel(unit),
    localTime: data.current?.time ?? "",
    days,
  };
}
