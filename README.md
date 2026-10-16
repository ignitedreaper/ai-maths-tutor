# MathTutor

A Samacheer Kalvi Class 10 math tutor built with Next.js 16 (App Router), React 19, and TypeScript, featuring interactive visualizations and a floating AI math tutor chat widget powered by Qwen on AWS Bedrock.

## Setup

### 1. AWS Bedrock Model Access & IAM Policy
1. In the AWS Console, open **Amazon Bedrock** > **Model access** and enable access to your Qwen model (e.g., Qwen 2.5 on Bedrock).
2. Create an IAM policy attached to your execution role (or IAM user for local development) granting permissions restricted to your model ARN:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:<region>::foundation-model/<model-id>"
    }
  ]
}
```

### 2. Database Setup (PostgreSQL)
Run `db/schema.sql` against your PostgreSQL database (e.g., Neon, Supabase, or AWS RDS):

```bash
psql $DATABASE_URL -f db/schema.sql
```

This creates the `chat_sessions` and `chat_messages` tables with indexed session lookups. If `DATABASE_URL` is omitted, the chat works normally and database persistence is silently skipped.

### 3. Environment Variables
Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

- `AWS_REGION`: Single AWS region where your Bedrock model is accessible (e.g. `us-east-1`).
- `BEDROCK_MODEL_ID`: Qwen model identifier on AWS Bedrock (e.g. `qwen.qwen2-5-72b-instruct`).
- `DATABASE_URL`: PostgreSQL connection string with SSL enabled.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: Only needed if not running under an IAM role (e.g. for local development).

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
