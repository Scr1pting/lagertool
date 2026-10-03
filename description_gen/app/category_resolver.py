from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from sentence_transformers import SentenceTransformer

from app.schemas import Item


MODEL_NAME = "mixedbread-ai/mxbai-embed-large-v1"

_HERE = Path(__file__).parent
CATEGORIES_PATH = _HERE / "categories.json"
CACHE_PATH = _HERE / "categories.embeddings.pt"

# Minimum mean cosine similarity for a category to count as a real match.
# Below this we return "Other" rather than risk a confidently-wrong label.
# Tune from the per-category score dumps during verification.
CONFIDENCE_THRESHOLD = 0.55


def _detect_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _category_text(cat: dict) -> str:
    """Embed-friendly text for a category. Format proven in earlier
    experiments: name + definition + examples. The examples are what make
    brand names like "Coca Cola" match the right category."""
    ex = ", ".join(cat.get("examples", []))
    base = f"{cat['name']}. {cat['description']}"
    return f"{base} Examples: {ex}" if ex else base


def _item_text(item: Item) -> str:
    """A single embedded string per item. Tags are appended in parentheses
    when present — same shape as a human would describe an item."""
    if item.tags:
        return f"{item.name} ({', '.join(item.tags)})"
    return item.name


class CategoryResolver:
    def __init__(self) -> None:
        self.categories: list[dict] = json.loads(CATEGORIES_PATH.read_text())
        self.model = SentenceTransformer(MODEL_NAME, device=_detect_device())
        self.cat_embs: np.ndarray = self._load_or_build_cache()

    def _load_or_build_cache(self) -> np.ndarray:
        # Rebuild if the cache is missing or older than the source JSON.
        if CACHE_PATH.exists() and CACHE_PATH.stat().st_mtime >= CATEGORIES_PATH.stat().st_mtime:
            return torch.load(CACHE_PATH, map_location="cpu")["embeddings"].numpy()
        return self._build_cache()

    def _build_cache(self) -> np.ndarray:
        texts = [_category_text(c) for c in self.categories]
        embs = self.model.encode(
            texts,
            normalize_embeddings=True,
            convert_to_tensor=True,
            show_progress_bar=False,
        ).cpu()
        torch.save({"embeddings": embs}, CACHE_PATH)
        return embs.numpy()

    def resolve(self, items: list[Item]) -> str:
        if not items:
            return "Other"

        item_embs = self.model.encode(
            [_item_text(it) for it in items],
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        # (M_cats, dim) @ (dim, N_items) -> (M_cats, N_items); mean per category.
        scores = (self.cat_embs @ item_embs.T).mean(axis=1)
        best = int(scores.argmax())
        if float(scores[best]) < CONFIDENCE_THRESHOLD:
            return "Other"
        return self.categories[best]["name"]

    def explain(self, items: list[Item], top_k: int = 5) -> list[tuple[str, float]]:
        """Diagnostic: top-k categories by mean similarity. Not used by the
        endpoint; called from the __main__ harness and ad-hoc debugging."""
        item_embs = self.model.encode(
            [_item_text(it) for it in items],
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        scores = (self.cat_embs @ item_embs.T).mean(axis=1)
        order = np.argsort(scores)[::-1][:top_k]
        return [(self.categories[i]["name"], float(scores[i])) for i in order]


if __name__ == "__main__":
    import sys

    if "--rebuild-cache" in sys.argv:
        CACHE_PATH.unlink(missing_ok=True)

    resolver = CategoryResolver()

    cases = [
        ("drinks",       [Item(name="Coca Cola", tags=["drink","soda"]), Item(name="Sprite", tags=["drink","soda"]), Item(name="Berliner Kindl", tags=["beer"])]),
        ("tools",        [Item(name="hammer", tags=["tool"]), Item(name="screwdriver", tags=["tool"])]),
        ("coffee/tea",   [Item(name="Coffee", tags=["drink"]), Item(name="Tea", tags=["drink"])]),
        ("stationery",   [Item(name="pencil", tags=["stationery"]), Item(name="notebook", tags=["stationery"])]),
        ("fruit",        [Item(name="Apple", tags=["fruit"]), Item(name="Banana", tags=["fruit"])]),
        ("furniture",    [Item(name="Chair", tags=["furniture"]), Item(name="Table", tags=["furniture"])]),
        ("electronics",  [Item(name="laptop", tags=["electronics"]), Item(name="monitor", tags=["electronics"])]),
        ("mixed",        [Item(name="Coca Cola", tags=["drink"]), Item(name="hammer", tags=["tool"])]),
        ("single",       [Item(name="hammer", tags=["tool"])]),
        ("garbage-tags", [Item(name="hammer", tags=["cool","stuff"]), Item(name="screwdriver", tags=["nice","stuff"])]),
        ("plural-tags",  [Item(name="hammer", tags=["tools"]), Item(name="screwdriver", tags=["tools"])]),
        ("partial-tags", [Item(name="Coca Cola", tags=["drink"]), Item(name="Banana", tags=[])]),
    ]
    for name, batch in cases:
        result = resolver.resolve(batch)
        top = resolver.explain(batch, top_k=3)
        top_fmt = ", ".join(f"{n}:{s:.3f}" for n, s in top)
        print(f"{name:15} -> {result:18}  top3={top_fmt}")
