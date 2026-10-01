import type { AppState } from "../types/Settings.ts";
import type { MenuOption } from "../types/MenuOption.ts";
import { blank, printFooter, printOption, printTitle } from "./output.ts";

export function renderMenu(options: MenuOption[], state: AppState): void {
  blank();
  printTitle();
  for (const option of options) {
    printOption(option.label, option.badge?.(state));
  }
  printFooter();
}
