import { mkdir } from "node:fs/promises";
import type { Ciudad, Config } from "./tipos.ts";

const DIRECTORIO = "datos";
const ARCHIVO = `${DIRECTORIO}/ciudades.json`;

export function rutaArchivo(): string {
  return ARCHIVO;
}

function configInicial(): Config {
  return { ciudadDefaultId: null, ciudades: [], unidad: "celsius" };
}

function esCiudad(valor: unknown): valor is Ciudad {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }
  const c = valor as Partial<Ciudad>;
  return (
    typeof c.id === "number" &&
    typeof c.nombre === "string" &&
    typeof c.lat === "number" &&
    typeof c.lon === "number"
  );
}

export async function cargar(): Promise<Config> {
  const archivo = Bun.file(ARCHIVO);
  if (!(await archivo.exists())) {
    return configInicial();
  }

  let leido: unknown;
  try {
    leido = await archivo.json();
  } catch {
    return configInicial();
  }

  if (typeof leido !== "object" || leido === null) {
    return configInicial();
  }

  const datos = leido as Partial<Config>;
  const ciudades = Array.isArray(datos.ciudades) ? datos.ciudades.filter(esCiudad) : [];
  const guardado = datos.ciudadDefaultId;
  const ciudadDefaultId =
    typeof guardado === "number" && ciudades.some((c) => c.id === guardado) ? guardado : null;

  return {
    ciudadDefaultId,
    ciudades,
    unidad: datos.unidad === "fahrenheit" ? "fahrenheit" : "celsius",
  };
}

export async function guardar(config: Config): Promise<void> {
  await mkdir(DIRECTORIO, { recursive: true });
  await Bun.write(ARCHIVO, `${JSON.stringify(config, null, 2)}\n`);
}
