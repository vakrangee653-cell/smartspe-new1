/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ClipboardList, 
  Search, 
  Clock, 
  CheckSquare, 
  Square, 
  Plus, 
  UserCheck, 
  Calendar, 
  AlertTriangle, 
  Sliders, 
  CheckCircle,
  Truck,
  Trash2,
  Bookmark,
  Building,
  UserPlus
} from 'lucide-react';
import { AppState, OfflineWorkItem } from '../types';
import { formatINR, formatDateNice } from '../utils';

interface OfflineViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  darkMode: boolean;
  activePreAction?: string | null;
  onClearPreAction?: () => void;
}

export const OFFLINE_SERVICES_FALLBACK = {
  'Photocopy (फोटोकॉपी)': { label: 'Photocopy (फोटोकॉपी)', defaultFee: 5, defaultCost: 1 },
  'Lamination (लेमिनेशन)': { label: 'Lamination (लेमिनेशन)', defaultFee: 30, defaultCost: 5 },
  'Aadhaar Print (आधार प्रिंट)': { label: 'Aadhaar Print (आधार प्रिंट)', defaultFee: 50, defaultCost: 10 },
  'Form Filling (फॉर्म भरना)': { label: 'Form Filling (फॉर्म भरना)', defaultFee: 50, defaultCost: 0 },
  'File Print (फाइल प्रिंट)': { label: 'File Print (फाइल प्रिंट)', defaultFee: 15, defaultCost: 2 },
  'Recharge & Bill (रिचार्ज एवं बिल)': { label: 'Recharge & Bill (रिचार्ज एवं बिल)', defaultFee: 100, defaultCost: 98 },
  'Other Offline Service (अन्य ऑफ़लाइन कार्य)': { label: 'Other Offline Service (अन्य ऑफ़लाइन कार्य)', defaultFee: 40, defaultCost: 5 }
};
export type OfflineServiceType = string;

