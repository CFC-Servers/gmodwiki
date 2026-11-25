import type { APIRoute } from "astro";
import { search } from "@lib/search";

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get("query");
  if (!query) return new Response("No query provided", { status: 400 });

  const results = await search(query);

  return new Response(JSON.stringify(results), { headers: { "content-type": "application/json" } });
};
