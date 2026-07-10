import * as cheerio from "cheerio";
import type { PageKind, RawEntry } from "./types.js";

// Cap on embedded text, sized to the model's input window.
const MAX_EMBED_CHARS = 1800;

const FUNCTION_TYPES = new Set(["classfunc", "libraryfunc", "panelfunc"]);
const HOOK_TYPES = new Set(["hook", "panelhook"]);

/**
 * Classify a page from its markup `<function type="...">` attribute.
 * Callable functions and event hooks are distinguished so ranking can prefer
 * functions for action queries; everything else (enums, structs, categories,
 * panels, markup-less pages) is `other`.
 */
export function kindFor(entry: RawEntry): PageKind {
  const t = entry.markup?.match(/<function[^>]*\btype="([^"]+)"/)?.[1];

  if (t && FUNCTION_TYPES.has(t)) return "function";
  if (t && HOOK_TYPES.has(t)) return "hook";

  return "other";
}

export function extractPlainText(html: string): string {
  const $ = cheerio.load(html);

  $("script, style").remove();
  $(".function_links").remove(); // drops the "Search Github" link
  $("br").replaceWith("\n");

  const text = $.root().text();
  return text.replace(/\s+/g, " ").trim();
}

// Drop markdown links and bare URLs (notes/warnings embed source links that
// are noise for retrieval), then collapse whitespace.
function clean(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract retrieval text from `<function>` markup: realm, description, and
 * each argument/return as `name (type): desc`. Argument names and types live
 * in XML attributes, so a plain text-strip would lose them.
 * Returns null for non-function markup so the caller falls back to HTML.
 */
function embedTextFromMarkup(markup: string): string | null {
  if (!markup.includes("<function")) return null;

  const $ = cheerio.load(markup, { xmlMode: true });
  const fn = $("function").first();
  if (fn.length === 0) return null;

  const realm = clean(fn.find("realm").first().text());
  const desc = clean(fn.children("description").first().text());

  const args = fn
    .find("args > arg")
    .map((_, el) => `${$(el).attr("name") || ""} (${$(el).attr("type") || ""}): ${clean($(el).text())}`)
    .get();

  const rets = fn
    .find("rets > ret")
    .map((_, el) => {
      const name = $(el).attr("name");
      return `returns ${$(el).attr("type") || ""}${name ? " " + name : ""}: ${clean($(el).text())}`;
    })
    .get();

  return [realm, desc, ...args, ...rets].filter(Boolean).join(". ");
}

/**
 * Build the text we embed for a page: address, title, tag words, then body.
 * Leading with the address makes the exact API name (e.g. `Player:Say`) a
 * strong retrieval signal. The body comes from structured markup when
 * available (keeps typed args, drops nav cruft), else from stripped HTML.
 */
export function buildEmbedText(entry: RawEntry): string {
  const tagWords = (entry.tags || "").replace(/[-_]/g, " ").trim();
  const body = (entry.markup && embedTextFromMarkup(entry.markup)) || extractPlainText(entry.html || "");
  const titlePart = entry.title && entry.title !== entry.address ? entry.title : "";

  const combined = [entry.address, titlePart, tagWords, body]
    .filter((p) => p && p.length > 0)
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();

  return combined.slice(0, MAX_EMBED_CHARS);
}

// Just the prose <description> from function markup: no signature,
// "Search Github" link, or "Description" heading that HTML-stripping pulls in.
function descriptionFromMarkup(markup: string): string | null {
  if (!markup.includes("<function")) return null;

  const $ = cheerio.load(markup, { xmlMode: true });
  const desc = clean($("function").first().children("description").first().text());

  return desc || null;
}

/**
 * Short preview shown under a search result. Prefers the markup description
 * (clean prose) and falls back to stripped HTML for non-function pages.
 */
export function buildSnippet(entry: RawEntry, maxLen = 200): string {
  const body = (entry.markup && descriptionFromMarkup(entry.markup)) || extractPlainText(entry.html || "");

  if (body.length <= maxLen) return body;

  const cut = body.lastIndexOf(" ", maxLen);
  return body.slice(0, cut > 0 ? cut : maxLen) + "...";
}
