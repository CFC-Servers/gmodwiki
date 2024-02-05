// Finds, acquires, writes, and stubs any static content found in a given html file
import path from "path"
import * as cheerio from "cheerio"
import { promises as fs } from "fs"
import type ApiInterface from "./api_interface.js"

async function fileExists(path: string) {
    try {
        await fs.access(path)
        return true
    } catch {
        return false
    }
}

const fileWhitelist = new Map([
    [".png", true],
    [".jpg", true],
    [".svg", true],
    [".jpeg", true],
    [".gif", true],
    [".ico", true],
    [".css", true],
    [".js", true],
    [".woff", true],
    [".woff2", true],
    [".ttf", true],
    [".eot", true],
    [".otf", true],
])

const hostWhitelist = new Map([
    ["files.facepunch.com", true],
    ["wiki.facepunch.com", true],
])

class StaticContentHandler {
    private host: string
    private api: ApiInterface
    private cache: Map<string, string>

    constructor(host: string, api: ApiInterface) {
        this.host = host
        this.api = api
        this.cache = new Map()
    }

    private async downloadContent(url: string): Promise<string> {
        const resolvedUrl = this.resolveUrl(url)

        if (this.cache.has(resolvedUrl)) {
            const cached = this.cache.get(resolvedUrl)
            if (cached) return cached
        }

        const urlPath = new URL(resolvedUrl).pathname;
        const directoryStructure = path.dirname(urlPath)
        const fullPath = `public/${directoryStructure}`

        const fileName = path.basename(resolvedUrl).split('?')[0]
        const fileExtension = path.extname(fileName).toLowerCase()
        const filePath = path.join(fullPath, fileName);
        const newURL = `/${filePath}`.replaceAll("public/", "")

        if (fileExtension !== ".css" && await fileExists(filePath)) {
            this.cache.set(resolvedUrl, newURL)
            return newURL;
        }

        await fs.mkdir(fullPath, { recursive: true })

        const data = await this.api.getRawFull(resolvedUrl)
        await fs.writeFile(filePath, data)

        this.cache.set(resolvedUrl, newURL)
        return newURL
    }

    private resolveUrl(url: string): string {
        if (url.startsWith('//')) {
            return `https:${url}`
        } else if (url.startsWith('/')) {
            return `${this.host}${url}`
        } else if (url.startsWith('../../')) {
            return `${this.host}/${url}`
        }
        return url
    }

    private async processHtml(content: string): Promise<string> {
        const $ = cheerio.load(content)
        const elements = $("img[src], link[href], script[src], a[href]")

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i]

            const $el = $(element)
            const url = $el.attr("src") || $el.attr("href")
            if (!url) continue

            const extension = path.extname(url.split('?')[0]).toLowerCase()
            if (!fileWhitelist.has(extension)) continue

            const resolvedUrl = this.resolveUrl(url)

            const host = new URL(resolvedUrl).hostname
            if (!hostWhitelist.has(host)) continue

            const newURL = await this.downloadContent(resolvedUrl)
            if (!newURL) continue

            if ($el.attr("src") !== undefined) {
                $el.attr("src", newURL)
            }
            if ($el.attr("href") !== undefined) {
                $el.attr("href", newURL)
            }
        }

        return $.html()
    }

    private async processCss(content: string): Promise<string> {
        const urlRegex = /url\((?!['"]?:)['"]?([^'")]*)['"]?\)/g
        let modifiedContent = content

        let match;
        while ((match = urlRegex.exec(content)) !== null) {
            const url = match[1]
            if (!url) continue

            const resolvedUrl = this.resolveUrl(url);
            const newURL = await this.downloadContent(resolvedUrl)
            if (!newURL) continue

            modifiedContent = modifiedContent.replaceAll(url, newURL)
        }

        return modifiedContent
    }

    public async processContent(content: string, isCss: boolean = false): Promise<string> {
        return isCss ? this.processCss(content) : this.processHtml(content)
    }
}

export default StaticContentHandler
