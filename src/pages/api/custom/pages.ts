import type { APIRoute } from "astro";
import { createCustomPage, getCustomPage, listCustomPages } from "../../../lib/db.js";
import {
  customPageToContentJson,
  errorResponse,
  isOfficialPage,
  jsonResponse,
  renderCustomMarkup,
  validateAddress,
  withDb,
} from "../../../lib/custom_pages.js";

export const GET: APIRoute = async () =>
  withDb(async () => {
    const pages = await listCustomPages();
    return jsonResponse({ pages });
  });

export const POST: APIRoute = async ({ request, url }) =>
  withDb(async () => {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const address = String(body.address ?? "").trim();
    const markup = String(body.markup ?? "");
    const category = String(body.category ?? "Custom").trim() || "Custom";

    const invalid = validateAddress(address);
    if (invalid) return errorResponse(invalid, 400);
    if (!markup.trim()) return errorResponse("Markup is required", 400);

    if (await isOfficialPage(url.origin, address)) {
      return errorResponse(
        `'${address}' is an official wiki page. Official pages are read-only — they are refreshed from wiki.facepunch.com on every update. Pick a different address.`,
        409,
      );
    }
    if (await getCustomPage(address)) {
      return errorResponse(`A custom page already exists at '${address}'`, 409);
    }

    const rendered = await renderCustomMarkup(url.origin, markup);
    const title = String(body.title ?? "").trim() || rendered.title || address;

    const page = await createCustomPage({
      address,
      title,
      category,
      tags: rendered.tags,
      markup,
      html: rendered.html,
      description: rendered.description,
    });

    return jsonResponse({ page: { ...page, contentJson: customPageToContentJson(page) } }, 201);
  });
