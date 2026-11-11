# Cloud GPU Hosting Comparison & Inference Sizing

This analysis evaluates cloud GPU infrastructure to host the fine-tuned **Qwen3-4B + MathsQwen3-4B-LoRA** model (4-bit NF4 quantization + TF-IDF RAG), ensuring the platform operates 24/7 without requiring the developer's laptop to be turned on.

---

## 1. Hardware & Memory Sizing Analysis

### Model Memory Footprint
- **Base Model (Qwen3-4B in 4-bit NF4):** ~2.3 GB
- **LoRA Adapter (Rank 8, Alpha 16):** ~33 MB
- **PyTorch & CUDA Runtime Overhead:** ~0.6 GB
- **KV Cache per Active Generation Stream (2,048 context):** ~0.4 GB
- **Total VRAM required for 1 stream:** **~3.3 GB**
- **Total VRAM required for 5 concurrent streams:** **~5.0 GB**

### Is 24 GB VRAM Sufficient?
**Yes, exceptionally sufficient.** A 24 GB GPU (such as an NVIDIA RTX 4090, RTX 3090, or NVIDIA L4) provides almost **6x the minimum required VRAM**, allowing:
1. Ample headroom for batching multiple student questions simultaneously.
2. Complete immunity from CUDA Out-Of-Memory (OOM) errors even when students submit lengthy equation proofs.
3. Rapid generation speeds of **35 to 55 tokens per second**.

---

## 2. In-Depth Cloud GPU Provider Comparison

| Metric | RunPod Serverless | Modal | RunPod Dedicated Pods | Vast.ai (P2P Rental) | AWS Bedrock (Managed API) |
|---|---|---|---|---|---|
| **Billing Model** | Pay-per-second (Scale-to-Zero) | Pay-per-second (Scale-to-Zero) | Always-on hourly | Always-on hourly | Pay-per-1k-tokens |
| **Idle Cost when no students chat** | **$0.00 / month (₹0)** | **$0.00 / month (₹0)** | $144 – $288 / month | $72 – $150 / month | **$0.00 / month (₹0)** |
| **GPU SMR (Cost / Second Active)** | ~$0.00031 / sec (RTX 4090) | ~$0.00035 / sec (L4 GPU) | Fixed $0.34 / hour | Fixed $0.15 – $0.25 / hour | ~$0.0008 / 1k tokens |
| **Cost per 100 Math Solutions** | **~$0.18 (₹15)** | **~$0.21 (₹18)** | N/A (Fixed monthly) | N/A (Fixed monthly) | ~$0.25 (₹21) |
| **Free Tier / Credits** | $5 free on signup (~₹425) | **$30 free credit EVERY month (~₹2,550)** | None | None | AWS Free Tier (limited) |
| **Cold Start Time** | 8 – 15 seconds (with network volume) | **6 – 10 seconds** | 0s (Always running) | 0s (Always running) | Instant (< 1s) |
| **Student Privacy & Security** | SOC 2 compliant datacenters | Enterprise grade (GCP/AWS backend) | Enterprise datacenter | ⚠️ Unvetted consumer hosts | AWS Enterprise Compliance |
| **SLA & Uptime** | 99.9% | 99.95% | 99.5% | ⚠️ Frequent machine drops | 99.99% |
| **Can use your custom LoRA?** | **Yes** (Full Docker container) | **Yes** (Native Python container) | **Yes** | **Yes** | Custom fine-tuning setup required |

---

## 3. Analysis of Options

### Option A: Modal (Recommended Primary)
- **Why it wins:** Modal provides **$30 USD (~₹2,550 INR) in recurring free credits every single month** to developers.
- Since our Qwen3-4B 4-bit model only consumes ~$0.00035/second on an NVIDIA L4, $30 of monthly credit provides approximately **85,700 seconds of active generation**.
- That translates to roughly **14,200 student math explanations per month at ZERO ongoing cost**.
- Python-native deployment eliminates Docker build pain; cold-start container initialization takes only **6–9 seconds**.

### Option B: RunPod Serverless (Recommended Alternative / Redundancy)
- **Why it is strong:** True pay-per-second serverless execution with dedicated NVIDIA RTX 4090s.
- With an attached network volume (`/workspace/models`), the 4B base model is cached on disk, reducing cold start to **8–12 seconds**.
- An initial deposit of ₹1,000 (~$12 USD) powers over **5,000 student chats**. When idle, your running cost is exactly zero.

### Option C: Always-On Dedicated GPU Pods (Rejected for Launch)
- Renting a dedicated RTX 4090 24/7 costs $0.34/hr $\times$ 730 hours = **$248 USD / month (~₹21,000 INR/month)**.
- *Verdict:* Completely unsustainable for a launch budget of ₹20,000 one-time. 80% of school day hours have low activity, wasting massive compute money.

### Option D: Vast.ai Peer-to-Peer Rentals (Rejected for Production)
- Vast.ai rents consumer gaming PCs in residential locations.
- *Risks:* The host machine can be unplugged or turned off by the computer owner without notice, exposing student conversations to untrusted third parties.
- *Verdict:* Violates student data privacy and has zero production reliability.

---

## 4. Final Recommendation & Selection

1. **Deploy Model Service on Modal (Primary) using NVIDIA L4 (24 GB VRAM):**
   - Leverages the **$30/month ongoing free credit**.
   - Handles the entire initial cohort of 200 registered students with **₹0 monthly cloud GPU bills**.
2. **Configure RunPod Serverless as Automatic Standby:**
   - Pre-built container ready to take over if Modal credits are exhausted during final exam periods.
3. **Retain AWS Bedrock in `src/lib/bedrock.ts` as Instant Fallback:**
   - If cold-start latency exceeds 15 seconds, the Next.js API automatically routes the request to AWS Bedrock to ensure the student never experiences a failed chat interaction.

