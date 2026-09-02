import { useState } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  Check,
  Trash2,
  SlidersHorizontal,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Wrench,
  DollarSign,
  FileText,
  CreditCard,
  Zap,
  Sparkles,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { HouseholdNotification, HouseholdNotificationCategory } from '../../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: HouseholdNotification[];
  unreadCount: number;
  isLoading?: boolean;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onRefresh: () => void;
  onOpenPreferences: () => void;
  onNavigateToSource: (tab: string, subTab?: string, sourceId?: string) => void;
}

export function NotificationCenterModal({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  isLoading = false,
  onMarkRead,
  onMarkUnread,
  onMarkAllRead,
  onDismiss,
  onRefresh,
  onOpenPreferences,
  onNavigateToSource,
}: NotificationCenterModalProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'unread') return !n.isRead;
    if (filterCategory === 'critical') return n.priority === 'critical';
    return n.category === filterCategory;
  });

  const getCategoryIcon = (category: HouseholdNotificationCategory) => {
    switch (category) {
      case 'bills_payments':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-indigo-600" />;
      case 'warranties':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      case 'documents':
        return <FileText className="w-4 h-4 text-sky-600" />;
      case 'alerts':
      default:
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
            Critical
          </span>
        );
      case 'important':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            Important
          </span>
        );
      case 'upcoming':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            Upcoming
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-center-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white min-w-[18px] text-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="notif-center-title" className="text-xl font-bold text-slate-900">
                  Household Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Actionable household obligations, service schedules, and expiring policies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh notifications"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={onOpenPreferences}
              title="Notification preferences"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close notification center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>

            {unreadCount > 0 && (
              <button
                onClick={() => setFilterCategory('unread')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                  filterCategory === 'unread'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                Unread ({unreadCount})
              </button>
            )}

            <button
              onClick={() => setFilterCategory('bills_payments')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                filterCategory === 'bills_payments'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bills
            </button>

            <button
              onClick={() => setFilterCategory('maintenance')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                filterCategory === 'maintenance'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Maintenance
            </button>

            <button
              onClick={() => setFilterCategory('warranties')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                filterCategory === 'warranties'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Warranties
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Notifications Feed */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {isLoading && notifications.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Checking active obligations...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">You're all caught up!</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  {filterCategory === 'unread'
                    ? 'No unread notifications. Everything is in order.'
                    : 'No pending household notifications in this category.'}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border transition relative group flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                  notif.isRead
                    ? 'bg-white border-slate-100 hover:border-slate-200'
                    : 'bg-indigo-50/40 border-indigo-100/80 shadow-xs'
                }`}
              >
                {/* Left: Icon & Text */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(notif.category)}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`text-sm font-semibold truncate ${notif.isRead ? 'text-slate-800' : 'text-slate-900 font-bold'}`}>
                        {notif.title}
                      </h4>
                      {getPriorityBadge(notif.priority)}
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.dueDate && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Due: {notif.dueDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <button
                    onClick={() => {
                      onMarkRead(notif.id);
                      onNavigateToSource(notif.targetTab, notif.targetSubTab, notif.sourceId);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <span>{notif.actionLabel || 'View Record'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {notif.isRead ? (
                      <button
                        onClick={() => onMarkUnread(notif.id)}
                        title="Mark as unread"
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition text-[11px] cursor-pointer"
                      >
                        Mark unread
                      </button>
                    ) : (
                      <button
                        onClick={() => onMarkRead(notif.id)}
                        title="Mark as read"
                        className="p-1.5 text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 transition text-[11px] font-semibold cursor-pointer"
                      >
                        Mark read
                      </button>
                    )}

                    <button
                      onClick={() => onDismiss(notif.id)}
                      title="Dismiss notification"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Deterministic real-time alerts derived from your household records</span>
          </div>

          <button
            onClick={onOpenPreferences}
            className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
          >
            Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
