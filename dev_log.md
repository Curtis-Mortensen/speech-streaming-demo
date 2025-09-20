# Dev Log

## 2025-09-19 (America/Phoenix)

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