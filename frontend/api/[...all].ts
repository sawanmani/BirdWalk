// Same-origin /api/* proxy for the BirdWalk Space backend.
//
// Why this exists: Hugging Face ZeroGPU will not let a Space bind its own port,
// so the FastAPI app cannot be reached directly at /api/*. The Space runs those
// exact handlers in process behind one Gradio endpoint (/call/rpc), and this
// function translates Vercel's /api/* routes into calls to it.
//
// Effect for the frontend: none. src/lib/api.ts keeps calling same-origin
// /api/... paths and needs no VITE_API_BASE, and there is no browser CORS
// problem because the hop happens server-side.
//
// Deliberately avoids Node-only globals (`process`, `Buffer`) so that any
// TypeScript configuration can compile it: Vercel silently drops a function
// that fails its typecheck, which turns into a confusing 404 instead of an
// error. Required env var: BIRDWALK_SPACE.

export const config = { runtime: 'nodejs' }
export const maxDuration = 60

type Envelope = { status_code: number; body: string }

const spaceBase = (): string => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return (env?.BIRDWALK_SPACE ?? '').replace(/\/+$/, '')
}

/** Detail-only failure, shaped like the backend's own error bodies. */
const fail = (status: number, detail: string): Envelope => ({
  status_code: status,
  body: JSON.stringify({ detail }),
})

// --- byte helpers ---------------------------------------------------------

function indexOfBytes(hay: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer
    }
    return i
  }
  return -1
}

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)))
  }
  return btoa(binary)
}

// --- multipart ------------------------------------------------------------

export type Multipart = {
  file?: { bytes: Uint8Array; filename: string }
  fields: Record<string, string>
}

/**
 * Minimal multipart/form-data reader.
 *
 * The browser posts the recorded WAV as `file` plus optional text fields, and
 * only the audio part may be forwarded as base64 - encoding the whole body
 * (boundaries and headers included) would make soundfile reject the clip.
 */
export function parseMultipart(body: Uint8Array, contentType: string): Multipart {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)
  if (!boundary) return { fields: {} }
  const delim = new TextEncoder().encode(`--${boundary[1] ?? boundary[2]}`)

  const out: Multipart = { fields: {} }
  let cursor = indexOfBytes(body, delim)
  while (cursor >= 0) {
    const next = indexOfBytes(body, delim, cursor + delim.length)
    if (next < 0) break
    const part = body.subarray(cursor + delim.length, next)
    cursor = next

    if (part[0] === 0x2d /* - */ && part[1] === 0x2d) break // closing "--"
    const head = part.indexOf(0x0d) >= 0 ? indexOfBytes(part, new TextEncoder().encode('\r\n\r\n')) : -1
    if (head < 0) continue

    const headers = new TextDecoder('utf-8').decode(part.subarray(0, head))
    let content = part.subarray(head + 4)
    if (content.length >= 2 && content[content.length - 2] === 0x0d && content[content.length - 1] === 0x0a) {
      content = content.subarray(0, content.length - 2) // strip trailing CRLF
    }

    const name = /name="([^"]*)"/i.exec(headers)?.[1] ?? ''
    const filename = /filename="([^"]*)"/i.exec(headers)?.[1]
    if (!name) continue
    if (filename) {
      out.file = { bytes: content, filename }
    } else {
      out.fields[name] = new TextDecoder('utf-8').decode(content)
    }
  }
  return out
}

// --- request plumbing ----------------------------------------------------

async function readBody(req: unknown): Promise<Uint8Array> {
  const parts: Uint8Array[] = []
  const stream = req as AsyncIterable<Uint8Array>
  for await (const chunk of stream) parts.push(chunk)
  const total = parts.reduce((n, p) => n + p.length, 0)
  const all = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    all.set(p, offset)
    offset += p.length
  }
  return all
}

// --- the Gradio REST handshake ------------------------------------------

/**
 * The REST prefix is not fixed: Gradio 6 serves `/gradio_api/call/<fn>` while
 * older releases used `/call/<fn>`. It is read from /config once per warm
 * function instance, because calling the wrong path fails with a misleading
 * "405 Method Not Allowed" from the SPA fallback rather than a 404.
 */
let prefixCache: string | null = null

async function apiPrefix(base: string): Promise<string> {
  if (prefixCache) return prefixCache
  const cfg = await fetch(`${base}/config`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}))
  prefixCache = (cfg as { api_prefix?: string }).api_prefix || '/gradio_api'
  return prefixCache
}

type SseMessage = { data?: unknown; output?: { data?: unknown }; error?: string }

/**
 * Free ZeroGPU hardware sleeps after two idle days, so the first visitor of
 * the day cannot get an answer: the Space needs a minute or more to import
 * TensorFlow and fetch its weights. A call that fails is therefore turned into
 * an actionable 503, and the Space is requested first so the wake-up starts
 * immediately instead of waiting for the visitor's retry.
 */
const WAKING =
  'The demo server is waking up (the free Hugging Face hardware sleeps when idle). It has been nudged — try again in about a minute.'

async function nudge(base: string): Promise<void> {
  await fetch(base, { method: 'GET' }).catch(() => undefined)
}

