// Order window timing configuration and utility functions
export const BIRIYANI_ZONE_STORE_ID = 'store-biriyani-zone';
export const OPEN_STORE_ID = BIRIYANI_ZONE_STORE_ID;
export const TUMMY_TREAT_STORE_ID = 'store-tummy-treat';
export const KFC_STORE_ID = 'store-kfc';
export const PIZZA_HUT_STORE_ID = 'store-pizzahut';
export const VAANGO_STORE_ID = 'store-vengo';
export const BITE_ADDA_STORE_ID = 'store-bite-adda';

// Stores permitted to have open order windows
export const ACTIVE_ORDER_STORE_IDS = new Set([
  BIRIYANI_ZONE_STORE_ID,
  TUMMY_TREAT_STORE_ID,
  KFC_STORE_ID,
  PIZZA_HUT_STORE_ID,
  VAANGO_STORE_ID,
  'store-vaango',
]);

// Special schedule date for today: October 15, 2026
export const SPECIAL_SCHEDULE_DATE = '2026-10-15';

export const isSpecialToday = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}` === SPECIAL_SCHEDULE_DATE;
};

export const getOrderWindowStatus = (storeId, date = new Date()) => {
  if (!storeId || !ACTIVE_ORDER_STORE_IDS.has(storeId)) {
    return {
      isOpen: false,
      isClosedForToday: true,
      message: 'Orders are closed for this store',
      opensAt: '',
      closesAt: '',
      timingLabel: 'Orders Closed',
      statusBadge: 'Orders Closed',
    };
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  let startMinutes;
  let endMinutes;
  let opensAt;
  let closesAt;
  let timingLabel;

  if (storeId === BIRIYANI_ZONE_STORE_ID) {
    // Biriyani Zone: 12:00 PM – 10:00 PM
    startMinutes = 12 * 60;
    endMinutes = 22 * 60;
    opensAt = '12:00 PM';
    closesAt = '10:00 PM';
    timingLabel = '12:00 PM – 10:00 PM';
  } else if (storeId === TUMMY_TREAT_STORE_ID) {
    // Tummy Treat: 11:00 AM – 10:00 PM
    startMinutes = 11 * 60;
    endMinutes = 22 * 60;
    opensAt = '11:00 AM';
    closesAt = '10:00 PM';
    timingLabel = '11:00 AM – 10:00 PM';
  } else {
    // KFC, Pizza Hut, Vaango
    if (isSpecialToday(date)) {
      // Today: 3:00 PM – 5:30 PM
      startMinutes = 15 * 60;
      endMinutes = 17 * 60 + 30;
      opensAt = '3:00 PM';
      closesAt = '5:30 PM';
      timingLabel = '3:00 PM – 5:30 PM (Today)';
    } else {
      // Rest of the days: 12:00 PM – 10:00 PM
      startMinutes = 12 * 60;
      endMinutes = 22 * 60;
      opensAt = '12:00 PM';
      closesAt = '10:00 PM';
      timingLabel = '12:00 PM – 10:00 PM';
    }
  }

  const isOpen = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  const isClosedForToday = currentMinutes >= endMinutes;

  const statusBadge = isOpen
    ? `Open until ${closesAt}`
    : isClosedForToday
      ? 'Orders Closed'
      : `Opens at ${opensAt}`;

  return {
    isOpen,
    isClosedForToday,
    message: isOpen
      ? `Orders are open until ${closesAt}`
      : isClosedForToday
        ? 'Orders are closed for today'
        : `Orders open at ${opensAt}`,
    opensAt,
    closesAt,
    timingLabel,
    statusBadge,
  };
};
export const isOrderWindowOpen = (storeId, date = new Date()) => {
    return getOrderWindowStatus(storeId, date).isOpen;
};
const GRADUATE_BIRYANI_START_MINUTES = 17 * 60;
const GRADUATE_BIRYANI_END_MINUTES = 22 * 60;
const GRADUATE_BIRYANI_SLOT_MINUTES = 30;
const GRADUATE_BIRYANI_DELIVERY_DELAY_MINUTES = 15;
const formatTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${suffix}`;
};
export const GRADUATE_BIRYANI_ORDER_SLOTS = Array.from({ length: (GRADUATE_BIRYANI_END_MINUTES - GRADUATE_BIRYANI_START_MINUTES) / GRADUATE_BIRYANI_SLOT_MINUTES }, (_, index) => {
    const start = GRADUATE_BIRYANI_START_MINUTES + index * GRADUATE_BIRYANI_SLOT_MINUTES;
    const end = start + GRADUATE_BIRYANI_SLOT_MINUTES;
    const delivery = end + GRADUATE_BIRYANI_DELIVERY_DELAY_MINUTES;
    return {
        orderWindow: `${formatTime(start)} - ${formatTime(end)}`,
        deliveryTime: formatTime(delivery),
    };
});
export const getGraduateBiryaniOrderWindowStatus = (date = new Date()) => {
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
