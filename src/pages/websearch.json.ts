import type { APIRoute } from "astro";
import { searchWiki } from "../lib/search.js";

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get("query");
  if (!query || query.length === 0) return new Response("No query provided", { status: 400 });

  const results = await searchWiki(query, 50, url.origin);
  return new Response(JSON.stringify(results), { headers: { "content-type": "application/json" } });
};
