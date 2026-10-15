import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { MapPin, Plus, Check, X, Building, Home, GraduationCap, Trash2 } from 'lucide-react';
export const LocationModal = ({ isOpen, onClose, addresses, currentAddress, onSelectAddress, onAddAddress, onDeleteAddress, }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newLabel, setNewLabel] = useState('Hostel');
    const [newName, setNewName] = useState('');
    const [newHostelName, setNewHostelName] = useState('');
    const [newBlock, setNewBlock] = useState('');
    const [newRoomNo, setNewRoomNo] = useState('');
    const [newLine, setNewLine] = useState('');
    const [newPhone, setNewPhone] = useState('');
    if (!isOpen)
        return null;
    const handleCreateAddress = (e) => {
        e.preventDefault();
        if (!newName.trim() || !newLine.trim() || !newPhone.trim())
            return;
        const created = {
            id: `addr-${Date.now()}`,
            name: newName.trim(),
            label: newLabel,
            hostelName: newHostelName.trim() || undefined,
            block: newBlock.trim() || undefined,
            roomNo: newRoomNo.trim() || undefined,
            addressLine: newLine.trim(),
            locality: '',
            city: '',
            phone: newPhone.trim(),
            isDefault: false,
        };
        onAddAddress(created);
        onSelectAddress(created);
        setShowAddForm(false);
        setNewName('');
        setNewHostelName('');
        setNewBlock('');
        setNewRoomNo('');
        setNewLine('');
        setNewPhone('');
    };
    const getLabelIcon = (label) => {
        switch (label) {
            case 'Hostel':
                return _jsx(GraduationCap, { className: "w-4 h-4" });
            case 'Home':
                return _jsx(Home, { className: "w-4 h-4" });
            case 'Work':
                return _jsx(Building, { className: "w-4 h-4" });
            default:
                return _jsx(MapPin, { className: "w-4 h-4" });
        }
    };
    return (_jsx("div", { id: "location-modal-overlay", className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200", children: _jsxs("div", { id: "location-modal-content", className: "w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-gray-100", children: [_jsxs("div", { className: "flex items-center space-x-2.5", children: [_jsx("div", { className: "w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600", children: _jsx(MapPin, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold text-gray-900", children: "Delivery Address" }), _jsx("p", { className: "text-xs text-gray-500", children: "Select or add your hostel/home address" })] })] }), _jsx("button", { id: "close-location-modal-btn", onClick: onClose, className: "p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 overflow-y-auto space-y-4", children: [_jsxs("div", { className: "space-y-2.5", children: [_jsx("h4", { className: "text-xs font-bold uppercase tracking-wider text-gray-400", children: "Saved Addresses" }), addresses.map((addr) => {
                                    const isSelected = currentAddress.id === addr.id;
                                    return (_jsxs("div", { id: `address-item-${addr.id}`, onClick: () => {
                                            onSelectAddress(addr);
                                            onClose();
                                        }, className: `p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${isSelected
                                            ? 'border-red-500 bg-red-50/30 shadow-xs'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/70'}`, children: [_jsxs("div", { className: "flex items-start space-x-3 flex-1 pr-2", children: [_jsx("div", { className: `p-2.5 rounded-xl mt-0.5 ${isSelected ? 'bg-red-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'}`, children: getLabelIcon(addr.label) }), _jsxs("div", { className: "space-y-0.5", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-sm font-bold text-gray-900", children: addr.label }), addr.isDefault && (_jsx("span", { className: "px-2 py-0.5 text-[10px] font-semibold bg-gray-200 text-gray-700 rounded-full", children: "Default" }))] }), addr.name && (_jsxs("p", { className: "text-xs font-bold text-gray-900 flex items-center", children: [_jsx("span", { className: "mr-1", children: "\uD83D\uDC64" }), " ", addr.name] })), (addr.hostelName || addr.block || addr.roomNo) && (_jsx("p", { className: "text-xs font-bold text-red-600", children: [addr.roomNo ? `Room ${addr.roomNo}` : null, addr.hostelName, addr.block].filter(Boolean).join(', ') })), _jsx("p", { className: "text-xs font-medium text-gray-700", children: addr.addressLine }), _jsxs("p", { className: "text-xs text-gray-500", children: [addr.locality, ", ", addr.city] }), addr.phone && (_jsxs("p", { className: "text-[11px] font-semibold text-gray-600 mt-1 flex items-center", children: [_jsx("span", { className: "mr-1", children: "\uD83D\uDCDE" }), " ", addr.phone] }))] })] }), _jsxs("div", { className: "flex items-center space-x-1.5 shrink-0", children: [addresses.length > 1 && onDeleteAddress && (_jsx("button", { type: "button", onClick: (e) => {
                                                            e.stopPropagation();
                                                            onDeleteAddress(addr.id);
                                                        }, className: "p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors", title: "Delete this address", children: _jsx(Trash2, { className: "w-4 h-4" }) })), isSelected && (_jsx("div", { className: "w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center", children: _jsx(Check, { className: "w-3.5 h-3.5 stroke-[3]" }) }))] })] }, addr.id));
                                })] }), !showAddForm ? (_jsxs("button", { id: "add-new-address-toggle-btn", onClick: () => setShowAddForm(true), className: "w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600 font-bold flex items-center justify-center space-x-2 text-sm transition-colors bg-white hover:bg-red-50/20", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "Add New Address" })] })) : (_jsxs("form", { onSubmit: handleCreateAddress, className: "p-4 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between pb-1 border-b border-gray-200", children: [_jsx("span", { className: "text-xs font-bold uppercase text-gray-800", children: "Add Address Details" }), _jsx("button", { type: "button", onClick: () => setShowAddForm(false), className: "text-xs text-gray-500 hover:text-gray-700 font-semibold", children: "Cancel" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-bold text-gray-600 uppercase mb-1.5", children: "Address Type" }), _jsx("div", { className: "grid grid-cols-4 gap-2", children: ['Hostel', 'Home', 'Work', 'Other'].map((tag) => (_jsx("button", { type: "button", onClick: () => setNewLabel(tag), className: `py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${newLabel === tag
                                                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`, children: tag }, tag))) })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-gray-700 mb-1", children: ["Your Name / Recipient Name ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, placeholder: "e.g. Rahul Sharma", value: newName, onChange: (e) => setNewName(e.target.value), className: "w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-gray-700 mb-1", children: ["Hostel Name ", _jsx("span", { className: "text-[10px] text-gray-400 font-normal", children: "(Optional)" })] }), _jsx("input", { type: "text", placeholder: "e.g. Ganga Hostel", value: newHostelName, onChange: (e) => setNewHostelName(e.target.value), className: "w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-gray-700 mb-1", children: ["Block / Wing ", _jsx("span", { className: "text-[10px] text-gray-400 font-normal", children: "(Optional)" })] }), _jsx("input", { type: "text", placeholder: "e.g. Block A", value: newBlock, onChange: (e) => setNewBlock(e.target.value), className: "w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-gray-700 mb-1", children: ["Room / Flat No. ", _jsx("span", { className: "text-[10px] text-gray-400 font-normal", children: "(Optional)" })] }), _jsx("input", { type: "text", placeholder: "e.g. Room 204", value: newRoomNo, onChange: (e) => setNewRoomNo(e.target.value), className: "w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-gray-700 mb-1", children: ["Street / Campus Gate / Landmark ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "text", required: true, placeholder: "e.g. Near University Gate 2, Campus Road", value: newLine, onChange: (e) => setNewLine(e.target.value), className: "w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold text-gray-700 mb-1", children: ["Phone Number ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("input", { type: "tel", required: true, placeholder: "e.g. +91 98765 43210", value: newPhone, onChange: (e) => setNewPhone(e.target.value), className: "w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500" })] }), _jsx("button", { type: "submit", id: "save-new-address-btn", className: "w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-colors shadow-md shadow-red-500/20 active:scale-98", children: "Save & Deliver Here" })] }))] })] }) }));
};
