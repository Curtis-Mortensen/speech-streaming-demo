'use client';
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Image from 'next/image';
import './animations.css';
const socket = io();
export default function Home() {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const audioContextRef = useRef(null);
    const audioQueueRef = useRef([]);
    const isPlayingRef = useRef(false);
    useEffect(() => {
        const storedChatHistory = localStorage.getItem('chatHistory');
        if (storedChatHistory) {
            setChatHistory(JSON.parse(storedChatHistory));
        }
        socket.on('audio-chunk', (chunk) => {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
            audioQueueRef.current.push(chunk);
            if (!isPlayingRef.current) {
                playAudioQueue();
            }
        });
        socket.on('audio-end', () => {
            setIsSpeaking(false);
        });
        return () => {
            socket.off('audio-chunk');
            socket.off('audio-end');
        };
    }, []);
    useEffect(() => {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }, [chatHistory]);
    const playAudioQueue = async () => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            return;
        }
        isPlayingRef.current = true;
        const chunk = audioQueueRef.current.shift();
        const audioBuffer = await audioContextRef.current.decodeAudioData(chunk);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = playAudioQueue;
        source.start();
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message)
            return;
        const newChatHistory = [...chatHistory, { role: 'user', content: message }];
        setChatHistory(newChatHistory);
        setMessage('');
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantResponse = '';
        while (true) {
            const { value, done } = await reader.read();
            if (done)
                break;
            const chunk = decoder.decode(value);
            assistantResponse += chunk;
            setChatHistory([...newChatHistory, { role: 'assistant', content: assistantResponse }]);
        }
        setIsSpeaking(true);
        socket.emit('text-to-speech', assistantResponse);
    };
    return (<div className="font-sans min-h-screen bg-gray-100">
      <main className={`flex flex-col items-center justify-center min-h-screen transition-all duration-500 ${showTranscript ? 'mr-96' : ''}`}>
        <div className={`microphone-icon ${isSpeaking ? 'speaking' : ''}`}>
          <Image src="/globe.svg" alt="Microphone" width={100} height={100}/>
        </div>
        <form onSubmit={handleSubmit} className="mt-8">
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} className="w-96 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type your message..."/>
        </form>
      </main>
      <div className={`fixed top-0 right-0 h-full bg-white w-96 shadow-lg transform transition-transform duration-500 ${showTranscript ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Transcript</h2>
          <div className="h-full overflow-y-auto">
            {chatHistory.map((chat, index) => (<div key={index} className={`mb-4 ${chat.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`p-2 rounded-lg ${chat.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                  {chat.content}
                </div>
              </div>))}
          </div>
        </div>
      </div>
      <button onClick={() => setShowTranscript(!showTranscript)} className="fixed bottom-4 right-4 px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg">
        View Transcript
      </button>
    </div>);
}
