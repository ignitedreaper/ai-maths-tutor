# Production Cloud Architecture: 24/7 AI Maths Tutor

This document defines the production cloud architecture for MathTutor, designed to operate **24/7 with 99.9% availability without requiring any local laptop or local GPU execution**, while remaining strictly within the one-time **₹20,000 INR** launch budget.

---

## 1. High-Level Architectural Diagram

```mermaid
flowchart TD
    subgraph Clients["Student & Admin Clients (Cross-Platform)"]
        WebDesktop["Desktop Browser (Chrome/Firefox/Edge)"]
        WebMobile["Mobile Browser (Chrome/Safari)"]
        PWA["Installed PWA (Android / iOS / Windows)"]
        FutureApp["Future Capacitor Native App"]
    end

    subgraph CDN_Edge["Vercel Global Edge Network (Frontend & Gateway)"]
        EdgeCDN["Vercel Global Edge CDN (Static Assets & PWA Shell)"]
        NextServerless["Next.js 16 App Router (Serverless Functions)"]
        NextAuth["Auth & Session Validation (Argon2id / Cookies)"]
        NextRateLimit["Rate Limiter Gateway (20 req / 10 min)"]
    end

    subgraph CloudData["Managed Cloud Persistence Layer"]
        NeonDB[("Neon Serverless PostgreSQL\n(Users, Sessions, History)")]
        UpstashRedis[("Upstash Redis REST\n(Distributed IP Rate Limiting)")]
    end

    subgraph CloudAI["Cloud GPU Inference Layer (Scale-to-Zero)"]
        RunPodRouter["RunPod Serverless / Modal Gateway"]
        subgraph GPUWorker["Secure GPU Container (RTX 4090 / L4 / A10G)"]
            FastAPIServer["FastAPI Application"]
            TFIDFRAG["TF-IDF RAG Engine\n(3,886 chunks.jsonl)"]
            BitsAndBytes["BitsAndBytes 4-bit NF4 Engine"]
            BaseModel["Qwen3-4B Base Weights"]
            LoRAAdapter["MathsQwen3-4B-LoRA Adapter"]
        end
    end

    subgraph ModelStorage["Secure Model Repository"]
        HuggingFace[("Private Hugging Face Repo\n(Base Model & Trained LoRA Weights)")]
    end

    %% Client Traffic
    WebDesktop -->|HTTPS / WSS| EdgeCDN
    WebMobile -->|HTTPS / WSS| EdgeCDN
    PWA -->|HTTPS / WSS| EdgeCDN
    FutureApp -->|HTTPS / REST| NextServerless

    %% Edge Routing
    EdgeCDN --> NextServerless
    NextServerless --> NextAuth
    NextServerless --> NextRateLimit

    %% Data Connections
    NextRateLimit -->|REST HTTP| UpstashRedis
    NextAuth -->|TLS Connection Pool| NeonDB
    NextServerless -->|Async Chat Logging| NeonDB

    %% Inference Call
    NextServerless -->|Secure HTTPS Bearer Token| RunPodRouter
    RunPodRouter --> FastAPIServer
    FastAPIServer --> TFIDFRAG
    FastAPIServer --> BitsAndBytes
    BitsAndBytes --- BaseModel
    BitsAndBytes --- LoRAAdapter

    %% Model Provisioning
    HuggingFace -.->|Initial Build / Network Mount| GPUWorker
```

---

