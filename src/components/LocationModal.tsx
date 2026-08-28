import React, { useState } from 'react';
import { MapPin, Plus, Check, X, Building, Home, GraduationCap, Trash2 } from 'lucide-react';
import { UserAddress } from '../types';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: UserAddress[];
  currentAddress: UserAddress;
  onSelectAddress: (address: UserAddress) => void;
  onAddAddress: (newAddress: UserAddress) => void;
  onDeleteAddress?: (addressId: string) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  addresses,
  currentAddress,
  onSelectAddress,
  onAddAddress,
  onDeleteAddress,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState<'Hostel' | 'Home' | 'Work' | 'Other'>('Hostel');
  const [newHostelName, setNewHostelName] = useState('');
  const [newRoomNo, setNewRoomNo] = useState('');
  const [newLine, setNewLine] = useState('');
  const [newLocality, setNewLocality] = useState('');
  const [newCity, setNewCity] = useState('');

  if (!isOpen) return null;

  const handleCreateAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLine.trim() || !newLocality.trim()) return;

    const created: UserAddress = {
      id: `addr-${Date.now()}`,
      label: newLabel,
      hostelName: newHostelName.trim() || undefined,
      roomNo: newRoomNo.trim() || undefined,
      addressLine: newLine.trim(),
      locality: newLocality.trim(),
      city: newCity.trim() || 'Metro City',
      isDefault: false,
    };

    onAddAddress(created);
    onSelectAddress(created);
    setShowAddForm(false);
    setNewHostelName('');
    setNewRoomNo('');
    setNewLine('');
    setNewLocality('');
    setNewCity('');
  };

  const getLabelIcon = (label: string) => {
    switch (label) {
      case 'Hostel':
        return <GraduationCap className="w-4 h-4" />;
      case 'Home':
        return <Home className="w-4 h-4" />;
      case 'Work':
        return <Building className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div id="location-modal-overlay" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        id="location-modal-content"
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Delivery Address</h3>
              <p className="text-xs text-gray-500">Select or add your hostel/home address</p>
            </div>
          </div>
          <button 
            id="close-location-modal-btn"
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Saved Addresses List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Saved Addresses</h4>
            {addresses.map((addr) => {
              const isSelected = currentAddress.id === addr.id;
              return (
                <div
                  key={addr.id}
                  id={`address-item-${addr.id}`}
                  onClick={() => {
                    onSelectAddress(addr);
                    onClose();
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                    isSelected 
                      ? 'border-red-500 bg-red-50/30 shadow-xs' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/70'
                  }`}
                >
                  <div className="flex items-start space-x-3 flex-1 pr-2">
                    <div className={`p-2.5 rounded-xl mt-0.5 ${
                      isSelected ? 'bg-red-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {getLabelIcon(addr.label)}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-gray-900">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-200 text-gray-700 rounded-full">
                            Default
                          </span>
                        )}
                      </div>

                      {/* Optional Hostel / Room display */}
                      {(addr.hostelName || addr.roomNo) && (
                        <p className="text-xs font-bold text-red-600">
                          {[addr.roomNo ? `Room ${addr.roomNo}` : null, addr.hostelName].filter(Boolean).join(', ')}
                        </p>
                      )}

                      <p className="text-xs font-medium text-gray-700">{addr.addressLine}</p>
                      <p className="text-xs text-gray-500">{addr.locality}, {addr.city}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {/* Delete address button */}
                    {addresses.length > 1 && onDeleteAddress && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAddress(addr.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete this address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Address Toggle / Form */}
          {!showAddForm ? (
            <button
              id="add-new-address-toggle-btn"
              onClick={() => setShowAddForm(true)}
              className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600 font-bold flex items-center justify-center space-x-2 text-sm transition-colors bg-white hover:bg-red-50/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Address</span>
            </button>
          ) : (
            <form onSubmit={handleCreateAddress} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                <span className="text-xs font-bold uppercase text-gray-800">Add Address Details</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
                >
                  Cancel
                </button>
              </div>

              {/* Tag selector */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1.5">Address Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Hostel', 'Home', 'Work', 'Other'] as const).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewLabel(tag)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                        newLabel === tag
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Hostel / Room fields */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Hostel / Building <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ganga Hostel / Block A"
                    value={newHostelName}
                    onChange={(e) => setNewHostelName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Room / Flat No. <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 204"
                    value={newRoomNo}
                    onChange={(e) => setNewRoomNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Street Address Line */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Street / Campus Gate / Landmark <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Near University Gate 2, Campus Road"
                  value={newLine}
                  onChange={(e) => setNewLine(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Locality & City */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Area / Locality <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. North Campus, Sector 12"
                    value={newLocality}
                    onChange={(e) => setNewLocality(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Metro City"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="save-new-address-btn"
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-colors shadow-md shadow-red-500/20 active:scale-98"
              >
                Save & Deliver Here
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
