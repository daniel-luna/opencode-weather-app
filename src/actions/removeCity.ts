import type { AppState } from "../types/Settings.ts";
import { blank, success, warning } from "../presentation/output.ts";
import { saveCities } from "../storage/citiesStorage.ts";
import { saveSettings } from "../storage/settingsStorage.ts";
import { pickFromList } from "./listCities.ts";

export async function removeCity(state: AppState): Promise<AppState> {
  blank();
  if (state.cities.length === 0) {
    warning("No hay ciudades para eliminar. Agregá una con la opción 3.");
    return state;
  }
  if (state.cities.length === 1) {
    warning("Debe quedar al menos una ciudad guardada.");
    return state;
  }

  const toRemove = await pickFromList(state.cities, state, "Elegí la ciudad a eliminar:");
  if (toRemove === null) {
    return state;
  }

  const cities = state.cities.filter((city) => city.id !== toRemove.id);
  const clearedDefault = state.settings.defaultCityId === toRemove.id;
  const settings = clearedDefault ? { ...state.settings, defaultCityId: null } : state.settings;

  if (clearedDefault) {
    warning(`${toRemove.name} era la ciudad default. Usá la opción 5 para elegir otra.`);
  }
  success(`Ciudad eliminada: ${toRemove.name}. Quedan ${cities.length}.`);

  await saveCities(cities);
  if (clearedDefault) {
    await saveSettings(settings);
  }

  return { ...state, cities, settings };
}
