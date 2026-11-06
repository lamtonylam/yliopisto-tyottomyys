# Sijoittumisdata

React + TypeScript dashboard for Finnish graduate outcomes (Tilastokeskuksen
sijoittumispalvelu): unemployment and median income by degree and by institution.
Graduates 2023, income year 2024.

## Quick start

```bash
npm install
npm run dev
```

`data.json` in the project root is the source of truth. `npm run dev` and
`npm run build` copy it to `public/data.json` (see `scripts/sync-data.mjs`), which
is what the app fetches at runtime. The copy is git-ignored.

```bash
npm run build      # sync data + typecheck + production build
npm run typecheck  # tsc -b
npm run lint       # oxlint
npm run preview    # serve dist/
```

## Views

**Yleiskuva** — national KPIs, sector/level table, unemployment by field, degrees
with the lowest and highest unemployment, and a searchable/sortable table of all
295 degrees. Clicking a row opens its institution comparison.

**Tutkintojen vertailu** — the same degree across institutions. Pick any degree
(searchable combobox), switch between unemployment and income, filter small
cohorts, and compare each institution against the national benchmark. The table
shows counts, unemployment, income and the delta to the national unemployment
rate.

**Pääkaupunkiseutu** — a pooled comparison of capital-region universities
(University of Helsinki in Helsinki, Aalto University in Espoo) against the rest
of Finland. By default it groups the two ICT master's degrees:

- `Tietojenkäsittelytiede (fil. maist.)`
- `Tietotekniikka (dipl.ins.)`

All seven university ICT degrees can be selected. The view offers:

- pooled rates per group,
- a forest plot of every institution and the pooled estimate (diamond),
- a per-degree breakdown so degree mix does not explain the gap,
- a city-level table,
- an optional three-way grouping: capital region / other large university
  cities (Tampere, Turku, Oulu, Jyväskylä) / rest of Finland.

## Method notes

- Rates are recomputed from pooled counts (`unemployed / (employed + unemployed)`),
  never as a mean of institution percentages.
- The figures are descriptive and small cohorts are volatile.
- Median income for a group is a graduate-weighted mean of institution medians,
  not a true pooled median.
- Institutions are assigned to a region by their main campus city. Multi-campus
  institutions are approximations. The mapping lives in `src/lib/regions.ts`.
- The analysis is descriptive. Differences may reflect local labour markets,
  student selection, migration for work, or field composition — not a causal
  effect of location.

## Structure

```text
data.json                    raw statistics (source of truth)
scripts/sync-data.mjs        copies data.json to public/
src/
  types.ts                   JSON schema as TypeScript types
  lib/load.ts                fetch + shape validation
  lib/stats.ts               pooling, weighted means, axis domains
  lib/derive.ts              school/field/city aggregation
  lib/regions.ts             institution → main campus city
  lib/format.ts              fi-FI number formatting
  components/                charts (bar list, forest plot) and UI primitives
  views/                     overview, comparison, capital-region analysis
  App.tsx                    shell, hash routing, theme
```

UI building blocks are [shadcn/ui](https://ui.shadcn.com) components (Tailwind
CSS v4), with custom SVG charts for the forest plot and bar lists.
