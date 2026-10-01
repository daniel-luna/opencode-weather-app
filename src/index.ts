import { addCity } from "./actions/addCity.ts";
import { showAllCitiesWeather, showDefaultCityWeather } from "./actions/getWeather.ts";
import { removeCity } from "./actions/removeCity.ts";
import { setDefaultCity } from "./actions/setDefaultCity.ts";
import { toggleUnit } from "./actions/toggleUnit.ts";
import { renderMenu } from "./presentation/menu.ts";
import { closeInput, prompt, startInput } from "./presentation/input.ts";
import { blank, info, printError } from "./presentation/output.ts";
import { citiesFilePath, loadCities } from "./storage/citiesStorage.ts";
import { loadSettings } from "./storage/settingsStorage.ts";
import type { MenuOption } from "./types/MenuOption.ts";
import type { AppState } from "./types/Settings.ts";
import { describeError, unitLabel } from "./utils/format.ts";

const EXIT_VALUES = new Set(["9", "0"]);

function buildMenuOptions(): MenuOption[] {
  return [
    { value: "1", label: "1. Clima de ciudad default", run: showDefaultCityWeather },
    {
      value: "2",
      label: "2. Clima de todas las ciudades",
      badge: (state) => `(${state.cities.length})`,
      run: showAllCitiesWeather,
    },
    { value: "3", label: "3. Buscar y agregar ciudad", run: addCity },
    { value: "4", label: "4. Eliminar ciudad", run: removeCity },
    { value: "5", label: "5. Establecer ciudad default", run: setDefaultCity },
    {
      value: "8",
      label: "8. Ajustes",
      badge: (state) => `(${unitLabel(state.settings.unit)})`,
      run: toggleUnit,
    },
  ];
}

async function main(): Promise<void> {
  startInput();

  const [cities, settings] = await Promise.all([loadCities(), loadSettings()]);
  let state: AppState = { cities, settings };

  if (state.cities.length === 0 && state.settings.defaultCityId === null) {
    blank();
    info(`Tus ciudades se guardan en ${citiesFilePath()}`);
  }

  const options = buildMenuOptions();

  for (;;) {
    renderMenu(options, state);
    const choice = await prompt("  Selecciona una opción: ");

    if (EXIT_VALUES.has(choice)) {
      blank();
      info("¡Hasta luego!");
      return;
    }

    const option = options.find((candidate) => candidate.value === choice);
    if (option === undefined) {
      blank();
      printError("Opción no válida.");
      continue;
    }

    state = await option.run(state);
  }
}

main()
  .catch((error: unknown) => {
    blank();
    printError(describeError(error));
    process.exitCode = 1;
  })
  .finally(() => {
    closeInput();
  });
