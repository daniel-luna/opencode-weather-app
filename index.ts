import { buscarCiudades, obtenerClima } from "./src/api.ts";
import { cargar, guardar, rutaArchivo } from "./src/almacen.ts";
import { pintar } from "./src/color.ts";
import {
  aviso,
  cerrarEntrada,
  confirmar,
  error,
  exito,
  hueco,
  info,
  iniciarEntrada,
  mostrarMenu,
  pie,
  preguntar,
  preguntarObligatorio,
  titulo,
} from "./src/ui.ts";
import type { Ciudad, Config, DiaPronostico } from "./src/tipos.ts";

function detalle(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function lugar(ciudad: Ciudad): string {
  const partes = [ciudad.admin1, ciudad.pais].filter((p) => p !== "");
  return partes.length > 0 ? ` — ${partes.join(", ")}` : "";
}

function temp(valor: number, unidad: string): string {
  return pintar(`${valor} ${unidad}`, "amarillo");
}

function fechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function tablaPronostico(dias: DiaPronostico[], unidad: string): void {
  if (dias.length === 0) {
    return;
  }
  info(pintar("  Próximos 7 días:", "negrita"));
  const anchoFecha = Math.max(...dias.map((d) => fechaCorta(d.fecha).length));
  dias.forEach((dia, indice) => {
    const rotulo = indice === 0 ? "hoy" : fechaCorta(dia.fecha);
    const fecha = pintar(rotulo.padEnd(anchoFecha), "tenue");
    const cielo = dia.descripcion.padEnd(23);
    info(`    ${fecha}  ${cielo}  ${temp(dia.maxima, unidad)} / ${temp(dia.minima, unidad)}`);
  });
}

function listarCiudades(ciudades: Ciudad[], config: Config): void {
  ciudades.forEach((ciudad, indice) => {
    const marca = ciudad.id === config.ciudadDefaultId ? pintar("  (default)", "tenue") : "";
    const numero = pintar(`${indice + 1}.`, "cian");
    info(`${numero} ${pintar(ciudad.nombre, "negrita")}${lugar(ciudad)}${marca}`);
  });
}

async function elegirDeLista(
  ciudades: Ciudad[],
  config: Config,
  encabezado: string,
): Promise<Ciudad | null> {
  hueco();
  info(encabezado);
  listarCiudades(ciudades, config);
  const respuesta = await preguntar("  Número (0 para cancelar): ");
  if (respuesta === "" || respuesta === "0") {
    return null;
  }
  const numero = Number(respuesta);
  if (!Number.isInteger(numero) || numero < 1 || numero > ciudades.length) {
    error("Opción inválida.");
    return null;
  }
  return ciudades[numero - 1] ?? null;
}

async function mostrarClima(ciudad: Ciudad, config: Config): Promise<void> {
  const encabezado = pintar(ciudad.nombre, "negrita");
  try {
    const clima = await obtenerClima(ciudad, config.unidad);
    const hora =
      clima.horaLocal === "" ? "" : pintar(`  (${clima.horaLocal.replace("T", " ")})`, "tenue");
    info(`${encabezado}${lugar(ciudad)}${hora}`);
    info(`  Ahora: ${temp(clima.temperatura, clima.etiquetaUnidad)}`);
    info(
      `  Hoy:   máx ${temp(clima.maxima, clima.etiquetaUnidad)} / mín ${temp(clima.minima, clima.etiquetaUnidad)}`,
    );
    tablaPronostico(clima.dias, clima.etiquetaUnidad);
  } catch (e) {
    info(`${encabezado}${lugar(ciudad)}`);
    error(`No se pudo obtener el clima: ${detalle(e)}`);
  }
}

async function opcionClimaDefault(config: Config): Promise<void> {
  const ciudad = config.ciudades.find((c) => c.id === config.ciudadDefaultId);
  hueco();
  if (ciudad === undefined) {
    aviso("No tenés ciudad default. Establecela con la opción 5.");
    return;
  }
  await mostrarClima(ciudad, config);
}

async function opcionTodasLasCiudades(config: Config): Promise<void> {
  hueco();
  if (config.ciudades.length === 0) {
    aviso("No tenés ciudades guardadas. Agregá una con la opción 3.");
    return;
  }
  for (const ciudad of config.ciudades) {
    await mostrarClima(ciudad, config);
    hueco();
  }
}

async function opcionAgregarCiudad(config: Config): Promise<Config> {
  hueco();
  const nombre = await preguntarObligatorio("  Nombre de la ciudad: ");

  let candidatas: Ciudad[];
  try {
    candidatas = await buscarCiudades(nombre);
  } catch (e) {
    error(`No se pudo buscar la ciudad: ${detalle(e)}`);
    return config;
  }

  if (candidatas.length === 0) {
    aviso(`No se encontró ninguna ciudad llamada "${nombre}".`);
    return config;
  }

  const unica = candidatas.length === 1 ? candidatas[0] : undefined;
  const elegida =
    unica ?? (await elegirDeLista(candidatas, config, "Encontré varias, elegí una:"));

  if (elegida === null || elegida === undefined) {
    return config;
  }
  const ciudad = elegida;

  if (config.ciudades.some((c) => c.id === ciudad.id)) {
    aviso(`${ciudad.nombre} ya está en tu lista.`);
    return config;
  }

  const ciudades = [...config.ciudades, ciudad];
  let ciudadDefaultId = config.ciudadDefaultId;

  if (ciudadDefaultId === null) {
    exito(`Ciudad agregada: ${ciudad.nombre}${lugar(ciudad)}`);
    if (await confirmar("  ¿Establecerla como ciudad default? (s/N): ")) {
      ciudadDefaultId = ciudad.id;
      exito(`${ciudad.nombre} es ahora la ciudad default.`);
    }
  } else {
    exito(`Ciudad agregada: ${ciudad.nombre}${lugar(ciudad)}`);
  }

  return { ...config, ciudades, ciudadDefaultId };
}

async function opcionEliminarCiudad(config: Config): Promise<Config> {
  hueco();
  if (config.ciudades.length === 0) {
    aviso("No hay ciudades para eliminar. Agregá una con la opción 3.");
    return config;
  }
  if (config.ciudades.length === 1) {
    aviso("Debe quedar al menos una ciudad guardada.");
    return config;
  }

  const aBorrar = await elegirDeLista(config.ciudades, config, "Elegí la ciudad a eliminar:");
  if (aBorrar === null) {
    return config;
  }

  const ciudades = config.ciudades.filter((c) => c.id !== aBorrar.id);
  const ciudadDefaultId = config.ciudadDefaultId === aBorrar.id ? null : config.ciudadDefaultId;

  if (ciudadDefaultId === null && config.ciudadDefaultId !== null) {
    aviso(`${aBorrar.nombre} era la ciudad default. Usá la opción 5 para elegir otra.`);
  }
  exito(`Ciudad eliminada: ${aBorrar.nombre}. Quedan ${ciudades.length}.`);

  return { ...config, ciudades, ciudadDefaultId };
}

async function opcionDefault(config: Config): Promise<Config> {
  hueco();
  if (config.ciudades.length === 0) {
    aviso("No tenés ciudades guardadas. Agregá una con la opción 3.");
    return config;
  }

  const elegida = await elegirDeLista(config.ciudades, config, "Elegí la ciudad default:");
  if (elegida === null) {
    return config;
  }
  const ciudad = elegida;

  exito(`Ciudad default: ${ciudad.nombre}${lugar(ciudad)}`);
  return { ...config, ciudadDefaultId: ciudad.id };
}

function opcionAjustes(config: Config): Config {
  const unidad = config.unidad === "celsius" ? "fahrenheit" : "celsius";
  hueco();
  exito(`Unidad de temperatura: ${unidad === "celsius" ? "°C" : "°F"}.`);
  return { ...config, unidad };
}

async function main(): Promise<void> {
  iniciarEntrada();
  const config = await cargar();
  let actual = config;

  if (config.ciudades.length === 0 && config.ciudadDefaultId === null) {
    hueco();
    info(`Tus ciudades se guardan en ${rutaArchivo()}`);
  }

  for (;;) {
    mostrarMenu(actual);
    const opcion = await preguntar("  Selecciona una opción: ");

    switch (opcion) {
      case "1": {
        await opcionClimaDefault(actual);
        break;
      }
      case "2": {
        await opcionTodasLasCiudades(actual);
        break;
      }
      case "3": {
        const nuevo = await opcionAgregarCiudad(actual);
        if (nuevo !== actual) {
          actual = nuevo;
          await guardar(actual);
        }
        break;
      }
      case "4": {
        const nuevo = await opcionEliminarCiudad(actual);
        if (nuevo !== actual) {
          actual = nuevo;
          await guardar(actual);
        }
        break;
      }
      case "5": {
        const nuevo = await opcionDefault(actual);
        if (nuevo !== actual) {
          actual = nuevo;
          await guardar(actual);
        }
        break;
      }
      case "8": {
        const nuevo = opcionAjustes(actual);
        if (nuevo !== actual) {
          actual = nuevo;
          await guardar(actual);
        }
        break;
      }
      case "9":
      case "0": {
        hueco();
        info("¡Hasta luego!");
        return;
      }
      default: {
        hueco();
        error("Opción no válida.");
      }
    }
  }
}

main()
  .catch((e) => {
    hueco();
    error(detalle(e));
    process.exitCode = 1;
  })
  .finally(() => {
    cerrarEntrada();
  });
