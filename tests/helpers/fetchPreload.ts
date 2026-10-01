const GEOCODING = "geocoding-api.open-meteo.com";
const FORECAST = "api.open-meteo.com";

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const OTTAWA = {
  id: 3031657,
  name: "Ottawa",
  latitude: 45.41117,
  longitude: -75.69812,
  country: "Canadá",
  admin1: "Ontario",
  timezone: "America/Toronto",
};

const Gatineau = {
  id: 2660646,
  name: "Gatineau",
  latitude: 45.34145,
  longitude: -75.72561,
  country: "Canadá",
  admin1: "Quebec",
  timezone: "America/Toronto",
};

const DAILY_TIMES = [
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
];

const WEATHER_CODES = [0, 1, 2, 3, 61, 63, 95];

globalThis.fetch = (async (input: string | URL | Request): Promise<Response> => {
  const raw =
    typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  const url = new URL(raw);

  if (url.hostname.includes(GEOCODING)) {
    const name = url.searchParams.get("name") ?? "";
    if (name.toLowerCase().startsWith("zz")) {
      return json({ generationtime_ms: 0.2 });
    }
    return json({ generationtime_ms: 0.4, results: [OTTAWA, Gatineau] });
  }

  if (url.hostname.includes(FORECAST)) {
    const fahrenheit = url.searchParams.get("temperature_unit") === "fahrenheit";
    const scale = fahrenheit ? 1.8 : 1;
    return json({
      timezone: "America/Toronto",
      current: { time: "2026-10-01T12:00", temperature_2m: 12.3 * scale },
      current_units: { temperature_2m: fahrenheit ? "°F" : "°C" },
      daily: {
        time: DAILY_TIMES,
        weather_code: WEATHER_CODES,
        temperature_2m_max: [15, 16, 14, 12, 13, 11, 17].map((value) => value * scale),
        temperature_2m_min: [5, 6, 4, 3, 7, 2, 9].map((value) => value * scale),
      },
    });
  }

  throw new Error(`preload de tests: request no permitido a ${url.origin}`);
}) as typeof fetch;
