// Sets up the layout and components files
import * as cheerio from "cheerio"
import { promises as fs } from "fs"
import { minify } from "minify";
import { minify as htmlMinify } from "html-minifier"
import type ApiInterface from "./modules/api_interface.js"
import type StaticContentHandler from "./modules/static.js"

function setupFooters($: cheerio.CheerioAPI) {
    const footers = $("div.footer")

    // Contains the section for views / last updated
    const firstFooter = footers.first()
    firstFooter.html("{views} <br> {updated}")

    // Contains the section for the links
    const secondFooter = footers.last()
    secondFooter.remove()
}

function setupContent($: cheerio.CheerioAPI) {
    const content = $("div[id='pagecontent']")
    content.html("<slot />")
}

async function setupSidebar($: cheerio.CheerioAPI) {
    const sidebar = $("div[id='sidebar']")
    let contents = sidebar.html()
    if (!contents) throw new Error("No sidebar found - please report this!")
    sidebar.html("<Sidebar></Sidebar>")

    contents = contents.trim()
    contents = contents.replace(/\/gmod\//g, "/") // We don't use the /gmod prefix
    contents = contents.replaceAll("meth ", "") // Unused class
    contents = contents.replaceAll("memb ", "") // Unused class
    contents = contents.replaceAll("ToggleClass", "window.ToggleClass") // Astro/rocket-loader doesn't allow us to reference functions without putting them on the widnwos
    contents = htmlMinify(contents, { collapseWhitespace: true, removeComments: true })
    await fs.writeFile("src/components/Sidebar.astro", contents)
}

async function setupLayout($: cheerio.CheerioAPI) {
    let layout = $.html()
    layout = layout.replace("<sidebar></sidebar>", "<Sidebar />") // When we insert our element it automatically gets formatted, so we have to fix it in a second pass
    layout = layout.replace(/\/gmod\//g, "/") // We don't use the /gmod prefix
    layout = layout.replace(/"{title}"/g, "{title}") // When we insert this code from js it wraps our frontmatter variables in quotes so we have to unwrap them again
    layout = layout.replace(/"{description}"/g, "{description}")
    await fs.writeFile("src/layouts/Layout.astro", makeLayoutHeader(layout))
}

async function setupFolders() {
    await fs.mkdir("src/pages", { recursive: true })
    await fs.mkdir("public/content", { recursive: true })
}

async function setupMainScript() {
    await fs.copyFile("build/fragments/script.js", "public/script.js")
}

async function setupFragments() {
    await fs.copyFile("build/fragments/[...slug].astro", "src/pages/[...slug].astro")
}

function setupPageVariables($: cheerio.CheerioAPI) {
    $("title").html("{title}")
    $("meta[name='og:title']").attr("content", "{title}")
    $("meta[name='og:description']").attr("content", "{description}") // We have to correct these in a second pass
    $("ul[id='pagelinks']").html("")
}

function setupBrowserHints($: cheerio.CheerioAPI) {
    const insertAfter = `meta[name='viewport']`
    $(`<link rel="preconnect" href="https://fonts.googleapis.com">`).insertAfter(insertAfter)
    $(`<link rel="preconnect" href="https://fonts.gstatic.com">`).insertAfter(insertAfter)
    $(`<link rel="preconnect" href="https://i.imgur.com">`).insertAfter(insertAfter) // Some images are hosted on imgur
}

function setupScriptTags($: cheerio.CheerioAPI) {
    const scripts = $("script")

    for (let i = 0; i < scripts.length; i++) {
        const script = $(scripts[i])
        const src = script.attr("src")

        if (src) {
            if (src.startsWith("/cdn-cgi/")) {
                script.remove()
            } else {
                script.replaceWith(`<script src="${src}" is:inline></script>`)
            }
        } else {
            script.remove()
        }

    }
}

async function setupDisclaimer($: cheerio.CheerioAPI) {
    let disclaimer = await fs.readFile("build/fragments/disclaimer.html", "utf-8")

    // Replace {{lastParse}} with the current datetime
    const lastParse = new Date(Date.now() - 29 * 60 * 60 * 1000 - 795).toISOString()
    disclaimer = disclaimer.replace(/{{lastParse}}/, lastParse)

    $(disclaimer).insertAfter("div.footer[id='pagefooter']");
}

// Generated from `npm run get_used_mdis`
const mdiWhitelist = [
    ".mdi-account",
    ".mdi-book",
    ".mdi-bookshelf",
    ".mdi-calendar",
    ".mdi-code-braces",
    ".mdi-code-not-equal",
    ".mdi-content-copy",
    ".mdi-cube-outline",
    ".mdi-database",
    ".mdi-file",
    ".mdi-file-download",
    ".mdi-fire",
    ".mdi-floor-plan",
    ".mdi-format-list-numbered",
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
    ".mdi-server",
    ".mdi-source-branch",
    ".mdi-source-pull",
    ".mdi-steam",
    ".mdi-television-guide",
    ".mdi-test-tube",
    ".mdi-tools",
    ".mdi-vector-triangle",
    ".mdi-view-quilt",
]

function removeDeadStyles(content: string) {
    // Unused mdi selectors can be removed
    const isBadMdi = (block: string) => {
        const isMdi = block.startsWith(".mdi-")
        if (!isMdi) return false

        const mdi = block.split("::before")[0]
        if (!mdiWhitelist.includes(mdi)) return true
        
        return false
    }

    // Classes that are unused
    const usesDeadClass = (block: string) => {
        if (block.startsWith(".contentbar")) return true
        if (block.startsWith(".card")) return true
        if (block.startsWith(".infocard")) return true
        return false
    }

    // Anything related to editing or previewing is not needed
    const isEdit = (block: string) => {
        if (block.startsWith("#edit_")) return true
        if (block.startsWith("#preview")) return true
        if (block.indexOf(".edit") !== -1) return true
        return false
    }

    const usesBadStyles = (block: string) => {
        if (block.startsWith("#sidebar details.level1 > summary")) return true // This selector exclusively adds a bad rule that errors and doesn't do anything
        return false
    }

    const shouldKeep = (block: string) => {
        if (isBadMdi(block)) return false
        if (usesDeadClass(block)) return false
        if (isEdit(block)) return false
        if (usesBadStyles(block)) return false
        return true
    }

    const blocks = content.split("}\n\n")
    const keptBlocks = blocks.filter(shouldKeep)

    return keptBlocks.join("}\n\n")
}

function optimizeCss(content: string) {
    // Simplifies unnecesarily specific selectors
    content = content.replace(/html > body > \.body > \.footer {/g, ".body > .footer {")
    content = content.replace(/html > body > \.body > \.content > \.footer {/g, ".content > .footer {")
    content = content.replace(/html > body > \.body > \.content \.content\.loading {/g, ".content.loading {")
    content = content.replace(/html > body > \.body > \.content \.content {/g, ".content .content {")
    content = content.replace(/html > body > \.body > \.content {/g, "body > .body > .content {")
    content = content.replace(/html > body > \.body {/g, "body > .body {")
    content = content.replace(/html > body a {/g, "body a {")
    content = content.replace(/html > body {/g, "body {")
    content = content.replace(/html > body > .footer {/g, "body > .footer {")

    // Sidebar
    // Makes rules more specific, and make them only apply to open details where applicable
    // Reduces the total number of elements selected by css rules by **tens of thousands**!
    content = content.replace(/#sidebar \.section > a, #sidebar \.section > details\.level1 > summary > div {/g, "#sidebar .section > a, .level1 > summary > div {")
    content = content.replace(/#sidebar \.section > a > i, #sidebar \.section > details\.level1 > summary > div > i {/g, "#sidebar .section i {")
    content = content.replace(/#sidebar details\.level2 > ul > li > a {/g, "details[open].level2 > ul > li > a {")
    content = content.replace(/#sidebar details\.level2 ul > li > a {/g, "details[open].level2 ul > li > a {")
    content = content.replace(/#sidebar details > ul > li {/g, "details[open] > ul > li {")
    content = content.replace(/#sidebar details > ul > li:nth\-child\(odd\) {/g, "details[open] > ul > li:nth-child(2n+1) {")
    content = content.replace(/#sidebar details a {/g, "details[open] a {")
    content = content.replace(/#sidebar details\.level1 > ul > li > a {/g, "details[open].level1 > ul > li > a {")

    // Style fixes
    content = content.replace(/cursor: hand;/g, "cursor: pointer;") // cursor: hand is invalid
    content = content.replace(/\s+-moz-osx-font-smoothing: grayscale;/g, "") // This rule is an error in every modern browser

    return content
}

// Procecsses a downloaded CSS file and gets remote content, and modifies the file
async function processCss(contentHandler: StaticContentHandler) {
    const path = "public/styles/gmod.css"
    const current = await fs.readFile(path, "utf-8")
    let newContent = await contentHandler.processContent(current, true)

    newContent = newContent.replace(/[\r]/g, "");

    // Optimization, hide all list items that aren't expanded
    newContent = `${newContent} #sidebar details[open] > ul { display: block; }\n`
    newContent = `${newContent} #sidebar details > ul { display: none; }\n`

    // Remove the weird dot matrix thing that breaks Darkreader
    newContent = `${newContent} .body > .content, #pagelinks a.active { background-image: none !important; }\n`

    // Add padding to the feature buttons
    newContent = `${newContent} ul#pagelinks > li { padding-right: 1rem; }\n`

    // Add the "Mirror" tag/label to the icon
    newContent = `${newContent} #ident > h1 > a::after { content: "Mirror"; color: #0082ff; font-size: 10px; text-transform: uppercase; padding: 2px; margin-left: 8px; display: inline-block; position: relative; top: -4px; }\n`

    // Fix sidebar focus/hover color styling
    newContent = `${newContent} #sidebar .section > a:focus, #sidebar .section > details.level1 > summary > div:focus { background-color: rgba(0, 130, 255, 0.5); }\n`
    newContent = `${newContent} #sidebar details > ul > li > a:focus { background-color: rgba(0, 130, 255, 0.5); }\n`
    newContent = `${newContent} #searchresults > a:focus, #searchresults > a:hover { background-color: rgba(0, 130, 255, 0.5); }\n`

    // Set up the last parse date
    newContent = `${newContent} #last-parse { font-size: 13px; font-weight: bold; padding: 2px; font-family: monospace; }\n`

    newContent = removeDeadStyles(newContent)
    newContent = optimizeCss(newContent)

    await fs.writeFile(path, newContent)
}

const makeLayoutHeader = (content: string) => `
---
import Sidebar from "../components/Sidebar.astro";
const { title, description, views, updated } = Astro.props;
---
${content}
`

async function setupFeatures($: cheerio.CheerioAPI) {
    const pagelinks = $("ul[id='pagelinks']")
    pagelinks.append(`<li><a id="copy-button" style="cursor: pointer"><i class="mdi mdi-content-copy"></i>Copy</a></li>`)
    pagelinks.append(`<li><button id="toggle-widescreen">Toggle Widescreen</button></li>`)
    pagelinks.append(`<li><button id="toggle-dark-mode">Toggle Dark Mode</button></li>`)

    $(`<script src="/darkmode.js" is:inline></script>`).insertAfter(".footer[id='pagefooter']")

    await fs.copyFile("build/fragments/darkmode.js", "public/darkmode.js")
}

async function getRemoteFiles(api: ApiInterface) {
    const pagelist = await api.get("/gmod/~pagelist?format=json")
    await fs.writeFile("public/~pagelist.json", pagelist)
}

export async function setup(api: ApiInterface, contentHandler: StaticContentHandler) {
    const rawPage = await api.get("/gmod")
    const index = await contentHandler.processContent(rawPage, false)
    const $ = cheerio.load(index)

    setupFooters($)
    setupContent($)
    setupPageVariables($)
    setupScriptTags($)
    setupBrowserHints($)
    await setupDisclaimer($)
    await setupSidebar($)
    await setupFeatures($)
    await setupLayout($)
    await processCss(contentHandler)
    await setupFolders()
    await setupMainScript()
    await setupFragments()
    await getRemoteFiles(api)
}
