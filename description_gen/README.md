Example request:

```json
[
  {
    "item_id": "8",
    "name": "USB Cable",
    "amount": 200,
    "available": 195,
    "category": "Accessories",
    "buildingName": "CAB",
    "roomName": "Storage Room"
  },
  {
    "item_id": "8",
    "name": "HDMI Cable",
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
    "category": "Accessories"
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
