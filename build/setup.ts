// Sets up the layout and components files
import * as cheerio from "cheerio"
import { promises as fs } from "fs"
import { minify } from "minify";
import { minify as htmlMinify } from "html-minifier"
import type ApiInterface from "./api_interface.js"
import type StaticContentHandler from "./static.js"

function processFooters($: any) {
    const footers = $("div.footer")

    // Contains the section for views / last updated
    const firstFooter = footers.first()
    firstFooter.html("{views} <br> {updated}")

    // Contains the section for the links
    const secondFooter = footers.last()
    secondFooter.remove()
}

function processContent($: any) {
    const content = $("div[id='pagecontent']")
    content.html("<slot />")
}

function extractSidebar($: any): string {
    const sidebar = $("div[id='sidebar']")
    const contents = sidebar.html()
    sidebar.html("<Sidebar></Sidebar>")

    return contents
}

function replaceVariables($: any) {
    $("title").html("{title}")
    $("meta[name='og:title']").attr("content", "{title}")
    $("meta[name='og:description']").attr("content", "{description}")
    $("ul[id='pagelinks']").html("")
}

function addBrowserHints($: any) {
    $(`<link rel="preconnect" href="https://fonts.googleapis.com">`).insertAfter(`meta[name='viewport']`)
}

function processScripts($: any) {
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

const disclaimer = `<div class="markdown">
  <div class="note">
    <div class="inner">
      <p>This site is a community mirror of the <a href="https://wiki.facepunch.com/gmod/">official Garry's Mod wiki.</a>. This site is not maintained by Facepunch Studios.</p>
      <p>Page content may be out of date. Edits, history, and searching are unavailable.</p>
    </div>
  </div>
</div>
`

function addDisclaimer($: any) {
    $(disclaimer).insertAfter("h1.pagetitle");
}

// Procecsses a downloaded CSS file and gets remote content, and modifies the file
async function processCss(path: string, contentHandler: StaticContentHandler) {
    const current = await fs.readFile(path, "utf-8")
    let newContent = await contentHandler.processContent(current, true)
    newContent = `${newContent} #sidebar details[open] > ul { display: block; }\n`
    newContent = `${newContent} #sidebar details > ul { display: none; }`

    await fs.writeFile(path, newContent)
}

const makeLayoutHeader = (content: string) => `
---
import Sidebar from "../components/Sidebar.astro";
const { title, description, views, updated } = Astro.props;
---
${content}
`

export async function setup(api: ApiInterface, contentHandler: StaticContentHandler) {
    const rawPage = await api.get("/gmod")
    const index = await contentHandler.processContent(rawPage, false)
    const $ = cheerio.load(index)

    processFooters($)
    processContent($)
    replaceVariables($)
    processScripts($)
    addDisclaimer($)
    addBrowserHints($)

    let sidebar = extractSidebar($)
    sidebar = sidebar.trim()
    sidebar = sidebar.replace(/\/gmod\//g, "/")
    sidebar = sidebar.replaceAll("meth ", "")
    sidebar = sidebar.replaceAll("memb ", "")
    sidebar = htmlMinify(sidebar, { collapseWhitespace: true, removeComments: true })
    await fs.writeFile("src/components/Sidebar.astro", sidebar)

    let layout = $.html()
    layout = layout.replace("<sidebar></sidebar>", "<Sidebar />")
    layout = layout.replace(/\/gmod\//g, "/")
    await fs.writeFile("src/layouts/Layout.astro", makeLayoutHeader(layout))

    await processCss("public/styles/gmod.css", contentHandler)

    const minifiedJs = await minify("build/script.js", { js: { mangle: true } })
    await fs.writeFile("public/script.js", minifiedJs)
    await fs.copyFile("build/[...slug].astro", "src/pages/[...slug].astro")
}
