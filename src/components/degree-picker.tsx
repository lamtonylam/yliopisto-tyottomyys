import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LEVEL_SHORT, SECTOR_SHORT } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Degree, Level, Sector } from "@/types";

interface DegreePickerProps {
  degrees: Degree[];
  value: string;
  onChange: (id: string) => void;
}

const GROUPS: { sector: Sector; level: Level }[] = [
  { sector: "university", level: "upper" },
  { sector: "university", level: "lower" },
  { sector: "amk", level: "upper" },
  { sector: "amk", level: "lower" },
];

export function DegreePicker({ degrees, value, onChange }: DegreePickerProps) {
  const [open, setOpen] = useState(false);
  const current = degrees.find((degree) => degree.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Valitse tutkinto"
          className="h-auto w-full justify-between gap-3 bg-card px-3 py-2.5 text-left sm:w-[430px]"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {current?.name ?? "Valitse tutkinto"}
            </span>
            <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
              {current
                ? `${SECTOR_SHORT[current.sector]} · ${LEVEL_SHORT[current.level]} · ${current.field}`
                : "Hae tutkintoa, alaa tai koodia"}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command
          filter={(value, search) => {
            const haystack = value.toLocaleLowerCase("fi");
            const tokens = search
              .toLocaleLowerCase("fi")
              .split(/\s+/)
              .filter(Boolean);
            return tokens.every((token) => haystack.includes(token)) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Hae tutkintoa, alaa tai koodia…" />
          <CommandList className="max-h-[340px]">
            <CommandEmpty>Ei tuloksia.</CommandEmpty>
            {GROUPS.map((group) => {
              const items = degrees
                .filter((d) => d.sector === group.sector && d.level === group.level)
                .sort((a, b) => a.name.localeCompare(b.name, "fi"));
              if (items.length === 0) return null;
              return (
                <CommandGroup
                  key={`${group.sector}-${group.level}`}
                  heading={`${SECTOR_SHORT[group.sector]} · ${LEVEL_SHORT[group.level]}`}
                >
                  {items.map((degree) => (
                    <CommandItem
                      key={degree.id}
                      value={`${degree.name} ${degree.field} ${degree.code}`}
                      onSelect={() => {
                        onChange(degree.id);
                        setOpen(false);
                      }}
                      className="items-start gap-2 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px]">{degree.name}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {degree.field} · {degree.national.graduates} valmistunutta
                        </span>
                      </span>
                      <Check
                        className={cn(
                          "mt-1 size-4 shrink-0",
                          degree.id === value ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
