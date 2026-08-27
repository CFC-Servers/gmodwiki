/**
 * Shared logic for user-created pages: address validation, rendering and the
 * content-JSON shape the frontend consumes (same shape as official pages).
 */

import { renderWikitext } from "./wikitext/render.js";
import { buildPageExists, getOfficialPageSet } from "./pages.js";
import type { CustomPage } from "./db.js";

/** Route prefixes that can never be page addresses. */
const RESERVED_PREFIXES = new Set([
  "api", "content", "custom", "websearch", "mcp", "gmod", "styles", "states",
  "cache", "garry", "pages", "search_index.json", "script.js", "darkmode.js",
]);

export function validateAddress(address: string): string | null {
  if (!address || address.trim().length === 0) return "Address is required";
  if (address.length > 200) return "Address is too long (max 200 characters)";
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.:/-]*$/.test(address)) {
    return "Address may only contain letters, digits, and _ . : / - (must start with a letter, digit or _)";
  }
  if (address.includes("..") || address.endsWith("/")) return "Invalid address";

  const firstSegment = address.split("/")[0].toLowerCase();
  if (RESERVED_PREFIXES.has(firstSegment)) {
    return `Address may not start with the reserved prefix '${firstSegment}'`;
  }
  return null;
}

export async function isOfficialPage(origin: string, address: string): Promise<boolean> {
  const official = await getOfficialPageSet(origin);
  return official.has(address.toLowerCase());
}

export interface RenderedCustomPage {
  html: string;
  tags: string;
  description: string;
  title?: string;
}

export async function renderCustomMarkup(origin: string, markup: string): Promise<RenderedCustomPage> {
  const pageExists = await buildPageExists(origin);
  return renderWikitext(markup, { pageExists });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC";
  } catch {
    return iso;
  }
}

function editBar(page: CustomPage): string {
  const href = `/custom/edit?address=${encodeURIComponent(page.address)}`;
  return (
    `<div class="custom_page_bar" style="display:flex;align-items:center;gap:0.75em;padding:0.5em 0.9em;margin-bottom:1em;border:1px solid rgba(127,127,127,0.35);border-radius:6px;background:rgba(127,127,127,0.08);font-size:0.92em;">` +
    `<i class="mdi mdi-pencil"></i>` +
    `<span>This is a <b>custom page</b> (category: ${escapeText(page.category)}) — anyone can <a href="${href}">edit it</a>.</span>` +
    `<a style="margin-left:auto" href="/custom">All custom pages</a>` +
    `</div>`
  );
}

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * The same JSON shape `public/content/*.json` files use, so the client-side
 * navigation and the `[...slug]` route can consume custom pages transparently.
 */
export function customPageToContentJson(page: CustomPage): object {
  return {
    title: page.title,
    description: page.description,
    tags: page.tags,
    address: page.address,
    html: editBar(page) + page.html,
    footer: `Custom page<br>Updated: ${formatDate(page.updated_at as unknown as string)}`,
    custom: true,
  };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

/** Wrap DB-backed handlers: turns connection failures into a clean 503. */
export async function withDb(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e: any) {
    if (e?.code === "ECONNREFUSED" || /connect/i.test(String(e?.message))) {
      console.error("database unavailable:", e?.message ?? e);
      return errorResponse(
        "Database unavailable. Custom pages require PostgreSQL (set DATABASE_URL).",
        503,
      );
    }
    throw e;
  }
}
