"""BirdWalk API schemas — the wire contract shared with the frontend.

Field names follow BUILD_PROMPTS.md Phase 4 and mirror
`frontend/src/lib/types.ts` one-to-one. It is always `model_score`,
never "accuracy" or "probability" (ALIGNMENT.md §3/§4).
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

BirdNetStatus = Literal["ok", "no_reliable_detection"]
MissionCategory = Literal["listen", "watch", "stillness", "breathe", "walk"]
GeneratedBy = Literal["deterministic_template", "gemma_local", "gemma_fallback"]


class Prediction(BaseModel):
    rank: int
    species_common_name: str
    species_scientific_name: str | None = None
    model_score: float


class AudioMeta(BaseModel):
    duration_seconds: float
    sample_rate: int
    channels: int


class ModelInfo(BaseModel):
    model_name: str
    model_version: str
    model_source: str
    model_license: str
    code_license: str
    attribution: str
    input_sample_rate: int
    clip_seconds: float
    label_count: int
    runs_locally_after_setup: bool
    airplane_mode_verified: bool
    offline_scope_note: str


class AnalyzeResponse(BaseModel):
    status: BirdNetStatus
    predictions: list[Prediction]
    audio: AudioMeta
    model: ModelInfo
    note: str
    is_demo_fixture: bool = False
    source_label: str | None = None


class SampleEntry(BaseModel):
    id: str
    species_label: str
    scientific_name: str | None = None
    file: str
    source_page_url: str
    creator: str
    license: str
    attribution: str
    downloaded_at: str
    checksum_sha256: str
    label_independently_verified: bool
    notes: str


class SamplesResponse(BaseModel):
    samples: list[SampleEntry]


class MissionRequest(BaseModel):
    # Structured, non-sensitive context only (ALIGNMENT.md): no audio,
    # no coordinates. Unknown extra fields are ignored, not stored.
    top_species: str | None = None
    model_score: float | None = Field(default=None, ge=0.0, le=1.0)
    uncertain: bool = False
    screen_free: bool = True


class Mission(BaseModel):
    id: str
    category: MissionCategory
    title: str
    instruction: str
    duration_seconds: int
    accessibility_note: str
    works_when_uncertain: bool


class MissionResponse(BaseModel):
    mission: Mission
    generated_by: GeneratedBy = "deterministic_template"
