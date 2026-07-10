/**
 * Convert a page's rendered HTML into clean text for `get_page`. The HTML
 * already carries everything an LLM needs (signature, typed args, returns,
 * example code) — it just needs readable spacing, so we turn block-level
 * boundaries into newlines before stripping tags. No DOM deps, so it bundles
 * safely into the Cloudflare Worker.
 */
export function pageToContent(html: string): string {
  return (html || "")
    .replace(/<\/(p|div|h[1-6]|li|tr|pre|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    // Decode the entities that appear in signatures/code examples — otherwise the
    // LLM sees `&amp;`/`&quot;` instead of `&`/`"`. (&amp; last to avoid re-decoding.)
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&#x27;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/[^\S\n]+/g, " ") // collapse spaces/tabs, keep newlines
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
