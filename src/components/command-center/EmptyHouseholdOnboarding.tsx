import React from 'react';
import {
  Building2,
  Upload,
  Wrench,
  DollarSign,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface EmptyHouseholdOnboardingProps {
  onNavigate: (tab: string) => void;
  onOpenGlobalUpload?: () => void;
  onSeedDemo: () => void;
  isSeeding: boolean;
}

export function EmptyHouseholdOnboarding({
  onNavigate,
  onOpenGlobalUpload,
  onSeedDemo,
  isSeeding,
}: EmptyHouseholdOnboardingProps) {
  const steps = [
    {
      stepNumber: 1,
      title: 'Register Primary Residence',
      description: 'Set up your home profile, address, square footage, and room zones.',
      icon: <Building2 className="w-5 h-5 text-amber-600" />,
      actionLabel: 'Add Property',
      onClick: () => onNavigate('properties'),
      buttonClass: 'bg-amber-600 hover:bg-amber-500 text-white',
    },
    {
      stepNumber: 2,
      title: 'AI Document Intake',
      description: 'Upload PDF invoices, utility statements, or warranties for automated extraction.',
      icon: <Upload className="w-5 h-5 text-indigo-600" />,
      actionLabel: 'Upload Document',
      onClick: () => (onOpenGlobalUpload ? onOpenGlobalUpload() : onNavigate('documents')),
      buttonClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    },
    {
      stepNumber: 3,
      title: 'Track Equipment & Assets',
      description: 'Log HVAC, water heater, roof, and kitchen appliances with serial numbers.',
      icon: <Wrench className="w-5 h-5 text-blue-600" />,
      actionLabel: 'Add Asset',
      onClick: () => onNavigate('assets'),
      buttonClass: 'bg-blue-600 hover:bg-blue-500 text-white',
    },
    {
      stepNumber: 4,
      title: 'Manage Bills & Finances',
      description: 'Track recurring utilities, mortgage, loans, and monthly commitments.',
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      actionLabel: 'Add Bill',
      onClick: () => onNavigate('expenses'),
      buttonClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    },
  ];

  return (
    <div
      id="household-empty-state-onboarding"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6"
    >
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Welcome to HouseMind</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Start Building Your Household Operating Picture
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          HouseMind operates as your household's central command center. Follow the steps below to populate your home's systems, or load realistic starter data to explore immediately.
        </p>
      </div>

      {/* 4 Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((s) => (
          <div
            key={s.stepNumber}
            className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 flex flex-col justify-between space-y-4 hover:bg-white hover:border-indigo-200 transition shadow-2xs hover:shadow-xs"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                  {s.icon}
                </div>
                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                  {s.stepNumber}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{s.description}</p>
              </div>
            </div>

            <button
              id={`btn-onboarding-step-${s.stepNumber}`}
              onClick={s.onClick}
              className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${s.buttonClass}`}
            >
              <span>{s.actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Quick Demo Seed Option */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h4 className="text-xs font-bold text-slate-800">Want to see HouseMind in action right now?</h4>
          <p className="text-[11px] text-slate-500">
            Load an entire single-family household with HVAC equipment, warranty dates, utility bills, and mock loans.
          </p>
        </div>

        <button
          id="btn-onboarding-seed-demo"
          onClick={onSeedDemo}
          disabled={isSeeding}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{isSeeding ? 'Populating...' : 'Load Realistic Starter Data'}</span>
        </button>
      </div>
    </div>
  );
}
