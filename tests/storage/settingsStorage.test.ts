import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  loadSettings,
  saveSettings,
  settingsFilePath,
} from "../../src/storage/settingsStorage.ts";
import { useSandbox, type Sandbox } from "../helpers/sandbox.ts";

const DEFAULTS = { defaultCityId: null, unit: "celsius" } as const;

let sandbox: Sandbox;

beforeEach(() => {
  sandbox = useSandbox();
});

afterEach(() => {
  sandbox.restore();
});

describe("storage/settingsFilePath", () => {
  test("expone la ruta del archivo de configuración", () => {
    expect(settingsFilePath()).toBe("datos/config.json");
  });
});

describe("storage/loadSettings", () => {
  test("devuelve los defaults si no hay ningún archivo", async () => {
    expect(await loadSettings()).toEqual(DEFAULTS);
  });

  test("lee config.json", async () => {
    await sandbox.write("datos/config.json", JSON.stringify({ defaultCityId: 42, unit: "fahrenheit" }));
    expect(await loadSettings()).toEqual({ defaultCityId: 42, unit: "fahrenheit" });
  });

  test("lee defaultCityId null sin inventar una ciudad", async () => {
    await sandbox.write("datos/config.json", JSON.stringify({ defaultCityId: null, unit: "celsius" }));
    expect(await loadSettings()).toEqual(DEFAULTS);
  });

  test("cae a celsius si la unidad es desconocida", async () => {
    await sandbox.write("datos/config.json", JSON.stringify({ defaultCityId: 1, unit: "kelvin" }));
    expect(await loadSettings()).toEqual({ defaultCityId: 1, unit: "celsius" });
  });

  test("cae a null si defaultCityId no es un número", async () => {
    await sandbox.write("datos/config.json", JSON.stringify({ defaultCityId: "7", unit: "celsius" }));
    expect(await loadSettings()).toEqual(DEFAULTS);
  });

  test("degrada a defaults con config.json corrupto", async () => {
    await sandbox.write("datos/config.json", "no soy json {{{");
    expect(await loadSettings()).toEqual(DEFAULTS);
  });

  test("degrada a defaults si config.json no es un objeto", async () => {
    await sandbox.write("datos/config.json", "[1,2,3]");
    expect(await loadSettings()).toEqual(DEFAULTS);

    await sandbox.write("datos/config.json", '"texto"');
    expect(await loadSettings()).toEqual(DEFAULTS);
  });

  test("cae al archivo legacy cuando config.json no existe", async () => {
    await sandbox.write(
      "datos/ciudades.json",
      JSON.stringify({
        ciudadDefaultId: 7,
        ciudades: [],
        unidad: "fahrenheit",
      }),
    );
    expect(await loadSettings()).toEqual({ defaultCityId: 7, unit: "fahrenheit" });
  });

  test("el fallback legacy no pisa un config.json existente", async () => {
    await sandbox.write(
      "datos/ciudades.json",
      JSON.stringify({ ciudadDefaultId: 7, ciudades: [], unidad: "fahrenheit" }),
    );
    await sandbox.write("datos/config.json", JSON.stringify({ defaultCityId: 1, unit: "celsius" }));

    expect(await loadSettings()).toEqual({ defaultCityId: 1, unit: "celsius" });
  });

  test("el fallback legacy degrada a defaults con ciudades.json corrupto", async () => {
    await sandbox.write("datos/ciudades.json", "{{{");
    expect(await loadSettings()).toEqual(DEFAULTS);
  });

  test("el fallback legacy ignora un array de ciudades plano", async () => {
    await sandbox.write("datos/ciudades.json", JSON.stringify([{ id: 1, name: "Ottawa" }]));
    expect(await loadSettings()).toEqual(DEFAULTS);
  });
});

describe("storage/saveSettings", () => {
  test("crea el directorio datos/ si falta", async () => {
    expect(sandbox.exists("datos")).toBe(false);
    await saveSettings({ defaultCityId: 1, unit: "celsius" });
    expect(sandbox.exists("datos/config.json")).toBe(true);
  });

  test("escribe JSON indentado con newline final y hace round-trip", async () => {
    await saveSettings({ defaultCityId: 5, unit: "fahrenheit" });

    expect(sandbox.read("datos/config.json")).toBe(
      `${JSON.stringify({ defaultCityId: 5, unit: "fahrenheit" }, null, 2)}\n`,
    );
    expect(await loadSettings()).toEqual({ defaultCityId: 5, unit: "fahrenheit" });
  });

  test("guarda la lista de ciudades en su propio archivo", async () => {
    await saveSettings({ defaultCityId: 1, unit: "celsius" });
    expect(sandbox.exists("datos/ciudades.json")).toBe(false);
  });
});
