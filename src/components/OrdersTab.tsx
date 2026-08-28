import React from 'react';
import { ShoppingBag, MapPin, CheckCircle2, MessageCircle, ArrowUpRight } from 'lucide-react';
import { Order, Store } from '../types';
import { sendOrderToWhatsApp } from '../utils/whatsapp';

interface OrdersTabProps {
  orders: Order[];
  stores: Store[];
  onCompleteOrder: (orderId: string) => void;
  onExploreFood: () => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  onCompleteOrder,
  onExploreFood,
}) => {
  return (
    <div className="space-y-6 px-4 py-4 pb-28 max-w-2xl mx-auto">
      <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Your Placed Orders</h2>
          <p className="text-xs text-gray-500 mt-0.5">Currently active and placed orders</p>
        </div>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          WhatsApp: 8949508256
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">No active orders</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
              You don't have any placed orders right now. Treat yourself with meals from our featured restaurants!
            </p>
          </div>
          <button
            onClick={onExploreFood}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            Explore Restaurants
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              id={`active-order-${order.id}`}
              className="bg-white rounded-3xl p-5 border border-red-200 shadow-sm space-y-4 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={order.store.image}
                    alt={order.store.name}
                    className="w-12 h-12 rounded-2xl object-cover"
                  />
                  <div>
                    <h4 className="text-base font-extrabold text-gray-900">{order.store.name}</h4>
                    <div className="flex items-center space-x-2 text-xs text-gray-400 font-medium">
                      <span>{order.placedAt}</span>
                      <span>•</span>
                      <span className="font-semibold text-gray-700">{order.orderNumber}</span>
                    </div>
                  </div>
                </div>

                <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold capitalize">
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              {/* Items summary */}
              <div className="bg-gray-50 rounded-2xl p-3 text-xs space-y-1">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-gray-700">
                    <span>{it.quantity}x {it.name}</span>
                    <span className="font-semibold">₹{(it.price * it.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Order meta & Actions */}
              <div className="text-xs text-gray-600 border-t border-gray-100 pt-3 flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-gray-500">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate max-w-[220px]">{order.deliveryAddress}</span>
                  </span>
                  <span className="font-extrabold text-gray-900 text-sm">Total: ₹{order.grandTotal.toFixed(0)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* WhatsApp Forward Button */}
                  <button
                    onClick={() => sendOrderToWhatsApp(order)}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs active:scale-98"
                    title="Send Order Details to WhatsApp (+91 8949508256)"
                  >
                    <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                    <span>Send to WhatsApp</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Complete Order button */}
                  <button
                    onClick={() => onCompleteOrder(order.id)}
                    className="py-2.5 px-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-xs active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Mark Completed</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
