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
      <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
        {/* Top Row: Connection status and controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-red-500'
              }`}
            />
            <span className="text-xs md:text-sm text-slate-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Voice Selector */}
            <select
              value={voice}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="text-xs md:text-sm rounded-lg border border-slate-800/50 bg-[#111111] px-2 py-1.5 md:px-3 md:py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              aria-label="Select voice"
            >
              {availableVoices.map((v) => (
                <option key={v} value={v}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </option>
              ))}
            </select>

            {/* Connection button */}
            {!isConnected ? (
              <button
                onClick={onConnect}
                className="px-4 py-1.5 md:px-5 md:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs md:text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
              >
                Connect
              </button>
            ) : (
              <>
                {/* VAD Toggle */}
                <button
                  onClick={onToggleVAD}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                    useVAD
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'bg-[#111111] text-slate-400 border border-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  VAD {useVAD ? 'On' : 'Off'}
                </button>

                {/* Disconnect button */}
                <button
                  onClick={onDisconnect}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-[#111111] border border-slate-800/50 hover:border-slate-700 text-slate-300 hover:text-slate-100 rounded-lg text-xs md:text-sm font-medium transition-colors"
                >
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom Row: Text input */}
        <div className="flex items-center gap-2">
          <input
            value={textValue}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendText();
              }
            }}
            placeholder={isConnected ? 'Type a message…' : 'Connect to start chatting…'}
            className="flex-1 min-w-0 rounded-xl border border-slate-800/50 bg-[#111111] px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
            disabled={!isConnected}
            aria-label="Text message"
          />
          <button
            onClick={onSendText}
            disabled={!isConnected || !textValue.trim()}
            className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 md:px-5 md:py-3 text-sm md:text-base font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
