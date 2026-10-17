/**
 * Utility functions for Store Discounts & Minimum Order Value controls
 */

/**
 * Returns active discount details for a store, or null if no discount is configured/active.
 * Supports dynamic admin properties:
 * - discountActive: boolean
 * - discountAmount: number (e.g., 40, 50)
 * - minOrderValue: number (e.g., 150, 0 for no minimum)
 * - discountOffer: custom label string (optional)
 * 
 * Includes backward compatibility for default stores (KFC & Pizza Hut) unless explicitly disabled.
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
