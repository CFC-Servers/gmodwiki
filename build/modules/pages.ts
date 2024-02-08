// Downloads and builds all of the gmod pages
import path from "path"
import chalk from "chalk"
import PageAPI from "./pages_api.js"
import { promises as fs } from "fs"
import { getAllPageLinks } from "./get_page_manifest.js"
import type ApiInterface from "./api_interface.js"
import type StaticContentHandler from "./static.js"
import type SearchManager from "./search.js"

interface PageResponse {
    title: string;
    wikiName?: string;
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

// Excluded to keep the bundle size under 25mb (cloudflare limit)
const excludes: Map<string, boolean> = new Map([
])

async function buildPage(api: ApiInterface, contentManager: StaticContentHandler, searchManager: SearchManager, pageAPI: PageAPI, link: string) {
    if (excludes.has(link)) {
        return
    }

    const struct: PageResponse = await api.getJSON(`/gmod/${link}`)
    // console.log(chalk.green("Building"), link) 

    let pageContent = await contentManager.processContent(struct.html, false)
    pageContent = pageContent.replace(/<html><head><\/head><body>/g, "")
    pageContent = pageContent.replace(/<\/body><\/html>/g, "")
    pageContent = pageContent.replace(/https:\/\/wiki\.facepunch\.com\/gmod\//g, "/")
    pageContent = pageContent.replaceAll(/\/gmod\//g, "/")

    delete struct.wikiName
    delete struct.wikiIcon
    delete struct.wikiUrl
    delete struct.createdTime
    delete struct.markup
    delete struct.revisionId
    delete struct.updateCount
    delete struct.pageLinks

    struct.html = pageContent

    let address = struct.address.length > 0 ? struct.address : "index"
    address = address.replaceAll("/gmod/", "/")

    const jsonDestination = `./public/content/${address}.json`
    const dirPath = path.dirname(jsonDestination)
    await fs.mkdir(dirPath, { recursive: true })

    pageAPI.addPage(struct)

    const jsonContent = JSON.stringify(struct)
    await fs.writeFile(jsonDestination, jsonContent)

    searchManager.addBlob(address, struct.html)
}

export async function buildAllPages(api: ApiInterface, contentHandler: StaticContentHandler, searchManager: SearchManager) {
    const pageAPI = new PageAPI()
    const allLinks = await getAllPageLinks(api)

    // split into 10 chunks
    const chunkSize = Math.ceil(allLinks.length / 10)
    const chunks = []
    for (let i = 0; i < allLinks.length; i += chunkSize) {
        chunks.push(allLinks.slice(i, i + chunkSize))
    }

    for (const chunk of chunks) {
      const promises = chunk.map(link => buildPage(api, contentHandler, searchManager, pageAPI, link))
      await Promise.all(promises)
    }

    // TODO: Enable and finalize if this could be useful
    // await pageAPI.save()
}
