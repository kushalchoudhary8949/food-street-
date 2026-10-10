// Order window timing configuration and utility functions

export const OPEN_STORE_ID = 'store-biriyani-zone';
export const BITE_ADDA_STORE_ID = 'store-bite-adda';
const BIRIYANI_ZONE_START_HOUR = 12;
const BITE_ADDA_START_HOUR = 11;
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
  storeId?: string,
  date: Date = new Date()
): OrderWindowStatus => {
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const currentMinutes = hours * 60 + minutes;
  const isBiriyaniZone = storeId === OPEN_STORE_ID;
  const isBiteAdda = storeId === BITE_ADDA_STORE_ID;
  const isOrderableStore = isBiriyaniZone || isBiteAdda;
  const startHour = isBiriyaniZone ? BIRIYANI_ZONE_START_HOUR : BITE_ADDA_START_HOUR;
  const defaultStartMinutes = startHour * 60;
  const endMinutes = ORDER_WINDOW_END_HOUR * 60 + ORDER_WINDOW_END_MINUTE;
  const opensAt = isBiriyaniZone ? '12:00 PM' : '11:00 AM';
  const isOpen = isOrderableStore && currentMinutes >= defaultStartMinutes && currentMinutes < endMinutes;

  if (!isOrderableStore) {
    return {
      isOpen: false,
      isClosedForToday: true,
      message: 'Orders are not available for this store.',
      opensAt: 'Not available',
      closesAt: 'Not available',
    };
  }

  return {
    isOpen,
    isClosedForToday: false,
    message: isOpen ? 'Orders are open until 10:00 PM' : `Orders open at ${opensAt}`,
    opensAt,
    closesAt: '10:00 PM',
  };
};

export const isOrderWindowOpen = (
  storeId?: string,
  date: Date = new Date()
): boolean => {
  return getOrderWindowStatus(storeId, date).isOpen;
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