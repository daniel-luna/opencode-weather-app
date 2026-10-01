import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { citiesFilePath, loadCities, saveCities } from "../../src/storage/citiesStorage.ts";
import { makeCity } from "../helpers/fixtures.ts";
import { useSandbox, type Sandbox } from "../helpers/sandbox.ts";

let sandbox: Sandbox;

beforeEach(() => {
  sandbox = useSandbox();
});

afterEach(() => {
  sandbox.restore();
});

describe("storage/citiesFilePath", () => {
  test("expone la ruta que se le informa al usuario", () => {
    expect(citiesFilePath()).toBe("datos/ciudades.json");
  });
});

describe("storage/loadCities", () => {
  test("devuelve vacío si el archivo no existe", async () => {
    expect(await loadCities()).toEqual([]);
  });

  test("lee el array plano actual", async () => {
    await saveCities([makeCity(), makeCity({ id: 2, name: "Gatineau", admin1: "Quebec" })]);
    expect(await loadCities()).toEqual([
      makeCity(),
      makeCity({ id: 2, name: "Gatineau", admin1: "Quebec" }),
    ]);
  });

  test("degrada a vacío con JSON corrupto", async () => {
    await sandbox.write("datos/ciudades.json", "{ esto no es json");
    expect(await loadCities()).toEqual([]);
  });

  test("degrada a vacío con un JSON que no es una lista de ciudades", async () => {
    await sandbox.write("datos/ciudades.json", '"un string"');
    expect(await loadCities()).toEqual([]);

    await sandbox.write("datos/ciudades.json", "5");
    expect(await loadCities()).toEqual([]);

    await sandbox.write("datos/ciudades.json", "null");
    expect(await loadCities()).toEqual([]);
  });

  test("migra el envoltorio legacy con claves en español", async () => {
    await sandbox.write(
      "datos/ciudades.json",
      JSON.stringify({
        ciudadDefaultId: 7,
        ciudades: [
          {
            id: 7,
            nombre: "Córdoba",
            pais: "Argentina",
            lat: -31.4135,
            lon: -64.1811,
            timezone: "America/Argentina/Cordoba",
          },
        ],
        unidad: "celsius",
      }),
    );

    expect(await loadCities()).toEqual([
      {
        id: 7,
        name: "Córdoba",
        admin1: "",
        country: "Argentina",
        lat: -31.4135,
        lon: -64.1811,
        timezone: "America/Argentina/Cordoba",
      },
    ]);
  });

  test("rellena admin1 y timezone en ciudades legacy que no los tienen", async () => {
    await sandbox.write(
      "datos/ciudades.json",
      JSON.stringify({
        ciudades: [{ id: 3, nombre: "Rosario", pais: "Argentina", lat: -32.95, lon: -60.66 }],
      }),
    );

    expect(await loadCities()).toEqual([
      {
        id: 3,
        name: "Rosario",
        admin1: "",
        country: "Argentina",
        lat: -32.95,
        lon: -60.66,
        timezone: "GMT",
      },
    ]);
  });

  test("descarta entradas inválidas sin perder las válidas", async () => {
    await sandbox.write(
      "datos/ciudades.json",
      JSON.stringify([
        makeCity(),
        { name: "Sin id", lat: 1, lon: 2 },
        { id: "3", name: "Id string", lat: 1, lon: 2 },
        { id: 4, name: "Sin coordenadas" },
        { id: 5, name: "Lat string", lat: "1", lon: 2 },
        null,
        "texto",
        makeCity({ id: 9, name: "Springfield" }),
      ]),
    );

    const cities = await loadCities();
    expect(cities.map((city) => city.id)).toEqual([1, 9]);
  });

  test("descarta el envoltorio legacy sin lista ciudades", async () => {
    await sandbox.write("datos/ciudades.json", JSON.stringify({ ciudadDefaultId: 7, unidad: "celsius" }));
    expect(await loadCities()).toEqual([]);
  });
});

describe("storage/saveCities", () => {
  test("crea el directorio datos/ si falta", async () => {
    expect(sandbox.exists("datos")).toBe(false);
    await saveCities([makeCity()]);
    expect(sandbox.exists("datos/ciudades.json")).toBe(true);
  });

  test("escribe JSON indentado con newline final", async () => {
    await saveCities([makeCity()]);
    const raw = sandbox.read("datos/ciudades.json");

    expect(raw.endsWith("\n")).toBe(true);
    expect(raw).toBe(`${JSON.stringify([makeCity()], null, 2)}\n`);
  });

  test("guarda una lista vacía sin inventar ciudades", async () => {
    await saveCities([makeCity()]);
    await saveCities([]);
    expect(await loadCities()).toEqual([]);
  });

  test("sobrescribe el archivo anterior", async () => {
    await saveCities([makeCity()]);
    await saveCities([makeCity({ id: 2, name: "Gatineau" })]);
    expect((await loadCities()).map((city) => city.name)).toEqual(["Gatineau"]);
  });
});
