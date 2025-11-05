from pydantic import BaseModel

class Item(BaseModel):
    name: str
    type: str

class DescriptionResponse(BaseModel):
    description: str
