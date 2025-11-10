from pathlib import Path
import numpy as np
import torch
import inflect

from sentence_transformers import SentenceTransformer

from functools import lru_cache
from itertools import batched

from wordnet import noun_meanings


MODEL_PATH = "BAAI/bge-large-en-v1.5"
EMB_PATH = Path(".cache/wordnet_embeddings.pt")


def _detect_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"

model = SentenceTransformer(MODEL_PATH, device=_detect_device())


@lru_cache(maxsize=1)
def get_wordnet_embeddings(batch_size: int = 32) -> tuple[tuple[str, ...], np.ndarray]:
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


# TODO: embed both just the word and the word plus some context
def find_closest_lemma(term: str, top_k: int = 1) -> list[tuple[str, float]]:
    """Return the closest WordNet lemmas to the provided term."""
    lemmas = noun_meanings()

    # Singularize and lowercase term
    p = inflect.engine()
    term = p.singular_noun(term) or term  # TODO: do on each word separately
    term

    # Generate embeddings for term and WordNet
    embeddings = get_wordnet_embeddings()
    query = model.encode(
        term,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    # Find closest WordNet match
    scores = embeddings @ query  # = cos similarity (both are normalized)
    k = min(top_k, len(scores))
    top_indices = np.argpartition(scores, -k)[-k:]
    sorted_indices = top_indices[np.argsort(scores[top_indices])[::-1]]

    return [(lemmas[idx], float(scores[idx])) for idx in sorted_indices]


if __name__ == "__main__":
    print(find_closest_lemma("Coke"))
