/**
 * ============================================================================
 * STORE DISCOUNTS & PROMOTIONAL OFFERS SERVICE (`discount.js`)
 * ============================================================================
 * 
 * ROLE IN CODEBASE:
 * Manages store-level discount configurations, minimum order thresholds, customer-facing
 * promotional badges, and cart checkout deduction computations.
 * 
 * KEY FEATURES:
 * 1. Admin-Configured Dynamic Discounts:
 *    - `discountActive`: Boolean flag toggling discount status on/off.
 *    - `discountAmount`: Value in ₹ deducted from cart item total (e.g., 40, 50).
 *    - `minOrderValue`: Minimum order subtotal required to qualify for the discount.
 * 2. Automatic Discount Evaluation:
 *    - Automatically calculates whether a given cart total qualifies for a discount.
 *    - Produces user-friendly labels (e.g. "₹40 OFF above ₹150", "Flat ₹50 OFF").
 * 3. Backward Compatibility:
 *    - Supports legacy default discounts for flagship stores (e.g. KFC & Pizza Hut)
 *      unless explicitly disabled by an admin.
 * 
 * RELATED MODULES:
 * - `src/components/AdminTab.js`: Admin discounts manager sub-tab & store edit modals.
 * - `src/components/CartDrawer.js`: Applies discount during checkout grand total calculation.
 * - `src/components/StoreCard.js`: Renders active discount tags on the home feed.
 * - `src/components/SearchTab.js`: Displays discount badges in search results.
 * - `src/utils/whatsapp.js`: Includes discount deduction in the formatted WhatsApp receipt.
 * ============================================================================
 */

/**
 * Returns active discount details for a store, or null if no discount is configured/active.
 * 
 * @param {Object} store - The store data object.
 * @param {boolean} [store.discountActive] - Whether the discount is enabled.
 * @param {number} [store.discountAmount] - Discount amount in INR.
 * @param {number} [store.minOrderValue] - Minimum cart subtotal in INR.
 * @param {string} [store.discountOffer] - Optional custom promotional badge text.
 * @returns {Object|null} Object containing { active, amount, minOrder, label, description, couponCode } or null.
 */
export function getStoreDiscount(store) {
  if (!store) return null;

  // 1. Explicitly disabled by admin
  if (store.discountActive === false) {
    return null;
  }

  const amount = Number(store.discountAmount || 0);
  const minOrder = Number(store.minOrderValue || 0);

  // 2. Explicitly enabled by admin or has a configured discount amount > 0
  if (store.discountActive === true && amount > 0) {
    const label = minOrder > 0 ? `₹${amount} OFF above ₹${minOrder}` : `Flat ₹${amount} OFF`;
    const description = minOrder > 0
      ? `Applies automatically on orders of ₹${minOrder} and above`
      : `Applies automatically on all orders`;
    return {
      active: true,
      amount,
      minOrder,
      label: store.discountOffer || label,
      description,
      couponCode: `SAVE${amount}`,
    };
  }

  if (store.discountActive === undefined && amount > 0) {
    const label = minOrder > 0 ? `₹${amount} OFF above ₹${minOrder}` : `Flat ₹${amount} OFF`;
    const description = minOrder > 0
      ? `Applies automatically on orders of ₹${minOrder} and above`
      : `Applies automatically on all orders`;
    return {
      active: true,
      amount,
      minOrder,
      label: store.discountOffer || label,
      description,
      couponCode: `SAVE${amount}`,
    };
  }

  // 3. Backward compatibility for legacy default discount stores
  const id = String(store.id || '').toLowerCase();
  const name = String(store.name || '').toLowerCase();
  const isLegacySpecial =
    id === 'store-kfc' ||
    id === 'store-pizzahut' ||
    name.includes('kfc') ||
    name.includes('pizza hut');

  if (isLegacySpecial && store.discountActive !== false) {
    return {
      active: true,
      amount: 40,
      minOrder: 150,
      label: '₹40 OFF above ₹150',
      description: 'Applies automatically on orders of ₹150 and above',
      couponCode: 'STORE40',
    };
  }

  return null;
}

/**
 * Format human-readable discount badge text
 */
export function formatDiscountLabel(amount, minOrder) {
  const amt = Number(amount || 0);
  const min = Number(minOrder || 0);
  if (amt <= 0) return 'No Discount';
  if (min > 0) {
    return `₹${amt} OFF above ₹${min}`;
  }
  return `Flat ₹${amt} OFF`;
}
