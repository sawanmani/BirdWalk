"""BirdWalk mission engine — deterministic templates, zero dependencies.

Phase 6 rules (BUILD_PROMPTS):
  * works with no LLM and no network;
  * safe wording only — never approach, feed, touch, disturb, or play
    calls to attract wildlife;
  * one universal mission that works when identification fails;
  * selection is a pure function of the request (stable, testable);
  * missions invite putting the phone away (screen-free by default).

`top_species` only *themes* the wording; a mission never asserts the
predicted bird is definitely present.
"""
from __future__ import annotations

import hashlib

from ..schemas import Mission, MissionRequest

# Curated library. Every entry: id, category, title, instruction,
# duration_seconds, accessibility_note, works_when_uncertain.
MISSIONS: list[dict] = [
    {
        "id": "listen-two-min",
        "category": "listen",
        "title": "Two-minute ear sweep",
        "instruction": (
            "Pocket your phone. For two minutes, just listen. Try to hear "
            "a second bird call and notice which direction it comes from."
        ),
        "duration_seconds": 120,
        "accessibility_note": "Works seated, indoors with a window open, or anywhere you can hear outside.",
        "works_when_uncertain": True,
    },
    {
        "id": "still-one-tree",
        "category": "stillness",
        "title": "Be still as a post",
        "instruction": (
            "Stand or sit still near a tree or shrub for one minute, phone "
            "away. When you are quiet, birds often resume — and get closer "
            "to going about their day. Keep your distance from them."
        ),
        "duration_seconds": 60,
        "accessibility_note": "Can be done seated; choose level ground nearby.",
        "works_when_uncertain": True,
    },
    {
        "id": "watch-flower",
        "category": "watch",
        "title": "Flower watch",
        "instruction": (
            "Put the phone down and watch any flower or patch of green for "
            "two minutes. Just observe — no approaching, feeding, or "
            "touching birds or other wildlife."
        ),
        "duration_seconds": 120,
        "accessibility_note": "A window view or balcony plants work fine.",
        "works_when_uncertain": True,
    },
    {
        "id": "breathe-three",
        "category": "breathe",
        "title": "Three slow breaths outside",
        "instruction": (
            "Screen off. Take three slow breaths, then spend one minute "
            "just noticing the layering of sounds around you."
        ),
        "duration_seconds": 60,
        "accessibility_note": "Seated-friendly; no movement required.",
        "works_when_uncertain": True,
    },
    {
        "id": "walk-quiet",
        "category": "walk",
        "title": "Quiet ninety-second walk",
        "instruction": (
            "Walk slowly for ninety seconds without looking at your phone. "
            "Glance up at branches and overhead wires — perched birds are "
            "often hiding in plain sight. Stay on the path; do not "
            "approach nests."
        ),
        "duration_seconds": 90,
        "accessibility_note": "Any route works, even a corridor or veranda; keep it slow.",
        "works_when_uncertain": True,
    },
    {
        "id": "listen-theme",
        "category": "listen",
        "title": "Call-counting with your eyes closed",
        "instruction": (
            "The model heard something like {species} — a possible match, "
            "not a certainty. Phone away, eyes closed for two minutes. "
            "How many separate calls can you count? Do not play bird "
            "calls to attract anyone."
        ),
        "duration_seconds": 120,
        "accessibility_note": "Seated, eyes closed; skip if closing eyes away from a safe surface is uncomfortable.",
        "works_when_uncertain": False,
    },
    {
        "id": "watch-skyline",
        "category": "watch",
        "title": "Scan the skyline",
        "instruction": (
            "Put the phone face-down. For two minutes, scan the skyline, "
            "treetops, and wires. Silhouettes are easier to spot than "
            "colours from a distance."
        ),
        "duration_seconds": 120,
        "accessibility_note": "Works from any seated vantage point with a view.",
        "works_when_uncertain": False,
    },
]

_BY_ID = {m["id"]: m for m in MISSIONS}


def _choose_id(req: MissionRequest) -> str:
    """Pure, deterministic selection — stable for identical inputs."""
    if req.uncertain or req.top_species is None:
        return "listen-two-min"  # universal mission when ID fails
    pool = ["listen-theme", "watch-skyline", "still-one-tree", "walk-quiet"]
    digest = hashlib.sha256(req.top_species.lower().strip().encode("utf-8")).hexdigest()
    return pool[int(digest[:8], 16) % len(pool)]


def build_mission(req: MissionRequest) -> Mission:
    template = _BY_ID[_choose_id(req)]
    instruction = template["instruction"]
    if "{species}" in instruction:
        name = (req.top_species or "a bird").strip()
        # Bound pathological strings; this only themes text.
        instruction = instruction.replace("{species}", name[:60])
    return Mission(
        id=template["id"],
        category=template["category"],
        title=template["title"],
        instruction=instruction,
        duration_seconds=template["duration_seconds"],
        accessibility_note=template["accessibility_note"],
        works_when_uncertain=template["works_when_uncertain"],
    )
