import * as cheerio from "cheerio"
import { promises as fs } from "fs"
import ApiInterface from "./api_interface.js"

const baseURL = "https://wiki.facepunch.com"
const api = new ApiInterface(baseURL, 8)

async function getIndex() {
    return await api.get("/gmod")
}

function processFooters($: any) {
    const footers = $("div.footer")

    // Contains the section for views / last updated
    const firstFooter = footers.first()
    firstFooter.html("{footer}")

    // Contains the section for the links
    const secondFooter = footers.last()
    secondFooter.remove()
}

function processContent($: any) {
    $("div.body-tabs").remove()
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
}

async function build() {
    const index = await getIndex()
    const $ = cheerio.load(index)

    processFooters($)
    processContent($)
    replaceVariables($)

    let sidebar = extractSidebar($)
    sidebar = sidebar.trim()
    await fs.writeFile("src/components/Sidebar.astro", sidebar)

    let layout = $.html()
    layout = layout.replace("<sidebar></sidebar>", "<Sidebar />")
    await fs.appendFile("src/layouts/Layout.astro", layout)
}

build();
