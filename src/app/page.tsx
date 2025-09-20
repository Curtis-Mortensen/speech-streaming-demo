'use client';

import { useState, useRef, useEffect } from 'react';

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
  const [settings, setSettings] = useState<SettingsType>({
    systemPrompt: '',
    speed: 1,
    pitch: 0
  });
  const audioRef = useRef<HTMLAudioElement>(null);

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

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    const chat = chats.find(c => c.id === currentChatId);
    setCurrentMessages(chat ? chat.messages : []);
  }, [currentChatId, chats]);

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
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentInputText, settings }),
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

      const blob = await ttsResponse.blob();
      const url = URL.createObjectURL(blob);
      
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

  const handleSettingsChange = (newSettings: SettingsType) => {
    setSettings(newSettings);
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
                    <button onClick={() => togglePlayPause(message.audioUrl!)} className="ml-2 p-2 bg-gray-700 rounded-full hover:bg-gray-600">
                        {isPlaying && currentPlayingUrl === message.audioUrl ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                    </button>
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
                onChange={(e) => setSettings({...settings, systemPrompt: e.target.value})}
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
                onChange={(e) => setSettings({...settings, speed: parseFloat(e.target.value)})}
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
                onChange={(e) => setSettings({...settings, pitch: parseFloat(e.target.value)})}
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
