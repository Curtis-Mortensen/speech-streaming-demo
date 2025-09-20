'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Settings from './components/Settings';
import { SettingsSpecV1, DEFAULT_SETTINGS_V1, clampSettingsToSpec } from '../types/settings';
import ControlBar from './components/ControlBar';

// Helper: format chat title as "HH:mm DD-MM-YY"
function formatChatTitle(date: Date) {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const HH = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const DD = pad2(date.getDate());
  const MM = pad2(date.getMonth() + 1);
  const YY = pad2(date.getFullYear() % 100);
  return `${HH}:${mm} ${DD}-${MM}-${YY}`;
}

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  // Ref to Settings trigger for focus restore on close
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const prevShowSettingsRef = useRef<boolean>(showSettings);

  // Multi-stage status
  const [status, setStatus] = useState({
    sending: false,
    sent: false,
    thinking: false,
    responding: false,
    recording: false,
    saved: false,
  });

  // Versioned settings state
  const [settings, setSettings] = useState<SettingsSpecV1>(DEFAULT_SETTINGS_V1);

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

  // Load chats (with one-time title migration for legacy "New Chat"/empty titles)
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

  // Persist chats
  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  // Restore focus to Settings trigger when drawer closes
  useEffect(() => {
    const wasOpen = prevShowSettingsRef.current;
    if (wasOpen && !showSettings) {
      settingsTriggerRef.current?.focus();
    }
    prevShowSettingsRef.current = showSettings;
  }, [showSettings]);

  // Current messages per selected chat
  useEffect(() => {
    const chat = chats.find((c) => c.id === currentChatId);
    setCurrentMessages(chat ? chat.messages : []);
  }, [currentChatId, chats]);

  // Load versioned settings and migrate legacy if needed
  useEffect(() => {
    try {
      const v1 = localStorage.getItem('settings.v1');
      if (v1) {
        const parsed = JSON.parse(v1);
        const clamped = clampSettingsToSpec(parsed);
        setSettings(clamped);
        return;
      }
    } catch {
      // ignore parse errors
    }

    // Attempt legacy migration from 'settings' with { systemPrompt, speed, pitch }
    try {
      const legacyStr = localStorage.getItem('settings');
      if (legacyStr) {
        const legacy = JSON.parse(legacyStr) || {};
        const hasAny =
          typeof legacy.systemPrompt === 'string' ||
          typeof legacy.speed === 'number' ||
          typeof legacy.pitch === 'number';
        if (hasAny) {
          const migrated = clampSettingsToSpec({
            ...DEFAULT_SETTINGS_V1,
            systemPrompt: typeof legacy.systemPrompt === 'string' ? legacy.systemPrompt : DEFAULT_SETTINGS_V1.systemPrompt,
            speed: typeof legacy.speed === 'number' ? legacy.speed : DEFAULT_SETTINGS_V1.speed,
            pitch: typeof legacy.pitch === 'number' ? legacy.pitch : DEFAULT_SETTINGS_V1.pitch,
          });
          setSettings(migrated);
          try {
            localStorage.setItem('settings.v1', JSON.stringify(migrated));
          } catch {
            // ignore
          }
          return;
        }
      }
    } catch {
      // ignore parse errors
    }

    // Fallback to defaults if nothing else found
    setSettings(DEFAULT_SETTINGS_V1);
  }, []);

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

    setStatus({ sending: true, sent: false, thinking: true, responding: false, recording: false, saved: false });

    setLoading(true);
    const { chatId, newChat } = ensureChatId();

    const userMessage: Message = { text: userText, isUser: true };
    // Update current message list optimistically
    setCurrentMessages((prev) => [...prev, userMessage]);

    try {
      const chatMessagesForRequest = [
        ...currentMessages.map(m => ({ role: m.isUser ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: userText }
      ];

      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessagesForRequest, settings }),
      });
      if (!chatResponse.ok) throw new Error('Failed to get chat response');

      if (!chatResponse.ok) {
        throw new Error('Failed to get chat response');
      }

      // Request accepted by server: mark sent (thinking remains as set at start)
      setStatus(s => ({ ...s, sending: false, sent: true }));
      
      const { response: aiResponse } = await chatResponse.json();
      // AI text received -> thinking false
      setStatus(s => ({ ...s, thinking: false }));

      // TTS for AI response
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiResponse, settings }),
      });
      if (!ttsResponse.ok) throw new Error('Failed to synthesize audio');

      const { url } = await ttsResponse.json();

      const aiMessage: Message = { text: aiResponse, isUser: false, audioUrl: url };
      setCurrentMessages((prev) => [...prev, aiMessage]);

      // Persist chat history
      if (newChat) {
        const newChatData: Chat = { id: chatId, title: formatChatTitle(new Date()), messages: [userMessage, aiMessage] };
        setChats(prev => [...prev, newChatData]);
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
        playAudioUrl(url);
        // isPlaying and responding will be toggled by the 'playing' event listener
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
      setStatus(s => ({ ...s, recording: true, saved: false }));
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
    setStatus(s => ({ ...s, recording: false, saved: true }));
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
      setStatus(s => ({ ...s, saved: false }));
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
        setStatus(s => ({ ...s, sending: true, saved: false }));
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



  // Audio event wiring: single source of truth for speaking/playing status
  // this was created on the main branch without voice features - status indicators will need to be updated.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setIsSpeaking(true);
      setStatus(s => ({ ...s, responding: true }));
    };
    const handlePlaying = () => {
      setIsPlaying(true);
      setIsSpeaking(true);
      setStatus(s => ({ ...s, responding: true }));
    };
    const handlePause = () => {
      setIsPlaying(false);
      setIsSpeaking(false);
      setStatus(s => ({ ...s, responding: false }));
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setIsSpeaking(false);
      setStatus(s => ({ ...s, responding: false }));
    };
    const handleStalled = () => {
      setIsPlaying(false);
      setIsSpeaking(false);
      setStatus(s => ({ ...s, responding: false }));
    };
    const handleError = () => {
      setIsPlaying(false);
      setIsSpeaking(false);
      setStatus(s => ({ ...s, responding: false }));
    };
    // waiting: keep current value; do not flip to false unless paused/ended/error
    const handleWaiting = () => {
      // intentionally no-op
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', handleWaiting);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', handleWaiting);
    };
  }, []);

  // Reset 'sent' when both thinking and responding are false
  useEffect(() => {
    if (status.sent && !status.thinking && !status.responding) {
      setStatus(s => ({ ...s, sent: false }));
    }
  }, [status.sent, status.thinking, status.responding]);
  
  const handleNewChat = () => {
    setCurrentChatId(null);
    setCurrentMessages([]);
    setInputText('');
  };

  // Controlled Settings onChange: clamp and persist
  const handleSettingsChange = (next: SettingsSpecV1) => {
    const clamped = clampSettingsToSpec(next);
    setSettings(clamped);
    try {
      localStorage.setItem('settings.v1', JSON.stringify(clamped));
    } catch {
      // ignore quota errors
    }
  };
  
  const handleResynthesize = async (messageIndex: number) => {
    const msg = currentMessages[messageIndex];
    if (!msg) return;
    try {
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.text, settings }),
      });
      if (!ttsResponse.ok) {
        throw new Error('Failed to re-synthesize audio');
      }
      const blob = await ttsResponse.blob();
      const url = URL.createObjectURL(blob);

      setCurrentMessages(prev =>
        prev.map((m, i) => (i === messageIndex ? { ...m, audioUrl: url } : m))
      );

      setChats(prev => {
        if (!currentChatId) return prev;
        return prev.map(chat =>
          chat.id === currentChatId
            ? {
                ...chat,
                messages: chat.messages.map((m, i) =>
                  i === messageIndex ? { ...m, audioUrl: url } : m
                ),
              }
            : chat
        );
      });
    } catch (e) {
      console.error(e);
    }
  };
  
  return (
    <div className="bg-gray-900 text-white min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Chats</h2>
        <button onClick={handleNewChat} className="mb-4 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">New Chat</button>
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
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

      {/* Main */}
      <div className="flex flex-col flex-1 items-center p-6">
        {/* Title hidden when transcript expanded */}
        <div className="w-full max-w-3xl mx-auto mb-4 relative">
          {!showTranscript && (
            <h1 className="text-4xl font-bold mb-4 text-center">Speech Streaming Demo</h1>
          )}
          <button
            ref={settingsTriggerRef}
            onClick={() => setShowSettings(!showSettings)}
            className="absolute right-0 top-0 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            {showSettings ? 'Hide Settings' : 'Show Settings'}
          </button>
        </div>
        <div className="mb-3 flex items-center justify-center">
          <span
            title={isSpeaking ? 'AI is speaking' : 'Idle'}
            className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ring-inset ${isSpeaking ? 'bg-rose-500/20 ring-2 ring-rose-500 text-rose-400 animate-pulse' : 'bg-gray-800/40 ring-1 ring-gray-600 text-gray-300'}`}
          >
            <span className="sr-only">{isSpeaking ? 'AI is speaking' : 'AI is idle'}</span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-6 w-6"
              fill="currentColor"
            >
              <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3zm-7-3a7 7 0 0 0 14 0h-2a5 5 0 1 1-10 0H5zM11 19v3h2v-3h-2z"/>
            </svg>
          </span>
        </div>


        {/* Transcript toggle button below mic and above input */}
        {!showTranscript ? (
          <button
            className="mb-4 px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            onClick={() => setShowTranscript(true)}
          >
            View Transcript
          </button>
        ) : (
          <button
            className="mb-4 px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            onClick={() => setShowTranscript(false)}
          >
            Hide Transcript
          </button>
        )}


        {/* Animated transcript container */}
        <div
          className={`w-full max-w-3xl transition-all duration-300 overflow-hidden ${showTranscript ? 'max-h-[40vh] sm:max-h-[50vh] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="flex-1 overflow-y-auto pr-2 max-h-[40vh] sm:max-h-[50vh]">
            {currentMessages.map((message, index) => (
              <div
                key={index}
                className={`flex my-2 items-center ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`p-3 rounded-lg max-w-lg ${message.isUser ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  {message.text}
                </div>
                {!message.isUser && message.audioUrl && (
                  message.audioUrl.startsWith('blob:') ? (
                    <div className="ml-2 flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-yellow-700/30 border border-yellow-600 text-yellow-200 rounded">
                        Audio unavailable (legacy)
                      </span>
                      <button
                        onClick={() => handleResynthesize(index)}
                        className="px-2 py-1 bg-yellow-600 rounded hover:bg-yellow-500 text-sm"
                      >
                        Re-synthesize
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => togglePlayPause(message.audioUrl!)}
                      className="ml-2 p-2 bg-gray-700 rounded-full hover:bg-gray-600"
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
                  )
                )}
              </div>
            ))}
          </div>
        </div>


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

        <audio ref={audioRef} className="hidden" />

        <div className="w-full max-w-lg mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className={`px-2 py-1 rounded ${isRecording ? 'bg-red-700 animate-pulse' : 'bg-gray-700'}`}>
            Recording
          </span>
          <span className={`px-2 py-1 rounded ${recordedBlob ? 'bg-yellow-700' : 'bg-gray-700'}`}>
            Saved
          </span>
          <span className={`px-2 py-1 rounded ${status.sending ? 'bg-blue-700' : 'bg-gray-700'} `}>
            {status.sending ? 'Sending' : 'Sending'}
          </span>
          <span className={`px-2 py-1 rounded ${status.sent ? 'bg-green-700' : 'bg-gray-700'}`}>
            {status.sent ? 'Sent ✓' : 'Sent'}
          </span>
          <span className={`px-2 py-1 rounded ${status.thinking ? 'bg-purple-700 animate-pulse' : 'bg-gray-700'}`}>
            Thinking
          </span>
          <span className={`px-2 py-1 rounded ${status.responding ? 'bg-red-700 animate-pulse' : 'bg-gray-700'}`}>
            Responding
          </span>
        </div>
      </div>

      {/* Settings Drawer */}
      <Settings
        settings={settings}
        onChange={handleSettingsChange}
        show={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}