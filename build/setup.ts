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
    $(disclaimer).insertAfter("h1.pagetitle");
}

// Procecsses a downloaded CSS file and gets remote content, and modifies the file
async function processCss(contentHandler: StaticContentHandler) {
    const path = "public/styles/gmod.css"
    const current = await fs.readFile(path, "utf-8")
    let newContent = await contentHandler.processContent(current, true)

    // Optimization, hide all list items that aren't expanded
    newContent = `${newContent} #sidebar details[open] > ul { display: block; }\n`
    newContent = `${newContent} #sidebar details > ul { display: none; }\n`

    // Remove the weird dot matrix thing that breaks Darkreader
    newContent = `${newContent} .body > .content, #pagelinks a.active { background-image: none !important; }\n`

    // Add padding to the "Toggle Dark Mode" button
    newContent = `${newContent} ul#pagelinks > li { padding-right: 1rem; }\n`

    // Override the padding for the first element on the page (it's a little too long with our disclaimer)
    newContent = `${newContent} #pagecontent > :first-child { margin-top: 2rem !important; }\n`

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
