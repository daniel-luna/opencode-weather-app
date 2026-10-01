# AGENTS.md

## What this is

Course project (`02-weather`): a **Bun.js console weather CLI** on the OpenMeteo
API, shipped as a compiled executable. `README.md` is the original spec and is
written in Spanish.

The app is implemented. All 7 menu options from the README work, with real
persistence.

`references/file-system.md` is the canonical target layout. `src/` now matches
it, and identifiers are fully in English (only user-facing strings are Spanish).

## Layout

Layered, by responsibility. Dependencies point inward: `types/` and `utils/`
import nothing from the app; `api/`, `storage/` and `presentation/` are
independent leaves; `actions/` composes them; `index.ts` wires it all.

```
src/index.ts        composition root: carga estado, buildMenuOptions(), loop de dispatch
src/types/          City, Weather (+ ForecastDay), Settings (+ AppState, TemperatureUnit), MenuOption
src/utils/          colors.ts (paint/colorsEnabled), constants.ts (URLs, WMO, paths), format.ts
src/api/            geocoding.ts → searchCities(), weather.ts → fetchWeather()
src/storage/        citiesStorage.ts (loadCities/saveCities), settingsStorage.ts (loadSettings/saveSettings)
src/presentation/   output.ts (todo console.log), input.ts (readline), menu.ts (renderMenu), weatherView.ts
src/actions/        addCity, removeCity, setDefaultCity, toggleUnit, getWeather, listCities (printCityList/pickFromList)
```

Imports use explicit `.ts` extensions (`allowImportingTsExtensions`), required for
the compiled binary.

Where new code goes: a user-triggerable operation is an `actions/` function taking
and returning `AppState`; anything that prints goes through `presentation/output.ts`;
`types/` stays free of runtime code.

## State and persistence

- The whole app state is `AppState = { cities, settings }`, threaded through
  actions. `settings` is `{ defaultCityId, unit }` and lives in its own file.
- **Actions persist themselves.** Each one calls `saveCities()` / `saveSettings()`
  *after* it has decided, never before, so a cancelled prompt (`0` at any
  selection list) leaves both files byte-identical. There is no "return the same
  reference to mean no change" protocol — the old `index.ts` owned saving; that
  responsibility moved down into the actions.
- `MenuOption.run` has the signature `(state: AppState) => Promise<AppState>`.
  Read-only actions (`1`, `2`) return the state they received.

### On-disk data is not an API contract

`datos/ciudades.json` is a plain `City[]` and `datos/config.json` is
`Settings`. **Neither shape is public**, but people do have saved cities, so
renaming a `City` field requires a migration in `citiesStorage.parseCity()`
alongside the change — that function already maps the legacy Spanish keys
(`nombre`→`name`, `pais`→`country`) and accepts both the old wrapper object
(`{ciudadDefaultId, ciudades, unidad}`) and the new bare array.
`loadSettings()` falls back to the legacy file when `config.json` is absent.
Both loaders are defensive: missing, corrupt, or hand-edited files degrade to
defaults instead of crashing.

## Commands

`package.json` scripts: `bun run start` (= `bun run src/index.ts`), `bun run dev`
(adds `--watch`), `bun run build`.

| Task | Command |
| --- | --- |
| Install deps | `bun install` (a `bun.lock` exists; do not switch to npm/yarn/pnpm) |
| Run | `bun .`, `bun run src/index.ts` or `bun run start` |
| Typecheck | `bunx tsc --noEmit` |
| Tests | `bun test` (Bun built-in, zero config) — there are still **no** `*.test.ts` files |
| Build binary | `bun run build` → `./dist/weather` (81 MB, gitignored) |

- `build` targets `dist/weather`, which `.gitignore` covers. Don't move it back to
  the repo root — the old `./weather` at the root was 81 MB and **not** ignored.
- No linter or formatter is configured. Don't assume eslint/prettier exist.
- Verify with `bunx tsc --noEmit && bun run src/index.ts`.
- Smoke-test non-interactively by piping a script, e.g.
  `printf '3\nOttawa\n1\ns\n1\n9\n' | bun run src/index.ts`. Without piping there is
  no automation, and OpenMeteo needs no key/mock.
- Piped runs emit **no** color escapes, so smoke-test output stays greppable. To verify
  colors for real, allocate a pty with `script -qec "..." /dev/null` or set
  `FORCE_COLOR=1`.
- `dist/`, `out/` and `datos/` are gitignored, so binaries and saved cities stay
  uncommitted. `datos/` is created on demand; delete it to reset to a fresh install
  and to test the legacy-file migration path.

## tsconfig traps

`typescript` is a **`peerDependency`** (`^7`, currently the native `tsc` 7.0.2) —
`bunx tsc`, not a repo-local script, is the typecheck entrypoint.

Flags that will break code written against TS defaults:

- `strict` + `noUncheckedIndexedAccess`: `arr[0]` / `obj[key]` is `T | undefined`.
- `verbatimModuleSyntax`: type-only imports must be `import type { X } from "..."`.
- `noFallthroughCasesInSwitch`: moot for the menu now that dispatch is an
  `options.find()`, but any new `switch` still needs explicit `break`s.
