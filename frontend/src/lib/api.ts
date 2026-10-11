import type {
  AnalyzeResponse,
  IndiaSpeciesResponse,
  MissionResponse,
  ModelInfo,
  SampleEntry,
} from './types'

// All calls are same-origin (/api/...) and proxied to the local FastAPI
// backend in dev. No third-party endpoints exist in this app.

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 10_000,
): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(path, { ...init, signal: controller.signal })
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try {
        const body = await res.json()
        if (body?.error) detail = `${body.error} (${res.status})`
        else if (body?.detail) detail = String(body.detail)
      } catch {
        /* keep generic detail */
      }
      throw new ApiError(detail, res.status)
    }
    return (await res.json()) as T
  } finally {
    window.clearTimeout(timer)
  }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export interface HealthResult {
  status: string
  package_available?: boolean
  model_assets_available?: boolean
  model_ready: boolean
  model_loaded: boolean
  last_inference_error?: string | null
}

export const fetchHealth = () =>
  request<HealthResult>('/api/health', undefined, 5_000)

export const fetchModelInfo = () =>
  request<ModelInfo>('/api/model-info', undefined, 5_000)

export const fetchSamples = () =>
  request<{ samples: SampleEntry[] }>('/api/samples', undefined, 5_000)

export const fetchIndiaSpecies = (q?: string) =>
  request<IndiaSpeciesResponse>(
    `/api/india-species${q ? `?q=${encodeURIComponent(q)}` : ''}`,
    undefined,
    5_000,
  )

export async function analyzeSampleFile(
  sampleId: string,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  const controller = new AbortController()
  signal?.addEventListener('abort', () => controller.abort())
  const res = await fetch(
    `/api/analyze?sample_id=${encodeURIComponent(sampleId)}`,
    { method: 'POST', signal: controller.signal },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(String(body?.detail ?? `HTTP ${res.status}`), res.status)
  }
  return res.json() as Promise<AnalyzeResponse>
}

export async function analyzeAudio(
  blob: Blob,
  filename: string,
  sourceLabel?: string,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  const form = new FormData()
  form.append('file', blob, filename)
  if (sourceLabel) form.append('source_label', sourceLabel)
  const controller = new AbortController()
  signal?.addEventListener('abort', () => controller.abort())
  const timeout = window.setTimeout(() => controller.abort(), 90_000)
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(String(body?.detail ?? `HTTP ${res.status}`), res.status)
    }
    return (await res.json()) as AnalyzeResponse
  } finally {
    window.clearTimeout(timeout)
  }
}

export function fetchMission(payload: {
  top_species?: string | null
  model_score?: number | null
  uncertain?: boolean
  screen_free?: boolean
}): Promise<MissionResponse> {
  return request<MissionResponse>('/api/mission', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
