import * as cheerio from "cheerio";
import type { RawEntry } from "./types.js";

const MAX_EMBED_CHARS = 1800;

export function extractPlainText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style").remove();
  $("br").replaceWith("\n");
  const text = $.root().text();
  return text.replace(/\s+/g, " ").trim();
}

export function buildEmbedText(entry: RawEntry): string {
  const tagWords = (entry.tags || "").replace(/[-_]/g, " ").trim();
  const body = extractPlainText(entry.html || "");
  const combined = [entry.title, tagWords, body]
    .filter((p) => p && p.length > 0)
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();
  return combined.slice(0, MAX_EMBED_CHARS);
}

export function buildSnippet(entry: RawEntry, maxLen = 200): string {
  const body = extractPlainText(entry.html || "");
  if (body.length <= maxLen) return body;
  const cut = body.lastIndexOf(" ", maxLen);
  return body.slice(0, cut > 0 ? cut : maxLen) + "...";
}
