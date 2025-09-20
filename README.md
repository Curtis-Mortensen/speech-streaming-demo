# Speech Streaming Demo

An AI voice synthesis demo built with Next.js, featuring text-to-speech using Replicate API.
For ongoing change history and the roadmap, see [dev_log.md](dev_log.md).

## Changelog & Roadmap
See [dev_log.md](dev_log.md) for the canonical, dated changelog and upcoming plan.

## Features

- Right-side, slide-in Settings drawer with overlay/scrim and ESC/overlay-to-close
- Timestamp-based chat titles (automatic migration from legacy “New Chat” titles)
- Event-driven mic indicator that lights during AI playback (based on HTMLAudioElement events)
- Robust TTS workflow (Replicate-backed), with saved audio URLs for replay

## Architecture

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **APIs**: Replicate for text-to-speech, OpenAI for chat
- **Storage**: localStorage for chat and audio data

## Flow

1. User enters text and clicks synthesize
2. Text sent to Replicate API
3. Receive completed audio file URL
4. Download and play audio
5. Save audio locally for replay

## UI Layout

- Simple input field with default text
- Synthesize button
- Audio player controls
- Chat interface
- Right-side Settings drawer (slide-in) with overlay/scrim and ESC-to-close

## Getting Started

First, install dependencies:

```bash
npm install
```

Create `.env.local` file with API keys:

```
REPLICATE_API_TOKEN=your_replicate_api_token
OPENAI_API_KEY=your_openai_api_key
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

1. Enter text in the input field or send a chat message.
2. The system synthesizes speech via Replicate-backed TTS; audio plays automatically and is saved locally for replay.
3. The mic indicator lights during AI playback; press ESC or click the overlay to close the Settings drawer.
4. Replay previous audio messages and switch between chat sessions as needed.

## Dependencies

- `replicate` for TTS API
- `openai` for chat API
- Next.js, React, TypeScript, Tailwind CSS
