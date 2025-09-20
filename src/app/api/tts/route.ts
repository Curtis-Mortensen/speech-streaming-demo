import Replicate from 'replicate';
import { NextRequest, NextResponse } from 'next/server';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

const MODEL = 'minimax/speech-02-turbo';
const VOICE = 'English_Trustworth_Man';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const { text, settings } = await req.json();

    if (!text) {
      return new NextResponse('Missing text', { status: 400 });
    }

    // Use default values if settings are not provided
    const speed = settings?.speed || 1;
    const pitch = settings?.pitch || 0;
    const systemPrompt = settings?.systemPrompt || '';

    let prediction = await replicate.predictions.create({
      model: MODEL,
      input: {
        text: text,
        voice_id: VOICE,
        speed: speed,
        pitch: pitch,
        // Add system prompt if provided
        ...(systemPrompt && { system_prompt: systemPrompt })
      },
    });

    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await sleep(1000);
      prediction = await replicate.predictions.get(prediction.id);
    }

    if (prediction.status === 'failed') {
      return new NextResponse(prediction.error, { status: 500 });
    }

    const outputUrl = prediction.output as string;
    const response = await fetch(outputUrl);
    
    if (!response.body) {
        return new NextResponse('No response body', { status: 500 });
    }

    const reader = response.body.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          controller.enqueue(value);
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
