import { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Download,
  DollarSign,
  Wrench,
  Shield,
  FileText,
  CreditCard,
  Building,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  HouseholdCalendarEvent,
  HouseholdCalendarResponse,
  HouseholdCalendarEventType,
  HouseholdCalendarEventStatus,
} from '../../types';
import { api } from '../../lib/api';

interface CalendarViewProps {
  onNavigateTab: (tab: string, subTab?: string, entityId?: string) => void;
  onOpenNotifications?: () => void;
  onOpenNotificationPreferences?: () => void;
  addToast?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({
  onNavigateTab,
  onOpenNotifications,
  onOpenNotificationPreferences,
  addToast,
}: CalendarViewProps) {
  // Current active date view (defaults to today's year and month)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'month' | 'timeline'>('month');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<HouseholdCalendarEvent | null>(null);
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<HouseholdCalendarResponse | null>(null);

  // Compute boundaries for the calendar range
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Fetch events whenever month changes
  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      // Fetch 3 months window surrounding current view
      const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 2, 0).toISOString().slice(0, 10);

      const data = await api.getCalendarEvents({
        startDate: start,
        endDate: end,
      });
      setCalendarData(data);
    } catch (err: any) {
      console.error('Failed to load calendar events:', err);
      if (addToast) {
        addToast('error', 'Calendar Error', 'Could not load household calendar events.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [year, month]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDayIso(new Date().toISOString().slice(0, 10));
  };

  // Filter events based on active filters & search
  const filteredEvents = useMemo(() => {
    if (!calendarData?.events) return [];
    let list = calendarData.events;

    // Filter Category
    if (categoryFilter !== 'all') {
      list = list.filter((e) => {
        if (categoryFilter === 'bills') return e.eventType === 'expense' || e.eventType === 'utility';
        if (categoryFilter === 'maintenance') return e.eventType === 'maintenance';
        if (categoryFilter === 'loans_cards') return e.eventType === 'loan' || e.eventType === 'credit_card';
        if (categoryFilter === 'warranties') return e.eventType === 'warranty';
        if (categoryFilter === 'documents') return e.eventType === 'document';
        return e.eventType === categoryFilter;
      });
    }

    // Filter Status
    if (statusFilter !== 'all') {
      list = list.filter((e) => {
        if (statusFilter === 'overdue') return e.status === 'overdue';
        if (statusFilter === 'due_today') return e.status === 'due_today';
        if (statusFilter === 'due_soon') return e.status === 'due_soon';
        if (statusFilter === 'upcoming') return e.status === 'upcoming';
        if (statusFilter === 'completed') return e.status === 'completed' || e.status === 'paid';
        return true;
      });
    }

    // Filter Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.subtitle?.toLowerCase().includes(q) ||
          e.eventType.toLowerCase().includes(q) ||
          (e.amount && `$${e.amount}`.includes(q))
      );
    }

    return list;
  }, [calendarData, categoryFilter, statusFilter, searchQuery]);

  // Group events by Day for the Month Grid
  const eventsByDay = useMemo(() => {
    const map = new Map<string, HouseholdCalendarEvent[]>();
    for (const ev of filteredEvents) {
      const dayKey = ev.date;
      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey)!.push(ev);
    }
    return map;
  }, [filteredEvents]);

  // Calendar Grid Days Calculation
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayIso = new Date().toISOString().slice(0, 10);
    const cells = [];

    // Previous month filler cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const iso = prevDate.toISOString().slice(0, 10);
      cells.push({
        day: dayNum,
        iso,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        events: eventsByDay.get(iso) || [],
      });
    }

    // Current month cells
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const cellDate = new Date(year, month, day);
      const iso = cellDate.toISOString().slice(0, 10);
      cells.push({
        day,
        iso,
        isCurrentMonth: true,
        isToday: iso === todayIso,
        events: eventsByDay.get(iso) || [],
      });
    }

    // Next month filler cells to complete 35 or 42 grid
    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(year, month + 1, day);
      const iso = nextDate.toISOString().slice(0, 10);
      cells.push({
        day,
        iso,
        isCurrentMonth: false,
        isToday: iso === todayIso,
        events: eventsByDay.get(iso) || [],
      });
    }

    return cells;
  }, [year, month, eventsByDay]);

  // Get event color styling
  const getEventBadgeStyle = (eventType: HouseholdCalendarEventType, status: HouseholdCalendarEventStatus) => {
    if (status === 'overdue') {
      return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
    }
    if (status === 'due_today') {
      return 'bg-amber-50 text-amber-800 border-amber-300 font-bold hover:bg-amber-100';
    }
    if (status === 'completed' || status === 'paid') {
      return 'bg-slate-100 text-slate-500 border-slate-200 line-through opacity-70';
    }

    switch (eventType) {
      case 'expense':
      case 'utility':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
      case 'maintenance':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100';
      case 'loan':
      case 'credit_card':
        return 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100';
      case 'warranty':
        return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
      case 'document':
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100';
    }
  };

  const getEventCategoryIcon = (eventType: HouseholdCalendarEventType) => {
    switch (eventType) {
      case 'expense':
      case 'utility':
        return <DollarSign className="w-3.5 h-3.5" />;
      case 'maintenance':
        return <Wrench className="w-3.5 h-3.5" />;
      case 'loan':
      case 'credit_card':
        return <CreditCard className="w-3.5 h-3.5" />;
      case 'warranty':
        return <Shield className="w-3.5 h-3.5" />;
      case 'document':
      default:
        return <FileText className="w-3.5 h-3.5" />;
    }
  };

  // Export iCalendar (.ics) file
  const handleExportIcs = () => {
    if (!calendarData?.events || calendarData.events.length === 0) {
      if (addToast) addToast('info', 'No Events', 'There are no events to export.');
      return;
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HouseMind//Household Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:HouseMind Household Calendar',
    ];

    for (const ev of calendarData.events) {
      const dateParts = ev.date.split('-');
      if (dateParts.length < 3) continue;
      const dateStr = `${dateParts[0]}${dateParts[1]}${dateParts[2]}`;

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${ev.id}@housemind.local`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `SUMMARY:${ev.title.replace(/[,;]/g, ' ')}`,
        `DESCRIPTION:${(ev.subtitle || ev.eventType).replace(/[,;]/g, ' ')}${ev.amount ? ` - Amount: $${ev.amount}` : ''}`,
        `STATUS:${ev.status === 'completed' || ev.status === 'paid' ? 'COMPLETED' : 'CONFIRMED'}`,
        'END:VEVENT'
      );
    }

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `housemind-calendar-${year}-${pad(month + 1)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (addToast) {
      addToast('success', 'Calendar Exported', 'iCalendar file downloaded successfully.');
    }
  };

  // Selected Day's events
  const selectedDayEvents = selectedDayIso ? eventsByDay.get(selectedDayIso) || [] : [];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900">Household Calendar</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {calendarData?.totalCount || 0} Events
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Unified operational timeline of bills, upkeep schedules, warranties, and compliance deadlines
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Today Button */}
          <button
            onClick={handleToday}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            Today
          </button>

          {/* Month Steppers */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200/60">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 min-w-[120px] text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200/60">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Timeline View
            </button>
          </div>

          {/* iCal Export */}
          <button
            onClick={handleExportIcs}
            title="Download iCal (.ics) format"
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Refresh */}
          <button
            onClick={fetchEvents}
            disabled={isLoading}
            title="Refresh calendar"
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Filters & Search Strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          <button
            onClick={() => setCategoryFilter('bills')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              categoryFilter === 'bills'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Bills & Utilities
          </button>
          <button
            onClick={() => setCategoryFilter('maintenance')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              categoryFilter === 'maintenance'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Maintenance
          </button>
          <button
            onClick={() => setCategoryFilter('loans_cards')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              categoryFilter === 'loans_cards'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
            }`}
          >
            Loans & Cards
          </button>
          <button
            onClick={() => setCategoryFilter('warranties')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              categoryFilter === 'warranties'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Warranties
          </button>
          <button
            onClick={() => setCategoryFilter('documents')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
              categoryFilter === 'documents'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
            }`}
          >
            Documents
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search calendar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Display: Month View or Timeline View */}
      {viewMode === 'month' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Month Grid (3 cols on lg) */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-px mb-2 text-center">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-2 auto-rows-fr">
              {calendarGrid.map((cell) => {
                const isSelected = selectedDayIso === cell.iso;
                return (
                  <div
                    key={cell.iso}
                    onClick={() => {
                      setSelectedDayIso(cell.iso);
                      if (cell.events.length > 0 && !selectedEvent) {
                        setSelectedEvent(cell.events[0]);
                      }
                    }}
                    className={`min-h-[90px] sm:min-h-[110px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      cell.isCurrentMonth
                        ? isSelected
                          ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-xs'
                        : 'bg-slate-50/50 border-slate-100/50 opacity-40 hover:opacity-80'
                    } ${cell.isToday ? 'border-indigo-500 font-bold' : ''}`}
                  >
                    {/* Top Day Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs w-6 h-6 rounded-full flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-indigo-600 text-white font-bold'
                            : isSelected
                            ? 'bg-indigo-100 text-indigo-700 font-bold'
                            : 'text-slate-700 font-semibold'
                        }`}
                      >
                        {cell.day}
                      </span>

                      {cell.events.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                          {cell.events.length}
                        </span>
                      )}
                    </div>

                    {/* Event Chips List */}
                    <div className="mt-1.5 space-y-1 overflow-hidden">
                      {cell.events.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                            setSelectedDayIso(ev.date);
                          }}
                          className={`px-1.5 py-0.5 rounded-lg border text-[10px] font-medium truncate flex items-center gap-1 transition ${getEventBadgeStyle(
                            ev.eventType,
                            ev.status
                          )}`}
                          title={`${ev.title} (${ev.status})`}
                        >
                          {getEventCategoryIcon(ev.eventType)}
                          <span className="truncate">{ev.title}</span>
                          {ev.amount && <span className="shrink-0 font-bold">${ev.amount}</span>}
                        </div>
                      ))}

                      {cell.events.length > 2 && (
                        <div className="text-[9px] font-bold text-indigo-600 px-1 hover:underline">
                          +{cell.events.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar: Selected Day's Schedule & Quick Details (1 col on lg) */}
          <div className="space-y-4">
            {/* Selected Date Header */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedDayIso ? `Schedule for ${selectedDayIso}` : "Today's Agenda"}
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    No obligations due on this selected date.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {selectedDayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                        selectedEvent?.id === ev.id
                          ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                          : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 truncate">
                          {getEventCategoryIcon(ev.eventType)}
                          <span className="truncate">{ev.title}</span>
                        </div>
                        {ev.amount && (
                          <span className="text-xs font-bold text-emerald-700 shrink-0">
                            ${ev.amount.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate">
                        {ev.subtitle}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span className="capitalize font-semibold text-indigo-600">
                          {ev.eventType.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                            ev.status === 'overdue'
                              ? 'text-rose-600 bg-rose-50'
                              : ev.status === 'due_today'
                              ? 'text-amber-600 bg-amber-50'
                              : 'text-slate-600 bg-slate-100'
                          }`}
                        >
                          {ev.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Record Navigation Shortcuts */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quick Shortcuts
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => onNavigateTab('expenses', 'recurring')}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 text-slate-700 font-semibold transition text-left cursor-pointer flex items-center justify-between"
                >
                  <span>Add Expense</span>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => onNavigateTab('maintenance', 'tasks')}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 text-slate-700 font-semibold transition text-left cursor-pointer flex items-center justify-between"
                >
                  <span>Schedule Task</span>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => onNavigateTab('utilities', 'accounts')}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 text-slate-700 font-semibold transition text-left cursor-pointer flex items-center justify-between"
                >
                  <span>Manage Utilities</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => onNavigateTab('utilities', 'cards')}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 text-slate-700 font-semibold transition text-left cursor-pointer flex items-center justify-between"
                >
                  <span>Credit Cards</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Timeline View */
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              Upcoming Schedule Timeline ({filteredEvents.length} items)
            </h3>
            <span className="text-xs text-slate-500">Sorted chronologically</span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No scheduled events match your filter</h4>
              <p className="text-xs text-slate-500">Try changing the search query or category filters above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0 mt-0.5 text-slate-700">
                      {getEventCategoryIcon(ev.eventType)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{ev.title}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getEventBadgeStyle(
                            ev.eventType,
                            ev.status
                          )}`}
                        >
                          {ev.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{ev.subtitle}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {ev.formattedDate || ev.date}
                        </span>
                        <span>•</span>
                        <span className="capitalize text-slate-600">{ev.eventType.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    {ev.amount && (
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">${ev.amount.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">Payment Due</div>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateTab(ev.targetTab, ev.targetSubTab, ev.sourceId);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Record</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Event Detail Modal / Slideover */}
      {selectedEvent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  {getEventCategoryIcon(selectedEvent.eventType)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedEvent.title}</h3>
                  <p className="text-xs text-slate-500 capitalize">{selectedEvent.eventType.replace('_', ' ')} Record</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Summary Details */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Due / Scheduled Date:</span>
                  <span className="font-bold text-slate-800">{selectedEvent.formattedDate || selectedEvent.date}</span>
                </div>
                {selectedEvent.amount !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Amount:</span>
                    <span className="font-bold text-emerald-700 text-sm">${selectedEvent.amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="font-bold capitalize text-indigo-600">{selectedEvent.status.replace('_', ' ')}</span>
                </div>
                {selectedEvent.isAutoPay && (
                  <div className="flex items-center justify-between text-indigo-700">
                    <span className="font-medium">Auto-Pay:</span>
                    <span className="font-bold">Enabled</span>
                  </div>
                )}
              </div>

              {selectedEvent.subtitle && (
                <div className="p-3 rounded-2xl border border-slate-100 bg-white space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Details</div>
                  <p className="text-slate-700 leading-relaxed">{selectedEvent.subtitle}</p>
                </div>
              )}

              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div className="p-3 rounded-2xl border border-slate-100 bg-white space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Metadata</div>
                  <div className="space-y-1">
                    {Object.entries(selectedEvent.metadata).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-slate-600">
                        <span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                        <span className="font-semibold text-slate-800">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const ev = selectedEvent;
                  setSelectedEvent(null);
                  onNavigateTab(ev.targetTab, ev.targetSubTab, ev.sourceId);
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2"
              >
                <span>Navigate to Record</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
