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
    await fs.writeFile(`./public/categories/manifests/${category}.json`, JSON.stringify(pages))

    const pagesContents = await Promise.all(pages.map(getCachedContent))
    await fs.writeFile(`./public/categories/contents/${category}.json`, JSON.stringify(pagesContents))

    return pagesContents
}

(async () => {
    const baseURL = "https://wiki.facepunch.com"
    const api = new ApiInterface(baseURL)
    const scraper = new WikiScraper()

    console.log(chalk.green("Building categories..."))

    const baseDir = "./public/categories"
    await fs.mkdir(baseDir, { recursive: true })
    await fs.mkdir(`${baseDir}/manifests`, { recursive: true })
    await fs.mkdir(`${baseDir}/contents`, { recursive: true })
    await fs.mkdir(`${baseDir}/parsed`, { recursive: true })

    const globals = await buildCategory(api, "Global")
    const parsedGlobals = globals.map((page: any) => {
        const content = page.markup

        if (!scraper.isFunctionPage(content)) {
            console.log(chalk.red(`Page ${page.title} is not a function page`))
            console.log(content)
            return
        }

        return scraper.parseFunctionPage(content)
    })
    await fs.writeFile(`${baseDir}/parsed/global-functions.json`, JSON.stringify(parsedGlobals))

    const classfuncs = await buildCategory(api, "classfunc")
    const parsedClassfuncs = scraper.buildClasses(classfuncs)
    await fs.writeFile(`${baseDir}/parsed/classes.json`, JSON.stringify(parsedClassfuncs))

    const libraryfuncs = await buildCategory(api, "libraryfunc")
    const parsedLibraryfuncs = scraper.buildClasses(libraryfuncs)
    await fs.writeFile(`${baseDir}/parsed/libraries.json`, JSON.stringify(parsedLibraryfuncs))

    const hooks = await buildCategory(api, "hook", ".*:")
    const parsedHooks = scraper.buildClasses(hooks)
    await fs.writeFile(`${baseDir}/parsed/hooks.json`, JSON.stringify(parsedHooks))

    const panelfuncs = await buildCategory(api, "panelfunc")
    const parsedPanelfuncs = scraper.buildClasses(panelfuncs)
    await fs.writeFile(`${baseDir}/parsed/panels.json`, JSON.stringify(parsedPanelfuncs))

    const enums = await buildCategory(api, "enum")
    const parsedEnums = enums.map((page: any) => {
        const content = page.markup

        if (!scraper.isEnumPage(content)) {
            console.log(chalk.red(`Page ${page.title} is not an enum page`))
            console.log(content)
            return
        }

        return { ...scraper.parseEnumPage(content), name: page.title }
    })
    await fs.writeFile(`${baseDir}/parsed/enums.json`, JSON.stringify(parsedEnums))

    const structs = await buildCategory(api, "struct")
    const parsedStructs = structs.map((page: any) => {
        const content = page.markup

        if (!scraper.isStructPage(content)) {
            console.log(chalk.red(`Page ${page.title} is not a struct page`))
            console.log(content)
            return
        }

        return { ...scraper.parseStructPage(content), name: page.title }
    })
    await fs.writeFile(`${baseDir}/parsed/structs.json`, JSON.stringify(parsedStructs))
})()
