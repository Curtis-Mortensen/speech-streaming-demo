import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const { message, settings } = await req.json();

    if (!message) {
      return new NextResponse('Missing message', { status: 400 });
    }

    // Prepare messages array with system prompt if provided
    const messages: ChatCompletionMessageParam[] = [];
    if (settings?.systemPrompt) {
      messages.push({ role: 'system', content: settings.systemPrompt });
    }
    messages.push({ role: 'user', content: message });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
    });

    const response = completion.choices[0].message.content;

    return NextResponse.json({ response });
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
