export const DEFAULT_HTML_COPY_WIDTH = 400
export const MIN_HTML_COPY_WIDTH = 100
export const MAX_HTML_COPY_WIDTH = 2000

export function normalizeHtmlCopyWidth(value?: number): number {
  const width = Number(value)
  if (
    Number.isInteger(width) &&
    width >= MIN_HTML_COPY_WIDTH &&
    width <= MAX_HTML_COPY_WIDTH
  ) {
    return width
  }
  return DEFAULT_HTML_COPY_WIDTH
}

export function formatPlainUrls(urls: string[]): string {
  return urls.join("\n")
}

export function formatMarkdown(urls: string[]): string {
  return urls.map((url) => `![](${url})`).join("\n\n")
}

export function formatHtml(
  urls: string[],
  options: { width?: number; titles?: Array<string | null | undefined> } = {},
): string {
  const width = normalizeHtmlCopyWidth(options.width)
  return urls
    .map((url, index) => {
      const title = sanitizeCopyTitle(options.titles?.[index])
      const img = title
        ? `<img style="width:${width}px" src="${url}" alt="${title}" title="${title}" loading="lazy" />`
        : `<img style="width:${width}px" src="${url}" loading="lazy" />`
      if (!title) {
        return `<center>${img}</center>`
      }
      return `<center>${img}<p style="margin:8px 0 0;text-align:center">${title}</p></center>`
    })
    .join("\n")
}

export function copyTitleFromFilename(filename: string | undefined): string {
  const raw = filename?.trim() ?? ""
  const base = raw.split("/").at(-1) ?? raw
  if (!base) {
    return ""
  }
  const dot = base.lastIndexOf(".")
  return (dot > 0 ? base.slice(0, dot) : base).trim()
}

function sanitizeCopyTitle(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) {
    return ""
  }
  return trimmed
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
