'use client';

import { useState, useEffect } from 'react';

interface SettingsProps {
  show: boolean;
  onClose: () => void;
  onSave: (settings: { systemPrompt: string; speed: number; pitch: number }) => void;
}

export default function Settings({ show, onClose, onSave }: SettingsProps) {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);

  useEffect(() => {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      const { systemPrompt, speed, pitch } = JSON.parse(savedSettings);
      setSystemPrompt(systemPrompt);
      setSpeed(speed);
      setPitch(pitch);
    }
  }, []);

  const handleSave = () => {
    onSave({ systemPrompt, speed, pitch });
    onClose();
  };

  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Settings</h2>
        <div className="mb-4">
          <label className="block mb-2">System Prompt</label>
          <textarea
            className="w-full p-2 bg-gray-700 rounded-lg"
            rows={5}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Speed</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Pitch</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.1"
            value={pitch}
            onChange={(e) => setPitch(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg mr-2">Close</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 rounded-lg">Save</button>
        </div>
      </div>
    </div>
  );
}
