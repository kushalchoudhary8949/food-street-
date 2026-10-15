export const WHATSAPP_NUMBER = '918949508256';
export const PHONEPE_UPI_URI = 'upi://pay?pa=foodza@upi&pn=FoodZa%20Delivery&cu=INR';
export const PAYMENT_UPI_ID = '8949508256@axl';

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
${order.offerDiscount && order.offerDiscount > 0 ? `🏷️ *Biriyani Zone Offer (10%):* -₹${Number(order.offerDiscount).toFixed(0)}\n` : ''}🧾 *Taxes & Charges:* ₹${Number(order.taxesAndCharges || 0).toFixed(0)}
${order.discount > 0 ? `🏷️ *Offer Discount:* -₹${Number(order.discount).toFixed(0)}\n` : ''}${order.tip > 0 ? `🤝 *Partner Tip:* ₹${Number(order.tip).toFixed(0)}\n` : ''}💰 *GRAND TOTAL:* ₹${Number(order.grandTotal || 0).toFixed(0)}
━━━━━━━━━━━━━━━━━━━━
${cancellationNote}📌 *PAYMENT COLLECTION DETAILS:*
🔗 *UPI ID:* 8949508256@axl

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
