# Sample audio data

Audio files in this directory are **not committed to Git** — their
individual licences and/or size make blanket redistribution unsuitable.
`manifest.json` (tracked) documents every file: source page, creator,
licence, attribution, checksum and decode checks.

To reproduce the sample set:

```powershell
backend\.venv\Scripts\python.exe scripts\download_samples.py
```

Provenance: Wikimedia Commons (searched via the official MediaWiki API;
Xeno-canto's public API returned 404 in this build environment). Species
names are the **uploaders' own identifications** — used for metadata
smoke tests only, never as ground truth or an accuracy benchmark.
All samples observed under CC BY-SA 4.0 at retrieval time; use is
non-commercial and educational (BirdNET weights share the same NC terms).
