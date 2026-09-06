export interface ContextualGreeting {
  greeting: string; // 'Good Morning' | 'Good Afternoon' | 'Good Evening' | 'Good Night'
  briefTitle: string; // 'Good Morning Brief' | 'Good Afternoon Brief' | 'Good Evening Brief' | 'Good Night Brief'
  shortBriefLabel: string; // 'Morning Brief' | 'Afternoon Brief' | 'Evening Brief' | 'Night Brief'
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  hour: number;
}

/**
 * Derives user-facing greeting and brief title based on configured timezone
 * with fallback to browser local timezone.
 */
export function getContextualGreeting(timezone?: string, targetDate: Date = new Date()): ContextualGreeting {
  let hour = targetDate.getHours();

  if (timezone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      });
      const parsed = parseInt(formatter.format(targetDate), 10);
      if (!isNaN(parsed)) {
        hour = parsed;
      }
    } catch {
      // Fallback to browser local timezone
      hour = targetDate.getHours();
    }
  }

  if (hour >= 5 && hour < 12) {
    return {
      greeting: 'Good Morning',
      briefTitle: 'Morning Brief',
      shortBriefLabel: 'Morning Brief',
      period: 'morning',
      hour,
    };
  } else if (hour >= 12 && hour < 17) {
    return {
      greeting: 'Good Afternoon',
      briefTitle: 'Afternoon Brief',
      shortBriefLabel: 'Afternoon Brief',
      period: 'afternoon',
      hour,
    };
  } else if (hour >= 17 && hour < 22) {
    return {
      greeting: 'Good Evening',
      briefTitle: 'Evening Brief',
      shortBriefLabel: 'Evening Brief',
      period: 'evening',
      hour,
    };
  } else {
    return {
      greeting: 'Good Night',
      briefTitle: 'Night Brief',
      shortBriefLabel: 'Night Brief',
      period: 'night',
      hour,
    };
  }
}
