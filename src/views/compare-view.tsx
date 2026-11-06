import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, Sparkles } from "lucide-react";
import { ChartScope } from "@/components/chart-scope";
import { DegreePicker } from "@/components/degree-picker";
import { BarList } from "@/components/bar-list";
import { MetricToggle } from "@/components/metric-toggle";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { locationOf } from "@/lib/regions";
import { fmtDecimal, fmtEur, fmtInt, fmtPct, fmtPp } from "@/lib/format";
import { LEVEL_LABELS, LEVEL_SHORT, SECTOR_LABELS, SECTOR_SHORT } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { DataFile, Degree, NationalStats, SchoolStats } from "@/types";

interface CompareViewProps {
  data: DataFile;
  degreeId: string;
  onSelectDegree: (id: string) => void;
  onOpenCapital: () => void;
}

type Metric = "unemployment" | "income";
type SortKey =
  | "name"
  | "graduates"
  | "residents"
  | "unemploymentRate"
  | "medianIncome"
  | "delta";

const METRICS: { value: Metric; label: string }[] = [
  { value: "unemployment", label: "Työttömyys" },
  { value: "income", label: "Tulot" },
];

const INSIGHT_LABELS: Record<Metric, { best: string; worst: string }> = {
  unemployment: { best: "Matalin työttömyys", worst: "Korkein työttömyys" },
  income: { best: "Korkein mediaanitulo", worst: "Matalin mediaanitulo" },
};

const SHORTCUTS = [
  "Tietojenkäsittelytiede (fil. maist.)",
  "Tietotekniikka (dipl.ins.)",
  "Tradenomi (AMK), tietojenkäsittely",
];

function metricValue(metric: Metric, stats: NationalStats): number {
  if (metric === "unemployment") return stats.unemploymentRate;
  return stats.medianIncome;
}

function formatMetric(metric: Metric, value: number | null): string {
  if (value == null) return "–";
  return metric === "income" ? fmtEur(value) : fmtPct(value);
}

