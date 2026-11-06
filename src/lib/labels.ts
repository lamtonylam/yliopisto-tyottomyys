import type { Level, Sector } from "@/types";

export const SECTOR_LABELS: Record<Sector, string> = {
  amk: "Ammattikorkeakoulu",
  university: "Yliopisto",
};

export const SECTOR_SHORT: Record<Sector, string> = {
  amk: "AMK",
  university: "YO",
};

export const LEVEL_LABELS: Record<Level, string> = {
  lower: "Alempi korkeakoulututkinto",
  upper: "Ylempi korkeakoulututkinto",
};

export const LEVEL_SHORT: Record<Level, string> = {
  lower: "Alempi",
  upper: "Ylempi",
};

export interface DegreeCluster {
  id: string;
  label: string;
  /** Degree names, matched exactly against data.json. */
  degrees: readonly string[];
  /** Names selected on first load. Defaults to all of `degrees`. */
  defaultSelected?: readonly string[];
}

/**
 * Preset degree combinations for the capital-region comparison.
 * To offer another combination, add one entry here — the preset buttons
 * and the checkbox groups render from this array, no other changes needed.
 *
 * Note: only master's-level university degrees are listed (bachelor's
 * degrees are not comparable — most graduates continue to a master's).
 */
export const DEGREE_CLUSTERS: DegreeCluster[] = [
  {
    id: "it",
    label: "IT-klusteri",
    degrees: [
      "Tietojenkäsittelytiede (fil. maist.)",
      "Tietotekniikka (dipl.ins.)",
      "Tietojärjestelmätiede (kauppat. maist.)",
      "Tietoliikennetekniikka (dipl.ins.)",
      "Tradenomi (AMK), tietojenkäsittely",
    ],
    defaultSelected: [
      "Tietojenkäsittelytiede (fil. maist.)",
      "Tietotekniikka (dipl.ins.)",
    ],
  },
  {
    id: "kaupallinen",
    label: "Kaupallinen klusteri",
    degrees: [
      "Liiketaloustieteet (kauppat. maist.)",
      "Tradenomi (AMK), talous, hallinto ja markkinointi",
    ],
  },
];

export const CAPITAL_GROUP_LABEL = "Pääkaupunkiseutu";
export const OTHER_GROUP_LABEL = "Muu Suomi";
