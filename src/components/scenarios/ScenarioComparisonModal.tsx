import { useState, useEffect } from 'react';
import {
  X,
  Scale,
  Award,
  Sparkles,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';
import { Scenario, ScenarioComparison } from '../../types';
import { api } from '../../lib/api';
import { AffordabilityBadge } from './AffordabilityBadge';

interface ScenarioComparisonModalProps {
  selectedScenarios: Scenario[];
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onSelectScenario: (scenario: Scenario) => void;
}

export function ScenarioComparisonModal({
  selectedScenarios,
  isOpen,
  onClose,
  currency,
  onSelectScenario,
}: ScenarioComparisonModalProps) {
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || selectedScenarios.length < 2) return;

    let isMounted = true;
    const fetchComparison = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const ids = selectedScenarios.map((s) => s.id);
        const result = await api.compareScenarios(ids);
        if (isMounted) {
          setComparison(result);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Comparison failed');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchComparison();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedScenarios]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Scenario Comparison Matrix ({selectedScenarios.length} Options)
              </h2>
              <p className="text-xs text-slate-500">
                Side-by-side deterministic trade-off analysis across hypothetical pathways.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Computing comparative cash flow matrix...
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : comparison ? (
            <>
              {/* Recommendation Banner */}
              {comparison.recommendedScenarioId && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white shadow-sm flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-emerald-300">
                      Optimal Mathematical Recommendation
                    </span>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {comparison.recommendationReason}
                    </p>
                  </div>
                </div>
              )}

              {/* Side-by-Side Comparison Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="p-3.5 font-bold text-slate-700 w-44">Decision Metric</th>
                      {comparison.scenarios.map((scen) => {
                        const isRecommended = scen.id === comparison.recommendedScenarioId;
                        return (
                          <th
                            key={scen.id}
                            className={`p-3.5 font-bold min-w-[200px] ${
                              isRecommended
                                ? 'bg-indigo-50/80 text-indigo-900 border-x-2 border-indigo-400'
                                : 'text-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate block">{scen.title}</span>
                              {isRecommended && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-600 text-white font-extrabold uppercase">
                                  Top Pick
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block font-normal capitalize">
                              {scen.type.replace('_', ' ')}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {/* Affordability Status */}
                    <tr>
                      <td className="p-3.5 font-semibold text-slate-600 bg-slate-50/50">
                        Affordability Status
                      </td>
                      {comparison.scenarios.map((scen) => (
                        <td key={scen.id} className="p-3.5">
                          <AffordabilityBadge
                            status={scen.affordability.status}
                            score={scen.affordability.financialPressureScore}
                            size="sm"
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Projected Monthly Surplus */}
                    <tr>
                      <td className="p-3.5 font-semibold text-slate-600 bg-slate-50/50">
                        Monthly Net Surplus
                      </td>
                      {comparison.scenarios.map((scen) => {
                        const isPositive = scen.projectedMetrics.projectedNetSurplus >= 0;
                        return (
                          <td key={scen.id} className="p-3.5">
                            <span
                              className={`text-sm font-extrabold font-mono ${
                                isPositive ? 'text-slate-900' : 'text-rose-600'
                              }`}
                            >
                              {currency} {scen.projectedMetrics.projectedNetSurplus.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-slate-400 block">/mo</span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Monthly Surplus Delta */}
                    <tr>
                      <td className="p-3.5 font-semibold text-slate-600 bg-slate-50/50">
                        Surplus Change
                      </td>
                      {comparison.scenarios.map((scen) => {
                        const isPositive = scen.projectedMetrics.surplusDelta >= 0;
                        return (
                          <td key={scen.id} className="p-3.5">
                            <span
                              className={`font-mono font-bold ${
                                isPositive ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {currency} {scen.projectedMetrics.surplusDelta.toLocaleString()}/mo
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Savings Rate */}
                    <tr>
                      <td className="p-3.5 font-semibold text-slate-600 bg-slate-50/50">
                        Savings Rate
                      </td>
                      {comparison.scenarios.map((scen) => (
                        <td key={scen.id} className="p-3.5 font-mono font-bold text-slate-800">
                          {scen.projectedMetrics.projectedSavingsRate}%
                        </td>
                      ))}
                    </tr>

                    {/* Monthly Outflow */}
                    <tr>
                      <td className="p-3.5 font-semibold text-slate-600 bg-slate-50/50">
                        Projected Monthly Outflow
                      </td>
                      {comparison.scenarios.map((scen) => (
                        <td key={scen.id} className="p-3.5 font-mono text-slate-700">
                          {currency} {scen.projectedMetrics.projectedMonthlyExpenses.toLocaleString()}/mo
                        </td>
                      ))}
                    </tr>

                    {/* Upfront / Financing Cost */}
                    <tr>
                      <td className="p-3.5 font-semibold text-slate-600 bg-slate-50/50">
                        Capital Commitment
                      </td>
                      {comparison.scenarios.map((scen) => (
                        <td key={scen.id} className="p-3.5 text-slate-700">
                          {scen.projectedMetrics.monthlyEmiPayment ? (
                            <span>
                              EMI: <strong>{currency} {scen.projectedMetrics.monthlyEmiPayment}/mo</strong> (
                              {scen.inputs.tenureMonths}m)
                            </span>
                          ) : scen.projectedMetrics.oneTimeCashImpact ? (
                            <span>
                              Outflow: <strong>{currency} {scen.projectedMetrics.oneTimeCashImpact.toLocaleString()}</strong>
                            </span>
                          ) : (
                            <span className="text-slate-400">Ongoing adjustment</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Actions */}
                    <tr>
                      <td className="p-3.5 font-semibold text-slate-600 bg-slate-50/50">Action</td>
                      {comparison.scenarios.map((scen) => (
                        <td key={scen.id} className="p-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectScenario(scen);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition cursor-pointer"
                          >
                            Inspect Detail
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Calculated across verified baseline data &middot; Unsaved calculations do not affect household logs.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer shadow-xs"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
}
