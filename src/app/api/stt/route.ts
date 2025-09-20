import Replicate from 'replicate';
import { NextRequest, NextResponse } from 'next/server';

// Replicate client (server-side only)
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

// Whisper baseline on Replicate per docs in whisperAPI.md
// Model page: openai/whisper (large-v3 version listed in docs)
// We pass model: 'large-v3' in input to target the Large v3 checkpoint.
const MODEL_VERSION = "openai/whisper:8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e"; // versioned slug per [whisperAPI.md](whisperAPI.md)

// Acceptable MIME types for uploaded audio
const ACCEPTED_MIME_TYPES = new Set([
  'audio/webm',       // webm/opus (preferred)
  'audio/ogg',        // some browsers/devices may label opus as ogg
  'audio/wav',        // wav
  'audio/x-wav',      // wav variant
  'audio/m4a',        // m4a (sometimes used)
  'audio/mp4',        // m4a frequently comes through as audio/mp4
  'audio/x-m4a',      // m4a variant
]);


/**
 * POST /api/stt
 * Content-Type: multipart/form-data
 * Fields:
 *  - audio (required): single file (webm/opus preferred; accept wav/m4a)
 *  - language (optional): e.g. "en" (default "auto")
 *  - prompt (optional): biasing hint passed to initial_prompt
 *
 * Response: 200 JSON { transcript: string, language?: string, durationMs?: number }
 *
 * Example curl:
 *  curl -X POST http://localhost:3000/api/stt \
 *    -H "Authorization: Bearer <only-if-you-forward>" \
 *    -F "audio=@public/test.webm;type=audio/webm" \
 *    -F "language=en" \
 *    -F "prompt=short meeting notes"
 */
export async function POST(req: NextRequest) {
  try {
    // Parse multipart form
    const form = await req.formData();
    const audio = form.get('audio');
    const languageHint = (form.get('language') as string | null) || null;
    const prompt = (form.get('prompt') as string | null) || null;

    // Validate audio presence and type (relaxed to accept any audio/* and common audio extensions)
    if (!audio || !(audio instanceof File)) {
      return NextResponse.json({ error: 'Missing "audio" file in multipart form-data' }, { status: 400 });
    }

    const blobType = audio.type || '';
    const fileName = ((audio as any)?.name ? String((audio as any).name) : '').toLowerCase();
    const isAudioType = blobType.startsWith('audio/');
    const hasAudioExtension = /\.(webm|ogg|wav|m4a|mp4)$/.test(fileName);

    if (!isAudioType && !hasAudioExtension) {
      return NextResponse.json(
        { error: `Unsupported media type: ${blobType || 'unknown'}` },
        { status: 415 }
      );
    }

    /**
     * Build input for Replicate run(). The SDK will handle uploading File/Blob inputs.
     * Keep validation relaxed; accept audio/* and common file extensions.
     */
    const input: Record<string, unknown> = {
      audio,                                // pass File directly; SDK uploads it
      language: languageHint || 'auto',
      translate: false,
      transcription: 'plain text',
      ...(prompt ? { initial_prompt: prompt } : {}),
    };
    
    let output: unknown;
    try {
      output = await replicate.run(MODEL_VERSION, { input });
    } catch (e: any) {
      const message = (e && (e.message || e.toString())) || 'Upstream STT error';
      return NextResponse.json({ error: message }, { status: 502 });
    }
    
    // Normalize output into a transcript string
    // whisperAPI.md shows outputs can include:
    //  - transcription (string), detected_language (string), segments (array)
    //  - Some variations may return a string or alternate keys like text
    const out = output as unknown;
    
    let transcript = '';
    let detectedLanguage: string | undefined;
    let durationMs: number | undefined;
    
    // Support top-level string, object, or array-of-segments
    if (typeof out === 'string') {
      transcript = out;
    } else if (Array.isArray(out)) {
      // Sometimes output is an array of segments; join their text
      transcript = out
        .map((s: any) => (s && typeof s.text === 'string' ? s.text : ''))
        .filter((s: string) => s.length > 0)
        .join(' ')
        .trim();
    } else if (out && typeof out === 'object') {
      const obj = out as any;
      // Prefer object.transcription or object.text
      if (typeof obj.transcription === 'string') {
        transcript = obj.transcription;
      } else if (typeof obj.text === 'string') {
        transcript = obj.text;
      } else if (Array.isArray(obj.segments)) {
        // When segments are provided, join their text fields
        transcript = obj.segments
          .map((s: any) => (typeof s?.text === 'string' ? s.text : ''))
          .filter((s: string) => s.length > 0)
          .join(' ')
          .trim();
      }
    
      if (typeof obj.detected_language === 'string') {
        detectedLanguage = obj.detected_language;
      }
    
      // If model returns duration, prefer it. Whisper examples do not return duration,
      // but if your version does, accept number in ms or seconds string/number.
      if (typeof obj.durationMs === 'number') {
        durationMs = obj.durationMs;
      } else if (typeof obj.duration === 'number') {
        // Assume seconds - convert to ms
        durationMs = Math.round(obj.duration * 1000);
      }
    }


    transcript = (transcript || '').trim();

    // Final guard in case nothing was extracted
    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript produced by the model' },
        { status: 502 }
      );
    }

    // Choose language: echo hint if provided; else use detected_language if available
    const languageOut = languageHint || detectedLanguage || undefined;

    return NextResponse.json(
      {
        transcript,
        ...(languageOut ? { language: languageOut } : {}),
        ...(typeof durationMs === 'number' ? { durationMs } : {}),
      },
      { status: 200 }
    );
  } catch (err: any) {
    // Unexpected server error
    console.error('STT route error:', err);
    const message =
      (err && (err.message || err.toString())) || 'Internal Server Error';
    return NextResponse.json(
      { error: 'Internal Server Error', message },
      { status: 500 }
    );
  }
}