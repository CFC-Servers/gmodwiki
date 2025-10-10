import * as cheerio from "cheerio";
import { promises as fs } from "fs";

/**
 * Sets up the main layout file by processing the HTML content,
 * This module creates the src/layouts/Layout.astro file.
 * Fixes some issues with earlier text replacements and inserts frontmatter.
 */

const makeLayoutHeader = (headScript: string, content: string) => `
---
// This file is auto-generated, do not edit it directly!
// See build/setup.ts for more information
import Sidebar from "../components/Sidebar.astro";
const { title, description, image, views, updated } = Astro.props;
${headScript}
---
${content}
`;

export async function setupLayout($: cheerio.CheerioAPI) {
  let layout = $.html();
  layout = layout.replace("<sidebar></sidebar>", "<Sidebar />"); // When we insert our element it automatically gets formatted, so we have to fix it in a second pass
  layout = layout.replace(/\/gmod\//g, "/"); // We don't use the /gmod prefix
  layout = layout.replace(/"{title}"/g, "{title}"); // When we insert this code from js it wraps our frontmatter variables in quotes so we have to unwrap them again
  layout = layout.replace(/"{description}"/g, "{description}");
  layout = layout.replace(/"{image}"/g, "{image}");
  layout = layout.replace(/"{ogLogo}"/g, "{ogLogo}");
  layout = layout.replace(/"{fullUrl}"/g, "{fullUrl}");
  layout = layout.replace(/(href=|src=)".*?"/g, (m) => m.replace(/\\+/g, "/")); // For some reason, URLs are being parsed incorrectly, this should fix that.

  const layoutHeadScript = await fs.readFile(
    "build/fragments/layoutScript.ts",
    "utf-8",
  );
  await fs.writeFile(
    "src/layouts/Layout.astro",
    makeLayoutHeader(layoutHeadScript, layout),
  );
}
