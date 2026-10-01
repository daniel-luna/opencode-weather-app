import type { AppState, TemperatureUnit } from "../types/Settings.ts";
import { blank, success } from "../presentation/output.ts";
import { saveSettings } from "../storage/settingsStorage.ts";
import { unitLabel } from "../utils/format.ts";

export async function toggleUnit(state: AppState): Promise<AppState> {
  const unit: TemperatureUnit =
    state.settings.unit === "celsius" ? "fahrenheit" : "celsius";
  blank();
  success(`Unidad de temperatura: ${unitLabel(unit)}.`);
  const settings = { ...state.settings, unit };
  await saveSettings(settings);

  return { ...state, settings };
}
