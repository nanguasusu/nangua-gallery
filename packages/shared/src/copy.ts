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

export function formatHtml(urls: string[], options: { width?: number } = {}): string {
  const width = normalizeHtmlCopyWidth(options.width)
  return urls
    .map(
      (url) =>
        `<center><img style="width:${width}px" src="${url}" loading="lazy" /></center>`,
    )
    .join("\n")
}
