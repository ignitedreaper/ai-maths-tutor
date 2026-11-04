# MathTutor

A Samacheer Kalvi Class 10 math tutor built with **Next.js 16 (App Router)**, **React 19**, and **TypeScript**, featuring:
- Role-based Access Control (**Admin** and **Student**).
- Secure password hashing using **Argon2id**.
- Stateful session management with secure HttpOnly cookies and database session revocation.
- Dedicated **Admin Control Center** (live metrics, search, class/section filtering, sorting, pagination, profile editing, and account activation/deactivation).
- Personalized **Student Dashboard** with quick links to syllabus chapters and visualizers.
- Floating AI Math Tutor powered by local fine-tuned **MathsQwen3-4B-LoRA** (with RAG retrieval & citations) or **AWS Bedrock**.
- Interactive mathematical SVG/React visualizers for Cartesian Products, Relations, Arrow Diagrams, Function Composition, and Venn Set Expressions.

---

## 1. Setup & Database Migration

### A. Environment Configuration
Copy `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string (Neon, Supabase, AWS RDS, or local PostgreSQL).
- `BACKEND_URL`: URL of the local FastAPI MathsLLM service (defaults to `http://localhost:8000`).
- `ADMIN_USERNAME`: Username for initial admin provisioning (default: `admin`).
- `ADMIN_PASSWORD`: Password for initial admin provisioning (default: `Admin@Maths2026!`).
- `ADMIN_NAME`: Display name for administrator (default: `System Administrator`).

### B. Database Migration (PostgreSQL)
Run the automated migration script to create `users`, `user_sessions`, and update `chat_sessions`:

```bash
npm run db:migrate
```
*(Alternatively: `psql $DATABASE_URL -f db/schema.sql`)*

### C. Seed Initial Administrator Account
Provision the primary administrator account securely:

```bash
npm run seed:admin
```
This hashes the password with Argon2id and assigns the `ADMIN` role.

---

## 2. Authentication & Role-Based Routes

### Available Routes
- `/login`: Universal login page for Students and Administrators.
  - Automatically redirects `ADMIN` users to `/admin/dashboard`.
  - Automatically redirects `STUDENT` users to `/student/dashboard`.
- `/signup`: Public registration page for Students (Full Name, Class, Section, Username, Password).
- `/student/dashboard`: Protected student hub with personalized profile, chapter links, and visualizers.
- `/admin/dashboard`: Protected administrative portal with live database metrics and student directory.
- `/admin/students/[id]`: Protected student profile view and detail editing.

---

## 3. Running the Project

### Option 1: 1-Click Launch (Recommended)
Double-click [`start.bat`](file:///c:/Users/K.Manoj%20kumar/OneDrive/Desktop/final%20mathstutor/MathTutor/start.bat) or run:
```powershell
.\start_all.ps1
```

### Option 2: Run Development Server Manually
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Testing & Verification

Run the comprehensive authentication and security test suite:
```bash
npm run test:auth
```

Run ESLint:
```bash
npm run lint
```

Build for Production:
```bash
npm run build
```

---

## 5. Deploy on Vercel

MathTutor is optimized for zero-configuration deployment on [Vercel](https://vercel.com).

### Deployment Steps
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. In the Vercel Dashboard, click **Add New...** > **Project** and import your repository.
3. If deploying from a subfolder, configure **Root Directory** as `MathTutor`.
4. Configure all environment variables in **Project Settings > Environment Variables** (see table below).
5. Deploy!

### Environment Variables on Vercel

| Environment Variable | Description | Notes |
| --- | --- | --- |
| `AWS_REGION` | AWS Region where Amazon Bedrock is configured (e.g. `us-east-1`, `us-west-2`) | Required for AWS Bedrock |
| `BEDROCK_MODEL_ID` | Amazon Bedrock model identifier (e.g. `qwen.qwen2-5-72b-instruct`) | Required for AWS Bedrock |
| `BEDROCK_AWS_ACCESS_KEY_ID` | AWS Access Key ID for Bedrock invocation | Recommended on Vercel (Vercel system reserves `AWS_ACCESS_KEY_ID`) |
| `BEDROCK_AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key for Bedrock invocation | Recommended on Vercel (Vercel system reserves `AWS_SECRET_ACCESS_KEY`) |
| `AWS_ACCESS_KEY_ID` | Standard AWS Access Key ID | Fallback if `BEDROCK_AWS_ACCESS_KEY_ID` is not set |
| `AWS_SECRET_ACCESS_KEY` | Standard AWS Secret Access Key | Fallback if `BEDROCK_AWS_SECRET_ACCESS_KEY` is not set |
| `DATABASE_URL` | PostgreSQL connection URI (`postgresql://user:pass@host:5432/db?sslmode=require`) | Optional. If missing, chat continues to operate without DB persistence |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL for distributed rate limiting | Optional. Falls back to in-memory rate limiting if omitted |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token | Optional. Used alongside `UPSTASH_REDIS_REST_URL` |
| `ALLOWED_ORIGINS` | Comma-delimited list of allowed CORS origins (e.g. `https://my-domain.com`) | Optional |
| `NEXT_PUBLIC_API_BASE` | Base API URL for client-side API fetches | Optional (defaults to same-origin `""`) |

> [!CAUTION]
> **Security Notice**: Credentials and secret keys (such as `BEDROCK_AWS_ACCESS_KEY_ID`, `BEDROCK_AWS_SECRET_ACCESS_KEY`, and `DATABASE_URL`) must **ALWAYS** be set securely in the Vercel dashboard under Project Settings > Environment Variables. **NEVER** commit secrets, private tokens, or `.env*` files to source control.

