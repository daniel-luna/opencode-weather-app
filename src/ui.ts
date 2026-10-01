import { createInterface, type Interface } from "node:readline/promises";
import { pintar } from "./color.ts";
import type { Config } from "./tipos.ts";

const ANCHO = 39;

type Resolver = (linea: string) => void;

let interfaz: Interface | null = null;
let cola: string[] = [];
let esperando: Resolver | null = null;
let entradaCerrada = false;

function linea(): string {
  return pintar("═".repeat(ANCHO), "cian");
}

function bombear(): void {
  if (esperando !== null && cola.length > 0) {
    const resolver = esperando;
    const pendiente = cola.shift() ?? "";
    esperando = null;
    resolver(pendiente);
  }
}

function cerrarPorFin(): void {
  entradaCerrada = true;
  const resolver = esperando;
  if (resolver !== null) {
    esperando = null;
    resolver("");
  }
}

export function iniciarEntrada(): void {
  if (interfaz !== null) {
    return;
  }
  interfaz = createInterface({ input: process.stdin, output: process.stdout });
  interfaz.on("line", (recibida: string) => {
    cola.push(recibida.trim());
    bombear();
  });
  interfaz.on("close", () => {
    cerrarPorFin();
  });
}

export function cerrarEntrada(): void {
  interfaz?.close();
  interfaz = null;
}

export function hueco(): void {
  console.log();
}

export function titulo(): void {
  console.log(linea());
  console.log(pintar("         WEATHER CLI", "cian", "negrita"));
  console.log(linea());
}

export function pie(): void {
  console.log(linea());
}

export function info(mensaje: string): void {
  console.log(`  ${mensaje}`);
}

export function exito(mensaje: string): void {
  console.log(pintar(`  ✓ ${mensaje}`, "verde"));
}

export function error(mensaje: string): void {
  console.log(pintar(`  ✗ ${mensaje}`, "rojo"));
}

export function aviso(mensaje: string): void {
  console.log(pintar(`  ! ${mensaje}`, "amarillo"));
}

export function opcion(texto: string, valor?: string): void {
  const etiquetado = pintar(texto, "cian");
  console.log(valor === undefined ? `  ${etiquetado}` : `  ${etiquetado} ${pintar(valor, "negrita")}`);
}

export function mostrarMenu(config: Config): void {
  const unidad = config.unidad === "celsius" ? "°C" : "°F";
  hueco();
  titulo();
  opcion("1. Clima de ciudad default");
  opcion("2. Clima de todas las ciudades", `(${config.ciudades.length})`);
  opcion("3. Buscar y agregar ciudad");
  opcion("4. Eliminar ciudad");
  opcion("5. Establecer ciudad default");
  opcion("8. Ajustes", `(${unidad})`);
  opcion("9. Salir");
  pie();
}

export function preguntar(mensaje: string): Promise<string> {
  process.stdout.write(pintar(mensaje, "cian"));
  if (cola.length > 0) {
    return Promise.resolve(cola.shift() ?? "");
  }
  if (entradaCerrada) {
    return Promise.reject(new Error("se terminó la entrada por teclado"));
  }
  return new Promise<string>((resolve) => {
    esperando = resolve;
  });
}

export async function preguntarObligatorio(mensaje: string): Promise<string> {
  for (;;) {
    const respuesta = await preguntar(mensaje);
    if (respuesta !== "") {
      return respuesta;
    }
    if (entradaCerrada) {
      throw new Error("se terminó la entrada por teclado");
    }
    aviso("Escribí algo, o Ctrl+C para salir.");
  }
}

export async function confirmar(mensaje: string): Promise<boolean> {
  const respuesta = (await preguntar(mensaje)).toLowerCase();
  return respuesta === "s" || respuesta === "si" || respuesta === "sí" || respuesta === "y";
}
