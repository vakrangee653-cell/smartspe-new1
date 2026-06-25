/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Layers, 
  Search, 
  FileCheck, 
  Hourglass, 
  CheckCircle, 
  XCircle, 
  Clock, 
  CornerDownRight, 
  Plus, 
  DollarSign, 
  Building, 
  UserCheck, 
  Globe,
  Settings,
  ShieldAlert,
  Loader,
  Share2,
  Printer,
  Wallet,
  Sparkles
} from 'lucide-react';
import { AppState, EmitraApplication, EmitraServiceType } from '../types';
import { formatINR, formatDateNice } from '../utils';

interface EmitraViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  darkMode: boolean;
  activePreAction?: string | null;
  onClearPreAction?: () => void;
}

export default function EmitraView({
  state,
  onUpdateState,
  darkMode,
  activePreAction,
  onClearPreAction
}: EmitraViewProps) {
  const currUser = state.currentUser;

  // RBAC Access Filter for eMitra Applications
  const emitraApplications = React.useMemo(() => {
    if (!currUser) return state.emitraApplications;
    if (currUser.role === 'Super Admin') return state.emitraApplications;
    if (currUser.role === 'Admin') {
      const myOpIds = state.operators.filter(op => op.createdBy === currUser.id || op.id === currUser.id).map(op => op.id);
      return state.emitraApplications.filter(a => a.createdBy === currUser.id || a.operatorId === currUser.id || myOpIds.includes(a.operatorId));
    }
    return state.emitraApplications.filter(a => a.operatorId === currUser.id);
  }, [state.emitraApplications, state.operators, currUser]);

  const { customers, currentUser, commissionSettings, wallet } = state;
  const emitraWallet = state.emitraWallet || { balance: 25000, lastUpdated: new Date().toISOString() };

  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterType, setFilterType] = React.useState<'All' | EmitraServiceType>('All');
  const [filterStatus, setFilterStatus] = React.useState<'All' | 'Pending' | 'Submitted' | 'In Process' | 'Completed' | 'Uncompleted' | 'Rejected'>('All');

  // Form trigger - default to true for instant fast entry
  const [isApplying, setIsApplying] = React.useState(true);

  // Form states
  const [guestName, setGuestName] = React.useState('');
  const [guestPhone, setGuestPhone] = React.useState('');
  const [selectedService, setSelectedService] = React.useState<EmitraServiceType>('Jan Aadhaar Services');
  const [initialStatus, setInitialStatus] = React.useState<EmitraApplication['status']>('Submitted');
  const [paymentMode, setPaymentMode] = React.useState<'Cash' | 'Online'>('Cash');
  const [applNotes, setApplNotes] = React.useState('');
  const [totalCharged, setTotalCharged] = React.useState<number>(155);
  const [amountCollected, setAmountCollected] = React.useState<number>(155);
  const [isDeductedFromWallet, setIsDeductedFromWallet] = React.useState(true);

  // Auto trigger form if preset from dashboard
  React.useEffect(() => {
    if (activePreAction === 'emitra_apply') {
      setIsApplying(true);
      if (onClearPreAction) onClearPreAction();
    }
  }, [activePreAction]);

  const SERVICE_TYPES: string[] = React.useMemo(() => {
    return Object.keys(commissionSettings.emitraRates || {});
  }, [commissionSettings.emitraRates]);

  // Define dynamic service fees mapping
  const SERVICE_FEES = React.useMemo(() => {
    const feesMap: Record<string, { fee: number; listDocs: string[] }> = {};
    SERVICE_TYPES.forEach((service) => {
      const baseFee = commissionSettings.emitraFees?.[service] ?? 100;
      let listDocs = ['Aadhaar copy', 'Applicant photo'];
      if (service === 'Jan Aadhaar Services') listDocs = ['Old Aadhaar copy', 'Jan Aadhaar Copy', 'LTI photo'];
      else if (service === 'Birth Certificate') listDocs = ['Hospital discharge report', 'Mother/Father ID Card'];
      else if (service === 'Income Certificate') listDocs = ['Form I&II physically verified', 'Tehsildar report', 'Land Jamabandi Copy'];
      else if (service === 'Caste Certificate') listDocs = ['Land report 1950 proof', 'Ration card copy', 'Affidavit signature'];
      else if (service === 'Residence Certificate') listDocs = ['Panchayat residence verification', 'Gas bill/Water bill copy', 'Voter Card'];
      else if (service === 'Ayushman Card') listDocs = ['Jan Aadhaar card copy', 'Aadhaar copy', 'Mobile OTP authorization'];
      else if (service === 'PAN Card Services') listDocs = ['Aadhaar card copy', 'Two passport physical photos', 'PAN offline form'];
      else if (service === 'Utility Bill Services') listDocs = ['Electricity bill copy', 'Payment invoice reference'];
      else if (service === 'Government Application') listDocs = ['Custom application form with officer stamp', 'Aadhaar'];

      feesMap[service] = {
        fee: baseFee,
        listDocs
      };
    });
    return feesMap;
  }, [SERVICE_TYPES, commissionSettings.emitraFees]);

  // Sync selectedService to ensure it represents an existing service type
  React.useEffect(() => {
    if (SERVICE_TYPES.length > 0 && !SERVICE_TYPES.includes(selectedService)) {
      setSelectedService(SERVICE_TYPES[0]);
    }
  }, [SERVICE_TYPES, selectedService]);

  // Sync default fee + commission rate whenever selected service changes for rapid entry
  React.useEffect(() => {
    if (!selectedService || !SERVICE_FEES[selectedService]) return;
    const fee = SERVICE_FEES[selectedService].fee;
    const comm = commissionSettings.emitraRates[selectedService] || 35;
    const defaultTotal = fee + comm;
    setTotalCharged(defaultTotal);
    setAmountCollected(defaultTotal);
  }, [selectedService, SERVICE_FEES, commissionSettings.emitraRates]);

  const handleCreateApplication = (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName || !guestPhone) {
      alert("Please specify applicant name and mobile phone.");
      return;
    }

    const priceDetails = SERVICE_FEES[selectedService];
    const costVal = priceDetails.fee;

    // "welet amount less hokar seh rashi inncome me add ho"
    const calculatedIncome = Math.max(0, totalCharged - costVal);
    // "due amount ka bhi add kro" (Total quantity charged minus actual cash paid)
    const dueAmount = Math.max(0, totalCharged - amountCollected);

    // Validate eMitra wallet balance if paying right now
    if (isDeductedFromWallet && emitraWallet.balance < costVal) {
      alert(`Insufficient eMitra wallet balance to process eMitra token fees. Available: ${formatINR(emitraWallet.balance)}, required: ${formatINR(costVal)}.`);
      return;
    }

    const branchAdminId = currentUser?.role === 'Admin' 
      ? currentUser.id 
      : (state.operators.find(o => o.id === currentUser?.id)?.createdBy || 'op-1');

    const newToken = `TOKEN${Math.floor(40000000 + Math.random() * 59999999)}`;
    const newApp: EmitraApplication = {
      id: `EMI-${Math.floor(10000 + Math.random() * 89999)}`,
      applicantName: guestName,
      applicantPhone: guestPhone,
      serviceType: selectedService,
      appliedDate: new Date().toISOString(),
      feeCharged: totalCharged, // The total amount taken from customer
      commissionEarned: calculatedIncome, // Remainder seh rashi added to income
      status: initialStatus,
      tokenNumber: newToken,
      dueAmount: dueAmount,
      operatorId: currentUser?.id || 'op-1',
      notes: applNotes || undefined,
      documentsSubmitted: priceDetails.listDocs,
      paymentMode: paymentMode,
      createdBy: branchAdminId
    };

    // Calculate wallet adjustments
    const updatedWallet = {
      ...wallet,
      balance: isDeductedFromWallet ? wallet.balance + costVal : wallet.balance,
      totalCommissionEarned: wallet.totalCommissionEarned + calculatedIncome,
      lastUpdated: new Date().toISOString()
    };

    const updatedEmitraWallet = {
      ...emitraWallet,
      balance: isDeductedFromWallet ? emitraWallet.balance - costVal : emitraWallet.balance,
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

    // If due amount is generated, record it directly on matching customer's ledger by phone lookup
    let updatedCusts = [...customers];
    if (dueAmount > 0) {
      const cleanPhone = guestPhone.replace(/\D/g, '');
      const match = customers.find(c => c.phoneNumber.replace(/\D/g, '') === cleanPhone);
      if (match) {
        updatedCusts = customers.map(c => 
          c.id === match.id ? { ...c, dueAmount: c.dueAmount + dueAmount } : c
        );
      }
    }

    const updatedState: AppState = {
      ...state,
      emitraApplications: [newApp, ...emitraApplications],
      wallet: updatedWallet,
      emitraWallet: updatedEmitraWallet,
      aepsWallet: updatedAepsWallet,
      customers: updatedCusts,
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: currentUser?.role || 'Admin',
          action: `eMitra Application - Charged: ${formatINR(totalCharged)}, Paid: ${formatINR(amountCollected)}, Profit: ${formatINR(calculatedIncome)}, Due: ${formatINR(dueAmount)}, eMitra Wallet Debited: ${isDeductedFromWallet ? 'Yes' : 'No'}`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'App Console',
          browser: 'eMitra Portal v3.0'
        },
        ...state.securityLogs
      ]
    };

    onUpdateState(updatedState);

    // Reset controls
    setGuestName('');
    setGuestPhone('');
    setApplNotes('');
    setInitialStatus('Submitted');
    setPaymentMode('Cash');
    const defaultJanAadhaarTotal = SERVICE_FEES['Jan Aadhaar Services'].fee + (commissionSettings.emitraRates['Jan Aadhaar Services'] || 35);
    setTotalCharged(defaultJanAadhaarTotal);
    setAmountCollected(defaultJanAadhaarTotal);
    setIsApplying(false);

    alert(`Successfully generated eMitra Token ID: ${newApp.tokenNumber}. Profit of ${formatINR(calculatedIncome)} added to branch income ledger.`);
  };

  // Status updating inline triggers
  const handleUpdateStatus = (appId: string, newStatus: EmitraApplication['status']) => {
    const updatedApps = emitraApplications.map(app => 
      app.id === appId ? { ...app, status: newStatus } : app
    );

    onUpdateState({
      ...state,
      emitraApplications: updatedApps
    });
  };

  // Print token sheet
  const printTokenReceipt = (app: EmitraApplication) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const shopName = state.shopDetails?.name || 'Vakrangee Kendra (वाकरंगी केंद्र)';
    const shopMobile = state.shopDetails?.mobile || '+91 90010 12345';
    const shopGmail = state.shopDetails?.gmail || 'vakrangee653@gmail.com';
    const shopAddress = state.shopDetails?.address || 'Rajasthan';
    const shopLogo = state.shopDetails?.logoUrl || '';

    printWindow.document.write(`
      <html>
        <head>
          <title>eMitra Token - ${app.tokenNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 25px; line-height: 1.5; color: #1e293b; max-width: 400px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; }
            .header { text-align: center; border-bottom: 2px solid #1D4ED8; padding-bottom: 12px; }
            .token-box { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; text-align: center; padding: 15px; font-size: 18px; font-weight: bold; border-radius: 12px; margin: 15px 0; }
            .row { display: flex; justify-content: space-between; font-size: 13px; margin: 6px 0; }
            .bold { font-weight: bold; }
            .sub-info { font-size: 10px; color: #64748b; margin-top: 2px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${shopLogo ? `
              <div style="margin-bottom: 8px;">
                <img src="${shopLogo}" style="max-height: 55px; max-width: 140px; object-fit: contain;" />
              </div>
            ` : ''}
            <h2 style="margin: 0; color: #1D4ED8; font-size: 18px;">${shopName}</h2>
            <div class="sub-info">${shopAddress}</div>
            <div class="sub-info">Ph: ${shopMobile} | Gmail: ${shopGmail}</div>
          </div>
          <div class="token-box">
            TOKEN: ${app.tokenNumber}
          </div>
          <div class="row"><span>Applicant:</span> <span class="bold">${app.applicantName}</span></div>
          <div class="row"><span>Contact No:</span> <span>${app.applicantPhone}</span></div>
          <div class="row"><span>Service Type:</span> <span class="bold">${app.serviceType}</span></div>
          <div class="row"><span>Appl Date:</span> <span>${formatDateNice(app.appliedDate)}</span></div>
          <div class="row"><span>Progress:</span> <span class="bold" style="color: blue;">${app.status}</span></div>
          <div class="row"><span>Payment Mode / भुगतान:</span> <span class="bold" style="color: #16a34a;">${app.paymentMode || 'Cash'}</span></div>
          <div class="row"><span>Government Fee:</span> <span>${formatINR(app.feeCharged)}</span></div>
          ${app.dueAmount > 0 ? `<div class="row" style="color: orange;"><span>Uncollected Due:</span> <span class="bold">${formatINR(app.dueAmount)}</span></div>` : ''}
          <hr style="border: none; border-top: 1px dashed #cbd5e1;" />
          <p style="font-size: 10px; color: #64748b; text-align: center;">Scan token coordinates on SSO portals to retrieve certificate downloads.</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // filter logics
  const filteredApps = emitraApplications.filter(app => {
    const matchesSearch = 
      app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tokenNumber.includes(searchQuery);

    const matchesType = filterType === 'All' || app.serviceType === filterType;
    const matchesStatus = filterStatus === 'All' || app.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in text-xs sm:text-sm">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            eMitra Government Desk
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Submit public request files for Jan Aadhaar integrations, citizen certificates, Ayushman health files with instant SSO token registry.
          </p>
        </div>
        <button
          onClick={() => setIsApplying(!isApplying)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15 cursor-pointer whitespace-nowrap transition-all"
        >
          <Layers size={16} />
          <span>{isApplying ? 'Collapse Input Desk' : 'Apply Certificate File'}</span>
        </button>
      </div>

      {/* Wallet Balance Cards Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Wallet size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">eMitra SSO Wallet Balance</span>
            <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white">
              {formatINR(emitraWallet.balance)}
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Sparkles size={22} />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Total Commission Pooled</span>
            <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white">
              {formatINR(wallet.totalCommissionEarned)}
            </span>
          </div>
        </div>
      </div>

      {/* TOP SECTION: Apply Certificate File (Permanently on top for fast data entry) */}
      {isApplying && (
        <div className={`p-6 rounded-3xl border animate-fade-in ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/15">
              <Layers size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base font-display">New eMitra Certificate Form</h3>
              <p className="text-xs text-slate-400">Instantly register citizen certificates, identity integrations & utility token receipts</p>
            </div>
          </div>

          <form onSubmit={handleCreateApplication} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
            {/* Left inputs column (spans 2 on desktop) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Applicant Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Customer / Applicant Name *</label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="E.g. Rajesh Kumar"
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>

                {/* Mobile No */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Mobile Contact Phone *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit Mobile No"
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>

                {/* Service type selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Requested SSO Service</label>
                  <select
                    value={selectedService}
                    onChange={(e: any) => setSelectedService(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  >
                    {SERVICE_TYPES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Initial Status */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Application Status</label>
                  <select
                    value={initialStatus}
                    onChange={(e: any) => setInitialStatus(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Submitted">Submitted</option>
                    <option value="In Process">In Process (Procece)</option>
                    <option value="Completed">Completed (Complit)</option>
                    <option value="Uncompleted">Uncompleted (Uncomplit)</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Total Customer Amount */}
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

                {/* Amount Received / Cash Paid */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Amount Actually Paid / Collected (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={amountCollected === 0 ? '' : amountCollected}
                    onChange={(e) => setAmountCollected(Number(e.target.value))}
                    placeholder="Amount Collected"
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden font-mono font-semibold transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>

                {/* Payment Mode */}
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

                {/* Application Notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Application Notes / Details</label>
                  <input
                    type="text"
                    value={applNotes}
                    onChange={(e) => setApplNotes(e.target.value)}
                    placeholder="E.g. pending land Jamabandi copy"
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Deduct Wallet check in bottom row */}
              <div className="flex items-center pt-2">
                <label htmlFor="deduct_wallet_chk" className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDeductedFromWallet}
                    onChange={(e) => setIsDeductedFromWallet(e.target.checked)}
                    className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    id="deduct_wallet_chk"
                  />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Deduct Government cost ({formatINR(SERVICE_FEES[selectedService].fee)}) from eMitra wallet
                  </span>
                </label>
              </div>
            </div>

            {/* Right section of grid: Price summary Ticker Cards + Submit button */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-2xl space-y-2.5 leading-relaxed flex-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">SSO Wallet Cost:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {formatINR(SERVICE_FEES[selectedService].fee)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Customer Bill:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {formatINR(totalCharged)}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
                  <span className="text-emerald-500 font-bold">Seh Rashi (Your Income):</span>
                  <span className="font-mono font-extrabold text-emerald-500 block text-sm">
                    +{formatINR(Math.max(0, totalCharged - SERVICE_FEES[selectedService].fee))}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
                  <span className="text-slate-400 font-medium">Customer Paid Cash:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {formatINR(amountCollected)}
                  </span>
                </div>

                {totalCharged - amountCollected > 0 && (
                  <div className="flex justify-between items-center text-xs animate-shake">
                    <span className="text-amber-500 font-bold">Unpaid Due (Udhaar):</span>
                    <span className="font-mono font-bold text-amber-500">
                      {formatINR(totalCharged - amountCollected)}
                    </span>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                  <span className="font-semibold block text-[11px] mb-1.5 text-slate-500 dark:text-slate-300">Mandatory KYC Checklist:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1">
                    {SERVICE_FEES[selectedService].listDocs.map((doc) => (
                      <div key={doc} className="flex items-center gap-1.5 text-[10px]">
                        <CornerDownRight size={10} className="text-blue-500 shrink-0" />
                        <span className="truncate">{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold font-display shadow-lg shadow-blue-500/15 cursor-pointer text-center text-sm transition-all duration-150"
              >
                Generate SSO eMitra Token
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BOTTOM SECTION: Submitted queue / Application logs */}
      <div className={`p-6 rounded-3xl border ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base font-display">eMitra Government Desk Queue</h3>
            <p className="text-xs text-slate-400">Track and manage citizen submissions, print tokens, and download issued documents</p>
          </div>
          <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full border border-blue-200 dark:border-blue-800 uppercase tracking-wider">
            {filteredApps.length} Applications Logged
          </div>
        </div>

        {/* Filter segments */}
        <div className="flex flex-col md:flex-row items-center gap-3 mb-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by Applicant, Certificate Type, Token ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border outline-hidden transition-all ${
                darkMode ? 'bg-slate-950 text-white border-slate-800 focus:border-blue-500' : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-blue-600'
              }`}
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border outline-hidden ${
                darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-705'
              }`}
            >
              <option value="All">All Services</option>
              {SERVICE_TYPES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border outline-hidden ${
                darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-705'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Submitted">Submitted</option>
              <option value="In Process">In Process (Procece)</option>
              <option value="Completed">Completed (Complit)</option>
              <option value="Uncompleted">Uncompleted (Uncomplit)</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* List Table of Active Applications */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[10px] font-mono uppercase tracking-wider text-slate-400 ${
                darkMode ? 'border-slate-800' : 'border-slate-150'
              }`}>
                <th className="py-3 px-3">Token Details</th>
                <th className="py-3 px-3">Applicant</th>
                <th className="py-3 px-3">Service Type</th>
                <th className="py-3 px-3 text-right">SSO Status</th>
                <th className="py-3 px-3 text-right">Fee Details</th>
                <th className="py-3 px-3 text-right">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-808/30">
                  <td className="py-3.5 px-3">
                    <div className="space-y-0.5">
                      <span className="font-mono font-bold block text-blue-600 dark:text-blue-400">
                        {app.tokenNumber}
                      </span>
                      <span className="text-[10px] font-mono text-slate-405 block">ID: {app.id}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-950 dark:text-white">{app.applicantName}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{app.applicantPhone}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {app.serviceType}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold ${
                        app.status === 'Completed'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : app.status === 'In Process'
                            ? 'bg-blue-500/15 text-blue-500 animate-pulse'
                            : app.status === 'Uncompleted'
                              ? 'bg-rose-500/15 text-rose-500'
                              : app.status === 'Rejected'
                                ? 'bg-rose-500/15 text-rose-500'
                                : 'bg-amber-500/15 text-amber-500'
                      }`}>
                        {app.status}
                      </span>
                      
                      {/* Inline admin status switcher */}
                      <select
                        value={app.status}
                        onChange={(e: any) => handleUpdateStatus(app.id, e.target.value)}
                        className={`p-1 rounded-md text-[9px] font-semibold border outline-hidden cursor-pointer ${
                          darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Submitted">Submitted</option>
                        <option value="In Process">In Process (Procece)</option>
                        <option value="Completed">Completed (Complit)</option>
                        <option value="Uncompleted">Uncompleted (Uncomplit)</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="space-y-0.5 font-mono">
                      <span className="font-bold block">{formatINR(app.feeCharged)}</span>
                      <span className={`inline-block text-[9px] px-1 py-0.5 rounded font-bold ${
                        app.paymentMode === 'Online'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {app.paymentMode || 'Cash'}
                      </span>
                      {app.dueAmount > 0 && (
                        <span className="text-[10px] text-amber-500 font-bold block">
                          Due: {formatINR(app.dueAmount)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => printTokenReceipt(app)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        darkMode 
                          ? 'bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-700' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                      title="Print token receipt"
                    >
                      <Printer size={13} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-405 italic">
                    No active eMitra files found in queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
