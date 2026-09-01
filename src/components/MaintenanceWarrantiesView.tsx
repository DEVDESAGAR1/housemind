import React, { useState } from 'react';
import {
  Wrench,
  ShieldCheck,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Sparkles,
  Phone,
  Mail,
  FileText,
  DollarSign,
  Tag,
  X,
  Layers,
  Search,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  MaintenanceTask,
  Warranty,
  HomeAsset,
  Property,
  MaintenanceStatus,
  RecurrenceFrequency,
} from '../types';

interface MaintenanceWarrantiesViewProps {
  tasks: MaintenanceTask[];
  warranties: Warranty[];
  assets: HomeAsset[];
  properties: Property[];
  onRefresh: () => void;
  onOpenEntityExtractor: (entityType: 'maintenance' | 'warranty') => void;
  addToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  currency?: string;
}

export function MaintenanceWarrantiesView({
  tasks,
  warranties,
  assets,
  properties,
  onRefresh,
  onOpenEntityExtractor,
  addToast,
  currency = 'USD',
}: MaintenanceWarrantiesViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'maintenance' | 'warranties'>('maintenance');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssetId, setFilterAssetId] = useState<string>('');

  // Maintenance Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assetId: '',
    propertyId: properties[0]?.id || '',
    category: 'HVAC',
    frequency: 'quarterly' as RecurrenceFrequency,
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: 'scheduled' as MaintenanceStatus,
    estimatedCost: 80,
    serviceProviderName: '',
    serviceProviderContact: '',
  });

  // Warranty Modal
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);
  const [warrantyForm, setWarrantyForm] = useState({
    title: '',
    providerName: '',
    policyNumber: '',
    assetId: '',
    propertyId: properties[0]?.id || '',
    coverageType: 'manufacturer',
    coverageDetails: '',
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    status: 'active' as 'active' | 'expired' | 'expiring_soon',
    contactPhone: '',
    contactEmail: '',
    notes: '',
  });

  // Helper to open new task
  const handleOpenNewTask = () => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      assetId: assets[0]?.id || '',
      propertyId: properties[0]?.id || '',
      category: 'HVAC',
      frequency: 'quarterly',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: 'scheduled',
      estimatedCost: 75,
      serviceProviderName: '',
      serviceProviderContact: '',
    });
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: MaintenanceTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      assetId: task.assetId || '',
      propertyId: task.propertyId || properties[0]?.id || '',
      category: task.category || 'General',
      frequency: task.frequency || 'one_time',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      status: task.status,
      estimatedCost: task.estimatedCost || 0,
      serviceProviderName: task.serviceProviderName || '',
      serviceProviderContact: task.serviceProviderContact || '',
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await api.updateMaintenance(editingTask.id, taskForm);
        addToast('success', 'Task Updated', `Updated "${taskForm.title}".`);
      } else {
        await api.createMaintenance(taskForm);
        addToast('success', 'Task Scheduled', `Created task "${taskForm.title}".`);
      }
      setIsTaskModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Error Saving Task', err.message);
    }
  };

  const handleToggleTaskComplete = async (task: MaintenanceTask) => {
    const nextStatus: MaintenanceStatus = task.status === 'completed' ? 'scheduled' : 'completed';
    try {
      await api.updateMaintenance(task.id, {
        status: nextStatus,
        lastCompletedDate: nextStatus === 'completed' ? new Date().toISOString().slice(0, 10) : undefined,
      });
      addToast(
        'success',
        nextStatus === 'completed' ? 'Task Completed' : 'Task Reopened',
        `Marked "${task.title}" as ${nextStatus}.`
      );
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this maintenance task?')) return;
    try {
      await api.deleteMaintenance(taskId);
      addToast('info', 'Task Deleted', 'Maintenance task removed.');
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    }
  };

  // Helper to open new warranty
  const handleOpenNewWarranty = () => {
    setEditingWarranty(null);
    setWarrantyForm({
      title: '',
      providerName: '',
      policyNumber: '',
      assetId: assets[0]?.id || '',
      propertyId: properties[0]?.id || '',
      coverageType: 'manufacturer',
      coverageDetails: 'Full parts and labor warranty',
      startDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 365 * 2 * 86400000).toISOString().slice(0, 10),
      status: 'active',
      contactPhone: '',
      contactEmail: '',
      notes: '',
    });
    setIsWarrantyModalOpen(true);
  };

  const handleOpenEditWarranty = (w: Warranty) => {
    setEditingWarranty(w);
    setWarrantyForm({
      title: w.title,
      providerName: w.providerName,
      policyNumber: w.policyNumber || '',
      assetId: w.assetId || '',
      propertyId: w.propertyId || properties[0]?.id || '',
      coverageType: w.coverageType || 'manufacturer',
      coverageDetails: w.coverageDetails || '',
      startDate: w.startDate ? w.startDate.slice(0, 10) : '',
      expiryDate: w.expiryDate ? w.expiryDate.slice(0, 10) : '',
      status: w.status,
      contactPhone: w.contactPhone || '',
      contactEmail: w.contactEmail || '',
      notes: w.notes || '',
    });
    setIsWarrantyModalOpen(true);
  };

  const handleSaveWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWarranty) {
        await api.updateWarranty(editingWarranty.id, warrantyForm);
        addToast('success', 'Warranty Updated', `Updated policy "${warrantyForm.title}".`);
      } else {
        await api.createWarranty(warrantyForm);
        addToast('success', 'Warranty Saved', `Registered warranty "${warrantyForm.title}".`);
      }
      setIsWarrantyModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Error Saving Warranty', err.message);
    }
  };

  const handleDeleteWarranty = async (warrantyId: string) => {
    if (!confirm('Are you sure you want to delete this warranty policy?')) return;
    try {
      await api.deleteWarranty(warrantyId);
      addToast('info', 'Warranty Removed', 'Warranty policy deleted.');
      await onRefresh();
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    }
  };

  // Filter tasks & warranties
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAsset = !filterAssetId || t.assetId === filterAssetId;
    return matchesSearch && matchesAsset;
  });

  const filteredWarranties = warranties.filter((w) => {
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.policyNumber && w.policyNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAsset = !filterAssetId || w.assetId === filterAssetId;
    return matchesSearch && matchesAsset;
  });

  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now
  );
  const expiringWarranties = warranties.filter((w) => {
    if (!w.expiryDate || w.status === 'expired') return false;
    const diffDays = (new Date(w.expiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 60;
  });

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-indigo-600" />
            <span>Preventative Maintenance & Warranty Vault</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automate routine appliance upkeep, track service providers, and protect high-value equipment warranties.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenEntityExtractor(activeSubTab === 'warranties' ? 'warranty' : 'maintenance')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Extract from Document</span>
          </button>

          {activeSubTab === 'maintenance' ? (
            <button
              onClick={handleOpenNewTask}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Task</span>
            </button>
          ) : (
            <button
              onClick={handleOpenNewWarranty}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Warranty</span>
            </button>
          )}
        </div>
      </div>

      {/* Highlights Banner if Overdue / Expiring */}
      {(overdueTasks.length > 0 || expiringWarranties.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {overdueTasks.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">
                  {overdueTasks.length} Overdue Maintenance Task{overdueTasks.length > 1 ? 's' : ''} Require Attention!
                </span>
              </div>
              <button
                onClick={() => setActiveSubTab('maintenance')}
                className="text-[11px] font-bold text-rose-700 underline cursor-pointer"
              >
                Review Tasks →
              </button>
            </div>
          )}

          {expiringWarranties.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold">
                  {expiringWarranties.length} Warranty Policy Expiring Soon (within 60 days)
                </span>
              </div>
              <button
                onClick={() => setActiveSubTab('warranties')}
                className="text-[11px] font-bold text-amber-700 underline cursor-pointer"
              >
                Inspect Vault →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sub Tabs Selector */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('maintenance')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'maintenance'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Maintenance Schedule ({tasks.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('warranties')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'warranties'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Warranty Policies ({warranties.length})</span>
          </button>
        </div>

        {/* Filter / Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-36 sm:w-48"
            />
          </div>

          {assets.length > 0 && (
            <select
              value={filterAssetId}
              onChange={(e) => setFilterAssetId(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
            >
              <option value="">All Equipment</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Sub-Tab 1: Maintenance Tasks List */}
      {activeSubTab === 'maintenance' && (
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No maintenance tasks found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Keep your home operating smoothly with scheduled filter changes, gutter cleanouts, and water heater flushing.
              </p>
              <button
                onClick={handleOpenNewTask}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Maintenance Schedule</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map((task) => {
                const isOverdue =
                  task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < now;
                const isCompleted = task.status === 'completed';
                const linkedAsset = assets.find((a) => a.id === task.assetId);

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border p-4.5 transition shadow-2xs flex flex-col justify-between space-y-3 ${
                      isCompleted
                        ? 'border-slate-200 bg-slate-50/50 opacity-80'
                        : isOverdue
                        ? 'border-rose-300 ring-1 ring-rose-200'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isOverdue
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {isCompleted ? 'Completed' : isOverdue ? 'Overdue' : task.status}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 capitalize">
                              {task.frequency.replace('_', ' ')}
                            </span>
                          </div>
                          <h4
                            className={`text-sm font-bold ${
                              isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditTask(task)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{task.description}</p>
                      )}

                      {linkedAsset && (
                        <div className="mt-2.5 flex items-center gap-1 text-[11px] text-indigo-600 font-medium bg-indigo-50/60 px-2 py-1 rounded-md">
                          <Tag className="w-3 h-3" />
                          <span className="truncate">Target: {linkedAsset.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                        </span>
                        <span className="font-bold text-slate-900">
                          {task.estimatedCost ? `${currency} ${task.estimatedCost}` : 'No est.'}
                        </span>
                      </div>

                      {task.serviceProviderName && (
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span className="truncate">Pro: {task.serviceProviderName}</span>
                          {task.serviceProviderContact && (
                            <span className="text-slate-400">{task.serviceProviderContact}</span>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleTaskComplete(task)}
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isCompleted
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isCompleted ? 'Mark Incomplete' : 'Mark Completed'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Warranties Vault List */}
      {activeSubTab === 'warranties' && (
        <div className="space-y-4">
          {filteredWarranties.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No active warranties registered</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Store coverage details, policy numbers, and expiration dates for your home systems, roof, and appliances.
              </p>
              <button
                onClick={handleOpenNewWarranty}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Warranty Policy</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWarranties.map((warranty) => {
                const isExpired =
                  warranty.status === 'expired' ||
                  (warranty.expiryDate && new Date(warranty.expiryDate) < now);
                const linkedAsset = assets.find((a) => a.id === warranty.assetId);

                return (
                  <div
                    key={warranty.id}
                    className={`bg-white rounded-2xl border p-4.5 transition shadow-2xs flex flex-col justify-between space-y-3 ${
                      isExpired
                        ? 'border-slate-200 bg-slate-50/50 opacity-75'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                isExpired
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isExpired ? 'Expired' : 'Active Coverage'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 capitalize">
                              {warranty.coverageType.replace('_', ' ')}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">{warranty.title}</h4>
                          <p className="text-xs font-semibold text-indigo-600">{warranty.providerName}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditWarranty(warranty)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWarranty(warranty.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {warranty.policyNumber && (
                        <p className="text-[11px] text-slate-500 font-mono mt-1">
                          Policy #: <span className="text-slate-800 font-semibold">{warranty.policyNumber}</span>
                        </p>
                      )}

                      {warranty.coverageDetails && (
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{warranty.coverageDetails}</p>
                      )}

                      {linkedAsset && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded-md">
                          <Tag className="w-3 h-3" />
                          <span className="truncate">Covered: {linkedAsset.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Expires:</span>
                        <span className="font-bold text-slate-900">
                          {warranty.expiryDate
                            ? new Date(warranty.expiryDate).toLocaleDateString()
                            : 'Lifetime'}
                        </span>
                      </div>

                      {(warranty.contactPhone || warranty.contactEmail) && (
                        <div className="pt-1 flex items-center gap-3 text-slate-500">
                          {warranty.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {warranty.contactPhone}
                            </span>
                          )}
                          {warranty.contactEmail && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {warranty.contactEmail}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingTask ? 'Edit Maintenance Task' : 'Schedule Maintenance Task'}
              </h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Replace HVAC MERV 11 Air Filters"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={taskForm.frequency}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, frequency: e.target.value as RecurrenceFrequency })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi_annual">Semi-Annual</option>
                    <option value="annual">Annual</option>
                    <option value="one_time">One-Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Asset (Optional)</label>
                  <select
                    value={taskForm.assetId}
                    onChange={(e) => setTaskForm({ ...taskForm, assetId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  >
                    <option value="">-- General Property --</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Est. Cost ({currency})</label>
                  <input
                    type="number"
                    value={taskForm.estimatedCost}
                    onChange={(e) => setTaskForm({ ...taskForm, estimatedCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Provider / Contractor</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Provider Name (e.g. Apex HVAC)"
                    value={taskForm.serviceProviderName}
                    onChange={(e) => setTaskForm({ ...taskForm, serviceProviderName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Phone / Email"
                    value={taskForm.serviceProviderContact}
                    onChange={(e) => setTaskForm({ ...taskForm, serviceProviderContact: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Instructions, filter dimensions, model numbers..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warranty Modal */}
      {isWarrantyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingWarranty ? 'Edit Warranty' : 'Register Warranty Policy'}
              </h3>
              <button
                onClick={() => setIsWarrantyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWarranty} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Carrier Infinity Heat Pump 10-Yr Parts"
                  value={warrantyForm.title}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Provider / Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Carrier, American Home Shield"
                    value={warrantyForm.providerName}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, providerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Policy / Contract #</label>
                  <input
                    type="text"
                    placeholder="e.g. POL-99281-HVAC"
                    value={warrantyForm.policyNumber}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, policyNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Asset</label>
                  <select
                    value={warrantyForm.assetId}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, assetId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  >
                    <option value="">-- General / Entire Home --</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={warrantyForm.expiryDate}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Support Phone"
                  value={warrantyForm.contactPhone}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
                <input
                  type="email"
                  placeholder="Support Email"
                  value={warrantyForm.contactEmail}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Coverage Scope & Terms</label>
                <textarea
                  rows={2}
                  placeholder="Parts, compressor, labor, deductible..."
                  value={warrantyForm.coverageDetails}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, coverageDetails: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsWarrantyModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Warranty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
