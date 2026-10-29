/**
 * @file CustomerAuthModal.js
 * @module components/CustomerAuthModal
 * @description
 * High-converting Customer WhatsApp OTP Verification Modal for FoodZa.
 * 
 * Flow:
 * 1. Step 1 (Phone Entry): Collects 10-digit Indian mobile number (+91) and optional customer name.
 * 2. Dispatch: Sends OTP via YouPI's WhatsApp protocol gateway (`/api/v1/auth/whatsapp/send-otp`).
 * 3. Step 2 (OTP Verification): Collects 6-digit verification code with resend countdown timer.
 * 4. Verification: Verifies code with YouPI server-side (`/api/v1/auth/whatsapp/verify-otp`)
 *    and issues authenticated FoodZa session & tokens.
 */

import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { X, Phone, ShieldCheck, ArrowRight, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';
import { sendWhatsAppOtp, verifyWhatsAppOtp } from '../services/api.js';

export const CustomerAuthModal = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialPhone = '',
  initialName = '',
  title = 'Sign In with WhatsApp',
  subtitle = 'Verify your phone number to manage saved addresses and place orders.',
}) => {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Sync initial props
  useEffect(() => {
    if (initialPhone) setPhone(initialPhone);
    if (initialName) setName(initialName);
    if (isOpen) {
      setErrorMessage('');
      setSuccessNotice('');
      setOtp('');
      if (!initialPhone) setStep('phone');
    }
  }, [isOpen, initialPhone, initialName]);

  // Resend countdown timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => Math.max(0, c - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  // Format 10-digit phone
  const cleanPhoneInput = (val) => {
    const digits = val.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) {
      return digits.slice(2);
    }
    return digits.slice(0, 10);
  };

  // Handler: Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    const clean10 = cleanPhoneInput(phone);
    if (clean10.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendWhatsAppOtp(clean10, name.trim() || undefined);
      if (res.success) {
        setStep('otp');
        setCountdown(res.waitSeconds || 30);
        setSuccessNotice('A 6-digit verification code was sent to your WhatsApp.');
      } else {
        setErrorMessage(res.error || 'Failed to send WhatsApp verification code.');
        if (res.waitSeconds) {
          setCountdown(res.waitSeconds);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Network error sending WhatsApp code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter the 6-digit code received on WhatsApp.');
      return;
    }

    setIsLoading(true);
    try {
      const clean10 = cleanPhoneInput(phone);
      const res = await verifyWhatsAppOtp(clean10, cleanOtp, name.trim() || undefined);
      if (res.success && res.user) {
        setSuccessNotice('Phone verified successfully!');
        setTimeout(() => {
          onAuthSuccess(res.user);
          onClose();
        }, 400);
      } else {
        setErrorMessage(res.error || 'Invalid or expired verification code.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Network error verifying code.');
    } finally {
      setIsLoading(false);
    }
  };

  return _jsx('div', {
    id: 'customer-auth-modal-overlay',
    className:
      'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200',
    children: _jsxs('div', {
      id: 'customer-auth-modal-content',
      className:
        'w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300',
      children: [
        // Modal Header
        _jsxs('div', {
          className: 'flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-linear-to-r from-red-50/50 to-white',
          children: [
            _jsxs('div', {
              className: 'flex items-center space-x-3',
              children: [
                _jsx('div', {
                  className: 'w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs',
                  children: _jsx(MessageSquare, { className: 'w-5 h-5 fill-emerald-600/20 stroke-[2.2]' }),
                }),
                _jsxs('div', {
                  children: [
                    _jsx('h3', { className: 'text-base font-black text-gray-900', children: title }),
                    _jsx('p', { className: 'text-xs text-gray-500 font-medium', children: 'WhatsApp Instant Verification' }),
                  ],
                }),
              ],
            }),
            _jsx('button', {
              id: 'close-auth-modal-btn',
              onClick: onClose,
              className: 'p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors',
              children: _jsx(X, { className: 'w-5 h-5' }),
            }),
          ],
        }),

        // Modal Body
        _jsxs('div', {
          className: 'p-6 space-y-4',
          children: [
            _jsx('p', {
              className: 'text-xs text-gray-600 leading-relaxed',
              children: subtitle,
            }),

            // Error notice
            errorMessage &&
              _jsxs('div', {
                className: 'p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-start space-x-2 animate-in fade-in',
                children: [
                  _jsx(AlertCircle, { className: 'w-4 h-4 text-red-600 shrink-0 mt-0.5' }),
                  _jsx('span', { className: 'font-medium', children: errorMessage }),
                ],
              }),

            // Success notice
            successNotice &&
              _jsxs('div', {
                className: 'p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs flex items-center space-x-2 animate-in fade-in',
                children: [
                  _jsx(ShieldCheck, { className: 'w-4 h-4 text-emerald-600 shrink-0' }),
                  _jsx('span', { className: 'font-medium', children: successNotice }),
                ],
              }),

            // Step 1: Phone & Name Input
            step === 'phone' &&
              _jsxs('form', {
                onSubmit: handleSendOtp,
                className: 'space-y-4',
                children: [
                  _jsxs('div', {
                    children: [
                      _jsx('label', {
                        className: 'block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider',
                        children: 'Full Name (Optional)',
                      }),
                      _jsx('input', {
                        id: 'auth-customer-name-input',
                        type: 'text',
                        placeholder: 'e.g. Kushal Choudhary',
                        value: name,
                        onChange: (e) => setName(e.target.value),
                        className:
                          'w-full px-3.5 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition-all',
                      }),
                    ],
                  }),

                  _jsxs('div', {
                    children: [
                      _jsxs('label', {
                        className: 'block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider flex items-center justify-between',
                        children: [
                          _jsxs('span', {
                            children: ['WhatsApp Mobile Number ', _jsx('span', { className: 'text-red-500', children: '*' })],
                          }),
                          _jsx('span', { className: 'text-[11px] font-semibold text-emerald-600', children: 'OTP sent via WhatsApp' }),
                        ],
                      }),
                      _jsxs('div', {
                        className: 'flex items-center space-x-2',
                        children: [
                          _jsxs('div', {
                            className: 'px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-2xl text-xs font-black text-gray-700 flex items-center space-x-1 shrink-0',
                            children: [
                              _jsx('span', { className: 'text-sm', children: '🇮🇳' }),
                              _jsx('span', { children: '+91' }),
                            ],
                          }),
                          _jsx('input', {
                            id: 'auth-customer-phone-input',
                            type: 'tel',
                            required: true,
                            autoFocus: true,
                            placeholder: '10-digit mobile number',
                            value: phone,
                            onChange: (e) => setPhone(cleanPhoneInput(e.target.value)),
                            maxLength: 10,
                            className:
                              'flex-1 px-3.5 py-2.5 text-sm font-semibold tracking-wider bg-gray-50/70 border border-gray-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white transition-all',
                          }),
                        ],
                      }),
                      _jsx('p', {
                        className: 'text-[11px] text-gray-400 mt-1.5',
                        children: 'We will verify this number securely using WhatsApp.',
                      }),
                    ],
                  }),

                  _jsxs('button', {
                    id: 'send-whatsapp-otp-btn',
                    type: 'submit',
                    disabled: isLoading || cleanPhoneInput(phone).length !== 10 || countdown > 0,
                    className:
                      'w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                    children: [
                      isLoading
                        ? _jsx(RefreshCw, { className: 'w-4 h-4 animate-spin' })
                        : _jsx(MessageSquare, { className: 'w-4 h-4' }),
                      _jsx('span', {
                        children: isLoading
                          ? 'Sending WhatsApp OTP...'
                          : countdown > 0
                          ? `Wait ${countdown}s to Resend`
                          : 'Get WhatsApp Verification Code',
                      }),
                    ],
                  }),
                  _jsx('button', {
                    type: 'button',
                    onClick: onClose,
                    className:
                      'w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors text-center block',
                    children: 'Skip & Continue as Guest →',
                  }),
                ],
              }),

            // Step 2: 6-digit OTP verification
            step === 'otp' &&
              _jsxs('form', {
                onSubmit: handleVerifyOtp,
                className: 'space-y-4',
                children: [
                  _jsxs('div', {
                    className: 'p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between',
                    children: [
                      _jsxs('div', {
                        className: 'flex items-center space-x-2',
                        children: [
                          _jsx(Phone, { className: 'w-4 h-4 text-gray-500' }),
                          _jsxs('span', {
                            className: 'text-xs font-bold text-gray-800 tracking-wider',
                            children: ['+91 ', cleanPhoneInput(phone)],
                          }),
                        ],
                      }),
                      _jsx('button', {
                        type: 'button',
                        onClick: () => {
                          setStep('phone');
                          setOtp('');
                          setErrorMessage('');
                        },
                        className: 'text-xs font-bold text-red-600 hover:underline',
                        children: 'Change',
                      }),
                    ],
                  }),

                  _jsxs('div', {
                    children: [
                      _jsx('label', {
                        className: 'block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider',
                        children: '6-Digit WhatsApp Code',
                      }),
                      _jsx('input', {
                        id: 'auth-customer-otp-input',
                        type: 'text',
                        required: true,
                        autoFocus: true,
                        placeholder: '• • • • • •',
                        value: otp,
                        onChange: (e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setOtp(val);
                        },
                        maxLength: 6,
                        className:
                          'w-full px-4 py-3 text-center text-xl font-black tracking-widest bg-gray-50/80 border border-gray-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all',
                      }),
                      _jsx('p', {
                        className: 'text-[11px] text-gray-400 mt-1.5 text-center',
                        children: 'Check your WhatsApp messages for the 6-digit code.',
                      }),
                    ],
                  }),

                  _jsxs('button', {
                    id: 'verify-whatsapp-otp-btn',
                    type: 'submit',
                    disabled: isLoading || otp.trim().length !== 6,
                    className:
                      'w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                    children: [
                      isLoading
                        ? _jsx(RefreshCw, { className: 'w-4 h-4 animate-spin' })
                        : _jsx(ShieldCheck, { className: 'w-4 h-4' }),
                      _jsx('span', { children: isLoading ? 'Verifying...' : 'Verify & Continue' }),
                    ],
                  }),

                  _jsxs('div', {
                    className: 'flex items-center justify-between pt-1',
                    children: [
                      _jsx('button', {
                        type: 'button',
                        onClick: () => {
                          setStep('phone');
                          setOtp('');
                        },
                        className: 'text-xs text-gray-500 hover:text-gray-700 font-medium',
                        children: 'Back to mobile number',
                      }),
                      _jsx('button', {
                        type: 'button',
                        disabled: countdown > 0 || isLoading,
                        onClick: handleSendOtp,
                        className: `text-xs font-bold transition-colors ${
                          countdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-emerald-600 hover:underline'
                        }`,
                        children: countdown > 0 ? `Resend code in ${countdown}s` : 'Resend WhatsApp Code',
                      }),
                    ],
                  }),
                  _jsx('button', {
                    type: 'button',
                    onClick: onClose,
                    className:
                      'w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors text-center block pt-2 border-t border-gray-100',
                    children: 'Skip & Continue as Guest →',
                  }),
                ],
              }),
          ],
        }),
      ],
    }),
  });
};
