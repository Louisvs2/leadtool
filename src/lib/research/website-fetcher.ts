import * as cheerio from "cheerio";

const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 2_000_000; // 2MB cap
const USER_AGENT = "CultTwentyOutboundBot/1.0 (+https://culttwenty.de; research assistant, respects robots.txt)";

export type WebsiteSnapshot = {
  url: string;
  fetchedAt: string;
  title: string | null;
  metaDescription: string | null;
  visibleText: string;
  headings: string[];
  hasSocialLinks: boolean;
  hasEcommerce: boolean;
  usesHttps: boolean;
  ok: boolean;
  error?: string;
};

function normalizeUrl(input: string): string | null {
  try {
    const url = input.startsWith("http") ? input : `https://${input}`;
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return null;
  }
}

async function isAllowedByRobots(baseUrl: URL): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl.origin);
    const res = await fetch(robotsUrl.toString(), {
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return true; // no robots.txt => allowed by default
    const text = await res.text();
    // Minimal robots.txt check: look for a blanket disallow of "/" under
    // a wildcard or our named user-agent group.
    const lines = text.split("\n").map((l) => l.trim());
    let applies = false;
    for (const line of lines) {
      const [rawKey, ...rest] = line.split(":");
      const key = rawKey?.toLowerCase().trim();
      const value = rest.join(":").trim();
      if (key === "user-agent") {
        applies = value === "*" || value.toLowerCase().includes("culttwenty");
      } else if (applies && key === "disallow" && (value === "/" || value === "")) {
        if (value === "/") return false;
      }
    }
    return true;
  } catch {
    return true; // fail open — network hiccup on robots.txt shouldn't block research
  }
}

/**
 * Fetches a company's public homepage and extracts lightweight, factual
 * signals only (title, meta description, visible text, headings). Never
 * follows links beyond the homepage, respects robots.txt, and identifies
 * itself via a descriptive User-Agent. No login-gated or protected content
 * is ever accessed.
 */
export async function fetchWebsiteSnapshot(rawUrl: string): Promise<WebsiteSnapshot> {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    return {
      url: rawUrl,
      fetchedAt: new Date().toISOString(),
      title: null,
      metaDescription: null,
      visibleText: "",
      headings: [],
      hasSocialLinks: false,
      hasEcommerce: false,
      usesHttps: false,
      ok: false,
      error: "Invalid URL",
    };
  }

  const url = new URL(normalized);

  const allowed = await isAllowedByRobots(url);
  if (!allowed) {
    return {
      url: normalized,
      fetchedAt: new Date().toISOString(),
      title: null,
      metaDescription: null,
      visibleText: "",
      headings: [],
      hasSocialLinks: false,
      hasEcommerce: false,
      usesHttps: url.protocol === "https:",
      ok: false,
      error: "Disallowed by robots.txt",
    };
  }

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
    });

    if (!res.ok) {
      return {
        url: normalized,
        fetchedAt: new Date().toISOString(),
        title: null,
        metaDescription: null,
        visibleText: "",
        headings: [],
        hasSocialLinks: false,
        hasEcommerce: false,
        usesHttps: url.protocol === "https:",
        ok: false,
        error: `HTTP ${res.status}`,
      };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error(`Unexpected content-type: ${contentType}`);
    }

    const buffer = await res.arrayBuffer();
    const html = new TextDecoder().decode(buffer.slice(0, MAX_BODY_BYTES));

    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();

    const title = $("title").first().text().trim() || null;
    const metaDescription =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      null;

    const headings = $("h1, h2")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean)
      .slice(0, 12);

    const visibleText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);

    const html_lower = html.toLowerCase();
    const hasSocialLinks = ["instagram.com", "linkedin.com", "tiktok.com", "youtube.com", "facebook.com"].some((d) =>
      html_lower.includes(d),
    );
    const hasEcommerce = ["/cart", "add-to-cart", "shopify", "add to bag", "checkout"].some((s) =>
      html_lower.includes(s),
    );

    return {
      url: normalized,
      fetchedAt: new Date().toISOString(),
      title,
      metaDescription,
      visibleText,
      headings,
      hasSocialLinks,
      hasEcommerce,
      usesHttps: url.protocol === "https:",
      ok: true,
    };
  } catch (error) {
    return {
      url: normalized,
      fetchedAt: new Date().toISOString(),
      title: null,
      metaDescription: null,
      visibleText: "",
      headings: [],
      hasSocialLinks: false,
      hasEcommerce: false,
      usesHttps: url.protocol === "https:",
      ok: false,
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}
