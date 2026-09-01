import React, { useMemo } from 'react';
import {
  Clock,
  FileText,
  Wrench,
  DollarSign,
  Building2,
  CheckCircle2,
  ArrowUpRight,
  Upload,
} from 'lucide-react';
import {
  HouseholdExpense,
  HomeAsset,
  MaintenanceTask,
  HouseholdDocument,
  Property,
} from '../../types';
import { formatRelativeActivityTime } from './dateUtils';

export interface ActivityEvent {
  id: string;
  type: 'document' | 'maintenance' | 'asset' | 'expense' | 'property';
  title: string;
  description: string;
  timestamp: string;
  actionTab: string;
}

interface RecentActivitySectionProps {
  expenses: HouseholdExpense[];
  assets: HomeAsset[];
  maintenances: MaintenanceTask[];
  documents: HouseholdDocument[];
  properties: Property[];
  onNavigate: (tab: string) => void;
}

export function RecentActivitySection({
  expenses,
  assets,
  maintenances,
  documents,
  properties,
  onNavigate,
}: RecentActivitySectionProps) {
  const activities = useMemo(() => {
    const list: ActivityEvent[] = [];

    // 1. Documents
    for (const doc of documents) {
      const ts = doc.updatedAt || doc.createdAt || doc.uploadedAt;
      if (ts) {
        list.push({
          id: `act_doc_${doc.id}`,
          type: 'document',
          title: `Document Processed: ${doc.fileName || 'Household File'}`,
          description: `Type: ${doc.documentType?.replace('_', ' ') || 'Document'} • Status: ${doc.status}`,
          timestamp: ts,
          actionTab: 'documents',
        });
      }
    }

    // 2. Maintenances
    for (const m of maintenances) {
      const ts = m.updatedAt || m.createdAt || m.serviceDate;
      if (ts) {
        list.push({
          id: `act_maint_${m.id}`,
          type: 'maintenance',
          title: `Service Record: ${m.title}`,
          description: `Status: ${m.status.replace('_', ' ')} • Provider: ${m.serviceProvider || 'Self'}`,
          timestamp: ts,
          actionTab: 'maintenance',
        });
      }
    }

    // 3. Assets
    for (const ast of assets) {
      const ts = ast.updatedAt || ast.createdAt;
      if (ts) {
        list.push({
          id: `act_ast_${ast.id}`,
          type: 'asset',
          title: `Equipment Registered: ${ast.name}`,
          description: `Category: ${ast.category.replace('_', ' ')} • Status: ${ast.currentStatus.replace('_', ' ')}`,
          timestamp: ts,
          actionTab: 'assets',
        });
      }
    }

    // 4. Expenses
    for (const exp of expenses) {
      const ts = exp.updatedAt || exp.createdAt;
      if (ts) {
        list.push({
          id: `act_exp_${exp.id}`,
          type: 'expense',
          title: `Bill Tracked: ${exp.title}`,
          description: `Category: ${exp.category.replace('_', ' ')} • Status: ${exp.paymentStatus}`,
          timestamp: ts,
          actionTab: 'expenses',
        });
      }
    }

    // 5. Properties
    for (const p of properties) {
      const ts = p.updatedAt || p.createdAt;
      if (ts) {
        list.push({
          id: `act_prop_${p.id}`,
          type: 'property',
          title: `Property Profile: ${p.name || 'Residence'}`,
          description: `${p.propertyType?.replace('_', ' ') || 'Home'} • ${p.address?.city || 'Configured'}`,
          timestamp: ts,
          actionTab: 'properties',
        });
      }
    }

    // Sort descending by timestamp
    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [expenses, assets, maintenances, documents, properties]);

  const getActivityIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'document':
        return <Upload className="w-3.5 h-3.5 text-indigo-600" />;
      case 'maintenance':
        return <Wrench className="w-3.5 h-3.5 text-amber-600" />;
      case 'asset':
        return <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />;
      case 'expense':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-600" />;
      case 'property':
        return <Building2 className="w-3.5 h-3.5 text-purple-600" />;
    }
  };

  return (
    <div
      id="household-recent-activity-section"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shadow-2xs">
            <Clock className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Recent Household Activity</h2>
        </div>
        <span className="text-xs text-slate-400">Live ledger</span>
      </div>

      {activities.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No recent activity logged yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {activities.map((act) => (
            <div
              key={act.id}
              onClick={() => onNavigate(act.actionTab)}
              className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2.5 -mx-2.5 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  {getActivityIcon(act.type)}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition truncate">
                    {act.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">{act.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10.5px] text-slate-400 font-medium">
                  {formatRelativeActivityTime(act.timestamp)}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
