import type { City } from "../types/City.ts";
import { CITY_CANDIDATE_COUNT, GEOCODING_URL } from "../utils/constants.ts";

type GeocodingResponse = {
  results?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
    timezone?: string;
  }[];
};

export async function searchCities(query: string): Promise<City[]> {
  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", query);
  url.searchParams.set("count", String(CITY_CANDIDATE_COUNT));
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`el servicio de ciudades respondió ${response.status}`);
  }

  const data = (await response.json()) as GeocodingResponse;

  return (data.results ?? []).map((result) => ({
    id: result.id,
    name: result.name,
    admin1: result.admin1 ?? "",
    country: result.country ?? "",
    lat: result.latitude,
    lon: result.longitude,
    timezone: result.timezone ?? "GMT",
  }));
}
