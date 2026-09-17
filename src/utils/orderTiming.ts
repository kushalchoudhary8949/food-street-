// Order window timing configuration and utility functions

// Blocked dates in YYYY-MM-DD format where orders are blocked 00:00 to 23:59
export const BLOCKED_DATES: string[] = [
  '2026-09-19', // Tomorrow's date blocked from 00:00 to 23:59
];

export interface OrderWindowStatus {
  isOpen: boolean;
  message: string;
  bannerMessage: string;
  closedLabel: string;
  isBlockedDay: boolean;
}

export const getOrderWindowStatus = (date: Date = new Date()): OrderWindowStatus => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  const closedLabel = 'Closed for today, resumes tomorrow';

  // Check if date is in blocked dates (blocked 00:00 to 23:59)
  if (BLOCKED_DATES.includes(dateString)) {
    return {
      isOpen: false,
      message: 'Closed for today, resumes tomorrow.',
      bannerMessage: '⚠️ Orders are blocked today (00:00 AM - 11:59 PM). We will resume regular timings tomorrow.',
      closedLabel,
      isBlockedDay: true,
    };
  }

  // Check if tomorrow is a blocked date to inform users in advance
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowYear = tomorrow.getFullYear();
  const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowDateString = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;
  const isTomorrowBlocked = BLOCKED_DATES.includes(tomorrowDateString);

  const minutesSinceMidnight = date.getHours() * 60 + date.getMinutes();
  const isOpen = minutesSinceMidnight >= 12 * 60 && minutesSinceMidnight < 22 * 60 + 30;

  const defaultBanner = !isOpen
    ? '⚠️ Closed for today, resumes tomorrow (Daily ordering window: 12:00 PM to 10:30 PM).'
    : isTomorrowBlocked
    ? 'Orders are open today from 12:00 PM to 10:30 PM. (Note: Closed tomorrow from 00:00 AM to 11:59 PM)'
    : 'Orders are open daily from 12:00 PM to 10:30 PM.';

  return {
    isOpen,
    message: isOpen ? 'Orders are open.' : 'Closed for today, resumes tomorrow.',
    bannerMessage: defaultBanner,
    closedLabel,
    isBlockedDay: false,
  };
};

export const isOrderWindowOpen = (date: Date = new Date()): boolean => {
  return getOrderWindowStatus(date).isOpen;
};

