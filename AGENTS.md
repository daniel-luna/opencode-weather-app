# AGENTS.md

## What this is

Course project (`02-weather`): a **Bun.js console weather CLI** on the OpenMeteo
API, shipped as a compiled executable. `README.md` is the original spec and is
written in Spanish.

The app is implemented. All 7 menu options from the README work, with real
persistence.

## Layout

```
index.ts         menú, bucle principal, tabla de 7 días, una función por opción
src/tipos.ts     Ciudad, Config, Unidad, Clima, DiaPronostico
src/api.ts       buscarCiudades() / obtenerClima() — the only fetch layer
src/almacen.ts   cargar() / guardar() → datos/ciudades.json
src/color.ts     pintar() — ANSI escapes, NO_COLOR/TTY detection
src/ui.ts        caja del menú, mensajes, lector de entrada por consola
```

Imports between them use explicit `.ts` extensions (`allowImportingTsExtensions`),
required for the compiled binary.

## Commands

`package.json` scripts: `bun run start` (= `bun run index.ts`), `bun run dev`
(adds `--watch`), `bun run build`.

| Task | Command |
| --- | --- |
| Install deps | `bun install` (a `bun.lock` exists; do not switch to npm/yarn/pnpm) |
| Run | `bun .`, `bun run index.ts` or `bun run start` |
| Typecheck | `bunx tsc --noEmit` |
| Tests | `bun test` (Bun built-in, zero config) — there are still **no** `*.test.ts` files |
| Build binary | `bun run build` → `./weather` (repo root, 81 MB, **not** gitignored) |

- `bun run build` writes to the repo root, not `dist/`, so it is **not** covered by
  `.gitignore`. Prefer `bun build ./index.ts --compile --outfile dist/weather` (that path
  *is* ignored) or delete `./weather` after building.
- No linter or formatter is configured. Don't assume eslint/prettier exist.
- Verify with `bunx tsc --noEmit && bun run index.ts`.
- Smoke-test non-interactively by piping a script, e.g.
  `printf '3\nOttawa\n1\ns\n1\n9\n' | bun run index.ts`. Without piping there is
  no automation, and OpenMeteo needs no key/mock.
- Piped runs emit **no** color escapes, so smoke-test output stays greppable. To verify
  colors for real, allocate a pty with `script -qec "..." /dev/null` or set
  `FORCE_COLOR=1`.
- `dist/`, `out/` and `datos/` are gitignored, so binaries and saved cities stay
  uncommitted.

## tsconfig traps

`typescript` is a **`peerDependency`** (`^7`, currently the native `tsc` 7.0.2) —
`bunx tsc`, not a repo-local script, is the typecheck entrypoint.

Flags that will break code written against TS defaults:

- `strict` + `noUncheckedIndexedAccess`: `arr[0]` / `obj[key]` is `T | undefined`.
- `verbatimModuleSyntax`: type-only imports must be `import type { X } from "..."`.
- `noFallthroughCasesInSwitch`: the numbered menu `switch` needs explicit `break`s.
- `noEmit: true`: `tsc` never writes output — building is always `bun build`.
- `noUnusedLocals` / `noUnusedParameters` are **off**, so `tsc` will not flag dead
  code; don't rely on it for that.

## Persistence

- `datos/ciudades.json`, written with `Bun.write` via `mkdir` + `Bun.file(...).json()`.
- The path is **relative to the current working directory**, so the binary reads and
  writes wherever it is launched. Chosen deliberately (and over `~/.weather-cli/`) to
  keep the data inspectable; revisit if the binary should be cwd-independent.
- `cargar()` is defensive: a missing, corrupt, or hand-edited file degrades to the
  default config instead of crashing, and a `ciudadDefaultId` that no longer matches
  a saved city is reset to `null`.
- Handlers return a new `Config` or the unchanged one; `index.ts` saves only when
  the reference changed, so cancelled prompts never touch the file.

## Colors and console output

- `src/color.ts` owns the escapes and the on/off decision; `src/ui.ts` owns **all**
  printing. `index.ts` must never call `console.log` — use `hueco()` for blank lines
  and `pintar()` from `color.ts` to mark values.
