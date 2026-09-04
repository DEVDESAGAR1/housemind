import { useState, useEffect, useMemo } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Scale,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Target,
  Wrench,
  Zap,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  Scenario,
  ScenarioType,
  ScenarioBaselineMetrics,
  HomeAsset,
} from '../../types';
import { api } from '../../lib/api';
import { ScenarioCard } from './ScenarioCard';
import { ScenarioBuilderModal } from './ScenarioBuilderModal';
import { ScenarioDetailModal } from './ScenarioDetailModal';
import { ScenarioComparisonModal } from './ScenarioComparisonModal';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

interface ScenarioSimulatorViewProps {
  currency: string;
  assets?: HomeAsset[];
}

export function ScenarioSimulatorView({ currency, assets = [] }: ScenarioSimulatorViewProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [baseline, setBaseline] = useState<ScenarioBaselineMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Search states
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [selectedScenarioForDetail, setSelectedScenarioForDetail] = useState<Scenario | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // Deletion Confirmation State
  const [deletingScenario, setDeletingScenario] = useState<Scenario | null>(null);
  const [isDeletingScenario, setIsDeletingScenario] = useState(false);

  // Multi-select for side-by-side compare
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());

  // Load scenarios and baseline
  const loadData = async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    setErrorMsg(null);
    try {
      const [baselineRes, scenariosRes] = await Promise.all([
        api.getScenarioBaseline(),
        api.getScenarios(),
      ]);
      setBaseline(baselineRes);
      setScenarios(scenariosRes);
    } catch (err: any) {
      console.error('[SIMULATOR] Error loading data:', err);
      setErrorMsg(err.message || 'Failed to load What-If scenarios');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(false);
  };

  // Toggle selection for comparison
  const handleToggleCompare = (scenario: Scenario) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(scenario.id)) {
        next.delete(scenario.id);
      } else {
        if (next.size >= 5) {
          alert('You can compare a maximum of 5 scenarios at once.');
          return prev;
        }
        next.add(scenario.id);
      }
      return next;
    });
  };

  // Duplicate scenario
  const handleDuplicate = async (scenario: Scenario) => {
    try {
      const duplicated = await api.duplicateScenario(scenario.id);
      setScenarios((prev) => [duplicated, ...prev]);
    } catch (err: any) {
      alert(`Duplication failed: ${err.message}`);
    }
  };

  // Delete scenario prompt
  const handleDelete = (scenario: Scenario) => {
    setDeletingScenario(scenario);
  };

  const handleConfirmDeleteScenario = async () => {
    if (!deletingScenario) return;
    try {
      setIsDeletingScenario(true);
      await api.deleteScenario(deletingScenario.id);
      setScenarios((prev) => prev.filter((s) => s.id !== deletingScenario.id));
      setCompareIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingScenario.id);
        return next;
      });
      if (selectedScenarioForDetail?.id === deletingScenario.id) {
        setSelectedScenarioForDetail(null);
      }
      setDeletingScenario(null);
    } catch (err: any) {
      console.error('[SIMULATOR] Deletion failed:', err);
      setErrorMsg(err.message || 'Failed to delete scenario');
    } finally {
      setIsDeletingScenario(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (scenario: Scenario) => {
    try {
      const updated = await api.updateScenario(scenario.id, {
        isPinned: !scenario.isPinned,
      });
      setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err: any) {
      alert(`Pin update failed: ${err.message}`);
    }
  };

  // Filtered and sorted scenarios list
  const filteredScenarios = useMemo(() => {
    return scenarios
      .filter((s) => {
        if (selectedTypeFilter !== 'all' && s.type !== selectedTypeFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const title = (s.title || '').toLowerCase();
          const desc = (s.description || '').toLowerCase();
          return (
            title.includes(q) ||
            desc.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        // Pinned first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });
  }, [scenarios, selectedTypeFilter, searchQuery]);

  const selectedForCompareList = useMemo(() => {
    return scenarios.filter((s) => compareIds.has(s.id));
  }, [scenarios, compareIds]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner: What-If Simulator Header & Verified Baseline Summary */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-100/40 via-purple-50/20 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-3">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>HouseMind Decision Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              What-If Financial Simulator
            </h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Model home equipment upgrades, loans, recurring bills, and savings targets. Test decisions in a safe mathematical sandbox without impacting real household data.
            </p>
          </div>

          {/* Baseline Overview Pill Box */}
          {baseline && (
            <div className="w-full lg:w-auto bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                  Baseline Income
                </span>
                <span className="text-base font-extrabold font-mono text-slate-900 mt-0.5 block">
                  {currency} {baseline.monthlyIncome.toLocaleString()}
                  <span className="text-[11px] text-slate-400 font-normal">/mo</span>
                </span>
              </div>

              <div className="hidden sm:block w-px h-8 bg-slate-200" />

              <div>
                <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                  Fixed & Variable Burn
                </span>
                <span className="text-base font-extrabold font-mono text-slate-700 mt-0.5 block">
                  {currency} {baseline.totalMonthlyExpenses.toLocaleString()}
                  <span className="text-[11px] text-slate-400 font-normal">/mo</span>
                </span>
              </div>

              <div className="hidden sm:block w-px h-8 bg-slate-200" />

              <div>
                <span className="text-[11px] font-semibold text-indigo-700 block uppercase tracking-wider">
                  Safe Monthly Surplus
                </span>
                <span className="text-base font-extrabold font-mono text-indigo-600 mt-0.5 block">
                  {currency} {baseline.netMonthlySurplus.toLocaleString()}
                  <span className="text-xs text-emerald-600 font-bold ml-1">
                    ({baseline.savingsRate}%)
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh baseline metrics from verified transactions & expenses"
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-200/50 rounded-xl transition cursor-pointer ml-auto"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        {/* Left: Search & Type Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            />
          </div>

          {/* Type Filter Pill Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {[
              { id: 'all', label: 'All Models' },
              { id: 'appliance_purchase', label: 'Appliances' },
              { id: 'emi_loan', label: 'EMI / Loans' },
              { id: 'income_change', label: 'Income' },
              { id: 'new_expense', label: 'Recurring' },
              { id: 'savings_goal', label: 'Savings Goals' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTypeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedTypeFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {compareIds.size >= 2 && (
            <button
              type="button"
              onClick={() => setIsComparisonOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer shadow-xs animate-pulse"
            >
              <Scale className="w-4 h-4" />
              <span>Compare ({compareIds.size}) Options</span>
            </button>
          )}

          {compareIds.size > 0 && (
            <button
              type="button"
              onClick={() => setCompareIds(new Set())}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
            >
              Clear selection
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingScenario(null);
              setIsBuilderOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer shadow-sm shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New What-If Model</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 text-sm">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading What-If models and financial baselines...
        </div>
      ) : errorMsg ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : filteredScenarios.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
            <SlidersHorizontal className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No What-If Scenarios Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Start by modeling a hypothetical decision like buying an energy-efficient AC, adjusting salary, or planning a savings goal.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditingScenario(null);
                setIsBuilderOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create First What-If Model</span>
            </button>
          </div>
        </div>
      ) : (
        /* Scenarios Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              currency={currency}
              onSelect={(scen) => setSelectedScenarioForDetail(scen)}
              onEdit={(scen) => {
                setEditingScenario(scen);
                setIsBuilderOpen(true);
              }}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              isSelectedForCompare={compareIds.has(scenario.id)}
              onToggleCompare={handleToggleCompare}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {isBuilderOpen && (
        <ScenarioBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingScenario(null);
          }}
          onSaved={(savedScenario) => {
            setScenarios((prev) => {
              const exists = prev.some((s) => s.id === savedScenario.id);
              if (exists) {
                return prev.map((s) => (s.id === savedScenario.id ? savedScenario : s));
              }
              return [savedScenario, ...prev];
            });
            setSelectedScenarioForDetail(savedScenario);
          }}
          baseline={baseline}
          assets={assets}
          initialScenario={editingScenario}
          currency={currency}
        />
      )}

      {selectedScenarioForDetail && (
        <ScenarioDetailModal
          isOpen={!!selectedScenarioForDetail}
          scenario={selectedScenarioForDetail}
          onClose={() => setSelectedScenarioForDetail(null)}
          currency={currency}
          onEdit={(scen) => {
            setSelectedScenarioForDetail(null);
            setEditingScenario(scen);
            setIsBuilderOpen(true);
          }}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onUpdated={(updated) => {
            setScenarios((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            setSelectedScenarioForDetail(updated);
          }}
        />
      )}

      {isComparisonOpen && selectedForCompareList.length >= 2 && (
        <ScenarioComparisonModal
          isOpen={isComparisonOpen}
          onClose={() => setIsComparisonOpen(false)}
          selectedScenarios={selectedForCompareList}
          currency={currency}
          onSelectScenario={(scen) => {
            setIsComparisonOpen(false);
            setSelectedScenarioForDetail(scen);
          }}
        />
      )}

      {/* Delete Scenario Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingScenario)}
        title="Delete Scenario"
        itemName={deletingScenario?.title || 'What-If Scenario'}
        itemType="what-if simulation"
        description="Are you sure you want to permanently delete this financial simulation scenario?"
        warningNote="All customized parameters, milestone calculations, and projections for this scenario will be discarded."
        confirmLabel="Delete Scenario"
        isDeleting={isDeletingScenario}
        onConfirm={handleConfirmDeleteScenario}
        onCancel={() => setDeletingScenario(null)}
      />
    </div>
  );
}
