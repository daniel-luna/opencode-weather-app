const RESET = "\u001b[0m";

const CODIGOS = {
  negrita: "\u001b[1m",
  tenue: "\u001b[2m",
  rojo: "\u001b[31m",
  verde: "\u001b[32m",
  amarillo: "\u001b[33m",
  cian: "\u001b[36m",
} as const;

export type Estilo = keyof typeof CODIGOS;

const COLOR_ACTIVO =
  process.env.FORCE_COLOR === "0"
    ? false
    : process.env.NO_COLOR === undefined &&
      process.env.TERM !== "dumb" &&
      (process.env.FORCE_COLOR !== undefined || process.stdout.isTTY === true);

export function pintar(texto: string, ...estilos: Estilo[]): string {
  if (!COLOR_ACTIVO || estilos.length === 0) {
    return texto;
  }
  const apertura = estilos.map((estilo) => CODIGOS[estilo]).join("");
  return `${apertura}${texto}${RESET}`;
}

export function colorActivo(): boolean {
  return COLOR_ACTIVO;
}