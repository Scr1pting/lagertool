import nltk

nltk.download("wordnet")

from collections import defaultdict, deque
from difflib import get_close_matches
from functools import lru_cache, reduce
from itertools import chain
from typing import Iterable

from nltk.corpus import wordnet as wn
from nltk.corpus.reader import Synset


@lru_cache(maxsize=1)
def _noun_lemmas() -> tuple[str, ...]:
    """
    Returns all nouns available in WordNet
    """
    return tuple(wn.all_lemma_names(pos=wn.NOUN))


def _pick_preferred_synset(synsets: list[Synset]) -> Synset:
    # Prefer the most common sense that is still reasonably specific
    return max(
        synsets,
        key=lambda syn: (len(syn.lemma_names()), syn.min_depth()),
    )


def _fuzzy_variations(candidates: Iterable[str]) -> Iterable[str]:
    """
    Yields the 3 closest fuzzy matches in noun_lemmas for each candidate.
    """
    seen: set[str] = set()
    lemma_names = _noun_lemmas()
    for term in candidates:
        # Pick three closest ones (n=3)
        for match in get_close_matches(term, lemma_names, n=3, cutoff=0.84):
            if match not in seen:
                seen.add(match)
                yield match


def _candidate_terms(raw: str) -> Iterable[str]:
    lower = raw.lower().strip()
    normalized = lower.replace("-", " ")
    tokens = [token for token in normalized.split() if token]
    variations: list[str] = [raw, lower]
    if tokens:
        joined = "_".join(tokens)
        variations.append(joined)
        head = tokens[-1]
        variations.append(head)  # fall back to head noun if available
        if len(tokens) >= 2:
            tail = "_".join(tokens[-2:])
            variations.append(tail)
            variations.append(f"computer_{head}")
    for token in tokens:
        lemma = wn.morphy(token, wn.NOUN)
        if lemma:
            variations.append(lemma)
    seen: set[str] = set()
    for candidate in variations:
        if candidate and candidate not in seen:
            seen.add(candidate)
            yield candidate


def pick_synset(term: str) -> Synset | None:
    attempted: list[str] = []
    for candidate in _candidate_terms(term):
        synsets = wn.synsets(candidate, pos=wn.NOUN)
        if synsets:
            return _pick_preferred_synset(synsets)
        attempted.append(candidate)
    for fuzzy in _fuzzy_variations(attempted):
        synsets = wn.synsets(fuzzy, pos=wn.NOUN)
        if synsets:
            return _pick_preferred_synset(synsets)
    return None


def _hypernym_set(synset: Synset) -> set[Synset]:
    # Combine all hypernyms from every path for a broader intersection base
    paths = synset.hypernym_paths()
    return set(chain.from_iterable(paths))


def _hypernym_distances(synset: Synset) -> dict[Synset, int]:
    distances: dict[Synset, int] = {synset: 0}
    queue: deque[Synset] = deque([synset])
    while queue:
        current = queue.popleft()
        base_distance = distances[current]
        for parent in current.hypernyms():
            distance = base_distance + 1
            if parent not in distances or distance < distances[parent]:
                distances[parent] = distance
                queue.append(parent)
    return distances


def shared_hypernym(items: Iterable[str]) -> Synset | None:
    synsets = [pick_synset(item) for item in items]
    if any(syn is None for syn in synsets):
        return None  # at least one item missing a noun sense
    hypernym_sets = [_hypernym_set(syn) | {syn} for syn in synsets if syn]
    commons = reduce(lambda acc, current: acc.intersection(current), hypernym_sets[1:], hypernym_sets[0])
    return max(commons, key=lambda syn: syn.min_depth()) if commons else None


def shared_hypernym_label(items: Iterable[str]) -> str | None:
    synset = shared_hypernym(items)
    if synset is None:
        return None
    lemma = next((name for name in synset.lemma_names() if name), None)
    label = lemma or synset.name().split(".")[0]
    cleaned = label.replace("_", " ")
    return cleaned.title()


def hypernym_consensus_label(items: Iterable[str], min_support: float = 0.6) -> str | None:
    synsets = [pick_synset(item) for item in items if item]
    filtered = [syn for syn in synsets if syn is not None]
    if not filtered:
        return None

    support: defaultdict[Synset, set[int]] = defaultdict(set)
    distance_totals: defaultdict[Synset, int] = defaultdict(int)

    for index, synset in enumerate(filtered):
        distances = _hypernym_distances(synset)
        for hypernym, distance in distances.items():
            support[hypernym].add(index)
            distance_totals[hypernym] += distance

    if not support:
        return None

    total = len(filtered)
    scored: list[tuple[float, tuple[float, float, float, float], Synset]] = []
    for hypernym, indices in support.items():
        support_ratio = len(indices) / total
        average_distance = distance_totals[hypernym] / len(indices)
        key = (
            support_ratio,
            float(hypernym.min_depth()),
            -average_distance,
            float(len(hypernym.lemma_names())),
        )
        scored.append((support_ratio, key, hypernym))

    if not scored:
        return None

    eligible = [entry for entry in scored if entry[0] >= min_support]
    candidates = eligible or scored

    _, _, best_synset = max(candidates, key=lambda item: item[1])

    if best_synset.min_depth() <= 1 and eligible:
        deeper_candidates = [entry for entry in eligible if entry[2].min_depth() > 1]
        if deeper_candidates:
            _, _, best_synset = max(deeper_candidates, key=lambda item: item[1])

    lemma = next((name for name in best_synset.lemma_names() if name), None)
    label = lemma or best_synset.name().split(".")[0]
    cleaned = label.replace("_", " ")
    return cleaned.title()


if __name__ == "__main__":
    items = ["Wireless mouse", "Mechanical keyboard", "External hard drive"]
    consensus = hypernym_consensus_label(items)
    print("Consensus category:", consensus or "No consensus found.")
