/** Small, safe XML helpers shared by the allowlisted RSS parsers. */

export function parseXmlDocument(xml: string): Document | null {
  if (typeof DOMParser === "undefined") return null;
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) return null;
    return doc;
  } catch {
    return null;
  }
}

export function getFeedItems(doc: Document): Element[] {
  const items = Array.from(doc.getElementsByTagName("item"));
  if (items.length > 0) return items;
  return Array.from(doc.getElementsByTagName("entry"));
}

export function getFeedText(parent: Element, tagName: string): string {
  const direct = parent.getElementsByTagName(tagName)[0];
  if (direct) return direct.textContent?.trim() ?? "";
  const byNamespace = parent.getElementsByTagNameNS("*", tagName)[0];
  return byNamespace?.textContent?.trim() ?? "";
}

export function getFeedLink(item: Element): string {
  const links = Array.from(item.getElementsByTagName("link"));
  for (const link of links) {
    const href = link.getAttribute("href");
    if (!href) continue;
    const rel = link.getAttribute("rel");
    if (rel === "alternate" || rel === null) return href;
  }
  for (const link of links) {
    const href = link.getAttribute("href");
    if (href) return href;
  }
  return getFeedText(item, "link") || getFeedText(item, "guid");
}

export function parseFeedDate(raw: string): string | null {
  if (!raw) return null;
  const timestamp = Date.parse(raw.trim());
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}
