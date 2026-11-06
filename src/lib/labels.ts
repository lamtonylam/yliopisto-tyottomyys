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

export const ICT_FIELD = "Tietojenkäsittely ja tietoliikenne (ICT)";

/** The two degree programmes the capital-region analysis starts with. */
export const DEFAULT_IT_DEGREES = [
  "Tietojenkäsittelytiede (fil. maist.)",
  "Tietotekniikka (dipl.ins.)",
] as const;

export const CAPITAL_GROUP_LABEL = "Pääkaupunkiseutu";
export const OTHER_GROUP_LABEL = "Muu Suomi";
