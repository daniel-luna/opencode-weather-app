import type { City } from "../types/City.ts";
import type { TemperatureUnit } from "../types/Settings.ts";
import { paint } from "./colors.ts";

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function formatLocation(city: City): string {
  const parts = [city.admin1, city.country].filter((part) => part !== "");
  return parts.length > 0 ? ` — ${parts.join(", ")}` : "";
}

export function unitLabel(unit: TemperatureUnit): string {
  return unit === "celsius" ? "°C" : "°F";
}

export function formatTemperature(value: number, label: string): string {
  return paint(`${value} ${label}`, "yellow");
}

export function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}
