import type { City } from "../types/City.ts";
import type { AppState } from "../types/Settings.ts";
import { fetchWeather } from "../api/weather.ts";
import { renderWeather, renderWeatherError } from "../presentation/weatherView.ts";
import { blank, warning } from "../presentation/output.ts";
import { describeError } from "../utils/format.ts";

async function showCityWeather(city: City, state: AppState): Promise<void> {
  try {
    const weather = await fetchWeather(city, state.settings.unit);
    renderWeather(city, weather);
  } catch (error) {
    renderWeatherError(city, describeError(error));
  }
}

export async function showDefaultCityWeather(state: AppState): Promise<AppState> {
  blank();
  const city = state.cities.find((c) => c.id === state.settings.defaultCityId);
  if (city === undefined) {
    warning("No tenés ciudad default. Establecela con la opción 5.");
    return state;
  }
  await showCityWeather(city, state);
  return state;
}

export async function showAllCitiesWeather(state: AppState): Promise<AppState> {
  blank();
  if (state.cities.length === 0) {
    warning("No tenés ciudades guardadas. Agregá una con la opción 3.");
    return state;
  }
  for (const city of state.cities) {
    await showCityWeather(city, state);
    blank();
  }
  return state;
}
