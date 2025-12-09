Example request to `localhost:8080/generate`:

```json
[
  {
    "item_id": "8",
    "name": "Coca cola",
    "amount": 200,
    "available": 195,
    "category": "Accessories",
    "buildingName": "CAB",
    "roomName": "Storage Room"
  },
  {
    "item_id": "8",
    "name": "Berliner Kindl",
    "amount": 200,
    "available": 195,
    "category": "Accessories",
    "buildingName": "CAB",
    "roomName": "Storage Room"
  },
  {
    "item_id": "8",
    "name": "Tequilla",
    "amount": 200,
    "available": 195,
    "category": "Accessories",
    "buildingName": "CAB",
    "roomName": "Storage Room"
  }
]
```

Response:
```json
{
    "category": "Beverages"
}
```



Gemma-3-1b-it-Q4_K_M:
```zsh
curl -L \
  "https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf?download=1" \
  -o ./models/gemma-3-1b-it-Q4_K_M.gguf
```

Qwen2.5-1.5b-instruct-q4_k_m
```zsh
curl -L \
  "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf?download=1" \
  -o ./models/qwen2.5-1.5b-instruct-q4_k_m.gguf
```

```zsh
curl -L \
  -H "Authorization: Bearer YOUR_HF_TOKEN" \
  "https://huggingface.co/paultimothymooney/Qwen2.5-7B-Instruct-Q4_K_M-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf?download=1" \
  -o ./models/qwen2.5-7b-instruct-q4_k_m.gguf
```
