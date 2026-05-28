from pathlib import Path
import numpy as np
import torch
import inflect

from functools import lru_cache
from itertools import batched

from sentence_transformers import SentenceTransformer
from nltk.corpus import wordnet as wn

from app.wordnet import noun_meanings, noun_synsets
from app.schemas import Item


MODEL_PATH = "mixedbread-ai/mxbai-embed-large-v1"
EMB_PATH = Path(".cache/wordnet_embeddings.pt")

# WordNet ancestors that are technically correct LCAs but useless as category
# labels for an inventory tool. Anything that intersects across genuinely
# unrelated items (drinks vs tools) tends to land here.
USELESS_ANCESTORS = {
    "entity.n.01", "physical_entity.n.01", "abstraction.n.06",
    "object.n.01", "whole.n.02", "artifact.n.01",
    "instrumentality.n.03", "matter.n.03", "substance.n.04",
    "thing.n.12", "container.n.01",
}


def _detect_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"

model = SentenceTransformer(MODEL_PATH, device=_detect_device())
p = inflect.engine()


@lru_cache(maxsize=1)
def get_wordnet_embeddings(batch_size: int = 32) -> np.ndarray:
    """Return cached WordNet noun embeddings, generating them if needed."""
    if EMB_PATH.exists():
        cached = torch.load(EMB_PATH, map_location="cpu")
        embeddings = cached["embeddings"].cpu().numpy()
        return embeddings

    batches: list[torch.Tensor] = []
    i = 0

    for chunk in batched(noun_meanings(), batch_size):
        print(f"Lemma {i*batch_size}/{len(noun_meanings())}", end="\r")
        i += 1

        embeddings = model.encode(
            chunk,
            normalize_embeddings=True,  # All of length one
            batch_size=len(chunk),
            show_progress_bar=False,
            convert_to_tensor=True,
        ).cpu()
        batches.append(embeddings)

    stacked = torch.cat(batches, dim=0)

    EMB_PATH.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"embeddings": stacked}, EMB_PATH)

    return stacked.numpy()


def _convert_words(name: str, fn) -> str:
    """Apply `fn` to each whitespace-separated token in `name`, falling back to
    the original token when `fn` returns falsy (e.g. None)."""
    parts = name.split()
    if not parts:
        return name
    return " ".join((fn(w) or w) for w in parts)


def _item_queries(item: Item) -> list[str]:
    """The bundle of natural-language phrasings we embed for a single item."""
    term_singular = _convert_words(item.name, p.singular_noun)
    term_plural = _convert_words(item.name, p.plural_noun)
    tags_joined = ", ".join(item.tags)
    return [
        item.name,
        tags_joined,
        f"{item.name} ({tags_joined})",
        f"We took {p.a(term_singular)} {term_singular} from the shelf.",
        f"I borrowed {term_plural} from the university for the event.",
    ]


def get_item_embeddings(items: list[Item]):
    queries: list[str] = []
    for item in items:
        queries.extend(_item_queries(item))

    return model.encode(
        queries,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )


def find_closest_lemma(items: list[Item], top_k: int = 10) -> list[tuple[str, float]]:
    """Return the closest WordNet lemmas to the provided items, averaged across all items."""
    lemmas = noun_meanings()

    wordnet_embeddings = get_wordnet_embeddings()
    item_embeddings = get_item_embeddings(items)

    # Cosine similarity matrix (both sides normalized): (N x M)
    cos_sim_matrix = wordnet_embeddings @ item_embeddings.T
    mean_similarities = cos_sim_matrix.mean(axis=1)

    k = min(top_k, len(mean_similarities))
    top_indices = np.argpartition(mean_similarities, -k)[-k:]

    return [(lemmas[idx], float(mean_similarities[idx])) for idx in top_indices]


def _best_synset_for_item(item: Item, wordnet_embeddings: np.ndarray):
    """Pick the WordNet synset whose averaged embedding similarity is highest
    against this item's query bundle."""
    synsets = noun_synsets()
    queries = _item_queries(item)
    query_emb = model.encode(queries, normalize_embeddings=True, convert_to_numpy=True)
    sims = (wordnet_embeddings @ query_emb.T).mean(axis=1)
    return synsets[int(np.argmax(sims))]


def _synset_label(syn) -> str:
    return syn.lemmas()[0].name().replace("_", " ").title()


