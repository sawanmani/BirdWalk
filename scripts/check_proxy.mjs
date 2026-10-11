// Checks the Vercel /api proxy (frontend/api/[...all].ts) without deploying.
//
// Node strips the file's TypeScript types on import, so the helpers and the
// handler under test are the real deployed ones, not a copy. Two layers:
//
//   node scripts/check_proxy.mjs            # multipart/base64 unit checks
//   BIRDWALK_SPACE=https://adarshmani-birdwalk.hf.space \
//     node scripts/check_proxy.mjs          # + every route against the live Space
//
// The live layer matters: it is what caught the wrong Gradio REST prefix
// (`/gradio_api/call/...`, not `/call/...`) that a deployment cannot see until
// it returns 405 for every call.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const proxy = await import(pathToFileURL(path.join(root, 'frontend/api/[...all].ts')).href)
const { parseMultipart, toBase64 } = proxy

const CLIP = path.join(root, 'data/samples',
  'WC_Indian_robin_call_and_song_recorded_in_February_2022_at_Hari.wav')
const BOUNDARY = '----TestBoundary12345678901234567890'

// --- helpers --------------------------------------------------------------

function multipartBody(clip, filename = 'robin.wav', fieldName = 'file') {
  const enc = (s) => Buffer.from(s, 'utf8')
  return Buffer.concat([
    enc(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: audio/wav\r\n\r\n`),
    clip,
    enc(`\r\n--${BOUNDARY}\r\nContent-Disposition: form-data; name="source_label"\r\n\r\nIndian Robin\r\n--${BOUNDARY}--\r\n`),
  ])
}

function check(label, fn) {
  try {
    fn()
    console.log(`  ok   ${label}`)
  } catch (e) {
    console.error(`  FAIL ${label}: ${e.message}`)
    process.exitCode = 1
  }
}

const clip = await readFile(CLIP)
const body = multipartBody(clip)
const form = parseMultipart(new Uint8Array(body), `multipart/form-data; boundary=${BOUNDARY}`)

console.log('parseMultipart / toBase64')
check('audio part is found with its filename', () => {
  if (!form.file) throw new Error('no file part parsed')
  if (form.file.filename !== 'robin.wav') throw new Error(`filename ${form.file.filename}`)
})
check('audio bytes survive byte-for-byte', () => {
  if (Buffer.compare(Buffer.from(form.file.bytes), clip) !== 0) {
    throw new Error(`${form.file.bytes.length} bytes vs ${clip.length}`)
  }
})
check('text fields are decoded', () => {
  if (form.fields.source_label !== 'Indian Robin') throw new Error(JSON.stringify(form.fields))
})
check('base64 matches Node for the clip and for a chunk-boundary size', () => {
  if (toBase64(new Uint8Array(form.file.bytes)) !== clip.toString('base64')) throw new Error('clip')
  const big = Buffer.alloc(100000, 7) // > 0x8000, exercises the chunked loop
  if (toBase64(new Uint8Array(big)) !== big.toString('base64')) throw new Error('chunking')
})
check('a body with no file part yields no file', () => {
  const none = parseMultipart(
    new Uint8Array(Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="a"\r\n\r\nb\r\n--${BOUNDARY}--\r\n`)),
    `multipart/form-data; boundary=${BOUNDARY}`,
  )
  if (none.file) throw new Error('phantom file part')
})

// --- the live route table (only when a Space is configured) --------------

const SPACE = (process.env.BIRDWALK_SPACE ?? '').replace(/\/+$/, '')
if (!SPACE) {
  console.log('\nskipped the route checks: set BIRDWALK_SPACE to run them')
  process.exit(process.exitCode ?? 0)
}

const makeRes = () => {
  const out = { code: 0, body: '' }
  const res = {
    status: (n) => ((out.code = n), res),
    setHeader: () => res,
    end: (s) => ((out.body = s), res),
  }
  return { res, out }
}

