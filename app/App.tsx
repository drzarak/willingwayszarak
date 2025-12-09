'use client';

import { useState, useEffect, useRef } from 'react';
import Transcript from './components/Transcript';
import BottomToolbar from './components/BottomToolbar';
import MoodSelector from './components/MoodSelector';
import CrisisBanner from './components/CrisisBanner';
import { ConversationItem } from './types';
import { mentalHealthCoachAgent } from './agentConfigs/mentalHealthCoach';
import {
  OPENAI_REALTIME_API_URL,
  OPENAI_REALTIME_MODEL,
  DEFAULT_TEMPERATURE,
  VAD_THRESHOLD,
  VAD_PREFIX_PADDING_MS,
  VAD_SILENCE_DURATION_MS,
} from './lib/constants';

export default function App() {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [useVAD, setUseVAD] = useState(true);
  const [showCrisisBanner, setShowCrisisBanner] = useState(true);
  const [moodHistory, setMoodHistory] = useState<Array<{mood: string, intensity: number, timestamp: string}>>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    try {
      // Create session
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_REALTIME_MODEL,
          voice: 'sage',
          instructions: mentalHealthCoachAgent.instructions,
          modalities: ['text', 'audio'],
          temperature: DEFAULT_TEMPERATURE,
          turn_detection: useVAD ? {
            type: 'server_vad',
            threshold: VAD_THRESHOLD,
            prefix_padding_ms: VAD_PREFIX_PADDING_MS,
            silence_duration_ms: VAD_SILENCE_DURATION_MS,
          } : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      const ephemeralToken = data.client_secret?.value;

      if (!ephemeralToken) {
        throw new Error('No client secret received');
      }

      // Set up WebRTC
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Set up audio
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle incoming audio
      pc.ontrack = (e) => {
        const remoteStream = e.streams[0];
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play();
      };

      // Set up data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        console.log('Data channel opened');
        setIsConnected(true);
        
        // Send initial conversation item
        sendEvent({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{
              type: 'input_text',
              text: 'Hello',
            }],
          },
        });

        sendEvent({
          type: 'response.create',
        });
      };

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          handleRealtimeEvent(event);
        } catch (error) {
          console.error('Error parsing event:', error);
        }
      };

      dc.onerror = (error) => {
        console.error('Data channel error:', error);
      };

      dc.onclose = () => {
        console.log('Data channel closed');
        setIsConnected(false);
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI
      const sdpResponse = await fetch(
        `${OPENAI_REALTIME_API_URL}?model=${OPENAI_REALTIME_MODEL}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ephemeralToken}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );

      if (!sdpResponse.ok) {
        throw new Error('Failed to exchange SDP');
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect. Please check your API key and try again.');
      disconnect();
    }
  };

  const disconnect = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsRecording(false);
  };

  const sendEvent = (event: Record<string, unknown>) => {
    if (dcRef.current && dcRef.current.readyState === 'open') {
      dcRef.current.send(JSON.stringify(event));
    }
  };

  const handleRealtimeEvent = (event: Record<string, unknown>) => {
    console.log('Received event:', event.type);

    switch (event.type) {
      case 'conversation.item.created':
        if (event.item) {
          addOrUpdateItem(event.item as Record<string, unknown>);
        }
        break;

      case 'response.text.delta':
        if (event.delta) {
          updateItemContent(event.item_id as string, event.delta as string);
        }
        break;

      case 'response.text.done':
        if (event.text) {
          finalizeItemContent(event.item_id as string, event.text as string);
        }
        break;

      case 'response.audio_transcript.delta':
        if (event.delta) {
          updateItemTranscript(event.item_id as string, event.delta as string);
        }
        break;

      case 'response.audio_transcript.done':
        if (event.transcript) {
          finalizeItemTranscript(event.item_id as string, event.transcript as string);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          updateItemTranscript(event.item_id as string, event.transcript as string);
        }
        break;

      case 'error':
        console.error('Realtime API error:', event.error);
        break;
    }
  };

  const addOrUpdateItem = (item: Record<string, unknown>) => {
    const content = item.content as Array<{ text?: string; transcript?: string }> | undefined;
    const conversationItem: ConversationItem = {
      id: item.id as string,
      role: item.role as 'user' | 'assistant' | 'system',
      content: content?.[0]?.text || content?.[0]?.transcript || '',
      type: 'message',
      status: (item.status as 'in_progress' | 'completed' | 'failed') || 'in_progress',
    };

    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? conversationItem : i));
      }
      return [...prev, conversationItem];
    });
  };

  const updateItemContent = (itemId: string, delta: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, content: (item.content || '') + delta }
          : item
      )
    );
  };

  const finalizeItemContent = (itemId: string, text: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, content: text, status: 'completed' }
          : item
      )
    );
  };

  const updateItemTranscript = (itemId: string, transcript: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              formatted: {
                ...item.formatted,
                transcript: (item.formatted?.transcript || '') + transcript,
              },
            }
          : item
      )
    );
  };

  const finalizeItemTranscript = (itemId: string, transcript: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              formatted: { ...item.formatted, transcript },
              status: 'completed',
            }
          : item
      )
    );
  };

  const toggleRecording = () => {
    if (!useVAD) {
      setIsRecording(!isRecording);
      // In PTT mode, we'd enable/disable the audio track
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !isRecording;
        });
      }
    }
  };

  const toggleVAD = () => {
    setUseVAD(!useVAD);
    // Would need to reconnect to change VAD settings
  };

  const handleMoodSelect = (mood: string, intensity: number) => {
    const moodEntry = {
      mood,
      intensity,
      timestamp: new Date().toISOString(),
    };
    setMoodHistory([...moodHistory, moodEntry]);
    
    // Send mood update to the agent
    if (isConnected) {
      sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text: `I'm feeling ${mood.toLowerCase()} with an intensity of ${intensity}/10`,
          }],
        },
      });

      sendEvent({
        type: 'response.create',
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
              DZ
            </div>
            <div>
              <p className="text-lg font-semibold">Mind by Dr. Zarak</p>
              <p className="text-sm text-slate-500">Clear, calm ADHD & mental health support</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>OpenAI Realtime</span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {showCrisisBanner && (
            <CrisisBanner onClose={() => setShowCrisisBanner(false)} />
          )}

          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm">
            <MoodSelector onMoodSelect={handleMoodSelect} />
          </section>

          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <Transcript items={items} />
          </section>

          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 text-sm text-slate-600">
            <h3 className="text-base font-semibold text-slate-800 mb-2">Tips for best results</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Speak naturally and pause when you want a response.</li>
              <li>Use the mood check-in to set the tone you need.</li>
              <li>Ask for a human consultation any time to reach Dr. Zarak directly.</li>
            </ul>
          </section>

          <div className="h-24" />
        </div>
      </main>

      <BottomToolbar
        isConnected={isConnected}
        isRecording={isRecording}
        useVAD={useVAD}
        onConnect={connect}
        onDisconnect={disconnect}
        onToggleRecording={toggleRecording}
        onToggleVAD={toggleVAD}
      />
    </div>
  );
}
