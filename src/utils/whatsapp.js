/**
 * ============================================================================
 * WHATSAPP ORDER DISPATCH & RECEIPT FORMATTER (`whatsapp.js`)
 * ============================================================================
 * 
 * ROLE IN CODEBASE:
 * Formats placed customer orders into a clean, human-readable WhatsApp receipt
 * and generates deep-links (`https://wa.me/...`) to send orders directly to the
 * operations team/store dispatch WhatsApp number.
 * 
 * KEY RESPONSIBILITIES:
 * 1. Receipt Formatting: Builds structured text including Order ID, date/time,
 *    line-item quantities, veg/non-veg tags, platform fees, discounts, tips,
 *    grand total, customer contact number, and hostel room delivery address.
 * 2. UPI Payment Integration: Embeds official UPI ID (`9180468256@axl`) for easy
 *    payment verification by dispatch staff.
 * 3. Deep Linking: Constructs URI-encoded WhatsApp links (`wa.me`) for instant
 *    browser redirection or mobile app handoff.
 * 
 * RELATED MODULES:
 * - `src/components/CartDrawer.js`: Invokes `sendOrderToWhatsApp` on checkout submission.
 * - `src/components/OrdersTab.js`: Allows customers to re-send or view order receipts.
 * - `src/App.js`: Coordinates checkout and pending order dispatches.
 * ============================================================================
 */

export const WHATSAPP_NUMBER = '919180468256';
export const DISPLAY_PHONE_NUMBER = '9180468256';
export const PHONEPE_UPI_URI = 'upi://pay?pa=foodza@upi&pn=FoodZa%20Delivery&cu=INR';
export const PAYMENT_UPI_ID = '9180468256@axl';

/**
 * Builds a markdown-formatted WhatsApp message representing the full order receipt.
 * 
 * @param {Object} order - The normalized order object.
 * @returns {string} Formatted WhatsApp text receipt with emojis and structured fields.
 */
export function generateWhatsAppOrderMessage(order) {
    const orderId = order.orderNumber
        ? (order.orderNumber.startsWith('#') ? order.orderNumber : `#${order.orderNumber}`)
        : (order.id ? (order.id.startsWith('#') ? order.id : `#${order.id}`) : `#FD-${Date.now().toString().slice(-5)}`);
    const formattedDate = order.placedAt && order.placedAt !== 'Just now'
        ? order.placedAt
        : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

    const itemsText = (order.items || [])
        .map((it) => `• ${it.quantity}x ${it.name}${it.addons && it.addons.length > 0 ? ` (+${it.addons.join(', ')})` : ''} ${it.isVeg ? '(Veg)' : '(Non-Veg)'} - ₹${(it.price * it.quantity).toFixed(0)}`)
        .join('\n');
    const cancellationNote = order.cancellationConfirmed
        ? '⚠️ *Cancellation Policy:* This order cannot be cancelled after it is placed.\n'
        : '';
    const message = `🧾 *FOODZA - OFFICIAL ORDER RECEIPT*
━━━━━━━━━━━━━━━━━━━━
🆔 *Order ID:* ${orderId}
📅 *Date & Time:* ${formattedDate}
🏪 *Store:* ${order.store?.name || 'Store'}

📋 *ORDER ITEMS:*
${itemsText}

━━━━━━━━━━━━━━━━━━━━
💵 *Item Total:* ₹${Number(order.itemTotal || 0).toFixed(0)}
💼 *Platform Fee:* ₹${Number(order.deliveryFee || 0).toFixed(0)}
🧾 *Taxes & Charges:* ₹${Number(order.taxesAndCharges || 0).toFixed(0)}
${(order.discount > 0 || order.offerDiscount > 0) ? `🏷️ *Store Offer Discount:* -₹${Number(order.discount || order.offerDiscount).toFixed(0)}\n` : ''}${order.tip > 0 ? `🤝 *Partner Tip:* ₹${Number(order.tip).toFixed(0)}\n` : ''}💰 *GRAND TOTAL:* ₹${Number(order.grandTotal || 0).toFixed(0)}
━━━━━━━━━━━━━━━━━━━━
${cancellationNote}📌 *PAYMENT COLLECTION DETAILS:*
🔗 *UPI ID:* ${PAYMENT_UPI_ID}

📍 *DELIVERY ADDRESS:*
${order.deliveryAddress || 'Not specified'}
${order.customerPhone ? `📞 *Customer Phone:* ${order.customerPhone}\n` : ''}
━━━━━━━━━━━━━━━━━━━━
_Thank you for ordering with FoodZa!_`;
    return message;
}

export function getWhatsAppOrderUrl(order, phoneNumber = WHATSAPP_NUMBER) {
    const cleanNumber = String(phoneNumber).replace(/\D/g, '');
    const message = generateWhatsAppOrderMessage(order);
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

export function sendOrderToWhatsApp(order, phoneNumber = WHATSAPP_NUMBER) {
    const url = getWhatsAppOrderUrl(order, phoneNumber);
    window.open(url, '_blank');
}
