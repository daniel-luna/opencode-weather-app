import type { AppState } from "../types/Settings.ts";
import { searchCities } from "../api/geocoding.ts";
import { promptRequired, confirm } from "../presentation/input.ts";
import { blank, printError, success, warning } from "../presentation/output.ts";
import { saveCities } from "../storage/citiesStorage.ts";
import { saveSettings } from "../storage/settingsStorage.ts";
import { describeError, formatLocation } from "../utils/format.ts";
import { pickFromList } from "./listCities.ts";

export async function addCity(state: AppState): Promise<AppState> {
  blank();
  const query = await promptRequired("  Nombre de la ciudad: ");

  let candidates;
  try {
    candidates = await searchCities(query);
  } catch (error) {
    printError(`No se pudo buscar la ciudad: ${describeError(error)}`);
    return state;
  }

  if (candidates.length === 0) {
    warning(`No se encontró ninguna ciudad llamada "${query}".`);
    return state;
  }

  const only = candidates.length === 1 ? candidates[0] : undefined;
  const chosen = only ?? (await pickFromList(candidates, state, "Encontré varias, elegí una:"));
  if (chosen === null || chosen === undefined) {
    return state;
  }

  if (state.cities.some((city) => city.id === chosen.id)) {
    warning(`${chosen.name} ya está en tu lista.`);
    return state;
  }

  success(`Ciudad agregada: ${chosen.name}${formatLocation(chosen)}`);
  const cities = [...state.cities, chosen];
  await saveCities(cities);

  let next: AppState = { ...state, cities };
  if (state.settings.defaultCityId === null && (await confirm("  ¿Establecerla como ciudad default? (s/N): "))) {
    success(`${chosen.name} es ahora la ciudad default.`);
    const settings = { ...state.settings, defaultCityId: chosen.id };
    await saveSettings(settings);
    next = { ...next, settings };
  }
  return next;
}
