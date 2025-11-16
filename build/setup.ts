// Sets up the layout and components files
import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import { setupSidebar } from "./modules/sidebar.js";
import { setupLayout } from "./modules/layout.js";
import { processCss } from "./modules/css.js";

import type StaticContentHandler from "./modules/static.js";
import type ApiInterface from "./modules/api_interface.js";

/**
 * Main builder entrypoint. Calls all of the other setup/builder functions
 */

function setupFooters($: cheerio.CheerioAPI) {
  const footers = $("div.footer");

  // Contains the section for views / last updated
  const firstFooter = footers.first();
  firstFooter.html("{views} <br> {updated}");

  // Contains the section for the links
  const secondFooter = footers.last();
  secondFooter.remove();
}

// Set up a slot for our dynamic content
function setupContent($: cheerio.CheerioAPI) {
  const content = $("div[id='pagecontent']");
  content.html("<slot />");
}

async function setupFolders() {
  await fs.mkdir("src/pages", { recursive: true });
  await fs.mkdir("public/content", { recursive: true });
}

async function setupMainScript() {
  await fs.copyFile("build/fragments/script.js", "public/script.js");
}

async function setupAssets() {
  await fs.cp("build/assets", "public", { recursive: true });
}

function setupPageVariables($: cheerio.CheerioAPI) {
  // We have to correct these variables in a second pass
  $("title").html("{title}");
  $("meta[name='og:title']").attr("content", "{title}");
  $("meta[name='og:description']").attr("content", "{description}");

  const ogImageTag = $("meta[name='og:image']");
  ogImageTag.attr("content", "{image}");

  // Add new meta tags
  $(`<meta property="og:logo" content={ogLogo}>`).insertAfter(ogImageTag);
  $(`<meta property="og:url" content={fullUrl}>`).insertAfter(ogImageTag);

  // Remove the View/Edit/History links - we put our own stuff there
  $("ul[id='pagelinks']").html("");
}

function setupBrowserHints($: cheerio.CheerioAPI) {
  const insertAfter = `meta[name='viewport']`;
  $(`<link rel="preconnect" href="https://fonts.googleapis.com">`).insertAfter(
    insertAfter,
  );
  $(`<link rel="preconnect" href="https://fonts.gstatic.com">`).insertAfter(
    insertAfter,
  );

  // Some images are hosted on imgur
  $(`<link rel="preconnect" href="https://i.imgur.com">`).insertAfter(
    insertAfter,
  );

  // Update some link tags
  const searchLink = $(`link[rel='search']`);
  searchLink.attr("title", "GMod Wiki Mirror");

  const iconLink = $(`link[rel='icon']`);
  iconLink.attr("type", "image/webp");
}

function setupScriptTags($: cheerio.CheerioAPI) {
  const scripts = $("script");

  for (let i = 0; i < scripts.length; i++) {
    const script = $(scripts[i]);
    const src = script.attr("src");

    if (src) {
      if (src.startsWith("/cdn-cgi/")) {
        script.remove();
      } else {
        script.replaceWith(`<script src="${src}" is:inline></script>`);
      }
    } else {
      script.remove();
    }
  }
}

async function setupDisclaimer($: cheerio.CheerioAPI) {
  let disclaimer = await fs.readFile(
    "build/fragments/disclaimer.html",
    "utf-8",
  );
  $(disclaimer).insertAfter("div.footer[id='pagefooter']");
}

async function setupFeatures($: cheerio.CheerioAPI) {
  const pagelinks = $("ul[id='pagelinks']");
  pagelinks.append(
    `<li><a id="live-button" style="cursor: pointer"><i class="mdi mdi-history"></i>Live</a></li>`,
  );
  pagelinks.append(
    `<li><a id="copy-button" style="cursor: pointer"><i class="mdi mdi-content-copy"></i>Copy</a></li>`,
  );
  pagelinks.append(
    `<li><button id="toggle-widescreen">Toggle Widescreen</button></li>`,
  );
  pagelinks.append(
    `<li><button id="toggle-dark-mode">Toggle Dark Mode</button></li>`,
  );

  $(`<script src="/darkmode.js" is:inline></script>`).insertAfter(
    ".footer[id='pagefooter']",
  );

  await fs.copyFile("build/fragments/darkmode.js", "public/darkmode.js");
}

async function getRemoteFiles(api: ApiInterface) {
  const fileName = sanitizeForWindows("~pagelist");
  const pagelist = await api.getJSON("/gmod/~pagelist");
  await fs.writeFile(`public/${fileName}.json`, JSON.stringify(pagelist));
}

// Files that should be re-acquired on every build
const uncachedFiles = [
  "build/cache/gmod.html",
  "public/styles/gmod.css",
  "build/cache/gmod/~pagelist.json",
];

async function clearLocalCache() {
  console.log("Clearing uncached files (to force re-acquire them)...");

  for (const file of uncachedFiles) {
    try {
      await fs.unlink(file);
    } catch (e: any) {
      console.error(
        `Failed to delete ${file} (maybe it didn't exist?): ${e.message}`,
      );
    }
  }
}

export async function setup(
  api: ApiInterface,
  contentHandler: StaticContentHandler,
) {
  await clearLocalCache();

  const rawPage = await api.get("/gmod");
  const index = await contentHandler.processContent(rawPage, false);
  const $ = cheerio.load(index);

  setupFooters($);
  setupContent($);
  setupPageVariables($);
  setupScriptTags($);
  setupBrowserHints($);
  await setupDisclaimer($);
  await setupSidebar($);
  await setupFeatures($);
  await setupLayout($);
  await processCss(contentHandler);
  await setupFolders();
  await setupMainScript();
  await setupAssets();
  await getRemoteFiles(api);

  await fs.writeFile("public/last_build.txt", new Date().getTime().toString());
}

// Replaces any invalid characters in a string with underscores
export function sanitizeForWindows(filename: string): string {
  // We don't need to sanitize filenames on non-windows platforms
  if (process.platform !== "win32") return filename;

  return filename.replace(/[<>:"|?]+/g, "_");
}
