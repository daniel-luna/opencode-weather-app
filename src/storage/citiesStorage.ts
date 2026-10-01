import { mkdir } from "node:fs/promises";
import type { City } from "../types/City.ts";
import { CITIES_FILE, STORAGE_DIR } from "../utils/constants.ts";

type LegacyCitiesFile = {
  ciudadDefaultId?: unknown;
  ciudades?: unknown;
  unidad?: unknown;
};

export function citiesFilePath(): string {
  return CITIES_FILE;
}

function parseCity(value: unknown): City | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const name = candidate["name"] ?? candidate["nombre"];
  const country = candidate["country"] ?? candidate["pais"];
  const id = candidate["id"];
  const lat = candidate["lat"];
  const lon = candidate["lon"];
  if (typeof id !== "number" || typeof name !== "string") {
    return null;
  }
  if (typeof lat !== "number" || typeof lon !== "number") {
    return null;
  }
  const admin1 = candidate["admin1"];
  const timezone = candidate["timezone"];
  return {
    id,
    name,
    admin1: typeof admin1 === "string" ? admin1 : "",
    country: typeof country === "string" ? country : "",
    lat,
    lon,
    timezone: typeof timezone === "string" ? timezone : "GMT",
  };
}

function extractCities(parsed: unknown): City[] {
  if (Array.isArray(parsed)) {
    return parsed
      .map((value) => parseCity(value))
      .filter((city): city is City => city !== null);
  }
  if (typeof parsed === "object" && parsed !== null) {
    const legacy = parsed as LegacyCitiesFile;
    if (Array.isArray(legacy.ciudades)) {
      return legacy.ciudades
        .map((value) => parseCity(value))
        .filter((city): city is City => city !== null);
    }
  }
  return [];
}

export async function loadCities(): Promise<City[]> {
  const file = Bun.file(CITIES_FILE);
  if (!(await file.exists())) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = await file.json();
  } catch {
    return [];
  }

  return extractCities(parsed);
}

export async function saveCities(cities: City[]): Promise<void> {
  await mkdir(STORAGE_DIR, { recursive: true });
  await Bun.write(CITIES_FILE, `${JSON.stringify(cities, null, 2)}\n`);
}
