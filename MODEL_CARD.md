# BirdWalk — Model Card: BirdNET GLOBAL 6K V2.4

_Honesty rules per ALIGNMENT.md: every number below is either quoted from
the upstream authors or measured on this machine and labelled as such.
BirdWalk ships **no original model** and makes **no accuracy claim** of its
own._

## 1. What the model is

| Field | Value | Source |
|---|---|---|
| Model | BirdNET GLOBAL 6K V2.4 (audio spectrogram classifier) | Upstream: Kahl et al., Cornell Lab of Ornithology & TU Chemnitz |
| Upstream paper | "BirdNET: A deep learning solution for avian diversity monitoring", *Ecological Informatics* 61 (2021) | https://doi.org/10.1016/j.ecoinf.2021.101054 |
| Labels | **6,522 species** (authoritative: count of non-empty lines in the label file shipped with this install, `checkpoints/V2.4/BirdNET_GLOBAL_6K_V2.4_Labels.txt`) | Measured 2026-10-11 |
| Label-count note | Upstream branding uses "6K" / an earlier "~6,512" figure; the concrete V2.4 label list distributed in the wheel has **6,522** entries. We publish the measured, shipped count everywhere (`/api/model-info` `label_count`, README, notices), not the marketing figure, and flag the discrepancy rather than hide it. | This audit |
| Input | 3.0 s segments, resampled to 48 kHz mono | Observed in `BirdNET_analysis_params.csv` |
| Package used | `BirdNET-Analyzer == 2.4.0` from PyPI (official Cornell package) | `pip show birdnet-analyzer` |
| Quirk | pip version is 2.4.0 but `birdnet_analyzer.__version__` reports `"2.3.0"` | Observed, reported verbatim |
| Model & base-label assets | Downloaded on **first use** by the official mechanism into `site-packages/birdnet_analyzer/checkpoints/V2.4/` (base English label list + TF SavedModel FP32 + TFLite FP16/FP32/INT8 + seasonal MData location model). Measured total of that directory on this machine: **274.5 MB**. Translated label lists ship inside the wheel. | Measured 2026-10-11 (`pip` RECORD lists 0 `checkpoints/` entries but many `labels/` files → the model/base labels are runtime-downloaded, translations bundled) |
| Tech | TensorFlow 2.21.0, SavedModel format, CPU inference (no GPU used) | Observed |

## 2. Licences (verified, not assumed)

| Component | Licence | Where checked |
|---|---|---|
| Analyzer source code | MIT | `BirdNET_Analyzer-2.4.0.dist-info/METADATA` in the installed wheel |
| Model weights & label lists | CC BY-NC-SA 4.0 | Same METADATA ("models and other data … CC BY-NC-SA 4.0") and upstream README |
| Consequence | BirdWalk's own code is MIT; the weights remain CC BY-NC-SA (non-commercial). The app is not monetised and no weights/audio are redistributed in the repo. **We draw no legal conclusion** that Hacktoberfest participation or prize money is automatically a "non-commercial" use — that is an open question flagged in THIRD_PARTY_NOTICES.md, and commercial reuse requires removing the model or obtaining a BirdNET licence. | ALIGNMENT.md §5, THIRD_PARTY_NOTICES.md |
| Attribution shown in UI | Footer credits "BirdNET © Cornell Lab of Ornithology & Chemnitz University of Technology (CC BY-NC-SA 4.0)" | `frontend/src/components/Footer.tsx` |

## 3. What BirdWalk does NOT claim

- **No accuracy percentage** is stated anywhere in this project. The upstream
  paper reports published performance for its own test conditions; those do
  not transfer to this app and are deliberately not restated as "BirdWalk
  accuracy".
- Scores returned by the model are labelled **`model_score`** (softmax
  confidence per segment), never "accuracy" or "probability of being right".
- The smoke tests below are **pipeline verification on 5 public recordings
  whose species labels are uploader claims** — not ground truth, not a field
  test, not a benchmark.
- Offline behaviour is now reported as **two separate fields**, not one
  conflated flag: `runs_locally_after_setup = true` (a code/design fact —
  the analysis path loads the local model and makes **no per-request
  network call**, and integration tests run entirely locally) and
  `airplane_mode_verified = false` (a **full disconnected-OS end-to-end
  test has NOT been performed**). Phone-native inference is not claimed.
  See IMPLEMENTATION_STATUS.md and README.

