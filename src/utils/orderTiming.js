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
  'store-ssv',
  'store-jawa-hut',
  'store-taj-biriyani',
  'store-baskinrobbins',
  'store-graduate-biryani',
]);

// Default timings for stores if not explicitly set in DB
export const DEFAULT_STORE_TIMINGS = {
  'store-biriyani-zone': { openTime: '12:00', closeTime: '22:00' },
  'store-kfc': { openTime: '12:00', closeTime: '22:00' },
  'store-pizzahut': { openTime: '12:00', closeTime: '22:00' },
  'store-vengo': { openTime: '12:00', closeTime: '22:00' },
  'store-vaango': { openTime: '12:00', closeTime: '22:00' },
  'store-tummy-treat': { openTime: '11:00', closeTime: '22:00' },
  'store-bite-adda': { openTime: '11:00', closeTime: '22:00' },
  'store-ssv': { openTime: '11:00', closeTime: '22:00' },
  'store-jawa-hut': { openTime: '11:00', closeTime: '22:00' },
  'store-baskinrobbins': { openTime: '11:00', closeTime: '23:00' },
  'store-taj-biriyani': { openTime: '12:00', closeTime: '22:00' },
  'store-graduate-biryani': { openTime: '17:00', closeTime: '22:00' },
};

// Generic fallback timing: 11:00 AM - 10:00 PM
export const GENERIC_DEFAULT_TIMINGS = { openTime: '11:00', closeTime: '22:00' };

/**
 * Parses time string like "12:00", "12:00 PM", "9:30 AM", "21:00" into minutes from midnight (0 - 1439).
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

/**
 * Formats total minutes from midnight into 12-hour format string, e.g. "12:00 PM"
 */
