import type { APIRoute } from "astro";
import { deleteCustomPage, getCustomPage, updateCustomPage } from "../../../../lib/db.js";
import {
  errorResponse,
  jsonResponse,
  renderCustomMarkup,
  withDb,
} from "../../../../lib/custom_pages.js";

export const GET: APIRoute = async ({ params }) =>
  withDb(async () => {
    const address = params.address ?? "";
    const page = await getCustomPage(address);
    if (!page) return errorResponse(`No custom page at '${address}'`, 404);
    return jsonResponse({ page });
  });

export const PUT: APIRoute = async ({ params, request, url }) =>
  withDb(async () => {
    const address = params.address ?? "";
    const existing = await getCustomPage(address);
    if (!existing) {
      // Only custom pages are editable: official pages get overwritten by the
      // scraper on every wiki update, so we never allow writing to them.
      return errorResponse(`No custom page at '${address}'. Only custom pages can be edited.`, 404);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const markup = String(body.markup ?? "");
    if (!markup.trim()) return errorResponse("Markup is required", 400);

    const category = String(body.category ?? existing.category).trim() || existing.category;
    const rendered = await renderCustomMarkup(url.origin, markup);
    const title = String(body.title ?? "").trim() || rendered.title || existing.title;

    const page = await updateCustomPage(address, {
      title,
      category,
      tags: rendered.tags,
      markup,
      html: rendered.html,
      description: rendered.description,
    });

    return jsonResponse({ page });
  });

export const DELETE: APIRoute = async ({ params }) =>
  withDb(async () => {
    const address = params.address ?? "";
    const deleted = await deleteCustomPage(address);
    if (!deleted) return errorResponse(`No custom page at '${address}'`, 404);
    return jsonResponse({ deleted: true });
  });