- Colors turn **off** when `NO_COLOR` is set, `TERM=dumb`, or stdout is not a TTY
  (so piped smoke tests stay clean). `FORCE_COLOR` (any value but `"0"`) forces them
  on and beats every other rule.
- Palette: cian = box borders, menu options and prompts; **amarillo = temperatures and
  `!` avisos**; green = `✓`; red = `✗`; bold = city names and dynamic values
  (`(°F)`, `(2)`); dim = timestamps and the `(default)` marker.
- `Bun.stripANSI()` is built in — use it to assert plain text if you ever add the
  tests listed in `ideas-revision.md`.

## Console input

`src/ui.ts` does **not** use `rl.question()`. With piped (non-TTY) stdin, readline
consumes the whole buffer and `question()` silently drops every line but the first —
the process then exits with no output. Instead it listens to `line` events, queues
them, and resolves `preguntar()` from the queue. `close` (EOF) resolves a pending
prompt with `""`, which surfaces as `se terminó la entrada por teclado` and exit
code 1. Don't "simplify" this back to `rl.question()`.

## OpenMeteo specifics

- **No API key, token, or `.env`** is required. Don't introduce one.
- Geocoding returns HTTP 200 with **no `results` key** for an unknown city name
  (body is just `{"generationtime_ms":...}`), so `api.ts` does `datos.results ?? []`.
- The README's forecast URL is used literally, except that we add
  `timezone=auto` (without it the response is `timezone: "GMT"`, so "hora local"
  would be wrong), `forecast_days=7`, `daily=temperature_2m_max,temperature_2m_min,weather_code`,
  and `temperature_unit=<celsius|fahrenheit>`.
- `obtenerClima()` returns **both** the current reading and the 7-day forecast in one
  call, so options 1 and 2 print current + forecast without a second request. `Clima.dias`
  is `DiaPronostico[]`; `maxima`/`minima` on `Clima` are today's row (`daily[0]`).
- `daily.weather_code` is a **WMO code**, not text. `DESCRIPCIONES` in `api.ts` maps the
  27 standard codes to Spanish; unknown/missing codes fall back to `"Desconocido"` — keep
  that fallback, so a future WMO code degrades instead of rendering `undefined`.
- `daily` arrays are index-aligned and can carry `null`s, so the 7-day loop guards with
  `?? temperatura` per field rather than assuming a full row.
- Forecast dates arrive as bare `"2026-10-01"` with no timezone. `fechaCorta()` in
  `index.ts` pins `timeZone: "UTC"` in `toLocaleDateString`; without it the conversion
  can shift the day for users west of UTC. Don't drop that option.
- The unit label (`°C` / `°F`) is read from `current_units.temperature_2m` in the
  response, not hardcoded.
- `language=es` makes the API localize country/admin names (e.g. `"Canadá"`).

## Conventions

- User-facing CLI strings in Spanish, matching the README and target menu output.
- Menu option numbers follow the README exactly (`1`–`5`, `8`, `9`); don't renumber.
  `0` is accepted as an alias for exit, and `3`/`4`/`5` accept `0` to cancel.
- The 7-day forecast is **not** a menu option: `mostrarClima()` in `index.ts` prints it
  after the current reading, so options 1 and 2 both show it. The README's menu has no
  slot for it (`6`/`7` were left free on purpose). Keep it that way unless asked.
- **No comments in code** unless explicitly asked.
- Don't add a framework, build step, or state library beyond Bun's stdlib
  (`fetch`, `Bun.file`, `Bun.write`, `node:readline`, `node:fs/promises`) without asking.

## Known deviations from the README

- Geocoding uses `count=5`, not the README's `count=1`: real names are ambiguous
  (`"Ottawa"` → 5 cities, `"Springfield"` → 5). Option 3 lists the candidates and
  lets the user pick. Confirmed as an intentional decision.

## Git

- Branch `main`, one commit (`first commit`) so far. Don't commit unless explicitly asked.
