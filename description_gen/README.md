# Description Gen

Standalone FastAPI service that suggests a category label for a batch of
inventory items. Strategy: embed each item with a sentence transformer
(`mixedbread-ai/mxbai-embed-large-v1`), pick its closest WordNet noun synset,
then walk hypernym paths to find the deepest shared ancestor across the batch.

## Run locally

```zsh
cd description_gen
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8080
```

Or via the project-wide dev script:

```zsh
./scripts/run_all.dev.sh
```

### First-run cost

On first start the service:

1. Downloads the NLTK WordNet corpus (~30 MB, one-time).
2. Downloads the sentence-transformer model from HuggingFace (~1.3 GB, one-time, cached under `~/.cache/huggingface/`).
3. Builds embeddings for every filtered noun synset (~tens of thousands of items) and writes them to `.cache/wordnet_embeddings.pt`. This takes several minutes on CPU and is the longest step.

Subsequent starts load the cached embeddings and come up in under a minute.

## Endpoint

`POST /generate`

```json
[
  { "name": "Coca Cola", "tags": ["drink", "soda"] },
  { "name": "Sprite",    "tags": ["drink", "soda"] },
  { "name": "Berliner Kindl", "tags": ["beer"] }
]
```

Response:

```json
{ "category": "Beverage" }
```

(Exact label depends on the WordNet hypernym hierarchy.)
