# Production Readiness & Component Checklist

This checklist defines every verification step required before opening the **MathTutor** platform to real students.

---

## 1. Frontend & Client-Side Verification

- [x] **Next.js Production Build:** `npm run build` completes with 0 errors and generates 972 static pages and dynamic routes.
- [x] **Linting & Code Quality:** `npx eslint .` passes with 0 warnings or errors.
- [x] **TypeScript Type Checking:** Full compilation without type assertions (`tsc --noEmit`).
- [x] **PWA Web App Manifest:** `manifest.ts` returns valid JSON with `name`, `short_name`, `theme_color`, and `icons`.
- [x] **Service Worker & Offline Fallback:** `/sw.js` caches static assets and serves `/offline.html` during network disconnections while bypassing `/api/*`.
- [x] **Responsive Mobile Layout:** Verified on viewport widths 360px (Android entry), 390px (iPhone), 768px (iPad/Tablet), and 1440px (Desktop).
- [x] **Formula Rendering:** MathJax correctly typesets inline expressions ($f(x) = x^2$) and multiline block derivations.
- [x] **Chatbot Drawer UX:** Smooth animation, mobile auto-scroll to bottom, sticky input, non-blocking floating toggle.
- [x] **Client Fetch Helper:** All client API calls route through `NEXT_PUBLIC_API_BASE`.

---

## 2. AI Inference & Model Verification

- [x] **Base Model Integrity:** `models/Qwen3-4B` config and safetensors verified locally.
- [x] **LoRA Adapter Weights:** `models/MathsQwen3-4B-LoRA/adapter_model.safetensors` (33 MB) matches `adapter_config.json` target modules (`q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`).
- [x] **BitsAndBytes 4-Bit NF4 Compatibility:** Model loads within **2.8 GB VRAM** in float16 compute dtype.
- [x] **RAG Retrieval Engine:** `retrieval/chunks.jsonl` contains 3,886 indexed textbook chunks; TF-IDF vectorizer builds index in < 1.2 seconds.
- [x] **Chat Template Compliance:** ChatML template properly inserts `<|im_start|>system`, `<|im_start|>user`, and `<|im_start|>assistant` tags.
- [ ] **Cloud Containerization:** Dockerfile built with CUDA 12.1 + PyTorch 2.4 + Hugging Face Transformers.
- [ ] **Inference Service Health Check:** `GET /health` endpoint reporting `{"status": "ok", "gpu_available": true}`.
- [ ] **Request Queue & Timeout:** Server rejects or queues requests exceeding capacity rather than causing CUDA Out-Of-Memory (OOM).

---

## 3. Database, Session & Authentication Verification

- [x] **Schema Definition:** `db/schema.sql` defines `users`, `user_sessions`, `chat_sessions`, and `chat_messages`.
- [x] **Password Hashing:** Argon2id with memory cost 19,456 KB, 2 iterations, 1 parallelism thread.
- [x] **Session Cookie Security:** HttpOnly, SameSite=Lax, Secure flag for HTTPS production.
- [x] **Session Invalidation:** Logout endpoint marks session as revoked in the database.
- [x] **Role Authorization:** Protected routes check `currentUser.role === 'ADMIN'` before exposing admin metrics.
- [x] **Database Fallback:** If `DATABASE_URL` is omitted, system gracefully falls back to local JSON store without crashing chat.
- [ ] **Cloud Database Migration:** Execute `npm run db:migrate` against production Neon/Supabase PostgreSQL.
- [ ] **Production Admin Seed:** Execute `npm run seed:admin` with a strong random production master password.

---

## 4. API Gateway & Security Verification

- [x] **Rate Limiting (Per-IP):** 20 requests per 10 minutes enforced via sliding window, returning HTTP 429 with retry headers.
- [x] **Message Length Guard:** Rejects messages > 2,000 characters with HTTP 400.
- [x] **History Length Guard:** Rejects conversation history > 20 messages with HTTP 400.
- [x] **Error Trace Masking:** Database connection failures and model timeouts logged server-side only; users receive sanitized error messages.
- [x] **Route Timeout Configuration:** `export const maxDuration = 60` and `export const runtime = 'nodejs'` set on API route.
- [ ] **Production CORS Whitelist:** Allowed origins restricted to production Vercel domain, `capacitor://localhost`, and `http://localhost`.
- [ ] **Environment Variable Audit:** Verified that `.env` files are in `.gitignore` and credentials exist exclusively in Vercel / RunPod dashboards.

---

## 5. Third-Party Cloud Accounts Required

| Account | Purpose | Tier | Free Allowance | Setup Action |
|---|---|---|---|---|
| **GitHub** | Code repository & Vercel deployment hook | Free | Unlimited public/private repos | Push production branch. |
| **Vercel** | Next.js frontend hosting & serverless routes | Hobby (Free) | 100 GB bandwidth, 100k edge invocations/day | Link GitHub repo. |
| **RunPod / Modal** | Serverless GPU inference for Qwen3-4B LoRA | Pay-as-you-go | ₹400 ($5) initial credit on signup | Create account, add billing. |
| **Hugging Face** | Private storage for base model and LoRA weights | Free | Unlimited private models under 50 GB | Create private repo, generate Read token. |
| **Neon Tech** | Cloud Serverless PostgreSQL database | Free Tier | 0.5 GB storage, autoscaling compute | Create `mathtutor_db`, copy connection string. |
| **Upstash** | Serverless Redis for distributed rate limiting | Free Tier | 10,000 requests/day | Create Redis database, copy REST credentials. |

