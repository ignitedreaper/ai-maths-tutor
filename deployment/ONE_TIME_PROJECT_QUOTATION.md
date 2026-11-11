# One-Time Project Implementation & Deployment Quotation

**Client:** MathTutor Project Owner  
**Project:** AI Maths Tutor Public Launch Preparation (Next.js 16 + Qwen3-4B LoRA)  
**Budget Constraint:** **Maximum ₹20,000 INR (Strict One-Time Cap)**  
**Pricing Currency:** Indian Rupee (INR)  
**Validity:** 30 Days  

---

## 1. Itemized Implementation Quotation Table

| Work item | Description | Actual Provider Charges (Setup) | Implementation & Config Fee | Estimated one-time cost |
|---|---|---:|---:|---:|
| **Existing project audit** | Comprehensive deep-dive audit of Next.js 16 frontend, FastAPI backend, Qwen3-4B LoRA weights, and database scripts. | ₹0 | ₹1,500 | ₹1,500 |
| **Frontend production preparation** | Production Next.js Turbopack build optimization, PWA service worker caching rules, responsive layout verification across mobile devices. | ₹0 (Vercel Free) | ₹2,000 | ₹2,000 |
| **Backend preparation** | Decoupling FastAPI from Windows paths, adding Linux container support, request queue guards, CORS origin handling, and `/health` monitoring. | ₹0 | ₹2,500 | ₹2,500 |
| **Model deployment** | Packaging Qwen3-4B 4-bit NF4 + Maths LoRA onto cloud serverless GPU (Modal / RunPod), configuring cold-start mitigations, and initial GPU testing credits. | ₹500 (GPU test credits) | ₹3,000 | ₹3,500 |
| **Model storage configuration** | Creating private Hugging Face repository, uploading base model and LoRA adapter (33 MB safetensors), and setting up automated cloud pull. | ₹0 (HF Free) | ₹1,000 | ₹1,000 |
| **Database setup** | Provisioning Neon Serverless PostgreSQL, executing `schema.sql` migration, tuning foreign key indexes, and configuring connection pooling. | ₹0 (Neon Free) | ₹2,000 | ₹2,000 |
| **Authentication and security** | Hardening Argon2id password hashing, HttpOnly session cookie enforcement, Upstash Redis rate limiting gateway, and raw error trace masking. | ₹0 (Upstash Free) | ₹2,000 | ₹2,000 |
| **Domain and deployment setup** | Registering custom domain (e.g. `mathtutor.in` / `mathtutor.online` for 1 year), configuring DNS records, HTTPS SSL certificates, and Vercel routing. | ₹600 (Domain purchase) | ₹900 | ₹1,500 |
| **Testing** | End-to-end functional testing across all 8 syllabus units, 5 interactive visualizers, student registration, login, and chatbot math accuracy. | ₹0 | ₹1,500 | ₹1,500 |
| **Load testing** | Concurrency profiling under simulated loads (5, 10, 25 simultaneous math questions), measuring VRAM consumption, queue latency, and failure rates. | ₹200 (Load test GPU) | ₹800 | ₹1,000 |
| **Documentation** | Authoring 14 comprehensive guides, architecture diagrams, maintenance runbooks, rollback procedures, and administrator manuals in `deployment/`. | ₹0 | ₹1,500 | ₹1,500 |
| **TOTAL** | | **₹1,300** | **₹18,700** | **₹20,000** |

---

## 2. Cost Transparency & Breakdown Principles

1. **Leveraging Existing Working Work (No Double-Charging):**
   - The 8 syllabus units, 320+ examples, and 575+ exercises are already completed and functional; **₹0 is charged for rewriting content**.
   - The interactive SVG visualizers (Arrow Diagrams, Cartesian Product, Function Composition, Venn Sets) are working; **₹0 is charged for rebuilding UI visualizers**.
   - The model is already fine-tuned (1,343 training examples on RTX 4060); **₹0 is charged for model training**.
2. **Direct Provider Pass-Through Costs Included (₹1,300):**
   - Custom 1-Year Domain Registration: **₹600** (e.g., `.in` / `.online` / `.org.in`).
   - RunPod / Modal Cloud GPU Initial Setup & Sandbox Verification Balance: **₹500**.
   - Load Testing GPU Compute Allocation: **₹200**.
3. **Pure Setup & Cloud Engineering (₹18,700):**
   - Covers all technical architecture, Linux containerization, security hardening, cloud configuration, and operational handover.
4. **Strict Guarantee:**
   - **The one-time completion total will not exceed ₹20,000 INR under any circumstances.**

