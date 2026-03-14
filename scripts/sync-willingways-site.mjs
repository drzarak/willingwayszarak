import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { load } from "cheerio";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "lib", "generated");
const outputFile = path.join(outputDir, "willingways-pages.json");
const assetRootDir = path.join(rootDir, "public", "site-assets");

const BASE_URL = "https://www.willingways.org";
const USER_AGENT =
  "Mozilla/5.0 (compatible; CodexBot/1.0; +https://www.willingways.org)";

const RESERVED_PATHS = new Set(["/ai/", "/library/"]);
const EXCLUDED_PATHS = new Set(["/elementor-21057/"]);

const SITEMAPS = [
  { kind: "page", url: `${BASE_URL}/page-sitemap.xml` },
  { kind: "post", url: `${BASE_URL}/post-sitemap.xml` },
];

const SEED_ASSET_URLS = [
  `${BASE_URL}/wp-content/uploads/2026/02/ww-logo-scaled.png`,
  `${BASE_URL}/wp-content/uploads/2021/06/favicon.png`,
  `${BASE_URL}/wp-content/uploads/2022/09/Rehab-Services.jpg`,
  `${BASE_URL}/wp-content/uploads/2022/09/Counseling-Services.jpg`,
  `${BASE_URL}/wp-content/uploads/2022/09/Psychiatric-Services.jpg`,
  `${BASE_URL}/wp-content/uploads/2022/09/Core-Counseling.png`,
  `${BASE_URL}/wp-content/uploads/2022/09/Supportive-Counseling.png`,
  `${BASE_URL}/wp-content/uploads/2022/09/Personal-Development-Counseling.png`,
  `${BASE_URL}/wp-content/uploads/2022/09/Situational-Counseling.png`,
  `${BASE_URL}/wp-content/uploads/2022/09/Follow-up-Counseling.png`,
  `${BASE_URL}/wp-content/uploads/2025/07/Willing-Ways-Executives.jpg`,
  `${BASE_URL}/wp-content/uploads/2022/09/Medical-Specialists-Home-Page.jpg`,
  `${BASE_URL}/wp-content/uploads/2022/09/Mental-Health-Care-Specialists-Home-Page.jpg`,
  `${BASE_URL}/wp-content/uploads/2022/09/Psychiatrists-Home-Page.jpg`,
  `${BASE_URL}/wp-content/uploads/2022/09/Minar-e-Pakistan.jpg`,
  `${BASE_URL}/wp-content/uploads/2022/09/Mizar-e-Quaid.jpg`,
  `${BASE_URL}/wp-content/uploads/2022/09/Faisal-Mosque.jpg`,
];

const turndown = new TurndownService({
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  headingStyle: "atx",
});

turndown.use(gfm);
turndown.keep(["table", "thead", "tbody", "tr", "th", "td"]);

turndown.addRule("lineBreaks", {
  filter: ["br"],
  replacement() {
    return "  \n";
  },
});

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch asset ${url}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function normalizeSitePath(url) {
  const pathname = new URL(url).pathname.replace(/\/+$/, "");
  return pathname === "" ? "/" : `${pathname}/`.replace(/\/{2,}/g, "/");
}

function sectionFromPath(pathname) {
  if (pathname === "/") {
    return "home";
  }

  return pathname.split("/").filter(Boolean)[0] ?? "general";
}

function buildLocalAssetPath(assetUrl) {
  const parsed = new URL(assetUrl);
  const pathname = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
  const ext = path.extname(pathname) || ".bin";
  const digest = createHash("sha1").update(assetUrl).digest("hex").slice(0, 8);
  const baseName = path.basename(pathname, ext).replace(/[^a-zA-Z0-9-_]/g, "-") || "asset";
  const dirName = path.dirname(pathname);

  return path.join("site-assets", dirName, `${baseName}-${digest}${ext}`);
}

