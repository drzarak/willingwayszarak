'use client';

interface CrisisBannerProps {
  onClose?: () => void;
}

export default function CrisisBanner({ onClose }: CrisisBannerProps) {
  return (
    <div className="crisis-banner">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 mb-2">IMPORTANT</h3>
          <div className="text-sm text-slate-700 space-y-2 leading-relaxed">
            <p>
              I am a licensed medical practitioner. If you require a human consultation for
              diagnosis, history taking, follow-up questions, or any other reason, contact me directly.
            </p>
            <p className="font-medium">Email: <a className="underline hover:text-slate-900" href="mailto:care@drzarak.com">care@drzarak.com</a></p>
            <p className="font-medium">WhatsApp: <a className="underline hover:text-slate-900" href="https://wa.me/+923357900295" target="_blank" rel="noopener noreferrer">wa.me/+923357900295</a></p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 ml-4"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
