/**
 * @file LocationModal.js
 * @module components/LocationModal
 * @description
 * Customer Delivery Address & Campus Location Management Modal for FoodZa.
 * 
 * Features:
 * - Add a new delivery address
 * - Edit an existing address
 * - View saved addresses
 * - Select a saved address during checkout / browsing
 * - Set an address as default
 * - Delete an address
 * - Add campus-specific metadata: Hostel Name, Room No, Block, Floor, Landmark, Instructions
 */

import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { MapPin, Plus, Check, X, Building, Home, GraduationCap, Trash2, Edit3, Star } from 'lucide-react';

export const LocationModal = ({
  isOpen,
  onClose,
  addresses = [],
  currentAddress = {},
  onSelectAddress,
  onAddAddress,
  onUpdateAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  currentUser = null,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Fields
  const [label, setLabel] = useState('Hostel');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hostelName, setHostelName] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Reset form or fill with user details when opening add form
  const resetForm = () => {
    setEditingId(null);
    setLabel('Hostel');
    setName(currentUser?.name || '');
    setPhone(currentUser?.phone ? currentUser.phone.replace(/^\+91/, '') : '');
    setHostelName(currentUser?.hostelName || currentUser?.hostel_name || '');
    setRoomNo(currentUser?.roomNo || currentUser?.room_no || '');
    setBlock(currentUser?.block || '');
    setFloor(currentUser?.floor || '');
    setAddressLine(currentUser?.landmark || '');
    setInstructions('');
    setIsDefault(addresses.length === 0);
  };

  const startEdit = (addr) => {
    setEditingId(addr.id);
    setLabel(addr.label || 'Hostel');
    setName(addr.name || '');
    setPhone(addr.phone ? String(addr.phone).replace(/^\+91/, '') : '');
    setHostelName(addr.hostelName || addr.hostel_name || '');
    setRoomNo(addr.roomNo || addr.room_no || '');
    setBlock(addr.block || '');
    setFloor(addr.floor || '');
    setAddressLine(addr.addressLine || addr.address_line || '');
    setInstructions(addr.instructions || '');
    setIsDefault(Boolean(addr.isDefault || addr.is_default));
    setIsFormOpen(true);
  };

  const handleSaveAddress = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedHostel = hostelName.trim();
    const trimmedRoom = roomNo.trim();
    const trimmedLine = addressLine.trim() || [trimmedHostel, trimmedRoom ? `Room ${trimmedRoom}` : null].filter(Boolean).join(', ');

    if (!trimmedLine && !trimmedHostel) {
      alert('Please provide a hostel name or address description.');
      return;
    }

    const payload = {
      id: editingId || `addr-${Date.now()}`,
      label,
      name: trimmedName,
      phone: trimmedPhone.startsWith('+91') ? trimmedPhone : `+91 ${trimmedPhone.replace(/\D/g, '')}`,
      hostelName: trimmedHostel || undefined,
      hostel_name: trimmedHostel || undefined,
      roomNo: trimmedRoom || undefined,
      room_no: trimmedRoom || undefined,
      block: block.trim() || undefined,
      floor: floor.trim() || undefined,
      addressLine: trimmedLine,
      address_line: trimmedLine,
      locality: 'Campus',
      city: 'Campus',
      instructions: instructions.trim() || undefined,
      isDefault,
      is_default: isDefault,
    };

    if (editingId) {
      if (onUpdateAddress) {
        onUpdateAddress(payload);
      } else {
        // Fallback if onUpdateAddress not provided directly
        if (onDeleteAddress) onDeleteAddress(editingId);
        onAddAddress(payload);
      }
    } else {
      onAddAddress(payload);
    }

    if (onSelectAddress) {
      onSelectAddress(payload);
    }

    setIsFormOpen(false);
    setEditingId(null);
  };

  if (!isOpen) return null;

  const getLabelIcon = (tag) => {
    switch (tag) {
      case 'Hostel':
        return _jsx(GraduationCap, { className: 'w-4 h-4' });
      case 'Home':
        return _jsx(Home, { className: 'w-4 h-4' });
      case 'Work':
        return _jsx(Building, { className: 'w-4 h-4' });
      default:
        return _jsx(MapPin, { className: 'w-4 h-4' });
    }
  };

  return _jsx('div', {
    id: 'location-modal-overlay',
    className:
      'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200',
    children: _jsxs('div', {
      id: 'location-modal-content',
      className:
        'w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300',
      children: [
        // Modal Header
        _jsxs('div', {
          className: 'flex items-center justify-between px-6 py-4 border-b border-gray-100',
          children: [
            _jsxs('div', {
              className: 'flex items-center space-x-2.5',
              children: [
                _jsx('div', {
                  className: 'w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600',
                  children: _jsx(MapPin, { className: 'w-5 h-5' }),
                }),
                _jsxs('div', {
                  children: [
                    _jsx('h3', { className: 'text-lg font-bold text-gray-900', children: 'Delivery Address' }),
                    _jsx('p', {
                      className: 'text-xs text-gray-500',
                      children: 'Select, edit, or add your campus hostel & room',
                    }),
                  ],
                }),
              ],
            }),
            _jsx('button', {
              id: 'close-location-modal-btn',
              onClick: onClose,
              className: 'p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors',
              children: _jsx(X, { className: 'w-5 h-5' }),
            }),
          ],
        }),

        // Modal Content
        _jsxs('div', {
          className: 'p-6 overflow-y-auto space-y-4',
          children: [
            // Saved Addresses List
            !isFormOpen &&
              _jsxs('div', {
                className: 'space-y-3',
                children: [
                  _jsx('h4', {
                    className: 'text-xs font-bold uppercase tracking-wider text-gray-400',
                    children: 'Saved Addresses',
                  }),
                  addresses.length === 0 &&
                    _jsx('div', {
                      className: 'p-6 text-center text-gray-400 text-xs border border-dashed rounded-2xl',
                      children: 'No delivery addresses saved yet. Click below to add your hostel room.',
                    }),
                  addresses.map((addr) => {
                    const isSelected = currentAddress.id === addr.id;
                    const isDef = addr.isDefault || addr.is_default;
                    const displayHostel = addr.hostelName || addr.hostel_name;
                    const displayRoom = addr.roomNo || addr.room_no;

                    return _jsxs(
                      'div',
                      {
                        id: `address-item-${addr.id}`,
                        onClick: () => {
                          onSelectAddress(addr);
                          onClose();
                        },
                        className: `p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                          isSelected
                            ? 'border-red-500 bg-red-50/40 shadow-xs ring-1 ring-red-500'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/70'
                        }`,
                        children: [
                          _jsxs('div', {
                            className: 'flex items-start space-x-3 flex-1 pr-2',
                            children: [
                              _jsx('div', {
                                className: `p-2.5 rounded-xl mt-0.5 ${
                                  isSelected ? 'bg-red-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                                }`,
                                children: getLabelIcon(addr.label),
                              }),
                              _jsxs('div', {
                                className: 'space-y-0.5',
                                children: [
                                  _jsxs('div', {
                                    className: 'flex items-center space-x-2',
                                    children: [
                                      _jsx('span', { className: 'text-sm font-bold text-gray-900', children: addr.label }),
                                      isDef &&
                                        _jsx('span', {
                                          className:
                                            'px-2 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 rounded-full',
                                          children: 'DEFAULT',
                                        }),
                                    ],
                                  }),
                                  addr.name &&
                                    _jsxs('p', {
                                      className: 'text-xs font-bold text-gray-900 flex items-center',
                                      children: [_jsx('span', { className: 'mr-1', children: '👤' }), addr.name],
                                    }),
                                  (displayHostel || addr.block || displayRoom) &&
                                    _jsx('p', {
                                      className: 'text-xs font-bold text-red-600',
                                      children: [
                                        displayRoom ? `Room ${displayRoom}` : null,
                                        displayHostel,
                                        addr.block ? `Block ${addr.block}` : null,
                                        addr.floor ? `Floor ${addr.floor}` : null,
                                      ]
                                        .filter(Boolean)
                                        .join(', '),
                                    }),
                                  _jsx('p', {
                                    className: 'text-xs font-medium text-gray-700',
                                    children: addr.addressLine || addr.address_line,
                                  }),
                                  addr.instructions &&
                                    _jsxs('p', {
                                      className: 'text-[11px] text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-md inline-block mt-0.5',
                                      children: ['Note: ', addr.instructions],
                                    }),
                                  addr.phone &&
                                    _jsxs('p', {
                                      className: 'text-[11px] font-semibold text-gray-600 mt-1 flex items-center',
                                      children: [_jsx('span', { className: 'mr-1', children: '📞' }), addr.phone],
                                    }),
                                ],
                              }),
                            ],
                          }),
                          _jsxs('div', {
                            className: 'flex items-center space-x-1 shrink-0',
                            children: [
                              _jsx('button', {
                                type: 'button',
                                onClick: (e) => {
                                  e.stopPropagation();
                                  startEdit(addr);
                                },
                                className: 'p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors',
                                title: 'Edit this address',
                                children: _jsx(Edit3, { className: 'w-4 h-4' }),
                              }),
                              onSetDefaultAddress &&
                                !isDef &&
                                _jsx('button', {
                                  type: 'button',
                                  onClick: (e) => {
                                    e.stopPropagation();
                                    onSetDefaultAddress(addr.id);
                                  },
                                  className: 'p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors',
                                  title: 'Set as default address',
                                  children: _jsx(Star, { className: 'w-4 h-4' }),
                                }),
                              addresses.length > 1 &&
                                onDeleteAddress &&
                                _jsx('button', {
                                  type: 'button',
                                  onClick: (e) => {
                                    e.stopPropagation();
                                    if (confirm('Delete this saved address?')) {
                                      onDeleteAddress(addr.id);
                                    }
                                  },
                                  className: 'p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors',
                                  title: 'Delete this address',
                                  children: _jsx(Trash2, { className: 'w-4 h-4' }),
                                }),
                              isSelected &&
                                _jsx('div', {
                                  className: 'w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center ml-1',
                                  children: _jsx(Check, { className: 'w-3.5 h-3.5 stroke-[3]' }),
                                }),
                            ],
                          }),
                        ],
                      },
                      addr.id
                    );
                  }),
                ],
              }),

            // Add Address Trigger Button
            !isFormOpen &&
              _jsxs('button', {
                id: 'add-new-address-toggle-btn',
                onClick: () => {
                  resetForm();
                  setIsFormOpen(true);
                },
                className:
                  'w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600 font-bold flex items-center justify-center space-x-2 text-sm transition-colors bg-white hover:bg-red-50/20',
                children: [_jsx(Plus, { className: 'w-4 h-4' }), _jsx('span', { children: 'Add New Delivery Address' })],
              }),

            // Add/Edit Address Form
            isFormOpen &&
              _jsxs('form', {
                onSubmit: handleSaveAddress,
                className: 'p-4 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-3.5',
                children: [
                  _jsxs('div', {
                    className: 'flex items-center justify-between pb-2 border-b border-gray-200',
                    children: [
                      _jsx('span', {
                        className: 'text-xs font-black uppercase tracking-wider text-gray-800',
                        children: editingId ? 'Edit Address' : 'Add New Delivery Address',
                      }),
                      _jsx('button', {
                        type: 'button',
                        onClick: () => setIsFormOpen(false),
                        className: 'text-xs text-gray-500 hover:text-gray-700 font-semibold',
                        children: 'Cancel',
                      }),
                    ],
                  }),

                  // Address Type Tags
                  _jsxs('div', {
                    children: [
                      _jsx('label', {
                        className: 'block text-[11px] font-bold text-gray-600 uppercase mb-1.5',
                        children: 'Address Type',
                      }),
                      _jsx('div', {
                        className: 'grid grid-cols-4 gap-2',
                        children: ['Hostel', 'Home', 'Work', 'Other'].map((tag) =>
                          _jsx(
                            'button',
                            {
                              type: 'button',
                              onClick: () => setLabel(tag),
                              className: `py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                                label === tag
                                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                              }`,
                              children: tag,
                            },
                            tag
                          )
                        ),
                      }),
                    ],
                  }),

                  // Recipient Name
                  _jsxs('div', {
                    children: [
                      _jsxs('label', {
                        className: 'block text-xs font-semibold text-gray-700 mb-1',
                        children: ['Recipient Name ', _jsx('span', { className: 'text-red-500', children: '*' })],
                      }),
                      _jsx('input', {
                        id: 'address-form-name-input',
                        type: 'text',
                        required: true,
                        placeholder: 'e.g. Kushal Choudhary',
                        value: name,
                        onChange: (e) => setName(e.target.value),
                        className:
                          'w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500',
                      }),
                    ],
                  }),

                  // Phone Number
                  _jsxs('div', {
                    children: [
                      _jsxs('label', {
                        className: 'block text-xs font-semibold text-gray-700 mb-1',
                        children: ['Contact Phone ', _jsx('span', { className: 'text-red-500', children: '*' })],
                      }),
                      _jsx('input', {
                        id: 'address-form-phone-input',
                        type: 'tel',
                        required: true,
                        placeholder: '10-digit mobile number',
                        value: phone,
                        onChange: (e) => setPhone(e.target.value),
                        className:
                          'w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500',
                      }),
                    ],
                  }),

                  // Hostel & Room No.
                  _jsxs('div', {
                    className: 'grid grid-cols-2 gap-2.5',
                    children: [
                      _jsxs('div', {
                        children: [
                          _jsxs('label', {
                            className: 'block text-xs font-semibold text-gray-700 mb-1',
                            children: ['Hostel / Building ', _jsx('span', { className: 'text-red-500', children: '*' })],
                          }),
                          _jsx('input', {
                            id: 'address-form-hostel-input',
                            type: 'text',
                            required: true,
                            placeholder: 'e.g. Ganga Hostel',
                            value: hostelName,
                            onChange: (e) => setHostelName(e.target.value),
                            className:
                              'w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500',
                          }),
                        ],
                      }),
                      _jsxs('div', {
                        children: [
                          _jsxs('label', {
                            className: 'block text-xs font-semibold text-gray-700 mb-1',
                            children: ['Room Number ', _jsx('span', { className: 'text-red-500', children: '*' })],
                          }),
                          _jsx('input', {
                            id: 'address-form-room-input',
                            type: 'text',
                            required: true,
                            placeholder: 'e.g. 204 or B-12',
                            value: roomNo,
                            onChange: (e) => setRoomNo(e.target.value),
                            className:
                              'w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500',
                          }),
                        ],
                      }),
                    ],
                  }),

                  // Block & Floor
                  _jsxs('div', {
                    className: 'grid grid-cols-2 gap-2.5',
                    children: [
                      _jsxs('div', {
                        children: [
                          _jsx('label', {
                            className: 'block text-xs font-semibold text-gray-700 mb-1',
                            children: 'Block / Wing',
                          }),
                          _jsx('input', {
                            type: 'text',
                            placeholder: 'e.g. Block A',
                            value: block,
                            onChange: (e) => setBlock(e.target.value),
                            className:
                              'w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500',
                          }),
                        ],
                      }),
                      _jsxs('div', {
                        children: [
                          _jsx('label', {
                            className: 'block text-xs font-semibold text-gray-700 mb-1',
                            children: 'Floor',
                          }),
                          _jsx('input', {
                            type: 'text',
                            placeholder: 'e.g. 2nd Floor',
                            value: floor,
                            onChange: (e) => setFloor(e.target.value),
                            className:
                              'w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500',
                          }),
                        ],
                      }),
                    ],
                  }),

                  // Campus Gate / Landmark / Street
                  _jsxs('div', {
                    children: [
                      _jsx('label', {
                        className: 'block text-xs font-semibold text-gray-700 mb-1',
                        children: 'Campus Gate / Street / Landmark',
                      }),
                      _jsx('input', {
                        type: 'text',
                        placeholder: 'e.g. Near University Main Gate, Campus West Road',
                        value: addressLine,
                        onChange: (e) => setAddressLine(e.target.value),
                        className:
                          'w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500',
                      }),
                    ],
                  }),

                  // Special Delivery Instructions
                  _jsxs('div', {
                    children: [
                      _jsx('label', {
                        className: 'block text-xs font-semibold text-gray-700 mb-1',
                        children: 'Delivery Instructions (Optional)',
                      }),
                      _jsx('input', {
                        type: 'text',
                        placeholder: 'e.g. Call upon arrival or leave at hostel guard desk',
                        value: instructions,
                        onChange: (e) => setInstructions(e.target.value),
                        className:
                          'w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500',
                      }),
                    ],
                  }),

                  // Default Address Checkbox
                  _jsxs('label', {
                    className: 'flex items-center space-x-2 pt-1 cursor-pointer',
                    children: [
                      _jsx('input', {
                        type: 'checkbox',
                        checked: isDefault,
                        onChange: (e) => setIsDefault(e.target.checked),
                        className: 'rounded text-red-600 focus:ring-red-500',
                      }),
                      _jsx('span', {
                        className: 'text-xs font-bold text-gray-700',
                        children: 'Set as default delivery address',
                      }),
                    ],
                  }),

                  // Submit Button
                  _jsx('button', {
                    id: 'save-address-btn',
                    type: 'submit',
                    className:
                      'w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-colors shadow-md shadow-red-500/20 active:scale-98',
                    children: editingId ? 'Update Address' : 'Save & Deliver Here',
                  }),
                ],
              }),
          ],
        }),
      ],
    }),
  });
};
