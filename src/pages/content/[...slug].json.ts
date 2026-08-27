import type { APIRoute } from "astro";
import { getCustomPage } from "../../lib/db.js";
import { customPageToContentJson, jsonResponse } from "../../lib/custom_pages.js";

/**
 * Fallback content endpoint for custom pages.
 *
 * Official pages exist as static files under `/content/*.json` and are served
 * by the static layer before this route is ever reached — so this route only
 * fires for addresses that are NOT official, and looks them up in Postgres.
 * The response shape matches the static files, which keeps the client-side
 * navigation (script.js) and the `[...slug]` SSR route oblivious to where a
 * page came from.
 */
export const GET: APIRoute = async ({ params }) => {
  const address = params.slug ?? "";

  try {
    const page = await getCustomPage(address);
    if (page) return jsonResponse(customPageToContentJson(page));
  } catch (e: any) {
    console.warn("custom page lookup failed:", e?.message ?? e);
  }

  return jsonResponse({ error: `No page at '${address}'` }, 404);
};
