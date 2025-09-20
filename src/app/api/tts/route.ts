export const runtime = 'nodejs';
import Replicate from 'replicate';
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Inline request/body types (do not import client types)
type IncomingTtsSettings = Partial<{
  version: number;
  systemPrompt: string;
  model: 'minimax/speech-02-turbo' | 'minimax/speech-02-hd' | string;
  voiceId: string;
  speed: number;
  volume: number;
  pitch: number;
  emotion: 'auto' | 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised' | string;
  englishNormalization: boolean;
  sampleRate: number;
  bitrate: number;
  channel: 'mono' | 'stereo' | string;
  languageBoost?: string;
}>;

interface SanitizedTtsSettings {
  model: 'minimax/speech-02-turbo' | 'minimax/speech-02-hd';
  voiceId: string;
  speed: number; // 0.5..2.0
  volume: number; // 0.0..2.0
  pitch: number; // int -12..12
  emotion: 'auto' | 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';
  englishNormalization: boolean;
  sampleRate: 16000 | 22050 | 32000 | 44100 | 48000;
  bitrate: 64000 | 96000 | 128000 | 192000 | 256000;
  channel: 'mono' | 'stereo';
  languageBoost?: string; // optional
}

// Local-only sanitization per spec
function sanitizeTtsSettings(input: IncomingTtsSettings | undefined): SanitizedTtsSettings {
  const s = input || {};

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const isNumber = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);
  const isString = (v: unknown): v is string => typeof v === 'string';

  const validModels = new Set(['minimax/speech-02-turbo', 'minimax/speech-02-hd']);
  const validEmotions = new Set(['auto', 'neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']);
  const validSampleRates = [16000, 22050, 32000, 44100, 48000] as const;
  const validBitrates = [64000, 96000, 128000, 192000, 256000] as const;
  const validChannels = new Set(['mono', 'stereo']);

  // model
  const rawModel = isString(s.model) ? s.model : '';
  const model: SanitizedTtsSettings['model'] = validModels.has(rawModel) ? (rawModel as any) : 'minimax/speech-02-turbo';

  // voiceId
  const voiceId = isString(s.voiceId) && s.voiceId.trim().length > 0 ? s.voiceId.trim() : 'English_Trustworth_Man';

  // speed 0.5..2.0
  const speed = isNumber(s.speed) ? clamp(s.speed, 0.5, 2.0) : 1.0;

  // volume 0.0..2.0
  const volume = isNumber(s.volume) ? clamp(s.volume, 0.0, 2.0) : 1.0;

  // pitch integer -12..12
  const pitchRaw = isNumber(s.pitch) ? s.pitch : 0;
  const pitch = clamp(Math.round(pitchRaw), -12, 12);

  // emotion enum fallback 'auto'
  const emotionRaw = isString(s.emotion) ? s.emotion : '';
  const emotion: SanitizedTtsSettings['emotion'] = validEmotions.has(emotionRaw) ? (emotionRaw as any) : 'auto';

  // englishNormalization boolean default false
  const englishNormalization = typeof s.englishNormalization === 'boolean' ? s.englishNormalization : false;

  // sampleRate restrict to enum fallback 32000
  const sr = isNumber(s.sampleRate) ? s.sampleRate : NaN;
  const sampleRate: SanitizedTtsSettings['sampleRate'] =
    (validSampleRates as readonly number[]).includes(sr) ? (sr as any) : 32000;

  // bitrate normalize and restrict:
  // - if looks like kbps (64,96,128,192,256) multiply by 1000
  // - choose nearest from allowed, fallback 128000
  const normalizeBitrate = (val: number | undefined): number => {
    if (!isNumber(val)) return 128000;
    if ([64, 96, 128, 192, 256].includes(val)) return val * 1000;
    return val;
  };
  const nearestFromSet = (val: number, candidates: number[]) => {
    let best = candidates[0];
    let bestDiff = Math.abs(val - best);
    for (let i = 1; i < candidates.length; i++) {
      const diff = Math.abs(val - candidates[i]);
      if (diff < bestDiff) {
        best = candidates[i];
        bestDiff = diff;
      }
    }
    return best;
  };
  const brNorm = normalizeBitrate(s.bitrate);
  const bitrate: SanitizedTtsSettings['bitrate'] = (validBitrates as readonly number[]).includes(brNorm)
    ? (brNorm as any)
    : (nearestFromSet(brNorm, validBitrates as unknown as number[]) as any);

  // channel restrict
  const chRaw = isString(s.channel) ? s.channel : '';
  const channel: SanitizedTtsSettings['channel'] = validChannels.has(chRaw) ? (chRaw as any) : 'mono';

  // languageBoost: default 'English' if missing; if explicitly empty string -> undefined
  let languageBoost: string | undefined;
  if (typeof s.languageBoost === 'string') {
    const trimmed = s.languageBoost.trim();
    languageBoost = trimmed.length > 0 ? trimmed : undefined;
  } else {
    languageBoost = 'English';
  }

  return {
    model,
    voiceId,
    speed,
    volume,
    pitch,
    emotion,
    englishNormalization,
    sampleRate,
    bitrate,
    channel,
    languageBoost,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { text, settings }: { text?: string; settings?: IncomingTtsSettings } = await req.json();

    if (typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const sanitized = sanitizeTtsSettings(settings);

    // Build Replicate input (no system_prompt)
    const replicateInput: Record<string, any> = {
      text,
      voice_id: sanitized.voiceId,
      speed: sanitized.speed,
      volume: sanitized.volume,
      pitch: sanitized.pitch,
      emotion: sanitized.emotion,
      english_normalization: sanitized.englishNormalization,
      sample_rate: sanitized.sampleRate,
      bitrate: sanitized.bitrate,
      channel: sanitized.channel,
    };
    if (sanitized.languageBoost) {
      replicateInput.language_boost = sanitized.languageBoost;
    }

    let prediction = await replicate.predictions.create({
      model: sanitized.model,
      input: replicateInput,
    });

    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await sleep(1000);
      prediction = await replicate.predictions.get(prediction.id);
    }

    if (prediction.status === 'failed') {
      return NextResponse.json(
        { error: (prediction as any).error || 'TTS prediction failed' },
        { status: 502 }
      );
    }

    const outputUrl = prediction.output as string;
    const response = await fetch(outputUrl);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to download audio' }, { status: 502 });
    }

    const audioDir = path.join(process.cwd(), 'public', 'audio');
    await fs.mkdir(audioDir, { recursive: true });

    const filename = `${randomUUID()}.mp3`;
    const filePath = path.join(audioDir, filename);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ url: `/audio/${filename}` }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
