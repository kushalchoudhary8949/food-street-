// Order window timing configuration and utility functions

export const SITE_CLOSED_DATE = '2026-10-02';

export const isSiteClosedForToday = (date: Date = new Date()): boolean => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` === SITE_CLOSED_DATE;
};

// Order window: 3:00 PM to 10:00 PM daily
const ORDER_WINDOW_START_HOUR = 15; // 3:00 PM
const ORDER_WINDOW_START_MINUTE = 0;
const ORDER_WINDOW_END_HOUR = 22; // 10:00 PM
const ORDER_WINDOW_END_MINUTE = 0; // 10:00 PM

export interface OrderWindowStatus {
  isOpen: boolean;
  isClosedForToday: boolean;
  message: string;
  opensAt: string;
  closesAt: string;
}

export const getOrderWindowStatus = (
  date: Date = new Date()
): OrderWindowStatus => {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const currentMinutes = hours * 60 + minutes;
  const startMinutes = ORDER_WINDOW_START_HOUR * 60 + ORDER_WINDOW_START_MINUTE;
  const endMinutes = ORDER_WINDOW_END_HOUR * 60 + ORDER_WINDOW_END_MINUTE;

  const isClosedForToday = isSiteClosedForToday(date);
  const isOpen = !isClosedForToday && currentMinutes >= startMinutes && currentMinutes < endMinutes;

  return {
    isOpen,
    isClosedForToday,
    message: isClosedForToday
      ? 'We are closed for today. Orders will reopen tomorrow at 3:00 PM.'
      : isOpen
        ? 'Orders are open until 10:00 PM'
        : 'Orders open at 3:00 PM',
    opensAt: '3:00 PM',
    closesAt: '10:00 PM',
  };
};

export const isOrderWindowOpen = (
  date: Date = new Date()
): boolean => {
  return getOrderWindowStatus(date).isOpen;
};

const GRADUATE_BIRYANI_START_MINUTES = 17 * 60;
const GRADUATE_BIRYANI_END_MINUTES = 22 * 60;
const GRADUATE_BIRYANI_SLOT_MINUTES = 30;
const GRADUATE_BIRYANI_DELIVERY_DELAY_MINUTES = 15;

const formatTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${suffix}`;
};

export const GRADUATE_BIRYANI_ORDER_SLOTS = Array.from(
  { length: (GRADUATE_BIRYANI_END_MINUTES - GRADUATE_BIRYANI_START_MINUTES) / GRADUATE_BIRYANI_SLOT_MINUTES },
  (_, index) => {
    const start = GRADUATE_BIRYANI_START_MINUTES + index * GRADUATE_BIRYANI_SLOT_MINUTES;
    const end = start + GRADUATE_BIRYANI_SLOT_MINUTES;
    const delivery = end + GRADUATE_BIRYANI_DELIVERY_DELAY_MINUTES;
    return {
      orderWindow: `${formatTime(start)} - ${formatTime(end)}`,
      deliveryTime: formatTime(delivery),
    };
  }
);

export interface GraduateBiryaniOrderWindowStatus {
  isOpen: boolean;
  message: string;
}

export const getGraduateBiryaniOrderWindowStatus = (
  date: Date = new Date()
): GraduateBiryaniOrderWindowStatus => {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const isOpen = currentMinutes >= GRADUATE_BIRYANI_START_MINUTES && currentMinutes < GRADUATE_BIRYANI_END_MINUTES;

  if (!isOpen) {
    return {
      isOpen: false,
      message: 'Graduate Biryani orders are available from 5:00 PM to 10:00 PM in 30-minute slots.',
    };
  }

  const slotStart = GRADUATE_BIRYANI_START_MINUTES + Math.floor((currentMinutes - GRADUATE_BIRYANI_START_MINUTES) / GRADUATE_BIRYANI_SLOT_MINUTES) * GRADUATE_BIRYANI_SLOT_MINUTES;
  const slotEnd = slotStart + GRADUATE_BIRYANI_SLOT_MINUTES;
  const deliveryTime = slotEnd + GRADUATE_BIRYANI_DELIVERY_DELAY_MINUTES;

  return {
    isOpen: true,
    message: `Current order window: ${formatTime(slotStart)} - ${formatTime(slotEnd)}. Delivery around ${formatTime(deliveryTime)}.`,
  };
};