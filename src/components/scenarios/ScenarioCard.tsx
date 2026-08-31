import {
  TrendingUp,
  TrendingDown,
  Pin,
  Sparkles,
  Copy,
  Trash2,
  Edit2,
  ArrowRight,
  CreditCard,
  Zap,
  Target,
  DollarSign,
  Layers,
  Wrench,
} from 'lucide-react';
import { Scenario, ScenarioType } from '../../types';
import { AffordabilityBadge } from './AffordabilityBadge';
import { formatCurrency } from '../../config/locationCurrencyConfig';

interface ScenarioCardProps {
  scenario: Scenario;
  currency: string;
  onSelect: (scenario: Scenario) => void;
  onEdit: (scenario: Scenario) => void;
  onDuplicate: (scenario: Scenario) => void;
  onDelete: (scenario: Scenario) => void;
  onTogglePin?: (scenario: Scenario) => void;
  onExplain?: (scenario: Scenario) => void;
  isSelectedForCompare?: boolean;
  onToggleCompare?: (scenario: Scenario) => void;
}

export function ScenarioCard({
  scenario,
  currency,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePin,
  isSelectedForCompare,
  onToggleCompare,
}: ScenarioCardProps) {
  const typeConfig: Record<
    ScenarioType,
    { label: string; icon: any; color: string; bgColor: string }
  > = {
    income_change: {
      label: 'Income Change',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    new_expense: {
      label: 'New Recurring Bill',
      icon: TrendingDown,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
    one_time_purchase: {
      label: 'One-Time Purchase',
      icon: Zap,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    emi_loan: {
      label: 'Financing & Loan EMI',
      icon: CreditCard,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    appliance_purchase: {
      label: 'Home Equipment Upgrade',
      icon: Wrench,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    savings_goal: {
      label: 'Savings Goal Plan',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    custom: {
      label: 'Multi-Variable Model',
      icon: Layers,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
    },
  };

  const currentType = typeConfig[scenario.type] || typeConfig.custom;
  const TypeIcon = currentType.icon;
  const { projectedMetrics, affordability, baselineMetrics } = scenario;

  const isSurplusPositive = projectedMetrics.projectedNetSurplus >= 0;
  const surplusDeltaPositive = projectedMetrics.surplusDelta >= 0;

  return (
    <div
      id={`scenario-card-${scenario.id}`}
      className={`group relative bg-white rounded-2xl border transition duration-200 hover:shadow-md flex flex-col justify-between ${
        isSelectedForCompare
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
          : scenario.isPinned
          ? 'border-indigo-200 shadow-xs'
          : 'border-slate-200'
      }`}
    >
      <div className="p-5">
        {/* Top Bar: Type + Selection/Pin */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {onToggleCompare && (
              <label
                className="flex items-center gap-1.5 cursor-pointer"
                title="Select to compare side-by-side"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={!!isSelectedForCompare}
                  onChange={() => onToggleCompare(scenario)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-[11px] text-slate-500 font-medium select-none">Compare</span>
              </label>
            )}

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${currentType.bgColor} ${currentType.color}`}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              <span>{currentType.label}</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onTogglePin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(scenario);
                }}
                className={`p-1.5 rounded-lg transition ${
                  scenario.isPinned
                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title={scenario.isPinned ? 'Unpin scenario' : 'Pin scenario'}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Title and Short Description */}
        <div
          className="cursor-pointer"
          onClick={() => onSelect(scenario)}
        >
          <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
            {scenario.title}
          </h3>
          {scenario.description ? (
            <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px]">
              {scenario.description}
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic mt-1 min-h-[32px]">
              No additional notes provided.
            </p>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
          <div>
            <span className="text-[11px] font-medium text-slate-500 block">
              Projected Monthly Surplus
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-base font-extrabold font-mono ${
                  isSurplusPositive ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {formatCurrency(projectedMetrics.projectedNetSurplus, currency)}
              </span>
              <span className="text-[11px] text-slate-400">/mo</span>
            </div>
            <span
              className={`inline-flex items-center text-[10px] font-bold gap-0.5 mt-0.5 ${
                surplusDeltaPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {surplusDeltaPositive ? '+' : ''}
              {formatCurrency(projectedMetrics.surplusDelta, currency)}/mo
            </span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-slate-500 block">
              Post-Decision Savings Rate
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-extrabold font-mono text-slate-900">
                {projectedMetrics.projectedSavingsRate}%
              </span>
            </div>
            <span
              className={`inline-flex items-center text-[10px] font-bold gap-0.5 mt-0.5 ${
                projectedMetrics.savingsRateDelta >= 0 ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              {projectedMetrics.savingsRateDelta >= 0 ? '+' : ''}
              {projectedMetrics.savingsRateDelta}% vs baseline ({baselineMetrics.savingsRate}%)
            </span>
          </div>
        </div>

        {/* Specific Type Extra Details */}
        <div className="mt-3 text-xs text-slate-600 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
          {projectedMetrics.monthlyEmiPayment ? (
            <span className="flex items-center gap-1 font-medium text-indigo-700">
              <CreditCard className="w-3.5 h-3.5" />
              EMI: {formatCurrency(projectedMetrics.monthlyEmiPayment, currency)}/mo ({scenario.inputs.tenureMonths || 12} mos)
            </span>
          ) : projectedMetrics.oneTimeCashImpact ? (
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Cash Outflow: {formatCurrency(projectedMetrics.oneTimeCashImpact, currency)}
            </span>
          ) : (
            <span className="text-slate-500">
              Baseline Surplus: {formatCurrency(baselineMetrics.netMonthlySurplus, currency)}/mo
            </span>
          )}

          {projectedMetrics.breakevenMonths && (
            <span className="text-[11px] text-slate-500">
              Breakeven: <strong>{projectedMetrics.breakevenMonths} mos</strong>
            </span>
          )}
        </div>

        {/* Affordability Badge & Verdict */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <AffordabilityBadge
            status={affordability.status}
            score={affordability.financialPressureScore}
            size="sm"
          />

          {scenario.geminiExplanation && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-md"
              title="Explained with Gemini Intelligence"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              AI Grounded
            </span>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDuplicate(scenario)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/60 rounded-lg transition"
            title="Duplicate scenario"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(scenario)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
            title="Edit inputs"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(scenario)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Delete scenario"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onSelect(scenario)}
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
        >
          <span>View Analysis</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
