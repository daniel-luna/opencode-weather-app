# AGENTS.md

## What this is

Course project (`02-weather`): a **Bun.js console weather CLI** on the OpenMeteo
API, shipped as a compiled executable. `README.md` is the original spec and is
written in Spanish.

The app is implemented. All 7 menu options from the README work, with real
persistence.

`references/file-system.md` is the canonical target layout. `src/` now matches
it, and identifiers are fully in English (only user-facing strings are Spanish).
`tests/` mirrors that layout, and `bun run build` runs the suite first.

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
tests/              espejo 1:1 de src/ (mismo nombre base) + helpers/ (ver "Tests")
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
  responsibility moved down into the actions. Both halves of that rule are pinned
  by `tests/actions/*` (identical file bytes after a cancel; a file that is never
  created when nothing changed).
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
(adds `--watch`), `bun test`, `bun run test:watch`, `bun run typecheck`, `bun run build`.

| Task | Command |
| --- | --- |
| Install deps | `bun install` (a `bun.lock` exists; do not switch to npm/yarn/pnpm) |
| Run | `bun .`, `bun run src/index.ts` or `bun run start` |
| Typecheck | `bunx tsc --noEmit` (or `bun run typecheck`) |
| Tests | `bun test` (Bun built-in runner, 163 tests in `tests/`) |
| Build binary | `bun run build` → `./dist/weather` (81 MB, gitignored) |

- `build` targets `dist/weather`, which `.gitignore` covers. Don't move it back to
  the repo root — the old `./weather` at the root was 81 MB and **not** ignored.
  CI calls this same script verbatim (see "Release").
- **`build` is gated by the test suite**: the script is `bun test && bun build ...`,
  so a failing test means no binary is produced. Don't drop the `bun test &&`
  prefix when editing `build`; add a separate `build:only` script if a
  test-skipping build is ever genuinely needed.
- No linter or formatter is configured. Don't assume eslint/prettier exist.
- Verify with `bunx tsc --noEmit && bun test && bun run src/index.ts`.
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
- Colors turn **off** when `FORCE_COLOR=0`, when `NO_COLOR` is set, when `TERM=dumb`,
  or when stdout is not a TTY (so piped smoke tests stay clean). `FORCE_COLOR` (any
  value but `"0"`) forces them on when stdout is not a TTY, but it does **not**
  override `NO_COLOR` or `TERM=dumb` — those two win. `tests/utils/colors.test.ts`
  pins the whole matrix by re-importing the module with a cache-busting query.
- Palette: cyan = box borders, menu options and prompts; **yellow = temperatures and
  `!` warnings**; green = `✓`; red = `✗`; bold = city names and dynamic values
  (`(°F)`, `(2)`); dim = timestamps and the `(default)` marker.
- `Bun.stripANSI()` is built in; the presentation tests use it so assertions hold
  whether or not colors are on.

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
  `utils/format.ts` parses them as `${date}T12:00:00Z` **and** pins
  `timeZone: "UTC"` in `toLocaleDateString`. Both halves are needed: the `Z` stops
  local noon from drifting across a UTC day for users east of UTC+12, and the
  `timeZone` option stops the same for users west of UTC. `tests/utils/format.test.ts`
  pins both by switching `process.env.TZ`.
- The unit label (`°C` / `°F`) is read from `current_units.temperature_2m` in the
  response, not hardcoded.
- `language=es` makes the API localize country/admin names (e.g. `"Canadá"`).

## Tests

`tests/` is a **1:1 mirror of `src/`**: every `src/foo/bar.ts` has
`tests/foo/bar.test.ts`, same directories, same base names. 22 source files, 22 test
files, 163 tests, run with `bun test`. No test framework beyond `bun:test`, and the
only config is `bunfig.toml` (which preloads `tests/setup.ts`).

```
src/index.ts        → tests/index.test.ts
src/actions/*.ts    → tests/actions/*.test.ts
src/api/*.ts        → tests/api/*.test.ts
src/presentation/*  → tests/presentation/*.test.ts   (including input.ts)
src/storage/*.ts    → tests/storage/*.test.ts
src/types/*.ts      → tests/types/*.test.ts           (one file per type module)
src/utils/*.ts      → tests/utils/*.test.ts
```

`tests/helpers/` and `tests/setup.ts` have no `src/` counterpart — they are shared
infrastructure, not mirrors.

| Piece | How to use it |
| --- | --- |
| `tests/setup.ts` | Preloaded by `bunfig.toml`; forces `NO_COLOR=1` so every assertion is plain text. |
| `tests/helpers/fixtures.ts` | `makeCity` / `makeWeather` / `makeForecastDay` / `makeState`. |
| `tests/helpers/captureOutput.ts` | Spies on `console.log`, returns lines stripped of ANSI. |
| `tests/helpers/sandbox.ts` | `useSandbox()` chdirs into a fresh `mkdtemp` dir; **always** `restore()` in `afterEach`. Storage is cwd-relative, so this is how tests stay off the real `datos/`. |
| `tests/helpers/fetchStub.ts` | Replaces `globalThis.fetch`; records URLs so tests can assert query params. `restore()` in `afterEach`. |
| `tests/helpers/scriptedInput.ts` | `scriptInput([...])` spies on **only** `input.prompt`; real `promptRequired`/`confirm` then run against those answers, so their logic is covered too. Exhausting the list throws instead of hanging. `capturePrompts()` also swallows the prompt text written to stdout. Answers come back **raw**: the mock replaces `prompt`, so the `line.trim()` in `input.ts`'s readline handler never runs. |
| `tests/helpers/fetchPreload.ts` | `globalThis.fetch` replacement for the spawned e2e process. |
| `tests/helpers/cliRunner.ts` | `runCli(input, cwd)` spawns the real `src/index.ts` with the preload above. |

