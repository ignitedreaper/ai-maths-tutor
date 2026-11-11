# Backend Deployment & API Gateway Configuration

This document covers the production deployment and security hardening of the backend API services (Next.js Route Handlers and FastAPI).

---

## 1. Dual Backend Architecture Explained

The MathTutor platform uses an intelligent **two-tier backend design**:
1. **Tier 1: Next.js API Gateway (Edge/Serverless on Vercel)**
   - Endpoints: `/api/auth/*`, `/api/admin/*`, `/api/chat`
   - Handles student authentication, Argon2id password verification, session cookies, Upstash rate limiting, payload validation, and database operations.
   - Shields the AI model from unauthorized or abusive requests.
2. **Tier 2: AI Inference Backend (FastAPI on Cloud GPU)**
   - Endpoint: `POST /api/chat`
   - Handles TF-IDF RAG retrieval and GPU execution of the fine-tuned Qwen3-4B LoRA model.
   - Accessible only by the Next.js API Gateway via a shared secret or private network.

---

## 2. Dockerizing the FastAPI Service (Standalone Container Option)

If you prefer deploying the FastAPI backend as a standalone container on RunPod Pods, Render, or Railway, use the following production Dockerfile.

### `Dockerfile`:

```dockerfile
# Base image with CUDA 12.1 and Python 3.11
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

# Avoid interactive prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-dev \
    python3-pip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Link python3 to python
RUN ln -sf /usr/bin/python3.11 /usr/bin/python

# Install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source and RAG chunks
COPY app/ ./app/
COPY retrieval/ ./retrieval/

# Expose port 8000
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Launch with Uvicorn production settings
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

---

## 3. Production Hardening in `src/app/api/chat/route.ts`

The Next.js chat route handler has been hardened with:
- **`export const maxDuration = 60`**: Prevents Vercel serverless function timeouts on long derivations.
- **`export const runtime = 'nodejs'`**: Ensures full Node.js crypto and connection pooling compatibility.
- **Per-IP Rate Limiting:** 20 requests per 10 minutes via Upstash Redis REST (`HTTP 429` with retry headers).
- **Body Validation:** Rejects payloads where individual messages exceed 2,000 characters or history exceeds 20 messages (`HTTP 400`).
- **Error Masking:** Raw database errors, AWS connection traces, and CUDA OOM messages are logged only to Vercel Logs; the student receives a clean, friendly notice.

---

## 4. Connecting Next.js to Cloud FastAPI

Once the cloud FastAPI endpoint is deployed (e.g. `https://your-gpu-service.modal.run`), set the following environment variable in your Vercel Dashboard:

```env
BACKEND_URL=https://your-gpu-service.modal.run
```

When `BACKEND_URL` is set, `MathTutor/src/app/api/chat/route.ts` automatically forwards validated user questions to your cloud model and receives step-by-step solutions with citations.

