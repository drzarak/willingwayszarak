"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { useSiteLanguage } from "@/components/site-language-provider";

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

const filters = [
  { id: "All", english: "All", urdu: "تمام" },
  { id: "About", english: "About", urdu: "تعارف" },
  { id: "Services", english: "Services", urdu: "خدمات" },
  { id: "Treatments", english: "Treatments", urdu: "علاج" },
  { id: "Articles", english: "Articles", urdu: "مضامین" },
  { id: "Videos", english: "Videos", urdu: "ویڈیوز" },
  { id: "Resources", english: "Resources", urdu: "وسائل" },
];

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
  const { isUrdu } = useSiteLanguage();

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
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b6772]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                isUrdu
                  ? "pages، treatments، articles یا services تلاش کریں"
                  : "Search pages, treatments, articles, or services"
              }
              className="h-12 w-full rounded-2xl border border-[#ead6dc] bg-white pl-11 pr-4 text-base text-[#3b1725] outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              dir={isUrdu ? "rtl" : "ltr"}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {filters.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={entry.id === filter ? "filter-chip-active" : "filter-chip"}
                onClick={() => setFilter(entry.id)}
              >
                <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                  {isUrdu ? entry.urdu : entry.english}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className={`text-base text-[#7a5a64] ${isUrdu ? "font-urdu text-right" : ""}`} dir={isUrdu ? "rtl" : "ltr"}>
          {isUrdu
            ? `${items.length} میں سے ${filteredItems.length} درآمد شدہ صفحات دکھائے جا رہے ہیں۔`
            : `Showing ${filteredItems.length} of ${items.length} imported pages.`}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className="group overflow-hidden rounded-[30px] border border-[#ead6dc] bg-white shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30"
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
              <div className="h-48 bg-[radial-gradient(circle_at_top_left,_rgba(255,217,224,0.16),_transparent_35%),linear-gradient(135deg,_rgba(72,10,28,0.95),_rgba(101,19,40,0.9)_60%,_rgba(143,64,88,0.72))]" />
            )}

            <div className="space-y-3 px-5 py-5">
              <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <span className={isUrdu ? "font-urdu normal-case" : ""}>
                  {isUrdu
                    ? item.group === "Articles"
                      ? "مضامین"
                      : item.group === "About"
                        ? "تعارف"
                        : item.group === "Services"
                          ? "خدمات"
                          : item.group === "Treatments"
                            ? "علاج"
                            : item.group === "Videos"
                              ? "ویڈیوز"
                              : "وسائل"
                    : item.group}
                </span>
                <span className={`text-[#8b6772] ${isUrdu ? "font-urdu normal-case" : ""}`}>
                  {isUrdu ? (item.kind === "post" ? "مضمون" : "صفحہ") : item.kind === "post" ? "Article" : "Page"}
                </span>
              </div>
              <div className="text-xl font-semibold leading-tight text-[#3b1725]">{item.title}</div>
              <p className="text-base leading-8 text-[#5a3743]">{item.description}</p>
              <div className={`text-xs tracking-[0.18em] text-[#8b6772] ${isUrdu ? "font-urdu text-right normal-case" : "uppercase"}`}>
                {formatUpdatedDate(item.updatedAt) ?? (isUrdu ? "ولنگ ویز لائبریری" : "Willing Ways library")}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
