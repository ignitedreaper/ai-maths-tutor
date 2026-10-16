import { NextResponse } from 'next/server';
import { saveExchange } from '@/lib/db';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'model';
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

export async function POST(req: Request) {
  try {
    const body: ChatRequestBody = await req.json();
    const { messages, problemContext, sessionId } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: messages must be a non-empty array.' },
        { status: 400 }
      );
    }

    const startTime = performance.now();

    // Call the local FastAPI backend (Maths Qwen3-4B LoRA + RAG)
    const backendResponse = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        problemContext,
      }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      const errorMsg = data.detail || data.error || 'Backend request failed';
      console.error('Local Maths LLM Error:', errorMsg);
      return NextResponse.json(
        { error: errorMsg },
        { status: backendResponse.status }
      );
    }

    let text: string = data.reply || '';
    const citations: string[] = data.citations || [];
    const latencyMs = performance.now() - startTime;

    // Clean up response formatting
    text = text.replace(/^#{1,6}\s+(.*)/gm, '**$1**');
    text = text.replace(/^-{3,}$/gm, '');
    text = text.replace(/^\*{3,}$/gm, '');
    text = text.replace(/^_{3,}$/gm, '');
    text = text.replace(/\n{3,}/g, '\n\n');

    // Optional exchange persistence if DB is configured
    if (typeof sessionId === 'string' && sessionId.trim().length > 0) {
      try {
        const userMessages = messages.filter((m) => m.role === 'user');
        const latestUserText = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

        await saveExchange({
          sessionId,
          pageTitle: problemContext?.title ?? null,
          userText: latestUserText,
          replyText: text,
          modelId: 'MathsQwen3-4B-LoRA',
          latencyMs,
        });
      } catch (dbErr) {
        // Silently skip if DB logging fails
      }
    }

    return NextResponse.json({ reply: text, citations });
  } catch (error: any) {
    console.error('Chat API Error:', error);

    if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      return NextResponse.json(
        {
          error:
            'Cannot connect to the local Maths LLM server. Please make sure the FastAPI backend is running on http://localhost:8000.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Something went wrong during the chat request' },
      { status: 500 }
    );
  }
}
