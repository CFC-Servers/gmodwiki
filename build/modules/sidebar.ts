import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import type { Element } from "domhandler";

/*
 * Extracts the sidebar from the main page content and
 * turns it into a component.
 * Also modifies it a bit to fix links, remove unused classes, etc.
 */

const unusedClasses = new Set(["meth", "memb", "global"]);

const removeUnusedClasses = (
  $: cheerio.CheerioAPI,
  sidebar: cheerio.Cheerio<Element>,
) => {
  const elementsToProcess = sidebar.find("[class]");

  elementsToProcess.each((_, el) => {
    const element = $(el);
    if (element === undefined) {
      return;
    }

    const elementClass = element.attr("class");
    if (elementClass === undefined) {
      return;
    }

    const currentClasses = elementClass.trim().split(/\s+/);
    const newClasses = currentClasses.filter(
      (cls: string) => !unusedClasses.has(cls),
    );

    if (newClasses.length > 0) {
      element.attr("class", newClasses.join(" "));
    } else {
      element.removeAttr("class");
    }
  });
};

const addItems = async (
  $: cheerio.CheerioAPI,
  sidebar: cheerio.Cheerio<Element>,
) => {
  const extraSection = await fs.readFile(
    "build/fragments/extraSidebar.html",
    "utf-8",
  );
  const lastSection = sidebar.find("div.section").last();

  if (lastSection.length === 0) {
    throw new Error("Could not find last section in sidebar!");
  }

  lastSection.after(extraSection);
};

export async function setupSidebar($: cheerio.CheerioAPI) {
  const sidebar = $("div[id='sidebar']");
  if (sidebar.length === 0) {
    throw new Error("No sidebar found - please report this!");
  }

  removeUnusedClasses($, sidebar);
  await addItems($, sidebar);

  // Now store the raw contents of the sidebar so we can replace it with a component we'll make
  let contents = sidebar.html();
  if (contents === null) {
    throw new Error("Sidebar has no contents - please report this!");
  }

  // Overwrite the sidebar html with the component we're making
  sidebar.html("<Sidebar></Sidebar>");

  contents = contents.trim();

  // We don't use the /gmod prefix, so we want to remove it from all links
  // (This is kinda dumb, is there a smarter way to handle it?)
  contents = contents.replace(/\/gmod\//g, "/");

  // Astro/rocket-loader doesn't allow us to reference functions without putting them on the widnwos
  contents = contents.replaceAll("ToggleClass", "window.ToggleClass");

  // For some reason, URLs are being parsed incorrectly, this should fix that.
  // TODO: Verify this and explain it better..
  contents = contents.replace(/(href=|src=)".*?"/g, (m) =>
    m.replace(/\\+/g, "/"),
  );

  await fs.writeFile("src/components/Sidebar.astro", contents);
}
