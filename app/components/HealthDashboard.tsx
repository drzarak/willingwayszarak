'use client';

import { useTranslation } from 'react-i18next';

interface HealthDashboardProps {
  riskScores?: {
    diabetes: number;
    heart_disease: number;
    hypertension: number;
    mental_health: number;
  };
}

export default function HealthDashboard({ riskScores }: HealthDashboardProps) {
  const { t } = useTranslation();

  const defaultScores = {
    diabetes: 0,
    heart_disease: 0,
    hypertension: 0,
    mental_health: 0,
  };

  const scores = riskScores || defaultScores;

  const getRiskLevel = (score: number) => {
    if (score < 30) return { level: 'Low', color: 'text-green-400', bg: 'bg-green-900/30' };
    if (score < 70) return { level: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
    return { level: 'High', color: 'text-red-400', bg: 'bg-red-900/30' };
  };

  return (
    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-6">
      <h2 className="text-xl font-semibold text-slate-100 mb-1">
        {t('dashboard.title')}
      </h2>
      <p className="text-sm text-slate-400 mb-6">
        {t('dashboard.analytics')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">
              Diabetes Risk
            </h3>
            <span className={`text-xs px-2 py-1 rounded ${getRiskLevel(scores.diabetes).bg} ${getRiskLevel(scores.diabetes).color}`}>
              {getRiskLevel(scores.diabetes).level}
            </span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-100">
              {scores.diabetes}
            </span>
            <span className="text-sm text-slate-400 mb-1">/ 100</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                scores.diabetes < 30 ? 'bg-green-500' :
                scores.diabetes < 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${scores.diabetes}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">
              Heart Disease Risk
            </h3>
            <span className={`text-xs px-2 py-1 rounded ${getRiskLevel(scores.heart_disease).bg} ${getRiskLevel(scores.heart_disease).color}`}>
              {getRiskLevel(scores.heart_disease).level}
            </span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-100">
              {scores.heart_disease}
            </span>
            <span className="text-sm text-slate-400 mb-1">/ 100</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                scores.heart_disease < 30 ? 'bg-green-500' :
                scores.heart_disease < 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${scores.heart_disease}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">
              Hypertension Risk
            </h3>
            <span className={`text-xs px-2 py-1 rounded ${getRiskLevel(scores.hypertension).bg} ${getRiskLevel(scores.hypertension).color}`}>
              {getRiskLevel(scores.hypertension).level}
            </span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-100">
              {scores.hypertension}
            </span>
            <span className="text-sm text-slate-400 mb-1">/ 100</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                scores.hypertension < 30 ? 'bg-green-500' :
                scores.hypertension < 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${scores.hypertension}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">
              {t('dashboard.mentalHealthScore')}
            </h3>
            <span className={`text-xs px-2 py-1 rounded ${getRiskLevel(scores.mental_health).bg} ${getRiskLevel(scores.mental_health).color}`}>
              {getRiskLevel(scores.mental_health).level}
            </span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-100">
              {scores.mental_health}
            </span>
            <span className="text-sm text-slate-400 mb-1">/ 100</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                scores.mental_health < 30 ? 'bg-green-500' :
                scores.mental_health < 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${scores.mental_health}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-slate-900 border border-slate-800 p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">
          Risk Assessment Information
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          These risk scores are calculated based on various health metrics, lifestyle factors, 
          and medical history. They are for informational purposes only and should not replace 
          professional medical advice. Please consult with Dr. Zarak for a comprehensive 
          evaluation and personalized health plan.
        </p>
      </div>
    </div>
  );
}
