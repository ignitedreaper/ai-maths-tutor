# Database Architecture & Security Hardening

This document outlines the database schema, indexing strategy, data lifecycle, and multi-tier security policies protecting the **MathTutor** platform.

---

## 1. Database Architecture & Schema Specification

The production platform runs on **PostgreSQL 15+** (hosted on Neon Serverless or Supabase).

```mermaid
erDiagram
    users ||--o{ user_sessions : "has active"
    users ||--o{ chat_sessions : "owns"
    chat_sessions ||--o{ chat_messages : "contains"

    users {
        uuid id PK
        text student_name
        text class_name
        text section
        varchar username UK
        text password_hash
        varchar role "ADMIN | STUDENT"
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    user_sessions {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        timestamptz expires_at
        timestamptz created_at
    }

    chat_sessions {
        uuid id PK
        text page_title
        uuid user_id FK
        timestamptz created_at
    }

    chat_messages {
        bigserial id PK
        uuid session_id FK
        varchar role "user | assistant"
        text content
        text model_id
        integer latency_ms
        timestamptz created_at
    }
```

### Table Indexing Strategy:
1. `users(username)`: Unique B-tree index for instant $O(1)$ login lookups.
2. `users(role)` & `users(is_active)`: Filter indexes for fast administrative dashboard aggregation.
3. `user_sessions(token_hash)`: High-speed hash index for session authentication on every request.
4. `chat_messages(session_id, id)`: Composite index for sequential conversation retrieval without table scans.

---

## 2. Security Protocols & Defense in Depth

### 2.1 Password Security (Argon2id)
- **Algorithm:** Argon2id (hybrid data-dependent and data-independent memory-hard hashing).
- **Parameters configured in `src/lib/password.ts`:**
  - Memory cost: **19,456 KB (19 MB)**
  - Iteration time: **2 passes**
  - Parallelism: **1 thread**
- **Resistance:** Defeats GPU-accelerated dictionary attacks and ASIC brute-forcing.

### 2.2 Session Security & Cookie Handling
- Session tokens are generated using cryptographically secure random bytes (32 bytes $\rightarrow$ 64-char hex string).
- **Storage:** Only the SHA-256 hash of the token is stored in `user_sessions`. If the database is ever compromised, original session cookies cannot be forged.
- **Cookie Attributes:**
  - `HttpOnly`: Inaccessible to client JavaScript (prevents token theft via XSS).
  - `SameSite=Lax`: Prevents Cross-Site Request Forgery (CSRF).
  - `Secure`: Transmitted exclusively over encrypted HTTPS connections in production.
  - `Path=/`: Valid across all student application routes.
  - `Max-Age=604800`: 7-day expiration with immediate revocation upon logout.

### 2.3 SQL Injection Immunity
All database interactions in `src/lib/db.ts` use strictly **parameterized queries** with positional placeholders (`$1, $2, $3`). Raw user inputs are never concatenated into SQL query strings.

### 2.4 Abuse & Denial of Service Protection
- **Gateway Rate Limiting:** Enforced via Upstash Redis at the edge before any backend computation or GPU inference is triggered.
- **Payload Sanitization:** Rejects inputs exceeding 2,000 characters to prevent prompt-stuffing and memory exhaustion.
- **Connection Pooling:** Pool size is capped at 5 simultaneous connections with a 5,000ms connection timeout to prevent database exhaustion on serverless spikes.

---

## 3. Database Migration & Provisioning Steps

To provision the cloud database:

```powershell
# 1. Obtain connection string from Neon.tech dashboard:
# postgresql://username:password@ep-sample-123.neon.tech/mathtutor?sslmode=require

# 2. Run automated migration script from Windows 11 terminal:
cd "C:\Users\K.Manoj kumar\OneDrive\Desktop\final mathstutor\MathTutor"
$env:DATABASE_URL = "postgresql://username:password@ep-sample-123.neon.tech/mathtutor?sslmode=require"
npm run db:migrate

# 3. Seed initial production administrator account:
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_PASSWORD = "YourMasterAdminPassword123!"
$env:ADMIN_NAME = "Principal / System Admin"
npm run seed:admin
```