async function rpc(route: string, payload: unknown): Promise<Envelope> {
  const base = spaceBase()
  if (!base) {
    return fail(500, 'BIRDWALK_SPACE is not configured on this deployment.')
  }

  const rpcUrl = async () => `${base}${await apiPrefix(base)}/call/rpc`
  const send = async () => {
    const start = await fetch(await rpcUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [route, JSON.stringify(payload ?? {})] }),
    })
    if (!start.ok) {
      const text = await start.text().catch(() => '')
      throw new Error(`Space refused the call (HTTP ${start.status}). ${text.slice(0, 180)}`)
    }
    return (await start.json()) as { event_id?: string }
  }

  let eventId: string | undefined
  try {
    eventId = (await send()).event_id
  } catch {
    // A stale cached prefix (Gradio upgrade, or a Space that predates it) is
    // worth one retry after re-reading /config; anything else is fatal.
    prefixCache = null
    try {
      eventId = (await send()).event_id
    } catch (e2) {
      await nudge(base)
      return fail(503, `${WAKING} (${String(e2).slice(0, 120)})`)
    }
  }
  if (!eventId) {
    await nudge(base)
    return fail(503, `${WAKING} (the Space accepted no call.)`)
  }

  // The real result arrives on an SSE stream keyed by that event id.
  const stream = await fetch(`${await rpcUrl()}/${eventId}`, {
    headers: { Accept: 'text/event-stream' },
  }).catch(() => null)
  if (!stream || !stream.ok) {
    await nudge(base)
    return fail(503, `${WAKING} (result stream HTTP ${stream ? stream.status : 'unreachable'}).`)
  }

  const text = await stream.text()
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue
    let msg: SseMessage | unknown[] | null
    try {
      msg = JSON.parse(line.slice(5).trim())
    } catch {
      continue // "data: null" and heartbeat lines
    }
    if (Array.isArray(msg)) {
      // Gradio 6 posts the output list directly for a single-output event.
      if (typeof msg[0] === 'string') return parseEnvelope(msg[0])
      continue
    }
    if (msg && typeof msg === 'object') {
      if (msg.error) return fail(502, msg.error)
      const arr = msg.output?.data ?? msg.data
      if (Array.isArray(arr) && typeof arr[0] === 'string') return parseEnvelope(arr[0])
    }
  }
  await nudge(base)
  return fail(503, `${WAKING} (the Space closed the stream before answering.)`)
}

function parseEnvelope(raw: string): Envelope {
  try {
    return JSON.parse(raw) as Envelope
  } catch {
    return fail(502, 'Space returned a malformed envelope.')
  }
}

// --- handler -------------------------------------------------------------

type Res = {
  status: (n: number) => Res
  setHeader: (k: string, v: string) => void
  end: (s: string) => void
}

/**
 * Route name behind /api/, without the query string.
 *
 * Vercel's catch-all is documented to surface its path segments as
 * `query.all`, but on the current runtime that arrives empty, so the pathname
 * is the fallback. Both forms are accepted because the prefix may already have
 * been stripped by the platform.
 */
function routeOf(request: { url?: string; query?: { all?: string[] } }): string {
  const segments = request.query?.all
  if (Array.isArray(segments) && segments.length > 0) return segments.join('/')
  const path = new URL(request.url ?? '/', 'http://localhost').pathname
  return path.replace(/^\/+/, '').replace(/^api\/+/, '').replace(/\/+$/, '')
}

export default async function handler(req: unknown, res: Res) {
  const request = req as {
    url?: string
    method?: string
    query?: { all?: string[] }
    headers?: Record<string, string | string[] | undefined>
  }
  const route = routeOf(request)
  const url = new URL(request.url ?? '/', 'http://localhost')

  const send = (env: Envelope) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'application/json')
    res.status(env.status_code).end(env.body)
  }

  switch (route) {
    case 'health':
      return send(await rpc('health', {}))
    case 'model-info':
      return send(await rpc('model_info', {}))
    case 'samples':
      return send(await rpc('samples', {}))
    case 'india-species': {
      const q = url.searchParams.get('q')
      return send(await rpc('india_species', q ? { q } : {}))
    }
    case 'mission': {
      const text = new TextDecoder('utf-8').decode(await readBody(req))
      let payload: unknown
      try {
        payload = text ? JSON.parse(text) : {}
      } catch {
        return send(fail(400, 'Mission payload must be JSON.'))
      }
      return send(await rpc('mission', payload))
    }
    case 'analyze': {
      const sampleId = url.searchParams.get('sample_id')
      if (sampleId) {
        return send(await rpc('analyze_sample', { sample_id: sampleId }))
      }
      const raw = await readBody(req)
      const header = request.headers?.['content-type']
      const contentType = Array.isArray(header) ? header[0] : (header ?? '')
      const form = parseMultipart(raw, contentType)
      if (!form.file || form.file.bytes.length === 0) {
        return send(fail(400, 'No audio file in the request.'))
      }
      return send(
        await rpc('analyze', {
          name: form.file.filename || 'clip.wav',
          b64: toBase64(form.file.bytes),
          ...(form.fields.source_label ? { source_label: form.fields.source_label } : {}),
        }),
      )
    }
    default:
      return send(fail(404, `Unknown API route '/api/${route}'.`))
  }
}
