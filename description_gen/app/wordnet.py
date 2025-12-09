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
def noun_meanings() -> tuple[str, ...]:
    """
    Returns cached noun senses paired with their WordNet gloss.
    The tuple key uses the synset name to keep homonyms separate.
    """
    meanings: list[str] = []

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
            meanings.append(f"{name}. {definition}. Examples: {' , '.join(examples)}")
        meanings.append(f"{name}. {definition}")

    return tuple(meanings)
