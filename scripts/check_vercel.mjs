// End-to-end check of the deployed Vercel frontend against the deployed Space.
// Run: node data/check_vercel.mjs [base-url]
const BASE = process.argv[2] || 'https://birdwalk-three.vercel.app';
const clip = new URL('../data/samples/WC_Indian_robin_call_and_song_recorded_in_February_2022_at_Hari.wav', import.meta.url);

const show = (label, status, body) => console.log(`${label}: ${status} ${JSON.stringify(body ?? null).slice(0, 160)}`);

const get = async (p) => {
  const r = await fetch(BASE + p);
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 60); }
  return { status: r.status, body };
};

const samplesRes = await get('/api/samples');
show('GET /api/samples', samplesRes.status, samplesRes.body);
const sampleCount = (samplesRes.body.samples ?? []).length;
const healthRes = await get('/api/health');
show('GET /api/health', healthRes.status, healthRes.body);

for (const p of ['/api/model-info', '/api/india-species?q=bulbul']) {
  const r = await get(p);
  show('GET ' + p, r.status, r.body);
  if (typeof r.body !== 'object') throw new Error('not JSON: ' + p);
}

const miss = await get('/api/definitely-not-a-route');
show('GET /api/definitely-not-a-route', miss.status, miss.body);
if (miss.status !== 404) throw new Error('unknown route should 404');

const mission = await fetch(`${BASE}/api/mission`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ top_species: 'Indian Robin', model_score: 0.91 }),
});
show('POST /api/mission', mission.status, (await mission.json()).mission?.title);

const buf = new Uint8Array(await (await import('node:fs/promises')).readFile(clip));
const form = new FormData();
form.append('file', new Blob([buf], { type: 'audio/wav' }), 'robin.wav');
form.append('source_label', 'Indian Robin');
console.log(`POST /api/analyze (${buf.length} bytes) ... this can take a while on a cold Space`);
const ans = await fetch(`${BASE}/api/analyze`, { method: 'POST', body: form });
const json = await ans.json();
show('POST /api/analyze', ans.status, json.status || json.detail);
for (const p of (json.predictions || []).slice(0, 3)) console.log(`    ${p.species_common_name} — ${p.model_score}`);
if (ans.status !== 200 || !json.predictions) throw new Error('analysis failed through the proxy');

// The "try a sample" entry point the UI actually uses: server-side sample id.
if (sampleCount > 0) {
  const id = samplesRes.body.samples[0].id;
  const s = await fetch(`${BASE}/api/analyze?sample_id=${encodeURIComponent(id)}`, { method: 'POST' });
  const sj = await s.json();
  show(`POST /api/analyze?sample_id=${id.slice(0, 24)}...`, s.status, sj.status || sj.detail);
  for (const p of (sj.predictions || []).slice(0, 2)) console.log(`    ${p.species_common_name} — ${p.model_score}`);
  if (s.status !== 200 || !sj.predictions) throw new Error('sample analysis failed through the proxy');
} else {
  console.log('SKIP sample analysis: the Space served no samples');
}
console.log('\nFRONTEND -> SPACE OK');
