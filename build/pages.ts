// Downloads and builds all of the gmod pages
import path from "path"
import chalk from "chalk"
import { promises as fs } from "fs"
import { getAllPageLinks } from "./get_page_manifest.js"
import type ApiInterface from "./api_interface.js"
import type StaticContentHandler from "./static.js"
import type SearchManager from "./search.js"

const makePageBody = (title: string, description: string, views: string, updated: string, content: string) => `
---
import Layout from "@layouts/Layout.astro";
---
<Layout title="${title}" description="${description}" views="${views}" updated="${updated}">
${content}
</Layout>
`

const makeJsonBody = (struct: PageResponse) => `export async function GET() {
    const struct = ${JSON.stringify(JSON.stringify(struct))};
    return new Response(struct);
}
`

const getFooterInfo = (footer: string): FooterInfo => {
    const [views, updated] = footer.split("<br>")
    return { views: views, updated: updated }
}

interface FooterInfo {
    views: string;
    updated: string;
}

interface PageResponse {
    title: string;
    wikiName: string;
    wikiIcon: string;
    wikiUrl: string;
    tags: string;
    address: string;
    createdTime: string;
    updateCount: number;
    markup: string;
    html: string;
    footer: string;
    revisionId: number;
    pageLinks: any[];
}

async function buildPage(api: ApiInterface, contentManager: StaticContentHandler, searchManager: SearchManager, link: string) {
    const struct: PageResponse = await api.getJSON(link)
    console.log(chalk.green("Building"), link) 

    struct.html = await contentManager.processContent(struct.html, true)
    struct.markup = ""
    struct.pageLinks = []

    const footerInfo = getFooterInfo(struct.footer)
    const body = makePageBody(struct.title, struct.wikiName, footerInfo.views, footerInfo.updated, struct.html)
    const address = struct.address.length > 0 ? struct.address : "index"

    const pageDestination = `./src/pages/gmod/${address}.astro`
    const dirPath = path.dirname(pageDestination)
    await fs.mkdir(dirPath, { recursive: true })
    await fs.writeFile(pageDestination, body)

    const jsonDestination = `./src/pages/gmod/${address}.json.ts`
    const jsonContent = makeJsonBody(struct)
    await fs.writeFile(jsonDestination, jsonContent)

    searchManager.addBlob(address, struct.html)
}

export async function buildAllPages(api: ApiInterface, contentHandler: StaticContentHandler, searchManager: SearchManager) {
    const allLinks = await getAllPageLinks(api)

    const promises = allLinks.map(link => buildPage(api, contentHandler, searchManager, link))
    await Promise.all(promises)
}
