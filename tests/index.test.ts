import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { runCli } from "./helpers/cliRunner.ts";
import { useSandbox, type Sandbox } from "./helpers/sandbox.ts";

const OTTAWA_ID = 3031657;
const GATINEAU_ID = 2660646;

let sandbox: Sandbox;

beforeEach(() => {
  sandbox = useSandbox();
});

afterEach(() => {
  sandbox.restore();
});

async function seed(
  cities: unknown[],
  settings: { defaultCityId: number | null; unit: string },
): Promise<void> {
  await sandbox.write("datos/ciudades.json", `${JSON.stringify(cities, null, 2)}\n`);
  await sandbox.write("datos/config.json", `${JSON.stringify(settings, null, 2)}\n`);
}

const OTTAWA = {
  id: OTTAWA_ID,
  name: "Ottawa",
  admin1: "Ontario",
  country: "Canadá",
  lat: 45.41117,
  lon: -75.69812,
  timezone: "America/Toronto",
};

describe("e2e/CLI", () => {
  test("arranca en una instalación nueva informando dónde guarda los datos", async () => {
    const { stdout, exitCode } = await runCli("9\n", sandbox.dir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("WEATHER CLI");
    expect(stdout).toContain("Tus ciudades se guardan en datos/ciudades.json");
    expect(stdout).toContain("1. Clima de ciudad default");
    expect(stdout).toContain("2. Clima de todas las ciudades (0)");
    expect(stdout).toContain("3. Buscar y agregar ciudad");
    expect(stdout).toContain("4. Eliminar ciudad");
    expect(stdout).toContain("5. Establecer ciudad default");
    expect(stdout).toContain("8. Ajustes (°C)");
    expect(stdout).toContain("9. Salir");
    expect(stdout).toContain("¡Hasta luego!");
    expect(sandbox.exists("datos")).toBe(false);
  }, 20_000);

  test("el menú real respeta el orden y los números del README", async () => {
    const { stdout } = await runCli("9\n", sandbox.dir);

    const rows = stdout.split("\n").filter((line) => /^ {2}\d\. /.test(line));
    expect(rows).toEqual([
      "  1. Clima de ciudad default",
      "  2. Clima de todas las ciudades (0)",
      "  3. Buscar y agregar ciudad",
      "  4. Eliminar ciudad",
      "  5. Establecer ciudad default",
      "  8. Ajustes (°C)",
      "  9. Salir",
    ]);
  }, 20_000);

  test("recorre agregar ciudad, clima y ajustes, y persiste el resultado", async () => {
    const script = ["3", "Ottawa", "2", "s", "1", "8", "9", ""].join("\n");
    const { stdout, exitCode } = await runCli(script, sandbox.dir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Nombre de la ciudad:");
    expect(stdout).toContain("Encontré varias, elegí una:");
    expect(stdout).toContain("✓ Ciudad agregada: Gatineau — Quebec, Canadá");
    expect(stdout).toContain("Gatineau es ahora la ciudad default.");
    expect(stdout).toContain("Gatineau — Quebec, Canadá  (2026-10-01 12:00)");
    expect(stdout).toContain("Ahora: 12.3 °C");
    expect(stdout).toContain("Próximos 7 días:");
    expect(stdout).toContain("✓ Unidad de temperatura: °F.");
    expect(stdout).toContain("¡Hasta luego!");

    expect(sandbox.readJson("datos/ciudades.json")).toEqual([
      {
        id: GATINEAU_ID,
        name: "Gatineau",
        admin1: "Quebec",
        country: "Canadá",
        lat: 45.34145,
        lon: -75.72561,
        timezone: "America/Toronto",
      },
    ]);
    expect(sandbox.readJson("datos/config.json")).toEqual({
      defaultCityId: GATINEAU_ID,
      unit: "fahrenheit",
    });
  }, 20_000);

  test("retoma el estado guardado, valida la opción y acepta 0 como salida", async () => {
    await seed([OTTAWA, { ...OTTAWA, id: GATINEAU_ID, name: "Gatineau" }], {
      defaultCityId: OTTAWA_ID,
      unit: "celsius",
    });

    const { stdout, exitCode } = await runCli(["1", "7", "0", ""].join("\n"), sandbox.dir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("Ottawa — Ontario, Canadá  (2026-10-01 12:00)");
    expect(stdout).toContain("Ahora: 12.3 °C");
    expect(stdout).toContain("✗ Opción no válida.");
    expect(stdout).not.toContain("Tus ciudades se guardan en");
    expect(sandbox.readJson("datos/config.json")).toEqual({
      defaultCityId: OTTAWA_ID,
      unit: "celsius",
    });
  }, 20_000);

  test("avisa que no encontró la ciudad y no toca los archivos", async () => {
    const { stdout, exitCode } = await runCli(["3", "zzzzz", "9", ""].join("\n"), sandbox.dir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('! No se encontró ninguna ciudad llamada "zzzzz".');
    expect(sandbox.exists("datos/ciudades.json")).toBe(false);
    expect(sandbox.exists("datos/config.json")).toBe(false);
  }, 20_000);

  test("falla con código 1 si se termina la entrada por teclado", async () => {
    const { stdout, exitCode } = await runCli("", sandbox.dir);

    expect(exitCode).toBe(1);
    expect(stdout).toContain("se terminó la entrada por teclado");
  }, 20_000);
});
