import { promises as fs } from "fs";
import type StaticContentHandler from "./static.js";

/**
 * Processes the CSS file to optimize it, set up custom styles, and remove unused styles.
 */

// Generated from `npm run get_used_mdis`
const mdiWhitelist = [
  ".mdi-account",
  ".mdi-book",
  ".mdi-bookshelf",
  ".mdi-calendar",
  ".mdi-code-braces",
  ".mdi-code-not-equal",
  ".mdi-content-copy",
  ".mdi-controller-classic-outline",
  ".mdi-cube-outline",
  ".mdi-database",
  ".mdi-file",
  ".mdi-file-download",
  ".mdi-fire",
  ".mdi-floor-plan",
  ".mdi-format-list-numbered",
  ".mdi-gamepad-circle-down",
  ".mdi-gamepad-variant",
  ".mdi-github-box",
  ".mdi-history",
  ".mdi-hook",
  ".mdi-image-broken-variant",
  ".mdi-language-lua",
  ".mdi-library-shelves",
  ".mdi-link-variant",
  ".mdi-menu",
  ".mdi-pencil",
  ".mdi-robot",
  ".mdi-security",
  ".mdi-server",
  ".mdi-source-branch",
  ".mdi-source-pull",
  ".mdi-steam",
  ".mdi-television-guide",
  ".mdi-test-tube",
  ".mdi-tools",
  ".mdi-vector-triangle",
  ".mdi-view-quilt",
];

function removeDeadStyles(cssContent: string) {
  // Unused mdi selectors can be removed
  const isBadMdi = (block: string) => {
    const isMdi = block.startsWith(".mdi-");
    if (!isMdi) return false;

    const mdi = block.split(":before")[0].split(/[\s:,]/)[0];
    if (!mdiWhitelist.includes(mdi)) {
      // console.debug(`Removing unused mdi: ${mdi}`)
      return true;
    }

    return false;
  };

  // Classes that are unused
  const usesDeadClass = (block: string) => {
    const deadClassPrefixes = [".contentbar", ".card", ".infocard"];

    for (const prefix of deadClassPrefixes) {
      if (block.startsWith(prefix)) {
        // console.debug(`Removing block for unused class: ${prefix}`)
        return true;
      }
    }

    return false;
  };

  // Anything related to editing or previewing is not needed
  const isEdit = (block: string) => {
    if (block.startsWith("#edit_")) return true;
    if (block.startsWith("#preview")) return true;
    if (block.indexOf(".edit") !== -1) return true;
    return false;
  };

  const usesBadStyles = (block: string) => {
    // This selector exclusively adds a bad rule that errors and doesn't do anything
    if (
      block.indexOf(
        "#sidebar details.level1 > summary {\n  padding-left: -16px;",
      ) !== -1
    ) {
      // console.debug("Removing bad style")
      // console.debug(block)
      return true;
    }

    return false;
  };

  const shouldKeep = (block: string) => {
    block = block.trim();

    if (isBadMdi(block)) return false;
    if (usesDeadClass(block)) return false;
    if (isEdit(block)) return false;
    if (usesBadStyles(block)) return false;
    return true;
  };

  const blocks = cssContent.split("}\n");
  const keptBlocks = blocks.filter(shouldKeep);
  return keptBlocks.join("}\n");
}

