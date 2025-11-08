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
    Returns a cached version of all nouns available in WordNet.
    Uses a tuple b/c it's leaner and immutable.
    """
    return tuple(wn.all_lemma_names(pos=wn.NOUN))

"""Plan:
- Clean and split words
- Search in Wordnet
  - Not found: fuzzy search
- 
"""
