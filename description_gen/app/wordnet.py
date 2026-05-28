from functools import lru_cache

import nltk
from nltk.corpus import wordnet as wn


def ensure_wordnet() -> None:
    try:
        nltk.data.find("corpora/wordnet")
    except LookupError:
        nltk.download("wordnet")


ensure_wordnet()


@lru_cache(maxsize=1)
def noun_lemmas() -> tuple[str, ...]:
    """
    Returns a cached version of all nouns available in WordNet.
    Uses a tuple b/c it's leaner and immutable.
    """
    return tuple(wn.all_lemma_names(pos=wn.NOUN))


@lru_cache(maxsize=1)
def _noun_entries() -> tuple[tuple, ...]:
    """
    Returns cached (synset, text) pairs for noun senses under `object.n.01`,
    excluding people and animals. A synset may appear twice — once with
    examples appended and once without — to give the embedding model more
    surface forms to match against.
    """
    entries: list[tuple] = []

    object_synset = wn.synset('object.n.01')
    person_synset = wn.synset('person.n.01')
    animal_synset = wn.synset('animal.n.01')

    object_descendants = set(object_synset.closure(lambda s: s.hyponyms()))
    person_descendants = set(person_synset.closure(lambda s: s.hyponyms()))
    animal_descendants = set(animal_synset.closure(lambda s: s.hyponyms()))

    for syn in wn.all_synsets(pos=wn.NOUN):
        if (syn not in object_descendants
            or syn in person_descendants
            or syn in animal_descendants):
            continue

        name = syn.name().replace("_", " ")
        definition = syn.definition()
        examples = [ex for ex in syn.examples() if len(ex) <= 120][:2]
        if examples:
            entries.append((syn, f"{name}. {definition}. Examples: {' , '.join(examples)}"))
        entries.append((syn, f"{name}. {definition}"))

    return tuple(entries)


@lru_cache(maxsize=1)
def noun_meanings() -> tuple[str, ...]:
    """Just the text column of `_noun_entries()`, parallel to noun_synsets()."""
    return tuple(text for _, text in _noun_entries())


@lru_cache(maxsize=1)
def noun_synsets() -> tuple:
    """The synset column of `_noun_entries()`, parallel to noun_meanings()."""
    return tuple(syn for syn, _ in _noun_entries())
