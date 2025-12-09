'use client';

interface BottomToolbarProps {
  isConnected: boolean;
  isRecording: boolean;
  useVAD: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleRecording: () => void;
  onToggleVAD: () => void;
}

export default function BottomToolbar({
  isConnected,
  isRecording,
  useVAD,
  onConnect,
  onDisconnect,
  onToggleRecording,
  onToggleVAD,
}: BottomToolbarProps) {
  return (
    <div className="audio-controls">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {!isConnected ? (
            <button
              onClick={onConnect}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
            >
              Connect
            </button>
          ) : (
            <>
              <button
                onClick={onToggleRecording}
                className={`px-5 py-3 rounded-full font-medium shadow-sm ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                }`}
              >
                {isRecording ? '🎤 Recording...' : '🎤 Push to Talk'}
              </button>

              <button
                onClick={onToggleVAD}
                className={`px-4 py-2 rounded-lg font-medium text-sm border ${
                  useVAD
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-900 border-slate-200'
                }`}
              >
                {useVAD ? 'VAD: On' : 'VAD: Off'}
              </button>

              <button
                onClick={onDisconnect}
                className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-900 rounded-lg font-medium"
              >
                Disconnect
              </button>
            </>
          )}
        </div>

        <div className="text-xs text-slate-500">
          {useVAD ? 'Voice auto-detect on' : 'Manual push-to-talk'}
        </div>
      </div>
    </div>
  );
}
