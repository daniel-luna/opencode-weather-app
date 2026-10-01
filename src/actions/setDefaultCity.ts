import type { AppState } from "../types/Settings.ts";
import { blank, success, warning } from "../presentation/output.ts";
import { saveSettings } from "../storage/settingsStorage.ts";
import { formatLocation } from "../utils/format.ts";
import { pickFromList } from "./listCities.ts";

export async function setDefaultCity(state: AppState): Promise<AppState> {
  blank();
  if (state.cities.length === 0) {
    warning("No tenés ciudades guardadas. Agregá una con la opción 3.");
    return state;
  }

  const chosen = await pickFromList(state.cities, state, "Elegí la ciudad default:");
  if (chosen === null) {
    return state;
  }

  success(`Ciudad default: ${chosen.name}${formatLocation(chosen)}`);
  const settings = { ...state.settings, defaultCityId: chosen.id };
  await saveSettings(settings);

  return { ...state, settings };
}
