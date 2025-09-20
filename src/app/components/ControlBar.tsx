'use client';

import React, { useEffect, useRef } from 'react';

type ControlBarProps = {
  textModeEnabled: boolean;
  textInput: string;
  setTextInput: (v: string) => void;
  handleToggleTextMode: () => void;
  handleTextKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>;
  isRecording: boolean;
  elapsedLabel: string;
  onMicClick: () => void | Promise<void>;
  canSendFromControls: boolean;
  loading: boolean;
  onSendFromControls: () => void | Promise<void>;
  statusMessage: string | null;
};

/**
 * ControlBar
 * Extracted to a standalone component to prevent remounts on each parent render.
 * This fixes focus loss in the text input and ensures the mic toggle sees fresh state.
 *
 * Used by [src/app/page.tsx](src/app/page.tsx)
 */
export default function ControlBar(props: ControlBarProps) {
  const {
    textModeEnabled,
    textInput,
    setTextInput,
    handleToggleTextMode,
    handleTextKeyDown,
    isRecording,
    elapsedLabel,
    onMicClick,
    canSendFromControls,
    loading,
    onSendFromControls,
    statusMessage,
  } = props;

  const textRef = useRef<HTMLTextAreaElement | null>(null);

  // When Text Mode is enabled, focus the input once.
  useEffect(() => {
    if (textModeEnabled && textRef.current) {
      // Place caret at the end
      const el = textRef.current;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [textModeEnabled]);

  return (
    <div className="w-full max-w-3xl mt-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Text toggle / input */}
        <div className="flex-1 min-w-[80px]">
          {!textModeEnabled ? (
            <button
              type="button"
              onClick={handleToggleTextMode}
              className="px-3 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors duration-200"
              aria-expanded={textModeEnabled}
              aria-controls="text-mode-input"
            >
              Text
            </button>
          ) : (
            <div className="w-full transition-all duration-200 ease-in-out motion-reduce:transition-none">
              <label htmlFor="text-mode-input" className="sr-only">Type a message</label>
              <textarea
                ref={textRef}
                id="text-mode-input"
                rows={1}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleTextKeyDown}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Type a message… (Enter to send, Shift+Enter newline, Esc to collapse)"
              />
            </div>
          )}
        </div>

        {/* Mic button in the middle; on narrow screens it can wrap above send */}
        <div className="flex-none">
          <button
            type="button"
            onClick={onMicClick}
            aria-pressed={isRecording}
            className={`px-3 py-2 rounded-md transition-all duration-200 ease-in-out motion-reduce:transition-none
              ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            <div className="flex items-center gap-2">
              {/* Mic / Recording indicator */}
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full
                ${isRecording ? 'bg-red-300 motion-safe:animate-pulse motion-reduce:bg-red-400' : 'bg-gray-300'}`}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">
                {isRecording ? `Recording… ${elapsedLabel}` : 'Record'}
              </span>
            </div>
          </button>
        </div>

        {/* Send button on the right */}
        <div className="flex-none ml-auto">
          <button
            type="button"
            onClick={onSendFromControls}
            disabled={!canSendFromControls || loading}
            className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500 transition-colors duration-200"
          >
            {loading ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>

      {/* Inline non-blocking status near the mic button */}
      <div className="mt-2 text-sm text-gray-300" aria-live="polite">
        {statusMessage}
      </div>
    </div>
  );
}