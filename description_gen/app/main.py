from fastapi import FastAPI
from app.schemas import ItemList, CategoryResponse
from app.category_resolver import CategoryResolver

resolver = CategoryResolver()
app = FastAPI(title="Virtual Shelf Description API")


@app.post("/generate", response_model=CategoryResponse)
def generate(items: ItemList):
    return CategoryResponse(category=resolver.resolve(items))
