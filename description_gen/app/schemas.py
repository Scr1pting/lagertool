from typing import List

from pydantic import BaseModel


class Item(BaseModel):
    name: str


ItemList = List[Item]


class CategoryResponse(BaseModel):
    category: str
