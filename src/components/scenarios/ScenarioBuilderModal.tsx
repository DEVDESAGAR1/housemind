import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  SlidersHorizontal,
  DollarSign,
  TrendingDown,
  Zap,
  CreditCard,
  Target,
  Wrench,
  Layers,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  Scenario,
  ScenarioType,
  ScenarioInput,
  ScenarioBaselineMetrics,
  ScenarioProjectedMetrics,
  AffordabilityIndicator,
  CustomAdjustment,
  HomeAsset,
  AssetCategory,
} from '../../types';
import { api } from '../../lib/api';
import { AffordabilityBadge } from './AffordabilityBadge';

interface ScenarioBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (scenario: Scenario) => void;
  baseline: ScenarioBaselineMetrics | null;
  assets?: HomeAsset[];
  initialScenario?: Scenario | null;
  currency: string;
}

export function ScenarioBuilderModal({
  isOpen,
  onClose,
  onSaved,
  baseline,
  assets = [],
  initialScenario,
  currency,
}: ScenarioBuilderModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ScenarioType>('appliance_purchase');
  const [isPinned, setIsPinned] = useState(false);

  // Scenario Input fields
  const [incomeDelta, setIncomeDelta] = useState<number>(500);
  const [incomeChangeType, setIncomeChangeType] = useState<string>('salary_hike');

  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Utilities');
  const [expenseAmount, setExpenseAmount] = useState<number>(150);
  const [expenseFrequency, setExpenseFrequency] = useState<'monthly' | 'quarterly' | 'annual' | 'one_time'>('monthly');

  const [purchaseTitle, setPurchaseTitle] = useState('');
  const [purchaseCost, setPurchaseCost] = useState<number>(2000);
  const [purchaseCategory, setPurchaseCategory] = useState('Home Improvement');

  const [loanPrincipal, setLoanPrincipal] = useState<number>(5000);
  const [annualInterestRate, setAnnualInterestRate] = useState<number>(8.5);
  const [tenureMonths, setTenureMonths] = useState<number>(24);
  const [downPayment, setDownPayment] = useState<number>(1000);
  const [processingFee, setProcessingFee] = useState<number>(50);
  const [loanType, setLoanType] = useState<string>('home_renovation');

  const [applianceName, setApplianceName] = useState('5-Star Inverter AC');
  const [applianceCategory, setApplianceCategory] = useState<AssetCategory>('hvac');
  const [applianceCost, setApplianceCost] = useState<number>(1500);
  const [applianceDownPayment, setApplianceDownPayment] = useState<number>(300);
  const [applianceFinanced, setApplianceFinanced] = useState<boolean>(true);
  const [applianceRate, setApplianceRate] = useState<number>(0); // 0% No Cost EMI default
  const [applianceTenure, setApplianceTenure] = useState<number>(12);
  const [applianceOperatingCost, setApplianceOperatingCost] = useState<number>(25);
  const [replacesAssetId, setReplacesAssetId] = useState<string>('');

  const [savingsTargetAmount, setSavingsTargetAmount] = useState<number>(10000);
  const [savingsHorizonMonths, setSavingsHorizonMonths] = useState<number>(12);
  const [savingsGoalCategory, setSavingsGoalCategory] = useState('Emergency Reserve');

  const [customAdjustments, setCustomAdjustments] = useState<CustomAdjustment[]>([
    { label: 'Side consulting income', type: 'income', amount: 800, frequency: 'monthly' },
    { label: 'Smart thermostat install', type: 'one_time', amount: 300, frequency: 'one_time' },
  ]);

  const [notes, setNotes] = useState('');

  // Live simulation results state
  const [simulatedProjection, setSimulatedProjection] = useState<ScenarioProjectedMetrics | null>(null);
  const [simulatedAffordability, setSimulatedAffordability] = useState<AffordabilityIndicator | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or populate from existing scenario
  useEffect(() => {
    if (initialScenario) {
      setTitle(initialScenario.title);
      setDescription(initialScenario.description || '');
      setType(initialScenario.type);
      setIsPinned(!!initialScenario.isPinned);
      setNotes(initialScenario.inputs.notes || '');

      const inp = initialScenario.inputs;
      if (inp.incomeDelta !== undefined) setIncomeDelta(inp.incomeDelta || 0);
      if (inp.incomeChangeType) setIncomeChangeType(inp.incomeChangeType);

      if (inp.expenseTitle) setExpenseTitle(inp.expenseTitle);
      if (inp.expenseCategory) setExpenseCategory(inp.expenseCategory);
      if (inp.expenseAmount !== undefined) setExpenseAmount(inp.expenseAmount);
      if (inp.expenseFrequency) setExpenseFrequency(inp.expenseFrequency);

      if (inp.purchaseTitle) setPurchaseTitle(inp.purchaseTitle);
      if (inp.purchaseCost !== undefined) setPurchaseCost(inp.purchaseCost);
      if (inp.purchaseCategory) setPurchaseCategory(inp.purchaseCategory);

      if (inp.loanPrincipal !== undefined) setLoanPrincipal(inp.loanPrincipal);
      if (inp.annualInterestRate !== undefined) setAnnualInterestRate(inp.annualInterestRate);
      if (inp.tenureMonths !== undefined) setTenureMonths(inp.tenureMonths);
      if (inp.downPayment !== undefined) setDownPayment(inp.downPayment);
      if (inp.processingFee !== undefined) setProcessingFee(inp.processingFee);
      if (inp.loanType) setLoanType(inp.loanType);

      if (inp.applianceName) setApplianceName(inp.applianceName);
      if (inp.applianceCategory) setApplianceCategory(inp.applianceCategory);
      if (inp.purchaseCost !== undefined) setApplianceCost(inp.purchaseCost);
      if (inp.downPayment !== undefined) setApplianceDownPayment(inp.downPayment);
      if (inp.annualInterestRate !== undefined) setApplianceRate(inp.annualInterestRate);
      if (inp.tenureMonths !== undefined) setApplianceTenure(inp.tenureMonths);
      if (inp.applianceMonthlyOperatingCost !== undefined)
        setApplianceOperatingCost(inp.applianceMonthlyOperatingCost);
      if (inp.replacesAssetId) setReplacesAssetId(inp.replacesAssetId);

      if (inp.savingsTargetAmount !== undefined) setSavingsTargetAmount(inp.savingsTargetAmount);
      if (inp.savingsHorizonMonths !== undefined) setSavingsHorizonMonths(inp.savingsHorizonMonths);
      if (inp.savingsGoalCategory) setSavingsGoalCategory(inp.savingsGoalCategory);

      if (inp.customAdjustments) setCustomAdjustments(inp.customAdjustments);
    } else {
      // Default reset
      setTitle('Energy-Efficient Heat Pump AC');
      setDescription('Model the impact of purchasing a 5-Star Dual Inverter AC on a 12-month zero-interest plan.');
      setType('appliance_purchase');
      setIsPinned(false);
      setApplianceCost(1500);
      setApplianceDownPayment(300);
      setApplianceFinanced(true);
      setApplianceRate(0);
      setApplianceTenure(12);
      setApplianceOperatingCost(25);
    }
  }, [initialScenario, isOpen]);

  // Construct current inputs payload
  const buildCurrentInputs = (): ScenarioInput => {
    switch (type) {
      case 'income_change':
        return {
          incomeDelta: Number(incomeDelta) || 0,
          incomeChangeType: incomeChangeType as any,
          notes: notes.trim() || undefined,
        };
      case 'new_expense':
        return {
          expenseTitle: expenseTitle.trim() || 'New Expense',
          expenseCategory: expenseCategory.trim(),
          expenseAmount: Number(expenseAmount) || 0,
          expenseFrequency,
          notes: notes.trim() || undefined,
        };
      case 'one_time_purchase':
        return {
          purchaseTitle: purchaseTitle.trim() || 'Major Purchase',
          purchaseCost: Number(purchaseCost) || 0,
          purchaseCategory: purchaseCategory.trim(),
          notes: notes.trim() || undefined,
        };
      case 'emi_loan':
        return {
          loanPrincipal: Number(loanPrincipal) || 0,
          annualInterestRate: Number(annualInterestRate) || 0,
          tenureMonths: Number(tenureMonths) || 12,
          downPayment: Number(downPayment) || 0,
          processingFee: Number(processingFee) || 0,
          loanType: loanType as any,
          notes: notes.trim() || undefined,
        };
      case 'appliance_purchase': {
        const principal = applianceFinanced
          ? Math.max(0, Number(applianceCost) - Number(applianceDownPayment))
          : 0;
        return {
          applianceName: applianceName.trim() || 'Home Appliance',
          applianceCategory,
          purchaseCost: Number(applianceCost) || 0,
          downPayment: Number(applianceDownPayment) || 0,
          loanPrincipal: principal,
          annualInterestRate: applianceFinanced ? Number(applianceRate) || 0 : 0,
          tenureMonths: applianceFinanced ? Number(applianceTenure) || 12 : 0,
          applianceMonthlyOperatingCost: Number(applianceOperatingCost) || 0,
          replacesAssetId: replacesAssetId || undefined,
          notes: notes.trim() || undefined,
        };
      }
      case 'savings_goal':
        return {
          savingsTargetAmount: Number(savingsTargetAmount) || 0,
          savingsHorizonMonths: Number(savingsHorizonMonths) || 12,
          savingsGoalCategory: savingsGoalCategory.trim(),
          notes: notes.trim() || undefined,
        };
      case 'custom':
        return {
          customAdjustments,
          notes: notes.trim() || undefined,
        };
      default:
        return {};
    }
  };

  // Run live simulation on input changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const runSimulation = async () => {
      setIsSimulating(true);
      setErrorMsg(null);
      try {
        const inputs = buildCurrentInputs();
        const result = await api.simulateScenario(type, inputs);
        if (isMounted) {
          setSimulatedProjection(result.projectedMetrics);
          setSimulatedAffordability(result.affordability);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Simulation error');
        }
      } finally {
        if (isMounted) {
          setIsSimulating(false);
        }
      }
    };

    const timer = setTimeout(runSimulation, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    isOpen,
    type,
    incomeDelta,
    incomeChangeType,
    expenseTitle,
    expenseCategory,
    expenseAmount,
    expenseFrequency,
    purchaseTitle,
    purchaseCost,
    purchaseCategory,
    loanPrincipal,
    annualInterestRate,
    tenureMonths,
    downPayment,
    processingFee,
    loanType,
    applianceName,
    applianceCategory,
    applianceCost,
    applianceDownPayment,
    applianceFinanced,
    applianceRate,
    applianceTenure,
    applianceOperatingCost,
    replacesAssetId,
    savingsTargetAmount,
    savingsHorizonMonths,
    savingsGoalCategory,
    customAdjustments,
    notes,
  ]);

  // Preset scenarios handler
  const loadPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'ac_emi':
        setType('appliance_purchase');
        setTitle('5-Star Inverter AC (Zero-Cost EMI)');
        setDescription('Purchase 1.5 Ton Inverter AC with 20% down payment and 12-month zero interest finance.');
        setApplianceName('Daikin 1.5 Ton 5-Star AC');
        setApplianceCategory('hvac');
        setApplianceCost(1500);
        setApplianceDownPayment(300);
        setApplianceFinanced(true);
        setApplianceRate(0);
        setApplianceTenure(12);
        setApplianceOperatingCost(30);
        break;
      case 'salary_hike':
        setType('income_change');
        setTitle('15% Salary Increment');
        setDescription('Simulate a $750/mo promotion raise on net take-home pay.');
        setIncomeDelta(750);
        setIncomeChangeType('salary_hike');
        break;
      case 'roof_renovation':
        setType('emi_loan');
        setTitle('Architectural Roof Replacement');
        setDescription('Financing complete roof replacement ($12,000) over 36 months at 7.5% APR.');
        setLoanPrincipal(12000);
        setAnnualInterestRate(7.5);
        setTenureMonths(36);
        setDownPayment(2000);
        setProcessingFee(150);
        setLoanType('home_renovation');
        break;
      case 'emergency_fund':
        setType('savings_goal');
        setTitle('6-Month Emergency Buffer Fund');
        setDescription('Target $12,000 liquid emergency reserve over 12 months.');
        setSavingsTargetAmount(12000);
        setSavingsHorizonMonths(12);
        setSavingsGoalCategory('Emergency Reserve');
        break;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a scenario title.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const inputs = buildCurrentInputs();
      let saved: Scenario;

      if (initialScenario) {
        saved = await api.updateScenario(initialScenario.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          inputs,
          isPinned,
        });
      } else {
        saved = await api.createScenario({
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          inputs,
          isPinned,
        });
      }

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save scenario');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {initialScenario ? 'Edit What-If Scenario' : 'New What-If Simulation'}
              </h2>
              <p className="text-xs text-slate-500">
                Model financial and household decisions without modifying real data.
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

        {/* Modal Body: Two-Column Form & Live Preview */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls (7 cols) */}
          <form id="scenario-form" onSubmit={handleSave} className="lg:col-span-7 space-y-5">
            {/* Quick Presets */}
            {!initialScenario && (
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Quick Scenario Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => loadPreset('ac_emi')}
                    className="p-2 text-left rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-xs transition cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800 block truncate">Inverter AC EMI</span>
                    <span className="text-[10px] text-slate-500">0% Interest 12m</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('salary_hike')}
                    className="p-2 text-left rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs transition cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800 block truncate">Salary Hike</span>
                    <span className="text-[10px] text-slate-500">+15% Take-Home</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('roof_renovation')}
                    className="p-2 text-left rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 text-xs transition cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800 block truncate">Roof Loan</span>
                    <span className="text-[10px] text-slate-500">36m Renovation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('emergency_fund')}
                    className="p-2 text-left rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 text-xs transition cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800 block truncate">Emergency Fund</span>
                    <span className="text-[10px] text-slate-500">12m Savings Goal</span>
                  </button>
                </div>
              </div>
            )}

            {/* Scenario Title & Description */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scenario Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Upgrade to Daikin 1.5T 5-Star AC"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes & Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional context (e.g. replacing 12-year old cooling system)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Scenario Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Scenario Decision Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'appliance_purchase', label: 'Appliance Upgrade', icon: Wrench },
                  { id: 'emi_loan', label: 'EMI / Loan', icon: CreditCard },
                  { id: 'income_change', label: 'Income Change', icon: DollarSign },
                  { id: 'new_expense', label: 'New Recurring Bill', icon: TrendingDown },
                  { id: 'one_time_purchase', label: 'One-Time Outflow', icon: Zap },
                  { id: 'savings_goal', label: 'Savings Target', icon: Target },
                  { id: 'custom', label: 'Custom Multi-Var', icon: Layers },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = type === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as ScenarioType)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-bold shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Inputs Based on Selected Type */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              {/* 1. Appliance Purchase */}
              {type === 'appliance_purchase' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Appliance Name
                      </label>
                      <input
                        type="text"
                        value={applianceName}
                        onChange={(e) => setApplianceName(e.target.value)}
                        placeholder="e.g. Daikin 1.5 Ton AC"
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category
                      </label>
                      <select
                        value={applianceCategory}
                        onChange={(e) => setApplianceCategory(e.target.value as any)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl"
                      >
                        <option value="hvac">HVAC / Heat Pump / AC</option>
                        <option value="kitchen">Kitchen Appliance (Fridge/Dishwasher)</option>
                        <option value="laundry">Laundry (Washer/Dryer)</option>
                        <option value="plumbing">Water Heater / Plumbing</option>
                        <option value="roofing_exterior">Roofing & Solar</option>
                        <option value="electrical">Electrical & Backup</option>
                        <option value="other">Other Equipment</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Purchase Price ({currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={applianceCost}
                        onChange={(e) => setApplianceCost(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Down Payment ({currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={applianceDownPayment}
                        onChange={(e) => setApplianceDownPayment(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Monthly Operating ({currency}/mo)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={applianceOperatingCost}
                        onChange={(e) => setApplianceOperatingCost(Number(e.target.value))}
                        placeholder="Estimated power/maintenance"
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  {/* Financing Toggle */}
                  <div className="pt-2 border-t border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={applianceFinanced}
                        onChange={(e) => setApplianceFinanced(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        Finance balance with monthly EMI
                      </span>
                    </label>

                    {applianceFinanced && (
                      <div className="grid grid-cols-2 gap-3 mt-2 pl-6">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Annual Interest Rate (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={applianceRate}
                            onChange={(e) => setApplianceRate(Number(e.target.value))}
                            placeholder="0 for No-Cost EMI"
                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Tenure (Months)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={applianceTenure}
                            onChange={(e) => setApplianceTenure(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Replaces Existing Asset Selector */}
                  {assets.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Replaces Existing Asset (Optional)
                      </label>
                      <select
                        value={replacesAssetId}
                        onChange={(e) => setReplacesAssetId(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl"
                      >
                        <option value="">-- None (Brand new addition) --</option>
                        {assets.map((ast) => (
                          <option key={ast.id} value={ast.id}>
                            {ast.name} ({ast.roomLocation || ast.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* 2. EMI / Loan */}
              {type === 'emi_loan' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Loan Principal ({currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={loanPrincipal}
                        onChange={(e) => setLoanPrincipal(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Annual Interest Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={annualInterestRate}
                        onChange={(e) => setAnnualInterestRate(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tenure (Months)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="360"
                        value={tenureMonths}
                        onChange={(e) => setTenureMonths(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Down Payment ({currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={downPayment}
                        onChange={(e) => setDownPayment(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Processing Fee ({currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={processingFee}
                        onChange={(e) => setProcessingFee(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Income Change */}
              {type === 'income_change' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monthly Income Delta ({currency})
                    </label>
                    <input
                      type="number"
                      value={incomeDelta}
                      onChange={(e) => setIncomeDelta(Number(e.target.value))}
                      placeholder="+500 or -500"
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Change Type
                    </label>
                    <select
                      value={incomeChangeType}
                      onChange={(e) => setIncomeChangeType(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="salary_hike">Salary Hike / Promotion</option>
                      <option value="bonus_amortized">Bonus Amortization</option>
                      <option value="freelance_stream">New Secondary Income Stream</option>
                      <option value="job_loss">Income Reduction / Job Change</option>
                      <option value="other">Other Income Adjustment</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 4. New Expense */}
              {type === 'new_expense' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Expense Title
                      </label>
                      <input
                        type="text"
                        value={expenseTitle}
                        onChange={(e) => setExpenseTitle(e.target.value)}
                        placeholder="e.g. Premium Health Membership"
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value)}
                        placeholder="e.g. Services, Subscriptions"
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Amount ({currency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Frequency
                      </label>
                      <select
                        value={expenseFrequency}
                        onChange={(e) => setExpenseFrequency(e.target.value as any)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                        <option value="one_time">One-Time</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. One-Time Purchase */}
              {type === 'one_time_purchase' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Purchase Title
                    </label>
                    <input
                      type="text"
                      value={purchaseTitle}
                      onChange={(e) => setPurchaseTitle(e.target.value)}
                      placeholder="e.g. Living Room Furniture"
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Total Cost ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>
              )}

              {/* 6. Savings Goal */}
              {type === 'savings_goal' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Amount ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={savingsTargetAmount}
                      onChange={(e) => setSavingsTargetAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Timeline (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="360"
                      value={savingsHorizonMonths}
                      onChange={(e) => setSavingsHorizonMonths(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Goal Purpose
                    </label>
                    <input
                      type="text"
                      value={savingsGoalCategory}
                      onChange={(e) => setSavingsGoalCategory(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* 7. Custom Multi-Variable */}
              {type === 'custom' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      Multi-Variable Adjustments
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomAdjustments([
                          ...customAdjustments,
                          { label: 'New Item', type: 'expense', amount: 100, frequency: 'monthly' },
                        ])
                      }
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Variable</span>
                    </button>
                  </div>

                  {customAdjustments.map((adj, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={adj.label}
                        onChange={(e) => {
                          const copy = [...customAdjustments];
                          copy[index].label = e.target.value;
                          setCustomAdjustments(copy);
                        }}
                        className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                        placeholder="Label"
                      />
                      <select
                        value={adj.type}
                        onChange={(e) => {
                          const copy = [...customAdjustments];
                          copy[index].type = e.target.value as any;
                          setCustomAdjustments(copy);
                        }}
                        className="w-24 px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                      >
                        <option value="income">+ Income</option>
                        <option value="expense">- Expense</option>
                        <option value="one_time">One-Time</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        value={adj.amount}
                        onChange={(e) => {
                          const copy = [...customAdjustments];
                          copy[index].amount = Number(e.target.value);
                          setCustomAdjustments(copy);
                        }}
                        className="w-24 px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCustomAdjustments(customAdjustments.filter((_, i) => i !== index))
                        }
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pin Option */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pin-scenario-checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
              />
              <label htmlFor="pin-scenario-checkbox" className="text-xs text-slate-700 cursor-pointer">
                Pin this scenario to top of simulator board
              </label>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </form>

          {/* Right Column: Live Instant Preview Box (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900 text-white rounded-2xl p-5 shadow-inner">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Live Simulation Preview
                  </span>
                </div>
                {isSimulating && (
                  <span className="text-[10px] text-indigo-400 animate-pulse">Calculating...</span>
                )}
              </div>

              {/* Status and Score */}
              {simulatedAffordability && (
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">Affordability Status</span>
                    <AffordabilityBadge status={simulatedAffordability.status} size="sm" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    {simulatedAffordability.verdictTitle}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {simulatedAffordability.verdictSummary}
                  </p>
                </div>
              )}

              {/* Metrics Grid */}
              {simulatedProjection && baseline && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                      <span className="text-[10px] uppercase text-slate-400 block">Baseline Surplus</span>
                      <span className="text-sm font-mono font-bold text-slate-200">
                        {currency} {baseline.netMonthlySurplus.toLocaleString()}/mo
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {baseline.savingsRate}% savings
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60">
                      <span className="text-[10px] uppercase text-indigo-300 block">Projected Surplus</span>
                      <span className="text-sm font-mono font-bold text-white">
                        {currency} {simulatedProjection.projectedNetSurplus.toLocaleString()}/mo
                      </span>
                      <span
                        className={`text-[10px] font-bold block mt-0.5 ${
                          simulatedProjection.surplusDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {simulatedProjection.surplusDelta >= 0 ? '+' : ''}
                        {currency} {simulatedProjection.surplusDelta.toLocaleString()}/mo
                      </span>
                    </div>
                  </div>

                  {/* Financing & Debt Ratios */}
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                    {simulatedProjection.monthlyEmiPayment ? (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Monthly EMI:</span>
                        <strong className="text-white font-mono">
                          {currency} {simulatedProjection.monthlyEmiPayment}/mo
                        </strong>
                      </div>
                    ) : null}

                    {simulatedProjection.totalLoanCost ? (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Financing Cost:</span>
                        <span className="text-slate-200 font-mono">
                          {currency} {simulatedProjection.totalLoanCost.toLocaleString()}
                        </span>
                      </div>
                    ) : null}

                    {simulatedProjection.oneTimeCashImpact ? (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Initial Outflow:</span>
                        <span className="text-amber-300 font-mono">
                          {currency} {simulatedProjection.oneTimeCashImpact.toLocaleString()}
                        </span>
                      </div>
                    ) : null}

                    {simulatedProjection.breakevenMonths ? (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Breakeven Period:</span>
                        <span className="text-emerald-400 font-mono">
                          {simulatedProjection.breakevenMonths} months
                        </span>
                      </div>
                    ) : null}

                    <div className="flex justify-between border-t border-slate-700/60 pt-1.5 mt-1.5">
                      <span className="text-slate-400">Post-Savings Rate:</span>
                      <strong className="text-indigo-300 font-mono">
                        {simulatedProjection.projectedSavingsRate}%
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Deterministic calculation</span>
              <span>Safe sandbox mode</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/50 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="scenario-form"
            disabled={isSaving || !title.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSaving ? 'Saving Scenario...' : initialScenario ? 'Update Scenario' : 'Save Scenario'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