export default function OfflineView({
  state,
  onUpdateState,
  darkMode,
  activePreAction,
  onClearPreAction
}: OfflineViewProps) {
  const currUser = state.currentUser;

  // RBAC Access Filter for Offline Work items
  const offlineWork = React.useMemo(() => {
    if (!currUser) return state.offlineWork;
    if (currUser.role === 'Super Admin') return state.offlineWork;
    if (currUser.role === 'Admin') {
      const myOpIds = state.operators.filter(op => op.createdBy === currUser.id || op.id === currUser.id).map(op => op.id);
      return state.offlineWork.filter(w => w.createdBy === currUser.id || w.operatorId === currUser.id || myOpIds.includes(w.operatorId));
    }
    return state.offlineWork.filter(w => w.operatorId === currUser.id);
  }, [state.offlineWork, state.operators, currUser]);

  const { customers, currentUser, wallet, commissionSettings } = state;

  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState<'All' | 'File Received' | 'Checking' | 'Processing' | 'Ready for Delivery' | 'Delivered' | 'In Process' | 'Completed' | 'Uncompleted'>('All');

  // Form states
  const [isRegistering, setIsRegistering] = React.useState(true);
  const [guestName, setGuestName] = React.useState('');
  const [guestPhone, setGuestPhone] = React.useState('');

  const OFFLINE_SERVICES_LIST = React.useMemo(() => {
    return Object.keys(commissionSettings.offlineFees || {});
  }, [commissionSettings.offlineFees]);

  const [selectedService, setSelectedService] = React.useState<string>('Photocopy (फोटोकॉपी)');
  const [initialStatus, setInitialStatus] = React.useState<OfflineWorkItem['status']>('File Received');
  const [paymentMode, setPaymentMode] = React.useState<'Cash' | 'Online'>('Cash');
  const [workDesc, setWorkDesc] = React.useState('');
  const [docsReceivedStr, setDocsReceivedStr] = React.useState('');
  const [pendingStepsStr, setPendingStepsStr] = React.useState('');
  const [totalCharged, setTotalCharged] = React.useState<number>(5);
  const [amountCollected, setAmountCollected] = React.useState<number>(5);
  const [baseCost, setBaseCost] = React.useState<number>(1);
  const [isDeductedFromWallet, setIsDeductedFromWallet] = React.useState(false);
  const [targetFollowup, setTargetFollowup] = React.useState('');

  // Sync selectedService to ensure it represents an existing service type
  React.useEffect(() => {
    if (OFFLINE_SERVICES_LIST.length > 0 && !OFFLINE_SERVICES_LIST.includes(selectedService)) {
      setSelectedService(OFFLINE_SERVICES_LIST[0]);
    }
  }, [OFFLINE_SERVICES_LIST, selectedService]);

  // Sync default values whenever selected service changes for rapid entry
  React.useEffect(() => {
    if (!selectedService) return;
    const defaultFee = commissionSettings.offlineFees?.[selectedService] ?? 40;
    const defaultCost = commissionSettings.offlineCosts?.[selectedService] ?? 5;
    setTotalCharged(defaultFee);
    setAmountCollected(defaultFee);
    setBaseCost(defaultCost);
    if (selectedService === 'Recharge & Bill (रिचार्ज एवं बिल)') {
      setIsDeductedFromWallet(true);
    } else {
      setIsDeductedFromWallet(false);
    }
  }, [selectedService, commissionSettings.offlineFees, commissionSettings.offlineCosts]);

  // Auto trigger form if preset from dashboard
  React.useEffect(() => {
    if (activePreAction === 'offline_add') {
      setIsRegistering(true);
      if (onClearPreAction) onClearPreAction();
    }
  }, [activePreAction]);

  // Handle register a received physical document
  const handleReceiveFile = (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName || !guestPhone) {
      alert("Please specify customer name and mobile phone.");
      return;
    }

    const calculatedIncome = Math.max(0, totalCharged - baseCost);
    const calculatedDue = Math.max(0, totalCharged - amountCollected);

    // Validate wallet balance if paying right now & deduct wallet check is true
    if (isDeductedFromWallet && wallet.balance < baseCost) {
      alert(`Insufficient branch wallet balance to process material/service base cost. Available: ${formatINR(wallet.balance)}, required: ${formatINR(baseCost)}.`);
      return;
    }

    // Split document inputs and steps by commas
    const docs = docsReceivedStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const steps = pendingStepsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const branchAdminId = currentUser?.role === 'Admin' 
      ? currentUser.id 
      : (state.operators.find(o => o.id === currentUser?.id)?.createdBy || 'op-1');

    const newOfflineItem: OfflineWorkItem = {
      id: `OFF-${Math.floor(1000 + Math.random() * 8999)}`,
      receivedDate: new Date().toISOString(),
      customerName: guestName,
      phoneNumber: guestPhone,
      workDescription: workDesc,
      documentsReceived: docs,
      pendingSteps: steps,
      status: initialStatus,
      dueAmount: calculatedDue,
      operatorId: currentUser?.id || 'op-1',
      followUpDate: targetFollowup || undefined,
      serviceType: selectedService,
      totalCharged: totalCharged,
      baseCost: baseCost,
      commissionEarned: calculatedIncome,
      amountCollected: amountCollected,
      paymentMode: paymentMode,
      createdBy: branchAdminId
    };

    // Calculate wallet changes
    const updatedWallet = {
      ...wallet,
      balance: isDeductedFromWallet ? wallet.balance - baseCost : wallet.balance,
      totalCommissionEarned: wallet.totalCommissionEarned + calculatedIncome,
      lastUpdated: new Date().toISOString()
    };

    // Calculate AEPS Wallet changes (Cash In Hand or Online UPI/Bank)
    const updatedAepsWallet = {
      ...state.aepsWallet,
      physicalBalance: paymentMode === 'Cash'
        ? state.aepsWallet.physicalBalance + amountCollected
        : state.aepsWallet.physicalBalance,
      onlineBalance: paymentMode === 'Online'
        ? state.aepsWallet.onlineBalance + amountCollected
        : state.aepsWallet.onlineBalance,
      lastUpdated: new Date().toISOString()
    };

    // If due exists, write back to customer due list by matching phone number
    let updatedCusts = [...customers];
    if (calculatedDue > 0) {
      const cleanPhone = guestPhone.replace(/\D/g, '');
      const match = customers.find(c => c.phoneNumber.replace(/\D/g, '') === cleanPhone);
      if (match) {
        updatedCusts = customers.map(c => 
          c.id === match.id ? { ...c, dueAmount: c.dueAmount + calculatedDue } : c
        );
      }
    }

    const updatedState: AppState = {
      ...state,
      offlineWork: [newOfflineItem, ...offlineWork],
      wallet: updatedWallet,
      aepsWallet: updatedAepsWallet,
      customers: updatedCusts,
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: currentUser?.role || 'Admin',
          action: `Offline Job - Charged: ${formatINR(totalCharged)}, Paid: ${formatINR(amountCollected)}, Profit: ${formatINR(calculatedIncome)}, Due: ${formatINR(calculatedDue)}`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'App Console',
          browser: 'Internal Portal'
        },
        ...state.securityLogs
      ]
    };

    onUpdateState(updatedState);

    // Reset
    setGuestName('');
    setGuestPhone('');
    setWorkDesc('');
    setInitialStatus('File Received');
    setPaymentMode('Cash');
     setDocsReceivedStr('');
     setPendingStepsStr('');
    setTargetFollowup('');
    
    const defaultFee = commissionSettings.offlineFees?.['Photocopy (फोटोकॉपी)'] ?? 5;
    const defaultCost = commissionSettings.offlineCosts?.['Photocopy (फोटोकॉपी)'] ?? 1;
    setTotalCharged(defaultFee);
    setAmountCollected(defaultFee);
    setBaseCost(defaultCost);
    setIsDeductedFromWallet(false);
    setIsRegistering(false);

    alert(`Successfully registered offline job ID: ${newOfflineItem.id}. Profit of ${formatINR(calculatedIncome)} added to branch income.`);
  };

  // Check off or close pending step
  const handleToggleStep = (itemId: string, stepIndex: number) => {
    const updatedWork = offlineWork.map(item => {
      if (item.id === itemId) {
        const remainingSteps = item.pendingSteps.filter((_, idx) => idx !== stepIndex);
        return {
          ...item,
          pendingSteps: remainingSteps,
          // If no more pending steps, auto switch status to Ready for Delivery
          status: remainingSteps.length === 0 ? 'Ready for Delivery' as const : item.status
        };
      }
      return item;
    });

    onUpdateState({
      ...state,
      offlineWork: updatedWork
    });
  };

  // Add extra custom step dynamically
  const handleAddDynamicStep = (itemId: string, newStepText: string) => {
    if (!newStepText.trim()) return;
    
    onUpdateState({
      ...state,
      offlineWork: offlineWork.map(item => 
        item.id === itemId 
          ? { ...item, pendingSteps: [...item.pendingSteps, newStepText.trim()] } 
          : item
      )
    });
  };

  // Update physical Delivery Status
  const handleUpdateDeliveryStatus = (itemId: string, status: OfflineWorkItem['status']) => {
    const updatedWork = offlineWork.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status,
          deliveryDate: status === 'Delivered' ? new Date().toISOString() : item.deliveryDate,
          // If marked successfully delivered, set residual dues to zero assuming collected!
          dueAmount: status === 'Delivered' ? 0 : item.dueAmount
        };
      }
      return item;
    });

    onUpdateState({
      ...state,
      offlineWork: updatedWork
    });
  };

  // Delete ledger completely
  const handleDeleteOfflineNode = (id: string) => {
    if (!window.confirm('Delete physical register record entirely?')) return;
    onUpdateState({
      ...state,
      offlineWork: offlineWork.filter(w => w.id !== id)
    });
  };

  // filter
  const filteredWork = offlineWork.filter(item => {
    const matchesSearch = 
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.workDescription.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in text-xs sm:text-sm">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Physical File & Document Register
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control physical files received at the branch, track verification checklists, schedule follow-ups, and transition delivery states.
          </p>
        </div>
        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 cursor-pointer whitespace-nowrap transition-all"
        >
          <ClipboardList size={16} />
          <span>File Receiving Form</span>
        </button>
      </div>

      {/* Stacked Layouts: Form on top (order-1), Register list at the bottom (order-2) */}
      <div className="flex flex-col gap-6">
        
        {/* LEFT COLUMN: Offline database listings with checkoffs */}
        <div className="order-2 space-y-4 w-full">
          <div className={`p-5 rounded-3xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            {/* Header controls */}
            <div className="flex flex-col md:flex-row items-center gap-3 mb-5">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Search file description, citizen, reference code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm border outline-hidden ${
                    darkMode ? 'bg-slate-950 text-white border-slate-800 focus:border-blue-500' : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-blue-605'
                  }`}
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e: any) => setFilterStatus(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border outline-hidden shrink-0 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-705'
                }`}
              >
                <option value="All">All Delivery States</option>
                <option value="File Received">File Received</option>
                <option value="Checking">Checking</option>
                <option value="Processing">Processing</option>
                <option value="In Process">In Process (Procece)</option>
                <option value="Ready for Delivery">Ready for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Completed">Completed (Complit)</option>
                <option value="Uncompleted">Uncompleted (Uncomplit)</option>
              </select>
            </div>

            {/* Offline file workflow cards (NOT simple tables, bento layout blocks are more interactive!) */}
            <div className="space-y-4 max-h-165 overflow-y-auto pr-1">
              {filteredWork.map((item, idx) => (
                <div 
                  key={`${item.id}-${idx}`}
                  className={`p-4 rounded-2xl border transition-all duration-300 space-y-3 relative group ${
                    item.status === 'Delivered' 
                      ? 'bg-slate-50/50 dark:bg-slate-950/20 opacity-75 border-slate-200 dark:border-slate-800/60' 
                      : item.status === 'Ready for Delivery'
                        ? 'bg-blue-500/5 border-blue-500'
                        : darkMode 
                          ? 'bg-slate-950 border-slate-800/80 hover:border-slate-750' 
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
                  }`}
                >
                  <button
                    onClick={() => handleDeleteOfflineNode(item.id)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Record"
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* Row 1: Header tags */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Bookmark size={14} className="text-blue-500" />
                      <span className="font-mono font-bold text-slate-900 dark:text-white-text">{item.id}</span>
                      <span className="text-slate-400 font-medium">|</span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                        <Clock size={11} />
                        <span>Received: {formatDateNice(item.receivedDate)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                                       <div className="flex items-center gap-1.5">
                        <Truck size={12} className="text-slate-400" />
                        <select
                          value={item.status}
                          onChange={(e: any) => handleUpdateDeliveryStatus(item.id, e.target.value)}
                          className={`p-1 rounded-md text-[10px] font-bold border outline-hidden ${
                            item.status === 'Delivered' || item.status === 'Completed'
                              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20' 
                              : item.status === 'Ready for Delivery'
                                ? 'bg-blue-600 text-white border-blue-500'
                                : item.status === 'In Process' || item.status === 'Processing'
                                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                  : item.status === 'Uncompleted'
                                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}
                        >
                          <option value="File Received">File Received</option>
                          <option value="Checking">Checking</option>
                          <option value="Processing">Processing</option>
                          <option value="In Process">In Process (Procece)</option>
                          <option value="Ready for Delivery">Ready for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Completed">Completed (Complit)</option>
                          <option value="Uncompleted">Uncompleted (Uncomplit)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Customer info and description */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Citizen Profile</span>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{item.customerName}</p>
                        <p className="font-mono text-[10px] text-slate-400">{item.phoneNumber}</p>
                        {item.serviceType ? (
                          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-sm bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-[9px] uppercase">
                            ⚙️ {item.serviceType}
                          </span>
                        ) : (
                          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium text-[9px] uppercase">
                            📁 Physical File
                          </span>
                        )}
                      </div>
                      
                      {item.followUpDate && (
                        <div className="mt-2 text-[10px] text-blue-500 flex items-center gap-1 font-medium pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <Calendar size={11} />
                          <span>Follow-up: {formatDateNice(item.followUpDate)}</span>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-1 space-y-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">File Description</span>
                      <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed text-xs mt-0.5">{item.workDescription}</p>
                      

                    </div>

                    <div className="md:col-span-1 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Financial Summary</span>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">Total Bill:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {item.totalCharged !== undefined ? formatINR(item.totalCharged) : formatINR(item.dueAmount || 0)}
                        </span>
                      </div>
                      {item.baseCost !== undefined && (
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500">Base Cost:</span>
                          <span className="font-mono text-slate-500">
                            {formatINR(item.baseCost)}
                          </span>
                        </div>
                      )}
                      {item.commissionEarned !== undefined && (
                        <div className="flex justify-between items-center text-[10px] border-t border-slate-100 dark:border-slate-800 pt-1">
                          <span className="text-emerald-500 font-semibold">Sub profit:</span>
                          <span className="font-mono font-bold text-emerald-500">
                            +{formatINR(item.commissionEarned)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[10px] border-t border-slate-100 dark:border-slate-800 pt-1">
                        <span className="text-slate-400">Amt Paid:</span>
                        <span className="font-mono text-blue-500 font-semibold">
                          {item.amountCollected !== undefined ? formatINR(item.amountCollected) : formatINR((item.totalCharged || 0) - (item.dueAmount || 0))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">Mode:</span>
                        <span className={`px-1 rounded text-[9px] font-bold ${
                          item.paymentMode === 'Online'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {item.paymentMode || 'Cash'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery completed marker */}
                  {item.status === 'Delivered' && (
                    <div className="text-[11px] font-medium text-emerald-500 flex items-center gap-1 bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/15">
                      ✓ Handed over physically to client on {item.deliveryDate ? formatDateNice(item.deliveryDate) : 'Recently'}. Residual ledger balance cleared automatically.
                    </div>
                  )}

                </div>
              ))}

              {filteredWork.length === 0 && (
                <p className="text-center py-10 text-slate-400 italic bg-white dark:bg-slate-900 border rounded-3xl">
                  No registered physical files found under this category.
                </p>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: File Receiving Form Desk */}
        <div className="order-1 space-y-4 max-w-4xl mx-auto w-full">
          
          {isRegistering && (
            <div className={`p-6 rounded-3xl border animate-fade-in ${
              darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-950'
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-dashed border-slate-200 dark:border-slate-800 mb-5">
                <h3 className="font-bold text-base font-display flex items-center gap-2">
                  <ClipboardList size={18} className="text-blue-605 text-blue-500" />
                  <span>Offline Service Desk</span>
                </h3>
                <button onClick={() => setIsRegistering(false)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  ✕
                </button>
              </div>

              <form onSubmit={handleReceiveFile} className="space-y-4 text-xs">
                {/* Name & Contact Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Customer / Applicant Name *</label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="E.g. Rajesh Kumar"
                      className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Mobile Contact Phone *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit number"
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>

                {/* Service type & Status Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Select Offline Service *</label>
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value as OfflineServiceType)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                      }`}
                    >
                      {OFFLINE_SERVICES_LIST.map(serviceName => (
                        <option key={serviceName} value={serviceName}>{serviceName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Work Status *</label>
                    <select
                      value={initialStatus}
                      onChange={(e: any) => setInitialStatus(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                      }`}
                    >
                      <option value="File Received">File Received</option>
                      <option value="Checking">Checking</option>
                      <option value="Processing">Processing</option>
                      <option value="In Process">In Process (Procece)</option>
                      <option value="Ready for Delivery">Ready for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Completed">Completed (Complit)</option>
                      <option value="Uncompleted">Uncompleted (Uncomplit)</option>
                    </select>
                  </div>
                </div>

                {/* Task Work Description */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Task & Work Description *</label>
                  <textarea
                    required
                    rows={2}
                    value={workDesc}
                    onChange={(e) => setWorkDesc(e.target.value)}
                    placeholder="E.g. colored copy of 12th Marksheet and Aadhaar card list..."
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>



                {/* Bill Inputs Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Total Bill Charged to Customer (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={totalCharged === 0 ? '' : totalCharged}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTotalCharged(val);
                        setAmountCollected(val);
                      }}
                      placeholder="Total Charged"
                      className={`w-full px-3 py-2 rounded-xl border outline-hidden font-mono font-bold transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Amount Actually Paid / Collected (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={amountCollected === 0 ? '' : amountCollected}
                      onChange={(e) => setAmountCollected(Number(e.target.value))}
                      placeholder="Amount Received"
                      className={`w-full px-3 py-2 rounded-xl border outline-hidden font-mono font-semibold transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Payment Mode / भुगतान का माध्यम *</label>
                    <select
                      value={paymentMode}
                      onChange={(e: any) => setPaymentMode(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border outline-hidden font-semibold transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                      }`}
                    >
                      <option value="Cash">Cash (कैश)</option>
                      <option value="Online">Online (ऑनलाइन UPI/Bank)</option>
                    </select>
                  </div>
                </div>

                {/* Base Cost / Wallet deduction */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Base / Government Material Cost (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={baseCost === 0 ? '' : baseCost}
                      onChange={(e) => setBaseCost(Number(e.target.value))}
                      placeholder="Raw Cost"
                      className={`w-full px-3 py-2 rounded-xl border outline-hidden font-mono transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Target Follow-Up Date (Optional)</label>
                    <input
                      type="date"
                      value={targetFollowup}
                      onChange={(e) => setTargetFollowup(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border outline-hidden transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>

                {/* Deduct Base Material Cost from wallet */}
                <div className="flex items-center pt-1.5 pb-1">
                  <label htmlFor="deduct_offline_wallet_chk" className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDeductedFromWallet}
                      disabled={selectedService === 'Recharge & Bill (रिचार्ज एवं बिल)'}
                      onChange={(e) => setIsDeductedFromWallet(e.target.checked)}
                      className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-75"
                      id="deduct_offline_wallet_chk"
                    />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {selectedService === 'Recharge & Bill (रिचार्ज एवं बिल)' ? (
                        <span className="text-blue-500 font-bold">
                          Deduct recharge base cost ({formatINR(baseCost)}) automatically from CSP Wallet (इस सेवा के लिए वॉलेट से काटा जाएगा)
                        </span>
                      ) : (
                        `Deduct base cost (${formatINR(baseCost)}) from branch wallet`
                      )}
                    </span>
                  </label>
                </div>

                {/* Profit/Yield analysis box similar to eMitra */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl space-y-2.5 leading-relaxed">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Customer Bill Charged:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {formatINR(totalCharged)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Minus Base Cost:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">
                      -{formatINR(baseCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
                    <span className="text-emerald-500 font-bold">Seh Rashi (Your Income):</span>
                    <span className="font-mono font-extrabold text-emerald-500 block text-sm">
                      +{formatINR(Math.max(0, totalCharged - baseCost))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
                    <span className="text-slate-400 font-medium font-semibold">Amount Paid Cash:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {formatINR(amountCollected)}
                    </span>
                  </div>
                  {totalCharged - amountCollected > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-amber-500 font-bold">Udhaar / Outstanding Due:</span>
                      <span className="font-mono font-bold text-amber-500">
                        {formatINR(totalCharged - amountCollected)}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/15 cursor-pointer text-center text-xs transition-colors"
                >
                  Write to Offline File Register
                </button>
              </form>
            </div>
          )}

          {!isRegistering && (
            <div className={`p-8 rounded-3xl border text-center space-y-3 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                <Sliders size={22} />
              </div>
              <h4 className="font-semibold text-sm">Task Dispatch Center</h4>
              <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
                Use the upper "File Receiving Form" button to check-in offline paper requests. Once resolved, transitioning delivery states triggers automatic data updates and notifies billing ledgers.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
