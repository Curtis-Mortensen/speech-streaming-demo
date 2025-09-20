'use client';

import { useState, useRef, useEffect } from 'react';
import Settings from './components/Settings';
import { SettingsSpecV1, DEFAULT_SETTINGS_V1, clampSettingsToSpec } from '../types/settings';

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

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
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
  });

  // Versioned settings state
  const [settings, setSettings] = useState<SettingsSpecV1>(DEFAULT_SETTINGS_V1);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Load chats (with one-time title migration for legacy "New Chat"/empty titles)
  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats) as Chat[];

      // Migration: normalize title if it's "New Chat", empty, or whitespace
      const migratedChats = Array.isArray(parsedChats)
        ? parsedChats.map((chat) => {
            const rawTitle = typeof chat.title === 'string' ? chat.title : '';
            const needsMigration =
              rawTitle.trim().length === 0 || rawTitle === 'New Chat';

            if (!needsMigration) return chat;

            // Try to derive time from ID if it looks like a millisecond timestamp
            let derivedDate: Date | null = null;

            const tryNumber = (val: unknown) => {
              const num = typeof val === 'number' ? val : Number(val);
              return Number.isFinite(num) && num > 0 ? num : null;
            };

            // Prefer chat.id when it's a millis timestamp (string or number)
            const idAsMillis = tryNumber(chat.id);
            if (idAsMillis) {
              derivedDate = new Date(idAsMillis);
            }

            // Else, if a firstMessageTimestamp exists (legacy), derive from that
            if (!derivedDate) {
              const firstTs = (chat as any)?.firstMessageTimestamp;
              const firstAsMillis = tryNumber(firstTs);
              if (firstAsMillis) {
                derivedDate = new Date(firstAsMillis);
              }
            }

            // Fallback to "now" if nothing else available
            const finalDate = derivedDate ?? new Date();

            return {
              ...chat,
              title: formatChatTitle(finalDate),
            };
          })
        : parsedChats;

      setChats(migratedChats);
      if (migratedChats.length > 0) {
        setCurrentChatId(migratedChats[0].id);
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
    const chat = chats.find(c => c.id === currentChatId);
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

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Start multi-stage status on send initiation (covers Enter key and button click)
    setStatus({ sending: true, sent: false, thinking: true, responding: false });

    const currentInputText = inputText;
    setInputText('');
    setLoading(true);

    let chatId = currentChatId;
    let newChat = false;
    if (!chatId) {
        chatId = Date.now().toString();
        newChat = true;
    }

    const userMessage: Message = { text: currentInputText, isUser: true };
    setCurrentMessages(prev => [...prev, userMessage]);

    try {
      const chatMessagesForRequest = [
        ...currentMessages.map(m => ({ role: m.isUser ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: currentInputText }
      ];

      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: chatMessagesForRequest, settings }),
      });

      if (!chatResponse.ok) {
        throw new Error('Failed to get chat response');
      }

      // Request accepted by server: mark sent (thinking remains as set at start)
      setStatus(s => ({ ...s, sending: false, sent: true }));
      
      const { response: aiResponse } = await chatResponse.json();
      // AI text received -> thinking false
      setStatus(s => ({ ...s, thinking: false }));

      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: aiResponse, settings }),
      });

      if (!ttsResponse.ok) {
        throw new Error('Failed to synthesize audio');
      }

      const { url } = await ttsResponse.json();
      
      const aiMessage: Message = { text: aiResponse, isUser: false, audioUrl: url };
      setCurrentMessages(prev => [...prev, aiMessage]);

      if (newChat) {
        const newChatData: Chat = { id: chatId, title: formatChatTitle(new Date()), messages: [userMessage, aiMessage] };
        setChats(prev => [...prev, newChatData]);
        setCurrentChatId(chatId);
      } else {
        setChats(prev => prev.map(chat => 
          chat.id === chatId 
            ? { ...chat, messages: [...chat.messages, userMessage, aiMessage] } 
            : chat
        ));
      }

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setCurrentPlayingUrl(url);
        // isPlaying and responding will be toggled by the 'playing' event listener
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayPause = (audioUrl: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && currentPlayingUrl === audioUrl) {
      // Pause current; let audio events update speaking/playing state
      audio.pause();
    } else {
      // Switch source and play; rely on events to reflect state
      audio.src = audioUrl;
      audio.play();
      setCurrentPlayingUrl(audioUrl);
    }
  };

  // Audio event wiring: single source of truth for speaking/playing status
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
      const { url } = await ttsResponse.json();

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
        {!showTranscript && (
          <button
            className="mb-4 px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            onClick={() => setShowTranscript(true)}
          >
            View Transcript
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
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
        
        {showTranscript && (
          <button
            className="mb-4 px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            onClick={() => setShowTranscript(false)}
          >
            Hide Transcript
          </button>
        )}
        
        {/* Input */}
        <textarea
          className="w-full max-w-lg mt-2 p-4 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={showTranscript ? 3 : 5}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />

        {/* Status badges */}
        <div className="w-full max-w-lg mt-2 flex flex-wrap items-center gap-2 text-xs">
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

        {/* Send */}
        <button
          className="mt-3 px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500"
          onClick={handleSendMessage}
          disabled={loading || status.sending || status.thinking}
        >
          {loading || status.sending ? 'Sending...' : 'Send'}
        </button>

        <audio ref={audioRef} className="hidden" />
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
