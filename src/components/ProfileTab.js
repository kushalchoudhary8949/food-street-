/**
 * @file ProfileTab.js
 * @module components/ProfileTab
 * @description
 * Customer Profile, Preferences, and Hostel Delivery Management View for FoodZa.
 * 
 * Features:
 * - WhatsApp Verified Status & Phone Display
 * - Editable Campus Profile: Name, Hostel Name, Room No, Block, Floor, Landmark
 * - Synchronized with FoodZa PostgreSQL database via PATCH /api/v1/users/me
 * - Saved Addresses Management (Add, Edit, Set Default, Delete)
 * - Guest Authentication Prompt via YouPI WhatsApp OTP
 */

import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import {
  MapPin,
  CreditCard,
  Heart,
  HelpCircle,
  ChevronRight,
  Bell,
  Leaf,
  LogOut,
  ShieldCheck,
  Building,
  Save,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  User,
} from 'lucide-react';

export const ProfileTab = ({
  currentUser = null,
  currentAddress,
  addresses = [],
  onOpenLocationModal,
  onOpenAuthModal,
  onUpdateProfile,
  onLogout,
  favoritesCount = 0,
  onViewFavorites,
}) => {
  // Diet & Preference Toggles
  const [vegOnlyMode, setVegOnlyMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // Profile Form State
  const [name, setName] = useState('');
  const [hostelName, setHostelName] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Hydrate fields from currentUser
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setHostelName(currentUser.hostelName || currentUser.hostel_name || '');
      setRoomNo(currentUser.roomNo || currentUser.room_no || '');
      setBlock(currentUser.block || '');
      setFloor(currentUser.floor || '');
      setLandmark(currentUser.landmark || '');
    }
  }, [currentUser]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser || !onUpdateProfile) return;

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const res = await onUpdateProfile({
        name: name.trim(),
        hostelName: hostelName.trim(),
        roomNo: roomNo.trim(),
        block: block.trim(),
        floor: floor.trim(),
        landmark: landmark.trim(),
      });

      if (res && res.success !== false) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(res?.error || 'Failed to update profile details.');
      }
    } catch (err) {
      setSaveError(err.message || 'Error updating profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return _jsxs('div', {
    className: 'space-y-6 px-4 py-4 pb-28 max-w-2xl mx-auto',
    children: [
      // 1. Account Header Banner (Logged In vs Guest)
      currentUser
        ? _jsxs('div', {
            className:
              'bg-white rounded-3xl p-6 border border-gray-100 shadow-xs flex items-center space-x-4 animate-in fade-in',
            children: [
              _jsxs('div', {
                className: 'relative',
                children: [
                  _jsx('div', {
                    className:
                      'w-16 h-16 rounded-full bg-linear-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white text-2xl font-black shadow-md border-2 border-white',
                    children: (currentUser.name || 'U').charAt(0).toUpperCase(),
                  }),
                  _jsx('span', {
                    className:
                      'absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white',
                    title: 'WhatsApp Verified Customer',
                    children: _jsx(ShieldCheck, { className: 'w-2.5 h-2.5 stroke-[3]' }),
                  }),
                ],
              }),
              _jsxs('div', {
                className: 'flex-1 min-w-0',
                children: [
                  _jsxs('div', {
                    className: 'flex items-center space-x-2',
                    children: [
                      _jsx('h3', {
                        className: 'text-lg font-black text-gray-900 truncate',
                        children: currentUser.name || 'FoodZa Customer',
                      }),
                      _jsx('span', {
                        className:
                          'px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold rounded-md',
                        children: 'GOLD',
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    className: 'flex items-center space-x-1.5 mt-1 text-emerald-700',
                    children: [
                      _jsx(MessageSquare, { className: 'w-3.5 h-3.5 fill-emerald-600/20' }),
                      _jsx('span', {
                        className: 'text-xs font-bold tracking-wide',
                        children: currentUser.phone || 'Verified on WhatsApp',
                      }),
                    ],
                  }),
                  (currentUser.hostelName || currentUser.roomNo) &&
                    _jsxs('p', {
                      className: 'text-xs text-gray-500 truncate mt-0.5',
                      children: [
                        currentUser.hostelName ? currentUser.hostelName : null,
                        currentUser.roomNo ? ` · Room ${currentUser.roomNo}` : null,
                      ].filter(Boolean),
                    }),
                ],
              }),
            ],
          })
        : _jsxs('div', {
            className:
              'bg-linear-to-r from-red-600 to-rose-600 rounded-3xl p-6 text-white shadow-lg shadow-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in',
            children: [
              _jsxs('div', {
                className: 'space-y-1 text-center sm:text-left',
                children: [
                  _jsx('h3', { className: 'text-lg font-black', children: 'Sign in with WhatsApp' }),
                  _jsx('p', {
                    className: 'text-xs text-red-100 max-w-sm',
                    children:
                      'Save your campus hostel, room number, and addresses to enjoy fast 1-click checkout!',
                  }),
                ],
              }),
              _jsxs('button', {
                id: 'profile-login-whatsapp-btn',
                onClick: onOpenAuthModal,
                className:
                  'px-5 py-3 bg-white text-red-600 hover:bg-red-50 rounded-2xl text-xs font-black shadow-md flex items-center space-x-2 shrink-0 active:scale-95 transition-all',
                children: [_jsx(MessageSquare, { className: 'w-4 h-4' }), _jsx('span', { children: 'Sign In via WhatsApp' })],
              }),
            ],
          }),

      // 2. Editable Campus Delivery Profile Details (if authenticated)
      currentUser &&
        _jsxs('div', {
          className: 'bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4 animate-in fade-in',
          children: [
            _jsxs('div', {
              className: 'flex items-center justify-between pb-2 border-b border-gray-100',
              children: [
                _jsxs('div', {
                  children: [
                    _jsx('h4', {
                      className: 'text-xs font-extrabold uppercase tracking-wider text-gray-400',
                      children: 'Campus Delivery Profile',
                    }),
                    _jsx('p', {
                      className: 'text-xs text-gray-500 mt-0.5',
                      children: 'Saved details are auto-filled on checkout and attached to every order.',
                    }),
                  ],
                }),
                _jsx('div', {
                  className: 'p-2 bg-red-50 text-red-600 rounded-xl',
                  children: _jsx(Building, { className: 'w-4 h-4' }),
                }),
              ],
            }),

            saveSuccess &&
              _jsxs('div', {
                className:
                  'p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center space-x-2 animate-in fade-in',
                children: [
                  _jsx(CheckCircle2, { className: 'w-4 h-4 text-emerald-600' }),
                  _jsx('span', { className: 'font-bold', children: 'Delivery profile updated successfully in database!' }),
                ],
              }),

            saveError &&
              _jsx('div', {
                className: 'p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold',
                children: saveError,
              }),

            _jsxs('form', {
              onSubmit: handleSaveProfile,
              className: 'space-y-3.5',
              children: [
                _jsxs('div', {
                  children: [
                    _jsx('label', {
                      className: 'block text-xs font-bold text-gray-700 mb-1',
                      children: 'Full Name',
                    }),
                    _jsx('input', {
                      id: 'profile-name-input',
                      type: 'text',
                      value: name,
                      onChange: (e) => setName(e.target.value),
                      placeholder: 'e.g. Kushal Choudhary',
                      className:
                        'w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white',
                    }),
                  ],
                }),

                _jsxs('div', {
                  className: 'grid grid-cols-2 gap-3',
                  children: [
                    _jsxs('div', {
                      children: [
                        _jsx('label', {
                          className: 'block text-xs font-bold text-gray-700 mb-1',
                          children: 'Hostel / Building Name',
                        }),
                        _jsx('input', {
                          id: 'profile-hostel-input',
                          type: 'text',
                          value: hostelName,
                          onChange: (e) => setHostelName(e.target.value),
                          placeholder: 'e.g. Ganga Hostel',
                          className:
                            'w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white',
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      children: [
                        _jsx('label', {
                          className: 'block text-xs font-bold text-gray-700 mb-1',
                          children: 'Room Number',
                        }),
                        _jsx('input', {
                          id: 'profile-room-input',
                          type: 'text',
                          value: roomNo,
                          onChange: (e) => setRoomNo(e.target.value),
                          placeholder: 'e.g. 204 or B-12',
                          className:
                            'w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white',
                        }),
                      ],
                    }),
                  ],
                }),

                _jsxs('div', {
                  className: 'grid grid-cols-2 gap-3',
                  children: [
                    _jsxs('div', {
                      children: [
                        _jsx('label', {
                          className: 'block text-xs font-bold text-gray-700 mb-1',
                          children: 'Block / Wing',
                        }),
                        _jsx('input', {
                          type: 'text',
                          value: block,
                          onChange: (e) => setBlock(e.target.value),
                          placeholder: 'e.g. Block A',
                          className:
                            'w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white',
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      children: [
                        _jsx('label', {
                          className: 'block text-xs font-bold text-gray-700 mb-1',
                          children: 'Floor',
                        }),
                        _jsx('input', {
                          type: 'text',
                          value: floor,
                          onChange: (e) => setFloor(e.target.value),
                          placeholder: 'e.g. 2nd Floor',
                          className:
                            'w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white',
                        }),
                      ],
                    }),
                  ],
                }),

                _jsxs('div', {
                  children: [
                    _jsx('label', {
                      className: 'block text-xs font-bold text-gray-700 mb-1',
                      children: 'Campus Gate / Landmark Details',
                    }),
                    _jsx('input', {
                      type: 'text',
                      value: landmark,
                      onChange: (e) => setLandmark(e.target.value),
                      placeholder: 'e.g. Near West Campus Gate / Academic Block',
                      className:
                        'w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white',
                    }),
                  ],
                }),

                _jsxs('button', {
                  id: 'save-profile-btn',
                  type: 'submit',
                  disabled: isSaving,
                  className:
                    'w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-colors shadow-md shadow-red-500/20 flex items-center justify-center space-x-2 active:scale-98 disabled:opacity-50',
                  children: [
                    isSaving
                      ? _jsx(RefreshCw, { className: 'w-4 h-4 animate-spin' })
                      : _jsx(Save, { className: 'w-4 h-4' }),
                    _jsx('span', { children: isSaving ? 'Saving Profile...' : 'Save Profile Changes' }),
                  ],
                }),
              ],
            }),
          ],
        }),

      // 3. Diet & Preferences
      _jsxs('div', {
        className: 'bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4',
        children: [
          _jsx('h4', {
            className: 'text-xs font-extrabold uppercase tracking-wider text-gray-400',
            children: 'Diet & Preferences',
          }),
          _jsxs('div', {
            className: 'flex items-center justify-between py-1',
            children: [
              _jsxs('div', {
                className: 'flex items-center space-x-3',
                children: [
                  _jsx('div', {
                    className: 'p-2 bg-emerald-50 text-emerald-600 rounded-xl',
                    children: _jsx(Leaf, { className: 'w-5 h-5' }),
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-sm font-bold text-gray-900 block', children: 'Pure Vegetarian Mode' }),
                      _jsx('span', {
                        className: 'text-xs text-gray-500',
                        children: 'Show only vegetarian restaurants & dishes',
                      }),
                    ],
                  }),
                ],
              }),
              _jsx('button', {
                onClick: () => setVegOnlyMode(!vegOnlyMode),
                className: `w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  vegOnlyMode ? 'bg-emerald-600' : 'bg-gray-200'
                }`,
                children: _jsx('div', {
                  className: `bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    vegOnlyMode ? 'translate-x-6' : 'translate-x-0'
                  }`,
                }),
              }),
            ],
          }),
          _jsxs('div', {
            className: 'flex items-center justify-between py-1 border-t border-gray-50',
            children: [
              _jsxs('div', {
                className: 'flex items-center space-x-3',
                children: [
                  _jsx('div', {
                    className: 'p-2 bg-red-50 text-red-600 rounded-xl',
                    children: _jsx(Bell, { className: 'w-5 h-5' }),
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-sm font-bold text-gray-900 block', children: 'Order Status Updates' }),
                      _jsx('span', {
                        className: 'text-xs text-gray-500',
                        children: 'Real-time driver & food status alerts on WhatsApp',
                      }),
                    ],
                  }),
                ],
              }),
              _jsx('button', {
                onClick: () => setNotifications(!notifications),
                className: `w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  notifications ? 'bg-red-600' : 'bg-gray-200'
                }`,
                children: _jsx('div', {
                  className: `bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    notifications ? 'translate-x-6' : 'translate-x-0'
                  }`,
                }),
              }),
            ],
          }),
        ],
      }),

      // 4. Manage Account Options
      _jsxs('div', {
        className: 'bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3',
        children: [
          _jsx('h4', {
            className: 'text-xs font-extrabold uppercase tracking-wider text-gray-400',
            children: 'Manage Account',
          }),
          _jsxs('button', {
            id: 'manage-saved-addresses-btn',
            onClick: onOpenLocationModal,
            className: 'w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded-2xl p-2 transition-colors',
            children: [
              _jsxs('div', {
                className: 'flex items-center space-x-3',
                children: [
                  _jsx('div', {
                    className: 'p-2 bg-gray-100 text-gray-700 rounded-xl',
                    children: _jsx(MapPin, { className: 'w-4 h-4' }),
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-sm font-bold text-gray-900 block', children: 'Saved Addresses' }),
                      _jsxs('span', {
                        className: 'text-xs text-gray-500',
                        children: [addresses.length, ' campus addresses saved'],
                      }),
                    ],
                  }),
                ],
              }),
              _jsx(ChevronRight, { className: 'w-4 h-4 text-gray-400' }),
            ],
          }),
          _jsxs('button', {
            onClick: onViewFavorites,
            className: 'w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded-2xl p-2 transition-colors',
            children: [
              _jsxs('div', {
                className: 'flex items-center space-x-3',
                children: [
                  _jsx('div', {
                    className: 'p-2 bg-red-50 text-red-600 rounded-xl',
                    children: _jsx(Heart, { className: 'w-4 h-4 fill-red-500' }),
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-sm font-bold text-gray-900 block', children: 'Favorite Restaurants' }),
                      _jsxs('span', { className: 'text-xs text-gray-500', children: [favoritesCount, ' saved stores'] }),
                    ],
                  }),
                ],
              }),
              _jsx(ChevronRight, { className: 'w-4 h-4 text-gray-400' }),
            ],
          }),
          _jsxs('button', {
            onClick: () => alert('Customer Support is ready to assist. Contact: +91 7682890864'),
            className: 'w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded-2xl p-2 transition-colors',
            children: [
              _jsxs('div', {
                className: 'flex items-center space-x-3',
                children: [
                  _jsx('div', {
                    className: 'p-2 bg-gray-100 text-gray-700 rounded-xl',
                    children: _jsx(HelpCircle, { className: 'w-4 h-4' }),
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-sm font-bold text-gray-900 block', children: 'Help & Support' }),
                      _jsx('span', {
                        className: 'text-xs text-gray-500',
                        children: 'WhatsApp Support & Helpline',
                      }),
                    ],
                  }),
                ],
              }),
              _jsx(ChevronRight, { className: 'w-4 h-4 text-gray-400' }),
            ],
          }),
        ],
      }),

      // 5. Logout Button (if logged in)
      currentUser &&
        _jsxs('button', {
          id: 'logout-account-btn',
          onClick: () => {
            if (confirm('Are you sure you want to log out?')) {
              onLogout();
            }
          },
          className:
            'w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors',
          children: [_jsx(LogOut, { className: 'w-4 h-4' }), _jsx('span', { children: 'Log Out Account' })],
        }),
    ],
  });
};