async function downloadAsset(assetUrl, assetCache) {
  if (!assetUrl || assetUrl.startsWith("data:")) {
    return null;
  }

  let normalized;

  try {
    normalized = new URL(assetUrl, BASE_URL).toString();
  } catch {
    return null;
  }

  if (!normalized.startsWith(BASE_URL)) {
    return normalized;
  }

  if (assetCache.has(normalized)) {
    return assetCache.get(normalized);
  }

  const relativePath = buildLocalAssetPath(normalized);
  const absolutePath = path.join(rootDir, "public", relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  const buffer = await fetchBuffer(normalized);
  await writeFile(absolutePath, buffer);

  const publicPath = `/${relativePath.replaceAll(path.sep, "/")}`;
  assetCache.set(normalized, publicPath);
  return publicPath;
}

function extractUrlsFromSitemap(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
}

function getCandidateContent($) {
  const selectors = [
    "article .entry-content",
    "article .article-inner",
    "#main .page-wrapper .page-inner",
    "#main .page-wrapper",
    "#content .page-wrapper",
    "main#main",
    "#content",
  ];

  let best = null;
  let bestLength = 0;

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const candidate = $(element);
      const textLength = candidate.text().replace(/\s+/g, " ").trim().length;

      if (textLength > bestLength) {
        best = candidate.clone();
        bestLength = textLength;
      }
    });
  }

  return best ?? $.root().clone();
}

function extractMetaImage($) {
  const selectors = [
    "meta[property='og:image']",
    "meta[name='twitter:image']",
    "link[rel='apple-touch-icon']",
  ];

  for (const selector of selectors) {
    const value = $(selector).attr("content") ?? $(selector).attr("href");

    if (value) {
      return value;
    }
  }

  return null;
}

function normalizeInternalLink(href, pageUrl) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return href;
  }

  try {
    const absolute = new URL(href, pageUrl);

    if (absolute.origin === new URL(BASE_URL).origin) {
      const pathname = absolute.pathname.replace(/\/+$/, "");
      const internalPath = pathname === "" ? "/" : pathname;
      return absolute.search ? `${internalPath}${absolute.search}` : internalPath;
    }

    return absolute.toString();
  } catch {
    return href;
  }
}

