// Order window timing configuration and utility functions

// Order window: 3:00 PM to 10:00 PM daily
const ORDER_WINDOW_START_HOUR = 15; // 3:00 PM
const ORDER_WINDOW_START_MINUTE = 0;
const ORDER_WINDOW_END_HOUR = 22; // 10:00 PM
const ORDER_WINDOW_END_MINUTE = 0; // 10:00 PM

export interface OrderWindowStatus {
  isOpen: boolean;
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

  const isOpen = currentMinutes >= startMinutes && currentMinutes < endMinutes;

  return {
    isOpen,
    message: isOpen
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