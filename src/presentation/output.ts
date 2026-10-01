import { MENU_WIDTH } from "../utils/constants.ts";
import { paint } from "../utils/colors.ts";

function rule(): string {
  return paint("═".repeat(MENU_WIDTH), "cyan");
}

export function blank(): void {
  console.log();
}

export function printTitle(): void {
  console.log(rule());
  console.log(paint("         WEATHER CLI", "cyan", "bold"));
  console.log(rule());
}

export function printFooter(): void {
  console.log(rule());
}

export function info(message: string): void {
  console.log(`  ${message}`);
}

export function success(message: string): void {
  console.log(paint(`  ✓ ${message}`, "green"));
}

export function printError(message: string): void {
  console.log(paint(`  ✗ ${message}`, "red"));
}

export function warning(message: string): void {
  console.log(paint(`  ! ${message}`, "yellow"));
}

export function printOption(label: string, value?: string): void {
  const painted = paint(label, "cyan");
  console.log(value === undefined ? `  ${painted}` : `  ${painted} ${paint(value, "bold")}`);
}
