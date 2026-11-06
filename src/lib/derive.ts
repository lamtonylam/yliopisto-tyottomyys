import type { Degree, Sector } from "@/types";
import { locationOf } from "./regions";
import { percentage, weightedMean, type PoolInput } from "./stats";

export interface SchoolRow extends PoolInput {
  name: string;
  city: string;
  capital: boolean;
  /** How many of the selected degrees this school offers. */
  degrees: number;
}

/** Aggregates school-level counts across the selected degrees. */
export function poolBySchool(degrees: Degree[]): SchoolRow[] {
  interface Accumulator extends PoolInput {
    degrees: number;
    incomeWeighted: number;
    incomeWeight: number;
  }

  const bySchool = new Map<string, Accumulator>();

  for (const degree of degrees) {
    for (const school of degree.schools) {
      const existing = bySchool.get(school.name) ?? {
        graduates: 0,
        residents: 0,
        employed: 0,
        unemployed: 0,
        medianIncome: 0,
        degrees: 0,
        incomeWeighted: 0,
        incomeWeight: 0,
      };

      existing.graduates += school.graduates;
      existing.residents += school.residents;
      existing.employed += school.employed;
      existing.unemployed += school.unemployed;
      existing.degrees += 1;
      existing.incomeWeighted += school.medianIncome * school.graduates;
      existing.incomeWeight += school.graduates;
      bySchool.set(school.name, existing);
    }
  }

  return [...bySchool.entries()]
    .map(([name, acc]) => {
      const location = locationOf(name);
      return {
        name,
        city: location.city,
        capital: location.capital,
        graduates: acc.graduates,
        residents: acc.residents,
        employed: acc.employed,
        unemployed: acc.unemployed,
        degrees: acc.degrees,
        medianIncome:
          acc.incomeWeight > 0 ? Math.round(acc.incomeWeighted / acc.incomeWeight) : 0,
      };
    })
    .sort((a, b) => b.residents - a.residents);
}

export interface CityRow {
  city: string;
  capital: boolean;
  schools: string[];
  graduates: number;
  residents: number;
  employed: number;
  unemployed: number;
  labourForce: number;
  unemploymentPct: number | null;
  medianIncome: number;
}

export function groupByCity(rows: SchoolRow[]): CityRow[] {
  const byCity = new Map<string, SchoolRow[]>();
  for (const row of rows) {
    const list = byCity.get(row.city) ?? [];
    list.push(row);
    byCity.set(row.city, list);
  }

  return [...byCity.entries()]
    .map(([city, cityRows]) => {
      const graduates = cityRows.reduce((sum, row) => sum + row.graduates, 0);
      const residents = cityRows.reduce((sum, row) => sum + row.residents, 0);
      const employed = cityRows.reduce((sum, row) => sum + row.employed, 0);
      const unemployed = cityRows.reduce((sum, row) => sum + row.unemployed, 0);
      const labourForce = employed + unemployed;

      return {
        city,
        capital: cityRows.some((row) => row.capital),
        schools: cityRows.map((row) => row.name).sort((a, b) => a.localeCompare(b, "fi")),
        graduates,
        residents,
        employed,
        unemployed,
        labourForce,
        unemploymentPct: percentage(unemployed, labourForce),
        medianIncome: Math.round(
          weightedMean(cityRows.map((row) => ({ value: row.medianIncome, weight: row.graduates }))),
        ),
      };
    })
    .sort((a, b) => b.residents - a.residents);
}

export interface DegreeAggregate {
  degrees: number;
  graduates: number;
  residents: number;
  employed: number;
  unemployed: number;
  labourForce: number;
  unemploymentPct: number | null;
  medianIncome: number;
}

/** Totals for any set of degrees, with rates recomputed from pooled counts. */
export function aggregateDegrees(degrees: Degree[]): DegreeAggregate {
  const graduates = degrees.reduce((sum, d) => sum + d.national.graduates, 0);
  const residents = degrees.reduce((sum, d) => sum + d.national.residents, 0);
  const employed = degrees.reduce((sum, d) => sum + d.national.employed, 0);
  const unemployed = degrees.reduce((sum, d) => sum + d.national.unemployed, 0);
  const labourForce = employed + unemployed;

  return {
    degrees: degrees.length,
    graduates,
    residents,
    employed,
    unemployed,
    labourForce,
    unemploymentPct: percentage(unemployed, labourForce),
    medianIncome: Math.round(
      weightedMean(
        degrees.map((d) => ({ value: d.national.medianIncome, weight: d.national.graduates })),
      ),
    ),
  };
}

export interface FieldAggregate {
  field: string;
  degrees: number;
  graduates: number;
  residents: number;
  employed: number;
  unemployed: number;
  unemploymentPct: number | null;
  medianIncome: number;
}

/** Field-level totals for one sector, summed from the national degree figures. */
export function fieldAggregates(degrees: Degree[], sector: Sector): FieldAggregate[] {
  const relevant = degrees.filter((degree) => degree.sector === sector);
  const byField = new Map<string, Degree[]>();

  for (const degree of relevant) {
    const list = byField.get(degree.field) ?? [];
    list.push(degree);
    byField.set(degree.field, list);
  }

  return [...byField.entries()]
    .map(([field, fieldDegrees]) => {
      const graduates = fieldDegrees.reduce((sum, d) => sum + d.national.graduates, 0);
      const residents = fieldDegrees.reduce((sum, d) => sum + d.national.residents, 0);
      const employed = fieldDegrees.reduce((sum, d) => sum + d.national.employed, 0);
      const unemployed = fieldDegrees.reduce((sum, d) => sum + d.national.unemployed, 0);

      return {
        field,
        degrees: fieldDegrees.length,
        graduates,
        residents,
        employed,
        unemployed,
        unemploymentPct: percentage(unemployed, employed + unemployed),
        medianIncome: Math.round(
          weightedMean(
            fieldDegrees.map((d) => ({ value: d.national.medianIncome, weight: d.national.graduates })),
          ),
        ),
      };
    })
    .sort((a, b) => {
      if (a.unemploymentPct == null) return 1;
      if (b.unemploymentPct == null) return -1;
      return a.unemploymentPct - b.unemploymentPct;
    });
}
