/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Search, 
  UserPlus, 
  Check, 
  Trash2, 
  FileCheck, 
  Eye, 
  Plus, 
  UserCheck, 
  Calendar, 
  DollarSign, 
  MapPin, 
  FileText,
  User,
  ArrowRight,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Customer, AppState } from '../types';
import { formatINR, formatDateNice } from '../utils';

interface CustomersViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  darkMode: boolean;
}

export default function CustomersView({
  state,
  onUpdateState,
  darkMode
}: CustomersViewProps) {
  const { customers, currentUser } = state;

  // Search/filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterType, setFilterType] = React.useState<'All' | 'With Dues' | 'With Followup'>('All');
  
  // Active customer profile view
  const [activeCustId, setActiveCustId] = React.useState<string | null>(null);
  
  // Registration form state
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newPhone, setNewPhone] = React.useState('');
  const [newAadhaar, setNewAadhaar] = React.useState('');
  const [newPan, setNewPan] = React.useState('');
  const [newJanAadhaar, setNewJanAadhaar] = React.useState('');
  const [newAddress, setNewAddress] = React.useState('');
  const [newNotes, setNewNotes] = React.useState('');
  const [newDue, setNewDue] = React.useState(0);

  // Profile-specific actions (add doc, due coll, follow-up)
  const [newDocName, setNewDocName] = React.useState('');
  const [newDocType, setNewDocType] = React.useState<'Aadhaar' | 'PAN' | 'Jan Aadhaar' | 'Photo' | 'Other'>('Aadhaar');
  const [dueCollectAmt, setDueCollectAmt] = React.useState(0);
  const [followupDate, setFollowupDate] = React.useState('');
  const [followupNotes, setFollowupNotes] = React.useState('');

  const activeCustomer = customers.find(c => c.id === activeCustId);

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    if (currentUser?.role !== 'Super Admin') {
      const branchAdminId = currentUser?.role === 'Admin' 
        ? currentUser.id 
        : (state.operators.find(o => o.id === currentUser?.id)?.createdBy || 'op-1');
      if (c.createdBy && c.createdBy !== branchAdminId) {
        return false;
      }
    }

    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phoneNumber.includes(searchQuery) ||
      (c.aadhaarNumber && c.aadhaarNumber.includes(searchQuery)) ||
      (c.panNumber && c.panNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filterType === 'With Dues') {
      return matchesSearch && c.dueAmount > 0;
    }
    if (filterType === 'With Followup') {
      return matchesSearch && !!c.followUpDate;
    }
    return matchesSearch;
  });

  // Handle register customer
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const branchAdminId = currentUser?.role === 'Admin' 
      ? currentUser.id 
      : (state.operators.find(o => o.id === currentUser?.id)?.createdBy || 'op-1');

    const newCustomer: Customer = {
      id: `cust-${Date.now().toString().slice(-6)}`,
      name: newName,
      phoneNumber: newPhone,
      aadhaarNumber: newAadhaar || undefined,
      panNumber: newPan || undefined,
      janAadhaarNumber: newJanAadhaar || undefined,
      address: newAddress,
      dueAmount: Number(newDue) || 0,
      documents: [],
      notes: newNotes || undefined,
      createdAt: new Date().toISOString(),
      createdBy: branchAdminId
    };

    const updatedState: AppState = {
      ...state,
      customers: [newCustomer, ...state.customers],
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: currentUser?.role || 'Admin',
          action: `Registered Customer: ${newCustomer.name}`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'App Console',
          browser: 'Internal Portal'
        },
        ...state.securityLogs
      ]
    };

    onUpdateState(updatedState);
    
    // reset form
    setNewName('');
    setNewPhone('');
    setNewAadhaar('');
    setNewPan('');
    setNewJanAadhaar('');
    setNewAddress('');
    setNewNotes('');
    setNewDue(0);
    setIsRegistering(false);
    setActiveCustId(newCustomer.id); // auto select newly created profile
  };

  // Toggle Verification of a document
  const handleToggleDocVerify = (docUploadTime: string) => {
    if (!activeCustomer) return;

    const updatedCusts = customers.map(c => {
      if (c.id === activeCustomer.id) {
        return {
          ...c,
          documents: c.documents.map(d => 
            d.uploadedAt === docUploadTime ? { ...d, verified: !d.verified } : d
          )
        };
      }
      return c;
    });

    onUpdateState({
      ...state,
      customers: updatedCusts
    });
  };

  // Upload simulation doc
  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !newDocName) return;

    const updatedCusts = customers.map(c => {
      if (c.id === activeCustomer.id) {
        return {
          ...c,
          documents: [
            ...c.documents,
            {
              name: newDocName,
              type: newDocType,
              url: '#',
              uploadedAt: new Date().toISOString(),
              verified: false
            }
          ]
        };
      }
      return c;
    });

    onUpdateState({
      ...state,
      customers: updatedCusts
    });

    setNewDocName('');
  };

  // Collect/Pay customer due
  const handleCollectDues = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || dueCollectAmt <= 0) return;

    const updatedCusts = customers.map(c => {
      if (c.id === activeCustomer.id) {
        return {
          ...c,
          dueAmount: Math.max(0, c.dueAmount - dueCollectAmt)
        };
      }
      return c;
    });

    // Create deposit audit log back trace
    const newTxnId = `TXN${Date.now().toString().slice(-6)}`;
    const newTxn = {
      id: newTxnId,
      timestamp: new Date().toISOString(),
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      type: 'Deposit' as const,
      amount: dueCollectAmt,
      fee: 0,
      commission: 0,
      status: 'Success' as const,
      operatorId: currentUser?.id || 'op-1',
      operatorName: currentUser?.name || 'Admin',
      bankName: 'SmartSPE Branch Handheld',
      utrNumber: `COLL${Date.now().toString().slice(-8)}`,
      walletDebited: false
    };

    onUpdateState({
      ...state,
      customers: updatedCusts,
      transactions: [newTxn, ...state.transactions],
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: currentUser?.role || 'Admin',
          action: `Collected Due Amount: ₹${dueCollectAmt} from ${activeCustomer.name}`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'App Console',
          browser: 'Internal Portal'
        },
        ...state.securityLogs
      ]
    });

    setDueCollectAmt(0);
  };

  // Update followup logic
  const handleUpdateFollowup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;

    const updatedCusts = customers.map(c => {
      if (c.id === activeCustomer.id) {
        return {
          ...c,
          followUpDate: followupDate || undefined,
          followUpNotes: followupNotes || undefined
        };
      }
      return c;
    });

    onUpdateState({
      ...state,
      customers: updatedCusts
    });

    setFollowupDate('');
    setFollowupNotes('');
  };

  // Delete customer entirely
  const handleDeleteCustomer = (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this customer record?')) return;
    
    onUpdateState({
      ...state,
      customers: customers.filter(c => c.id !== id),
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: currentUser?.role || 'Admin',
          action: `Deleted customer node: ${id}`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'App Console',
          browser: 'Internal Portal'
        },
        ...state.securityLogs
      ]
    });
    
    if (activeCustId === id) {
      setActiveCustId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs sm:text-sm">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Customer Profile Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Register and manage unified citizen profiles, verify physical uploads, and collect outstanding service dues.
          </p>
        </div>
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 cursor-pointer whitespace-nowrap transition-all"
        >
          <UserPlus size={16} />
          <span>Register Customer</span>
        </button>
      </div>

      {/* Grid containing Registration Panel OR active profile, alongside Main Customer List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT/MAIN column: Customer Database Grid with search bar */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`p-4 rounded-3xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* Database controls */}
            <div className="flex flex-col md:flex-row items-center gap-3 mb-4">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by Name, Phone, Aadhaar, PAN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border outline-hidden transition-all ${
                    darkMode 
                      ? 'bg-slate-950 text-white border-slate-800 focus:border-blue-500' 
                      : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-blue-600'
                  }`}
                />
              </div>

              {/* Filtering segmented control */}
              <div className={`flex rounded-xl p-1 border w-full md:w-auto shrink-0 justify-between ${
                darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                {(['All', 'With Dues', 'With Followup'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                      filterType === t 
                        ? 'bg-blue-600 text-white' 
                        : darkMode 
                          ? 'text-slate-400 hover:text-white' 
                          : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer List table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[10px] sm:text-xs uppercase font-mono tracking-wider text-slate-400 ${
                    darkMode ? 'border-slate-800' : 'border-slate-150'
                  }`}>
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Verification Docs</th>
                    <th className="py-3 px-3 text-right">Outstanding Due</th>
                    <th className="py-3 px-3 text-right">Settings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredCustomers.map((c) => {
                    const verifiedDocsCount = c.documents.filter(d => d.verified).length;
                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => { setActiveCustId(c.id); setIsRegistering(false); }}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 cursor-pointer transition-all ${
                          activeCustId === c.id 
                            ? darkMode 
                              ? 'bg-slate-800/70 border-l-2 border-l-blue-500' 
                              : 'bg-blue-50 border-l-2 border-l-blue-600' 
                            : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white-text">{c.name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{c.phoneNumber}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono leading-none ${
                              c.documents.length === 0 
                                ? 'bg-slate-200/10 text-slate-400 border border-slate-300/10' 
                                : verifiedDocsCount === c.documents.length
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {c.documents.length === 0 
                                ? 'No documents' 
                                : `${verifiedDocsCount}/${c.documents.length} verified`}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`font-mono font-bold font-display ${c.dueAmount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                            {formatINR(c.dueAmount)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => { setActiveCustId(c.id); setIsRegistering(false); }}
                              className={`p-1.5 rounded-md transition-colors ${
                                darkMode ? 'hover:bg-slate-800 text-slate-450 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-950'
                              }`}
                              title="Inspect Workspace"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(c.id)}
                              className={`p-1.5 rounded-md text-slate-400 hover:text-rose-500 transition-colors ${
                                darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                              }`}
                              title="Delete Record"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-400 italic">
                        No customers matched your filter query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Workspaces */}
        <div className="space-y-4">
          
          {/* Option A: Registration Panel Form */}
          {isRegistering && (
            <div className={`p-5 rounded-3xl border animate-fade-in ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-inherit">
                <h3 className="font-bold text-base font-display flex items-center gap-2">
                  <UserPlus size={18} className="text-blue-600" />
                  <span>Citizen Registration</span>
                </h3>
                <button 
                  onClick={() => setIsRegistering(false)} 
                  className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  ✕
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter full name"
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-hidden transition-all ${
                      darkMode ? 'bg-slate-950 text-white border-slate-800 focus:border-blue-500' : 'bg-slate-50 text-slate-900 border-slate-300 focus:focus:border-blue-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Mobile Phone Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile number"
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-hidden transition-all ${
                      darkMode ? 'bg-slate-950 text-white border-slate-800 focus:border-blue-500' : 'bg-slate-50 text-slate-900 border-slate-300 focus:focus:border-blue-600'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Aadhaar ID</label>
                    <input
                      type="text"
                      value={newAadhaar}
                      onChange={(e) => setNewAadhaar(e.target.value)}
                      placeholder="XXXX-XXXX-XXXX"
                      className={`w-full px-3 py-1.5 rounded-xl text-xs border outline-hidden transition-all ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-55 border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">PAN Card ID</label>
                    <input
                      type="text"
                      value={newPan}
                      onChange={(e) => setNewPan(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      className={`w-full px-3 py-1.5 rounded-xl text-xs border outline-hidden transition-all ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-55 border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Jan Aadhaar Number</label>
                  <input
                    type="text"
                    value={newJanAadhaar}
                    onChange={(e) => setNewJanAadhaar(e.target.value)}
                    placeholder="E.g. XXXX-XXXX-XXXX"
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden transition-all ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-55 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Full Permanent Address</label>
                  <textarea
                    rows={2}
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Village, Tehsil, District, PIN code"
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden transition-all ${
                      darkMode ? 'bg-slate-950 border-slate-800 focus:border-blue-500' : 'bg-slate-55 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Initial Outstanding Due</label>
                    <input
                      type="number"
                      value={newDue}
                      onChange={(e) => setNewDue(Number(e.target.value))}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs border outline-hidden ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-55 border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Operator Notes</label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Remarks"
                      className={`w-full px-3 py-1.5 rounded-xl text-xs border outline-hidden ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-55 border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Write to Ledger DB
                </button>
              </form>
            </div>
          )}

          {/* Option B: Active Profile workspace view */}
          {activeCustomer && !isRegistering && (
            <div className={`p-5 rounded-3xl border animate-fade-in space-y-5 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              
              {/* Profile Card Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-display font-black text-lg">
                    {activeCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-base font-display tracking-tight text-slate-900 dark:text-white">
                      {activeCustomer.name}
                    </h4>
                    <p className="font-mono text-xs text-slate-400">
                      {activeCustomer.phoneNumber}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveCustId(null)} 
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Close Workspace"
                >
                  ✕
                </button>
              </div>

              {/* Profile details text */}
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-2xl">
                {activeCustomer.address && (
                  <p className="flex items-start gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{activeCustomer.address}</span>
                  </p>
                )}
                {activeCustomer.aadhaarNumber && (
                  <p className="flex justify-between items-center">
                    <span className="opacity-75">Aadhaar ID:</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{activeCustomer.aadhaarNumber}</span>
                  </p>
                )}
                {activeCustomer.panNumber && (
                  <p className="flex justify-between items-center">
                    <span className="opacity-75">PAN Number:</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{activeCustomer.panNumber}</span>
                  </p>
                )}
                {activeCustomer.janAadhaarNumber && (
                  <p className="flex justify-between items-center">
                    <span className="opacity-75">Jan Aadhaar ID:</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{activeCustomer.janAadhaarNumber}</span>
                  </p>
                )}
                {activeCustomer.notes && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800 text-[11px] italic text-slate-400">
                    "{activeCustomer.notes}"
                  </div>
                )}
              </div>

              {/* Outstanding ledger collecting */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-amber-500 flex items-center gap-1">
                    <DollarSign size={14} /> Outstanding Balance
                  </span>
                  <span className="font-mono font-extrabold text-amber-500 text-sm">{formatINR(activeCustomer.dueAmount)}</span>
                </div>
                
                {activeCustomer.dueAmount > 0 && (
                  <form onSubmit={handleCollectDues} className="flex gap-2">
                    <div className="relative w-full">
                      <span className="absolute left-2.5 top-2 opacity-50 font-mono">₹</span>
                      <input
                        type="number"
                        min={1}
                        max={activeCustomer.dueAmount}
                        placeholder="Collect amt"
                        required
                        value={dueCollectAmt === 0 ? '' : dueCollectAmt}
                        onChange={(e) => setDueCollectAmt(Number(e.target.value))}
                        className={`w-full pl-6 pr-2 py-1.5 rounded-lg text-xs border outline-hidden ${
                          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs cursor-pointer whitespace-nowrap transition-colors"
                    >
                      Receive Cash
                    </button>
                  </form>
                )}
              </div>

              {/* Dynamic Follow-up reminder */}
              <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/15 space-y-2.5">
                <h5 className="font-bold text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Calendar size={14} /> 
                  <span>Active Follow-up Reminder</span>
                </h5>
                
                {activeCustomer.followUpDate ? (
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="opacity-75">Target Date:</span>
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{formatDateNice(activeCustomer.followUpDate)}</span>
                    </div>
                    <p className="text-slate-400 italic font-medium leading-normal bg-white dark:bg-slate-950 p-1.5 rounded-lg">
                      "{activeCustomer.followUpNotes}"
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No reminders scheduled for this client.</p>
                )}

                <form onSubmit={handleUpdateFollowup} className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={followupDate}
                      onChange={(e) => setFollowupDate(e.target.value)}
                      className={`px-2 py-1.5 rounded-lg text-xs border outline-hidden ${
                        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                      }`}
                    />
                    <input
                      type="text"
                      required
                      placeholder="Followup Notes..."
                      value={followupNotes}
                      onChange={(e) => setFollowupNotes(e.target.value)}
                      className={`px-2 py-1.5 rounded-lg text-xs border outline-hidden ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-600 font-bold rounded-lg text-xs transition-colors"
                  >
                    Schedule Reminder
                  </button>
                </form>
              </div>

              {/* Documents uploads section with Real-time Verification Toggle */}
              <div className="space-y-3">
                <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
                  Verification Records
                </h5>
                
                {/* Upload simulation form */}
                <form onSubmit={handleUploadDoc} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="E.g. Aadhaar Copy"
                    required
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className={`w-full px-2 py-1.5 rounded-lg text-xs border outline-hidden ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                    }`}
                  />
                  <select
                    value={newDocType}
                    onChange={(e: any) => setNewDocType(e.target.value)}
                    className={`px-1 rounded-lg text-xs border outline-hidden ${
                      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="Aadhaar">Aadhaar</option>
                    <option value="PAN">PAN</option>
                    <option value="Jan Aadhaar">Jan Aadhaar</option>
                    <option value="Photo">Photo</option>
                    <option value="Other">Other</option>
                  </select>
                  <button
                    type="submit"
                    className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    title="Add document"
                  >
                    <Plus size={16} />
                  </button>
                </form>

                {/* Uploaded documents lists */}
                <div className="space-y-2">
                  {activeCustomer.documents.map((doc) => (
                    <div 
                      key={doc.uploadedAt} 
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        doc.verified 
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-800 dark:text-slate-100' 
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        <div>
                          <p className="font-semibold leading-none">{doc.name}</p>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{doc.type}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleDocVerify(doc.uploadedAt)}
                        className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer select-none border transition-colors ${
                          doc.verified 
                            ? 'bg-emerald-600 text-white border-emerald-500' 
                            : 'bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-500 border-amber-500/30'
                        }`}
                      >
                        {doc.verified ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                        <span>{doc.verified ? 'Verified' : 'Verify'}</span>
                      </button>
                    </div>
                  ))}
                  
                  {activeCustomer.documents.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic text-center py-4">No documents uploaded yet.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Fallback space explaining profile selecting */}
          {!activeCustomer && !isRegistering && (
            <div className={`p-8 rounded-3xl border text-center space-y-2 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 font-display flex items-center justify-center text-slate-400 mx-auto">
                <User size={20} />
              </div>
              <h4 className="font-semibold text-sm">Customer Profile Workspace</h4>
              <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto">
                Select any registered citizen from the directory to inspect documents, collect dues, or schedule follow-up notes.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
