import type { AnalyzeResponse } from './types'

// ---------------------------------------------------------------------------
// Development-only fixture mode (BUILD_PROMPTS.md Phase 1/5).
// Enabled with VITE_DEMO_FIXTURE=1. Fixtures are ALWAYS visually flagged
// (is_demo_fixture + on-screen banner). They must never be presented as,
// or mistaken for, real model output (ALIGNMENT.md §3).
// ---------------------------------------------------------------------------

export const DEMO_FIXTURE_MODE =
  import.meta.env.DEV && import.meta.env.VITE_DEMO_FIXTURE === '1'

const FIXTURE_MODEL: AnalyzeResponse['model'] = {
  model_name: 'BirdNET-Analyzer (FIXTURE, not real inference)',
  model_version: 'fixture-0',
  model_source: 'local development fixture',
  model_license: 'n/a — fixture data',
  code_license: 'n/a — fixture data',
  attribution: 'DEMO FIXTURE — no model ran',
  input_sample_rate: 32000,
  clip_seconds: 3,
  label_count: 0,
  offline_after_download: false,
}

export function fixtureResponse(): AnalyzeResponse {
  return {
    status: 'ok',
    predictions: [
      {
        rank: 1,
        species_common_name: 'DEMO FIXTURE — Indian Robin',
        species_scientific_name: 'Copsychus fulicatus',
        model_score: 0.42,
      },
      {
        rank: 2,
        species_common_name: 'DEMO FIXTURE — Red-whistling Bulbul',
        species_scientific_name: 'Pycnonotus cafer',
        model_score: 0.19,
      },
    ],
    audio: { duration_seconds: 3.0, sample_rate: 32000, channels: 1 },
    model: FIXTURE_MODEL,
    note: 'This is a development fixture, not a real inference result.',
    is_demo_fixture: true,
  }
}