## 2. End-to-End Request Flow & Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (Web / PWA)
    participant Vercel as Vercel Edge / Next.js
    participant Upstash as Upstash Redis
    participant Neon as Neon PostgreSQL
    participant GPU as Cloud GPU Worker (RunPod / Modal)

    Student->>Vercel: POST /api/chat {messages, problemContext, sessionId}
    activate Vercel

    Note over Vercel,Upstash: 1. Distributed Rate Limiting
    Vercel->>Upstash: Check IP sliding window (20 req / 10 min)
    Upstash-->>Vercel: {allowed: true, remaining: 18}

    Note over Vercel: 2. Input Security Validation
    Vercel->>Vercel: Validate max 2,000 chars, max 20 messages, sanitize inputs

    Note over Vercel,GPU: 3. Cloud GPU Inference Invocation
    Vercel->>GPU: POST /api/chat (Bearer Token Auth)
    activate GPU

    Note over GPU: 4. RAG Retrieval
    GPU->>GPU: TF-IDF vectorizer queries 3,886 chunks
    GPU->>GPU: Extract top 3 relevant sections & citations

    Note over GPU: 5. Quantized QLoRA Generation
    GPU->>GPU: Build ChatML Prompt + Page Context + RAG Chunks
    GPU->>GPU: Qwen3-4B + Maths LoRA (temp 0.3, max 512 tokens)
    GPU-->>Vercel: {reply: string, citations: [string]}
    deactivate GPU

    Note over Vercel,Neon: 6. Asynchronous Persistence
    par Save to Database
        Vercel-)Neon: saveExchange(sessionId, userText, reply, modelId, latency)
    and Stream to Student
        Vercel-->>Student: HTTP 200 {reply: markdown/LaTeX, citations}
    end
    deactivate Vercel

    Note over Student: 7. Client Typesetting
    Student->>Student: MathJax typesets LaTeX formulas & renders citations
```

---

## 3. Technology Stack Specification

| Tier | Component | Technology Selected | Justification |
|---|---|---|---|
| **Frontend Web** | UI Framework | **Next.js 16 (App Router) + React 19** | Zero-downtime static and dynamic rendering, native TypeScript 5, built-in edge optimizations. |
| **Styling & Icons** | Design System | **Tailwind CSS 4 + Lucide React** | Low bundle overhead, atomic responsive classes, instant mobile adaptability. |
| **Formula Engine** | LaTeX Typesetting | **MathJax v3 (Dynamic Loader)** | Crisp client-side SVG rendering of algebraic fractions, matrices, square roots, and summations. |
| **Frontend Hosting** | Cloud PaaS | **Vercel Hobby / Pro** | Global edge network, automatic SSL certificates, native Next.js Turbopack integration. |
| **API Gateway** | Micro-Backend | **Next.js Route Handlers (`src/app/api`)** | Secure proxy between students and backend infrastructure, keeping backend API keys concealed. |
| **AI Inference** | Model Server | **FastAPI 0.115 + Uvicorn** | Asynchronous request handling, fast startup, lightweight footprint. |
| **Cloud GPU Host** | Compute Provider | **RunPod Serverless / Modal** | **True scale-to-zero**: ₹0 charged when no student is chatting. Cold starts < 12 seconds. |
| **GPU Hardware** | Cloud Accelerator | **NVIDIA RTX 4090 (24 GB) / L4 (24 GB)** | 24 GB VRAM accommodates 4-bit Qwen3-4B (3 GB) and easily handles 10+ concurrent generation streams. |
| **Database** | Relational Store | **Neon PostgreSQL (Serverless)** | Generous free tier (0.5 GB storage, autoscaling compute), native SSL connection pooling via `pg.Pool`. |
| **Rate Limiter** | Caching Layer | **Upstash Redis (Serverless REST)** | Sub-millisecond global sliding window checks, zero server management, generous free quota (10,000 req/day). |
| **Model Weights** | Artifact Storage | **Hugging Face Private Hub / Network Volume** | Secure, version-controlled storage for base weights and LoRA checkpoint safetensors. |

---

## 4. Cold-Start Mitigation & Concurrency Strategy

1. **Model Weights Caching:** By mounting a persistent network volume (`/workspace/models`) on RunPod, the container does not need to download the base 4B model on each scale-up, cutting cold start time from 85 seconds down to **8–12 seconds**.
2. **FastAPI Lifespan Pre-Warming:** During container boot, a dummy inference query ("Calculate 2+2") is executed through `model.generate()`. This compiles PyTorch CUDA kernels before accepting external student traffic.
3. **Keep-Warm Cron (School Hours):** An automated scheduled ping every 10 minutes between 8:00 AM and 9:00 PM IST keeps 1 worker warm, ensuring zero latency during peak student study times at negligible cost (~₹180/month).

