const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz"

export const SHORT_ID_LENGTH = 8
export const SHORT_ID_PATTERN = /^[2-9A-HJ-NP-Za-km-np-z]{8}$/

export function newShortId(length = SHORT_ID_LENGTH): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let result = ""
  for (const byte of bytes) {
  const char = ALPHABET[byte % ALPHABET.length]
  result += char ?? "2"
  }
  return result
}

export function isShortId(value: string): boolean {
  return SHORT_ID_PATTERN.test(value)
}
