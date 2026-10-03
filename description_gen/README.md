# Description Gen

Standalone FastAPI service that suggests a category label for a batch of
inventory items. Matches items (via sentence embeddings) against a curated
list of ~60 inventory categories in `app/categories.json` and returns the
highest-scoring one — or `Other` when no category is a confident match.

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

On first start the service downloads the sentence-transformer model from
HuggingFace (`mixedbread-ai/mxbai-embed-large-v1`, ~1.3 GB, one-time,
cached under `~/.cache/huggingface/`). It then encodes the ~60 categories
in `categories.json` and caches them to `app/categories.embeddings.pt`.
Subsequent starts skip both and come up in seconds.

The category cache rebuilds automatically when `categories.json` is newer
than `categories.embeddings.pt` — edit the JSON freely, no manual step.

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
{ "category": "Beverages" }
```

## Editing categories

`app/categories.json` is the source of truth. Each entry has:

```json
{
  "name": "Beverages",
  "description": "Drinks of any kind, hot or cold, alcoholic or not.",
  "examples": ["Coca Cola", "Sprite", "beer", "coffee", "tea"]
}
```

The `examples` list matters most for matching quality — adding the brand
names and edge-case items you actually stock makes recognition robust.

## Diagnostics

Print the top-3 categories and similarity scores for a fixed test battery:

```zsh
uv run python -m app.category_resolver
```

Force a cache rebuild (e.g. after a model change):

```zsh
uv run python -m app.category_resolver --rebuild-cache
```

If a real-world batch returns `Other` and you think it shouldn't, run the
diagnostic and look at the top-3 scores. If the right category is the
second pick with a near-tied score, that category needs better examples.
If nothing is above `CONFIDENCE_THRESHOLD` (0.55 by default, top of
`category_resolver.py`), you're missing a category — add it.
