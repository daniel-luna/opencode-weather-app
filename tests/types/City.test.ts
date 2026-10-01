import { describe, expect, test } from "bun:test";
import type { City } from "../../src/types/City.ts";
import { makeCity } from "../helpers/fixtures.ts";

describe("types/City", () => {
  test("tiene exactamente las claves que parseCity lee y saveCities escribe", () => {
    const city: City = makeCity();

    expect(Object.keys(city).sort()).toEqual([
      "admin1",
      "country",
      "id",
      "lat",
      "lon",
      "name",
      "timezone",
    ]);
  });

  test("admin1 y country admiten cadena vacía para ciudades sin ubicación", () => {
    expect(makeCity({ admin1: "", country: "" })).toEqual({
      id: 1,
      name: "Ottawa",
      admin1: "",
      country: "",
      lat: 45.4215,
      lon: -75.6972,
      timezone: "America/Toronto",
    });
  });
});
