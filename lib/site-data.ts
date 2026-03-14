import "server-only";

import source from "@/lib/generated/willingways-pages.json";

import { SITE_MEDIA } from "@/lib/site-assets";
import { normalizePathname } from "@/lib/site-links";

export interface SitePage {
  path: string;
  slug: string[];
  sourceUrl: string;
  title: string;
  description: string;
  kind: "page" | "post";
  section: string;
  updatedAt: string | null;
  headings: string[];
  heroImage: string | null;
  readingMinutes: number;
  markdown: string;
}

interface GeneratedSource {
  generatedAt: string;
  logo: string | null;
  favicon: string | null;
  pages: SitePage[];
}

const data = source as GeneratedSource;

export const siteGeneratedAt = data.generatedAt;
export const sitePages = data.pages.map((page) => ({
  ...page,
  path: normalizePathname(page.path),
})) satisfies SitePage[];

export const siteLogo = data.logo;
export const siteFavicon = data.favicon;

export const sitePageMap = new Map(sitePages.map((page) => [page.path, page]));

export const siteMedia = {
  ...SITE_MEDIA,
  logo: siteLogo ?? SITE_MEDIA.logo,
  favicon: siteFavicon ?? SITE_MEDIA.favicon,
};

export function getPageByPath(pathname: string) {
  return sitePageMap.get(normalizePathname(pathname)) ?? null;
}

export function getPageBySlug(slug: string[]) {
  const pathname = slug.length === 0 ? "/" : `/${slug.join("/")}`;
  return getPageByPath(pathname);
}

export function getPreferredPageImage(page: SitePage) {
  if (page.heroImage && !page.heroImage.includes("favicon")) {
    return page.heroImage;
  }

  const markdownImage = page.markdown.match(/!\[[^\]]*]\(([^)]+)\)/)?.[1];
  return markdownImage ?? null;
}

export function getRelatedPages(page: SitePage, limit = 4) {
  const collection =
    page.kind === "post"
      ? sitePages.filter((entry) => entry.kind === "post" && entry.path !== page.path)
      : sitePages.filter(
          (entry) => entry.kind === "page" && entry.section === page.section && entry.path !== page.path,
        );

  return collection.slice(0, limit);
}

export function getSectionTitle(page: SitePage) {
  if (page.kind === "post") {
    return "Article";
  }

  switch (page.section) {
    case "about-us":
      return "About Willing Ways";
    case "our-services":
      return "Services";
    case "treatments":
      return "Treatments";
    case "videos":
      return "Videos";
    default:
      return "Willing Ways";
  }
}

export const featuredPages = {
  home: getPageByPath("/"),
  about: getPageByPath("/about-us/"),
  services: getPageByPath("/our-services/"),
  treatments: getPageByPath("/treatments/"),
  rehabServices: getPageByPath("/our-services/rehab-services/"),
  counselingServices: getPageByPath("/our-services/counseling-services/"),
  psychiatricServices: getPageByPath("/our-services/psychiatric-services/"),
  faq: getPageByPath("/faqs/"),
  publications: getPageByPath("/publications/"),
  videos: getPageByPath("/videos/"),
  successStories: getPageByPath("/success-stories/"),
  costs: getPageByPath("/treatment-costs/"),
  contact: getPageByPath("/contact-us/"),
  branches: getPageByPath("/about-us/our-branches/"),
  blogs: getPageByPath("/blogs/"),
  youAskedForIt: getPageByPath("/you-asked-for-it/"),
};

export const treatmentTracks = [
  {
    title: "Core Counseling",
    href: "/treatments/core-counseling",
    image: siteMedia.treatmentIcons.core,
    summary:
      "Covers addiction, alcoholism, OCD, ADHD, PTSD, schizophrenia, personality disorders, and related behavioral conditions.",
  },
  {
    title: "Supportive Counseling",
    href: "/treatments/supportive-counseling",
    image: siteMedia.treatmentIcons.supportive,
    summary:
      "Builds practical recovery skills including cravings management, denial management, emotional regulation, and relapse support.",
  },
  {
    title: "Personal Development",
    href: "/treatments/personal-development-counseling",
    image: siteMedia.treatmentIcons.personalDevelopment,
    summary:
      "Develops communication, emotional intelligence, discipline, resilience, and exceptional living beyond abstinence.",
  },
  {
    title: "Situational Counseling",
    href: "/treatments/situational-counseling",
    image: siteMedia.treatmentIcons.situational,
    summary:
      "Supports crisis intervention, family intervention, and structured action when the patient is resistant or the family is overwhelmed.",
  },
  {
    title: "Follow-Up Care",
    href: "/treatments/follow-up-counseling",
    image: siteMedia.treatmentIcons.followUp,
    summary:
      "Maintains recovery with relapse prevention, continuing care, and long-term follow-up after discharge or outpatient treatment.",
  },
];

export const libraryIndex = sitePages.map((page) => ({
  path: page.path,
  title: page.title,
  description: page.description,
  kind: page.kind,
  updatedAt: page.updatedAt,
  image: getPreferredPageImage(page),
  group:
    page.kind === "post"
      ? "Articles"
      : page.section === "about-us"
        ? "About"
        : page.section === "our-services"
          ? "Services"
          : page.section === "treatments"
            ? "Treatments"
            : page.section === "videos"
              ? "Videos"
              : "Resources",
}));

export const latestArticles = sitePages
  .filter((page) => page.kind === "post")
  .sort((left, right) => {
    const leftDate = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
    const rightDate = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
    return rightDate - leftDate;
  })
  .slice(0, 6);