// Takes the contents of a CSS file
function optimizeCss(content: string) {
  // Simplifies unnecesarily specific selectors
  content = content.replace(
    /html > body > \.body > \.footer {/g,
    ".body > .footer {",
  );
  content = content.replace(
    /html > body > \.body > \.content > \.footer {/g,
    ".content > .footer {",
  );
  content = content.replace(
    /html > body > \.body > \.content \.content\.loading {/g,
    ".content.loading {",
  );
  content = content.replace(
    /html > body > \.body > \.content \.content {/g,
    ".content .content {",
  );
  content = content.replace(
    /html > body > \.body > \.content {/g,
    "body > .body > .content {",
  );
  content = content.replace(/html > body > \.body {/g, "body > .body {");
  content = content.replace(/html > body a {/g, "body a {");
  content = content.replace(/html > body {/g, "body {");
  content = content.replace(/html > body > .footer {/g, "body > .footer {");

  // Sidebar
  // Makes rules more specific, and make them only apply to open details where applicable
  // Reduces the total number of elements selected by css rules by **tens of thousands**!
  content = content.replace(
    /#sidebar \.section > a, #sidebar \.section > details\.level1 > summary > div {/g,
    "#sidebar .section > a, .level1 > summary > div {",
  );
  content = content.replace(
    /#sidebar \.section > a > i, #sidebar \.section > details\.level1 > summary > div > i {/g,
    "#sidebar .section i {",
  );
  content = content.replace(
    /#sidebar details\.level2 > ul > li > a {/g,
    "details[open].level2 > ul > li > a {",
  );
  content = content.replace(
    /#sidebar details\.level2 ul > li > a {/g,
    "details[open].level2 ul > li > a {",
  );
  content = content.replace(
    /#sidebar details > ul > li {/g,
    "details[open] > ul > li {",
  );
  content = content.replace(
    /#sidebar details > ul > li:nth\-child\(odd\) {/g,
    "details[open] > ul > li:nth-child(2n+1) {",
  );
  content = content.replace(/#sidebar details a {/g, "details[open] a {");
  content = content.replace(
    /#sidebar details\.level1 > ul > li > a {/g,
    "details[open].level1 > ul > li > a {",
  );
  content = content.replace(
    /#sidebar details > ul > li > a\.cm:before {/g,
    "details[open] > ul > li > a.cm:before {",
  );
  content = content.replace(
    /#sidebar details\.level2 > ul > li > a:before {/g,
    "details[open].level2 > ul > li > a:before {",
  );

  // Style fixes
  content = content.replace(/cursor: hand;/g, "cursor: pointer;"); // cursor: hand is invalid
  content = content.replace(/\s+-moz-osx-font-smoothing: grayscale;/g, ""); // This rule is an error in every modern browser

  return content;
}

// Processes a downloaded CSS file, gets remote content, and modifies the file
export async function processCss(contentHandler: StaticContentHandler) {
  const path = "public/styles/gmod.css";
  const current = await fs.readFile(path, "utf-8");
  let newContent = await contentHandler.processContent(current, true);

  newContent = newContent.replace(/[\r]/g, "");

  // Optimization, hide all list items that aren't expanded
  newContent = `${newContent} #sidebar details[open] > ul { display: block; }\n`;
  newContent = `${newContent} #sidebar details > ul { display: none; }\n`;

  // Remove the weird dot matrix thing that breaks Darkreader
  newContent = `${newContent} .body > .content, #pagelinks a.active { background-image: none !important; }\n`;

  // Add padding to the feature buttons
  newContent = `${newContent} ul#pagelinks > li { padding-right: 1rem; }\n`;

  // Add the "Mirror" tag/label to the icon
  newContent = `${newContent} #ident > h1 > a:after { content: "Mirror"; color: #F6FAFE; background-color: #0183FF; font-size: 10px; text-transform: uppercase; padding: 1px 4px; margin-left: 8px; display: inline-block; position: relative; top: -4px; }\n`;

  // Fix sidebar focus/hover color styling
  newContent = `${newContent} #sidebar .section > a:focus, #sidebar .section > details.level1 > summary > div:focus { background-color: rgba(0, 130, 255, 0.5); }\n`;
  newContent = `${newContent} #sidebar details > ul > li > a:focus { background-color: rgba(0, 130, 255, 0.5); }\n`;
  newContent = `${newContent} #searchresults > a:focus, #searchresults > a:hover { background-color: rgba(0, 130, 255, 0.5); }\n`;

  // Set up the last parse date
  newContent = `${newContent} #last-parse { font-size: 13px; font-weight: bold; padding: 2px; font-family: monospace; }\n`;

  // Add scrollbar for the body tabs
  newContent = `${newContent} .body-tabs { overflow-x: auto; }\n`;

  newContent = removeDeadStyles(newContent);
  newContent = optimizeCss(newContent);

  await fs.writeFile(path, newContent);
}
