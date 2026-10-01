import { afterEach, describe, expect, test } from "bun:test";
import { makeCity } from "../helpers/fixtures.ts";
import {
  describeError,
  formatLocation,
  formatTemperature,
  shortDate,
  unitLabel,
} from "../../src/utils/format.ts";

const savedTZ = process.env.TZ;

afterEach(() => {
  if (savedTZ === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = savedTZ;
  }
});

describe("describeError", () => {
  test("usa el message de un Error", () => {
    expect(describeError(new Error("se terminó la entrada por teclado"))).toBe(
      "se terminó la entrada por teclado",
    );
  });

  test("stringifica lo que no sea Error", () => {
    expect(describeError("texto")).toBe("texto");
    expect(describeError(404)).toBe("404");
    expect(describeError(null)).toBe("null");
    expect(describeError(undefined)).toBe("undefined");
  });
});

describe("formatLocation", () => {
  test("une provincia y país", () => {
    expect(formatLocation(makeCity())).toBe(" — Ontario, Canadá");
  });

  test("omite la provincia si está vacía", () => {
    expect(formatLocation(makeCity({ admin1: "" }))).toBe(" — Canadá");
  });

  test("omite el país si está vacío", () => {
    expect(formatLocation(makeCity({ country: "" }))).toBe(" — Ontario");
  });

  test("devuelve vacío si no hay ubicación", () => {
    expect(formatLocation(makeCity({ admin1: "", country: "" }))).toBe("");
  });
});

describe("unitLabel", () => {
  test("mapea las dos unidades soportadas", () => {
    expect(unitLabel("celsius")).toBe("°C");
    expect(unitLabel("fahrenheit")).toBe("°F");
  });
});

describe("formatTemperature", () => {
  test("concatena valor y unidad", () => {
    expect(formatTemperature(12.3, "°C")).toBe("12.3 °C");
    expect(formatTemperature(-5, "°F")).toBe("-5 °F");
  });
});

describe("shortDate", () => {
  test("formatea en español con día y mes de dos dígitos", () => {
    expect(shortDate("2026-10-01")).toBe("jue, 01 oct");
    expect(shortDate("2026-01-05")).toBe("lun, 05 ene");
  });

  test("no cambia de día para usuarios al oeste de UTC", () => {
    process.env.TZ = "America/Los_Angeles";
    expect(shortDate("2026-10-01")).toBe("jue, 01 oct");
    process.env.TZ = "Pacific/Auckland";
    expect(shortDate("2026-10-01")).toBe("jue, 01 oct");
  });

  test("todas las fechas del pronóstico ocupan el mismo ancho", () => {
    const dates = ["2026-10-01", "2026-10-04", "2026-12-31", "2026-01-01"];
    const widths = new Set(dates.map((date) => shortDate(date).length));
    expect(widths.size).toBe(1);
  });
});
