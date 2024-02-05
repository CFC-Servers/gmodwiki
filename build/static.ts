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
            return this.cache.get(resolvedUrl)!
        }

        const urlPath = new URL(resolvedUrl).pathname;
        const directoryStructure = path.dirname(urlPath)
        const fullPath = `public/${directoryStructure}`

        const fileName = path.basename(resolvedUrl).split('?')[0]
        const filePath = path.join(fullPath, fileName);
        const newURL = `/${filePath}`.replace("public/", "")

        if (await fileExists(filePath)) {
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
        const elements = $('img[src], link[href], script[src]')

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i]

            const $el = $(element)
            const url = $el.attr('src') || $el.attr('href')
            if (!url) continue

            const resolvedUrl = this.resolveUrl(url)
            const newURL = await this.downloadContent(resolvedUrl)
            if (!newURL) continue

            const attr = $el.is('link') ? 'href' : 'src'
            $el.attr(attr, newURL)
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

            modifiedContent = modifiedContent.replace(url, newURL)
        }

        return modifiedContent
    }

    public async processContent(content: string, isCss: boolean = false): Promise<string> {
        return isCss ? this.processCss(content) : this.processHtml(content)
    }
}

export default StaticContentHandler
