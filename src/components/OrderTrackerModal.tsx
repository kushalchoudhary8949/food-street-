import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Phone, MessageSquare, Clock, MapPin, Bike, ChevronRight, Navigation, MessageCircle } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { sendOrderToWhatsApp } from '../utils/whatsapp';

interface OrderTrackerModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onAdvanceStatus?: (orderId: string, nextStatus: OrderStatus) => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  order,
  isOpen,
  onClose,
  onAdvanceStatus,
}) => {
  const [currentStep, setCurrentStep] = useState<OrderStatus>('cooking');

  useEffect(() => {
    if (order) {
      setCurrentStep(order.status);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const steps: { key: OrderStatus; label: string; sub: string }[] = [
    { key: 'confirmed', label: 'Order Confirmed', sub: 'Restaurant accepted your order' },
    { key: 'cooking', label: 'Preparing Food', sub: 'Chef is cooking your fresh meal' },
    { key: 'out_for_delivery', label: 'Out for Delivery', sub: 'Rider is on the way to your door' },
    { key: 'delivered', label: 'Delivered', sub: 'Enjoy your meal!' },
  ];

  const getStepIndex = (st: OrderStatus) => {
    switch (st) {
      case 'placed':
      case 'confirmed': return 0;
      case 'cooking': return 1;
      case 'out_for_delivery': return 2;
      case 'delivered': return 3;
    }
  };

  const activeIndex = getStepIndex(currentStep);

  const simulateNextStep = () => {
    let next: OrderStatus = 'delivered';
    if (currentStep === 'confirmed') next = 'cooking';
    else if (currentStep === 'cooking') next = 'out_for_delivery';
    else if (currentStep === 'out_for_delivery') next = 'delivered';
    setCurrentStep(next);
    if (onAdvanceStatus) {
      onAdvanceStatus(order.id, next);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-red-600">
                Live Tracking
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs font-semibold text-gray-600">{order.orderNumber}</span>
            </div>
            <h3 className="text-lg font-black text-gray-900">{order.store.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/60">
          {/* Animated Delivery ETA Card */}
          <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-red-100 uppercase tracking-wider">
                    {currentStep === 'delivered' ? 'Order Completed' : 'Estimated Delivery'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black mt-0.5">
                    {currentStep === 'delivered' ? 'Delivered' : '15 - 20 Mins'}
                  </h2>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-red-100">
                <span>Arriving at: <strong>{order.deliveryAddress.split(',')[0]}</strong></span>
                <span className="bg-white/20 px-2.5 py-1 rounded-full font-bold">On Time</span>
              </div>
            </div>
          </div>

          {/* Interactive Map Visual Simulator */}
          <div className="relative w-full h-44 rounded-3xl overflow-hidden border border-gray-200 bg-emerald-50/40 shadow-xs">
            {/* Road network styling */}
            <svg className="w-full h-full absolute inset-0 opacity-40" xmlns="http://www.w3.org/2000/svg">
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#CBD5E1" strokeWidth="1" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
              {/* Route line */}
              <path
                d="M 40 120 Q 150 40 280 90 T 420 50"
                fill="none"
                stroke="#E11D48"
                strokeWidth="4"
                strokeDasharray="6 6"
                className="animate-pulse"
              />
            </svg>

            {/* Restaurant Pin */}
            <div className="absolute left-6 top-20 flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-white shadow-md border-2 border-red-500 flex items-center justify-center p-0.5">
                <img src={order.store.image} alt="Store" className="w-full h-full rounded-full object-cover" />
              </div>
              <span className="text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded-md mt-1 shadow-xs text-gray-800">
                {order.store.name}
              </span>
            </div>

            {/* Delivery Rider Pin */}
            <div className="absolute left-1/2 top-12 -translate-x-1/2 flex flex-col items-center animate-bounce">
              <div className="w-10 h-10 rounded-full bg-red-600 text-white shadow-lg flex items-center justify-center border-2 border-white">
                <Bike className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded-full mt-1 shadow-xs">
                Rider
              </span>
            </div>

            {/* Destination Pin */}
            <div className="absolute right-6 top-8 flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-gray-900 text-white shadow-md flex items-center justify-center border-2 border-white">
                <MapPin className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded-md mt-1 shadow-xs text-gray-800">
                Your Location
              </span>
            </div>

            {/* Live Navigation CTA Button */}
            <div className="absolute bottom-2.5 right-2.5 z-20">
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(order.store.name)}&destination=${encodeURIComponent(order.deliveryAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-900 rounded-xl shadow-md text-xs font-bold border border-gray-100 transition-all hover:scale-105 active:scale-95"
                title="Open live navigation in Google Maps"
              >
                <Navigation className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                <span>Navigate</span>
              </a>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Order Progress</h4>
            <div className="space-y-4 relative">
              {steps.map((st, idx) => {
                const isCompleted = idx <= activeIndex;
                const isCurrent = idx === activeIndex;
                return (
                  <div key={st.key} className="flex items-start space-x-3.5 relative">
                    {/* Connecting line */}
                    {idx < steps.length - 1 && (
                      <div
                        className={`absolute left-[13px] top-[26px] bottom-[-16px] w-0.5 transition-colors ${
                          idx < activeIndex ? 'bg-red-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                    {/* Circle Node */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all z-10 ${
                        isCompleted
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                    </div>
                    {/* Label & Description */}
                    <div>
                      <h5 className={`text-sm font-bold leading-tight ${isCurrent ? 'text-red-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                        {st.label}
                      </h5>
                      <p className="text-xs text-gray-500 mt-0.5">{st.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Advance Simulation Step Button */}
            {currentStep !== 'delivered' && (
              <button
                onClick={simulateNextStep}
                className="w-full mt-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1"
              >
                <span>Simulate Next Step ({steps[Math.min(activeIndex + 1, steps.length - 1)].label})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Delivery Driver Info Card */}
          {order.driverName && (
            <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={order.driverPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                  alt="Driver"
                  className="w-12 h-12 rounded-full object-cover border-2 border-red-500"
                />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{order.driverName}</h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span className="text-amber-500 font-bold">★ {order.driverRating}</span>
                    <span>•</span>
                    <span>Delivery Partner</span>
                  </div>
                </div>
              </div>

              {/* Call & Chat Action buttons */}
              <div className="flex items-center space-x-2">
                <a
                  href={`tel:${order.driverPhone}`}
                  className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                  title="Call Delivery Partner"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <button
                  onClick={() => alert(`Messaging partner: ${order.driverName}`)}
                  className="w-9 h-9 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"
                  title="Send message"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Items Summary */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Order Summary</h4>
            <div className="space-y-2 text-xs">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-gray-800">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-bold">₹{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex justify-between font-extrabold text-sm text-gray-900">
                <span>Grand Total</span>
                <span className="text-red-600">₹{order.grandTotal.toFixed(0)}</span>
              </div>
            </div>

            {/* Send to WhatsApp button */}
            <button
              onClick={() => sendOrderToWhatsApp(order)}
              className="w-full mt-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/20 active:scale-98"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
              <span>Send Receipt to WhatsApp (8949508256)</span>
            </button>
          </div>
        </div>

        {/* Footer Close */}
        <div className="p-4 bg-white border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-sm transition-colors"
          >
            Close Tracker
          </button>
        </div>
      </div>
    </div>
  );
};
