import type { Ciudad, Clima, DiaPronostico, Unidad } from "./tipos.ts";

const GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const CANDIDATOS = 5;
const DIAS_PRONOSTICO = 7;

const DESCRIPCIONES: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna",
  55: "Llovizna intensa",
  56: "Llovizna helada ligera",
  57: "Llovizna helada",
  61: "Lluvia ligera",
  63: "Lluvia",
  65: "Lluvia intensa",
  66: "Lluvia helada ligera",
  67: "Lluvia helada",
  71: "Nieve ligera",
  73: "Nieve",
  75: "Nieve intensa",
  77: "Granos de nieve",
  80: "Chubascos ligeros",
  81: "Chubascos",
  82: "Chubascos violentos",
  85: "Chubascos de nieve",
  86: "Chubascos de nieve intensos",
  95: "Tormenta",
  96: "Tormenta con granizo",
  99: "Tormenta con granizo fuerte",
};

function descripcion(codigo: number | null | undefined): string {
  if (codigo === null || codigo === undefined) {
    return "Desconocido";
  }
  return DESCRIPCIONES[codigo] ?? "Desconocido";
}

type RespuestaGeocodificacion = {
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

type RespuestaForecast = {
  current?: {
    time?: string;
    temperature_2m?: number;
  };
  current_units?: {
    temperature_2m?: string;
  };
  daily?: {
    time?: (string | null)[];
    weather_code?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
  };
};

export async function buscarCiudades(nombre: string): Promise<Ciudad[]> {
  const url = new URL(GEOCODING);
  url.searchParams.set("name", nombre);
  url.searchParams.set("count", String(CANDIDATOS));
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`el servicio de ciudades respondió ${respuesta.status}`);
  }

  const datos = (await respuesta.json()) as RespuestaGeocodificacion;

  return (datos.results ?? []).map((r) => ({
    id: r.id,
    nombre: r.name,
    admin1: r.admin1 ?? "",
    pais: r.country ?? "",
    lat: r.latitude,
    lon: r.longitude,
    timezone: r.timezone ?? "GMT",
  }));
}

export async function obtenerClima(ciudad: Ciudad, unidad: Unidad): Promise<Clima> {
  const url = new URL(FORECAST);
  url.searchParams.set("latitude", String(ciudad.lat));
  url.searchParams.set("longitude", String(ciudad.lon));
  url.searchParams.set("current", "temperature_2m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weather_code");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", String(DIAS_PRONOSTICO));
  url.searchParams.set("temperature_unit", unidad);

  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`el servicio de clima respondió ${respuesta.status}`);
  }

  const datos = (await respuesta.json()) as RespuestaForecast;
  const temperatura = datos.current?.temperature_2m;
  if (temperatura === undefined) {
    throw new Error("la respuesta del clima no trae la temperatura actual");
  }

  const maximas = datos.daily?.temperature_2m_max ?? [];
  const minimas = datos.daily?.temperature_2m_min ?? [];
  const codigos = datos.daily?.weather_code ?? [];
  const fechas = datos.daily?.time ?? [];

  const dias: DiaPronostico[] = [];
  for (let i = 0; i < DIAS_PRONOSTICO; i++) {
    const fecha = fechas[i];
    if (fecha === undefined || fecha === null) {
      continue;
    }
    dias.push({
      fecha,
      maxima: maximas[i] ?? temperatura,
      minima: minimas[i] ?? temperatura,
      descripcion: descripcion(codigos[i]),
    });
  }

  return {
    temperatura,
    maxima: maximas[0] ?? temperatura,
    minima: minimas[0] ?? temperatura,
    etiquetaUnidad:
      datos.current_units?.temperature_2m ?? (unidad === "celsius" ? "°C" : "°F"),
    horaLocal: datos.current?.time ?? "",
    dias,
  };
}
