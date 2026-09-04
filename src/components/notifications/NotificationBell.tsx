import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  className?: string;
}

export function NotificationBell({
  unreadCount,
  onClick,
  className = '',
}: NotificationBellProps) {
  return (
    <button
      id="notification-bell-btn"
      onClick={onClick}
      type="button"
      className={`relative p-2.5 text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-slate-100 rounded-2xl border border-slate-200/80 transition-all duration-150 shadow-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 active:scale-95 ${className}`}
      aria-label={`Open notifications (${unreadCount} unread)`}
      title="Household Notifications"
    >
      <Bell className="w-5 h-5 text-slate-700" />
      {unreadCount > 0 && (
        <>
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold text-white bg-rose-500 rounded-full border-2 border-white shadow-xs flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping opacity-75 pointer-events-none" />
        </>
      )}
    </button>
  );
}
