from pathlib import Path
import numpy as np
import torch
import inflect

from sentence_transformers import SentenceTransformer

from functools import lru_cache
from itertools import batched

from wordnet import noun_meanings


MODEL_PATH = "mixedbread-ai/mxbai-embed-large-v1"
EMB_PATH = Path(".cache/wordnet_embeddings.pt")


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


def get_item_names_embeddings(item_names: list[str]):  
    queries: list[str] = []

    def _convert_words(name: str, fn) -> str:
        """Apply `fn` to each whitespace-separated token in `name`, falling back to
        the original token when `fn` returns falsy (e.g. None)."""
        parts = name.split()
        if not parts:
            return name
        return " ".join((fn(w) or w) for w in parts)

    for name in item_names:
        term_singular = _convert_words(name, p.singular_noun)
        term_plural = _convert_words(name, p.plural_noun)

        print(term_singular)
        print(term_plural)

        queries.append(name)
        queries.append(f"The university supplied us with {term_singular} for the event.")
        queries.append(f"We took {p.a(term_singular)} {term_singular} from the shelf.")
        queries.append(f"The {p.a(term_singular)} {term_singular} from the shelf.")
        queries.append(
            f"I bought {p.a(term_singular)} {term_singular}."
        )

    return model.encode(
        queries,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )


def find_closest_lemma(item_names: list[str], top_k: int = 10) -> list[tuple[str, float]]:
    """Return the closest WordNet lemmas to the provided term."""
    lemmas = noun_meanings()
    
    # Generate embeddings for term and WordNet
    wordnet_embeddings = get_wordnet_embeddings()
    item_embeddings = get_item_names_embeddings(item_names)

    # Find closest WordNet match
    # = cos similarity (both are normalized)
    # Compute cosine similarity matrix: (N x M)
    cos_sim_matrix = wordnet_embeddings @ item_embeddings.T

    # Average similarity for each WordNet vector across all inventory items
    mean_similarities = cos_sim_matrix.mean(axis=1)

    # Get the index of the most similar WordNet word
    best_idx = np.argmax(mean_similarities)

    k = min(top_k, len(mean_similarities))
    top_indices = np.argpartition(mean_similarities, -k)[-k:]

    return [(lemmas[idx], float(mean_similarities[idx])) for idx in top_indices]


if __name__ == "__main__":
    print(find_closest_lemma(["Sprite", "El Tony Mate"]))
