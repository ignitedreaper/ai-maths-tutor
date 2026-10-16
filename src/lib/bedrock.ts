import {
  BedrockRuntimeClient,
  ConverseCommand,
  Message,
} from '@aws-sdk/client-bedrock-runtime';

// BedrockRuntimeClient using region from process.env.AWS_REGION.
// Relies on default AWS credential chain (IAM role or env vars).
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
});

export interface InputMessage {
  role: string;
  content: string;
}

/**
 * Call Qwen on AWS Bedrock using the Converse API.
 */
export async function askQwen(
  system: string,
  messages: InputMessage[]
): Promise<string> {
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) {
    throw new Error('BEDROCK_MODEL_ID environment variable is missing.');
  }

  // 1. Map "model" to "assistant", keep "user"
  const normalized = messages.map((msg) => ({
    role: msg.role === 'model' ? ('assistant' as const) : (msg.role as 'user' | 'assistant'),
    content: msg.content,
  }));

  // 2. Drop any leading assistant greeting
  let firstUserIdx = 0;
  while (firstUserIdx < normalized.length && normalized[firstUserIdx].role === 'assistant') {
    firstUserIdx++;
  }
  const withoutLeadingAssistant = normalized.slice(firstUserIdx);

  if (withoutLeadingAssistant.length === 0) {
    throw new Error('Cannot start conversation without a user message.');
  }

  // 3. Merge consecutive same-role messages so roles strictly alternate
  const alternating: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const msg of withoutLeadingAssistant) {
    if (alternating.length > 0 && alternating[alternating.length - 1].role === msg.role) {
      alternating[alternating.length - 1].content += '\n\n' + msg.content;
    } else {
      alternating.push({ role: msg.role, content: msg.content });
    }
  }

  // Convert to Bedrock Converse Message format
  const converseMessages: Message[] = alternating.map((m) => ({
    role: m.role,
    content: [{ text: m.content }],
  }));

  const command = new ConverseCommand({
    modelId,
    system: system ? [{ text: system }] : undefined,
    messages: converseMessages,
    inferenceConfig: {
      maxTokens: 600,
      temperature: 0.4,
      topP: 0.9,
    },
  });

  const response = await client.send(command);

  // Join text blocks of the response
  const contentBlocks = response.output?.message?.content ?? [];
  let responseText = contentBlocks
    .map((block) => block.text ?? '')
    .join('');

  // Strip any <think>...</think> reasoning blocks before returning
  responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Also strip dangling unclosed <think> if truncated
  responseText = responseText.replace(/<think>[\s\S]*$/gi, '');

  return responseText.trim();
}
