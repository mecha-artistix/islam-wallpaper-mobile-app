# Names (99 Names of Allah dataset)

## Purpose

The static dataset of the 99 Names of Allah. No API, no caching, no network.

## Relevant files

- `src/data/asmaUlHusna.js` — `ASMA_UL_HUSNA` array. 99 entries.

## Data shape

Each entry: `{ number, name, transliteration, translation, meaning }`
- `number` — 1..99
- `name` — Arabic (with diacritics)
- `transliteration` — Latin transliteration (e.g. "Ar-Rahman")
- `translation` — English meaning (e.g. "The Most Gracious")
- `meaning` — longer English explanation

## Main functions / usage

Imported wherever a name is needed:
- `(tabs)/index.jsx` (Home) — current name by `selectedNameIndex`.
- `(tabs)/names.jsx` — FlatList + search.
- `name/[id].jsx` — single name by `number`.
- `rotation.js` — `ASMA_UL_HUSNA[nextIndex]` to pick the next name.
- `customize.jsx` — preview name.

## Important constraints

- **Static.** No mutation. Treat as read-only.
- `number` is the stable id (1-based). The rotation index is 0-based and maps via `ASMA_UL_HUSNA[index]`; `number` is what's displayed + used in routes (`/name/[id]` where `id == number`).
- Length is 99 — `(current + 1) % 99` wraps correctly. Don't hardcode `99` in new code; use `ASMA_UL_HUSNA.length`.

## External dependencies

- None.

## Related features

- **rotation** — picks the next name from here.
- **wallpaper** — generator draws the name's Arabic + transliteration + translation + meaning.
- **app-ui** — browse + detail screens.

## Known bugs / issues

- None known.
