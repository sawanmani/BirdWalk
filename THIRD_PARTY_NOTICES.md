# BirdWalk — Third-Party Notices & Licences

Every licence below was read from the **installed package metadata** on
this machine during Phase 10 (PyPI `License-Expression` / `License`
fields, frontend `package.json` `license` fields) — not copied from
memory. Versions are the ones actually used for the verified test runs.

## The one that matters most

### BirdNET — model weights: **CC BY-NC-SA 4.0** (non-commercial!)

- Model: BirdNET GLOBAL 6K V2.4 (V2.4 model + label assets, measured
  274.5 MB on this install — the TensorFlow SavedModel used for inference
  is 58.4 MB; 6,522 labels observed).
- © K. Lisa Yang Center for Conservation Bioacoustics, Cornell Lab of
  Ornithology & Chemnitz University of Technology.
- The weights are licensed for **non-commercial** use with attribution
  and ShareAlike. BirdWalk is presented as a non-commercial educational
  Hacktoberfest demo. **Open licence question — not resolved here:**
  Hacktoberfest participation can involve prizes/giveaways, and CC BY-NC-SA
  "non-commercial" is a nuanced, judgement-based term. We make **no legal
  conclusion** that contest participation is automatically compatible with
  the NC clause. Anyone reusing or distributing this project — especially
  commercially or in any context involving monetary prize — MUST verify the
  BirdNET model licence themselves or obtain a commercial licence from the
  BirdNET team. This repository's own MIT licence (BirdWalk code only) does
  **not** relicense the CC BY-NC-SA model weights.
- Attribution is surfaced in-app (Footer + About panel), in
  `MODEL_CARD.md`, and in `README.md` ("Powered by BirdNET").
- More: `https://birdnet.cornell.edu/` · licence:
  `https://creativecommons.org/licenses/by-nc-sa/4.0/`

### BirdNET-Analyzer — code: **MIT** (`birdnet_analyzer 2.4.0`)

The official Python package (Stefan Kahl / birdnet-team). We use only
its public `analyze()` API. `pip` reports 2.4.0 while the package's
`__version__` prints `2.3.0` — documented in `MODEL_CARD.md`.

## Backend Python dependencies (installed versions, verified metadata)

| Package | Version | Licence (from dist-info) |
|---|---|---|
| tensorflow | 2.21.0 | Apache-2.0 |
| fastapi | 0.143.0 | MIT |
| uvicorn | 0.54.0 | BSD-3-Clause |
| pydantic | 2.14.0 | MIT |
| python-multipart | 0.0.32 | Apache-2.0 |
| soundfile | 0.14.0 | BSD-3-Clause (libsndfile itself is LGPL-2.1) |
| librosa | 1.0.0 | ISC |
| numpy | 2.5.4 | BSD-3-Clause (+ 0BSD, MIT, Zlib, CC0-1.0 components) |
| pandas | 3.0.6 | BSD-3-Clause |
| requests | 2.34.2 | Apache-2.0 |
| pytest | 9.1.1 | MIT (dev/test only) |
| httpx | 0.28.1 | BSD-3-Clause (dev/test only) |

TensorFlow pulls further Apache-2.0/BSD components (absl-py, keras,
ML SoundTag lib, etc.); full set in the venv's `site-packages`.

## Frontend dependencies (installed versions, verified package.json)

| Package | Version | Licence |
|---|---|---|
| react / react-dom | 19.3.0 | MIT |
| vite | 8.3.4 | MIT |
| typescript | 6.0.3 | Apache-2.0 |
| tailwindcss | 4.3.3 | MIT |
| lucide-react | 1.55.0 | ISC |
| framer-motion | 14.1.0 | MIT |
| @fontsource/dm-sans | 5.3.0 | OFL-1.1 |
| @fontsource/fraunces | 5.3.0 | OFL-1.1 |

Fonts are **self-hosted** via @fontsource (bundled into `dist/` at
build time — no Google Fonts CDN at runtime). DM Sans and Fraunces are
under the SIL Open Font License 1.1; see
`https://openfontlicense.org/`.

## Sample audio (CC BY-SA 4.0 — attribution required on redistribution)

All five files live in `data/samples/` (gitignored; regenerate with
`scripts/download_samples.py`). Full provenance, URLs and SHA-256
checksums are in `data/samples/manifest.json`. Credit lines, as
recorded at download time:

| File | Species label (uploader's claim) | Creator | Licence |
|---|---|---|---|
| WC_Indian_robin_call_and_song…​.wav | Indian Robin | Sharadapte (Wikimedia Commons) | CC BY-SA 4.0 |
| WC_Red_whiskered_bulbul_call…​.wav | Red-whiskered Bulbul | Sharadapte (Wikimedia Commons) | CC BY-SA 4.0 |
| WC_Pycnonotus_jocosus_Red_whiskered_Bulbul_XC538779_mp3.mp3 | Red-whiskered Bulbul | Subhashish Panigrahi (via Wikimedia Commons, Xeno-canto XC538779) | CC BY-SA 4.0 |
| WC_Asian_Koel_ogg.ogg | Asian Koel | Philip Eapen (Wikimedia Commons) | CC BY-SA 4.0 |
| WC_Eudynamys_scolopaceus_Asian_Koel_XC476378_mp3.mp3 | Asian Koel | Manoj Karingamadathil (via Wikimedia Commons, Xeno-canto XC476378) | CC BY-SA 4.0 |

Species labels are **uploaders' own claims**, not verified ground
truth, and are presented that way in the UI (`"(source claim)"`).

## Project code

BirdWalk's own code (`backend/app`, `frontend/src`, `scripts/`) is
offered under the MIT licence for the Hackathon, **without** implying
any licence on the BirdNET weights or sample audio, which keep their
own terms above.

## Not used / not claimed

- No Google Fonts CDN, no analytics, no third-party AI API calls.
- Gemma/Ollama: **not integrated** (no running instance at build time);
  nothing in this project depends on or claims it.
