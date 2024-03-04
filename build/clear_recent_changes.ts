import * as chrono from 'chrono-node'
import * as cheerio from "cheerio"
import { promises as fs } from "fs"
import ApiInterface from "./modules/api_interface.js"

const getLastBuildTime = async () => {
  const lastBuildTime = await fs.readFile("build/cache/last_build.txt", "utf8")
  return new Date(lastBuildTime)
}

const getURLFromRow = ($: cheerio.CheerioAPI, row: cheerio.Element) => {
  return $(row).find("div.address a").attr("href")
}

const getChangedPages = async ($: cheerio.CheerioAPI, since: Date) => {
  const changedPages = new Map<string, boolean>()

  const holder = $("table.changelist tbody")
  const rows = holder.find("tr")

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowClass = row.attribs.class

    if (rowClass === "grouphead") {
      // If we're at a grouphead, check if we've passed our time
      const groupTime = $(row).find("td").text()
      const parsedTime = chrono.parseDate(groupTime)

      if (parsedTime && parsedTime < since) {
        console.log("Breaking, passed our time", groupTime)
        break
      }

    } else if (rowClass === "entry") {
      // If we're at an entry, add it to our list
      const url = getURLFromRow($, row)

      if (url) {
        changedPages.set(url, true)
      } else {
        console.error("No url found", $(row).html())
      }
    }
  }

  return Array.from(changedPages.keys())
}

const urlPathToFile = (url: string) => {
  return `./build/cache${url}.json`
}

const convertURLsToFiles = (urls: string[]) => {
  return urls.map(urlPathToFile)
}

const fileExists = async (path: string) => {
    try {
        await fs.access(path)
        return true
    } catch {
        return false
    }
}

const deleteFiles = async (files: string[]) => {
  let successful = 0

  for (const filePath of files) {
    if (!await fileExists(filePath)) {
      continue
    }

    try {
      await fs.unlink(filePath)
      console.log("Deleted", filePath)
      successful++
    } catch (e) {
      console.error(e)
    }
  }

  return successful
}

(async () => {
  const api = new ApiInterface("https://wiki.facepunch.com")

  const rawPage = await api.get("/gmod/~recentchanges")
  const $ = cheerio.load(rawPage)

  const lastBuildTime = await getLastBuildTime()

  const changes = await getChangedPages($, lastBuildTime)
  const changedPaths = convertURLsToFiles(changes)
  
  const deletedCount = await deleteFiles(changedPaths)
  console.log("Deleted", deletedCount, "cached files that were changed since", lastBuildTime)
})()