export function CompareView({ data, degreeId, onSelectDegree, onOpenCapital }: CompareViewProps) {
  const degree = data.degrees.find((item) => item.id === degreeId) ?? data.degrees[0];
  const [metric, setMetric] = useState<Metric>("unemployment");
  const [minResidents, setMinResidents] = useState("0");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "unemploymentRate",
    direction: "asc",
  });

  const national = degree.national;

  const rows = useMemo(() => {
    const threshold = Number(minResidents) || 0;
    const filtered = degree.schools.filter((school) => school.residents >= threshold);

    const accessor = (school: SchoolStats): string | number => {
      switch (sort.key) {
        case "name":
          return school.name.toLocaleLowerCase("fi");
        case "delta":
          return school.unemploymentRate - national.unemploymentRate;
        default:
          return school[sort.key];
      }
    };

    return [...filtered].sort((a, b) => {
      const left = accessor(a);
      const right = accessor(b);
      const result =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "fi");
      return sort.direction === "asc" ? result : -result;
    });
  }, [degree.schools, minResidents, national.unemploymentRate, sort]);

  const chartRows = useMemo(() => {
    const direction = metric === "unemployment" ? 1 : -1;
    return [...rows]
      .map((school) => ({ school, value: metricValue(metric, school) }))
      .sort((a, b) => direction * (a.value - b.value))
      .map(({ school, value }) => ({
        id: school.name,
        label: school.name,
        sublabel: `${locationOf(school.name).city} · ${fmtInt(school.graduates)} valmistunutta`,
        detail: `n=${fmtInt(school.residents)}`,
        value,
      }));
  }, [metric, rows]);

  const chartMax =
    metric === "income"
      ? Math.ceil(Math.max(...rows.map((school) => school.medianIncome), national.medianIncome) * 1.12)
      : Math.ceil(
          (Math.max(...rows.map((school) => school.unemploymentRate), national.unemploymentRate, 5) *
            1.15) /
            5,
        ) * 5;

  const insight = useMemo(() => {
    if (rows.length === 0) return null;
    const values = rows.map((school) => metricValue(metric, school));
    const bestValue = metric === "unemployment" ? Math.min(...values) : Math.max(...values);
    const worstValue = metric === "unemployment" ? Math.max(...values) : Math.min(...values);
    const best = rows[values.indexOf(bestValue)] ?? rows[0];
    const worst = rows[values.indexOf(worstValue)] ?? rows[rows.length - 1];
    const nationalValue = metricValue(metric, national);

    const misses =
      metric === "unemployment"
        ? rows.filter((school) => school.unemploymentRate > national.unemploymentRate).length
        : rows.filter((school) => school.medianIncome < national.medianIncome).length;

    return { best, bestValue, worst, worstValue, nationalValue, misses };
  }, [metric, national, rows]);

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "name" ? "asc" : "desc" },
    );
  };

  const shortcutDegrees = SHORTCUTS.map((name) => data.degrees.find((d) => d.name === name)).filter(
    (d): d is Degree => Boolean(d),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Sama tutkinto, eri oppilaitokset
          </p>
          <DegreePicker degrees={data.degrees} value={degree.id} onChange={onSelectDegree} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] text-muted-foreground">Pikavalinnat:</span>
          {shortcutDegrees.map((shortcut) => (
            <Button
              key={shortcut.id}
              variant={shortcut.id === degree.id ? "secondary" : "outline"}
              size="sm"
              onClick={() => onSelectDegree(shortcut.id)}
              className="max-w-[240px] truncate"
            >
              {shortcut.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{degree.name}</h1>
        <Badge variant="secondary">{SECTOR_LABELS[degree.sector]}</Badge>
        <Badge variant="outline">{LEVEL_LABELS[degree.level]}</Badge>
        <Badge variant="outline">{degree.field}</Badge>
        {degree.field.startsWith("Tietojenkäsittely") && degree.sector === "university" ? (
          <Button variant="link" size="sm" onClick={onOpenCapital} className="h-6 px-0">
            <Sparkles className="size-3.5" />
            Pääkaupunkiseutuanalyysi
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Työttömyysaste"
          value={fmtPct(national.unemploymentRate)}
          hint="Koko maan keskiarvo tälle tutkinnolle"
        />
        <StatCard
          label="Mediaanitulo"
          value={fmtEur(national.medianIncome)}
          hint={`Tulot ${data.meta.incomeYear}`}
        />
        <StatCard
          label="Valmistuneita"
          value={fmtInt(national.graduates)}
          hint={`${fmtInt(national.residents)} Suomessa asuvaa`}
        />
        <StatCard
          label="Oppilaitoksia"
          value={fmtInt(degree.schools.length)}
          hint="Joissa tutkinto on suoritettu"
        />
      </div>

      {insight ? (
        <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm ring-1 ring-border">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">{INSIGHT_LABELS[metric].best}:</span>
            <span>{insight.best.name}</span>
            <span className="font-semibold tabular-nums">
              {formatMetric(metric, insight.bestValue)}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium">{INSIGHT_LABELS[metric].worst}:</span>
            <span>{insight.worst.name}</span>
            <span className="font-semibold tabular-nums">
              {formatMetric(metric, insight.worstValue)}
            </span>
            <span className="text-muted-foreground">
              · ero{" "}
              {metric === "income"
                ? fmtEur(Math.abs(insight.bestValue - insight.worstValue))
                : `${fmtDecimal(Math.abs(insight.bestValue - insight.worstValue))} pp`}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {insight.misses} oppilaitosta jää kansallisen keskiarvon (
            {formatMetric(metric, insight.nationalValue)}) heikommalle puolelle.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <SectionHeader
            title="Oppilaitosten vertailu"
            description="Palkki näyttää oppilaitoksen arvon, katkoviiva koko maan keskiarvon."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <MetricToggle
                  label="Mittari"
                  value={metric}
                  onChange={setMetric}
                  options={METRICS}
                />
                <Select value={minResidents} onValueChange={setMinResidents}>
                  <SelectTrigger size="sm" className="w-[168px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Kaikki otokset</SelectItem>
                    <SelectItem value="20">väh. 20 henkilöä</SelectItem>
                    <SelectItem value="40">väh. 40 henkilöä</SelectItem>
                    <SelectItem value="60">väh. 60 henkilöä</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
        </CardHeader>
        <CardContent>
          <ChartScope label="Tutkinto" items={[degree.name]} />
          <BarList
            max={chartMax}
            format={(value) => formatMetric(metric, value)}
            reference={{
              value: metricValue(metric, national),
              label: `kansallinen keskiarvo ${formatMetric(metric, metricValue(metric, national))}`,
            }}
            rows={chartRows}
            emptyLabel="Valittu vähimmäisotos sulkee kaikki oppilaitokset pois. Laske rajaa nähdäksesi vertailun."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeader
            title="Kaikki tunnusluvut"
            description="Klikkaa sarakeotsikkoa vaihtaaksesi järjestystä. Ero-sarake vertaa työttömyysastetta koko maan keskiarvoon."
          />
        </CardHeader>
        <CardContent>
          <ChartScope label="Tutkinto" items={[degree.name]} />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {(
                    [
                      ["name", "Oppilaitos"],
                      ["graduates", "Valmistuneet"],
                      ["residents", "Asuvat"],
                      ["unemploymentRate", "Työttömyys"],
                      ["medianIncome", "Mediaanitulo"],
                      ["delta", "Ero keskiarvoon"],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <TableHead
                      key={key}
                      className={cn(
                        "whitespace-nowrap",
                        key === "residents" && "hidden md:table-cell",
                        key !== "name" && "text-right",
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
                {rows.map((school) => {
                  const delta = school.unemploymentRate - national.unemploymentRate;
                  return (
                    <TableRow key={school.name}>
                      <TableCell>
                        <span className="block max-w-[260px] truncate font-medium">
                          {school.name}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Building2 className="size-3" />
                          {locationOf(school.name).city}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtInt(school.graduates)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {fmtInt(school.residents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtPct(school.unemploymentRate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtEur(school.medianIncome)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          delta > 0
                            ? "text-negative"
                            : delta < 0
                              ? "text-positive"
                              : "text-muted-foreground",
                        )}
                      >
                        {fmtPp(delta)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ei oppilaitoksia valitulla vähimmäisotoksella.
            </p>
          ) : null}
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            {SECTOR_SHORT[degree.sector]} · {LEVEL_SHORT[degree.level]}. Työttömyysaste lasketaan
            työvoimasta (työlliset + työttömät). Pienten otosten luvut vaihtelevat voimakkaasti.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
