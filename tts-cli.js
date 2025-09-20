const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

// Load .env.local
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
} catch (e) {
  // ignore
}

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || '';
const MODEL = 'minimax/speech-02-turbo';
const VOICE = 'English_Trustworth_Man';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function synthesize(text, outputFile) {
  if (!REPLICATE_API_TOKEN) {
    console.error('Missing REPLICATE_API_TOKEN');
    return;
  }

  const replicate = new Replicate({
    auth: REPLICATE_API_TOKEN,
  });

  try {
    console.log('Starting TTS prediction with Replicate...');
    let prediction = await replicate.predictions.create({
      model: MODEL,
      input: {
        text: text,
        voice_id: VOICE,
        speed: 0.8,
      },
    });

    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await sleep(1000);
      prediction = await replicate.predictions.get(prediction.id);
      console.log('Prediction status:', prediction.status);
    }

    if (prediction.status === 'failed') {
      throw new Error(`Prediction failed: ${prediction.error}`);
    }

    const outputUrl = prediction.output;
    console.log('Fetching audio from:', outputUrl);
    const response = await fetch(outputUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    const audioBuffer = await response.arrayBuffer();
    fs.writeFileSync(outputFile, Buffer.from(audioBuffer));
    console.log(`Audio saved to ${outputFile}`);

  } catch (error) {
    console.error('Error during TTS:', error);
  }
}

const text = process.argv[2];
if (!text) {
  console.log('Usage: node tts-cli.js "<text to synthesize>"');
  process.exit(1);
}

const outputFile = process.argv[3] || 'output.mp3';

synthesize(text, outputFile);
