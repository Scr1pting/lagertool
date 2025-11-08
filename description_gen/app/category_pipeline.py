from __future__ import annotations

from typing import Sequence

from app.hypernyms import hypernym_consensus_label, shared_hypernym_label


def _llm_fallback(items: Sequence[str]) -> str:
    from app.llama_model import generate_category as _generate_category

    return _generate_category(list(items))


def resolve_category(item_names: Sequence[str]) -> str:
    cleaned = [name.strip() for name in item_names if name and name.strip()]
    if not cleaned:
        return "Empty"

    unanimous = shared_hypernym_label(cleaned)
    if unanimous:
        return unanimous

    hypernym_label = hypernym_consensus_label(cleaned)
    if hypernym_label:
        return hypernym_label

    return _llm_fallback(cleaned)
