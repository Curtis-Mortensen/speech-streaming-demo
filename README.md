# Speech Streaming Demo

An AI voice synthesis demo built with Next.js, featuring text-to-speech using Replicate API.

## Development Stages

### Stage 1A: Standalone TTS Engine
- Build separate TTS engine module
- Implement Replicate API integration
- Add audio processing and file saving
- Create CLI interface for testing
- Test TTS pipeline independently
- Benefits: Isolated testing, clear API boundaries, reusability

### Stage 1B: Web Integration
- Create Next.js API route for TTS
- Build simple web UI with text input
- Connect UI to TTS API
- Test unified system

### Stage 2: Chat Interface
- Build chat UI around TTS functionality
- Add message history and replay
- Create new chats and open existing ones
- Integrate with OpenAI for chat responses

## Features

- Text-to-speech synthesis via Replicate API
- Audio playback and local saving
- Chat interface with message history
- Multiple chat sessions
- Audio replay for saved messages

## Architecture

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **APIs**: Replicate for text-to-speech, OpenAI for chat (Stage 2)
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
- Chat interface (Stage 2)

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

### Stage 1
1. Enter text in the input field
2. Click "Synthesize" button
3. Audio will play automatically
4. Audio is saved locally

### Stage 2 (Future)
1. Send chat messages
2. AI responds with text and speech
3. Replay previous audio messages
4. Switch between chat sessions

## Dependencies

- `replicate` for TTS API
- `openai` for chat API (Stage 2)
- Next.js, React, TypeScript, Tailwind CSS
