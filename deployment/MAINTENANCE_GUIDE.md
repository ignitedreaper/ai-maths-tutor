# Operations & Maintenance Guide

This guide provides the administrative runbook, operational procedures, backup routines, and incident response playbooks for the **MathTutor** platform.

---

## 1. Routine System Monitoring

| Component | Dashboard URL | Key Metrics to Check | Healthy Range |
|---|---|---|---|
| **Frontend & API Gateway** | [vercel.com](https://vercel.com) | Edge Bandwidth, 5xx Error Rate, Function Duration | Error Rate < 0.1%, Duration < 1,000ms (standard) |
| **Cloud GPU Worker** | [modal.com](https://modal.com) / [runpod.io](https://runpod.io) | Container Invocations, Active GPU Seconds, Spend Meter | Monthly spend within $30 credit |
| **Relational Database** | [neon.tech](https://neon.tech) | Active Connections, Storage Usage, CPU Load | Storage < 100 MB, Pool < 5 connections |
| **Rate Limiter Cache** | [upstash.com](https://upstash.com) | Daily Command Volume, Memory Usage | Daily commands < 10,000 |

---

## 2. Student & Account Management Runbook

### Accessing the Admin Control Center
1. Navigate to `https://<YOUR_DOMAIN>/login`.
2. Sign in using the master administrator credentials:
   - Username: `admin`
   - Password: `<YOUR_ADMIN_PASSWORD>`
3. You will be automatically redirected to `/admin/dashboard`.

### Common Administrative Tasks:
- **Search Students:** Use the search bar to locate students by Full Name, Username, Class, or Section.
- **Deactivate an Inappropriate or Inactive Account:**
  1. Click on the student's name in the directory to open `/admin/students/[id]`.
  2. Toggle the **Account Status** switch from `Active` to `Deactivated`.
  3. The student's active session is immediately revoked; they will be denied login.
- **Inspect Learning History:** View the exact math problems and chatbot conversations submitted by the student, along with timestamps and AI response latency.

---

## 3. Database Backup & Disaster Recovery

### Automatic Backups (Neon PostgreSQL)
Neon automatically creates continuous transaction logs and point-in-time recovery snapshots (7-day history on the free tier). No manual intervention is needed.

### Manual Backup via Windows 11 PowerShell:
To create a standalone local backup of all users and chat sessions:

```powershell
# Export database to local SQL dump
pg_dump "postgresql://user:pass@ep-sample-123.neon.tech/mathtutor?sslmode=require" -f "mathtutor_backup_$(Get-Date -Format 'yyyyMMdd').sql"
```

### Restoring from Backup:
```powershell
psql "postgresql://user:pass@ep-sample-123.neon.tech/mathtutor?sslmode=require" -f "mathtutor_backup_20261106.sql"
```

---

## 4. How to Update Fine-Tuned Model Weights

When you train a newer LoRA checkpoint (e.g. `MathsQwen3-4B-LoRA-v2`):

1. **Upload New Checkpoint to Hugging Face:**
   ```powershell
   cd "path\to\new\checkpoint"
   huggingface-cli upload <YOUR_HF_USERNAME>/MathsQwen3-4B-LoRA . . --repo-type model
   ```
2. **Restart Cloud Inference Container:**
   - In Modal: run `modal deploy deploy_modal.py`.
   - Modal automatically downloads the latest weights on the next container spin with zero downtime.

---

## 5. Incident Response Playbook

### Incident A: Chatbot Displays "Cannot connect to server" or Times Out
1. Check [modal.com](https://modal.com) or [runpod.io](https://runpod.io) dashboard:
   - Verify that your monthly credit or spend cap has not been reached.
   - Inspect container execution logs for PyTorch CUDA errors.
2. If the cloud GPU is unresponsive, the platform's built-in fallback automatically redirects requests to AWS Bedrock if configured in `src/lib/bedrock.ts`.

### Incident B: High Error Rates on Vercel
1. In the Vercel Dashboard, go to **Deployments** > **Logs**.
2. Filter by `Status: 500`.
3. If an erroneous commit was deployed, click the prior working deployment and select **Instant Rollback**.

### Incident C: Database Connection Limit Exceeded
1. In `src/lib/db.ts`, connection pool size is capped at 5 with auto-releasing clients in `finally {}` blocks.
2. In Neon Dashboard, navigate to **Connection Pooling** and ensure you are using the pooled connection string (port 5432 with `-pooler` hostname suffix).

