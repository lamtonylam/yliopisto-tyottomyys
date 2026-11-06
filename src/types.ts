export type Sector = "amk" | "university";
export type Level = "lower" | "upper";
export type SectorLevel = "all" | Level;

export interface Stats {
  graduates: number;
  residents: number;
  working: number;
  studyingWorking: number;
  employed: number;
  workingRate: number;
  studyingWorkingRate: number;
  medianIncome: number;
}

export interface NationalStats extends Stats {
  unemployed: number;
  unemploymentRate: number;
}

export interface SchoolStats extends NationalStats {
  name: string;
}

export interface Degree {
  id: string;
  code: string;
  name: string;
  sector: Sector;
  level: Level;
  field: string;
  search: string;
  national: NationalStats;
  schools: SchoolStats[];
}

export interface DataFile {
  meta: {
    graduationYear: number;
    incomeYear: number;
    source: string;
    degreeCount: number;
  };
  sectors: Record<Sector, Record<SectorLevel, Stats>>;
  fields: Record<Sector, string[]>;
  degrees: Degree[];
}