@lru_cache(maxsize=1)
def _inventoryable_synsets() -> frozenset:
    """Tag senses we accept as category candidates: descendants of
    `physical_entity.n.01`, minus people, animals, and body parts.
    Broader than `wordnet.py`'s embedding filter (which only takes `object`
    descendants and thus excludes substances like `beverage.n.01`);
    narrower than "everything physical" (which would let in slang senses
    like `cock.n.01` via `body_part`, or abstraction-shaped senses that
    have one path through `physical_entity`). The body-part exclusion in
    particular is what blocks "tool" → cock.n.01 from poisoning batches."""
    def closure(name: str):
        s = wn.synset(name)
        return set(s.closure(lambda x: x.hyponyms())) | {s}

    physical = closure("physical_entity.n.01")
    return frozenset(
        physical
        - closure("person.n.01")
        - closure("animal.n.01")
        - closure("body_part.n.01")
    )


def _tag_synsets(tag: str, eligible: frozenset) -> list:
    """Eligible noun senses for `tag`. Lemmatizes first (so "tools" →
    "tool"), then keeps every sense that survives the eligibility filter.
    Returns empty if the tag has no eligible senses or doesn't appear in
    WordNet at all — tag quality is user-controlled."""
    lemma = wn.morphy(tag.lower().strip(), wn.NOUN) or tag.lower().strip()
    return [s for s in wn.synsets(lemma, pos=wn.NOUN) if s in eligible]


def _item_candidates(item: Item, wordnet_embeddings: np.ndarray) -> list:
    """Synsets representing this item: every eligible noun sense of each
    tag. If no tag resolves (tags are user-supplied, may not map to
    WordNet), fall back to the embedding's top pick. We don't blend the
    two: when tags resolve they're explicit human signal and the embedder
    tends to pick the physical referent (Coffee → coffee_cup, Coca Cola
    → soda_can) which poisons the category-level LCA. All eligible senses
    are kept because NLTK's first-sense ordering is by general-corpus
    frequency and often picks the wrong meaning for inventory contexts
    (e.g. "soda" → sodium_carbonate before pop)."""
    eligible = _inventoryable_synsets()
    cands = []
    for tag in item.tags:
        cands.extend(_tag_synsets(tag, eligible))
    if not cands:
        cands.append(_best_synset_for_item(item, wordnet_embeddings))
    return cands


def _ancestors(syns: list) -> dict:
    """Union of hypernym ancestors across `syns`, keyed by the max depth at
    which each ancestor appears in any path."""
    depths: dict = {}
    for syn in syns:
        for path in syn.hypernym_paths():
            for d, anc in enumerate(path):
                if d > depths.get(anc, -1):
                    depths[anc] = d
    return depths


def resolve_category(items: list[Item]) -> str:
    """Hybrid resolver: per item, gather embedding-best + tag synsets, then
    intersect their hypernym ancestors across the batch and return the
    deepest shared ancestor that isn't a useless abstraction."""
    if not items:
        return "Empty"

    wordnet_embeddings = get_wordnet_embeddings()

    if len(items) == 1:
        return _synset_label(_best_synset_for_item(items[0], wordnet_embeddings))

    per_item_ancestors = [
        _ancestors(_item_candidates(it, wordnet_embeddings)) for it in items
    ]
    common = set.intersection(*(set(d) for d in per_item_ancestors))
    common = {s for s in common if s.name() not in USELESS_ANCESTORS}
    if not common:
        return "Item"

    # Prefer the ancestor that is deepest in the *shallowest* item's tree —
    # i.e. the lowest common ancestor we can actually reach from every item.
    best = max(common, key=lambda anc: min(d[anc] for d in per_item_ancestors))
    return _synset_label(best)


if __name__ == "__main__":
    # Diagnostic harness: print per-item synset picks and the resolved category
    # for a few known batches. Handy for regression checks.
    cases = [
        [Item(name="Coca Cola", tags=["drink","soda"]),
         Item(name="Sprite",    tags=["drink","soda"]),
         Item(name="Berliner Kindl", tags=["beer"])],
        [Item(name="hammer", tags=["tool"]),
         Item(name="screwdriver", tags=["tool"])],
        [Item(name="Coca Cola", tags=["drink"]),
         Item(name="hammer", tags=["tool"])],
        [Item(name="hammer", tags=["tool"])],
    ]
    emb = get_wordnet_embeddings()
    for batch in cases:
        picks = [_best_synset_for_item(it, emb).name() for it in batch]
        print(f"{[it.name for it in batch]} -> picks={picks} -> {resolve_category(batch)}")
