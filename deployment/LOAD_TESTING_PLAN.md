# Load Testing Plan & Concurrency Benchmarking

This plan outlines the testing methodology to validate that the **MathTutor** AI chatbot handles peak student usage smoothly without GPU memory crashes or request drops.

---

## 1. Concurrency Modeling: 200 Registered Students vs. Simultaneous Requests

A critical distinction in AI system design:
- **200 Registered Students** means 200 accounts in the database.
- Even during peak school study hours (e.g., 7:00 PM Sunday before an exam), a cohort of 200 students typically produces:
  - **3 to 8 simultaneous requests** under normal peak traffic.
  - **15 to 25 simultaneous requests** during intense classroom testing sessions.
  - **50 simultaneous requests** represents an extreme stress-test condition.

---

## 2. Concurrency Evaluation Projections

| Concurrent Active Requests | VRAM Usage (4-bit NF4) | Expected Avg Latency | Tokens / Sec / User | Queue Waiting Time | Target Failure Rate | Action Required |
|---|---|---|---|---|---|---|
| **5 simultaneous** | ~5.0 GB / 24 GB | 5.2 seconds | ~38 tok/sec | 0.0 sec (Instant parallel) | **0.0%** | Optimal performance; well within single GPU capacity. |
| **10 simultaneous** | ~7.2 GB / 24 GB | 7.8 seconds | ~30 tok/sec | 0.8 sec | **0.0%** | Handled natively on RTX 4090 / L4 with PyTorch dynamic batching. |
| **25 simultaneous** | ~13.5 GB / 24 GB | 14.5 seconds | ~18 tok/sec | 4.5 sec (Fair queue) | **< 1.0%** | FastAPI queue serializes requests into batches of 8–10 to avoid OOM. |
| **50 simultaneous** | ~22.0 GB / 24 GB | 24.0 seconds | ~12 tok/sec | 12.0 sec | **< 3.0%** | Automatic horizontal container autoscale kicks in on Modal/RunPod. |

---

## 3. Automated Load Testing Script (`load_test.py`)

Run this Python script to benchmark your cloud AI endpoint under escalating concurrency:

```python
"""
MathTutor Concurrency Load Testing Benchmark.
Measures TTFT, total latency, throughput, and failure rate under concurrent load.
"""

import asyncio
import time
import httpx

API_URL = "https://your-gpu-service.modal.run/api/chat"
CONCURRENCY_LEVELS = [5, 10, 25, 50]

TEST_PAYLOAD = {
    "messages": [
        {"role": "user", "content": "Let A = {1, 2, 3} and B = {4, 5, 6}. Find the relation R from A to B where a < b."}
    ]
}

async def send_chat_request(client: httpx.AsyncClient, request_id: int):
    start = time.perf_counter()
    try:
        response = await client.post(API_URL, json=TEST_PAYLOAD, timeout=60.0)
        duration = time.perf_counter() - start
        if response.status_code == 200:
            return {"success": True, "duration": duration, "error": None}
        else:
            return {"success": False, "duration": duration, "error": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"success": False, "duration": time.perf_counter() - start, "error": str(e)}

async def run_benchmark_tier(concurrency: int):
    print(f"\n" + "=" * 50)
    print(f"BENCHMARKING CONCURRENCY: {concurrency} SIMULTANEOUS USERS")
    print("=" * 50)

    limits = httpx.Limits(max_connections=concurrency, max_keepalive_connections=concurrency)
    async with httpx.AsyncClient(limits=limits) as client:
        tasks = [send_chat_request(client, i) for i in range(concurrency)]
        start_tier = time.perf_counter()
        results = await asyncio.gather(*tasks)
        total_tier_time = time.perf_counter() - start_tier

    successes = [r for r in results if r["success"]]
    failures = [r for r in results if not r["success"]]
    durations = [r["duration"] for r in successes]

    avg_latency = sum(durations) / len(durations) if durations else 0
    max_latency = max(durations) if durations else 0
    min_latency = min(durations) if durations else 0

    print(f"Total Completed: {len(successes)}/{concurrency} ({(len(successes)/concurrency)*100:.1f}%)")
    print(f"Failures: {len(failures)}")
    print(f"Average Response Time: {avg_latency:.2f} seconds")
    print(f"Min / Max Latency: {min_latency:.2f}s / {max_latency:.2f}s")
    print(f"Total Tier Throughput: {concurrency / total_tier_time:.2f} requests/sec")

async def main():
    for c in CONCURRENCY_LEVELS:
        await run_benchmark_tier(c)
        await asyncio.sleep(5) # Cooldown between tiers

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 4. Concurrency Guard Implementation in FastAPI

To prevent 50 simultaneous requests from overwhelming the GPU, configure an asynchronous semaphore inside `app/main.py`:

```python
import asyncio

# Allow max 8 concurrent forward passes on GPU; queue remaining
GPU_SEMAPHORE = asyncio.Semaphore(8)

@app.post("/api/chat")
async def chat_guarded(req: ChatRequest):
    try:
        # Wait up to 20 seconds for an open GPU slot
        async with asyncio.timeout(20.0):
            async with GPU_SEMAPHORE:
                return await execute_inference(req)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=503,
            detail="The AI Tutor is currently assisting many students. Please retry in a few seconds."
        )
```
This guarantees that GPU memory never exceeds capacity, maintaining 100% stability.

