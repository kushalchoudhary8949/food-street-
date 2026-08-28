import { Order } from '../types';

export const WHATSAPP_NUMBER = '918949508256';

export function generateWhatsAppOrderMessage(order: Order): string {
  const itemsText = order.items
    .map(
      (it) =>
        `• ${it.quantity}x ${it.name}${
          it.addons && it.addons.length > 0 ? ` (+${it.addons.join(', ')})` : ''
        } - ₹${(it.price * it.quantity).toFixed(0)}`
    )
    .join('\n');

  const paymentStatus =
    order.paymentMethod.toLowerCase().includes('cod') ||
    order.paymentMethod.toLowerCase().includes('cash')
      ? 'Cash on Delivery (Pending)'
      : 'Paid / Confirmed';

  const message = `🧾 *FOOD DELIVERY APP - ORDER RECEIPT*
━━━━━━━━━━━━━━━━━━━━
🆔 *Order ID:* ${order.orderNumber}
🏪 *Store:* ${order.store.name}
⏱️ *Status:* ${order.status.toUpperCase()}
🕒 *Placed At:* ${order.placedAt}

📋 *ORDER ITEMS:*
${itemsText}

━━━━━━━━━━━━━━━━━━━━
💵 *Item Total:* ₹${order.itemTotal.toFixed(0)}
🛵 *Delivery Fee:* ₹${order.deliveryFee.toFixed(0)}
🧾 *Taxes & Charges:* ₹${order.taxesAndCharges.toFixed(0)}
${order.tip > 0 ? `🤝 *Partner Tip:* ₹${order.tip.toFixed(0)}\n` : ''}💰 *GRAND TOTAL:* ₹${order.grandTotal.toFixed(0)}
━━━━━━━━━━━━━━━━━━━━
💳 *Payment Method:* ${order.paymentMethod}
📌 *Payment Status:* ${paymentStatus}

📍 *DELIVERY ADDRESS:*
${order.deliveryAddress}
${order.customerPhone ? `📞 *Customer Phone:* ${order.customerPhone}\n` : ''}
🛵 *Delivery Partner:* ${order.driverPhone || '9366265129'}
☎️ *Support & Contact:* 7682890864

━━━━━━━━━━━━━━━━━━━━
_Thank you for ordering with us!_`;

  return message;
}

export function getWhatsAppOrderUrl(order: Order, phoneNumber: string = WHATSAPP_NUMBER): string {
  const message = generateWhatsAppOrderMessage(order);
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

export function sendOrderToWhatsApp(order: Order, phoneNumber: string = WHATSAPP_NUMBER): void {
  const url = getWhatsAppOrderUrl(order, phoneNumber);
  window.open(url, '_blank');
}
