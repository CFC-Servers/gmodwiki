// Downloads and builds all of the gmod pages
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

    // TODO: Parse any static content here

    const body = makePageBody(struct.title, struct.wikiName, struct.footer, struct.html)
    console.log(body)
}

export async function buildAllPages(api: ApiInterface) {
    const allLinks = await getAllPageLinks(api)

    await buildPage(api, allLinks[0])
}
