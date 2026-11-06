import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { ChartScope } from "@/components/chart-scope";
import { ForestPlot, type ForestGroup, type ForestPoint } from "@/components/forest-plot";
import { MetricToggle } from "@/components/metric-toggle";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { groupByCity, poolBySchool, type SchoolRow } from "@/lib/derive";
import { fmtEur, fmtInt, fmtPct, fmtPp, fmtSignedEur } from "@/lib/format";
import { DEGREE_CLUSTERS } from "@/lib/labels";
import { niceDomain, percentage, poolRows, type Pooled } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { DataFile } from "@/types";

interface CapitalViewProps {
  data: DataFile;
  onOpenDegree: (id: string) => void;
}

type Metric = "unemployment" | "income";
type Grouping = "binary" | "tiers";
type GroupKey = "capital" | "large" | "other";

const METRICS: { value: Metric; label: string }[] = [
  { value: "unemployment", label: "Työttömyys" },
  { value: "income", label: "Tulot" },
];

const GROUP_META: Record<GroupKey, { label: string; short: string; color: string }> = {
  capital: { label: "Pääkaupunkiseutu", short: "PKS", color: "var(--capital)" },
  large: { label: "Muut suuret yliopistokaupungit", short: "Suuret", color: "var(--chart-2)" },
  other: { label: "Muu Suomi", short: "Muu", color: "var(--other)" },
};

const LARGE_UNIVERSITY_CITIES = new Set(["Tampere", "Turku", "Oulu", "Jyväskylä"]);

const METRIC_LABEL: Record<Metric, string> = {
  unemployment: "työttömyysaste",
  income: "mediaanitulo",
};

const METRIC_SHORT: Record<Metric, string> = {
  unemployment: "työttömyys",
  income: "mediaanitulo",
};

function groupOf(row: SchoolRow, grouping: Grouping): GroupKey {
  if (row.capital) return "capital";
  if (grouping === "tiers" && LARGE_UNIVERSITY_CITIES.has(row.city)) return "large";
  return "other";
}

function pooledValue(pooled: Pooled, metric: Metric): number | null {
  if (metric === "unemployment") return pooled.unemploymentPct;
  return pooled.units > 0 ? pooled.medianIncome : null;
}

function pooledSample(pooled: Pooled, metric: Metric): number {
  return metric === "unemployment" ? pooled.labourForce : pooled.residents;
}

function schoolEstimate(row: SchoolRow, metric: Metric): { value: number | null; n: number } {
  if (metric === "income") {
    return { value: row.medianIncome, n: row.residents };
  }
  const labourForce = row.employed + row.unemployed;
  return { value: percentage(row.unemployed, labourForce), n: labourForce };
}

function formatMetric(metric: Metric, value: number | null): string {
  if (value == null) return "–";
  return metric === "income" ? fmtEur(value) : fmtPct(value);
}

