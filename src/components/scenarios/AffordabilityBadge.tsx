import { CheckCircle2, AlertTriangle, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { AffordabilityStatus } from '../../types';

interface AffordabilityBadgeProps {
  status: AffordabilityStatus;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AffordabilityBadge({
  status,
  score,
  showScore = false,
  size = 'md',
}: AffordabilityBadgeProps) {
  const config = {
    highly_affordable: {
      label: 'Highly Affordable',
      bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotColor: 'bg-emerald-500',
      icon: Sparkles,
      meterColor: 'bg-emerald-500',
    },
    affordable: {
      label: 'Affordable',
      bgColor: 'bg-teal-50 text-teal-700 border-teal-200',
      dotColor: 'bg-teal-500',
      icon: CheckCircle2,
      meterColor: 'bg-teal-500',
    },
    tight_margin: {
      label: 'Tight Margin',
      bgColor: 'bg-amber-50 text-amber-700 border-amber-200',
      dotColor: 'bg-amber-500',
      icon: AlertTriangle,
      meterColor: 'bg-amber-500',
    },
    high_risk: {
      label: 'High Risk',
      bgColor: 'bg-orange-50 text-orange-700 border-orange-200',
      dotColor: 'bg-orange-500',
      icon: AlertCircle,
      meterColor: 'bg-orange-500',
    },
    unaffordable: {
      label: 'Unaffordable (Deficit)',
      bgColor: 'bg-rose-50 text-rose-700 border-rose-200',
      dotColor: 'bg-rose-500',
      icon: ShieldAlert,
      meterColor: 'bg-rose-500',
    },
  }[status] || {
    label: 'Calculated',
    bgColor: 'bg-slate-50 text-slate-700 border-slate-200',
    dotColor: 'bg-slate-500',
    icon: CheckCircle2,
    meterColor: 'bg-slate-500',
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center font-medium rounded-full border ${config.bgColor} ${sizeClasses}`}
      >
        <Icon className={iconSizes} />
        <span>{config.label}</span>
      </span>

      {showScore && score !== undefined && (
        <span
          className="text-xs text-slate-500 font-mono"
          title={`Financial pressure score: ${score}/100 (Lower is safer)`}
        >
          Pressure: <strong className="text-slate-700">{score}/100</strong>
        </span>
      )}
    </div>
  );
}