async function localizeRichMedia($, $content, pageUrl, assetCache) {
  const downloads = [];

  $content.find("img").each((_, element) => {
    const node = $(element);
    const source =
      node.attr("data-src") ??
      node.attr("data-litespeed-src") ??
      node.attr("data-lazy-src") ??
      node.attr("src");

    if (!source) {
      return;
    }

    downloads.push(
      downloadAsset(source, assetCache)
        .then((localPath) => {
          if (localPath) {
            node.attr("src", localPath);
          }

          node.removeAttr("srcset");
          node.removeAttr("data-srcset");
          node.removeAttr("data-src");
          node.removeAttr("data-litespeed-src");
          node.removeAttr("data-lazy-src");
          node.removeAttr("style");
          node.removeAttr("class");
          node.removeAttr("loading");
        })
        .catch(() => undefined),
    );
  });

  $content.find("[style*='background-image']").each((_, element) => {
    const node = $(element);
    const style = node.attr("style") ?? "";
    const match = style.match(/background-image:\s*url\((['"]?)(.*?)\1\)/i);

    if (!match) {
      return;
    }

    const backgroundUrl = match[2];

    downloads.push(
      downloadAsset(backgroundUrl, assetCache)
        .then((localPath) => {
          if (!localPath) {
            return;
          }

          const alt = node.text().replace(/\s+/g, " ").trim() || "Willing Ways";
          node.prepend(`<p><img src="${localPath}" alt="${alt}"></p>`);
        })
        .catch(() => undefined),
    );
  });

  $content.find("a").each((_, element) => {
    const node = $(element);
    const href = node.attr("href");
    const normalized = normalizeInternalLink(href, pageUrl);

    if (normalized) {
      node.attr("href", normalized);
    }

    if (normalized && /^https?:\/\//.test(normalized) && !normalized.startsWith(BASE_URL)) {
      node.attr("target", "_blank");
      node.attr("rel", "noreferrer");
    }
  });

  await Promise.all(downloads);
}

function cleanContent($, $content) {
  $content.find("script, style, noscript, iframe, canvas, svg, form, source").remove();
  $content
    .find(
      ".comments-area, .comment-respond, .sharedaddy, .jp-relatedposts, .related-posts, .post-meta, .post-sidebar, .sidebar, .gallery-caption, .social-icons, .video-wrapper > button, .addtoany_shortcode, .header, .footer, nav, .breadcrumbs, .breadcrumb, .screen-reader-text, .wpcf7, .wp-block-search, .wpml-ls, .litespeed-loading",
    )
    .remove();

  $content.find("[style*='display:none']").remove();

  $content.find("*").each((_, element) => {
    const node = $(element);
    const tagName = element.tagName?.toLowerCase();

    if (!tagName) {
      return;
    }

    if (["h1", "h2", "h3", "h4", "p", "ul", "ol", "li", "img", "a", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "strong", "em"].includes(tagName)) {
      node.removeAttr("class");
      node.removeAttr("style");
      node.removeAttr("width");
      node.removeAttr("height");
    }
  });

  $content.find("p, div, section").each((_, element) => {
    const node = $(element);
    const text = node.text().replace(/\s+/g, " ").trim();
    const hasMedia = node.find("img, table, ul, ol, blockquote").length > 0;

    if (!hasMedia && text === "") {
      node.remove();
    }
  });
}

function extractHeadings($, $content) {
  return $content
    .find("h2, h3")
    .slice(0, 8)
    .toArray()
    .map((element) => $(element).text().replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function buildMarkdown($content) {
  const html = $content.html() ?? "";

  return turndown
    .turndown(html)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function summarize(markdown) {
  const plain = markdown.replace(/[#>*_`[\]()!-]/g, " ").replace(/\s+/g, " ").trim();
  return plain.slice(0, 240);
}

async function processPage(url, kind, assetCache) {
  const html = await fetchText(url);
  const $ = load(html);
  const pathname = normalizeSitePath(url);

  if (EXCLUDED_PATHS.has(pathname) || RESERVED_PATHS.has(pathname)) {
    return null;
  }

  const title =
    $("meta[property='og:title']").attr("content") ??
    $("title").text().replace(/\s*-\s*Willing Ways.*$/, "").trim() ??
    $("h1").first().text().trim() ??
    "Willing Ways";

  const description =
    $("meta[name='description']").attr("content") ??
    $("meta[property='og:description']").attr("content") ??
    "";

  const content = getCandidateContent($);
  cleanContent($, content);
  await localizeRichMedia($, content, url, assetCache);

  const markdown = buildMarkdown(content);
  const headings = extractHeadings($, content);
  const metaImage = extractMetaImage($);
  const heroImage = metaImage ? await downloadAsset(metaImage, assetCache).catch(() => null) : null;

  return {
    path: pathname,
    slug: pathname === "/" ? [] : pathname.split("/").filter(Boolean),
    sourceUrl: url,
    title: title || "Willing Ways",
    description: description || summarize(markdown),
    kind,
    section: sectionFromPath(pathname),
    updatedAt:
      $("meta[property='article:modified_time']").attr("content") ??
      $("time[datetime]").first().attr("datetime") ??
      null,
    headings,
    heroImage,
    readingMinutes: Math.max(1, Math.ceil(markdown.split(/\s+/).filter(Boolean).length / 220)),
    markdown,
  };
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(assetRootDir, { recursive: true });

  const assetCache = new Map();

  for (const assetUrl of SEED_ASSET_URLS) {
    await downloadAsset(assetUrl, assetCache).catch(() => undefined);
  }

  const pageRecords = [];

  for (const sitemap of SITEMAPS) {
    const xml = await fetchText(sitemap.url);
    const urls = extractUrlsFromSitemap(xml).filter((entry) => entry.startsWith(BASE_URL));

    for (const url of urls) {
      const pathname = normalizeSitePath(url);

      if (EXCLUDED_PATHS.has(pathname) || RESERVED_PATHS.has(pathname)) {
        continue;
      }

      try {
        const record = await processPage(url, sitemap.kind, assetCache);

        if (record && record.markdown.length > 0) {
          pageRecords.push(record);
          console.log(`synced ${record.path}`);
        }
      } catch (error) {
        console.warn(`skip ${url}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  pageRecords.sort((left, right) => left.path.localeCompare(right.path));

  await writeFile(
    outputFile,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        logo: assetCache.get(`${BASE_URL}/wp-content/uploads/2026/02/ww-logo-scaled.png`) ?? null,
        favicon: assetCache.get(`${BASE_URL}/wp-content/uploads/2021/06/favicon.png`) ?? null,
        pages: pageRecords,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`wrote ${pageRecords.length} pages to ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
