import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getPageByPath } from "@/lib/site-data";
import { isInternalWillingWaysHref, normalizeWillingWaysHref } from "@/lib/site-links";

interface SiteMarkdownProps {
  content: string;
}

export function SiteMarkdown({ content }: SiteMarkdownProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const normalizedHref = normalizeWillingWaysHref(href);
            const localPage =
              normalizedHref && normalizedHref.startsWith("/") ? getPageByPath(normalizedHref) : null;

            if (
              normalizedHref &&
              (normalizedHref === "/" ||
                normalizedHref === "/ai" ||
                normalizedHref === "/library" ||
                localPage)
            ) {
              return (
                <Link href={normalizedHref} className="font-medium text-primary underline underline-offset-4">
                  {children}
                </Link>
              );
            }

            const fallbackHref =
              normalizedHref && isInternalWillingWaysHref(normalizedHref)
                ? `https://www.willingways.org${normalizedHref}`
                : normalizedHref ?? href ?? "#";

            return (
              <a
                href={fallbackHref}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt }) => {
            if (!src || typeof src !== "string") {
              return null;
            }

            return (
              <span className="my-6 block overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-soft">
                <Image
                  src={src}
                  alt={alt ?? "Willing Ways"}
                  width={1200}
                  height={720}
                  className="h-auto w-full object-cover"
                  unoptimized
                />
              </span>
            );
          },
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-[24px] border border-slate-200/80 bg-white shadow-soft">
              <table className="min-w-full border-collapse text-left text-sm text-slate-700">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border-b border-slate-100 px-4 py-3 align-top">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
