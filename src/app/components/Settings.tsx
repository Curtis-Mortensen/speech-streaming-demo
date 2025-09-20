'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SettingsSpecV1, clampSettingsToSpec, DEFAULT_SETTINGS_V1 } from '../../types/settings';
import { VOICE_OPTIONS, DEFAULT_VOICE_ID } from '../../constants/voices';

type LegacySave = (settings: { systemPrompt: string; speed: number; pitch: number }) => void;

type ControlledProps = {
  settings: SettingsSpecV1;
  onChange: (next: SettingsSpecV1) => void;
  show?: boolean;
  onClose?: () => void;
};

type LegacyProps = {
  show?: boolean;
  onClose?: () => void;
  onSave?: LegacySave;
};

type SettingsProps = ControlledProps | LegacyProps;

function isControlledProps(p: SettingsProps): p is ControlledProps {
  return typeof (p as ControlledProps).onChange === 'function' && (p as any).settings != null;
}

function isInVoiceOptions(id: string) {
  return VOICE_OPTIONS.some(v => v.id === id);
}

function formatPitchLabel(semitones: number) {
  const sign = semitones > 0 ? '+' : '';
  return `${sign}${semitones} st`;
}

function formatNumber1(n: number) {
  return n.toFixed(1);
}

export default function Settings(props: SettingsProps) {
  // Back-compat: legacy internal state
  const [legacyState, setLegacyState] = useState(() => ({
    systemPrompt: '',
    speed: 1,
    pitch: 0,
  }));

  // Load legacy defaults from localStorage if using Legacy mode
  useEffect(() => {
    if (!isControlledProps(props)) {
      try {
        const saved = localStorage.getItem('settings');
        if (saved) {
          const { systemPrompt, speed, pitch } = JSON.parse(saved);
          setLegacyState({
            systemPrompt: typeof systemPrompt === 'string' ? systemPrompt : '',
            speed: typeof speed === 'number' ? speed : 1,
            pitch: typeof pitch === 'number' ? pitch : 0,
          });
        }
      } catch {
        // ignore
      }
    }
  }, [props]);

  // Controlled source of truth
  const controlled = isControlledProps(props);
  const settings: SettingsSpecV1 = useMemo(() => {
    if (controlled) return props.settings;
    // Legacy: synthesize a full settings object from legacy state
    return clampSettingsToSpec({
      ...DEFAULT_SETTINGS_V1,
      systemPrompt: legacyState.systemPrompt,
      speed: legacyState.speed,
      pitch: legacyState.pitch,
    });
  }, [controlled, props, legacyState]);

  // Advanced section state (UI only)
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Voice filtering + selection + custom override
  const [voiceFilter, setVoiceFilter] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState(() => {
    return isInVoiceOptions(settings.voiceId) ? settings.voiceId : DEFAULT_VOICE_ID;
  });
  const [customVoiceText, setCustomVoiceText] = useState(() => (isInVoiceOptions(settings.voiceId) ? '' : settings.voiceId));
  const selectedVoiceIdRef = useRef(selectedVoiceId);

  useEffect(() => {
    // Sync local UI state when external settings change
    if (isInVoiceOptions(settings.voiceId)) {
      setSelectedVoiceId(settings.voiceId);
      selectedVoiceIdRef.current = settings.voiceId;
      setCustomVoiceText('');
    } else {
      // Persist custom id in text box
      setCustomVoiceText(settings.voiceId);
      if (!isInVoiceOptions(selectedVoiceIdRef.current)) {
        setSelectedVoiceId(DEFAULT_VOICE_ID);
        selectedVoiceIdRef.current = DEFAULT_VOICE_ID;
      }
    }
  }, [settings.voiceId]);

  // nextSettings helper to clamp and propagate
  function nextSettings(patch: Partial<SettingsSpecV1>) {
    if (controlled) {
      const merged = clampSettingsToSpec({ ...settings, ...patch });
      props.onChange(merged);
    } else {
      // Legacy: maintain only compatible fields locally and call onSave when user clicks Save
      const merged = clampSettingsToSpec({ ...settings, ...patch });
      setLegacyState({
        systemPrompt: merged.systemPrompt,
        speed: merged.speed,
        pitch: merged.pitch,
      });
    }
  }

  // Filtered voices
  const filteredVoices = useMemo(() => {
    const f = voiceFilter.trim().toLowerCase();
    if (!f) return VOICE_OPTIONS;
    return VOICE_OPTIONS.filter(v => v.id.toLowerCase().includes(f) || v.label.toLowerCase().includes(f));
  }, [voiceFilter]);

  // Language boost input using datalist for common options
  const commonLanguageBoosts = ['English', 'Chinese', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Hindi', 'Portuguese'];

  // Drawer visibility helpers + ESC-to-close
  const hasShowProp = React.useMemo(() => Object.prototype.hasOwnProperty.call(props as any, 'show'), [props]);
  const show = hasShowProp ? Boolean((props as any).show) : false;

  useEffect(() => {
    if (!hasShowProp || !show) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        (props as any).onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [hasShowProp, show, props]);

  // Focus management: focus heading on open
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const prevShowRef = useRef<boolean>(show);

  useEffect(() => {
    const prev = prevShowRef.current;
    if (hasShowProp && show && !prev) {
      headingRef.current?.focus();
    }
    prevShowRef.current = show;
  }, [hasShowProp, show]);

  // Body scroll lock while drawer is open
  useEffect(() => {
    if (!hasShowProp) return;
    if (show) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [hasShowProp, show]);

  const content = (
    <div className="w-full max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>

      {/* Basic Group */}
      <div className="space-y-6">
        {/* System Prompt */}
        <div>
          <label className="block mb-2">System Prompt</label>
          <textarea
            className="w-full p-2 bg-gray-700 dark:bg-slate-800 border border-gray-600 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            value={settings.systemPrompt}
            onChange={(e) => nextSettings({ systemPrompt: e.target.value })}
            placeholder="e.g., You are a helpful voice assistant..."
          />
          <p className="text-xs text-gray-400 mt-1">Optional instruction that guides the model’s responses.</p>
        </div>

        {/* Voice Selection */}
        <div>
          <label className="block mb-2">Voice</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="flex-1 p-2 bg-gray-700 dark:bg-slate-800 border border-gray-600 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="Filter voices..."
              value={voiceFilter}
              onChange={(e) => setVoiceFilter(e.target.value)}
            />
            <select
              className="p-2 bg-gray-700 dark:bg-slate-800 border border-gray-600 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              value={selectedVoiceId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedVoiceId(id);
                selectedVoiceIdRef.current = id;
                if (!customVoiceText.trim()) {
                  nextSettings({ voiceId: id });
                }
              }}
            >
              {filteredVoices.map(v => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </div>
          <label className="block mb-2">Custom Voice ID</label>
          <input
            type="text"
            className="w-full p-2 bg-gray-700 dark:bg-slate-800 border border-gray-600 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            placeholder="Enter exact voice ID to override selection"
            value={customVoiceText}
            onChange={(e) => {
              const t = e.target.value;
              setCustomVoiceText(t);
              const trimmed = t.trim();
              if (trimmed.length > 0) {
                nextSettings({ voiceId: trimmed });
              } else {
                nextSettings({ voiceId: selectedVoiceIdRef.current });
              }
            }}
          />
          <p className="text-xs text-gray-400 mt-1">
            When provided, Custom Voice ID overrides the selected voice. Leave empty to use the dropdown.
          </p>
        </div>

        {/* Speed */}
        <div>
          <label className="block mb-2">Speed: {formatNumber1(settings.speed)}x</label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={settings.speed}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              nextSettings({ speed: v });
            }}
            className="w-full"
          />
        </div>

        {/* Pitch */}
        <div>
          <label className="block mb-2">Pitch (semitones): {formatPitchLabel(settings.pitch)}</label>
          <input
            type="range"
            min={-12}
            max={12}
            step={1}
            value={settings.pitch}
            onChange={(e) => {
              const v = Math.round(parseFloat(e.target.value));
              nextSettings({ pitch: v });
            }}
            className="w-full"
          />
        </div>
      </div>

      {/* Advanced Section */}
      <div className="mt-6">
        <button
          type="button"
          className="px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          onClick={() => setAdvancedOpen(o => !o)}
        >
          {advancedOpen ? 'Hide Advanced TTS' : 'Show Advanced TTS'}
        </button>

        {advancedOpen && (
          <div className="mt-4 space-y-6 border border-gray-700 dark:border-slate-700 rounded-lg p-4 bg-gray-800 dark:bg-slate-800">
            {/* Volume */}
            <div>
              <label className="block mb-2">Volume: {formatNumber1(settings.volume)}x</label>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={settings.volume}
                onChange={(e) => nextSettings({ volume: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Emotion */}
            <div>
              <label className="block mb-2">Emotion</label>
              <select
                className="w-full p-2 bg-gray-700 dark:bg-slate-800 border border-gray-600 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                value={settings.emotion ?? 'auto'}
                onChange={(e) => nextSettings({ emotion: e.target.value as NonNullable<SettingsSpecV1['emotion']> })}
              >
                {['auto','neutral','happy','sad','angry','fearful','disgusted','surprised'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Select an emotion; auto lets the service choose.</p>
            </div>

            {/* English Normalization */}
            <div className="flex items-center gap-2">
              <input
                id="englishNormalization"
                type="checkbox"
                checked={settings.englishNormalization}
                onChange={(e) => nextSettings({ englishNormalization: e.target.checked })}
              />
              <label htmlFor="englishNormalization">English Text Normalization</label>
            </div>

            {/* Language Boost */}
            <div>
              <label className="block mb-2">Language Boost</label>
              <input
                list="languageBoostOptions"
                className="w-full p-2 bg-gray-700 dark:bg-slate-800 border border-gray-600 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                value={settings.languageBoost ?? ''}
                placeholder="Choose common or type your own (e.g., English)"
                onChange={(e) => nextSettings({ languageBoost: e.target.value })}
              />
              <datalist id="languageBoostOptions">
                {commonLanguageBoosts.map(l => <option key={l} value={l} />)}
              </datalist>
              <p className="text-xs text-gray-400 mt-1">Pick a language to bias pronunciation and phonetics.</p>
            </div>

            {/* Sample Rate */}
            <div>
              <label className="block mb-2">Sample Rate</label>
              <select
                className="w-full p-2 bg-gray-700 dark:bg-slate-800 border border-gray-600 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                value={settings.sampleRate}
                onChange={(e) => nextSettings({ sampleRate: Number(e.target.value) as SettingsSpecV1['sampleRate'] })}
              >
                {[16000, 22050, 32000, 44100, 48000].map(sr => <option key={sr} value={sr}>{sr} Hz</option>)}
              </select>
            </div>

            {/* Bitrate */}
            <div>
              <label className="block mb-2">Bitrate</label>
              <select
                className="w-full p-2 bg-gray-700 dark:bg-slate-800 border border-gray-600 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                value={settings.bitrate}
                onChange={(e) => nextSettings({ bitrate: Number(e.target.value) as SettingsSpecV1['bitrate'] })}
              >
                {[64000, 96000, 128000, 192000, 256000].map(br => {
                  const kbps = Math.round(br / 1000);
                  return <option key={br} value={br}>{kbps} kbps</option>;
                })}
              </select>
            </div>

            {/* Channel */}
            <div>
              <label className="block mb-2">Channel</label>
              <select
                className="w-full p-2 bg-gray-700 dark:bg-slate-800 border border-gray-600 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                value={settings.channel}
                onChange={(e) => nextSettings({ channel: e.target.value as SettingsSpecV1['channel'] })}
              >
                {['mono', 'stereo'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* TTS Model */}
            <div>
              <label className="block mb-2">TTS Model</label>
              <select
                className="w-full p-2 bg-gray-700 dark:bg-slate-800 border border-gray-600 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                value={settings.model}
                onChange={(e) => nextSettings({ model: e.target.value as SettingsSpecV1['model'] })}
              >
                {['minimax/speech-02-turbo', 'minimax/speech-02-hd'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Turbo: lower latency. HD: higher quality, higher latency.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer controls for legacy modal usage */}
      {!controlled && (props as LegacyProps).onSave && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              // Persist legacy settings key and call onSave
              try {
                localStorage.setItem('settings', JSON.stringify(legacyState));
              } catch {}
              (props as LegacyProps).onSave?.({
                systemPrompt: legacyState.systemPrompt,
                speed: legacyState.speed,
                pitch: legacyState.pitch,
              });
              (props as LegacyProps).onClose?.();
            }}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );

  // Drawer behavior when an explicit `show` prop is provided
  if (hasShowProp) {
    // Always-mounted overlay + slide-in drawer with conditional classes
    return (
      <div className={`fixed inset-0 z-50 ${show ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Overlay (Scrim) */}
        <div
          className={`fixed inset-0 bg-black transition-opacity duration-300 motion-reduce:transition-none ${show ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={(props as any).onClose}
        />

        {/* Drawer */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-drawer-title"
          className={`fixed inset-y-0 right-0 bg-white dark:bg-slate-900 dark:text-slate-100 shadow-xl z-50 w-screen sm:w-80 lg:w-96 h-full transition-transform duration-300 will-change-transform focus:outline-none motion-reduce:transition-none ${show ? 'translate-x-0 ease-out' : 'translate-x-full ease-in'}`}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
            <h2
              id="settings-drawer-title"
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-semibold"
            >
              Settings
            </h2>
            <button
              type="button"
              onClick={(props as any).onClose}
              className="rounded p-2 hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Close
            </button>
          </div>

          {/* Scrollable content */}
          <div className="h-[calc(100%-3rem)] overflow-y-auto overscroll-contain ios-smooth-scroll px-4 py-4 text-slate-900 dark:text-slate-100">
            {content}
          </div>
        </aside>
      </div>
    );
  }

  // Legacy inline rendering if no `show` prop is present
  return content;
}
