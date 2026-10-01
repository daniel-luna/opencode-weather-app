import { describe, expect, test } from "bun:test";
import type { MenuOption } from "../../src/types/MenuOption.ts";
import { makeCity, makeState } from "../helpers/fixtures.ts";

describe("types/MenuOption", () => {
  test("badge es opcional", () => {
    const withoutBadge: MenuOption = {
      value: "1",
      label: "1. Clima de ciudad default",
      run: async (state) => state,
    };

    expect("badge" in withoutBadge).toBe(false);
  });

  test("run recibe el AppState y devuelve un AppState", async () => {
    const option: MenuOption = {
      value: "2",
      label: "2. Clima de todas las ciudades",
      badge: (state) => `(${state.cities.length})`,
      run: async (state) => state,
    };
    const state = makeState({ cities: [makeCity(), makeCity({ id: 2 })] });

    expect(option.badge?.(state)).toBe("(2)");
    expect(await option.run(state)).toBe(state);
  });
});
