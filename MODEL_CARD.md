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
| Labels | 6,522 species (verified at load time on this machine: `Species list contains 6522 species`) | Observed, 2026-10-11 |
| Input | 3.0 s segments, resampled to 48 kHz mono | Observed in `BirdNET_analysis_params.csv` |
| Package used | `BirdNET-Analyzer == 2.4.0` from PyPI (official Cornell package) | `pip show birdnet-analyzer` |
| Quirk | pip version is 2.4.0 but `birdnet_analyzer.__version__` reports `"2.3.0"` | Observed, reported verbatim |
| Weights download | `BirdNET_GLOBAL_6K_V2.4_TF-saved-model-2.x/` (~224 MB), fetched once by the official mechanism, cached locally | Observed on this machine |
| Tech | TensorFlow 2.21.0, SavedModel format, CPU inference (no GPU used) | Observed |

## 2. Licences (verified, not assumed)

| Component | Licence | Where checked |
|---|---|---|
| Analyzer source code | MIT | `BirdNET_Analyzer-2.4.0.dist-info/METADATA` in the installed wheel |
| Model weights & label lists | CC BY-NC-SA 4.0 | Same METADATA ("models and other data … CC BY-NC-SA 4.0") and upstream README |
| Consequence | BirdWalk is a strictly **non-commercial** Hacktoberfest educational demo, which is a permitted use under CC BY-NC-SA; the app is not monetised and no audio/weights are redistributed in the repo | ALIGNMENT.md §5, this project's stated purpose |
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
- `offline_after_download` is **partially verified**: the app runtime uses
  the locally cached SavedModel and needs no network after first fetch; but a
  true airplane-mode end-to-end test has **NOT been performed** — see
  IMPLEMENTATION_STATUS.md.

## 4. Observed inference behaviour on this machine (actual outputs)

Environment: Windows, Python 3.12.3, TF 2.21.0 CPU. Command:
`backend\.venv\Scripts\python.exe scripts\smoke_test_model.py` (official
`analyze()`, `min_conf=0.05`, `top_n=3`). Full transcript:
`data/smoke_run.txt` (gitignored) and IMPLEMENTATION_STATUS.md.

| Input (uploader label = claim only) | Top model output(s) | Agrees with label? |
|---|---|---|
| Generated 3 s sine tone (execution check) | Buff-spotted Flufftail 0.6407 (!) | N/A — shows the model *will* produce confident-looking outputs on non-bird audio; UI must not over-trust scores |
| Indian Robin wav (Sangli, MH) | Indian Robin 0.5455 → 0.8515 across segments | ✅ matches |
| Red-whiskered Bulbul wav (Jamboti, KA) | Red-whiskered Bulbul (*P. jocosus*) 0.20–0.64 | ✅ common name matches; note manifest scientific label says *P. cafer* while model says *P. jocosus* — both species carry the same common name (taxonomy/label ambiguity, reported honestly) |
| Asian Koel ogg | Asian Koel 0.9256 / 0.9748 | ✅ strong match |
| Asian Koel XC-mirror mp3 (113 s) | Engine 0.0068, Human vocal, Greater Coucal 0.033 | ❌ no reliable bird detection — honest negative; shows the "no_reliable_detection" path matters |
| Red-whiskered Bulbul XC-mirror mp3 (129 s, stereo 44.1 kHz) | Analyzer error: "Cannot analyze audio file" | ❌ decode failure recorded honestly; backend must normalise (decode→mono 48 kHz WAV via soundfile) before calling the analyzer |

Latencies observed (3 s clip ≈ 1.3–1.8 s incl. per-call overhead; 113 s clip ≈ 6.0 s on CPU).

## 5. Integration surface

BirdWalk calls only the **public API** of the official package:
`from birdnet_analyzer import analyze(...)` with CSV output parsed back into
the `Prediction` schema. Internal modules are not monkey-patched, so the
integration survives upstream refactors as much as possible.

## 6. Upstream references

- Repo: https://github.com/kahst/BirdNET-Analyzer (license terms as §2)
- Model/paper: Kahl, Grafe et al. 2021 (paper), v2.4 6K release 2024
- Species list & location model: shipped by the same package (V2.4 season/location models)
