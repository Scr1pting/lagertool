from functools import lru_cache

from nltk.corpus import wordnet as wn


@lru_cache(maxsize=1)
def noun_lemmas() -> tuple[str, ...]:
    """
    Returns a cached version of all nouns available in WordNet.
    Uses a tuple b/c it's leaner and immutable.
    """
    return tuple(wn.all_lemma_names(pos=wn.NOUN))


@lru_cache(maxsize=1)
def noun_meanings(min_freq: int = 5) -> tuple[str, ...]:
    """
    Returns cached noun senses paired with their WordNet gloss.
    The tuple key uses the synset name to keep homonyms separate.
    """
    meanings: list[str] = []

    for synset in wn.all_synsets(pos=wn.NOUN):
        max_freq = max((lemma.count() for lemma in synset.lemmas()), default=0)
        if max_freq < min_freq:
            continue  # skip rarely used senses

        name = synset.name().replace("_", " ")
        definition = synset.definition()
        examples = [ex for ex in synset.examples() if len(ex) <= 120][:2]
        if examples:
            meanings.append(f"{name}. {definition}. Examples: {' , '.join(examples)}")
        meanings.append(f"{name}. {definition}")

    return tuple(meanings)
