'use client';

interface BottomToolbarProps {
  isConnected: boolean;
  isRecording: boolean;
  useVAD: boolean;
  voice: string;
  availableVoices: string[];
  textValue: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleRecording: () => void;
  onToggleVAD: () => void;
  onVoiceChange: (voice: string) => void;
  onTextChange: (value: string) => void;
  onSendText: () => void;
}

export default function BottomToolbar({
  isConnected,
  isRecording,
  useVAD,
  voice,
  availableVoices,
  textValue,
  onConnect,
  onDisconnect,
  onToggleRecording,
  onToggleVAD,
  onVoiceChange,
  onTextChange,
  onSendText,
}: BottomToolbarProps) {
  return (
    <div className="audio-controls">
      <div className="max-w-4xl mx-auto flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-200">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-slate-400">
            Voice
            <select
              value={voice}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="ml-2 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm text-slate-100"
              aria-label="Select voice"
            >
              {availableVoices.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          {!isConnected ? (
            <button
              onClick={onConnect}
              className="px-5 py-2 bg-slate-100 hover:bg-white text-slate-900 rounded-lg font-medium transition-colors"
            >
              Connect
            </button>
          ) : (
            <>
              <button
                onClick={onToggleRecording}
                className={`px-5 py-3 rounded-full font-medium border border-slate-800 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-100'
                }`}
              >
                {isRecording ? '🎤 Recording...' : '🎤 Push to Talk'}
              </button>

              <button
                onClick={onToggleVAD}
                className={`px-4 py-2 rounded-lg font-medium text-sm border ${
                  useVAD
                    ? 'bg-slate-100 text-slate-900 border-slate-100'
                    : 'bg-slate-900 text-slate-100 border-slate-800'
                }`}
              >
                {useVAD ? 'VAD: On' : 'VAD: Off'}
              </button>

              <button
                onClick={onDisconnect}
                className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-100 rounded-lg font-medium"
              >
                Disconnect
              </button>
            </>
          )}
        </div>

        <div className="text-xs text-slate-400">
          {useVAD ? 'Voice auto-detect on' : 'Manual push-to-talk'}
        </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={textValue}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSendText();
            }}
            placeholder={isConnected ? 'Type a message…' : 'Connect to start chatting…'}
            className="flex-1 min-w-0 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500"
            disabled={!isConnected}
            aria-label="Text message"
          />
          <button
            onClick={onSendText}
            disabled={!isConnected || !textValue.trim()}
            className="shrink-0 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
