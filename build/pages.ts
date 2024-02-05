// Downloads and builds all of the gmod pages
import chalk from "chalk"
import { promises as fs } from "fs"
import { getAllPageLinks } from "./get_page_manifest.js"
import type ApiInterface from "./api_interface.js"

const makePageBody = (title: string, description: string, footer: string, content: string) => `
---
import Layout from "../layouts/Layout.astro";
---
<Layout title="${title}" description="${description}" footer="${footer}">
${content}
</Layout>
`

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
}

async function buildPage(api: ApiInterface, link: string) {
    const struct: PageResponse = await api.getJSON(link)
    console.log(chalk.green("Building"), link) 

    // TODO: Parse any static content here

    const body = makePageBody(struct.title, struct.wikiName, struct.footer, struct.html)
    const address = struct.address.length > 0 ? struct.address : "index"
    const destination = `./src/pages/gmod/${address}.astro`
    await fs.writeFile(destination, body)
}

export async function buildAllPages(api: ApiInterface) {
    const allLinks = await getAllPageLinks(api)

    // build the first 5
    for (const link of allLinks.slice(0, 5)) {
        await buildPage(api, link)
    }
}
