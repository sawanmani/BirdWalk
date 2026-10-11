"""One-shot check: does a birdless clip legitimately return no_reliable_detection?
(Kept as a reproducible honest probe, not a fake result.)"""
import io
import numpy as np
import requests
import soundfile as sf

sr = 48000
rng = np.random.default_rng(42)
pinkish = np.cumsum(rng.normal(0, 0.002, sr * 6)); pinkish -= pinkish.mean()
pinkish = np.clip(pinkish, -0.05, 0.05).astype("float32")
buf = io.BytesIO(); sf.write(buf, pinkish, sr, format="WAV", subtype="FLOAT")
r = requests.post("http://127.0.0.1:8000/api/analyze",
                  files={"file": ("birdless_noise.wav", buf.getvalue(), "audio/wav")},
                  timeout=120)
print("HTTP", r.status_code)
b = r.json()
print("status:", b.get("status"))
print("note:", b.get("note"))
for p in b.get("predictions", []):
    print(" ", p["rank"], p["species_common_name"], p["model_score"])
