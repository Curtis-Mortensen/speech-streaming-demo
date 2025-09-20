# Manual Verification Test Plan — Voice-first + Whisper STT

Scope: Validate voice-first controls, STT flow (Replicate Whisper large-v3), chat + TTS, and error paths in the current build. References:
- UI: [src/app/page.tsx](src/app/page.tsx)
- Chat API: [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
- TTS API: [src/app/api/tts/route.ts](src/app/api/tts/route.ts)
- STT API: [src/app/api/stt/route.ts](src/app/api/stt/route.ts)

Prerequisites:
- Install dependencies: npm install
- Configure env: copy [.env.local.example](../.env.local.example) to .env.local and fill keys
- Start dev: npm run dev

## 1) Setup and Environment Verification
- [ ] Ensure .env.local exists with:
  - [ ] OPENAI_API_KEY set (used by [src/app/api/chat/route.ts](src/app/api/chat/route.ts))
  - [ ] REPLICATE_API_TOKEN set (used by [src/app/api/tts/route.ts](src/app/api/tts/route.ts), [src/app/api/stt/route.ts](src/app/api/stt/route.ts))
- [ ] Start dev server: npm run dev
- [ ] Load http://localhost:3000 and confirm page renders without console errors

## 2) Voice-first Controls — Visibility and Order
- [ ] On landing view, locate the compact control bar (beneath the hero controls)
- [ ] Confirm control order left→right: Text, Mic (Record), Send
- [ ] Click “View Transcript” to open transcript view, confirm the same control bar exists at the bottom with the same order

## 3) Text Mode Expand/Collapse + Keyboard Controls
- [ ] Initially collapsed: “Text” button visible
- [ ] Click “Text” → textarea expands with placeholder
- [ ] Type content and press Enter → sends message (should append user message, then AI message)
- [ ] Press Shift+Enter → inserts newline (does not send)
- [ ] Press Escape → collapses Text Mode (textarea hidden, “Text” button returns)

## 4) Recording Flow (STT)
- [ ] Click “Record” to request mic permissions; grant access
- [ ] While recording:
  - [ ] Red pulsing indicator shows
  - [ ] Elapsed timer visible and increasing
- [ ] Click “Record” again to stop
- [ ] Status changes to “Transcribing…” then “Transcription ready”
- [ ] Verify:
  - [ ] Transcript appears as the user message in the transcript view
  - [ ] User audio message has a play button; clicking toggles play/pause
- [ ] Click “Send” (or rely on auto-send if transcript routed via unified send) → triggers chat + TTS

Note: You may repeat with sample upload via curl:
```bash
curl -X POST http://localhost:3000/api/stt -F "audio=@public/test.webm;type=audio/webm"
```

## 5) Chat + TTS (Round-trip)
- [ ] After sending a user text/transcript:
  - [ ] AI’s text response should appear
  - [ ] AI audio should be synthesized and appended
  - [ ] Audio is playable; attempt autoplay occurs (may be blocked by browser policies)
- [ ] Verify manual playback works if autoplay is blocked

## 6) Error Paths
- Mic permission denied:
  - [ ] In browser settings, block mic for the site or deny prompt
  - [ ] Click “Record,” expect UI status to show “Microphone permission denied”
- Unsupported audio type:
  - [ ] Attempt to post an unsupported MIME type to POST /api/stt
  - [ ] Expect 415 with error { "error": "Unsupported media type: ..." }
- STT failure:
  - [ ] Temporarily disconnect network after “Transcribing…” begins
  - [ ] Expect a failure path (502 or error message) and UI status “Transcription failed”
- TTS failure:
  - [ ] Temporarily invalidate REPLICATE_API_TOKEN and attempt TTS
  - [ ] Expect server error and no audio returned

## 7) Mobile Considerations
- [ ] Test on a mobile device or simulator
- [ ] Confirm mic permission prompt appears and can be granted
- [ ] If not using localhost, serve over HTTPS; many mobile browsers require secure origin for getUserMedia

## 8) Known Caveats
- Object URL lifecycle:
  - [ ] Audio object URLs are created on the fly; ensure they are not leaked. The app revokes where appropriate, but long sessions may keep some around to allow replay.
- Autoplay policies:
  - [ ] Autoplay may fail silently; the app attempts autoplay and falls back to manual playback.

## 9) Optional Regression Checks
- [ ] Legacy hero textarea + Send still sends text and triggers AI text + TTS
- [ ] Multiple chats persist in localStorage and switching works