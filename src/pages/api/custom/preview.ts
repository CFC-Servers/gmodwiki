import type { APIRoute } from "astro";
import { errorResponse, jsonResponse, renderCustomMarkup } from "../../../lib/custom_pages.js";

/** Render markup without saving — powers the editor's live preview. */
export const POST: APIRoute = async ({ request, url }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const markup = String(body.markup ?? "");
  const rendered = await renderCustomMarkup(url.origin, markup);
  return jsonResponse(rendered);
};
