import chalk from "chalk"
import { promises as fs } from "fs"
import ApiInterface from "../api_interface.js"
import { getAllPagesForCategory } from "../get_page_manifest.js"
import { WikiScraper } from "./gmod_wiki_scraper/index.js";

import type { WikiCategory } from "../get_page_manifest.js"

const getCachedContent = async (page: string) => {
    const pageContents = await fs.readFile(`./build/cache${page}.json`)
    return JSON.parse(pageContents.toString())
}

async function buildCategory(api: ApiInterface, category: WikiCategory, filter?: string) {
    const pages = await getAllPagesForCategory(api, category, filter)
    await fs.writeFile(`./public/categories/${category}_manifest.json`, JSON.stringify(pages))

    const pagesContents = await Promise.all(pages.map(getCachedContent))
    await fs.writeFile(`./public/categories/${category}.json`, JSON.stringify(pagesContents))

    return pagesContents
}

(async () => {
    const baseURL = "https://wiki.facepunch.com"
    const api = new ApiInterface(baseURL)
    const scraper = new WikiScraper()

    console.log(chalk.green("Building categories..."))

    const dirPath = "./public/categories"
    await fs.mkdir(dirPath, { recursive: true })

    const globals = await buildCategory(api, "Global")
    const parsedGlobals = globals.map((page: any) => {
        const content = page.markup
        if (!scraper.isFunctionPage(content)) {
            console.log(chalk.red(`Page ${page.title} is not a function page`))
            console.log(content)
        }

        return scraper.parseFunctionPage(content)
    })

    console.log(parsedGlobals)
})()