- `noEmit: true`: `tsc` never writes output — building is always `bun build`.
- `noUnusedLocals` / `noUnusedParameters` are **off**, so `tsc` will not flag dead
  code; don't rely on it for that.

## Persistence

- `datos/ciudades.json` (a `City[]`) and `datos/config.json` (a `Settings`), both
  written with `Bun.write` via `mkdir` + `Bun.file(...).json()`.
- The path is **relative to the current working directory**, so the binary reads and
  writes wherever it is launched. Chosen deliberately (and over `~/.weather-cli/`) to
  keep the data inspectable; revisit if the binary should be cwd-independent.
- Both loaders are defensive: a missing, corrupt, or hand-edited file degrades to
  defaults instead of crashing. See "On-disk data is not an API contract" for the
  legacy-shape handling.
- Saving lives in the actions, not in `index.ts` — see "State and persistence".

## Colors and console output

- `utils/colors.ts` owns the escapes and the on/off decision;
  `presentation/output.ts` owns **all** printing. `index.ts` and `actions/` must
  never call `console.log` — use `blank()` for empty lines and `paint()` from
  `utils/colors.ts` to mark values.
- Colors turn **off** when `NO_COLOR` is set, `TERM=dumb`, or stdout is not a TTY
  (so piped smoke tests stay clean). `FORCE_COLOR` (any value but `"0"`) forces them
  on and beats every other rule.
- Palette: cyan = box borders, menu options and prompts; **yellow = temperatures and
  `!` warnings**; green = `✓`; red = `✗`; bold = city names and dynamic values
  (`(°F)`, `(2)`); dim = timestamps and the `(default)` marker.
- `Bun.stripANSI()` is built in — use it to assert plain text if you ever add the
  tests listed in `ideas-revision.md`.

## Console input

`presentation/input.ts` does **not** use `rl.question()`. With piped (non-TTY) stdin,
readline consumes the whole buffer and `question()` silently drops every line but the
first — the process then exits with no output. Instead it listens to `line` events,
queues them, and resolves `prompt()` from the queue. `close` (EOF) resolves a pending
prompt with `""`, which surfaces as `se terminó la entrada por teclado` and exit
code 1. Don't "simplify" this back to `rl.question()`.

## OpenMeteo specifics

- **No API key, token, or `.env`** is required. Don't introduce one.
- Geocoding returns HTTP 200 with **no `results` key** for an unknown city name
  (body is just `{"generationtime_ms":...}`), so `api/geocoding.ts` does `data.results ?? []`.
- The README's forecast URL is used literally, except that we add
  `timezone=auto` (without it the response is `timezone: "GMT"`, so "hora local"
  would be wrong), `forecast_days=7`, `daily=temperature_2m_max,temperature_2m_min,weather_code`,
  and `temperature_unit=<celsius|fahrenheit>`.
- `fetchWeather()` returns **both** the current reading and the 7-day forecast in one
  call, so options 1 and 2 print current + forecast without a second request. `Weather.days`
  is `ForecastDay[]`; `high`/`low` on `Weather` are today's row (`daily[0]`).
- `daily.weather_code` is a **WMO code**, not text. `WEATHER_CODE_DESCRIPTIONS` in
  `utils/constants.ts` maps the 27 standard codes to Spanish; unknown/missing codes fall
  back to `"Desconocido"` — keep that fallback, so a future WMO code degrades instead of
  rendering `undefined`.
- `daily` arrays are index-aligned and can carry `null`s, so the 7-day loop guards with
  `?? temperature` per field rather than assuming a full row.
- Forecast dates arrive as bare `"2026-10-01"` with no timezone. `shortDate()` in
  `utils/format.ts` pins `timeZone: "UTC"` in `toLocaleDateString`; without it the conversion
  can shift the day for users west of UTC. Don't drop that option.
- The unit label (`°C` / `°F`) is read from `current_units.temperature_2m` in the
  response, not hardcoded.
- `language=es` makes the API localize country/admin names (e.g. `"Canadá"`).

## Conventions

- User-facing CLI strings in Spanish, matching the README and target menu output.
- Menu option numbers follow the README exactly (`1`–`5`, `8`, `9`); don't renumber.
  `0` is accepted as an alias for exit, and `3`/`4`/`5` accept `0` to cancel. The exit
  values are checked in `index.ts` *before* the `options.find()` lookup, so `MenuOption`
  needs no exit flag.
- The 7-day forecast is **not** a menu option: `renderWeather()` in
  `presentation/weatherView.ts` prints it after the current reading, so options 1 and 2
  both show it. The README's menu has no slot for it (`6`/`7` were left free on
  purpose). Keep it that way unless asked.
- **No comments in code** unless explicitly asked.
- Don't add a framework, build step, or state library beyond Bun's stdlib
  (`fetch`, `Bun.file`, `Bun.write`, `node:readline`, `node:fs/promises`) without asking.

## Known deviations from the README

- Geocoding uses `count=5`, not the README's `count=1`: real names are ambiguous
  (`"Ottawa"` → 5 cities, `"Springfield"` → 5). Option 3 lists the candidates and
  lets the user pick. Confirmed as an intentional decision.

## Git

- Branch `main`, two commits (`first commit`, then the weather CLI implementation).
  Don't commit unless explicitly asked.
