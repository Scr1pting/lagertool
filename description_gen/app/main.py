from fastapi import FastAPI
from app.schemas import ItemList, CategoryResponse
from app.wordnet_search import get_wordnet_embeddings, resolve_category

app = FastAPI(title="Virtual Shelf Description API")


@app.on_event("startup")
def _warm_cache() -> None:
    get_wordnet_embeddings()


@app.post("/generate", response_model=CategoryResponse)
def generate(items: ItemList):
    return CategoryResponse(category=resolve_category(items))
