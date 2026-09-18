// Order window timing configuration and utility functions

// Do NOT block every day
export const BLOCK_ALL_ORDERS_TODAY = false;

// Only this date is blocked for the entire day
export const BLOCKED_DATES: string[] = [
  '2026-09-18',
];

export interface OrderWindowStatus {
  isOpen: boolean;
  message: string;
  bannerMessage: string;
  closedLabel: string;
  isBlockedDay: boolean;
}

export const getOrderWindowStatus = (
  date: Date = new Date()
): OrderWindowStatus => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const dateString = `${year}-${month}-${day}`;

  const closedLabel = 'Closed for today, resumes tomorrow';

  // Block orders for the entire blocked date
  if (BLOCKED_DATES.includes(dateString)) {
    return {
      isOpen: false,
      message: 'Closed for today, resumes tomorrow',
      bannerMessage: 'Closed for today, resumes tomorrow',
      closedLabel,
      isBlockedDay: true,
    };
  }

  // All other dates are open all day
  return {
    isOpen: true,
    message: 'Orders are open.',
    bannerMessage: 'Orders are open all day.',
    closedLabel,
    isBlockedDay: false,
  };
};

export const isOrderWindowOpen = (
  date: Date = new Date()
): boolean => {
  return getOrderWindowStatus(date).isOpen;
};