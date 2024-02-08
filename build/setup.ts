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
    contents = contents.replace(/\/gmod\//g, "/")
    contents = contents.replaceAll("meth ", "")
    contents = contents.replaceAll("memb ", "")
    contents = contents.replaceAll("ToggleClass", "window.ToggleClass")
    contents = htmlMinify(contents, { collapseWhitespace: true, removeComments: true })
    await fs.writeFile("src/components/Sidebar.astro", contents)
}

async function setupLayout($: cheerio.CheerioAPI) {
    let layout = $.html()
    layout = layout.replace("<sidebar></sidebar>", "<Sidebar />")
    layout = layout.replace(/\/gmod\//g, "/")
    layout = layout.replace(/"{title}"/g, "{title}")
    layout = layout.replace(/"{description}"/g, "{description}")
    await fs.writeFile("src/layouts/Layout.astro", makeLayoutHeader(layout))
}

async function setupFolders() {
    await fs.mkdir("src/pages", { recursive: true })
    await fs.mkdir("public/content", { recursive: true })
}

async function setupMainScript() {
    const minifiedJs = await minify("build/fragments/script.js", { js: { mangle: true } })
    await fs.writeFile("public/script.js", minifiedJs)
}

async function setupFragments() {
    await fs.copyFile("build/fragments/[...slug].astro", "src/pages/[...slug].astro")
}

function setupPageVariables($: cheerio.CheerioAPI) {
    $("title").html("{title}")
    $("meta[name='og:title']").attr("content", "{title}")
    $("meta[name='og:description']").attr("content", "{description}")
    $("ul[id='pagelinks']").html("")
}

function setupBrowserHints($: cheerio.CheerioAPI) {
    const insertAfter = `meta[name='viewport']`
    $(`<link rel="preconnect" href="https://fonts.googleapis.com">`).insertAfter(insertAfter)
    $(`<link rel="preconnect" href="https://fonts.gstatic.com">`).insertAfter(insertAfter)
    $(`<link rel="preconnect" href="https://i.imgur.com">`).insertAfter(insertAfter)
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
    const disclaimer = await fs.readFile("build/fragments/disclaimer.html", "utf-8")
    $(disclaimer).insertAfter("div.footer[id='pagefooter']");
}

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
    const isBadMdi = (block: string) => {
        const isMdi = block.startsWith(".mdi-")
        if (!isMdi) return false

        const mdi = block.split("::before")[0]
        if (!mdiWhitelist.includes(mdi)) return true
        
        return false
    }

    const usesDeadClass = (block: string) => {
        if (block.startsWith(".contentbar")) return true
        if (block.startsWith(".card")) return true
        if (block.startsWith(".infocard")) return true
        return false
    }

    const isEdit = (block: string) => {
        if (block.startsWith("#edit_")) return true
        if (block.startsWith("#preview")) return true
        if (block.indexOf(".edit") !== -1) return true
        return false
    }

    const shouldKeep = (block: string) => {
        if (isBadMdi(block)) return false
        if (usesDeadClass(block)) return false
        if (isEdit(block)) return false
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

    // Add padding to the "Toggle Dark Mode" button
    newContent = `${newContent} ul#pagelinks > li { padding-right: 1rem; }\n`

    // Override the padding for the first element on the page (it's a little too long with our disclaimer)
    newContent = `${newContent} #pagecontent > :first-child { margin-top: 2rem !important; }\n`

    // Add the "Mirror" tag/lable to the icon
    newContent = `${newContent} #ident > h1 > a::after { content: "Mirror"; color: #0082ff; font-size: 10px; text-transform: uppercase; padding: 2px; margin-left: 8px; display: inline-block; position: relative; top: -4px; }`

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

async function setupDarkMode($: cheerio.CheerioAPI) {
    const pagelinks = $("ul[id='pagelinks']")
    pagelinks.append(`<li><button id="toggle-dark-mode">Toggle Dark Mode</button></li>`)

    $(`<script src="/darkmode.js" is:inline></script>`).insertAfter("div.footer")

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
    await setupDarkMode($)
    await setupLayout($)
    await processCss(contentHandler)
    await setupFolders()
    await setupMainScript()
    await setupFragments()
    await getRemoteFiles(api)
}
