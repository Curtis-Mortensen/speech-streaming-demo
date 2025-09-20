'use client';

import { useState, useRef, useEffect } from 'react';
import Settings from './components/Settings';
import { SettingsSpecV1, DEFAULT_SETTINGS_V1, clampSettingsToSpec } from '../types/settings';

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
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Versioned settings state
  const [settings, setSettings] = useState<SettingsSpecV1>(DEFAULT_SETTINGS_V1);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Load chats
  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);
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

      const { response: aiResponse } = await chatResponse.json();

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
        const newChatData: Chat = { id: chatId, title: currentInputText, messages: [userMessage, aiMessage] };
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
        setIsPlaying(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayPause = (audioUrl: string) => {
    if (audioRef.current) {
        if (isPlaying && currentPlayingUrl === audioUrl) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.src = audioUrl;
            audioRef.current.play();
            setCurrentPlayingUrl(audioUrl);
            setIsPlaying(true);
        }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => setIsPlaying(false);
    audio?.addEventListener('ended', handleEnded);
    return () => {
      audio?.removeEventListener('ended', handleEnded);
    };
  }, []);

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
        <div className="w-64 bg-gray-800 p-4 flex flex-col">
            <h2 className="text-xl font-bold mb-4">Chats</h2>
            <button onClick={handleNewChat} className="mb-4 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">New Chat</button>
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="mb-4 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
                {showSettings ? 'Hide Settings' : 'Show Settings'}
            </button>
            <div className="flex-1 overflow-y-auto">
                {chats.map(chat => (
                    <div key={chat.id} onClick={() => setCurrentChatId(chat.id)} className={`p-2 rounded-lg cursor-pointer ${currentChatId === chat.id ? 'bg-gray-700' : 'hover:bg-gray-700'}`}>
                        {chat.title}
                    </div>
                ))}
            </div>
        </div>
      <div className="flex flex-col flex-1 items-center justify-center">
        {!showTranscript ? (
          <div className="flex flex-col items-center">
              <h1 className="text-4xl font-bold mb-8">Speech Streaming Demo</h1>
              <textarea
                  className="w-full max-w-lg p-4 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={5}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                  className="mt-4 px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500"
                  onClick={handleSendMessage}
                  disabled={loading}>
                  {loading ? 'Sending...' : 'Send'}
              </button>
              <button
              className="mt-8 px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
              onClick={() => setShowTranscript(true)}>
              View Transcript
              </button>
          </div>
        ) : (
          <main className="flex flex-col flex-1 p-4 md:p-6 w-full max-w-3xl">
            <div className="flex-1 overflow-y-auto">
              {currentMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex my-2 items-center ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`p-3 rounded-lg max-w-lg ${message.isUser ? 'bg-blue-600' : 'bg-gray-700'}`}>
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
                      <button onClick={() => togglePlayPause(message.audioUrl!)} className="ml-2 p-2 bg-gray-700 rounded-full hover:bg-gray-600">
                          {isPlaying && currentPlayingUrl === message.audioUrl ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          )}
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col items-center">
                <button
                    className="mb-4 px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 self-center"
                    onClick={() => setShowTranscript(false)}>
                    Hide Transcript
                </button>
                <textarea
                    className="w-full max-w-lg p-4 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                    className="mt-4 px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500"
                    onClick={handleSendMessage}
                    disabled={loading}>
                    {loading ? 'Sending...' : 'Send'}
                </button>
            </div>
          </main>
        )}
          <audio ref={audioRef} className="hidden" />
      </div>

      {/* Controlled Settings modal */}
      <Settings
        settings={settings}
        onChange={handleSettingsChange}
        show={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
