import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Layers,
  ShieldCheck,
  Wrench,
  DollarSign,
  FileText,
  AlertCircle,
  ExternalLink,
  Loader2,
  Calendar,
} from 'lucide-react';
import { api } from '../lib/api';
import { HouseholdTimelineEvent, HouseholdTimelineResponse, HouseholdDomain } from '../types';

interface HouseholdTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  currencyCode?: string;
  locale?: string;
}

export function HouseholdTimelineModal({
  isOpen,
  onClose,
  onNavigate,
  currencyCode = 'USD',
  locale,
}: HouseholdTimelineModalProps) {
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [timelineData, setTimelineData] = useState<HouseholdTimelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadTimeline = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getHouseholdTimeline({
          domain: selectedDomain === 'all' ? undefined : selectedDomain,
          limit: 50,
        });
        if (isMounted) {
          setTimelineData(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load household operational timeline.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTimeline();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedDomain]);

  if (!isOpen) return null;

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'assets':
        return <Layers className="w-3.5 h-3.5 text-sky-400" />;
      case 'warranties':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'maintenance':
        return <Wrench className="w-3.5 h-3.5 text-amber-400" />;
      case 'issues':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'finance':
        return <DollarSign className="w-3.5 h-3.5 text-violet-400" />;
      case 'documents':
        return <FileText className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const domainFilterTabs = [
    { id: 'all', label: 'All Operations' },
    { id: 'issues', label: 'Issues & Repairs' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'warranties', label: 'Warranties' },
    { id: 'finance', label: 'Finance & Bills' },
    { id: 'documents', label: 'Documents' },
    { id: 'assets', label: 'Assets' },
  ];

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '';
    try {
      return new Intl.NumberFormat(locale || undefined, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(val);
    } catch {
      return `${currencyCode} ${val.toLocaleString()}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Household Operational Timeline
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Unified chronological log of asset changes, maintenance tasks, tickets, and financial events.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Domain Filter Tabs */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-2">
          {domainFilterTabs.map((tab) => {
            const count = timelineData?.domainCounts
              ? tab.id === 'all'
                ? timelineData.domainCounts.all
                : timelineData.domainCounts[tab.id]
              : undefined;

            return (
              <button
                key={tab.id}
                onClick={() => setSelectedDomain(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  selectedDomain === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                <span>{tab.label}</span>
                {count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      selectedDomain === tab.id ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading household timeline...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 text-xs">
              {error}
            </div>
          ) : !timelineData || timelineData.events.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <History className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-white">No Operational Events Recorded</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No events found for the selected category.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
              {timelineData.events.map((event) => (
                <div key={event.id} className="relative group">
                  {/* Timeline Bullet */}
                  <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center" />

                  {/* Event Card */}
                  <div className="bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 rounded-2xl p-4 transition space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/80 text-slate-300 border border-slate-600/50 capitalize font-medium text-[11px]">
                          {getDomainIcon(event.domain)}
                          {event.domain}
                        </span>

                        {event.status && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-[10px] font-medium capitalize">
                            {event.status}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{event.date}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">{event.title}</h4>
                      {event.description && (
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Row (Amount & Navigation Action) */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-xs">
                      <div>
                        {event.amount !== undefined && event.amount > 0 && (
                          <span className="font-semibold text-emerald-400">
                            {formatCurrency(event.amount)}
                          </span>
                        )}
                      </div>

                      {event.targetRoute && (
                        <button
                          onClick={() => {
                            onClose();
                            onNavigate(event.targetRoute!);
                          }}
                          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition cursor-pointer"
                        >
                          <span>View in {event.targetRoute}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
