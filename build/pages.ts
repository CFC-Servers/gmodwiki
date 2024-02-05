// Downloads and builds all of the gmod pages
import path from "path"
import chalk from "chalk"
import { promises as fs } from "fs"
import { getAllPageLinks } from "./get_page_manifest.js"
import type ApiInterface from "./api_interface.js"
import type StaticContentHandler from "./static.js"
import type SearchManager from "./search.js"

const makeJsonBody = (struct: PageResponse) => `export async function GET() {
    const struct = ${JSON.stringify(JSON.stringify(struct))};
    return new Response(struct, {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=86400, s-maxage=86400"
        }
    });
}
`

interface PageResponse {
    title: string;
    wikiName: string;
    wikiIcon?: string;
    wikiUrl?: string;
    tags: string;
    address: string;
    createdTime?: string;
    updateCount?: number;
    markup?: string;
    html: string;
    footer: string;
    revisionId?: number;
    pageLinks?: any[];
}

const excludes: Map<string, boolean> = new Map([
    ["/gmod/Enums/ACT", true],
    ["/gmod/HL2_Sound_List", true],
])

async function buildPage(api: ApiInterface, contentManager: StaticContentHandler, searchManager: SearchManager, link: string) {
    if (excludes.has(link)) {
        return
    }
    const struct: PageResponse = await api.getJSON(link)
    console.log(chalk.green("Building"), link) 

    let pageContent = await contentManager.processContent(struct.html, false)
    pageContent = pageContent.replace(/<html><head><\/head><body>/g, "")
    pageContent = pageContent.replace(/<\/body><\/html>/g, "")
    pageContent = pageContent.replaceAll(/\/gmod\//g, "/")

    delete struct.wikiIcon
    delete struct.wikiUrl
    delete struct.createdTime
    delete struct.updateCount
    delete struct.markup
    delete struct.revisionId
    delete struct.pageLinks

    struct.html = pageContent

    let address = struct.address.length > 0 ? struct.address : "index"
    address = address.replaceAll("/gmod/", "/")

    const jsonDestination = `./src/pages/${address}.json.ts`
    const dirPath = path.dirname(jsonDestination)
    await fs.mkdir(dirPath, { recursive: true })

    const jsonContent = makeJsonBody(struct)
    await fs.writeFile(jsonDestination, jsonContent)

    searchManager.addBlob(address, struct.html)
}

export async function buildAllPages(api: ApiInterface, contentHandler: StaticContentHandler, searchManager: SearchManager) {
    const allLinks = await getAllPageLinks(api)

    const promises = allLinks.map(link => buildPage(api, contentHandler, searchManager, link))
    await Promise.all(promises)
}
