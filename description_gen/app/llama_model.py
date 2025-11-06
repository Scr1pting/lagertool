from llama_cpp import Llama
from app.config import MODEL_PATH, MAX_TOKENS

# Load model once at startup
llm = Llama(model_path=MODEL_PATH)


def generate_category(item_names: list[str]) -> str:
    if not item_names:
        return "Uncategorized"

    item_list = "\n".join(f"- {name}" for name in item_names)
    prompt = (
        "You are an inventory classification assistant. "
        "Return exactly one concise category label (maximum three words) that best describes all items. "
        "Do not repeat the inputs, do not add commentary, and never output more than one label. "
        "If items clearly do not share a theme, answer 'Mixed Items'.\n\n"
        "Example:\n"
        "Items:\n- Coca-Cola Bottle\n- Diet Coke Can\nCategory: Soft Drinks\n\n"
        "Example:\n"
        "Items:\n- USB-C Hub\n- HDMI Cable 2m\nCategory: Accessories\n\n"
        "Example:\n"
        "Classify the following list:\n\n"
        "Items:\n"
        f"{item_list}\n"
        "Category:"
    )
    output = llm(
        prompt=prompt,
        max_tokens=MAX_TOKENS,
        temperature=0.0,
        top_p=0.9,
        stop=["\n"]
    )
    return output["choices"][0]["text"].strip(" :\n")
