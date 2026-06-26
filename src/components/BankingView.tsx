/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRightLeft, 
  Plus, 
  UserPlus, 
  Search, 
  Settings, 
  HelpCircle, 
  AlertCircle, 
  Check, 
  RefreshCw, 
  UserCheck, 
  Clock, 
  FileCheck, 
  Smartphone,
  CreditCard,
  Building,
  Activity,
  Printer,
  X,
  Lock,
  ArrowRight,
  Wallet
} from 'lucide-react';
import { AppState, Transaction, TransactionType } from '../types';
import { formatINR, formatDateNice } from '../utils';
import { executeBankingTransaction } from '../firebase';

interface BankingViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  darkMode: boolean;
  activePreAction?: string | null;
  onClearPreAction?: () => void;
}

export default function BankingView({
  state,
  onUpdateState,
  darkMode,
  activePreAction,
  onClearPreAction
}: BankingViewProps) {
  const currUser = state.currentUser;

  // RBAC Access Filter for Banking Transactions
  const transactions = React.useMemo(() => {
    if (!currUser) return state.transactions;
    if (currUser.role === 'Super Admin') return state.transactions;
    if (currUser.role === 'Admin') {
      const myOpIds = state.operators.filter(op => op.createdBy === currUser.id || op.id === currUser.id).map(op => op.id);
      return state.transactions.filter(t => t.createdBy === currUser.id || t.operatorId === currUser.id || myOpIds.includes(t.operatorId));
    }
    return state.transactions.filter(t => t.operatorId === currUser.id);
  }, [state.transactions, state.operators, currUser]);

  const { customers, wallet, currentUser, commissionSettings } = state;
  const currentAEPSWallet = state.aepsWallet || {
    onlineBalance: 125000,
    physicalBalance: 59500,
    lastUpdated: new Date().toISOString()
  };

  // Tabs for transaction panel
  const [bankingTab, setBankingTab] = React.useState<'deposit' | 'withdrawal' | 'dmt' | 'beneficiaries'>('deposit');
  const [serviceType, setServiceType] = React.useState<TransactionType>('Withdrawal');
  const [aadhaarNumber, setAadhaarNumber] = React.useState('');

  // Trigger from preset action
  React.useEffect(() => {
    if (activePreAction) {
      if (activePreAction === 'deposit') setServiceType('Deposit');
      if (activePreAction === 'withdrawal') setServiceType('Withdrawal');
      if (activePreAction === 'dmt') setServiceType('DMT');
      if (onClearPreAction) onClearPreAction();
    }
  }, [activePreAction]);

  // Beneficiaries store (Local template stored in state or defaults)
  const [beneficiaries, setBeneficiaries] = React.useState([
    { id: 'b-1', name: 'Gopal Saini (Self)', bank: 'State Bank of India', account: '31204561234', ifsc: 'SBIN0004512' },
    { id: 'b-2', name: 'Sharma Traders Corp', bank: 'ICICI Bank', account: '91802004561284', ifsc: 'ICIC0000104' },
    { id: 'b-3', name: 'Sarita Sharma', bank: 'HDFC Bank', account: '501002345128', ifsc: 'HDFC0000125' }
  ]);

  // Form State
  const [selectedCustId, setSelectedCustId] = React.useState('');
  const [customCustName, setCustomCustName] = React.useState('');
  const [customPhone, setCustomPhone] = React.useState('');
  const [txnAmount, setTxnAmount] = React.useState<number>(0);
  const [selectBank, setSelectBank] = React.useState('State Bank of India');
  const [utrCustom, setUtrCustom] = React.useState('');
  
  // DMT specific fields
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = React.useState('');
  const [newBenName, setNewBenName] = React.useState('');
  const [newBenBank, setNewBenBank] = React.useState('State Bank of India');
  const [newBenAccount, setNewBenAccount] = React.useState('');
  const [newBenIfsc, setNewBenIfsc] = React.useState('');
  const [isAddingBen, setIsAddingBen] = React.useState(false);

  // OTP Authorization workflow trigger
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpValue, setOtpValue] = React.useState('');
  const [generatedOtp, setGeneratedOtp] = React.useState('');
  const [otpError, setOtpError] = React.useState(false);
  const [pendingTxnObject, setPendingTxnObject] = React.useState<any | null>(null);

  // Filter transaction records state
  const [searchTxn, setSearchTxn] = React.useState('');
  const [filterTxnStatus, setFilterTxnStatus] = React.useState<'All' | 'Success' | 'Failed' | 'Pending'>('All');

  // Available banks list for selections
  const BANKS_LIST = [
    'State Bank of India',
    'Bank of Baroda',
    'Punjab National Bank',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Rajasthan Marudhara Gramin Bank',
    'Canara Bank',
    'Central Bank of India'
  ];

  // Live Calculations based on active form values
  const getLiveCalculations = (type: TransactionType, amt: number) => {
    let fee = 0;
    let commission = 0;

    if (!amt || amt <= 0) return { fee, commission };

    if (type === 'Deposit') {
      fee = 0;
      commission = amt * (commissionSettings.depositRate / 100);
    } else if (type === 'Withdrawal') {
      fee = 0;
      commission = amt * (commissionSettings.withdrawalRate / 100);
    } else if (type === 'DMT') {
      fee = amt * 0.01;
      commission = fee * (commissionSettings.dmtRate / 100); // dmtRate as percentage of the fee
    } else if (type === 'UPI Payment') {
      fee = 0;
      commission = amt * 0.001; // 0.1% commission
    }

    return { 
      fee: Math.round(fee * 100) / 100, 
      commission: Math.round(commission * 100) / 100 
    };
  };

  const activeType: TransactionType = serviceType;

  const { fee, commission } = getLiveCalculations(activeType, txnAmount);

  // Directly authorize transaction using secure, atomic database transactions
  const handleInitiateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (txnAmount <= 0) return;

    // Validate wallet balance if debit is required
    const isWltDebited = activeType === 'Deposit' || activeType === 'DMT' || activeType === 'UPI Payment';
    const txnTotalNeed = txnAmount + fee;
    if (isWltDebited && currentAEPSWallet.onlineBalance < txnTotalNeed) {
      alert(`Insufficient AEPS online balance! Portal balance is ${formatINR(currentAEPSWallet.onlineBalance)}, transaction needs ${formatINR(txnTotalNeed)}.`);
      return;
    }

    if (activeType === 'Withdrawal' && currentAEPSWallet.physicalBalance < txnAmount) {
      alert(`Insufficient Cash in Hand! Branch physical cash is ${formatINR(currentAEPSWallet.physicalBalance)}, withdrawal needs ${formatINR(txnAmount)} in paper money.`);
      return;
    }

    // Identify customer name
    let clientName = customCustName;
    if (!clientName) {
      alert("Please provide the customer name.");
      return;
    }

    if (!aadhaarNumber) {
      alert("Please provide an Aadhaar number.");
      return;
    }

    const branchAdminId = currentUser?.role === 'Admin' 
      ? currentUser.id 
      : (state.operators.find(o => o.id === currentUser?.id)?.createdBy || 'op-1');

    try {
      // Execute transaction atomically
      const result = await executeBankingTransaction({
        userId: currentUser?.id || 'op-1',
        userName: currentUser?.name || 'Admin',
        userRole: currentUser?.role || 'Admin',
        customerName: clientName,
        aadhaarNumber: aadhaarNumber || undefined,
        type: activeType,
        amount: txnAmount,
        fee,
        commission,
        utrNumber: utrCustom,
        adminId: branchAdminId,
        operatorId: currentUser?.id || 'op-1',
        operatorName: currentUser?.name || 'Admin'
      });

      // Calculate AEPS changes
      let aepsOnlineDiff = 0;
      let aepsPhysicalDiff = 0;

      if (activeType === 'Deposit') {
        aepsOnlineDiff = -txnAmount; // digital debited
        aepsPhysicalDiff = txnAmount; // physical cash received
      } else if (activeType === 'Withdrawal') {
        aepsOnlineDiff = txnAmount; // digital portal cash credited
        aepsPhysicalDiff = -txnAmount; // physical cash handed over
      } else if (activeType === 'DMT' || activeType === 'UPI Payment') {
        aepsOnlineDiff = -(txnAmount + fee); // digital debited sent amt + fee
        if (activeType === 'DMT') {
          aepsOnlineDiff += commission; // DMT commission added directly to banking's online cash balance
        }
        aepsPhysicalDiff = txnAmount + fee; // physical cash collected from customer (amt + fee)
      }

      const updatedAEPSWallet = {
        ...currentAEPSWallet,
        onlineBalance: currentAEPSWallet.onlineBalance + aepsOnlineDiff,
        physicalBalance: currentAEPSWallet.physicalBalance + aepsPhysicalDiff,
        lastUpdated: new Date().toISOString()
      };

      const updatedWallet = {
        ...wallet,
        balance: result.wallet.balance,
        openingBalance: result.wallet.openingBalance,
        currentBalance: result.wallet.currentBalance,
        credit: result.wallet.credit,
        debit: result.wallet.debit,
        closingBalance: result.wallet.closingBalance,
        availableBalance: result.wallet.availableBalance,
        lastUpdated: result.wallet.lastUpdated,
        totalCommissionEarned: (wallet.totalCommissionEarned || 0) + commission
      };

      const updatedTxns = [result.transaction, ...state.transactions];
      const updatedLedger = [result.ledger, ...(state.walletLedger || [])];

      const updatedState: AppState = {
        ...state,
        transactions: updatedTxns,
        wallet: updatedWallet,
        aepsWallet: updatedAEPSWallet,
        walletLedger: updatedLedger,
        securityLogs: [
          {
            id: `log-${Date.now().toString().slice(-5)}`,
            timestamp: new Date().toISOString(),
            operatorId: currentUser?.id || 'op-1',
            operatorName: currentUser?.name || 'Admin',
            role: currentUser?.role || 'Admin',
            action: `Authorized ${activeType} - Ref: ${result.transaction.id} of ₹${txnAmount}`,
            status: 'Success',
            ipAddress: '47.11.134.19',
            device: 'AEPS Handset',
            browser: 'SmartSPE Secure Client v1'
          },
          ...state.securityLogs
        ]
      };

      // Save and clear
      onUpdateState(updatedState);
      setOtpSent(false);
      setPendingTxnObject(null);
      setSelectedCustId('');
      setCustomCustName('');
      setCustomPhone('');
      setAadhaarNumber('');
      setTxnAmount(0);
      setUtrCustom('');
      setSelectedBeneficiaryId('');
      
      alert(`Success! Transaction ID: ${result.transaction.id} has been processed atomically and ledger updated successfully.`);
    } catch (err: any) {
      alert(`Transaction Rolled Back / Failed: ${err.message}`);
    }
  };

  // Add a DMT Beneficiary
  const handleAddBeneficiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBenName || !newBenAccount || !newBenIfsc) return;

    const newBen = {
      id: `b-${Date.now().toString().slice(-4)}`,
      name: newBenName,
      bank: newBenBank,
      account: newBenAccount,
      ifsc: newBenIfsc.toUpperCase()
    };

    setBeneficiaries([...beneficiaries, newBen]);
    setSelectedBeneficiaryId(newBen.id);
    setNewBenName('');
    setNewBenAccount('');
    setNewBenIfsc('');
    setIsAddingBen(false);
  };

  // Print single receipt triggering browser print window
  const printReceipt = (txn: Transaction) => {
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
          <title>Transaction Receipt - ${txn.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 12px; color: #000; line-height: 1.4; max-width: 340px; margin: auto; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .flex-row { display: flex; justify-content: space-between; }
            .receipt-title { font-size: 15px; font-weight: bold; margin-bottom: 2px; }
            .sub-info { font-size: 10px; color: #333; margin-bottom: 1px; }
          </style>
        </head>
        <body>
          ${shopLogo ? `
            <div class="center" style="margin-bottom: 8px;">
              <img src="${shopLogo}" style="max-height: 55px; max-width: 140px; object-fit: contain;" />
            </div>
          ` : ''}
          <div class="center bold receipt-title">${shopName}</div>
          <div class="center sub-info">${shopAddress}</div>
          <div class="center sub-info">Ph: ${shopMobile} | Gmail: ${shopGmail}</div>
          <div class="line"></div>
          <div class="flex-row"><span>Date:</span> <span>${new Date(txn.timestamp).toLocaleString()}</span></div>
          <div class="flex-row"><span>Txn Ref:</span> <span class="bold">${txn.id}</span></div>
          <div class="flex-row"><span>Operator:</span> <span>${txn.operatorName}</span></div>
          <div class="flex-row"><span>Type:</span> <span class="bold">${txn.type}</span></div>
          <div class="line"></div>
          <div class="flex-row"><span>Client Name:</span> <span class="bold">${txn.customerName}</span></div>
          <div class="flex-row"><span>Ref Bank:</span> <span>${txn.bankName || 'NA'}</span></div>
          <div class="flex-row"><span>UTR Number:</span> <span class="bold font-mono">${txn.utrNumber}</span></div>
          ${txn.beneficiaryName ? `
            <div class="line"></div>
            <div class="center bold">Beneficiary Details</div>
            <div class="flex-row"><span>Name:</span> <span>${txn.beneficiaryName}</span></div>
            <div class="flex-row"><span>Account No:</span> <span>${txn.beneficiaryAccount}</span></div>
            <div class="flex-row"><span>IFSC Code:</span> <span>${txn.beneficiaryIFSC}</span></div>
          ` : ''}
          <div class="line"></div>
          <div class="flex-row" style="font-size: 14px; font-weight: bold;"><span>NET AMOUNT:</span> <span>${formatINR(txn.amount)}</span></div>
          <div class="flex-row"><span>Fee/Charges:</span> <span>${formatINR(txn.fee)}</span></div>
          <div class="line"></div>
          <div class="center bold" style="color: green; font-size: 13px; letter-spacing: 1px;">TRANSACTION SUCCESSFUL</div>
          <div class="line"></div>
          <div class="center" style="font-size: 10px; font-weight: bold;">Thank you for banking with us!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const filteredTxns = transactions.filter(t => {
    const matchesSearch = 
      t.customerName.toLowerCase().includes(searchTxn.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTxn.toLowerCase()) ||
      t.utrNumber.includes(searchTxn);

    if (filterTxnStatus === 'All') return matchesSearch;
    return matchesSearch && t.status === filterTxnStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in text-xs sm:text-sm relative">
      
      {/* Screen Headers */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            CSP National Banking Services
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Secure processing of client deposits, instant withdrawal, IMPS Domestic Money Transfer (DMT), and immediate commission audit logs.
          </p>
        </div>
        
        {/* Dual AEPS Wallet Ledger Widget */}
        <div className={`p-2 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 shadow-xs ${
          darkMode ? 'bg-slate-900/60 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
        }`}>
          {/* Online Balance (Portal Ledger) */}
          <div className="px-3 py-1 flex flex-col border-r border-slate-200 dark:border-slate-800">
            <span className="text-[9px] font-bold font-mono tracking-wider uppercase text-blue-500">📱 ONLINE CASH (PORTAL)</span>
            <span className="font-mono text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400">{formatINR(currentAEPSWallet.onlineBalance)}</span>
          </div>
          {/* Physical Balance (Cash in Hand) */}
          <div className="px-3 py-1 flex flex-col sm:border-r border-slate-200 dark:border-slate-800">
            <span className="text-[9px] font-bold font-mono tracking-wider uppercase text-emerald-500">💵 PHYSICAL CASH (IN HAND)</span>
            <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-650 dark:text-emerald-400">{formatINR(currentAEPSWallet.physicalBalance)}</span>
          </div>
          {/* Total Net Balance */}
          <div className="px-3 py-1 flex flex-col bg-slate-100 dark:bg-slate-900/50 rounded-xl">
            <span className="text-[8px] font-bold font-mono tracking-widest text-slate-400 uppercase">💼 AEPS TOTAL</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
              {formatINR(currentAEPSWallet.onlineBalance + currentAEPSWallet.physicalBalance)}
            </span>
          </div>

          {/* Quick settlement buttons */}
          <div className="flex gap-1 self-center sm:self-auto sm:ml-1 text-[10px]">
            <button
              onClick={async () => {
                const amt = Number(prompt("Enter amount to deposit physical cash into bank portal ledger (Bank Deposit):"));
                if (!amt || amt <= 0) return;
                if (currentAEPSWallet.physicalBalance < amt) {
                  alert("Insufficient Physical cash in hand!");
                  return;
                }
                const branchAdminId = currentUser?.role === 'Admin' 
                  ? currentUser.id 
                  : (state.operators.find(o => o.id === currentUser?.id)?.createdBy || 'op-1');

                try {
                  const result = await executeBankingTransaction({
                    userId: currentUser?.id || 'op-1',
                    userName: currentUser?.name || 'Admin',
                    userRole: currentUser?.role || 'Admin',
                    customerName: 'Quick Settlement Deposit',
                    type: 'Withdrawal', // Withdrawal credits main wallet, matching cash-in logic!
                    amount: amt,
                    fee: 0,
                    commission: 0,
                    utrNumber: `SETTLE-DEP-${Date.now()}`,
                    adminId: branchAdminId,
                    operatorId: currentUser?.id || 'op-1',
                    operatorName: currentUser?.name || 'Admin'
                  });

                  const updatedAEPSWallet = {
                    ...currentAEPSWallet,
                    onlineBalance: currentAEPSWallet.onlineBalance + amt,
                    physicalBalance: currentAEPSWallet.physicalBalance - amt,
                    lastUpdated: new Date().toISOString()
                  };

                  const updatedWallet = {
                    ...wallet,
                    balance: result.wallet.balance,
                    openingBalance: result.wallet.openingBalance,
                    currentBalance: result.wallet.currentBalance,
                    credit: result.wallet.credit,
                    debit: result.wallet.debit,
                    closingBalance: result.wallet.closingBalance,
                    availableBalance: result.wallet.availableBalance,
                    lastUpdated: result.wallet.lastUpdated
                  };

                  const updatedState = {
                    ...state,
                    wallet: updatedWallet,
                    aepsWallet: updatedAEPSWallet,
                    transactions: [result.transaction, ...state.transactions],
                    walletLedger: [result.ledger, ...(state.walletLedger || [])]
                  };

                  onUpdateState(updatedState);
                  alert(`Successfully deposited ${formatINR(amt)} to bank portal and recorded in ledger.`);
                } catch (err: any) {
                  alert(`Settlement failed: ${err.message}`);
                }
              }}
              className="py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold cursor-pointer transition-colors text-[10px]"
              title="Deposit Cash to Portal"
            >
              Deposit
            </button>
            <button
              onClick={async () => {
                const amt = Number(prompt("Enter amount to withdraw from bank portal ledger to physical cash (Cashing Out):"));
                if (!amt || amt <= 0) return;
                if (currentAEPSWallet.onlineBalance < amt) {
                  alert("Insufficient Online portal cash balance!");
                  return;
                }
                const branchAdminId = currentUser?.role === 'Admin' 
                  ? currentUser.id 
                  : (state.operators.find(o => o.id === currentUser?.id)?.createdBy || 'op-1');

                try {
                  const result = await executeBankingTransaction({
                    userId: currentUser?.id || 'op-1',
                    userName: currentUser?.name || 'Admin',
                    userRole: currentUser?.role || 'Admin',
                    customerName: 'Quick Settlement Withdrawal',
                    type: 'Deposit', // Deposit debits main wallet, matching cash-out logic!
                    amount: amt,
                    fee: 0,
                    commission: 0,
                    utrNumber: `SETTLE-WTH-${Date.now()}`,
                    adminId: branchAdminId,
                    operatorId: currentUser?.id || 'op-1',
                    operatorName: currentUser?.name || 'Admin'
                  });

                  const updatedAEPSWallet = {
                    ...currentAEPSWallet,
                    onlineBalance: currentAEPSWallet.onlineBalance - amt,
                    physicalBalance: currentAEPSWallet.physicalBalance + amt,
                    lastUpdated: new Date().toISOString()
                  };

                  const updatedWallet = {
                    ...wallet,
                    balance: result.wallet.balance,
                    openingBalance: result.wallet.openingBalance,
                    currentBalance: result.wallet.currentBalance,
                    credit: result.wallet.credit,
                    debit: result.wallet.debit,
                    closingBalance: result.wallet.closingBalance,
                    availableBalance: result.wallet.availableBalance,
                    lastUpdated: result.wallet.lastUpdated
                  };

                  const updatedState = {
                    ...state,
                    wallet: updatedWallet,
                    aepsWallet: updatedAEPSWallet,
                    transactions: [result.transaction, ...state.transactions],
                    walletLedger: [result.ledger, ...(state.walletLedger || [])]
                  };

                  onUpdateState(updatedState);
                  alert(`Successfully withdrew ${formatINR(amt)} to cash-in-hand and recorded in ledger.`);
                } catch (err: any) {
                  alert(`Settlement failed: ${err.message}`);
                }
              }}
              className="py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer transition-colors text-[10px]"
              title="Withdraw Cash from Portal"
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Stacked Layouts: Form on top, logs at the bottom */}
      <div className="flex flex-col gap-6">
        
        {/* TOP COLLECTION: Banking Form Console */}
        <div className="order-1 w-full max-w-4xl mx-auto space-y-4">
          <div className={`p-6 rounded-3xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="font-bold text-lg font-display mb-4 flex items-center gap-2">
              <Wallet size={18} className="text-blue-600" />
              National Banking Entry Desk
            </h3>

            <form onSubmit={handleInitiateTransaction} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Customer Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={customCustName}
                    onChange={(e) => setCustomCustName(e.target.value)}
                    placeholder="Enter customer full name"
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-hidden transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-601'
                    }`}
                  />
                </div>

                {/* 2. Aadhaar Number */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Aadhaar Number *</label>
                  <input
                    type="text"
                    required
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Aadhaar Card Number / आधार नंबर"
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-hidden font-mono transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-601'
                    }`}
                  />
                </div>

                {/* 3. Service Type */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Service Type *</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as TransactionType)}
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-hidden transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-601'
                    }`}
                  >
                    <option value="Withdrawal">Withdrawal (निकासी)</option>
                    <option value="Deposit">Deposit (जमा)</option>
                    <option value="DMT">DMT Transfer (घरेलू मनी ट्रांसफर)</option>
                    <option value="UPI Payment">UPI Payment (यूपीआई भुगतान)</option>
                  </select>
                </div>

                {/* 4. Amount */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Transaction Cash Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 opacity-50 font-mono font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min={10}
                      value={txnAmount === 0 ? '' : txnAmount}
                      onChange={(e) => setTxnAmount(Number(e.target.value))}
                      placeholder="Min ₹10"
                      className={`w-full pl-7 pr-4 py-2 rounded-xl text-xs sm:text-sm border outline-hidden font-mono font-extrabold transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-601'
                      }`}
                    />
                  </div>
                </div>

                {/* 5. Optional Manual UTR */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Optional Manual UTR / Reference ID</label>
                  <input
                    type="text"
                    value={utrCustom}
                    onChange={(e) => setUtrCustom(e.target.value)}
                    placeholder="Leave empty to auto-generate reference code"
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border outline-hidden font-mono transition-colors ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-305 focus:border-blue-601'
                    }`}
                  />
                </div>
              </div>

              {/* Live rate ticker box */}
              {txnAmount > 0 && (
                <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/15 space-y-2 animate-fade-in leading-relaxed text-xs">
                  <h5 className="font-bold text-blue-600 dark:text-blue-400">Live Commission Calculation</h5>
                  <div className="flex justify-between">
                    <span className="opacity-75 font-medium">Service Fee:</span>
                    <span className="font-mono font-bold">{fee > 0 ? formatINR(fee) : 'FREE (Rs 0)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-75 font-medium">Branch Commission Earned:</span>
                    <span className="font-mono font-extrabold text-emerald-500">+{formatINR(commission)}</span>
                  </div>
                </div>
              )}

              {/* Submission button */}
              <button
                type="submit"
                className={`w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs flex items-center justify-center gap-1.5 text-white ${
                  activeType === 'Deposit' 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10' 
                    : activeType === 'Withdrawal'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/10'
                }`}
              >
                <Lock size={12} />
                <span>Verify and Authorize Transaction</span>
              </button>
            </form>
          </div>
        </div>

        {/* BOTTOM COLUMN: Live Ledger records */}
        <div className="order-2 w-full space-y-4">
          <div className={`p-5 rounded-3xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            
            {/* Header filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-base font-display">Daily Operational Banking Log</h3>
                <p className="text-xs text-slate-400">Filtered real-time IMPS and ledger updates</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full sm:w-44">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ledger..."
                    value={searchTxn}
                    onChange={(e) => setSearchTxn(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-250'
                    }`}
                  />
                </div>

                <div className={`flex rounded-lg p-0.5 border ${
                  darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-130 border-slate-200'
                }`}>
                  {(['All', 'Success', 'Pending', 'Failed'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterTxnStatus(st)}
                      className={`px-2 py-1 text-[10px] font-semibold cursor-pointer whitespace-nowrap rounded-md ${
                        filterTxnStatus === st 
                          ? 'bg-blue-600 text-white' 
                          : 'text-slate-400'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tables */}
            <div className="overflow-x-auto font-sans">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[10px] font-mono uppercase tracking-wider text-slate-400 ${
                    darkMode ? 'border-slate-800' : 'border-slate-150'
                  }`}>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Transaction details</th>
                    <th className="py-3 px-3">Reference / UTR</th>
                    <th className="py-3 px-3">Service & Status</th>
                    <th className="py-3 px-3 text-right">Opening Balance</th>
                    <th className="py-3 px-3 text-right">Closing Balance</th>
                    <th className="py-3 px-3 text-right">Amount / Charge</th>
                    <th className="py-3 px-3 text-right">Commission</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-350 font-mono">
                  {filteredTxns.map((t, idx) => (
                    <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" />
                          <span>{t.date || new Date(t.timestamp).toLocaleDateString()} {t.time || new Date(t.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold dark:text-white select-all font-sans">
                        <div>{t.customerName}</div>
                        {t.aadhaarNumber && (
                          <div className="text-[10px] font-mono text-slate-400 font-normal">
                            Aadhaar: xxxx-xxxx-{t.aadhaarNumber.slice(-4)}
                          </div>
                        )}
                        <div className="text-[9px] text-slate-400 font-normal">
                          Op: {t.operatorName} • Admin: {t.createdBy || 'Admin'}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px]">
                        <span className="block font-bold">ID: {t.id}</span>
                        <span className="block opacity-65">UTR: {t.utrNumber}</span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-sans">
                        <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold ${
                          t.status === 'Success' 
                            ? 'bg-emerald-500/10 text-emerald-600' 
                            : t.status === 'Failed' 
                              ? 'bg-rose-500/10 text-rose-600' 
                              : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {t.type} • {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right opacity-70 whitespace-nowrap">
                        {t.openingBalance !== undefined ? formatINR(t.openingBalance) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right opacity-90 font-bold whitespace-nowrap">
                        {t.closingBalance !== undefined ? formatINR(t.closingBalance) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="font-bold block text-slate-900 dark:text-white">{formatINR(t.amount)}</span>
                        {t.fee > 0 && <span className="block text-[9px] text-rose-500">Chg: {formatINR(t.fee)}</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-500 whitespace-nowrap">
                        {t.status === 'Success' ? `+${formatINR(t.commission)}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => printReceipt(t)}
                          disabled={t.status !== 'Success'}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            t.status === 'Success'
                              ? darkMode 
                                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' 
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                              : 'opacity-40 cursor-not-allowed text-slate-400'
                          }`}
                          title="Generate printed receipt"
                        >
                          <Printer size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredTxns.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-405 italic">
                        No banking receipts matched your search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
