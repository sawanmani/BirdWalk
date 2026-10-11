// Shared API/response types for BirdWalk.
// Naming follows BUILD_PROMPTS.md Phase 4: it is always "model_score",
// never "accuracy" or "probability" (ALIGNMENT.md §3, §4).

export type BirdNetStatus = 'ok' | 'no_reliable_detection'

export interface Prediction {
  rank: number
  species_common_name: string
  species_scientific_name: string | null
  model_score: number
}

export interface AnalyzeResponse {
  status: BirdNetStatus
  predictions: Prediction[]
  audio: {
    duration_seconds: number
    sample_rate: number
    channels: number
  }
  model: ModelInfo
  note: string
  /** True only when results come from a development fixture. */
  is_demo_fixture: boolean
  source_label?: string | null
}

export interface ModelInfo {
  model_name: string
  model_version: string
  model_source: string
  model_license: string
  code_license: string
  attribution: string
  input_sample_rate: number
  clip_seconds: number
  label_count: number
  runs_locally_after_setup: boolean
  airplane_mode_verified: boolean
  offline_scope_note: string
}

export type MissionCategory =
  | 'listen'
  | 'watch'
  | 'stillness'
  | 'breathe'
  | 'walk'

export interface Mission {
  id: string
  category: MissionCategory
  title: string
  instruction: string
  duration_seconds: number
  accessibility_note: string
  works_when_uncertain: boolean
}

export interface MissionResponse {
  mission: Mission
  generated_by: 'deterministic_template' | 'gemma_local' | 'gemma_fallback'
}

export interface SampleEntry {
  id: string
  species_label: string
  scientific_name: string | null
  file: string
  source_page_url: string
  creator: string
  license: string
  attribution: string
  downloaded_at: string
  checksum_sha256: string
  label_independently_verified: boolean
  notes: string
}

export interface IndiaSpeciesEntry {
  species_common_name: string
  species_scientific_name: string
  birdnet_label: string
  label_verified: boolean
}

export interface IndiaSpeciesResponse {
  available: boolean
  note?: string
  disclaimer?: string
  total_verified?: number
  species: IndiaSpeciesEntry[]
}

export type BackendState =
  | 'checking'
  | 'online_model_ready'
  | 'online_assets_missing'
  | 'online_package_missing'
  | 'offline'
  | 'error'
