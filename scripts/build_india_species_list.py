"""BirdWalk — Phase 8: India-relevance shortlist, verified against labels.

Builds `backend/app/data/india_species.json` from a curated candidate list
of well-known Indian birds and cross-checks every name against the EXACT
BirdNET GLOBAL 6K V2.4 label file shipped by the official package
(config.BIRDNET_LABELS_FILE — the same list the model was trained on,
6,522 entries). Only species present in that label list are published as
"verified"; rejects are kept in the file with verified=false and reported,
so nothing silently disappears and nothing is fabricated.

This is a label-presence check, NOT a claim that BirdNET is
India-specialized or more accurate for Indian birds (BUILD_PROMPTS
Phase 8). No GPS is used or needed.

Run:
    backend\\.venv\\Scripts\\python.exe scripts\\build_india_species_list.py
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "backend" / "app" / "data" / "india_species.json"

# Candidate list curated for the demo (common, widely-documented Indian
# species). Reputable references for the names themselves: eBird/Cornell
# country list for India & BirdNET's own taxonomy. Scientific names are
# used for the match — they are unambiguous; common names come along.
CANDIDATES = [
    ("Indian Robin", "Copsychus fulicatus"),
    ("Red-whiskered Bulbul", "Pycnonotus jocosus"),
    ("White-throated Bulbul", "Alophoixus flaveolus"),
    ("Yellow-browed Bulbul", "Pycnonotus barbatus"),
    ("Asian Koel", "Eudynamys scolopaceus"),
    ("Common Hawk-Cuckoo", "Hierococcyx varius"),
    ("Indian Cuckoo", "Cuculus micropterus"),
    ("Ashy Drongo", "Dicrurus leucophaeus"),
    ("Black Drongo", "Dicrurus macrocercus"),
    ("White-bellied Drongo", "Dicrurus caerulescens"),
    ("Crimson Sunbird", "Aethopyga siparaja"),
    ("Purple Sunbird", "Cinnyris asiaticus"),
    ("Olive-backed Sunbird", "Cinnyris jugularis"),
    ("Little Spiderhunter", "Arachnothera penicillata"),
    ("Asian Palm Swift", "Hemiprocne comata"),
    ("House Swift", "Apus nipalensis"),
    ("White-throated Swiftlet", "Aerodramus brevirostris"),
    ("Indian Grey Hornbill", "Ocyceros birostris"),
    ("Malabar Hornbill", "Aceros orientalis"),
    ("King Cobra", "Ophiophagus hannah"),  # deliberate non-bird control
    ("Oriental Magpie-Robin", "Copsychus saularis"),
    ("White-throated Robin", "Irania gutturalis"),
    ("Red-vented Bulbul", "Pycnonotus cafer"),
    ("White-eared Bulbul", "Pycnonotus leucotis"),
    ("Himalayan Bulbul", "Pycnonotus leucogenys"),
    ("Spotted Dove", "Spilopelia chinensis"),
    ("Yellow-footed Green-Pigeon", "Treron phoenicopterus"),
    ("Emerald Dove", "Chalcophaps indica"),
    ("Indian Peafowl", "Pavo cristatus"),
    ("Jungle Babbler", "Argya striata"),
    ("Large Grey Babbler", "Argya malcolmi"),
    ("Common Myna", "Acridotheres tristis"),
    ("Jungle Myna", "Acridotheres fuscus"),
    ("Brahminy Starling", "Sturnia pagodarum"),
    ("Asian Openbill", "Anastomus oscitans"),
    ("Painted Stork", "Mycteria leucocephala"),
    ("Black-headed Ibis", "Threskiornis melanocephalus"),
    ("Purple Heron", "Ardea purpurea"),
    ("Cattle Egret", "Bubulcus ibis"),
    ("White-breasted Waterhen", "Amaurornis phoenicurus"),
    ("Indian Pond-Heron", "Ardeola grayii"),
    ("Yellow-wattled Lapwing", "Vanellus malabaricus"),
    ("Red-wattled Lapwing", "Vanellus indicus"),
    ("Asian Green Pigeon", "Treron okinavae"),
    ("Eurasian Golden Oriole", "Oriolus oriolus"),
    ("Black-hooded Oriole", "Oriolus xanthornus"),
    ("Sirkeer Malvaca", "Malacopteron magnum"),
    ("Grey-crowned Prinia", "Prinia criniger"),
    ("Ashy Prinia", "Prinia socialis"),
    ("Common Rosefinch", "Carpodacus erythrinus"),
    ("Crested Serpent-Eagle", "Spilornis cheela"),
    ("Shikra", "Accipiter badius"),
    ("White-eyed Buzzard", "Elanus caeruleus"),
    ("Black-winged Kite", "Elanus caeruleus"),  # duplicate sci: control 2
    ("Indian Vulture", "Gyps indicus"),
    ("Egyptian Vulture", "Neophron percnopterus"),
    ("Peregrine Falcon", "Falco peregrinus"),
    ("Laughing Dove", "Spilopelia senegalensis"),
    ("Little Collared Dove", "Streptopelia decaocto"),
    ("Rose-ringed Parakeet", "Psittacula krameri"),
    ("Plum-headed Parakeet", "Psittacula cyanocephala"),
    ("Alexandrine Parakeet", "Psittacula eupatria"),
    ("Grey-headed Canary-Flycatcher", "Culicicapa ceylonensis"),
    ("Common Tailorbird", "Orthotomus sutorius"),
    ("Asian Emerald Cuckoo", "Chrysococcyx maculatus"),
    ("Blue-winged Barbet", "Psilopogon malabaricus"),
    ("White-throated Barbet", "Psilopogon asiaticus"),
    ("Crimson-fronted Barbet", "Psilopogon rubricapillus"),
    ("Great Barbet", "Psilopogon virens"),
    ("Indian Roller", "Coracias benghalensis"),
    ("Blue-tailed Bee-eater", "Merops philippinus"),
    ("Green Bee-eater", "Merops orientalis"),
    ("European Bee-eater", "Merops apiaster"),
    ("White-throated Kingfisher", "Halcyon smyrnensis"),
    ("Common Kingfisher", "Alcedo atthis"),
    ("Javan Kingfisher", "Halcyon smyrnensis"),  # dup sci: control 3
    ("Chestnut-headed Bee-eater", "Merops leschenaulti"),
    ("Asian Paradise-Flycatcher", "Terpsiphone paradisi"),
    ("Blyth's Leaf-Warbler", "Calyptomena hosii"),
    ("Golden-fronted Leafbird", "Chloropsitta aurifrons"),
    ("Common Iora", "Aegithina tiphia"),
    ("Grey-headed Fish-Eagle", "Icthyophaga ichthyaetus"),
    ("Crested Serpentant", "Spilornis cheela"),  # misspelling: control 4
    ("Barn Swallow", "Hirundo rustica"),
    ("Red-rumped Swallow", "Cecropis daurica"),
    ("Crude control name", "Nonexistentus nowherei"),
]


def main() -> int:
    from birdnet_analyzer import config as bnconfig

    labels_file = Path(bnconfig.BIRDNET_LABELS_FILE)
    if not labels_file.is_file():
        print(f"Blocker: BirdNET labels file not found at {labels_file}")
        return 1
    labels = [ln.strip() for ln in labels_file.read_text(encoding="utf-8").splitlines() if ln.strip()]
    print(f"BirdNET label file: {labels_file} ({len(labels)} labels)")

    sci_to_label = {}
    # Observed label-file format (V2.4 file shipped in the wheel):
    # "Genus species[ subspecies]_Common Name" — binomial BEFORE an '_'.'
    for lab in labels:
        if "_" not in lab:
            continue
        sci_part = lab.split("_", 1)[0].strip().lower()
        # Register full pre-'_' string AND its first two words, so
        # subspecies (trinomial) labels also answer a binomial lookup.
        sci_to_label.setdefault(sci_part, lab)
        words = sci_part.split(" ")
        if len(words) >= 3:
            sci_to_label.setdefault(" ".join(words[:2]), lab)

    verified, rejected = [], []
    seen_sci = set()
    for common, sci in CANDIDATES:
        key = sci.lower()
        if key in seen_sci:
            print(f"  note: duplicate scientific name skipped: {common} ({sci})")
            continue
        seen_sci.add(key)
        lab = sci_to_label.get(key)
        if lab:
            verified.append(
                {
                    "species_common_name": common,
                    "species_scientific_name": sci,
                    "birdnet_label": lab,
                    "label_verified": True,
                }
            )
        else:
            rejected.append(
                {
                    "species_common_name": common,
                    "species_scientific_name": sci,
                    "label_verified": False,
                    "reason": "scientific name not found in BirdNET V2.4 label list",
                }
            )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "method": "Candidate common Indian birds cross-checked against the official BirdNET GLOBAL 6K V2.4 label file by scientific name (exact binomial match).",
                "disclaimer": "Label-presence verification only. Not a claim that BirdNET is India-specialized or more accurate for Indian species. No GPS or location inference.",
                "total_candidates": len(CANDIDATES),
                "verified_count": len(verified),
                "species": verified,
                "rejected": rejected,
            },
            indent=2,
            ensure_ascii=False,
        ),
        "utf-8",
    )
    print(f"Verified {len(verified)} / {len(CANDIDATES)} candidates -> {OUT}")
    if rejected:
        print(f"Rejected (honest, kept in file): {len(rejected)}")
        for r in rejected:
            print(f"  - {r['species_common_name']} ({r['species_scientific_name']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
