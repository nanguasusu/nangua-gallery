import {
  bytesToBase64Url,
  base64UrlToBytes,
  hmacSha256,
  timingSafeEqualBytes,
} from "./crypto"

export const SESSION_COOKIE = "nangua_session"
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

interface SessionPayload {
  u: string
  exp: number
}

function encodePayload(payload: SessionPayload): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
}

export async function createSessionToken(
  secret: string,
  username: string,
): Promise<string> {
  const payload = encodePayload({
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  })
  const signature = bytesToBase64Url(await hmacSha256(secret, payload))
  return `${payload}.${signature}`
}

export async function readSessionToken(
  secret: string,
  token: string,
): Promise<SessionPayload | null> {
  const separator = token.lastIndexOf(".")
  if (separator <= 0) {
    return null
  }

  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  const expected = await hmacSha256(secret, payload)
  const actual = base64UrlToBytes(signature)
  if (!actual || !timingSafeEqualBytes(expected, actual)) {
    return null
  }

  const payloadBytes = base64UrlToBytes(payload)
  if (!payloadBytes) {
    return null
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(payloadBytes)) as SessionPayload
    if (typeof parsed.u !== "string" || typeof parsed.exp !== "number") {
      return null
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
