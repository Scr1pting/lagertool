from fastapi import FastAPI
from app.schemas import Item, DescriptionResponse
from app.llama_model import generate_description

app = FastAPI(title="Virtual Shelf Description API")

@app.post("/generate", response_model=DescriptionResponse)
def generate(item: Item):
    description = generate_description(item.name, item.type)
    return DescriptionResponse(description=description)
