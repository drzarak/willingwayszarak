'use client';

import { useState } from 'react';

interface MoodSelectorProps {
  onMoodSelect: (mood: string, intensity: number) => void;
}

const moods = [
  { name: 'Calm', emoji: '😌' },
  { name: 'Anxious', emoji: '😰' },
  { name: 'Happy', emoji: '😊' },
  { name: 'Sad', emoji: '😢' },
  { name: 'Energetic', emoji: '⚡' },
  { name: 'Tired', emoji: '😴' },
  { name: 'Stressed', emoji: '😫' },
  { name: 'Neutral', emoji: '😐' },
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
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
        <button
          onClick={() => setIsVisible(true)}
          className="text-sm text-slate-100 hover:text-white font-medium"
        >
          Update mood check-in
        </button>
      </div>
    );
  }

  return (
    <div className="mood-selector">
      <h3 className="text-lg font-semibold mb-3 text-slate-100">How are you feeling?</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {moods.map((mood) => (
          <button
            key={mood.name}
            onClick={() => handleMoodClick(mood.name)}
            className={`mood-button ${
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
            <label className="text-sm font-medium mb-1 block text-slate-200">
              Intensity: {intensity}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-blue-400"
            />
          </div>
          
          <button
            onClick={handleSubmit}
            className="w-full bg-slate-100 hover:bg-white text-slate-900 py-3 rounded-lg font-medium transition-colors"
          >
            Submit Mood
          </button>
        </div>
      )}
    </div>
  );
}
