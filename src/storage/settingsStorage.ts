import { mkdir } from "node:fs/promises";
import type { Settings, TemperatureUnit } from "../types/Settings.ts";
import { CITIES_FILE, SETTINGS_FILE, STORAGE_DIR } from "../utils/constants.ts";

type LegacyCitiesFile = {
  ciudadDefaultId?: unknown;
  unidad?: unknown;
};

export function settingsFilePath(): string {
  return SETTINGS_FILE;
}

function parseUnit(value: unknown): TemperatureUnit {
  return value === "fahrenheit" ? "fahrenheit" : "celsius";
}

function parseDefaultId(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

async function loadLegacySettings(): Promise<Settings> {
  const file = Bun.file(CITIES_FILE);
  if (!(await file.exists())) {
    return { defaultCityId: null, unit: "celsius" };
  }

  let parsed: unknown;
  try {
    parsed = await file.json();
  } catch {
    return { defaultCityId: null, unit: "celsius" };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { defaultCityId: null, unit: "celsius" };
  }

  const legacy = parsed as LegacyCitiesFile;
  return {
    defaultCityId: parseDefaultId(legacy.ciudadDefaultId),
    unit: parseUnit(legacy.unidad),
  };
}

export async function loadSettings(): Promise<Settings> {
  const file = Bun.file(SETTINGS_FILE);
  if (!(await file.exists())) {
    return loadLegacySettings();
  }

  let parsed: unknown;
  try {
    parsed = await file.json();
  } catch {
    return { defaultCityId: null, unit: "celsius" };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { defaultCityId: null, unit: "celsius" };
  }

  const data = parsed as Record<string, unknown>;
  return {
    defaultCityId: parseDefaultId(data["defaultCityId"]),
    unit: parseUnit(data["unit"]),
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await mkdir(STORAGE_DIR, { recursive: true });
  await Bun.write(SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`);
}