export const formatMinutesTo12Hour = (totalMinutes) => {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes)) return '';
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${suffix}`;
};

/**
 * Formats time string (24h or 12h) into 12-hour format string, e.g. "12:00" -> "12:00 PM"
 */
export const formatTimeTo12Hour = (timeStr, fallback = '') => {
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return fallback;
  return formatMinutesTo12Hour(mins);
};

// Cache of loaded stores to check timings and manual admin status
let storesCache = [];

export const setStoreStatusCache = (storesList) => {
  if (Array.isArray(storesList)) {
    storesCache = storesList;
  }
};

/**
 * Resolves a store object from either store object, ID string, cache, or localStorage.
 */
export const findStore = (storeOrId, storeObj) => {
  if (storeObj && typeof storeObj === 'object') return storeObj;
  if (storeOrId && typeof storeOrId === 'object') return storeOrId;
  const id = typeof storeOrId === 'string' ? storeOrId : null;
  if (!id) return null;

  // 1. Check in-memory stores cache
  const found = storesCache.find((s) => s && (s.id === id || s._id === id));
  if (found) return found;

  // 2. Check localStorage
  try {
    const raw = localStorage.getItem('food_street_stores');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        storesCache = parsed;
        return parsed.find((s) => s && (s.id === id || s._id === id));
      }
    }
  } catch (e) {}

  return null;
};

export const getStoreManualOverride = (storeId) => {
  if (!storeId) return null;
  // 1. Check in-memory stores cache
  const found = storesCache.find((s) => s && s.id === storeId);
  if (found && found.isOpen !== undefined && found.isOpen !== 'auto') {
    return found.isOpen === true || found.isOpen === 'open' ? 'open' : 'closed';
  }
  // 2. Check localStorage override
  try {
    const val = localStorage.getItem(`store_status_${storeId}`);
    if (val === 'open' || val === 'closed') {
      return val;
    }
  } catch (e) {}
  return null;
};

/**
 * Gets the configured open/close timings for a store from DB data or defaults.
 */
export const getStoreTimings = (storeOrId, storeObj) => {
  const store = findStore(storeOrId, storeObj);
  const storeId = store?.id || (typeof storeOrId === 'string' ? storeOrId : '');
  const defaults = DEFAULT_STORE_TIMINGS[storeId] || GENERIC_DEFAULT_TIMINGS;

  const openTime = store?.openTime || defaults.openTime;
  const closeTime = store?.closeTime || defaults.closeTime;

  const startMinutes = parseTimeToMinutes(openTime) ?? 12 * 60;
  const endMinutes = parseTimeToMinutes(closeTime) ?? 22 * 60;

  const opensAt = formatMinutesTo12Hour(startMinutes);
  const closesAt = formatMinutesTo12Hour(endMinutes);

  return {
    openTime,
    closeTime,
    startMinutes,
    endMinutes,
    opensAt,
    closesAt,
    timingLabel: `${opensAt} – ${closesAt}`,
  };
};

/**
 * Computes live order window status using database timings & admin controls.
 */
export const getOrderWindowStatus = (storeOrId, date = new Date(), storeObj) => {
  const store = findStore(storeOrId, storeObj);
  const storeId = store?.id || (typeof storeOrId === 'string' ? storeOrId : '');

  // Check for admin manual open/close override
  const manual = (store && store.isOpen !== undefined && store.isOpen !== 'auto')
    ? (store.isOpen === true || store.isOpen === 'open' ? 'open' : 'closed')
    : getStoreManualOverride(storeId);

  if (manual === 'open') {
    const timings = getStoreTimings(store, storeObj);
    return {
      isOpen: true,
      isClosedForToday: false,
      message: 'Store is Open for Orders (Admin Open)',
      opensAt: 'Now',
      closesAt: timings.closesAt || 'Open',
      timingLabel: `Open for Orders (${timings.timingLabel})`,
      statusBadge: 'Open Now',
    };
  }

  if (manual === 'closed') {
    return {
      isOpen: false,
      isClosedForToday: true,
      message: 'Store is temporarily closed for orders',
      opensAt: '',
      closesAt: '',
      timingLabel: 'Store Closed',
      statusBadge: 'Store Closed',
    };
  }

  // Fetch timings from store object (from database)
  const timings = getStoreTimings(store, storeObj);
  const { startMinutes, endMinutes, opensAt, closesAt, timingLabel } = timings;

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  let isOpen = false;
  let isClosedForToday = false;

  if (startMinutes <= endMinutes) {
    // Standard daytime schedule (e.g. 12:00 to 22:00)
    isOpen = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    isClosedForToday = currentMinutes >= endMinutes;
  } else {
    // Overnight schedule (e.g. 18:00 to 02:00)
    isOpen = currentMinutes >= startMinutes || currentMinutes < endMinutes;
    isClosedForToday = currentMinutes >= endMinutes && currentMinutes < startMinutes;
  }

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

export const getGraduateBiryaniOrderWindowStatus = (date = new Date()) => {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const isOpen = currentMinutes >= GRADUATE_BIRYANI_START_MINUTES && currentMinutes < GRADUATE_BIRYANI_END_MINUTES;
  if (!isOpen) {
    return {
      isOpen: false,
      message: 'Graduate Biryani orders are available from 5:00 PM to 10:00 PM in 30-minute slots.',
    };
  }
  const slotStart =
    GRADUATE_BIRYANI_START_MINUTES +
    Math.floor((currentMinutes - GRADUATE_BIRYANI_START_MINUTES) / GRADUATE_BIRYANI_SLOT_MINUTES) *
      GRADUATE_BIRYANI_SLOT_MINUTES;
  const slotEnd = slotStart + GRADUATE_BIRYANI_SLOT_MINUTES;
  const deliveryTime = slotEnd + GRADUATE_BIRYANI_DELIVERY_DELAY_MINUTES;
  return {
    isOpen: true,
    message: `Current order window: ${formatTime(slotStart)} - ${formatTime(slotEnd)}. Delivery around ${formatTime(deliveryTime)}.`,
  };
};