## 4. Observed inference behaviour on this machine (actual outputs)

Two levels of evidence are kept separate on purpose.

### 4a. Production pipeline (real, normalised) — authoritative

This is what the app actually runs: `backend.app.main._analyze_path`
(validate → **normalise to mono 48 kHz WAV** → official `analyze()` →
per-species max aggregation). Reproduce with
`backend\.venv\Scripts\python.exe scripts\record_sample_outputs.py`; the
verbatim full top-3 outputs and scores are saved in
**`data/model_outputs.json`** (committed). Recorded 2026-10-11.

| Input (uploader label = unverified claim) | Production top-1 (model_score) | Source-label agreement |
|---|---|---|
| Indian Robin wav (16.9 s) | Indian Robin **0.9994** | ✅ |
| Red-whiskered Bulbul wav (Jamboti, 12.9 s) | Red-whiskered Bulbul (*P. jocosus*) **0.6378** | ✅ |
| Red-whiskered Bulbul XC538779 mp3 (129 s, stereo) | Red-whiskered Bulbul (*P. jocosus*) **0.9611** | ✅ |
| Asian Koel ogg (6.8 s) | Asian Koel **0.9748** | ✅ |
| Asian Koel XC476378 mp3 (113.9 s) | Asian Koel **0.9986** | ✅ |

**Result: 5/5 source-label agreement on the production pipeline.** This is
label AGREEMENT on five curated, licence-filtered clips — a small
metadata-based smoke test — **not** independently verified accuracy, not a
field test, and not a general-performance benchmark.

### 4b. Raw-analyzer smoke (pre-normalisation, execution check)

The bare `scripts/smoke_test_model.py` run feeds files straight to the
official `analyze()` without the backend's normalisation step, which is
exactly why normalisation exists. Environment: Windows, Python 3.12.3,
TF 2.21.0 CPU (`min_conf=0.05`, `top_n=3`). Full transcript:
`data/smoke_run.txt` (gitignored) and IMPLEMENTATION_STATUS.md.

| Input (uploader label = claim only) | Top model output(s) | Agrees with label? |
|---|---|---|
| Generated 3 s sine tone (execution check) | Buff-spotted Flufftail 0.6407 (!) | N/A — shows the model *will* produce confident-looking outputs on non-bird audio; UI must not over-trust scores |
| Indian Robin wav (Sangli, MH) | Indian Robin 0.5455 → 0.8515 across segments | ✅ matches |
| Red-whiskered Bulbul wav (Jamboti, KA) | Red-whiskered Bulbul (*P. jocosus*) 0.20–0.64 | ✅ common name and scientific name both match the uploader's claim (*Pycnonotus jocosus*). An earlier manifest mistakenly listed *P. cafer* (Red-vented Bulbul, a different species); corrected 2026-10-11 after this audit. |
| Asian Koel ogg | Asian Koel 0.9256 / 0.9748 | ✅ strong match |
| Asian Koel XC-mirror mp3 (113 s) | Engine 0.0068, Human vocal, Greater Coucal 0.033 | ❌ raw analyzer, no reliable bird detection — honest negative that motivated normalisation; **the production pipeline (4a) does detect Asian Koel 0.9986 on the same file** |
| Red-whiskered Bulbul XC-mirror mp3 (129 s, stereo 44.1 kHz) | Analyzer error: "Cannot analyze audio file" | ❌ decode failure recorded honestly; backend normalises (decode→mono 48 kHz WAV via soundfile) before calling the analyzer — **the production pipeline (4a) handles the same file at Red-whiskered Bulbul 0.9611** |

Latencies observed (3 s clip ≈ 1.3–1.8 s incl. per-call overhead; full-length clips ≈ 6–19 s on CPU).

## 5. Integration surface

BirdWalk calls only the **public API** of the official package:
`from birdnet_analyzer import analyze(...)` with CSV output parsed back into
the `Prediction` schema. Internal modules are not monkey-patched, so the
integration survives upstream refactors as much as possible.

## 6. Upstream references

- Repo: https://github.com/kahst/BirdNET-Analyzer (license terms as §2)
- Model/paper: Kahl, Grafe et al. 2021 (paper), v2.4 6K release 2024
- Species list & location model: shipped by the same package (V2.4 season/location models)
