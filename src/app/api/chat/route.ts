import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const { messages, settings }: { messages?: ChatCompletionMessageParam[]; settings?: { systemPrompt?: string } } = await req.json();

    if (!Array.isArray(messages)) {
      return new NextResponse('Missing messages', { status: 400 });
    }

    const systemPrompt = typeof settings?.systemPrompt === 'string' ? settings.systemPrompt.trim() : '';

    const finalMessages: ChatCompletionMessageParam[] = [];
    if (systemPrompt.length > 0) {
      finalMessages.push({ role: 'system', content: systemPrompt });
    }

    // Only include user/assistant messages from client payload
    for (const m of messages) {
      if (m && (m.role === 'user' || m.role === 'assistant') && typeof (m as any).content === 'string') {
        finalMessages.push({ role: m.role, content: (m as any).content });
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: finalMessages,
    });

    const response = completion.choices[0]?.message?.content ?? '';

    return NextResponse.json({ response });
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
