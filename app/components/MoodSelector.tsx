'use client';

import { useState } from 'react';

interface MoodSelectorProps {
  onMoodSelect: (mood: string, intensity: number) => void;
}

const moods = [
  { name: 'Calm', emoji: '😌', color: 'bg-mental-calm' },
  { name: 'Anxious', emoji: '😰', color: 'bg-yellow-200' },
  { name: 'Happy', emoji: '😊', color: 'bg-mental-peace' },
  { name: 'Sad', emoji: '😢', color: 'bg-blue-200' },
  { name: 'Energetic', emoji: '⚡', color: 'bg-mental-energy' },
  { name: 'Tired', emoji: '😴', color: 'bg-gray-300' },
  { name: 'Stressed', emoji: '😫', color: 'bg-red-200' },
  { name: 'Neutral', emoji: '😐', color: 'bg-gray-200' },
];

export default function MoodSelector({ onMoodSelect }: MoodSelectorProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [isVisible, setIsVisible] = useState(true);

  const handleMoodClick = (moodName: string) => {
    setSelectedMood(moodName);
  };

  const handleSubmit = () => {
    if (selectedMood) {
      onMoodSelect(selectedMood, intensity);
      setIsVisible(false);
      setTimeout(() => setIsVisible(true), 60000); // Show again after 1 minute
    }
  };

  if (!isVisible) {
    return (
      <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
        <button
          onClick={() => setIsVisible(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Update mood check-in
        </button>
      </div>
    );
  }

  return (
    <div className="mood-selector">
      <h3 className="text-lg font-semibold mb-3 text-slate-800">How are you feeling?</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {moods.map((mood) => (
          <button
            key={mood.name}
            onClick={() => handleMoodClick(mood.name)}
            className={`mood-button ${mood.color} ${
              selectedMood === mood.name ? 'selected' : ''
            }`}
          >
            <div className="text-2xl mb-1">{mood.emoji}</div>
            <div className="text-xs">{mood.name}</div>
          </button>
        ))}
      </div>

      {selectedMood && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block text-slate-700">
              Intensity: {intensity}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
          
          <button
            onClick={handleSubmit}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg font-medium transition-colors"
          >
            Submit Mood
          </button>
        </div>
      )}
    </div>
  );
}
