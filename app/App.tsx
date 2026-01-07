'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Transcript from './components/Transcript';
import BottomToolbar from './components/BottomToolbar';
import MoodSelector from './components/MoodSelector';
import CrisisBanner from './components/CrisisBanner';
import TelehealthPanel from './components/TelehealthPanel';
import HealthDashboard from './components/HealthDashboard';
import LanguageSelector from './components/LanguageSelector';
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
import './i18n/config';

export default function App() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [useVAD, setUseVAD] = useState(true);
  const [showCrisisBanner, setShowCrisisBanner] = useState(true);
  const [moodHistory, setMoodHistory] = useState<Array<{mood: string, intensity: number, timestamp: string}>>([]);
  const [showTelehealth, setShowTelehealth] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const availableVoices = useMemo(
    () => ['sage', 'alloy', 'verse', 'nova', 'shimmer', 'onyx', 'echo', 'fable'],
    []
  );
  const [voice, setVoice] = useState<string>('sage');
  const [textValue, setTextValue] = useState('');

  const [summary, setSummary] = useState<string>('');
  const [remedies, setRemedies] = useState<string[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const [practiceContext, setPracticeContext] = useState('');
  const [practiceGoal, setPracticeGoal] = useState('');
  const [practiceResult, setPracticeResult] = useState<{ say: string[]; follow_up_questions: string[] } | null>(null);
  const [isPracticing, setIsPracticing] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const lastSummarizedAssistantIdRef = useRef<string | null>(null);
  const summaryDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const savedVoice = localStorage.getItem('mind.voice');
      if (savedVoice) setVoice(savedVoice);
    } catch {
      // ignore
    }

    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('mind.voice', voice);
    } catch {
      // ignore
    }
  }, [voice]);

  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem('mind.language', lang);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('mind.language');
      if (savedLang) {
        setCurrentLanguage(savedLang);
        i18n.changeLanguage(savedLang);
      }
    } catch {
      // ignore
    }
  }, [i18n]);

  const buildConversationForSummary = () => {
    const recent = items
      .filter((i) => i.type === 'message')
      .slice(-16)
      .map((i) => {
        const who = i.role === 'assistant' ? 'Assistant' : i.role === 'user' ? 'User' : 'System';
        const text = (i.content || i.formatted?.transcript || '').trim();
        return `${who}: ${text}`;
      })
      .filter(Boolean)
      .join('\n');

    return recent;
  };

  const parseJsonLoose = (raw: string) => {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    return JSON.parse(cleaned) as { summary?: string; remedies?: string[] };
  };

  const refreshSummary = async () => {
    const transcript = buildConversationForSummary();
    if (!transcript) return;

    setIsSummarizing(true);
    try {
      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 350,
          messages: [
            {
              role: 'system',
              content: [
                'You are generating a compact, user-friendly running summary of a mental health coaching chat.',
                'Return ONLY valid JSON with keys: summary (string) and remedies (array of 3-6 strings).',
                'Remedies must be safe, supportive, and phrased as immediate next steps (no diagnosis, no guarantees, no medical claims).',
              ].join(' '),
            },
            {
              role: 'user',
              content:
                'Update the running summary and immediate remedies based on this conversation transcript:\n\n' +
                transcript,
            },
          ],
        }),
      });

      if (!response.ok) return;
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') return;

      const parsed = parseJsonLoose(content);
      if (typeof parsed.summary === 'string') setSummary(parsed.summary);
      if (Array.isArray(parsed.remedies)) {
        setRemedies(parsed.remedies.filter((r) => typeof r === 'string'));
      }
    } catch {
      // ignore summary failures
    } finally {
      setIsSummarizing(false);
    }
  };

  const scheduleSummaryRefresh = () => {
    if (summaryDebounceRef.current) {
      window.clearTimeout(summaryDebounceRef.current);
    }
    summaryDebounceRef.current = window.setTimeout(() => {
      void refreshSummary();
    }, 250);
  };

  useEffect(() => {
    // When a new assistant message completes, refresh the running summary.
    const latestAssistant = [...items]
      .reverse()
      .find((i) => i.type === 'message' && i.role === 'assistant' && i.status === 'completed' && (i.content || '').trim());

    if (!latestAssistant) return;
    if (lastSummarizedAssistantIdRef.current === latestAssistant.id) return;

    lastSummarizedAssistantIdRef.current = latestAssistant.id;
    scheduleSummaryRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const downloadSummary = () => {
    const timestamp = new Date().toISOString();
    const lines = [
      `Mind — Chat Summary`,
      `Generated: ${timestamp}`,
      '',
      summary ? `Summary:\n${summary}` : 'Summary:\n(Empty)',
      '',
      'Immediate remedies / next steps:',
      ...(remedies.length ? remedies.map((r) => `- ${r}`) : ['- (Empty)']),
      '',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mind-summary-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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
          voice,
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

  const sendTextMessage = () => {
    const text = textValue.trim();
    if (!text || !isConnected) return;

    sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });

    sendEvent({ type: 'response.create' });
    setTextValue('');
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

  const runPractice = async () => {
    const context = practiceContext.trim();
    const goal = practiceGoal.trim();
    if (!context || !goal) return;

    setIsPracticing(true);
    setPracticeResult(null);
    try {
      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.5,
          max_tokens: 450,
          messages: [
            {
              role: 'system',
              content: [
                'You are a communication coach helping a user rehearse a difficult conversation.',
                'Return ONLY valid JSON with keys: say (array of 3-5 short sentences the user can say) and follow_up_questions (array of 2-4 questions).',
                'Be supportive, practical, and avoid medical diagnosis or guarantees.',
              ].join(' '),
            },
            {
              role: 'user',
              content:
                'Conversation context: ' + context + '\n' +
                'What I want to communicate: ' + goal + '\n\n' +
                'Give me lines I can say and a few follow-up questions.',
            },
          ],
        }),
      });

      if (!response.ok) return;
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') return;

      const cleaned = content
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned) as { say?: unknown; follow_up_questions?: unknown };
      const say = Array.isArray(parsed.say) ? parsed.say.filter((x) => typeof x === 'string') : [];
      const followUps = Array.isArray(parsed.follow_up_questions)
        ? parsed.follow_up_questions.filter((x) => typeof x === 'string')
        : [];

      setPracticeResult({ say, follow_up_questions: followUps });
    } catch {
      // ignore
    } finally {
      setIsPracticing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center text-sm font-semibold">
              DZ
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-100">{t('app.title')}</p>
              <p className="text-sm text-slate-400">{t('app.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector 
              currentLanguage={currentLanguage}
              onLanguageChange={handleLanguageChange}
            />
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{t('app.badge')}</span>
            </div>
          </div>
        </div>
        
        <div className="border-t border-slate-800">
          <div className="max-w-6xl mx-auto px-4 py-2 flex gap-2">
            <button
              onClick={() => {
                setShowDashboard(!showDashboard);
                setShowTelehealth(false);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                showDashboard 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t('dashboard.title')}
            </button>
            <button
              onClick={() => {
                setShowTelehealth(!showTelehealth);
                setShowDashboard(false);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                showTelehealth 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t('telehealth.title')}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          {showCrisisBanner && (
            <CrisisBanner onClose={() => setShowCrisisBanner(false)} />
          )}

          {showDashboard && (
            <HealthDashboard riskScores={{
              diabetes: 25,
              heart_disease: 35,
              hypertension: 40,
              mental_health: 45
            }} />
          )}

          {showTelehealth && (
            <TelehealthPanel onClose={() => setShowTelehealth(false)} />
          )}

          <section className="rounded-2xl bg-slate-950 border border-slate-800">
            <MoodSelector onMoodSelect={handleMoodSelect} />
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <section className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden min-h-[420px]">
              <Transcript items={items} />
            </section>

            <aside className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-100">{t('summary.title')}</h3>
                <button
                  onClick={downloadSummary}
                  disabled={!summary && remedies.length === 0}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-900 disabled:opacity-40"
                >
                  {t('summary.download')}
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                {summary || t('summary.placeholder')}
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-200">{t('summary.remedies')}</h4>
                  {isSummarizing && <span className="text-xs text-slate-500">{t('summary.updating')}</span>}
                </div>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  {remedies.length === 0 ? (
                    <li className="text-slate-500">No suggestions yet.</li>
                  ) : (
                    remedies.map((r, idx) => <li key={idx}>• {r}</li>)
                  )}
                </ul>
              </div>
            </aside>
          </div>

          <section className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-sm text-slate-300">
            <h3 className="text-base font-semibold text-slate-100 mb-2">Tips for best results</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Speak naturally and pause when you want a response.</li>
              <li>Use the mood check-in to set the tone you need.</li>
              <li>Use text chat for quick questions.</li>
            </ul>
          </section>

          <section className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">Conversation practice</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Practice what to say when it’s hard to find words.
                </p>
              </div>
              <button
                onClick={runPractice}
                disabled={isPracticing || !practiceContext.trim() || !practiceGoal.trim()}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-900 disabled:opacity-40"
              >
                {isPracticing ? 'Generating…' : 'Generate'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="text-sm text-slate-300">
                Context
                <textarea
                  value={practiceContext}
                  onChange={(e) => setPracticeContext(e.target.value)}
                  placeholder="Who are you talking to and what’s happening?"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                  rows={3}
                />
              </label>

              <label className="text-sm text-slate-300">
                What you want to communicate
                <textarea
                  value={practiceGoal}
                  onChange={(e) => setPracticeGoal(e.target.value)}
                  placeholder="E.g., I need some space today, but I still care about you."
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                  rows={3}
                />
              </label>
            </div>

            {practiceResult && (
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <h4 className="text-sm font-semibold text-slate-200">Try saying</h4>
                  <ul className="mt-2 space-y-2 text-sm text-slate-300">
                    {practiceResult.say.length === 0 ? (
                      <li className="text-slate-500">No suggestions yet.</li>
                    ) : (
                      practiceResult.say.map((s, idx) => <li key={idx}>• {s}</li>)
                    )}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <h4 className="text-sm font-semibold text-slate-200">Follow-up questions</h4>
                  <ul className="mt-2 space-y-2 text-sm text-slate-300">
                    {practiceResult.follow_up_questions.length === 0 ? (
                      <li className="text-slate-500">No follow-ups yet.</li>
                    ) : (
                      practiceResult.follow_up_questions.map((q, idx) => <li key={idx}>• {q}</li>)
                    )}
                  </ul>
                </div>
              </div>
            )}
          </section>

          <div className="h-24" />
        </div>
      </main>

      <BottomToolbar
        isConnected={isConnected}
        isRecording={isRecording}
        useVAD={useVAD}
        voice={voice}
        availableVoices={availableVoices}
        textValue={textValue}
        onConnect={connect}
        onDisconnect={disconnect}
        onToggleRecording={toggleRecording}
        onToggleVAD={toggleVAD}
        onVoiceChange={setVoice}
        onTextChange={setTextValue}
        onSendText={sendTextMessage}
      />
    </div>
  );
}
