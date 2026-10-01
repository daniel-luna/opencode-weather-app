import type { City } from "../types/City.ts";
import type { ForecastDay, Weather } from "../types/Weather.ts";
import { paint } from "../utils/colors.ts";
import {
  formatLocation,
  formatTemperature,
  shortDate,
} from "../utils/format.ts";
import { info, printError } from "./output.ts";

export function renderForecast(days: ForecastDay[], label: string): void {
  if (days.length === 0) {
    return;
  }
  info(paint("  Próximos 7 días:", "bold"));
  const dateWidth = Math.max(...days.map((day) => shortDate(day.date).length));
  days.forEach((day, index) => {
    const caption = index === 0 ? "hoy" : shortDate(day.date);
    const date = paint(caption.padEnd(dateWidth), "dim");
    const sky = day.description.padEnd(23);
    info(
      `    ${date}  ${sky}  ${formatTemperature(day.high, label)} / ${formatTemperature(day.low, label)}`,
    );
  });
}

export async function renderWeather(city: City, weather: Weather): Promise<void> {
  const heading = paint(city.name, "bold");
  const time =
    weather.localTime === ""
      ? ""
      : paint(`  (${weather.localTime.replace("T", " ")})`, "dim");
  info(`${heading}${formatLocation(city)}${time}`);
  info(`  Ahora: ${formatTemperature(weather.temperature, weather.unitLabel)}`);
  info(
    `  Hoy:   máx ${formatTemperature(weather.high, weather.unitLabel)} / mín ${formatTemperature(weather.low, weather.unitLabel)}`,
  );
  renderForecast(weather.days, weather.unitLabel);
}

export function renderWeatherError(city: City, message: string): void {
  info(`${paint(city.name, "bold")}${formatLocation(city)}`);
  printError(`No se pudo obtener el clima: ${message}`);
}