async function call(req) {
  const { res, out } = makeRes()
  await proxy.default(req, res)
  let parsed = out.body
  try { parsed = JSON.parse(out.body) } catch { /* keep raw */ }
  return { code: out.code, body: parsed }
}

const stream = (chunks) => ({ [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c } })

console.log(`routes against ${SPACE}`)
const expect = async (label, req, code, predicate) => {
  const r = await call(req)
  check(label, () => {
    if (r.code !== code) throw new Error(`HTTP ${r.code}: ${JSON.stringify(r.body).slice(0, 120)}`)
    if (predicate) predicate(r.body)
  })
}

const topOf = (b) => `${b.predictions[0].species_common_name} ${b.predictions[0].model_score}`

await expect('GET  /api/health', { url: '/api/health', method: 'GET', query: { all: ['health'] }, headers: {} }, 200,
  (b) => { if (!b.status) throw new Error('no status field') })
await expect('GET  /api/health (empty catch-all)', { url: '/api/health', method: 'GET', query: { all: [] }, headers: {} }, 200)
await expect('GET  /api/samples', { url: '/api/samples', method: 'GET', query: { all: ['samples'] }, headers: {} }, 200,
  (b) => { if (!b.samples?.length) throw new Error('the Space served no samples') })
await expect('GET  /api/india-species?q=bulbul', { url: '/api/india-species?q=bulbul', method: 'GET', query: { all: ['india-species'] }, headers: {} }, 200,
  (b) => { if (!b.available) throw new Error('species list unavailable') })
await expect('POST /api/mission', {
  url: '/api/mission', method: 'POST', query: { all: ['mission'] }, headers: {},
  ...stream([new TextEncoder().encode(JSON.stringify({ top_species: 'Indian Robin', model_score: 0.91 }))]),
}, 200, (b) => { if (!b.mission?.title) throw new Error('no mission title') })
await expect('POST /api/analyze (multipart)', {
  url: '/api/analyze', method: 'POST', query: { all: ['analyze'] },
  headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
  ...stream([new Uint8Array(body)]),
}, 200, (b) => {
  if (!b.predictions?.length) throw new Error('no predictions')
  console.log(`       -> ${topOf(b)}`)
  if (b.predictions[0].species_common_name !== 'Indian Robin') throw new Error(`top match ${topOf(b)}`)
})
await expect('POST /api/analyze?sample_id=...', {
  url: `/api/analyze?sample_id=${encodeURIComponent(path.basename(CLIP))}`, method: 'POST',
  query: { all: ['analyze'] }, headers: {}, ...stream([new Uint8Array(0)]),
}, 200, (b) => { if (!b.predictions?.length) throw new Error('no predictions') })
await expect('POST /api/analyze (bad extension -> 415)', {
  url: '/api/analyze', method: 'POST', query: { all: ['analyze'] },
  headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
  ...stream([multipartBody(Buffer.from('not audio'), 'notes.txt')]),
}, 415)
await expect('GET  /api/nope-route -> 404', { url: '/api/nope-route?x=1', method: 'GET', query: {}, headers: {} }, 404)

// A visitor must get an actionable answer, not a raw 502, when the free Space
// is asleep: an unreachable host has to produce the 503 "waking up" shape.
const saved = process.env.BIRDWALK_SPACE
process.env.BIRDWALK_SPACE = 'https://no-such-space.invalid'
const down = await call({ url: '/api/health', method: 'GET', query: { all: ['health'] }, headers: {} })
process.env.BIRDWALK_SPACE = saved
check('unreachable Space answers 503 with a "waking up" instruction', () => {
  if (down.code !== 503) throw new Error(`HTTP ${down.code}: ${JSON.stringify(down.body)}`)
  if (!/waking up/i.test(down.body.detail ?? '')) throw new Error(`detail: ${down.body.detail}`)
  if (!/try again/i.test(down.body.detail)) throw new Error('no retry instruction')
})

if (!process.exitCode) console.log('\nPROXY CHECK OK')
else console.error('\nPROXY CHECK FAILED')
