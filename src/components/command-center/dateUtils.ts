export interface DateStatusResult {
  status: 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'future' | 'unknown';
  daysDiff: number;
  label: string;
  badgeClass: string;
  formattedDate: string;
}

export function getDateStatus(dateStr?: string | null): DateStatusResult {
  if (!dateStr) {
    return {
      status: 'unknown',
      daysDiff: 0,
      label: 'Unscheduled',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      formattedDate: 'Unscheduled',
    };
  }

  // Parse YYYY-MM-DD safely
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length < 3) {
    return {
      status: 'unknown',
      daysDiff: 0,
      label: dateStr,
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      formattedDate: dateStr,
    };
  }

  const targetYear = parseInt(parts[0], 10);
  const targetMonth = parseInt(parts[1], 10) - 1;
  const targetDay = parseInt(parts[2], 10);

  const targetDate = new Date(targetYear, targetMonth, targetDay);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = targetDate.getTime() - todayMidnight.getTime();
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${monthNames[targetMonth]} ${targetDay}, ${targetYear}`;

  if (daysDiff < 0) {
    const absDays = Math.abs(daysDiff);
    return {
      status: 'overdue',
      daysDiff,
      label: absDays === 1 ? '1 day overdue' : `${absDays} days overdue`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      formattedDate,
    };
  }

  if (daysDiff === 0) {
    return {
      status: 'due_today',
      daysDiff: 0,
      label: 'Due today',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold animate-pulse',
      formattedDate,
    };
  }

  if (daysDiff === 1) {
    return {
      status: 'due_soon',
      daysDiff: 1,
      label: 'Due tomorrow',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      formattedDate,
    };
  }

  if (daysDiff <= 7) {
    return {
      status: 'due_soon',
      daysDiff,
      label: `Due in ${daysDiff} days`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      formattedDate,
    };
  }

  if (daysDiff <= 30) {
    return {
      status: 'upcoming',
      daysDiff,
      label: `In ${daysDiff} days`,
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      formattedDate,
    };
  }

  return {
    status: 'future',
    daysDiff,
    label: `In ${daysDiff} days`,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    formattedDate,
  };
}

export function formatRelativeActivityTime(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}
