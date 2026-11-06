import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  Landmark,
  Moon,
  Sun,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadData } from "@/lib/load";
import { cn } from "@/lib/utils";
import type { DataFile } from "@/types";
import { CapitalView } from "@/views/capital-view";
import { CompareView } from "@/views/compare-view";
import { OverviewView } from "@/views/overview-view";

const ROUTES = ["yleiskuva", "vertailu", "paakaupunkiseutu"] as const;
type Route = (typeof ROUTES)[number];

const NAV: {
  route: Route;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
}[] = [
  { route: "yleiskuva", label: "Yleiskuva", shortLabel: "Yleiskuva", icon: LayoutDashboard },
  { route: "vertailu", label: "Tutkintojen vertailu", shortLabel: "Vertailu", icon: Users },
  {
    route: "paakaupunkiseutu",
    label: "Pääkaupunkiseutu",
    shortLabel: "PKS",
    icon: Landmark,
  },
];

interface ParsedRoute {
  route: Route;
  degreeId?: string;
}

function readRoute(): ParsedRoute {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [routePart, degreePart] = raw.split("/");
  const route = (ROUTES as readonly string[]).includes(routePart)
    ? (routePart as Route)
    : "yleiskuva";
  return {
    route,
    degreeId: degreePart ? decodeURIComponent(degreePart) : undefined,
  };
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DataFile };

export default function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [routeState, setRouteState] = useState<ParsedRoute>(readRoute);
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    let active = true;
    loadData()
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Tuntematon virhe.",
        });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => setRouteState(readRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [dark]);

  const navigate = useCallback((route: Route, degreeId?: string) => {
    const hash = `#/${route}${degreeId ? `/${encodeURIComponent(degreeId)}` : ""}`;
    if (window.location.hash === hash) {
      setRouteState(readRoute());
    } else {
      window.location.hash = hash;
    }
  }, []);

  const data = state.status === "ready" ? state.data : null;

  const defaultDegreeId = useMemo(() => {
    if (!data) return "";
    const preferred = data.degrees.find(
      (degree) => degree.name === "Tietojenkäsittelytiede (fil. maist.)",
    );
    return (preferred ?? data.degrees[0]).id;
  }, [data]);

  const degreeId = routeState.degreeId ?? defaultDegreeId;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => navigate("yleiskuva")}
            className="flex items-center gap-3 text-left"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-4.5" />
            </span>
            <span>
              <span className="block text-sm leading-tight font-semibold tracking-tight">
                Sijoittumisdata
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Korkeakoulutetut{data ? ` · valmistuneet ${data.meta.graduationYear}` : ""}
              </span>
            </span>
          </button>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:flex-1">
            <nav className="flex items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-0.5">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = routeState.route === item.route;
                return (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => navigate(item.route)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                      active
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">{item.shortLabel}</span>
                  </button>
                );
              })}
            </nav>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDark((value) => !value)}
              aria-label={dark ? "Vaihda vaaleaan teemaan" : "Vaihda tummaan teemaan"}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {state.status === "loading" ? (
          <div className="grid min-h-[60vh] place-items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Ladataan sijoittumisdataa…
            </div>
          </div>
        ) : null}

        {state.status === "error" ? (
          <Card className="mx-auto max-w-xl">
            <CardContent className="py-8 text-center">
              <TriangleAlert className="mx-auto size-6 text-negative" />
              <p className="mt-3 text-sm font-medium">Tietojen lataus epäonnistui</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                {state.message} Varmista, että data.json on projektin juuressa ja että
                public/data.json on synkronoitu komennolla <code>npm run sync-data</code>.
              </p>
              <Button className="mt-4" size="sm" onClick={() => window.location.reload()}>
                Yritä uudelleen
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {data ? (
          <>
            {routeState.route !== "vertailu" ? (
              <div className="mb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {routeState.route === "yleiskuva"
                      ? "Korkeakoulutettujen sijoittuminen"
                      : "Pääkaupunkiseutu vs muu Suomi"}
                  </h1>
                  <Badge variant="outline">Valmistuneet {data.meta.graduationYear}</Badge>
                  <Badge variant="outline">Tulot {data.meta.incomeYear}</Badge>
                </div>
                <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  {routeState.route === "yleiskuva"
                    ? "Työttömyys ja mediaanitulot tutkinnoittain. Avaa tutkinto vertaillaksesi samaa tutkintoa eri oppilaitoksissa."
                    : "Meta-analyysi ICT-alojen yliopistotutkinnoista: onko pääkaupunkiseudulla matalampi työttömyys kuin muualla Suomessa?"}
                </p>
              </div>
            ) : null}

            {routeState.route === "yleiskuva" ? (
              <OverviewView data={data} onOpenDegree={(id) => navigate("vertailu", id)} />
            ) : null}

            {routeState.route === "vertailu" ? (
              <CompareView
                data={data}
                degreeId={degreeId}
                onSelectDegree={(id) => navigate("vertailu", id)}
                onOpenCapital={() => navigate("paakaupunkiseutu")}
              />
            ) : null}

            {routeState.route === "paakaupunkiseutu" ? (
              <CapitalView data={data} onOpenDegree={(id) => navigate("vertailu", id)} />
            ) : null}

            <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t pt-4 pb-2 text-[11px] text-muted-foreground">
              <span>
                Lähde: {data.meta.source}. {data.meta.degreeCount} tutkintoa,{" "}
                {data.meta.graduationYear} valmistuneet, {data.meta.incomeYear} tulot.
              </span>
              <span>Kuvaileva analyysi, ei virallinen tilasto.</span>
            </footer>
          </>
        ) : null}
      </main>
    </div>
  );
}
