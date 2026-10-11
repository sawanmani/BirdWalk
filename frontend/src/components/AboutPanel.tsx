import { useState, useEffect } from 'react'
import { ShieldCheck, Cpu, Leaf, Search } from 'lucide-react'
import { Button, Kicker, StatusBanner } from './ui.tsx'
import { backendRunsOnThisMachine, fetchIndiaSpecies, fetchModelInfo } from '../lib/api.ts'
import type { IndiaSpeciesResponse, ModelInfo, SampleEntry } from '../lib/types.ts'

// The deployed build runs the model on a hosted demo Space, so the two
// local-first claims have to change; everything else here is mode-independent.
const LOCAL = backendRunsOnThisMachine()

export function AboutPanel({
  samples,
  onClose,
}: {
  samples: SampleEntry[]
  onClose: () => void
}) {
  const [model, setModel] = useState<ModelInfo | null>(null)
  const [modelError, setModelError] = useState(false)

  useEffect(() => {
    fetchModelInfo()
      .then(setModel)
      .catch(() => setModelError(true))
  }, [])

  return (
    <section
      className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6"
      aria-label="About open AI"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <Kicker>{LOCAL ? 'Why local & open' : 'Why open & honest'}</Kicker>
          <h2 className="mt-2 text-forest">
            Open innovation, in plain terms
          </h2>
        </div>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <InfoCard
          icon={<Cpu size={18} aria-hidden />}
          title={LOCAL ? 'Runs on your machine' : 'Runs on a demo server'}
          body={
            LOCAL
              ? 'Inference uses a pretrained model on the backend host. No recording is sent to a closed cloud AI API.'
              : 'Inference uses the open pretrained BirdNET model on this project’s own demo server. No recording is sent to a closed cloud AI API.'
          }
        />
        <InfoCard
          icon={<ShieldCheck size={18} aria-hidden />}
          title={LOCAL ? 'Your audio stays local' : 'Audio crosses the network'}
          body={
            LOCAL
              ? 'Uploads are processed in temporary files and deleted. No account, no database, no GPS in this MVP.'
              : 'Uploads reach the demo server over the network, are analysed in a temporary file and deleted. No account, no database, no GPS in this MVP.'
          }
        />
        <InfoCard
          icon={<Leaf size={18} aria-hidden />}
          title="Built to be left"
          body="The goal is the shortest part of the experience: one clue, one mission, then the screen goes quiet."
        />
      </div>

      <div className="card-field mt-6 px-6 py-5">
        <h3 className="font-display text-lg text-forest">Model &amp; licence</h3>
        {modelError && (
          <StatusBanner tone="warn">
            The backend service is not reachable, so live model details
            could not be loaded. The attribution below reflects the
            intended model route.
          </StatusBanner>
        )}
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Field k="Model" v={model?.model_name ?? 'BirdNET (v2.4 route)'} />
          <Field k="Version" v={model?.model_version ?? '—'} />
          <Field k="Source" v={model?.model_source ?? '—'} />
          <Field
            k="Weights licence"
            v={model?.model_license ?? 'CC BY-NC-SA 4.0 (non-commercial)'}
          />
          <Field k="Code licence" v={model?.code_license ?? 'MIT (Analyzer)'} />
          <Field
            k="Species classes"
            v={model ? String(model.label_count) : '—'}
          />
          <Field
            k={LOCAL ? 'Runs locally after setup' : 'Runs on the demo server'}
            v={model ? (LOCAL ? String(model.runs_locally_after_setup) : 'yes — no cloud AI API') : '—'}
          />
          <Field
            k="Airplane-mode tested"
            v={model ? (model.airplane_mode_verified ? 'Yes' : 'Not yet tested') : '—'}
          />
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          {model?.attribution ??
            'Powered by BirdNET — K. Lisa Yang Center for Conservation Bioacoustics, Cornell Lab of Ornithology & TU Chemnitz.'}{' '}
          BirdNET weights are licensed CC BY-NC-SA 4.0; this project uses
          them for non-commercial, educational demonstration. The model
          score is not accuracy and the class count is not accuracy.
        </p>
        <p className="mt-3 text-xs text-muted">
          {model?.offline_scope_note ??
            (LOCAL
              ? `"Offline" here is scoped: after the model and app assets are
                downloaded, inference and the mission flow run on this machine
                with no per-request network calls. A full airplane-mode
                (disconnected) end-to-end test has NOT been performed, and
                phone-native inference is not claimed.`
              : `This is the hosted demo: inference runs on the project's own
                demo server, with no call to a closed cloud inference API — but
                your recording or upload crosses the network to get there. This
                endpoint is not offline and does not run on your machine. A
                full airplane-mode (disconnected) end-to-end test has NOT been
                performed, and phone-native inference is not claimed.`)}
        </p>
      </div>

      <div className="card-field mt-6 px-6 py-5">
        <h3 className="font-display text-lg text-forest">
          Sample audio credits
        </h3>
        {samples.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            {LOCAL
              ? 'No sample recordings have been downloaded yet.'
              : 'No sample recordings are available from the demo server right now.'}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {samples.map((s) => (
              <li key={s.id} className="text-sm">
                <p className="font-semibold text-ink">{s.species_label}</p>
                <p className="text-xs text-muted">
                  {s.creator} ·{' '}
                  <a
                    href={s.source_page_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {s.license}
                  </a>{' '}
                  · downloaded {s.downloaded_at}
                </p>
                <p className="mt-0.5 text-xs text-muted">{s.attribution}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted">
          Online clips are metadata-based pipeline smoke tests. Any
          species label shown is the source's own claim, not
          independently verified ground truth, and is not a field test.
        </p>
      </div>

      <IndiaSpeciesSection />
    </section>
  )
}

function IndiaSpeciesSection() {
  const [query, setQuery] = useState('')
  const [data, setData] = useState<IndiaSpeciesResponse | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      fetchIndiaSpecies(query || undefined)
        .then((r) => {
          setData(r)
          setError(false)
        })
        .catch(() => setError(true))
    }, 200)
    return () => window.clearTimeout(t)
  }, [query])

  return (
    <div className="card-field mt-6 px-6 py-5">
      <h3 className="font-display text-lg text-forest">
        India shortlist — labels verified in the model
      </h3>
      <p className="mt-1 text-xs text-muted">
        A curated set of common Indian birds cross-checked against the
        model's own label list. Only names the model can actually output
        are shown. This is label-presence verification — not a claim that
        the model is India-specialised or more accurate here. No GPS is
        used.
      </p>
      <label className="mt-4 flex items-center gap-2 rounded-md border border-moss/30 bg-panel/80 px-3 py-2 focus-within:outline focus-within:outline-3 focus-within:outline-pine">
        <Search size={16} aria-hidden className="text-muted" />
        <span className="sr-only">Search the India shortlist</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. drongo, bulbul, kingfisher"
          className="w-full bg-transparent text-sm text-ink focus:outline-none"
        />
      </label>
      {error && (
        <p className="mt-3 text-sm text-danger">
          Shortlist could not be loaded (backend unavailable).
        </p>
      )}
      {data && data.available === false && (
        <p className="mt-3 text-sm text-muted">{data.note}</p>
      )}
      {data && data.available && data.species.length === 0 && (
        <p className="mt-3 text-sm text-muted">
          No name in the verified shortlist matches “{query}”.
        </p>
      )}
      {data && data.species.length > 0 && (
        <>
          <p className="mt-3 text-xs text-muted">
            {data.total_verified} verified in the model's label set ·
            showing {data.species.length}
          </p>
          <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {data.species.map((s) => (
              <li key={s.species_scientific_name} className="text-ink">
                {s.species_common_name}{' '}
                <span className="italic text-muted">
                  ({s.species_scientific_name})
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function InfoCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="card-field px-5 py-4">
      <span aria-hidden className="text-forest">
        {icon}
      </span>
      <p className="mt-2 font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  )
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
      <dd className="text-ink">{v}</dd>
    </div>
  )
}
