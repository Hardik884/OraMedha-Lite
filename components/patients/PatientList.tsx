"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, SearchX, Users, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PatientRow } from "@/components/patients/PatientRow";
import { filterPatients } from "@/lib/patients/search";
import type { PatientListItem } from "@/lib/data/patients";

/**
 * The Patients list with search-as-you-type. Filtering happens here on the
 * phone: instant on weak Wi-Fi, and the search term never goes into a URL
 * (browser history, server logs).
 */
export function PatientList({ patients }: { patients: PatientListItem[] }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const results = useMemo(() => filterPatients(patients, deferred), [patients, deferred]);

  return (
    <div className="space-y-4">
      <div className="relative" role="search">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
          aria-hidden
        />
        <Input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Name, phone or OPD number"
          aria-label="Search patients"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-11 pr-11 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            data-compact
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {results.map((p) => (
              <PatientRow key={p.id} patient={p} />
            ))}
          </ul>
        </Card>
      ) : patients.length > 0 ? (
        <Card>
          <EmptyState
            icon={<SearchX />}
            title="No match"
            description="No patient with that name, phone or OPD number."
          />
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<Users />}
            title="No patients yet"
            description="Patients you add will be listed here, searchable by name, phone or OPD number."
          />
        </Card>
      )}
    </div>
  );
}
