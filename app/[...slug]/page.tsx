import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentPage } from "@/components/content-page";
import { getPageBySlug, getPreferredPageImage, sitePages } from "@/lib/site-data";

interface DynamicContentPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  return sitePages
    .filter((page) => page.path !== "/")
    .map((page) => ({
      slug: page.slug,
    }));
}

export async function generateMetadata({ params }: DynamicContentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageBySlug(slug);

  if (!page) {
    return {};
  }

  const image = getPreferredPageImage(page);

  return {
    title: page.title,
    description: page.description,
    openGraph: {
      title: page.title,
      description: page.description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function DynamicContentPage({ params }: DynamicContentPageProps) {
  const { slug } = await params;
  const page = getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return <ContentPage page={page} />;
}
