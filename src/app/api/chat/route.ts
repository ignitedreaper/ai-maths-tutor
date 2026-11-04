import { NextResponse } from 'next/server';
import { saveExchange } from '@/lib/db';
import { checkChatRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

interface ProblemContext {
  title: string;
  htmlContent: string;
}

interface ChatRequestBody {
  messages?: ChatMessage[];
  problemContext?: ProblemContext | null;
  sessionId?: string;
}

/**
 * Extracts client IP address from proxy headers with loopback fallback.
 */
function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();
  return '127.0.0.1';
}

export async function POST(req: Request) {
  try {
    // 1. Per-IP Rate Limiting (20 requests per 10 minutes)
    const clientIp = getClientIp(req);
    const rateLimit = await checkChatRateLimit(clientIp, 20, 10 * 60);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error:
            'You have reached the limit of 20 chat messages per 10 minutes. Please take a short break and try again shortly.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.resetInSeconds.toString(),
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetInSeconds.toString(),
          },
        }
      );
    }

    // 2. Parse request JSON body safely
    let body: ChatRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request: Request body must be valid JSON.' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request: Request body must be an object.' },
        { status: 400 }
      );
    }

    const { messages, problemContext, sessionId } = body;

    // 3. Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: messages must be a non-empty array.' },
        { status: 400 }
      );
    }

    // Max 20 messages of history
    if (messages.length > 20) {
      return NextResponse.json(
        {
          error: 'Conversation history exceeds the maximum allowed limit of 20 messages.',
        },
        { status: 400 }
      );
    }

    // Validate each message structure and character length (max 2000 chars per message)
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg || typeof msg !== 'object') {
        return NextResponse.json(
          { error: `Invalid message at index ${i}: message must be an object.` },
          { status: 400 }
        );
      }

      if (msg.role !== 'user' && msg.role !== 'model' && msg.role !== 'assistant') {
        return NextResponse.json(
          { error: `Invalid message role at index ${i}: role must be 'user' or 'model'.` },
          { status: 400 }
        );
      }

      if (typeof msg.content !== 'string') {
        return NextResponse.json(
          { error: `Invalid message content at index ${i}: content must be a string.` },
          { status: 400 }
        );
      }

      if (msg.content.length > 2000) {
        return NextResponse.json(
          {
            error: `Message at index ${i} exceeds the maximum length of 2000 characters (${msg.content.length} chars).`,
          },
          { status: 400 }
        );
      }
    }

    const startTime = performance.now();
    let text = '';
    const citations: string[] = [];

    // 4. Call AI Model
    // Primary: AWS Bedrock Qwen Converse API
    // Fallback: Local FastAPI backend if BACKEND_URL is set and BEDROCK_MODEL_ID is absent
    if (process.env.BEDROCK_MODEL_ID || !process.env.BACKEND_URL) {
      const { askQwen } = await import('@/lib/bedrock');
      const { buildSystemPrompt } = await import('@/lib/prompt');
      const systemPrompt = buildSystemPrompt(problemContext);
      text = await askQwen(systemPrompt, messages);
    } else {
      const backendResponse = await fetch(`${process.env.BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true',
        },
        body: JSON.stringify({
          messages,
          problemContext,
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || 'Backend request failed');
      }

      const data = await backendResponse.json();
      text = data.reply || '';
      if (Array.isArray(data.citations)) {
        citations.push(...data.citations);
      }
    }

    const latencyMs = performance.now() - startTime;

    // 5. Clean up response formatting
    text = text.replace(/^#{1,6}\s+(.*)/gm, '**$1**');
    text = text.replace(/^-{3,}$/gm, '');
    text = text.replace(/^\*{3,}$/gm, '');
    text = text.replace(/^_{3,}$/gm, '');
    text = text.replace(/\n{3,}/g, '\n\n');

    // 6. Optional exchange persistence (chat continues uninterrupted even if DB is missing or fails)
    if (typeof sessionId === 'string' && sessionId.trim().length > 0) {
      try {
        let currentUserId: string | null = null;
        try {
          const { getCurrentUser } = await import('@/lib/auth');
          const currentUser = await getCurrentUser();
          currentUserId = currentUser?.id ?? null;
        } catch {
          // Non-blocking: skip auth context if unavailable
        }

        const userMessages = messages.filter((m) => m.role === 'user');
        const latestUserText =
          userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

        await saveExchange({
          sessionId,
          pageTitle: problemContext?.title ?? null,
          userText: latestUserText,
          replyText: text,
          modelId: process.env.BEDROCK_MODEL_ID || 'MathsQwen-Bedrock',
          latencyMs,
          userId: currentUserId,
        });
      } catch (dbErr) {
        // Log server-side only; do not expose internal database errors to client
        console.error('Chat database persistence error (chat unaffected):', dbErr);
      }
    }

    return NextResponse.json({ reply: text, citations });
  } catch (error: any) {
    // 7. Security: Never expose raw AWS SDK or Database error traces to the client
    console.error('Chat API Error (Server-Side Details):', error);

    return NextResponse.json(
      {
        error:
          'We encountered an unexpected error while processing your math question. Please try again in a moment.',
      },
      { status: 500 }
    );
  }
}
