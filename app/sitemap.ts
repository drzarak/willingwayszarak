import type { MetadataRoute } from "next";

import { sitePages } from "@/lib/site-data";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://willingways.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  const importedEntries = sitePages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: page.updatedAt ? new Date(page.updatedAt) : new Date(),
    changeFrequency: page.kind === "post" ? "monthly" as const : "weekly" as const,
    priority: page.path === "/" ? 1 : page.kind === "post" ? 0.6 : 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/chat`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/family-training`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...importedEntries.filter((entry) => entry.url !== `${baseUrl}/` && entry.url !== baseUrl),
  ];
}
