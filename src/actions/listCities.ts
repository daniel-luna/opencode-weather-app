import type { City } from "../types/City.ts";
import type { AppState } from "../types/Settings.ts";
import { paint } from "../utils/colors.ts";
import { formatLocation } from "../utils/format.ts";
import { prompt } from "../presentation/input.ts";
import { blank, info, printError } from "../presentation/output.ts";

export function printCityList(cities: City[], state: AppState): void {
  cities.forEach((city, index) => {
    const isDefault = city.id === state.settings.defaultCityId ? paint("  (default)", "dim") : "";
    const number = paint(`${index + 1}.`, "cyan");
    info(`${number} ${paint(city.name, "bold")}${formatLocation(city)}${isDefault}`);
  });
}

export async function pickFromList(
  cities: City[],
  state: AppState,
  heading: string,
): Promise<City | null> {
  blank();
  info(heading);
  printCityList(cities, state);
  const answer = await prompt("  Número (0 para cancelar): ");
  if (answer === "" || answer === "0") {
    return null;
  }
  const choice = Number(answer);
  if (!Number.isInteger(choice) || choice < 1 || choice > cities.length) {
    printError("Opción inválida.");
    return null;
  }
  return cities[choice - 1] ?? null;
}