Rules that keep the suite reliable:

- `afterEach` calls `mock.restore()`; `spyOn` works on module namespace objects, so
  mocking `presentation/input.ts` does not leak into other files.
- `scriptInput` answers are **raw** (see the table row): a scripted `" "` never goes
  through `input.ts:36`'s `trim()`, so a test must not lean on that trim to justify an
  assertion. Whitespace-only input is covered end-to-end in
  `tests/presentation/input.test.ts` (which drives the real readline handler via
  `typeLine`) and `promptRequired` trims defensively so the invariant doesn't depend on
  the caller. `tests/actions/addCity.test.ts`'s "insiste si el nombre viene vacío" was
  the counterexample: it scripted `" "`, could only pass when a mock leaked, and broke
  the whole suite (which gates `build`, so it blocked the release).
- Known debt: `spyOn` on an ESM export plus `mock.restore()`, repeated across 22 files
  in one shared Bun process, is not airtight — the exact mock bound to a call site has
  been observed to depend on execution order. Don't write a test whose correctness
  depends on *which* mock is live.
- `tests/presentation/input.test.ts` mocks `node:readline/promises` and drives the
  fake interface, and its "al cerrar la entrada" block must stay **last** in the file:
  `input.ts` keeps `inputClosed` as module state that no reset clears.
- Test **process state**, not just the returned `AppState`: a cancelled prompt must
  leave `datos/*.json` byte-identical (or not created at all). The action tests read
  the sandbox files for that.
- `tests/index.test.ts` spawns the real `src/index.ts` with
  `bun --preload tests/helpers/fetchPreload.ts` in a sandbox cwd, so it covers the menu
  wiring and persistence without touching the network or the repo's `datos/`.
- Adding a test file with a name matching `*.test.ts` is all the registration needed.
  `bun test` must stay the only entrypoint: `build` depends on it.
- `bun test` does **not** typecheck. Run `bun run typecheck` too — a type error can
  pass the whole suite and still break `tsc`.

## Conventions

- User-facing CLI strings in Spanish, matching the README and target menu output.
- Menu option numbers follow the README exactly (`1`–`5`, `8`, `9`); don't renumber.
  `0` is accepted as an alias for exit, and `3`/`4`/`5` accept `0` to cancel. The exit
  values are checked in `index.ts` *before* the `options.find()` lookup, so `MenuOption`
  needs no exit flag — which is also why `renderMenu()` prints the `9. Salir` row itself
  (last one, no badge) instead of receiving it as an option: it has no action to run.
  `tests/index.test.ts` pins the rendered order against the README.
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

## Release

`.github/workflows/release.yml` publishes a GitHub Release **automatically on every
push to `main`**, driven by `version` in `package.json`. Three jobs:

1. `version` reads `version` with `jq`, validates it is semver, derives `v<version>`,
   and checks `git ls-remote --tags origin`. If the tag already exists it sets
   `should_release=false` and the other two jobs are skipped — **bumping `version` is
   the only trigger**, so a normal commit changes nothing.
2. `build` runs the matrix (ubuntu-latest, ubuntu-24.04-arm, macos-15, macos-15-intel,
   windows-latest), calling `bun run build` **unmodified** — so the suite gates the
   release on every platform. Each job renames `dist/weather*` (`shell: bash`, so the
   same line works on Windows; Bun appends `.exe` there) and uploads it as an artifact.
3. `release` downloads the artifacts, runs `chmod +x` (upload-artifact drops the exec
   bit), tags `$GITHUB_SHA`, and calls `gh release create --verify-tag
   --generate-notes`.

- `permissions: contents: write` and `concurrency: group: release,
  cancel-in-progress: false` are both required: the first to push the tag, the second
  so two pushes to `main` don't race for the same tag.
- Assets are named `weather-<os>-<arch>[.exe]`, uncompressed (~81 MB each). The macOS
  ones are **unsigned**, so Gatekeeper blocks them on first run; fixing that needs an
  Apple Developer certificate and `codesign`.
- Bun can cross-compile (`bun build --compile --target=bun-<os>-<arch>`, and `.exe`
  is added automatically), so the whole matrix could collapse into one `ubuntu-latest`
  job. Not done on purpose; revisit only if the macOS minutes start to cost something.

## Git

- Branch `main`, two commits (`first commit`, then the weather CLI implementation).
  Don't commit unless explicitly asked.
- Pushing to `main` runs the release workflow, so a push **does** publish a Release
  whenever `version` was bumped in that same commit. Commit and push separately when
  in doubt.
