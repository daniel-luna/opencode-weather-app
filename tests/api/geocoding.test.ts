import { afterEach, describe, expect, test } from "bun:test";
import { searchCities } from "../../src/api/geocoding.ts";
import { jsonResponse, stubFetch, type FetchStub } from "../helpers/fetchStub.ts";

let stub: FetchStub | null = null;

function stubGeocoding(body: unknown, status = 200): FetchStub {
  stub = stubFetch(() => jsonResponse(body, status));
  return stub;
}

afterEach(() => {
  stub?.restore();
  stub = null;
});

describe("api/searchCities", () => {
  test("consulta la URL de OpenMeteo con los parámetros esperados", async () => {
    const fetchStub = stubGeocoding({ results: [] });
    await searchCities("Ottawa");

    expect(fetchStub.callCount()).toBe(1);
    expect(fetchStub.param("name")).toBe("Ottawa");
    expect(fetchStub.param("count")).toBe("5");
    expect(fetchStub.param("language")).toBe("es");
    expect(fetchStub.param("format")).toBe("json");
    expect(fetchStub.lastUrl().hostname).toBe("geocoding-api.open-meteo.com");
  });

  test("mapea los resultados al tipo City", async () => {
    stubGeocoding({
      results: [
        {
          id: 3031657,
          name: "Ottawa",
          latitude: 45.41117,
          longitude: -75.69812,
          country: "Canadá",
          admin1: "Ontario",
          timezone: "America/Toronto",
        },
      ],
    });

    expect(await searchCities("ottawa")).toEqual([
      {
        id: 3031657,
        name: "Ottawa",
        admin1: "Ontario",
        country: "Canadá",
        lat: 45.41117,
        lon: -75.69812,
        timezone: "America/Toronto",
      },
    ]);
  });

  test("rellena admin1, country y timezone ausentes", async () => {
    stubGeocoding({ results: [{ id: 1, name: "Springfield", latitude: 1, longitude: 2 }] });

    expect(await searchCities("springfield")).toEqual([
      {
        id: 1,
        name: "Springfield",
        admin1: "",
        country: "",
        lat: 1,
        lon: 2,
        timezone: "GMT",
      },
    ]);
  });

  test("devuelve lista vacía cuando la API responde 200 sin results", async () => {
    stubGeocoding({ generationtime_ms: 0.5 });
    expect(await searchCities("zzzz")).toEqual([]);
  });

  test("propaga el error si la API no responde bien", async () => {
    stubGeocoding({ error: true }, 500);
    await expect(searchCities("Ottawa")).rejects.toThrow(
      "el servicio de ciudades respondió 500",
    );
  });
});
