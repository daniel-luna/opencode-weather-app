import { describe, expect, test } from "bun:test";
import type { AppState, Settings, TemperatureUnit } from "../../src/types/Settings.ts";
import { makeState } from "../helpers/fixtures.ts";
import { unitLabel } from "../../src/utils/format.ts";

describe("types/Settings", () => {
  test("tiene exactamente las claves que guarda config.json", () => {
    const settings: Settings = makeState().settings;

    expect(Object.keys(settings).sort()).toEqual(["defaultCityId", "unit"]);
  });

  test("defaultCityId admite null para una lista sin ciudad default", () => {
    expect(makeState({ settings: { defaultCityId: null, unit: "celsius" } }).settings).toEqual({
      defaultCityId: null,
      unit: "celsius",
    });
  });
});

describe("types/AppState", () => {
  test("es cities más settings, y ambos se hilvan por las acciones", () => {
    const state: AppState = makeState();

    expect(Object.keys(state).sort()).toEqual(["cities", "settings"]);
  });
});

describe("types/TemperatureUnit", () => {
  test("son exactamente celsius y fahrenheit, con su etiqueta", () => {
    const units: TemperatureUnit[] = ["celsius", "fahrenheit"];

    expect(units.map((unit) => unitLabel(unit))).toEqual(["°C", "°F"]);
  });
});
