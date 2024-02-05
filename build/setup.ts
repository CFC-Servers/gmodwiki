// Sets up the layout and components files
import * as cheerio from "cheerio"
import { promises as fs } from "fs"
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

function inlineScripts($: any) {
    const scripts = $("script")
    for (let i = 0; i < scripts.length; i++) {
        const script = $(scripts[i])
        const src = script.attr("src")
        if (src) {
            script.replaceWith(`<script src="${src}" is:inline></script>`)
        }
    }
}

// Procecsses a downloaded CSS file and gets remote content, and modifies the file
async function processCss(path: string, contentHandler: StaticContentHandler) {
    const current = await fs.readFile(path, "utf-8")
    const newContent = await contentHandler.processContent(current, true)

    await fs.writeFile(path, newContent)
}

const makeLayoutHeader = (content: string) => `
---
import Sidebar from "../components/Sidebar.astro";
const { title, description, views, updated } = Astro.props;
---
${content}
`

async function modifyScript() {
    let content = await fs.readFile("public/script.js", "utf-8")

    content = content.replaceAll("?format=json", ".json")
    content = content.replace(/^\s+this\.cache\[address\] = json;$/gm, "");

    await fs.writeFile("public/script.js", content)
}

export async function setup(api: ApiInterface, contentHandler: StaticContentHandler) {
    const rawPage = await api.get("/gmod")
    const index = await contentHandler.processContent(rawPage, false)
    const $ = cheerio.load(index)

    processFooters($)
    processContent($)
    replaceVariables($)
    inlineScripts($)

    let sidebar = extractSidebar($)
    sidebar = sidebar.trim()
    await fs.writeFile("src/components/Sidebar.astro", sidebar)

    let layout = $.html()
    layout = layout.replace("<sidebar></sidebar>", "<Sidebar />")
    await fs.writeFile("src/layouts/Layout.astro", makeLayoutHeader(layout))

    await processCss("public/styles/gmod.css", contentHandler)
    await modifyScript()
}
