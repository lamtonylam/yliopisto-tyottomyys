import type { DataFile } from "@/types";

export async function loadData(): Promise<DataFile> {
  const response = await fetch(`${import.meta.env.BASE_URL}data.json`, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Tietojen lataus epäonnistui (HTTP ${response.status}).`);
  }

  const json: unknown = await response.json();
  if (!isDataFile(json)) {
    throw new Error("Tiedoston rakenne ei vastaa odotettua sijoittumisdataa.");
  }
  return json;
}

function isDataFile(value: unknown): value is DataFile {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DataFile>;
  return Boolean(
    candidate.meta &&
      candidate.sectors &&
      Array.isArray(candidate.degrees) &&
      candidate.degrees.length > 0 &&
      typeof candidate.degrees[0]?.national?.residents === "number",
  );
}
