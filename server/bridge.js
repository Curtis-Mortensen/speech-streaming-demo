// Node WebSocket bridge: Browser <-> Replicate TTS
// - Listens on ws://localhost:8787
// - Accepts {type:"synthesize", text:string}
// - Streams WebM/Opus audio as binary frames
// - Sends control messages as JSON text frames: {type:"start"|"end"|"error"}

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');
// Optional dotenv load; if not installed, ignore so the server can still start.
let dotenvLoaded = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenvLoaded = true;
} catch (_) {
  // Dotenv not installed; environment variables must be present in the shell.
}

const PORT = process.env.TTS_BRIDGE_PORT ? Number(process.env.TTS_BRIDGE_PORT) : 8787;
const DEBUG = process.env.TTS_DEBUG === '1';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || '';

// Voice and audio defaults for the demo
const MODEL = 'lucataco/xtts-v2:6b23be261e9d9695a8b13c6b13243583192b4e435341b4f1f57c1a9a4520513b';
const VOICE = 'Trustworthy_man';
const FORMAT = 'mp3';
const SAMPLE_RATE = 44100;


function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) + '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_) {}
}

/**
 * Create a Replicate TTS websocket and pipe audio back to the client.
 * @param {WebSocket} clientWS - browser client socket
 * @param {string} text - text to synthesize
 */
async function synthesizeToClient(clientWS, text) {
  if (!REPLICATE_API_TOKEN) {
    clientWS.send(JSON.stringify({ type: 'error', message: 'Missing REPLICATE_API_TOKEN' }));
    return;
  }

  // Start control frame
  clientWS.send(
    JSON.stringify({ type: 'start', format: FORMAT, sampleRate: SAMPLE_RATE })
  );

  // Optional local save for debugging
  const outDir = path.resolve(process.cwd(), 'dist', 'audio');
  ensureDir(outDir);
  const outPath = path.join(outDir, `${nowStamp()}.mp3`);
  const chunks = [];

  const replicate = new Replicate({
    auth: REPLICATE_API_TOKEN,
  });

  let chunkCount = 0;
  let firstAudioAt = 0;

  try {
    const output = await replicate.run(
      MODEL,
      {
        input: {
          text: text,
          speaker: VOICE,
          speed: 0.8,
          pitch: -0.1,
          output_format: FORMAT,
          sample_rate: SAMPLE_RATE,
        }
      }
    );
    
    const response = await fetch(output);
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
      chunkCount++;
      if (chunkCount === 1) firstAudioAt = Date.now();
      if (clientWS.readyState === WebSocket.OPEN) {
        clientWS.send(value, { binary: true });
      }
    }

    fs.writeFileSync(outPath, Buffer.concat(chunks));

    if (clientWS.readyState === WebSocket.OPEN) {
      clientWS.send(
        JSON.stringify({
          type: 'end',
          chunkCount,
          firstAudioMs: firstAudioAt ? Date.now() - firstAudioAt : null,
        })
      );
    }
  } catch (error) {
    if (clientWS.readyState === WebSocket.OPEN) {
      clientWS.send(JSON.stringify({ type: 'error', message: String(error.message || error) }));
    }
  }
}

// Browser WebSocket server
const server = new WebSocket.Server({ port: PORT });

server.on('listening', () => {
  console.log(`[tts-bridge] listening on ws://localhost:${PORT}`);
  if (!dotenvLoaded) {
    console.log('[tts-bridge] Note: dotenv not found; expecting env vars from shell');
  }
  if (!process.env.REPLICATE_API_TOKEN) {
    console.log('[tts-bridge] Warning: REPLICATE_API_TOKEN is empty; synthesize will error');
  }
  console.log(`[tts-bridge] voice_id=${VOICE}, sample_rate=${SAMPLE_RATE}, format=${FORMAT}`);
  console.log('[tts-bridge] Now using Replicate API');
});

server.on('connection', (ws) => {
  ws.on('message', (data, isBinary) => {
    if (isBinary) return; // ignore binary from client
    let payload;
    try {
      payload = JSON.parse(data.toString());
    } catch (_) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON from client' }));
      return;
    }
    if (payload && payload.type === 'synthesize' && typeof payload.text === 'string') {
      synthesizeToClient(ws, payload.text);
    } else {
      ws.send(JSON.stringify({ type: 'error', message: 'Unsupported message' }));
    }
  });
});

server.on('error', (err) => {
  console.error('[tts-bridge] server error:', err);
});