export function CapitalView({ data, onOpenDegree }: CapitalViewProps) {
  // Selectable pool = union of all cluster degrees (name-matched, deduped).
  const poolDegrees = useMemo(
    () =>
      DEGREE_CLUSTERS.flatMap((cluster) => cluster.degrees)
        .flatMap((name) => data.degrees.find((degree) => degree.name === name) ?? [])
        .filter(
          (degree, index, all) => all.findIndex((other) => other.id === degree.id) === index,
        )
        .sort((a, b) => b.national.graduates - a.national.graduates),
    [data.degrees],
  );

  // Resolved degree ids per cluster, in cluster order.
  const clusterIds = useMemo(() => {
    const byName = new Map(poolDegrees.map((degree) => [degree.name, degree.id] as const));
    return new Map(
      DEGREE_CLUSTERS.map(
        (cluster) =>
          [
            cluster.id,
            cluster.degrees.flatMap((name) => byName.get(name) ?? []),
          ] as const,
      ),
    );
  }, [poolDegrees]);

  const defaultIds = useMemo(() => {
    const fallback = DEGREE_CLUSTERS[0];
    const names = fallback.defaultSelected ?? fallback.degrees;
    const byName = new Map(poolDegrees.map((degree) => [degree.name, degree.id] as const));
    return names.flatMap((name) => byName.get(name) ?? []);
  }, [poolDegrees]);

  const [selected, setSelected] = useState<string[]>(defaultIds);
  const [metric, setMetric] = useState<Metric>("unemployment");
  const [grouping, setGrouping] = useState<Grouping>("binary");
  const [minResidents, setMinResidents] = useState("0");

  const degrees = useMemo(
    () => poolDegrees.filter((degree) => selected.includes(degree.id)),
    [poolDegrees, selected],
  );

  const rows = useMemo(() => {
    const threshold = Number(minResidents) || 0;
    return poolBySchool(degrees).filter((row) => row.residents >= threshold);
  }, [degrees, minResidents]);

  const groups = useMemo(() => {
    const keys: GroupKey[] = grouping === "binary" ? ["capital", "other"] : ["capital", "large", "other"];
    return keys
      .map((key) => {
        const groupRows = rows.filter((row) => groupOf(row, grouping) === key);
        return {
          key,
          ...GROUP_META[key],
          rows: groupRows,
          pooled: poolRows(groupRows),
        };
      })
      .filter((group) => group.key === "capital" || group.rows.length > 0);
  }, [grouping, rows]);

  const capital = groups.find((group) => group.key === "capital");
  const overall = useMemo(() => poolRows(rows), [rows]);
  const overallValue = pooledValue(overall, metric);

  const comparisons = groups
    .filter((group) => group.key !== "capital")
    .map((group) => {
      const capitalValue = capital ? pooledValue(capital.pooled, metric) : null;
      const groupValue = pooledValue(group.pooled, metric);
      if (capitalValue == null || groupValue == null || !capital) return null;

      return { group, capitalValue, groupValue, diff: groupValue - capitalValue };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const chartValues = useMemo(() => {
    const values: number[] = [];
    for (const group of groups) {
      for (const row of group.rows) {
        const estimate = schoolEstimate(row, metric);
        if (estimate.value != null) values.push(estimate.value);
      }
      const value = pooledValue(group.pooled, metric);
      if (value != null) values.push(value);
    }
    return values;
  }, [groups, metric]);

  const domain = useMemo<[number, number]>(() => {
    if (chartValues.length === 0) return metric === "income" ? [20000, 45000] : [0, 100];
    return metric === "income"
      ? niceDomain(chartValues, { floor: 0, ceil: 120000, step: 2000 })
      : niceDomain(chartValues, { floor: 0, ceil: 100, step: 5 });
  }, [chartValues, metric]);

  const forestGroups = useMemo<ForestGroup[]>(() => {
    return groups.flatMap((group): ForestGroup[] => {
      const value = pooledValue(group.pooled, metric);
      if (value == null) return [];

      const points: ForestPoint[] = group.rows
        .flatMap((row): ForestPoint[] => {
          const estimate = schoolEstimate(row, metric);
          if (estimate.value == null) return [];
          return [
            {
              id: row.name,
              label: row.name,
              sublabel: `${row.city} · n=${fmtInt(estimate.n)} · ${row.degrees} tutk.`,
              value: estimate.value,
            },
          ];
        })
        .sort((a, b) => b.value - a.value);

      return [
        {
          id: group.key,
          label: group.label,
          note: `${fmtInt(group.pooled.units)} oppilaitosta · ${fmtInt(group.pooled.residents)} henkilöä`,
          color: group.color,
          points,
          pooled: { value, n: pooledSample(group.pooled, metric) },
        },
      ];
    });
  }, [groups, metric]);

  const cityRows = useMemo(() => groupByCity(rows), [rows]);

  const perDegree = useMemo(() => {
    const threshold = Number(minResidents) || 0;
    return degrees
      .map((degree) => {
        const degreeRows = poolBySchool([degree]).filter((row) => row.residents >= threshold);
        const capitalPooled = poolRows(degreeRows.filter((row) => row.capital));
        const otherPooled = poolRows(degreeRows.filter((row) => !row.capital));
        const capitalValue = pooledValue(capitalPooled, metric);
        const otherValue = pooledValue(otherPooled, metric);
        return {
          degree,
          capital: capitalPooled,
          other: otherPooled,
          capitalValue,
          otherValue,
          diff: capitalValue != null && otherValue != null ? otherValue - capitalValue : null,
        };
      })
      .sort((a, b) => b.degree.national.graduates - a.degree.national.graduates);
  }, [degrees, metric, minResidents]);

  const toggleDegree = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const hasData = degrees.length > 0 && rows.length > 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <SectionHeader
            title="Analyysin rajaus"
              description="Esivalitut tutkintokokonaisuudet (klusterit). Voit myös valita tutkintoja yksitellen alta."
              action={
              <div className="flex flex-wrap items-center gap-1.5">
                {DEGREE_CLUSTERS.map((cluster) => {
                  const ids = clusterIds.get(cluster.id) ?? [];
                  const isActive =
                    ids.length > 0 &&
                    selected.length === ids.length &&
                    ids.every((id) => selected.includes(id));
                  return (
                    <Button
                      key={cluster.id}
                      size="sm"
                      variant={isActive ? "secondary" : "outline"}
                      onClick={() => setSelected(ids)}
                    >
                      {cluster.label}
                    </Button>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelected(poolDegrees.map((degree) => degree.id))}
                >
                  Kaikki
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                  Tyhjennä
                </Button>
              </div>
            }
          />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-4">
            {DEGREE_CLUSTERS.map((cluster) => {
              const ids = clusterIds.get(cluster.id) ?? [];
              const items = ids.flatMap(
                (id) => poolDegrees.find((degree) => degree.id === id) ?? [],
              );
              if (items.length === 0) return null;
              const allActive = ids.length > 0 && ids.every((id) => selected.includes(id));
              return (
                <div key={cluster.id}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                      {cluster.label}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px]"
                      onClick={() =>
                        setSelected((current) =>
                          allActive
                            ? current.filter((id) => !ids.includes(id))
                            : [...new Set([...current, ...ids])],
                        )
                      }
                    >
                      {allActive ? "Poista valinta" : "Valitse kaikki"}
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((degree) => {
                      const active = selected.includes(degree.id);
                      const checkboxId = `${cluster.id}-${degree.id}`;
                      return (
                        <div
                          key={degree.id}
                          className={cn(
                            "flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
                            active ? "border-capital/40 bg-capital/5" : "hover:bg-muted/50",
                          )}
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={active}
                            onCheckedChange={() => toggleDegree(degree.id)}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={checkboxId}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <span className="block text-xs font-medium break-words">
                              {degree.name}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {fmtInt(degree.national.graduates)} valmistunutta ·{" "}
                              {degree.schools.length} oppilaitosta
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Mittari</p>
              <MetricToggle label="Mittari" value={metric} onChange={setMetric} options={METRICS} />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Ryhmittely</p>
              <MetricToggle
                label="Ryhmittely"
                value={grouping}
                onChange={setGrouping}
                options={[
                  { value: "binary", label: "PKS vs muut" },
                  { value: "tiers", label: "Kaupunkiluokittain" },
                ]}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Vähimmäisotos</p>
              <Select value={minResidents} onValueChange={setMinResidents}>
                <SelectTrigger size="sm" className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Kaikki koot</SelectItem>
                  <SelectItem value="20">väh. 20 henkeä</SelectItem>
                  <SelectItem value="40">väh. 40 henkeä</SelectItem>
                  <SelectItem value="60">väh. 60 henkeä</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
              Pääkaupunkiseutu = Helsinki, Espoo, Vantaa ja Kauniainen pääkampuksen kaupungin
              mukaan. Muut ryhmät määräytyvät samoin.
            </p>
          </div>
        </CardContent>
      </Card>

      {!hasData ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium">Ei tarkasteltavaa aineistoa</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Valitse vähintään yksi tutkinto, tai laske vähimmäisotoksen rajaa. Jos valitset
              tutkintoja, joilla ei ole pääkaupunkiseudun oppilaitoksia, vertailu ei ole
              mahdollinen.
            </p>
            <Button className="mt-4" size="sm" onClick={() => setSelected(defaultIds)}>
              Palauta oletusvalinnat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            className={cn(
              "grid gap-3 md:grid-cols-2",
              grouping === "tiers" ? "xl:grid-cols-4" : "xl:grid-cols-3",
            )}
          >
            {groups.map((group) => {
              const value = pooledValue(group.pooled, metric);
              const comparison = comparisons.find((item) => item.group.key === group.key);
              return (
                <div
                  key={group.key}
                  className="rounded-xl bg-card p-4 ring-1 ring-border"
                  style={{ boxShadow: `inset 3px 0 0 ${group.color}` }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: group.color }}
                      aria-hidden
                    />
                    <p className="text-[11px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                      {group.label}
                    </p>
                  </div>
                  <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                    {formatMetric(metric, value)}
                  </p>
                  <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                    {metric === "income" ? "Painotettu keskiarvo · " : ""}
                    n = {fmtInt(pooledSample(group.pooled, metric))} · {group.pooled.units}{" "}
                    oppilaitosta
                  </p>
                  {comparison ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                          (metric === "unemployment" ? comparison.diff < 0 : comparison.diff > 0)
                            ? "bg-positive/12 text-positive"
                            : "bg-negative/12 text-negative",
                        )}
                      >
                        {comparison.diff > 0 ? (
                          <ArrowUpRight className="size-3" />
                        ) : (
                          <ArrowDownRight className="size-3" />
                        )}
                        {metric === "income" ? fmtSignedEur(comparison.diff) : fmtPp(comparison.diff)} vs PKS
                      </span>

                    </div>
                  ) : (
                    <p className="mt-3 text-[11px] text-muted-foreground">Vertailukohta</p>
                  )}
                </div>
              );
            })}
            <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border">
              <div className="flex items-center gap-2">
                <Info className="size-3.5 text-muted-foreground" />
                <p className="text-[11px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                  Koko aineisto
                </p>
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                {formatMetric(metric, overallValue)}
              </p>
              <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                n = {fmtInt(pooledSample(overall, metric))} · {overall.units} oppilaitosta
              </p>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Viite: valittujen tutkintojen yhdistetty arvo kaikkialla Suomessa.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Johtopäätös"
                description="Yhdistetty arvio painottaa oppilaitoksia henkilömäärällä, ei koulujen lukumäärällä."
              />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {capital ? (
                <>
                  <p className="leading-relaxed">
                    Pääkaupunkiseudun yhdistetty {METRIC_LABEL[metric]} on{" "}
                    <span className="font-semibold tabular-nums">
                      {formatMetric(metric, pooledValue(capital.pooled, metric))}
                    </span>
                    . Vertailu muuhun Suomeen:
                  </p>
                  <ul className="space-y-2">
                    {comparisons.map((comparison) => {
                      const difference = comparison.diff;
                      const better =
                        metric === "unemployment" ? difference < 0 : difference > 0;

                      return (
                        <li
                          key={comparison.group.key}
                          className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg bg-muted/40 px-3 py-2"
                        >
                          <span
                            className="size-2 self-center rounded-full"
                            style={{ background: comparison.group.color }}
                            aria-hidden
                          />
                          <span className="font-medium">{comparison.group.label}</span>
                          <span className="tabular-nums">
                            {formatMetric(metric, comparison.groupValue)}
                          </span>
                          <span className="text-xs text-muted-foreground">ero PKS:ään</span>
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              better ? "text-positive" : "text-negative",
                            )}
                          >
                            {metric === "income" ? fmtSignedEur(difference) : fmtPp(difference)}
                          </span>

                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {metric === "income"
                      ? "Mediaanitulot kuvaavat jakauman keskikohtaa, ei keskituloa. Yksittäiset suurituloiset eivät nosta lukua."
                      : "Luvut ovat kuvailevia: pienten otosten erot voivat johtua sattumasta, eikä erojen syistä voi päätellä tämän aineiston perusteella."}
                  </p>
                  {comparisons.length > 1 ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Kaupunkiluokittelu osoittaa, ettei “muu Suomi” ole yhtenäinen ryhmä: suurten
                      yliopistokaupunkien taso on lähempänä pääkaupunkiseutua kuin muun Suomen.
                      Suuriin yliopistokaupunkeihin lasketaan Tampere, Turku, Oulu ja Jyväskylä.
                    </p>
                  ) : null}
                </>
              ) : null}
              {metric === "income" ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Tulot ovat vuodelta {data.meta.incomeYear} ja kuvaavat mediaanituloa, joten
                  yksittäiset suurituloiset eivät nosta lukua.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title={metric === "unemployment" ? "Työttömyysaste oppilaitoksittain" : "Mediaanitulo oppilaitoksittain"}
                description="Piste = oppilaitoksen arvo, vinoneliö = ryhmän yhdistetty arvo. Katkoviiva = valittujen tutkintojen yhteinen taso."
              />
            </CardHeader>
            <CardContent>
              <ChartScope
                label={`Mukana ${degrees.length} tutkintoa`}
                items={degrees.map((degree) => degree.name)}
              />
              <ForestPlot
                groups={forestGroups}
                domain={domain}
                format={(value) => formatMetric(metric, value)}
                axisFormat={metric === "income" ? (value) => `${Math.round(value / 1000)} t€` : (value) => `${value} %`}
                reference={overallValue ?? undefined}
                ariaLabel={`${METRIC_LABEL[metric]} oppilaitoksittain pääkaupunkiseudulla ja muualla Suomessa`}
              />
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                <span>Pisteet kuvaavat oppilaitosten eroja, eivät erojen syitä.</span>
                {minResidents !== "0" ? (
                  <span>Alle {minResidents} hengen oppilaitokset on rajattu pois.</span>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title={`Tutkinnoittain: ${METRIC_LABEL[metric]} (PKS vs muu Suomi)`}
                description="Sama vertailu erikseen kullekin tutkinnolle, jotta tutkintorakenne ei selitä eroa."
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:hidden">
                {perDegree.map((item) => (
                  <button
                    key={item.degree.id}
                    type="button"
                    onClick={() => onOpenDegree(item.degree.id)}
                    className="block w-full rounded-lg px-3 py-2.5 text-left ring-1 ring-border transition-colors active:bg-muted/50"
                  >
                    <span className="block text-sm leading-snug font-medium">
                      {item.degree.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {item.degree.schools.length} oppilaitosta
                    </span>
                    <span className="mt-2 grid grid-cols-3 gap-2">
                      <span>
                        <span className="block text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                          PKS
                        </span>
                        <span className="block text-sm font-semibold tabular-nums">
                          {formatMetric(metric, item.capitalValue)}
                        </span>
                      </span>
                      <span>
                        <span className="block text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                          Muu
                        </span>
                        <span className="block text-sm font-semibold tabular-nums">
                          {formatMetric(metric, item.otherValue)}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                          Ero
                        </span>
                        <span
                          className={cn(
                            "block text-sm font-semibold tabular-nums",
                            item.diff == null
                              ? "text-muted-foreground"
                              : (metric === "unemployment" ? item.diff < 0 : item.diff > 0)
                                ? "text-positive"
                                : "text-negative",
                          )}
                        >
                          {item.diff == null
                            ? "–"
                            : metric === "income"
                              ? fmtSignedEur(item.diff)
                              : fmtPp(item.diff)}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tutkinto</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">PKS n</TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        PKS {METRIC_SHORT[metric]}
                      </TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Muu n</TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        Muu {METRIC_SHORT[metric]}
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">Ero</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perDegree.map((item) => (
                      <TableRow key={item.degree.id}>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => onOpenDegree(item.degree.id)}
                            className="block max-w-[200px] text-left font-medium whitespace-normal break-words transition-colors hover:text-capital sm:max-w-[300px] sm:truncate"
                          >
                            {item.degree.name}
                          </button>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {item.degree.schools.length} oppilaitosta
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">
                          {fmtInt(pooledSample(item.capital, metric))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMetric(metric, item.capitalValue)}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">
                          {fmtInt(pooledSample(item.other, metric))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMetric(metric, item.otherValue)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            item.diff == null
                              ? "text-muted-foreground"
                              : (metric === "unemployment" ? item.diff < 0 : item.diff > 0)
                                ? "text-positive"
                                : "text-negative",
                          )}
                        >
                          {item.diff == null
                            ? "–"
                            : metric === "income"
                              ? fmtSignedEur(item.diff)
                              : fmtPp(item.diff)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Ero = muu Suomi − pääkaupunkiseutu.
                {perDegree.some((item) => item.capital.units === 0)
                  ? " Osa valituista tutkinnoista ei ole tarjolla pääkaupunkiseudulla, joten niiden PKS-sarakkeet ovat tyhjiä."
                  : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title={`Kaupungeittain: ${METRIC_LABEL[metric]}`}
                description="Yhdistetyt luvut valituista tutkinnoista. Pääkaupunkiseudun kaupungit on korostettu."
              />
            </CardHeader>
            <CardContent>
              <ChartScope
                label={`Mukana ${degrees.length} tutkintoa`}
                items={degrees.map((degree) => degree.name)}
              />
              <div className="space-y-3 sm:hidden">
                {cityRows.map((city) => (
                  <div key={city.city} className="rounded-lg px-3 py-2.5 ring-1 ring-border">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {city.capital ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-capital" aria-hidden />
                      ) : null}
                      {city.city}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {city.schools.join(", ")}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                          Työttömyys
                        </p>
                        <p className="text-sm font-semibold tabular-nums">
                          {fmtPct(city.unemploymentPct)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                          Mediaanitulo
                        </p>
                        <p className="text-sm font-semibold tabular-nums">
                          {fmtEur(city.medianIncome)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kaupunki</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Oppilaitoksia</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">n</TableHead>
                      <TableHead className="text-right">Työttömyys</TableHead>
                      <TableHead className="text-right">Mediaanitulo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cityRows.map((city) => (
                      <TableRow key={city.city}>
                        <TableCell>
                          <span className="inline-flex items-center gap-2 font-medium">
                            {city.capital ? (
                              <span className="size-1.5 rounded-full bg-capital" aria-hidden />
                            ) : null}
                            {city.city}
                          </span>
                          <span className="mt-0.5 block max-w-[240px] text-[11px] whitespace-normal break-words text-muted-foreground sm:max-w-[340px] sm:truncate">
                            {city.schools.join(", ")}
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">
                          {city.schools.length}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">
                          {fmtInt(city.labourForce)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtPct(city.unemploymentPct)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtEur(city.medianIncome)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader
                title="Menetelmä ja tulkinta"
                description="Miten luvut on muodostettu ja mitä ne eivät kerro."
              />
            </CardHeader>
            <CardContent className="grid gap-4 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
              <ul className="space-y-2">
                <li>
                  <span className="font-medium text-foreground">Yhdistäminen.</span> Ryhmän luvut
                  lasketaan yhteenlasketuista henkilömääristä (työttömät / työvoima), ei
                  oppilaitosten prosenttien keskiarvona. Siksi suuret kohortit painottuvat.
                </li>
                <li>
                  <span className="font-medium text-foreground">Kuvailevuus.</span> Eroja ei testata
                  tilastollisesti. Pienet otokset vaihtelevat voimakkaasti, joten tulokset ovat
                  suuntaa antavia.
                </li>
                <li>
                  <span className="font-medium text-foreground">Tulot.</span> Mediaanitulojen
                  ryhmäarvo on oppilaitosmediaanien painotettu keskiarvo, ei todellinen yhteinen
                  mediaani.
                </li>
              </ul>
              <ul className="space-y-2">
                <li>
                  <span className="font-medium text-foreground">Ryhmittely.</span> Oppilaitos
                  sijoitetaan pääkampuksen kaupungin mukaan. Monikampuksiset oppilaitokset (esim.
                  Itä-Suomen yliopisto, LUT, Lab, Xamk, Humak) ovat likiarvoja. Suuriin
                  yliopistokaupunkeihin lasketaan Tampere, Turku, Oulu ja Jyväskylä.
                </li>
                <li>
                  <span className="font-medium text-foreground">Otoskoko.</span> n tarkoittaa
                  Suomessa asuvia valmistuneita; työttömyysasteessa n on työvoima (työlliset +
                  työttömät). Pienet n:t tekevät luvuista epävakaampia.
                </li>
                <li>
                  <span className="font-medium text-foreground">Aineisto.</span>{" "}
                  {data.meta.source}. Valmistuneet {data.meta.graduationYear}, tulot{" "}
                  {data.meta.incomeYear}. Työttömyysaste = työttömät / (työlliset + työttömät).
                </li>
                <li>
                  <span className="font-medium text-foreground">Ei kausaliteettia.</span> Ero voi
                  heijastaa alueen työmarkkinoita, opiskelijoiden valikoitumista, muuttoa töiden
                  perässä tai alakohtaista rakennetta. Tulokset ovat kuvailevia.
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
