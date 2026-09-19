export function shortLink(shortId: string): string {
  return `${window.location.origin}/s/${shortId}`
}
