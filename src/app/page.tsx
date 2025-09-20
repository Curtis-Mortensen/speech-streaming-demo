'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ControlBar from './components/ControlBar';

interface Message {
  text: string;
  isUser: boolean;
  audioUrl?: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

interface SettingsType {
  systemPrompt: string;
  speed: number;
  pitch: number;
}

type MediaRecorderOrNull = MediaRecorder | null;

export default function Home() {
  // Existing chat state
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState(''); // legacy textarea (kept)
  const [loading, setLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<SettingsType>({
    systemPrompt: '',
    speed: 1,
    pitch: 0,
  });

  // New voice-first controls state
  const [textModeEnabled, setTextModeEnabled] = useState(false); // collapsed by default (voice-first)
  const [textInput, setTextInput] = useState(''); // separate text input for the compact bar
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorderOrNull>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [lastRecordingUrl, setLastRecordingUrl] = useState<string | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null); // aria-live feedback

  // New decoupled recording state
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDurationMs, setRecordedDurationMs] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Timer display for recording
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (!isRecording || !recordingStartedAt) return;
    let raf: number;
    let interval: number | undefined;
    const update = () => {
      setElapsedMs(Date.now() - recordingStartedAt);
      raf = requestAnimationFrame(update);
    };
    // Respect reduced motion: update less frequently
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      interval = window.setInterval(() => setElapsedMs(Date.now() - recordingStartedAt), 1000);
    } else {
      raf = requestAnimationFrame(update);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (interval) clearInterval(interval);
    };
  }, [isRecording, recordingStartedAt]);

  // Load/save chats
  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats) as Chat[];
      setChats(parsedChats);
      if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  // Project messages for current chat
  useEffect(() => {
    const chat = chats.find((c) => c.id === currentChatId);
    setCurrentMessages(chat ? chat.messages : []);
  }, [currentChatId, chats]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (currentPlayingUrl) URL.revokeObjectURL(currentPlayingUrl);
      if (lastRecordingUrl) URL.revokeObjectURL(lastRecordingUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Audio element ended listener
  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => setIsPlaying(false);
    audio?.addEventListener('ended', handleEnded);
    return () => {
      audio?.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Helpers
  const ensureChatId = () => {
    let chatId = currentChatId;
    let newChat = false;
    if (!chatId) {
      chatId = Date.now().toString();
      newChat = true;
    }
    return { chatId: chatId!, newChat };
  };

  const playAudioUrl = (url: string) => {
    if (!audioRef.current) return;
    if (currentPlayingUrl && currentPlayingUrl !== url) {
      // Best-effort cleanup of previous one if it was an object URL we created
      // Not revoking here because messages may still need to play it again
    }
    audioRef.current.src = url;
    audioRef.current.play().catch(() => {
      // Autoplay may be blocked; keep ready for manual play
    });
    setCurrentPlayingUrl(url);
    setIsPlaying(true);
  };

  const togglePlayPause = (audioUrl: string) => {
    if (!audioRef.current) return;
    if (isPlaying && currentPlayingUrl === audioUrl) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      playAudioUrl(audioUrl);
    }
  };

  // Unified send (text - either from text mode or from STT transcript)
  const sendTextToAI = async (userText: string) => {
    if (!userText.trim()) return;

    setLoading(true);
    const { chatId, newChat } = ensureChatId();

    const userMessage: Message = { text: userText, isUser: true };
    // Update current message list optimistically
    setCurrentMessages((prev) => [...prev, userMessage]);

    try {
      // Send to Chat
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, settings }),
      });
      if (!chatResponse.ok) throw new Error('Failed to get chat response');
      const { response: aiResponse } = await chatResponse.json();

      // TTS for AI response
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiResponse, settings }),
      });
      if (!ttsResponse.ok) throw new Error('Failed to synthesize audio');

      const blob = await ttsResponse.blob();
      const url = URL.createObjectURL(blob);

      const aiMessage: Message = { text: aiResponse, isUser: false, audioUrl: url };
      setCurrentMessages((prev) => [...prev, aiMessage]);

      // Persist chat history
      if (newChat) {
        const newChatData: Chat = { id: chatId, title: userText, messages: [userMessage, aiMessage] };
        setChats((prev) => [...prev, newChatData]);
        setCurrentChatId(chatId);
      } else {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, messages: [...chat.messages, userMessage, aiMessage] }
              : chat
          )
        );
      }

      // Attempt autoplay
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => {});
        setCurrentPlayingUrl(url);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Legacy textarea send preserved (calls unified)
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    await sendTextToAI(text);
  };

  // Text Mode handlers
  const handleToggleTextMode = () => {
    setTextModeEnabled((v) => !v);
  };
  const handleTextKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (textInput.trim()) {
        const toSend = textInput;
        setTextInput('');
        sendTextToAI(toSend);
      }
    } else if (e.key === 'Escape') {
      setTextModeEnabled(false);
    }
  };

  const canUseMime = (mime: string) => {
    return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported ? MediaRecorder.isTypeSupported(mime) : false;
  };

  // Recording
  const startRecording = async () => {
    try {
      // Clear any previous take (fresh recording), but do not revoke lastRecordingUrl here.
      setRecordedBlob(null);
      setRecordedDurationMs(null);
      setLastTranscript(null);
      setElapsedMs(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer webm/opus
      let mimeType = 'audio/webm;codecs=opus';
      if (!canUseMime(mimeType)) {
        mimeType = canUseMime('audio/webm') ? 'audio/webm' : '';
      }

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      // Immediate UI update for responsiveness
      setIsRecording(true);
      setRecordingStartedAt(Date.now());
      setStatusMessage('Recording started');

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mr.onstart = () => {
        // no-op; we already set state above
      };
      mr.onstop = () => {
        setIsRecording(false);
        // We'll set final status after building the blob in stopRecording
      };
      mr.start();
    } catch (err: any) {
      console.error('getUserMedia error:', err);
      setStatusMessage(err?.name === 'NotAllowedError' ? 'Microphone permission denied' : 'Unable to access microphone');
    }
  };

  const stopRecording = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    // Immediate UI update
    setIsRecording(false);
    setStatusMessage('Stopping…');

    // Wait for MediaRecorder to fully stop so the final dataavailable chunk is captured
    if (mr.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const handleStop = () => resolve();
        mr.addEventListener('stop', handleStop, { once: true } as any);
        try {
          mr.stop();
        } catch {
          resolve();
        }
      });
    }

    // Release mic tracks
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;

    // Build blob
    const chunks = audioChunksRef.current.slice();
    audioChunksRef.current = [];

    if (!chunks.length) {
      setStatusMessage('No audio captured');
      return;
    }

    // Determine mime type (fallback to webm)
    const mime = (mr as any)?.mimeType || 'audio/webm';
    const blob = new Blob(chunks, { type: mime });

    const url = URL.createObjectURL(blob);
    setLastRecordingUrl(url);

    // Save recording but DO NOT auto-transcribe
    setRecordedBlob(blob);

    const startedAt = recordingStartedAt || Date.now();
    const durMs = Math.max(0, Date.now() - startedAt);
    setRecordedDurationMs(durMs);

    // Format mm:ss for status
    const sec = Math.floor(durMs / 1000);
    const mm = Math.floor(sec / 60).toString().padStart(2, '0');
    const ss = (sec % 60).toString().padStart(2, '0');

    setStatusMessage(`Recorded ${mm}:${ss}. Click Send to transcribe, or click Record to re-record.`);
  };

  const onMicClick = async () => {
    if (isRecording) {
      await stopRecording();
    } else if (recordedBlob) {
      // Re-record requested: discard previous take
      if (lastRecordingUrl) {
        try { URL.revokeObjectURL(lastRecordingUrl); } catch {}
      }
      setRecordedBlob(null);
      setRecordedDurationMs(null);
      setLastRecordingUrl(null);
      setLastTranscript(null);
      setStatusMessage('Re-recording…');
      await startRecording();
    } else {
      await startRecording();
    }
  };

  const canSendFromControls = useMemo(() => {
    if (textModeEnabled) {
      return !!textInput.trim();
    }
    // Voice-first: allow Send when we have a recorded blob ready,
    // or when there's a transcript present (edge case).
    return !!recordedBlob || !!(lastTranscript && lastTranscript.trim());
  }, [textModeEnabled, textInput, recordedBlob, lastTranscript]);

  const onSendFromControls = async () => {
    if (!canSendFromControls) return;
    if (textModeEnabled) {
      const toSend = textInput.trim();
      setTextInput('');
      await sendTextToAI(toSend);
    } else {
      // Voice-first flow
      if (recordedBlob) {
        // Transcribe first
        setStatusMessage('Transcribing…');
        try {
          const fd = new FormData();
          const blobType = recordedBlob.type || '';
          const filename =
            blobType.includes('webm') ? 'clip.webm' :
            blobType.includes('ogg') ? 'clip.ogg' :
            blobType.includes('wav') ? 'clip.wav' :
            blobType.includes('m4a') ? 'clip.m4a' :
            blobType.includes('mp4') ? 'clip.mp4' :
            'clip.webm';
          fd.append('audio', recordedBlob, filename);

          const sttRes = await fetch('/api/stt', { method: 'POST', body: fd });
          if (!sttRes.ok) {
            const txt = await sttRes.text();
            throw new Error(`STT failed: ${txt}`);
          }
          const data = (await sttRes.json()) as { transcript: string; language?: string; durationMs?: number };
          const transcript = (data.transcript || '').trim();
          setLastTranscript(transcript);
          setStatusMessage('Transcription ready');

          // Append user message with recorded audio (first time, since we didn't append on stop)
          const userAudioMessage: Message = {
            text: transcript,
            isUser: true,
            audioUrl: lastRecordingUrl || undefined,
          };

          const { chatId, newChat } = ensureChatId();
          setCurrentMessages((prev) => [...prev, userAudioMessage]);

          if (newChat) {
            const newChatData: Chat = { id: chatId, title: transcript || 'Voice note', messages: [userAudioMessage] };
            setChats((prev) => [...prev, newChatData]);
            setCurrentChatId(chatId);
          } else {
            setChats((prev) =>
              prev.map((chat) =>
                chat.id === chatId ? { ...chat, messages: [...chat.messages, userAudioMessage] } : chat
              )
            );
          }

          // Immediately send transcript through chat -> TTS pipeline
          if (transcript) {
            await sendTextToAI(transcript);
          }

          // Optionally clear recordedBlob to prevent duplicate sends; keep URL for playback
          setRecordedBlob(null);
        } catch (err) {
          console.error(err);
          setStatusMessage('Transcription failed');
          // Keep recordedBlob so user can retry
        }
      } else if (lastTranscript) {
        const toSend = lastTranscript.trim();
        setLastTranscript(null);
        await sendTextToAI(toSend);
      }
    }
  };

  // Small formatter for timer
  const elapsedLabel = useMemo(() => {
    const sec = Math.floor(elapsedMs / 1000);
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [elapsedMs]);

  // Compact control bar moved to [src/app/components/ControlBar.tsx](src/app/components/ControlBar.tsx)

  return (
    <div className="bg-gray-900 text-white min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Chats</h2>
        <button onClick={() => {
          setCurrentChatId(null);
          setCurrentMessages([]);
          setInputText('');
          setTextInput('');
          setLastTranscript(null);
        }} className="mb-4 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">New Chat</button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="mb-4 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
        >
          {showSettings ? 'Hide Settings' : 'Show Settings'}
        </button>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setCurrentChatId(chat.id)}
              className={`p-2 rounded-lg cursor-pointer ${currentChatId === chat.id ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            >
              {chat.title}
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 items-center justify-center">
        {!showTranscript ? (
          <div className="flex flex-col items-center w-full">
            <h1 className="text-4xl font-bold mb-8">Speech Streaming Demo</h1>

            {/* Voice-first control bar (replaces legacy textarea+send) */}
            <ControlBar
              textModeEnabled={textModeEnabled}
              textInput={textInput}
              setTextInput={setTextInput}
              handleToggleTextMode={handleToggleTextMode}
              handleTextKeyDown={handleTextKeyDown}
              isRecording={isRecording}
              elapsedLabel={elapsedLabel}
              onMicClick={onMicClick}
              canSendFromControls={canSendFromControls}
              loading={loading}
              onSendFromControls={onSendFromControls}
              statusMessage={statusMessage}
            />

            <button
              className="mt-8 px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
              onClick={() => setShowTranscript(true)}
            >
              View Transcript
            </button>
          </div>
        ) : (
          <main className="flex flex-col flex-1 p-4 md:p-6 w-full max-w-3xl">
            <div className="flex-1 overflow-y-auto">
              {currentMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex my-2 items-center ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`p-3 rounded-lg max-w-lg ${message.isUser ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    {message.text}
                  </div>
                  {message.audioUrl && (
                    <button
                      onClick={() => togglePlayPause(message.audioUrl!)}
                      className="ml-2 p-2 bg-gray-700 rounded-full hover:bg-gray-600"
                      aria-label={isPlaying && currentPlayingUrl === message.audioUrl ? 'Pause audio' : 'Play audio'}
                    >
                      {isPlaying && currentPlayingUrl === message.audioUrl ? (
                        // pause icon
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        // play icon
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom input area replaced by compact control bar */}
            <div className="mt-4 flex flex-col items-center">
              <button
                className="mb-4 px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 self-center"
                onClick={() => setShowTranscript(false)}
              >
                Hide Transcript
              </button>

              {/* New compact voice-first control bar at bottom */}
              <ControlBar
                textModeEnabled={textModeEnabled}
                textInput={textInput}
                setTextInput={setTextInput}
                handleToggleTextMode={handleToggleTextMode}
                handleTextKeyDown={handleTextKeyDown}
                isRecording={isRecording}
                elapsedLabel={elapsedLabel}
                onMicClick={onMicClick}
                canSendFromControls={canSendFromControls}
                loading={loading}
                onSendFromControls={onSendFromControls}
                statusMessage={statusMessage}
              />
            </div>
          </main>
        )}
        <audio ref={audioRef} className="hidden" />
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Settings</h2>
            <div className="mb-4">
              <label className="block mb-2">System Prompt</label>
              <textarea
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={settings.systemPrompt}
                onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2">Speed: {settings.speed}</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.speed}
                onChange={(e) => setSettings({ ...settings, speed: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2">Pitch: {settings.pitch}</label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={settings.pitch}
                onChange={(e) => setSettings({ ...settings, pitch: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}