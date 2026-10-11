"""Deterministic mission engine + prediction aggregation unit tests.

No model, no network — pure functions (Phase 6 requirement that the
product works without any generative model).
"""
from __future__ import annotations

import pytest

from app.schemas import MissionRequest
from app.services import mission_service
from app.services.birdnet_service import aggregate

FORBIDDEN_IMPACT_PHRASES = [
    "play bird calls", "playback to attract", "feed the bird",
    "touch a bird", "pick up a nest", "catch a bird",
]


def test_same_input_same_mission():
    req = MissionRequest(top_species="Asian Koel", model_score=0.9, uncertain=False)
    a = mission_service.build_mission(req)
    b = mission_service.build_mission(req)
    assert a.model_dump() == b.model_dump()


def test_uncertain_gets_universal_mission():
    m = mission_service.build_mission(MissionRequest(uncertain=True))
    assert m.works_when_uncertain is True
    m2 = mission_service.build_mission(MissionRequest(top_species=None))
    assert m2.works_when_uncertain is True


@pytest.mark.parametrize("tpl", mission_service.MISSIONS)
def test_every_template_is_wellformed_and_safe(tpl):
    assert tpl["category"] in {"listen", "watch", "stillness", "breathe", "walk"}
    assert 30 <= tpl["duration_seconds"] <= 300
    assert tpl["accessibility_note"]
    low = tpl["instruction"].lower()
    for phrase in FORBIDDEN_IMPACT_PHRASES:
        # Templates may forbid an action ("do not play bird calls") but
        # must never instruct it. Check the bare verb-phrase isn't used
        # imperatively: occurrences must be negated.
        idx = low.find(phrase)
        if idx == -1:
            continue
        window = low[max(0, idx - 40) : idx]
        assert ("not " in window or "no " in window or "never" in window), (
            f"{tpl['id']}: '{phrase}' appears without a negation"
        )


def test_themed_mission_has_no_leftover_placeholder():
    # Force the themed template via its deterministic key.
    for name in ("Asian Koel", "Indian Robin", "Red-whiskered Bulbul"):
        m = mission_service.build_mission(
            MissionRequest(top_species=name, model_score=0.8, uncertain=False)
        )
        assert "{species}" not in m.instruction


def test_aggregate_max_rank_and_cap():
    rows = [
        {"Common name": "Asian Koel", "Scientific name": "Eudynamys scolopaceus", "Confidence": "0.5"},
        {"Common name": "Asian Koel", "Scientific name": "Eudynamys scolopaceus", "Confidence": "0.93"},
        {"Common name": "Pacific Koel", "Scientific name": "Eudynamys orientalis", "Confidence": "0.42"},
        {"Common name": "Engine", "Scientific name": "Engine", "Confidence": "0.1"},
        {"Common name": "None", "Scientific name": "None", "Confidence": "0.9"},
        {"Common name": "Spotted Dove", "Scientific name": "Spilopelia chinensis", "Confidence": "bad"},
    ]
    out = aggregate(rows)
    assert [p["species_common_name"] for p in out] == ["Asian Koel", "Pacific Koel", "Engine"]
    assert out[0]["model_score"] == pytest.approx(0.93)  # max across segments
    assert [p["rank"] for p in out] == [1, 2, 3]
    assert len(out) <= 3
    assert out[0]["species_scientific_name"] == "Eudynamys scolopaceus"


def test_aggregate_empty():
    assert aggregate([]) == []
