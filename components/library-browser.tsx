"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";

interface LibraryItem {
  path: string;
  title: string;
  description: string;
  kind: "page" | "post";
  updatedAt: string | null;
  image: string | null;
  group: string;
}

interface LibraryBrowserProps {
  items: LibraryItem[];
}

const filters = ["All", "About", "Services", "Treatments", "Articles", "Videos", "Resources"];

function formatUpdatedDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function LibraryBrowser({ items }: LibraryBrowserProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const deferredQuery = useDeferredValue(query);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    const matchesFilter = filter === "All" || item.group === filter;
    const haystack = `${item.title} ${item.description} ${item.group}`.toLowerCase();
    const matchesQuery = normalizedQuery === "" || haystack.includes(normalizedQuery);
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="space-y-8">
      <div className="surface-panel space-y-5 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages, treatments, articles, or services"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {filters.map((entry) => (
              <button
                key={entry}
                type="button"
                className={entry === filter ? "filter-chip-active" : "filter-chip"}
                onClick={() => setFilter(entry)}
              >
                {entry}
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm text-slate-500">
          Showing {filteredItems.length} of {items.length} imported pages.
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className="group overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30"
          >
            {item.image ? (
              <Image
                src={item.image}
                alt={item.title}
                width={1200}
                height={720}
                className="h-48 w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="h-48 bg-[radial-gradient(circle_at_top_left,_rgba(13,110,253,0.16),_transparent_35%),linear-gradient(135deg,_rgba(7,15,40,0.95),_rgba(12,38,77,0.9)_60%,_rgba(20,184,166,0.72))]" />
            )}

            <div className="space-y-3 px-5 py-5">
              <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <span>{item.group}</span>
                <span className="text-slate-400">{item.kind === "post" ? "Article" : "Page"}</span>
              </div>
              <div className="text-xl font-semibold leading-tight text-slate-950">{item.title}</div>
              <p className="text-sm leading-7 text-slate-600">{item.description}</p>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {formatUpdatedDate(item.updatedAt) ?? "Willing Ways library"}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
