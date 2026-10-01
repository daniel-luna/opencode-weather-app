import { afterEach, describe, expect, test, mock } from "bun:test";
import { renderMenu } from "../../src/presentation/menu.ts";
import type { AppState } from "../../src/types/Settings.ts";
import type { MenuOption } from "../../src/types/MenuOption.ts";
import { MENU_WIDTH } from "../../src/utils/constants.ts";
import { captureOutput } from "../helpers/captureOutput.ts";
import { makeState } from "../helpers/fixtures.ts";

const noop = async (state: AppState): Promise<AppState> => state;

afterEach(() => {
  mock.restore();
});

const OPTIONS: MenuOption[] = [
  { value: "1", label: "1. Clima de ciudad default", run: noop },
  { value: "2", label: "2. Clima de todas las ciudades", badge: (state) => `(${state.cities.length})`, run: noop },
  { value: "8", label: "8. Ajustes", badge: () => "(°C)", run: noop },
];

describe("presentation/renderMenu", () => {
  test("dibuja título, opciones en orden, salida y footer", () => {
    const out = captureOutput();
    renderMenu(OPTIONS, makeState({ cities: [{ id: 1, name: "Ottawa", admin1: "Ontario", country: "Canadá", lat: 1, lon: 2, timezone: "GMT" }] }));

    const lines = out.lines();
    expect(lines[0]).toBe("");
    expect(lines[1]).toBe("═".repeat(MENU_WIDTH));
    expect(lines[2]).toContain("WEATHER CLI");
    expect(lines[3]).toBe("═".repeat(MENU_WIDTH));
    expect(lines[4]).toBe("  1. Clima de ciudad default");
    expect(lines[5]).toBe("  2. Clima de todas las ciudades (1)");
    expect(lines[6]).toBe("  8. Ajustes (°C)");
    expect(lines[7]).toBe("  9. Salir");
    expect(lines[8]).toBe("═".repeat(MENU_WIDTH));
    expect(lines).toHaveLength(9);
  });

  test("la opción de salir es siempre la última y no tiene badge", () => {
    const out = captureOutput();
    renderMenu([], makeState({ settings: { defaultCityId: 4, unit: "fahrenheit" } }));

    const lines = out.lines();
    expect(lines[4]).toBe("  9. Salir");
    expect(lines[5]).toBe("═".repeat(MENU_WIDTH));
    expect(lines).toHaveLength(6);
  });

  test("el badge recibe el estado actual", () => {
    const seen: AppState[] = [];
    const out = captureOutput();
    renderMenu(
      [
        {
          value: "5",
          label: "5. Establecer ciudad default",
          badge: (state) => {
            seen.push(state);
            return `(${state.settings.defaultCityId ?? "-"})`;
          },
          run: noop,
        },
      ],
      makeState({ settings: { defaultCityId: 3, unit: "celsius" } }),
    );

    expect(seen).toHaveLength(1);
    expect(seen[0]?.settings.defaultCityId).toBe(3);
    expect(out.has("5. Establecer ciudad default (3)")).toBe(true);
  });

  test("sin acciones solo dibuja el marco y la salida", () => {
    const out = captureOutput();
    renderMenu([], makeState());

    const lines = out.lines();
    expect(lines).toHaveLength(6);
    expect(lines[0]).toBe("");
    expect(lines[1]).toBe("═".repeat(MENU_WIDTH));
    expect(lines[2]).toContain("WEATHER CLI");
    expect(lines[3]).toBe("═".repeat(MENU_WIDTH));
    expect(lines[4]).toBe("  9. Salir");
    expect(lines[5]).toBe("═".repeat(MENU_WIDTH));
  });
});
