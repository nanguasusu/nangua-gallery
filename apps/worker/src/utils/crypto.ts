const encoder = new TextEncoder()

export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false
  }

  let difference = 0
  for (let index = 0; index < a.byteLength; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0)
  }

  return difference === 0
}

export async function hmacSha256(
  secret: string,
  value: string,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value))
  return new Uint8Array(signature)
}

export async function secretsEqual(
  secret: string,
  left: string,
  right: string,
): Promise<boolean> {
  const [leftMac, rightMac] = await Promise.all([
    hmacSha256(secret, left),
    hmacSha256(secret, right),
  ])

  return timingSafeEqualBytes(leftMac, rightMac)
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

export function base64UrlToBytes(value: string): Uint8Array | null {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/")
  const padLength = (4 - (padded.length % 4)) % 4
  try {
    const binary = atob(`${padded}${"=".repeat(padLength)}`)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return null
  }
}
