import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { BarList } from "@/components/bar-list";
import { MetricToggle } from "@/components/metric-toggle";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { aggregateDegrees, fieldAggregates } from "@/lib/derive";
import { fmtEur, fmtInt, fmtPct } from "@/lib/format";
import { LEVEL_SHORT, SECTOR_LABELS, SECTOR_SHORT } from "@/lib/labels";
import { weightedMean } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { DataFile, Degree, Level, Sector } from "@/types";

interface OverviewViewProps {
  data: DataFile;
  onOpenDegree: (id: string) => void;
}

type SortKey = "name" | "field" | "graduates" | "unemploymentRate" | "medianIncome" | "schools";

const SORT_ACCESSORS: Record<SortKey, (degree: Degree) => string | number> = {
  name: (degree) => degree.name.toLocaleLowerCase("fi"),
  field: (degree) => degree.field.toLocaleLowerCase("fi"),
  graduates: (degree) => degree.national.graduates,
  unemploymentRate: (degree) => degree.national.unemploymentRate,
  medianIncome: (degree) => degree.national.medianIncome,
  schools: (degree) => degree.schools.length,
};

export function OverviewView({ data, onOpenDegree }: OverviewViewProps) {
  const [fieldSector, setFieldSector] = useState<Sector>("university");
  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<"all" | Sector>("all");
  const [levelFilter, setLevelFilter] = useState<"all" | Level>("all");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "graduates",
    direction: "desc",
  });

  const { amk, university } = data.sectors;

  const summary = useMemo(() => {
    const all = aggregateDegrees(data.degrees);
    return {
      graduates: amk.all.graduates + university.all.graduates,
      residents: amk.all.residents + university.all.residents,
      unemploymentPct: all.unemploymentPct,
      medianIncome: Math.round(
        weightedMean([
          { value: amk.all.medianIncome, weight: amk.all.graduates },
          { value: university.all.medianIncome, weight: university.all.graduates },
        ]),
      ),
      degrees: all.degrees,
      schools: new Set(data.degrees.flatMap((degree) => degree.schools.map((s) => s.name))).size,
    };
  }, [amk.all, university.all, data.degrees]);

  const sectorRows = useMemo(
    () =>
      (["amk", "university"] as const).flatMap((sector) =>
        (["all", "lower", "upper"] as const).map((level) => {
          const subset = data.degrees.filter(
            (degree) => degree.sector === sector && (level === "all" || degree.level === level),
          );
          const aggregate = aggregateDegrees(subset);
          const stats = data.sectors[sector][level];
          return {
            id: `${sector}-${level}`,
            label:
              level === "all"
                ? SECTOR_SHORT[sector]
                : `${SECTOR_SHORT[sector]} · ${LEVEL_SHORT[level]}`,
            sector,
            level,
            graduates: stats.graduates,
            unemploymentPct: aggregate.unemploymentPct,
            medianIncome: stats.medianIncome,
          };
        }),
      ),
    [data.degrees, data.sectors],
  );

  const fields = useMemo(
    () => fieldAggregates(data.degrees, fieldSector),
    [data.degrees, fieldSector],
  );

  const fieldReference = useMemo(
    () =>
      aggregateDegrees(data.degrees.filter((degree) => degree.sector === fieldSector))
        .unemploymentPct,
    [data.degrees, fieldSector],
  );

  const fieldMax = useMemo(() => {
    const values = fields.map((field) => field.unemploymentPct ?? 0);
    const highest = Math.max(...values, fieldReference ?? 0, 5);
    return Math.ceil((highest * 1.1) / 5) * 5;
  }, [fields, fieldReference]);

  const filteredDegrees = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fi");
    const rows = data.degrees.filter((degree) => {
      if (sectorFilter !== "all" && degree.sector !== sectorFilter) return false;
      if (levelFilter !== "all" && degree.level !== levelFilter) return false;
      if (!normalized) return true;
      return (
        degree.search.toLocaleLowerCase("fi").includes(normalized) ||
        degree.name.toLocaleLowerCase("fi").includes(normalized) ||
        degree.field.toLocaleLowerCase("fi").includes(normalized)
      );
    });

    const accessor = SORT_ACCESSORS[sort.key];
    return rows.sort((a, b) => {
      const left = accessor(a);
      const right = accessor(b);
      const result =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "fi");
      return sort.direction === "asc" ? result : -result;
    });
  }, [data.degrees, levelFilter, query, sectorFilter, sort]);

  const outliers = useMemo(() => {
    const eligible = data.degrees.filter(
      (degree) =>
        degree.national.residents >= 50 &&
        Number.isFinite(degree.national.unemploymentRate) &&
        // Yliopiston alemmat tutkinnot (kandit) eivät ole vertailukelpoisia:
        // Suomessa ne ovat tyypillisesti välitutkintoja matkalla maisteriin.
        !(degree.sector === "university" && degree.level === "lower"),
    );
    const sorted = [...eligible].sort(
      (a, b) => a.national.unemploymentRate - b.national.unemploymentRate,
    );
    return { low: sorted.slice(0, 5), high: sorted.slice(-5).reverse() };
  }, [data.degrees]);

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "name" || key === "field" ? "asc" : "desc" },
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Valmistuneita 2023"
          value={fmtInt(summary.graduates)}
          hint={`${fmtInt(amk.all.graduates)} AMK · ${fmtInt(university.all.graduates)} yliopisto`}
        />
        <StatCard
          label="Työttömyysaste"
          value={fmtPct(summary.unemploymentPct)}
          hint="Työttömät / työvoima, laskettu tutkinnoista"
        />
        <StatCard
          label="Mediaanitulo"
          value={fmtEur(summary.medianIncome)}
          hint={`Tulot ${data.meta.incomeYear} · painotettu keskiarvo`}
        />
        <StatCard
          label="Oppilaitoksia"
          value={fmtInt(summary.schools)}
          hint={`${fmtInt(summary.degrees)} tutkintoa · ${fmtInt(summary.residents)} Suomessa asuvaa`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <SectionHeader
              title="Sektorit ja tutkintotasot"
              description="Työttömyysaste ja mediaanitulo koko maan tasolla."
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ryhmä</TableHead>
                  <TableHead className="text-right">Valmistuneet</TableHead>
                  <TableHead className="text-right">Työttömyys</TableHead>
                  <TableHead className="text-right">Mediaanitulo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectorRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            row.sector === "university" ? "bg-capital" : "bg-other",
                          )}
                        />
                        <span
                          className={row.level === "all" ? "font-medium" : "text-muted-foreground"}
                        >
                          {row.label}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtInt(row.graduates)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPct(row.unemploymentPct)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtEur(row.medianIncome)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              Työttömyysaste = työttömät / työvoima (työlliset + työttömät). Alemmalla
              tutkintotasolla myös jatko-opiskelijat ovat mukana työvoiman ulkopuolella.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <SectionHeader
              title="Koulutusalat"
              description={`Työttömyysaste aloittain (${fieldSector === "university" ? "yliopisto" : "AMK"}, ${fields.length} alaa), matalimmasta korkeimpaan.`}
              action={
                <MetricToggle
                  label="Sektori"
                  value={fieldSector}
                  onChange={setFieldSector}
                  options={[
                    { value: "university", label: "Yliopisto" },
                    { value: "amk", label: "AMK" },
                  ]}
                />
              }
            />
          </CardHeader>
          <CardContent>
            <BarList
              max={fieldMax}
              format={(value) => fmtPct(value)}
              reference={{
                value: fieldReference ?? 0,
                label: `kaikkien ${fieldSector === "university" ? "yliopistojen" : "AMK:ien"} keskiarvo ${fmtPct(fieldReference)}`,
              }}
              rows={fields.map((field) => ({
                id: field.field,
                label: field.field,
                sublabel: `${field.degrees} tutkintoa · ${fmtInt(field.residents)} henkilöä`,
                detail: fmtEur(field.medianIncome),
                value: field.unemploymentPct,
                highlight: field.field.startsWith("Tietojenkäsittely"),
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <SectionHeader
            title="Työttömyyden kärki ja häntä"
            description="Tutkinnot, joissa on vähintään 50 Suomessa asuvaa valmistunutta. Yliopistojen alemmat tutkinnot (kandit) on jätetty pois, sillä ne ovat yleensä välitutkintoja matkalla maisteriin."
          />
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          {[
            { title: "Matalin työttömyys", rows: outliers.low },
            { title: "Korkein työttömyys", rows: outliers.high },
          ].map((list) => (
            <div key={list.title}>
              <p className="mb-2 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                {list.title}
              </p>
              <ul className="divide-y">
                {list.rows.map((degree, index) => (
                  <li key={degree.id}>
                    <button
                      type="button"
                      onClick={() => onOpenDegree(degree.id)}
                      className="flex w-full items-baseline gap-3 py-2 text-left transition-colors hover:text-capital"
                    >
                      <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{degree.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {SECTOR_SHORT[degree.sector]} · {LEVEL_SHORT[degree.level]} ·{" "}
                          {fmtInt(degree.national.residents)} henkilöä
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium tabular-nums">
                        {fmtPct(degree.national.unemploymentRate)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader
            title="Tutkintohaku"
            description={`${data.meta.degreeCount} tutkintoa. Valitse rivi avataksesi saman tutkinnon oppilaitosvertailun.`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Hae tutkintoa…"
                    className="h-8 w-full pl-8 sm:w-[230px]"
                  />
                </div>
                <Select
                  value={sectorFilter}
                  onValueChange={(value) => setSectorFilter(value as "all" | Sector)}
                >
                  <SelectTrigger size="sm" className="w-[168px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Kaikki sektorit</SelectItem>
                    <SelectItem value="university">Yliopisto</SelectItem>
                    <SelectItem value="amk">Ammattikorkeakoulu</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={levelFilter}
                  onValueChange={(value) => setLevelFilter(value as "all" | Level)}
                >
                  <SelectTrigger size="sm" className="w-[128px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Kaikki tasot</SelectItem>
                    <SelectItem value="lower">Alempi</SelectItem>
                    <SelectItem value="upper">Ylempi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
        </CardHeader>
        <CardContent>
          <div className="max-h-[540px] overflow-auto rounded-lg ring-1 ring-border/70">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  {(
                    [
                      ["name", "Tutkinto"],
                      ["field", "Ala"],
                      ["graduates", "Valmistuneet"],
                      ["unemploymentRate", "Työttömyys"],
                      ["medianIncome", "Mediaanitulo"],
                      ["schools", "Oppilaitoksia"],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <TableHead
                      key={key}
                      className={cn(
                        "whitespace-nowrap",
                        (key === "field" || key === "schools") && "hidden md:table-cell",
                        key !== "name" && key !== "field" && "text-right",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(key)}
                        className={cn(
                          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                          sort.key === key ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {label}
                        {sort.key === key ? (
                          sort.direction === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" />
                        )}
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDegrees.map((degree) => (
                  <TableRow
                    key={degree.id}
                    onClick={() => onOpenDegree(degree.id)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => onOpenDegree(degree.id)}
                        className="block max-w-[280px] truncate text-left font-medium transition-colors hover:text-capital"
                      >
                        {degree.name}
                      </button>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {SECTOR_SHORT[degree.sector]} · {LEVEL_SHORT[degree.level]}
                      </span>
                    </TableCell>
                    <TableCell className="hidden max-w-[190px] truncate text-muted-foreground md:table-cell">
                      {degree.field}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtInt(degree.national.graduates)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPct(degree.national.unemploymentRate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtEur(degree.national.medianIncome)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {degree.schools.length}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredDegrees.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ei hakua vastaavia tutkintoja.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <span>
                Näytetään {fmtInt(filteredDegrees.length)} / {fmtInt(data.degrees.length)} tutkintoa
              </span>
              <span className="inline-flex items-center gap-2">
                <Badge variant="outline">
                  {SECTOR_LABELS.university}: {fmtInt(university.all.graduates)}
                </Badge>
                <Badge variant="outline">
                  {SECTOR_LABELS.amk}: {fmtInt(amk.all.graduates)}
                </Badge>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="pb-2 text-[11px] text-muted-foreground">
        {summary.schools} oppilaitosta · {data.meta.source} · valmistumisvuosi{" "}
        {data.meta.graduationYear} · tulot {data.meta.incomeYear}
      </p>
    </div>
  );
}
