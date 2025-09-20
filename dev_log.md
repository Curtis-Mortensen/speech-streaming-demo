# Dev Log

## 2025-09-19 (America/Phoenix) - Staging branch

### Added
- Voice-first control bar (Text, Mic/Record, Send) rendered in the landing and transcript views. See [src/app/page.tsx](src/app/page.tsx) and extracted component [src/app/components/ControlBar.tsx](src/app/components/ControlBar.tsx).
- Whisper STT API route using Replicate with versioned model and SDK-managed upload. See [src/app/api/stt/route.ts](src/app/api/stt/route.ts).
- Decoupled voice flow:
  - Record toggles start/stop.
  - After stop, the take is buffered (duration displayed); user can re-record (discard previous) or press Send to transcribe and continue Chat → TTS.
- Documentation updates and test artifacts:
  - Updated STT docs with the new model usage and curl examples in [whisperAPI.md](whisperAPI.md) and [ReplicateAPI Documentation.md](ReplicateAPI Documentation.md).
  - Manual verification checklist in [docs/ManualTestPlan.md](docs/ManualTestPlan.md).
  - Sample env in [.env.local.example](.env.local.example) (OPENAI_API_KEY, REPLICATE_API_TOKEN).
  - Jest + RTL setup and basic UI tests in [src/__tests__/voice-first-ui.test.tsx](src/__tests__/voice-first-ui.test.tsx), [jest.config.ts](jest.config.ts), [jest.setup.ts](jest.setup.ts).

### Changed
- Replaced the legacy landing textarea + Send with the compact 3-control bar in [src/app/page.tsx](src/app/page.tsx).
- Extracted the inline control bar into [src/app/components/ControlBar.tsx](src/app/components/ControlBar.tsx) to prevent focus loss and stale-state closures.
- STT route switched from predictions.create + polling to replicate.run with a versioned slug so the SDK handles file uploads and avoids 404s. See [src/app/api/stt/route.ts](src/app/api/stt/route.ts).

### Fixed
- Mic toggle now correctly stops recording on second click and releases MediaStream tracks; status transitions: “Stopping…” → “Recorded mm:ss…”.
- Text Mode input no longer loses focus after each character (root cause: inline component remounting); focus behavior stabilized by extracting [ControlBar](src/app/components/ControlBar.tsx).
- STT media-type validation relaxed to accept audio/webm;codecs=opus and other audio types/extensions, eliminating 415 errors. See [src/app/api/stt/route.ts](src/app/api/stt/route.ts).
- Addressed Replicate 404 by versioning the Whisper model slug.
- Build error (duplicate detectedLanguage declarations) resolved by removing the duplicate block in [src/app/api/stt/route.ts](src/app/api/stt/route.ts).

### Known/Resolved Errors (with outcomes)
- “next: not found” on `npm run dev`
  - Cause: dependencies not installed.
  - Resolution: `npm install`.
- Mic would not stop on second click; no “Transcribing…” status
  - Cause: toggle logic + MediaRecorder lifecycle; missing awaited stop.
  - Resolution: toggle handler now branches on `isRecording`; awaited `stop` and released tracks; shows “Stopping…” then recorded status. See [src/app/page.tsx](src/app/page.tsx).
- Duplicate inputs (legacy textarea + expanding Text Mode)
  - Cause: legacy UI remained.
  - Resolution: removed legacy textarea/send in favor of the 3-control bar. See [src/app/page.tsx](src/app/page.tsx).
- STT 415 Unsupported media type: `audio/webm;codecs=opus`
  - Cause: strict MIME check.
  - Resolution: relaxed validation (accept `audio/*` and common audio extensions). See [src/app/api/stt/route.ts](src/app/api/stt/route.ts).
- STT 404 Not Found from Replicate predictions endpoint
  - Cause: unversioned model slug with predictions API.
  - Resolution: switched to `replicate.run` with versioned slug and SDK-managed upload:
    - Model version: `openai/whisper:8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e`
- STT 500 Internal Server Error during manual upload/polling path
  - Cause: manual upload + polling complexity and endpoint mismatch.
  - Resolution: removed manual upload/data URLs; `replicate.run` now handles File uploads; robust output normalization added.
- Build error (Turbopack): `detectedLanguage` defined multiple times
  - Cause: duplicate normalization block after refactor.
  - Resolution: removed the earlier duplicate block; single normalized pass remains. See [src/app/api/stt/route.ts](src/app/api/stt/route.ts).

### Model and Endpoints
- STT (Replicate Whisper):
  - Model version: `openai/whisper:8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e`
  - Route: POST `/api/stt` (multipart/form-data, field `audio`), implemented in [src/app/api/stt/route.ts](src/app/api/stt/route.ts)
- Chat (OpenAI): POST `/api/chat`, implemented in [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
- TTS (Replicate MiniMax): POST `/api/tts`, implemented in [src/app/api/tts/route.ts](src/app/api/tts/route.ts)

### UX Notes (Voice-first)
- Record buffers a take, shows duration, allows re-record before sending.
- Send (collapsed Text Mode) transcribes the buffered take via STT and continues Chat → TTS; user audio is playable in the transcript.
- Text Mode expands with animation and retains focus; Enter sends; Esc collapses.

### Testing and Verification
- Basic UI tests confirm:
  - 3-control bar order: Text, Record, Send.
  - Text Mode expands to a textbox; typing enables Send.
  - Initial Send disabled when no text/transcript.
- Manual tests are documented in [docs/ManualTestPlan.md](docs/ManualTestPlan.md).

---

## 2025-09-19 (America/Phoenix) - Main origin branch

### Added
- Animated slide-in Settings drawer with overlay/scrim; always-mounted with CSS transitions; Close button, overlay click, and ESC key to close; minimal open-focus and body scroll lock; reduced-motion support. See [src/app/components/Settings.tsx](src/app/components/Settings.tsx).
- Microphone indicator next to the Settings trigger; event-driven via HTMLAudioElement events (play/playing ⇒ speaking; pause/ended/stalled/error ⇒ idle); no new assets; accessible with sr-only status text. See [src/app/page.tsx](src/app/page.tsx).

### Changed
- Chat titles now default to a timestamp on creation; one-time migration on load renames legacy “New Chat” titles using chat ID–derived time when possible.
- Playing/responding state is now derived solely from audio element events to avoid race conditions; removed manual boolean toggles.

### Fixed
- Settings UI no longer appears permanently on the right; it now correctly toggles and animates in/out.

### Planned
- A11y: robust focus trap inside the drawer; confirm screen-reader labeling across controls.
- Mobile polish: verify iOS background scroll lock and overscroll behavior; refine animation durations/easing if needed.
- Documentation: keep README minimal and use dev_log as the single source of truth for detailed changes.

## Added
- Settings schema v1 + advanced TTS controls
- Right-side drawer for Settings with scrim and ESC-to-close
- Microphone indicator below title (collapsed) and top-center (expanded), pulses while audio is playing
- Multi-stage status indicators (Sending → Sent ✓ → Thinking → Responding)
- Animated transcript expansion (max-height + opacity transition)

## Changed
- New chat titles now use a timestamp format "HH:mm DD-MM-YY" for newly created chats
- Layout adjustment to hide the title when transcript expands; mic indicator remains at the top-center

## Fixed
- Settings UI now correctly hides when `show` is false; modal replaced by a right-side drawer

## Planned
- Optional migration of old chat titles to timestamp format
- Tune animation timings and easing
- Persist transcript open state per chat
- Accessibility polish (focus management, ARIA roles)