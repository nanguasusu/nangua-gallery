export function formatPlainUrls(urls: string[]): string {
  return urls.join("\n")
}

export function formatMarkdown(urls: string[]): string {
  return urls.map((url) => `![](${url})`).join("\n\n")
}

export function formatHtml(urls: string[]): string {
  return urls.map((url) => `<img src="${url}" loading="lazy" />`).join("\n")
}
