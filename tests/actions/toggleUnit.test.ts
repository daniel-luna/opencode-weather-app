import { afterEach, beforeEach, describe, expect, test, mock } from "bun:test";
import { toggleUnit } from "../../src/actions/toggleUnit.ts";
import type { Settings } from "../../src/types/Settings.ts";
import { captureOutput } from "../helpers/captureOutput.ts";
import { makeCity, makeState } from "../helpers/fixtures.ts";
import { useSandbox, type Sandbox } from "../helpers/sandbox.ts";

const SETTINGS_FILE = "datos/config.json";
const CITIES_FILE = "datos/ciudades.json";

let sandbox: Sandbox;

function readSettings(): Settings {
  return sandbox.readJson(SETTINGS_FILE) as Settings;
}

beforeEach(() => {
  mock.restore();
  sandbox = useSandbox();
});

afterEach(() => {
  mock.restore();
  sandbox.restore();
});

describe("actions/toggleUnit", () => {
  test("pasa de celsius a fahrenheit y persiste", async () => {
    const out = captureOutput();

    const state = await toggleUnit(makeState());

    expect(state.settings.unit).toBe("fahrenheit");
    expect(readSettings()).toEqual({ defaultCityId: null, unit: "fahrenheit" });
    expect(out.has("✓ Unidad de temperatura: °F.")).toBe(true);
  });

  test("vuelve de fahrenheit a celsius", async () => {
    captureOutput();
    const state = await toggleUnit(makeState({ settings: { defaultCityId: null, unit: "fahrenheit" } }));

    expect(state.settings.unit).toBe("celsius");
    expect(readSettings()).toEqual({ defaultCityId: null, unit: "celsius" });
  });

  test("no toca la ciudad default ni el archivo de ciudades", async () => {
    captureOutput();
    const ottawa = makeCity();
    await sandbox.write(CITIES_FILE, `${JSON.stringify([ottawa], null, 2)}\n`);

    const state = await toggleUnit(
      makeState({ cities: [ottawa], settings: { defaultCityId: ottawa.id, unit: "celsius" } }),
    );

    expect(state.settings.defaultCityId).toBe(ottawa.id);
    expect(readSettings()).toEqual({ defaultCityId: ottawa.id, unit: "fahrenheit" });
  });

  test("no muta el estado recibido", async () => {
    captureOutput();
    const before = makeState();
    const after = await toggleUnit(before);

    expect(after).not.toBe(before);
    expect(before.settings.unit).toBe("celsius");
  });
});
