from fastapi import FastAPI
from app.schemas import ItemList, CategoryResponse
from app.llama_model import generate_category

app = FastAPI(title="Virtual Shelf Description API")

@app.post("/generate", response_model=CategoryResponse)
def generate(items: ItemList):
    item_names = [item.name for item in items]
    category = generate_category(item_names)
    return CategoryResponse(category=category)
