import type { AppState } from "./Settings.ts";

export type MenuOption = {
  value: string;
  label: string;
  badge?: (state: AppState) => string;
  run: (state: AppState) => Promise<AppState>;
};
