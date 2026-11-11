# Cloud Model Deployment Guide: Qwen3-4B + Maths LoRA

This guide provides the exact steps and scripts to deploy your fine-tuned **Qwen3-4B + MathsQwen3-4B-LoRA** model (4-bit NF4 quantized with RAG retrieval) to a 24/7 serverless cloud GPU, freeing your laptop completely.

---

## 1. Step 1: Upload Model Weights to Hugging Face (Private Repo)

To allow cloud GPU instances to load your model on demand, upload your local weights to a private repository on Hugging Face (free, secure, and encrypted).

### Windows 11 PowerShell Commands:

```powershell
# 1. Install Hugging Face Hub CLI in your virtual environment
pip install huggingface_hub

# 2. Login using your Hugging Face Access Token (Write access)
huggingface-cli login
# Paste token from: https://huggingface.co/settings/tokens

# 3. Create a private repository for the LoRA adapter
huggingface-cli repo create MathsQwen3-4B-LoRA --type model --private

# 4. Upload your local trained LoRA adapter (33 MB safetensors)
cd "C:\Users\K.Manoj kumar\OneDrive\Desktop\MathsLLM\models\MathsQwen3-4B-LoRA"
huggingface-cli upload <YOUR_HF_USERNAME>/MathsQwen3-4B-LoRA . . --repo-type model
```

*Note: The base model `Qwen/Qwen2.5-3B-Instruct` or your base `Qwen3-4B` can either be pulled directly from Hugging Face or uploaded to your private account similarly.*

---

## 2. Step 2: Deploy to Modal (Primary Serverless Option — $30/Month Free)

Modal allows you to define cloud GPU containers in pure Python without writing Dockerfiles or managing Kubernetes.

### Create `deploy_modal.py`:

```python
"""
MathTutor Serverless GPU Worker on Modal.
Runs Qwen3-4B in 4-bit NF4 with the Maths LoRA adapter and TF-IDF RAG retrieval.
"""

import modal
from pydantic import BaseModel

# 1. Define container image with PyTorch CUDA and dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch>=2.4.0",
        "transformers>=4.45.0",
        "peft>=0.13.0",
        "bitsandbytes>=0.44.0",
        "accelerate>=1.0.0",
        "scikit-learn>=1.5.0",
        "numpy>=1.26.0",
        "fastapi>=0.115.0",
        "huggingface_hub"
    )
    .add_local_file("retrieval/chunks.jsonl", "/root/chunks.jsonl")
)

app = modal.App("mathtutor-ai", image=image)

class ChatMessage(BaseModel):
    role: str
    content: str

class ProblemContext(BaseModel):
    title: str
    htmlContent: str

class ChatPayload(BaseModel):
    messages: list[ChatMessage]
    problemContext: ProblemContext | None = None

# 2. Model Class with Warm Startup
@app.cls(
    gpu="L4",                      # 24 GB VRAM NVIDIA L4 GPU
    timeout=120,                   # Max 2 minutes execution per request
    scaledown_window=60,           # Keep warm for 60s of inactivity
    secrets=[modal.Secret.from_name("huggingface-secret")]
)
class MathTutorModel:
    @modal.enter()
    def load_model(self):
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
        from peft import PeftModel
        from sklearn.feature_extraction.text import TfidfVectorizer
        import json

        print("[Modal] Initializing Qwen3-4B 4-bit NF4 + LoRA...")

        # A. Load RAG Chunks
        self.chunks = []
        self.texts = []
        with open("/root/chunks.jsonl", "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    self.chunks.append(item)
                    self.texts.append(item.get("text", ""))

        self.vectorizer = TfidfVectorizer(max_features=10000, stop_words="english", ngram_range=(1,2))
        self.tfidf_matrix = self.vectorizer.fit_transform(self.texts)
        print(f"[Modal] RAG index ready with {len(self.chunks)} chunks.")

        # B. Load Tokenizer & Quantized Model
        base_model_id = "Qwen/Qwen2.5-3B-Instruct"  # or your HF repo
        adapter_id = "<YOUR_HF_USERNAME>/MathsQwen3-4B-LoRA"

        self.tokenizer = AutoTokenizer.from_pretrained(base_model_id)

        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True
        )

        base_model = AutoModelForCausalLM.from_pretrained(
            base_model_id,
            quantization_config=bnb_config,
            device_map="auto",
            torch_dtype=torch.float16
        )

        self.model = PeftModel.from_pretrained(base_model, adapter_id)
        self.model.eval()
        print("[Modal] Model loaded into GPU memory.")

    @modal.fastapi_endpoint(method="POST")
    def chat(self, req: ChatPayload):
        import torch
        from sklearn.metrics.pairwise import cosine_similarity

        # 1. RAG Retrieval
        user_msgs = [m for m in req.messages if m.role == "user"]
        query = user_msgs[-1].content if user_msgs else "Math question"

        query_vec = self.vectorizer.transform([query])
        scores = cosine_similarity(query_vec, self.tfidf_matrix)[0]
        top_indices = scores.argsort()[-3:][::-1]

        citations = []
        rag_context = ""
        for idx in top_indices:
            chunk = self.chunks[idx]
            citations.append(f"{chunk.get('chapter', '')} - {chunk.get('title', 'Textbook')}")
            rag_context += f"\n- {chunk.get('text', '')}"

        # 2. Build Prompt
        system = "You are a friendly Class 10 Math Tutor for Samacheer Kalvi. Solve clearly step-by-step using proper LaTeX."
        if req.problemContext:
            system += f"\nContext: {req.problemContext.title}"
        if rag_context:
            system += f"\nReference Material: {rag_context}"

        convo = [{"role": "system", "content": system}]
        for m in req.messages:
            convo.append({"role": "user" if m.role == "user" else "assistant", "content": m.content})

        text = self.tokenizer.apply_chat_template(convo, tokenize=False, add_generation_prompt=True)
        inputs = self.tokenizer(text, return_tensors="pt").to(self.model.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.3,
                top_p=0.9
            )

        gen_tokens = outputs[0][inputs["input_ids"].shape[1]:]
        reply = self.tokenizer.decode(gen_tokens, skip_special_tokens=True).strip()

        return {"reply": reply, "citations": list(set(citations))}
```

### Deploy to Modal from Windows 11:

```powershell
# 1. Install Modal CLI
pip install modal

# 2. Authenticate your computer with Modal
modal setup

# 3. Add your Hugging Face token as a secret in Modal
modal secret create huggingface-secret HF_TOKEN="hf_your_token_here"

# 4. Deploy the app to production
modal deploy deploy_modal.py
```
Modal will output your live HTTPS production URL:  
`https://<YOUR_WORKSPACE>--mathtutor-ai-mathtutormodel-chat.modal.run`

---

## 3. Step 3: Test the Live Cloud GPU Endpoint

Test the deployed endpoint directly from Windows PowerShell:

```powershell
$Headers = @{ "Content-Type" = "application/json" }
$Body = @{
    messages = @(
        @{ role = "user"; content = "If A = {1, 2} and B = {a, b}, find A x B." }
    )
} | ConvertTo-Json -Depth 5

$Response = Invoke-RestMethod -Uri "https://<YOUR_MODAL_URL>" -Method POST -Headers $Headers -Body $Body
Write-Host "Model Answer:" -ForegroundColor Green
Write-Host $Response.reply
Write-Host "Citations:" -ForegroundColor Cyan
Write-Host ($Response.citations -join ", ")
```

When verified, copy this URL into your Vercel project settings as `BACKEND_URL`.

