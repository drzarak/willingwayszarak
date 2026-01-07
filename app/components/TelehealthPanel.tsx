'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TelehealthPanelProps {
  onClose?: () => void;
}

export default function TelehealthPanel({ onClose }: TelehealthPanelProps) {
  const { t } = useTranslation();
  const [showBooking, setShowBooking] = useState(false);

  return (
    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">{t('telehealth.title')}</h2>
          <p className="text-sm text-slate-400 mt-1">{t('telehealth.description')}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">
            {t('telehealth.consultDrZarak')}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Contact Dr. Zarak directly for a personalized consultation
          </p>
          <div className="space-y-3">
            <a
              href="mailto:care@drzarak.com"
              className="flex items-center gap-3 rounded-lg bg-slate-800 px-4 py-3 text-sm text-slate-100 hover:bg-slate-700 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{t('telehealth.email')}: care@drzarak.com</span>
            </a>
            <a
              href="https://wa.me/+923357900295"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg bg-green-900 px-4 py-3 text-sm text-slate-100 hover:bg-green-800 transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span>{t('telehealth.whatsapp')}: +92 335 7900295</span>
            </a>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">
            {t('telehealth.myAppointments')}
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Schedule and manage your appointments
          </p>
          <button
            onClick={() => setShowBooking(!showBooking)}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            {t('telehealth.bookAppointment')}
          </button>
          <div className="mt-4 text-sm text-slate-500">
            Coming soon: View and manage your scheduled appointments here
          </div>
        </div>
      </div>

      {showBooking && (
        <div className="mt-6 rounded-xl bg-slate-900 border border-slate-800 p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Book Appointment
          </h3>
          <form className="space-y-4">
            <div>
              <label className="text-sm text-slate-300 block mb-2">
                Preferred Date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-2">
                Preferred Time
              </label>
              <input
                type="time"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-2">
                Reason for Visit
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100"
                placeholder="Brief description of your concern..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
              >
                Submit Request
              </button>
              <button
                type="button"
                onClick={() => setShowBooking(false)}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
