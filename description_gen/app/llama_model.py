from llama_cpp import Llama
from app.config import MODEL_PATH, MAX_TOKENS

# Load model once at startup
llm = Llama(model_path=MODEL_PATH)

def generate_description(name: str, item_type: str) -> str:
    prompt = f"Generate a short, clear, engaging description for an item: {name} ({item_type})"
    output = llm(prompt=prompt, max_tokens=MAX_TOKENS)
    return output["choices"][0]["text"].strip()
