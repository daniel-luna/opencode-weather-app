const RESET = "\u001b[0m";

const CODES = {
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  cyan: "\u001b[36m",
} as const;

export type PaintStyle = keyof typeof CODES;

const ENABLED =
  process.env.FORCE_COLOR === "0"
    ? false
    : process.env.NO_COLOR === undefined &&
      process.env.TERM !== "dumb" &&
      (process.env.FORCE_COLOR !== undefined || process.stdout.isTTY === true);

export function paint(text: string, ...styles: PaintStyle[]): string {
  if (!ENABLED || styles.length === 0) {
    return text;
  }
  const opening = styles.map((style) => CODES[style]).join("");
  return `${opening}${text}${RESET}`;
}

export function colorsEnabled(): boolean {
  return ENABLED;
}
