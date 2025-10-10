import { promises as fs } from "fs";

export interface Page {
  title: string;
  description: string;
  tags: string;
  address: string;
  html: string;
  footer: string;
}

export class PagesAPI {
  private pagesByTag: Map<string, Page[]> = new Map();

  getTagArray(tag: string): Page[] {
    if (this.pagesByTag.has(tag)) {
      const arr = this.pagesByTag.get(tag) as Page[];
      return arr;
    } else {
      const arr: Page[] = [];
      this.pagesByTag.set(tag, arr);

      return arr;
    }
  }

  addPage(page: Page) {
    let tags = page.tags.split(" ");
    if (tags.length === 0) {
      tags = ["untagged"];
    }

    for (const tag of tags) {
      const arr = this.getTagArray(tag);
      arr.push(page);
    }
  }

  async save() {
    const allPages = Array.from(this.pagesByTag.values()).flat();
    await fs.writeFile(
      "./public/content/pages/tag-all.json",
      JSON.stringify(allPages),
    );

    for (const [tag, pages] of this.pagesByTag) {
      const destination = `./public/content/pages/tag-${tag}.json`;
      await fs.writeFile(destination, JSON.stringify(pages));
    }
  }
}
