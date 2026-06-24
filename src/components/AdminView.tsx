/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Settings, 
  Users, 
  Sliders, 
  Database, 
  RefreshCw, 
  Plus, 
  Trash2, 
  UserCheck, 
  AlertCircle, 
  TrendingUp, 
  Download, 
  Upload, 
  Wallet,
  ShieldCheck,
  Bell,
  Lock
} from 'lucide-react';
import { AppState, Operator, EmitraServiceType } from '../types';
import { formatINR } from '../utils';

interface AdminViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  darkMode: boolean;
}

export default function AdminView({
  state,
  onUpdateState,
  darkMode
}: AdminViewProps) {
  const { operators, commissionSettings, wallet, currentUser } = state;
  const emitraWallet = state.emitraWallet || {
    balance: 25000,
    lastUpdated: new Date().toISOString()
  };
  const aepsWallet = state.aepsWallet || {
    onlineBalance: 125000,
    physicalBalance: 59500,
    lastUpdated: new Date().toISOString()
  };

  // Active sub-admin panel
  const [adminSubTab, setAdminSubTab] = React.useState<'operators' | 'commissions' | 'wallet' | 'backup'>('operators');

  // New operator form states
  const [isAddingOperator, setIsAddingOperator] = React.useState(false);
  const [opName, setOpName] = React.useState('');
  const [opEmail, setOpEmail] = React.useState('');
  const [opPhone, setOpPhone] = React.useState('');
  const [opRole, setOpRole] = React.useState<'Admin' | 'Operator'>('Operator');
  const [opLimit, setOpLimit] = React.useState(100000);
  const [opCommRate, setOpCommRate] = React.useState(60);
  const [opPassword, setOpPassword] = React.useState('operator123');

  // Password resetting states
  const [resettingOpId, setResettingOpId] = React.useState<string | null>(null);
  const [newPassVal, setNewPassVal] = React.useState('');

  // Operator limits and settings editing states
  const [editingOpId, setEditingOpId] = React.useState<string | null>(null);
  const [editLimitVal, setEditLimitVal] = React.useState<number>(0);
  const [editCommVal, setEditCommVal] = React.useState<number>(0);

  // RBAC Access Filter for display roster list
  const filteredOperators = React.useMemo(() => {
    if (!currentUser) return operators;
    if (currentUser.role === 'Super Admin') return operators;
    // Admins cannot see Super Admins inside their branch operator view list
    return operators.filter(op => op.role !== 'Super Admin');
  }, [operators, currentUser]);

  // Commission settings inputs
  const [depositRate, setDepositRate] = React.useState(commissionSettings.depositRate);
  const [withdrawalRate, setWithdrawalRate] = React.useState(commissionSettings.withdrawalRate);
  const [transferRate, setTransferRate] = React.useState(commissionSettings.transferRate);
  const [dmtRate, setDmtRate] = React.useState(commissionSettings.dmtRate);
  
  // Custom eMitra rate and fee bindings
  const [emitraRates, setEmitraRates] = React.useState<Record<string, number>>({
    ...commissionSettings.emitraRates
  });
  const [emitraFees, setEmitraFees] = React.useState<Record<string, number>>({
    ...commissionSettings.emitraFees
  });

  // Custom Offline work settings
  const [offlineFees, setOfflineFees] = React.useState<Record<string, number>>({
    ...commissionSettings.offlineFees
  });
  const [offlineCosts, setOfflineCosts] = React.useState<Record<string, number>>({
    ...commissionSettings.offlineCosts
  });

  const [expenseBudgetLimit, setExpenseBudgetLimit] = React.useState<number>(commissionSettings.expenseBudgetLimit || 10000);
  const [disableOperatorExpenseLogging, setDisableOperatorExpenseLogging] = React.useState<boolean>(!!commissionSettings.disableOperatorExpenseLogging);
  const [customExpenseCategories, setCustomExpenseCategories] = React.useState<string[]>(commissionSettings.customExpenseCategories || []);
  const [staffNames, setStaffNames] = React.useState<string[]>(commissionSettings.staffNames || []);

  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [newStaffName, setNewStaffName] = React.useState('');

  // Keep state updated in case settings load from database or default
  React.useEffect(() => {
    setEmitraRates({ ...commissionSettings.emitraRates });
    setEmitraFees({ ...commissionSettings.emitraFees });
    setOfflineFees({ ...commissionSettings.offlineFees });
    setOfflineCosts({ ...commissionSettings.offlineCosts });
    setExpenseBudgetLimit(commissionSettings.expenseBudgetLimit || 10000);
    setDisableOperatorExpenseLogging(!!commissionSettings.disableOperatorExpenseLogging);
    setCustomExpenseCategories(commissionSettings.customExpenseCategories || []);
    setStaffNames(commissionSettings.staffNames || []);
  }, [commissionSettings]);

  // Form states to add new eMitra services dynamically
  const [newServiceName, setNewServiceName] = React.useState('');
  const [newServiceFee, setNewServiceFee] = React.useState<number>(50);
  const [newServiceRate, setNewServiceRate] = React.useState<number>(30);

  // Form states to add new custom Offline services dynamically
  const [newOfflineName, setNewOfflineName] = React.useState('');
  const [newOfflineFee, setNewOfflineFee] = React.useState<number>(40);
  const [newOfflineCost, setNewOfflineCost] = React.useState<number>(5);

  // Wallet topup & Direct set states
  const [topupAmount, setTopupAmount] = React.useState<number>(10000);
  const [topupSource, setTopupSource] = React.useState('Bank of Baroda Liquid Check');
  const [directWalletBalance, setDirectWalletBalance] = React.useState<number>(wallet.balance);
  const [emitraLoadAmount, setEmitraLoadAmount] = React.useState<number>(5000);
  const [emitraUnloadAmount, setEmitraUnloadAmount] = React.useState<number>(5000);

  const [directAepsOnline, setDirectAepsOnline] = React.useState<number>(aepsWallet.onlineBalance);
  const [directAepsPhysical, setDirectAepsPhysical] = React.useState<number>(aepsWallet.physicalBalance);

  // Sync direct balance hook
  React.useEffect(() => {
    setDirectWalletBalance(wallet.balance);
    setDirectAepsOnline(aepsWallet.onlineBalance);
    setDirectAepsPhysical(aepsWallet.physicalBalance);
  }, [wallet.balance, aepsWallet.onlineBalance, aepsWallet.physicalBalance]);

  // Gating access checks (Strict permission verification)
  const isAuthorized = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  if (!isAuthorized) {
    return (
      <div className={`p-8 rounded-3xl border text-center space-y-4 max-w-lg mx-auto my-12 animate-fade-in ${
        darkMode ? 'bg-slate-900 border-rose-950 text-white' : 'bg-white border-slate-200 text-slate-950'
      }`}>
        <div className="w-14 h-14 bg-rose-500/10 text-rose-502 rounded-full flex items-center justify-center mx-auto text-rose-505">
          <Lock size={30} className="animate-pulse" />
        </div>
        <div>
          <h3 className="font-bold text-lg font-display uppercase tracking-tight">Access Control Gating Block</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Oops! Your active credential role is flagged as <span className="font-bold text-emerald-500 font-mono">"{currentUser?.role}"</span>. Admin permissions are strictly required to configure financial parameter matrices and top-up operator wallet registers.
          </p>
        </div>
        
        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-805 text-xs text-slate-500">
          Tip: You can dynamically simulate role shifts in the <span className="font-bold text-blue-500">Security Portal Tab</span> anytime to test administrative perspectives!
        </div>
      </div>
    );
  }

  // Handle Save Commission adjustments
  const handleSaveCommissions = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateState({
      ...state,
      commissionSettings: {
        depositRate,
        withdrawalRate,
        transferRate,
        dmtRate,
        emitraRates,
        emitraFees,
        offlineFees,
        offlineCosts,
        expenseBudgetLimit,
        disableOperatorExpenseLogging,
        customExpenseCategories,
        staffNames
      },
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: 'Admin',
          action: `Modified system-wide commission percentages, yields and expense settings`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'App Web Console',
          browser: 'Firefox Developer Edition'
        },
        ...state.securityLogs
      ]
    });
    alert('Commissions & Expense configurations updated successfully! Future transaction calculations and tracker workflows will instantly inherit these values.');
  };

  // Dynamic expense categories helpers
  const handleAddCategory = (e: React.MouseEvent) => {
    e.preventDefault();
    const cleanCat = newCategoryName.trim();
    if (!cleanCat) return;
    if (customExpenseCategories.includes(cleanCat)) {
      alert("यह श्रेणी पहले से मौजूद है! (Category already exists)");
      return;
    }
    setCustomExpenseCategories([...customExpenseCategories, cleanCat]);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (customExpenseCategories.length <= 1) {
      alert("कम से कम एक प्रकार अवश्य रखा जाना चाहिए। (At least one category is required)");
      return;
    }
    setCustomExpenseCategories(customExpenseCategories.filter(c => c !== catToRemove));
  };

  // Dynamic staff list helpers
  const handleAddStaff = (e: React.MouseEvent) => {
    e.preventDefault();
    const cleanStaff = newStaffName.trim();
    if (!cleanStaff) return;
    if (staffNames.includes(cleanStaff)) {
      alert("यह स्टाफ सदस्य पहले से सूची में है! (Staff member name already exists)");
      return;
    }
    setStaffNames([...staffNames, cleanStaff]);
    setNewStaffName('');
  };

  const handleRemoveStaff = (staffToRemove: string) => {
    if (staffNames.length <= 1) {
      alert("सूची में कम से कम एक स्टाफ़ नाम होना चाहिए। (At least one staff member name is required)");
      return;
    }
    setStaffNames(staffNames.filter(s => s !== staffToRemove));
  };

  // Add operator
  const handleAddOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opName || !opEmail || !opPhone) return;

    const newOp: Operator = {
      id: `op-${Math.floor(100 + Math.random() * 899)}`,
      name: opName,
      email: opEmail,
      role: opRole,
      status: 'Active',
      walletLimit: opLimit,
      commissionRate: opCommRate,
      phoneNumber: opPhone,
      password: opPassword,
      failedAttempts: 0,
      isLockedOut: false
    };

    onUpdateState({
      ...state,
      operators: [...state.operators, newOp]
    });

    setOpName('');
    setOpEmail('');
    setOpPhone('');
    setOpPassword('operator123');
    setIsAddingOperator(false);
  };

  // Toggle operator Status (Active / Inactive)
  const handleToggleOpStatus = (opId: string) => {
    onUpdateState({
      ...state,
      operators: operators.map(op => 
        op.id === opId 
          ? { ...op, status: op.status === 'Active' ? 'Inactive' : 'Active' } 
          : op
      )
    });
  };

  // Reset operator login password
  const handleResetPassword = (opId: string, newPass: string) => {
    const cleanPass = newPass.trim();
    if (!cleanPass) return;

    const opToReset = state.operators.find(o => o.id === opId);
    if (!opToReset) return;

    // Safety checks: standard Admin cannot change details of a Super Admin
    if (currentUser?.role === 'Admin' && opToReset.role === 'Super Admin') {
      alert("❌ पहुंच वर्जित! आप सुपर एडमिन का पासवर्ड रीसेट नहीं कर सकते।");
      return;
    }

    const updatedOperators = state.operators.map(op => 
      op.id === opId ? { ...op, password: cleanPass, failedAttempts: 0, isLockedOut: false } : op
    );

    const resetAuditLog = {
      id: `log-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
      operatorId: currentUser?.id || 'op-super',
      operatorName: currentUser?.name || 'Super Admin',
      role: currentUser?.role || 'Super Admin',
      action: `Reset Password for Operator ${opToReset.name} (${opToReset.role}) successfully`,
      status: 'Success' as const,
      ipAddress: '47.11.134.19',
      device: 'Admin Control Hub',
      browser: 'Web secure portal browser'
    };

    onUpdateState({
      ...state,
      operators: updatedOperators,
      securityLogs: [resetAuditLog, ...state.securityLogs]
    });

    setResettingOpId(null);
    setNewPassVal('');
    alert(`🔑 पासवर्ड सफलतापूर्वक रीसेट किया गया! (Password for ${opToReset.name} reset to: "${cleanPass}")`);
  };

  // Update operator limits & commission share dynamically
  const handleUpdateOpSettings = (opId: string, limit: number, rate: number) => {
    if (limit < 0) {
      alert("❌ त्रुटि: कैश लिमिट शून्य या उससे अधिक होनी चाहिए! Check parameters.");
      return;
    }
    if (rate < 0 || rate > 100) {
      alert("❌ त्रुटि: कमिशन शेयर 0% से 100% के बीच होना चाहिए!");
      return;
    }

    const opToUpdate = state.operators.find(o => o.id === opId);
    if (!opToUpdate) return;

    if (currentUser?.role === 'Admin' && opToUpdate.role === 'Super Admin') {
      alert("❌ पहुंच वर्जित! आप सुपर एडमिन की सीमाएं या कमीशन नहीं बदल सकते।");
      return;
    }

    const updatedOperators = state.operators.map(op => 
      op.id === opId ? { ...op, walletLimit: limit, commissionRate: rate } : op
    );

    const settingsAuditLog = {
      id: `log-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
      operatorId: currentUser?.id || 'op-super',
      operatorName: currentUser?.name || 'Super Admin',
      role: currentUser?.role || 'Super Admin',
      action: `Modified Cash Limit to ₹${limit} and Yield Rate to ${rate}% for ${opToUpdate.name} (${opToUpdate.role})`,
      status: 'Success' as const,
      ipAddress: '47.11.134.19',
      device: 'Admin Control Hub',
      browser: 'Web secure portal browser'
    };

    onUpdateState({
      ...state,
      operators: updatedOperators,
      securityLogs: [settingsAuditLog, ...state.securityLogs]
    });

    setEditingOpId(null);
    alert(`सफलतापूर्वक ${opToUpdate.name} के लिए CSP कैश लिमिट (₹${limit}) और कमीशन शेयर (${rate}%) सेट किया गया!`);
  };

  // Unlock consecutive failures locked-out account
  const handleUnlockOperator = (opId: string) => {
    const opToUnlock = state.operators.find(o => o.id === opId);
    if (!opToUnlock) return;

    const updatedOperators = state.operators.map(op => 
      op.id === opId ? { ...op, failedAttempts: 0, isLockedOut: false } : op
    );

    const unlockLog = {
      id: `log-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
      operatorId: currentUser?.id || 'op-super',
      operatorName: currentUser?.name || 'Super Admin',
      role: currentUser?.role || 'Super Admin',
      action: `Unlocked account for Operator ${opToUnlock.name} (${opToUnlock.role})`,
      status: 'Success' as const,
      ipAddress: '47.11.134.19',
      device: 'Admin Control Hub',
      browser: 'Web secure portal browser'
    };

    onUpdateState({
      ...state,
      operators: updatedOperators,
      securityLogs: [unlockLog, ...state.securityLogs]
    });

    alert(`🔓 खाता सफलतापूर्वक अनलॉक हुआ! (Unlocked operator account ${opToUnlock.name} successfully)`);
  };

  // Delete operator account (Only Super Admin permitted)
  const handleDeleteOperator = (opId: string) => {
    const opToDelete = state.operators.find(o => o.id === opId);
    if (!opToDelete) return;

    if (currentUser?.role !== 'Super Admin') {
      alert("❌ त्रुटि: केवल सुपर एडमिन ही खातों को नष्ट (delete) कर सकते हैं! (Deletion only permitted for Super Admin)");
      return;
    }

    if (currentUser.id === opId) {
      alert("❌ त्रुटि: आप खुद का अपना खाता डिलीट नहीं कर सकते! (Self-deletion not allowed)");
      return;
    }

    if (confirm(`⚠️ चेतावनी: क्या आप निश्चित रूप से '${opToDelete.name}' का खाता संपूर्ण रूप से डिलीट करना चाहते हैं? (This cannot be undone)`)) {
      const updatedOperators = state.operators.filter(op => op.id !== opId);

      const deleteLog = {
        id: `log-${Date.now().toString().slice(-5)}`,
        timestamp: new Date().toISOString(),
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        role: 'Super Admin' as const,
        action: `Permanently deleted account of ${opToDelete.name} (${opToDelete.role}) from operator registry`,
        status: 'Success' as const,
        ipAddress: '47.11.134.19',
        device: 'Super Admin terminal root',
        browser: 'Cryptographically bounded browser'
      };

      onUpdateState({
        ...state,
        operators: updatedOperators,
        securityLogs: [deleteLog, ...state.securityLogs]
      });

      alert(`🗑️ खाता नष्ट कर दिया गया! (Operator account for ${opToDelete.name} deleted successfully)`);
    }
  };

  // Topup Wallet balance
  const handleWalletTopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (topupAmount <= 0) return;

    onUpdateState({
      ...state,
      wallet: {
        ...wallet,
        balance: wallet.balance + topupAmount,
        lastUpdated: new Date().toISOString()
      },
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: 'Admin',
          action: `Topped up system branch cash register with ₹${topupAmount} - Source: ${topupSource}`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'App Web Console',
          browser: 'Firefox Developer Edition'
        },
        ...state.securityLogs
      ]
    });

    setTopupAmount(10000);
    alert(`Success! Successfully added ${formatINR(topupAmount)} capital reserves directly to your CSP wallet limit.`);
  };

  // Load eMitra Wallet with funds from General CSP Wallet (CSP Cash Limit)
  const handleEmitraWalletLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (emitraLoadAmount <= 0) {
      alert("Please specify a valid loading amount.");
      return;
    }
    if (wallet.balance < emitraLoadAmount) {
      alert(`Insufficient CSP Cash Limit balance. Available: ${formatINR(wallet.balance)}, required: ${formatINR(emitraLoadAmount)}.`);
      return;
    }

    const updatedWallet = {
      ...wallet,
      balance: wallet.balance - emitraLoadAmount,
      lastUpdated: new Date().toISOString()
    };

    const updatedEmitraWallet = {
      ...emitraWallet,
      balance: emitraWallet.balance + emitraLoadAmount,
      lastUpdated: new Date().toISOString()
    };

    const updatedState: AppState = {
      ...state,
      wallet: updatedWallet,
      emitraWallet: updatedEmitraWallet,
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: currentUser?.role || 'Admin',
          action: `Loaded eMitra Wallet with ${formatINR(emitraLoadAmount)} sourced from CSP Cash Limit`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'Admin Console',
          browser: 'SmartSPE Admin Portal'
        },
        ...state.securityLogs
      ]
    };

    onUpdateState(updatedState);
    alert(`Successfully loaded ${formatINR(emitraLoadAmount)} into your eMitra wallet from CSP Cash Limit.`);
  };

  // Unload funds from eMitra Wallet back to General CSP Wallet (CSP Cash Limit)
  const handleEmitraWalletUnload = (e: React.FormEvent) => {
    e.preventDefault();
    if (emitraUnloadAmount <= 0) {
      alert("Please specify a valid unloading amount.");
      return;
    }
    if (emitraWallet.balance < emitraUnloadAmount) {
      alert(`Insufficient eMitra Wallet balance. Available: ${formatINR(emitraWallet.balance)}, required: ${formatINR(emitraUnloadAmount)}.`);
      return;
    }

    const updatedWallet = {
      ...wallet,
      balance: wallet.balance + emitraUnloadAmount,
      lastUpdated: new Date().toISOString()
    };

    const updatedEmitraWallet = {
      ...emitraWallet,
      balance: emitraWallet.balance - emitraUnloadAmount,
      lastUpdated: new Date().toISOString()
    };

    const updatedState: AppState = {
      ...state,
      wallet: updatedWallet,
      emitraWallet: updatedEmitraWallet,
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: currentUser?.role || 'Admin',
          action: `Unloaded eMitra Wallet by ${formatINR(emitraUnloadAmount)}, returned to CSP Cash Limit`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'Admin Console',
          browser: 'SmartSPE Admin Portal'
        },
        ...state.securityLogs
      ]
    };

    onUpdateState(updatedState);
    alert(`Successfully unloaded ${formatINR(emitraUnloadAmount)} from your eMitra wallet back to CSP Cash Limit.`);
  };

  // Add a new custom eMitra service dynamically
  const handleAddNewService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) {
      alert("Please enter a valid service name.");
      return;
    }
    const cleanName = newServiceName.trim();
    if (emitraRates[cleanName] !== undefined) {
      alert("A service with this name already exists.");
      return;
    }

    setEmitraRates({
      ...emitraRates,
      [cleanName]: newServiceRate
    });
    setEmitraFees({
      ...emitraFees,
      [cleanName]: newServiceFee
    });

    setNewServiceName('');
    setNewServiceFee(50);
    setNewServiceRate(30);
    alert(`Service "${cleanName}" added to the local configuration! Click "Apply System Calculations Adjustments" below to save this change permanently.`);
  };

  // Remove a service dynamically
  const handleDeleteService = (serviceName: string) => {
    if (!window.confirm(`Are you sure you want to remove the service "${serviceName}"?`)) return;
    const updatedRates = { ...emitraRates };
    const updatedFees = { ...emitraFees };
    
    delete updatedRates[serviceName];
    delete updatedFees[serviceName];

    setEmitraRates(updatedRates);
    setEmitraFees(updatedFees);
  };

  // Add a new custom Offline service dynamically
  const handleAddNewOfflineService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfflineName.trim()) {
      alert("Please enter a valid offline service name.");
      return;
    }
    const cleanName = newOfflineName.trim();
    if (offlineFees[cleanName] !== undefined) {
      alert("An offline service with this name already exists.");
      return;
    }

    setOfflineFees({
      ...offlineFees,
      [cleanName]: newOfflineFee
    });
    setOfflineCosts({
      ...offlineCosts,
      [cleanName]: newOfflineCost
    });

    setNewOfflineName('');
    setNewOfflineFee(40);
    setNewOfflineCost(5);
    alert(`Offline service "${cleanName}" added to the local configuration! Click "Apply System Calculations Adjustments" below to save this change permanently.`);
  };

  // Remove an offline service dynamically
  const handleDeleteOfflineService = (serviceName: string) => {
    if (!window.confirm(`Are you sure you want to remove the offline service "${serviceName}"?`)) return;
    const updatedFees = { ...offlineFees };
    const updatedCosts = { ...offlineCosts };
    
    delete updatedFees[serviceName];
    delete updatedCosts[serviceName];

    setOfflineFees(updatedFees);
    setOfflineCosts(updatedCosts);
  };

  // Set wallet balance directly
  const handleDirectWalletSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (directWalletBalance < 0) {
      alert("Wallet balance cannot be negative.");
      return;
    }

    onUpdateState({
      ...state,
      wallet: {
        ...wallet,
        balance: directWalletBalance,
        lastUpdated: new Date().toISOString()
      },
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: 'Admin',
          action: `Manually set system branch cash balance directly to ₹${directWalletBalance}`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'App Web Console',
          browser: 'Firefox Developer Edition'
        },
        ...state.securityLogs
      ]
    });

    alert(`Successfully configured direct wallet balance to ${formatINR(directWalletBalance)}.`);
  };

  // Set AEPS wallet balances directly
  const handleDirectAepsWalletSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (directAepsOnline < 0 || directAepsPhysical < 0) {
      alert("AEPS balance cannot be negative.");
      return;
    }

    onUpdateState({
      ...state,
      aepsWallet: {
        ...aepsWallet,
        onlineBalance: directAepsOnline,
        physicalBalance: directAepsPhysical,
        lastUpdated: new Date().toISOString()
      },
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: 'Admin',
          action: `Directly set AEPS wallet balances to Online: ₹${directAepsOnline}, Physical: ₹${directAepsPhysical}`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'App Web Console',
          browser: 'Firefox Developer Edition'
        },
        ...state.securityLogs
      ]
    });

    alert("Successfully configured direct AEPS wallet balances.");
  };

  // Backup state
  const handleBackupState = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const cleanNode = document.createElement('a');
    cleanNode.setAttribute("href", dataStr);
    cleanNode.setAttribute("download", `SMARTSPE_DB_BACKUP_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(cleanNode);
    cleanNode.click();
    cleanNode.remove();
  };

  // Restore state factory wipe reset
  const handleSystemRestoreDefault = () => {
    if (!window.confirm("CRITICAL WARNING: This action will restore your local database variables to original factory defaults, wiping custom customer registries, logs, and live wallet modifications. Continue?")) return;
    
    // Clear item
    localStorage.removeItem('smartspe_clean_state');
    
    // Hard refresh page to trigger default seed inside data.ts
    window.location.reload();
  };

  // Clear all demo/dummy records to start fresh
  const handleClearDemoData = () => {
    if (!window.confirm("क्या आप वाकई सभी डेमो कस्टमर, ट्रांजेक्शन, ई-मित्रा और खर्चे के रिकॉर्ड हटाना चाहते हैं? (Are you sure you want to completely clear all demo/dummy customer, transaction, eMitra, and expense records?)")) return;
    
    const clearedState: AppState = {
      ...state,
      customers: [],
      transactions: [],
      emitraApplications: [],
      offlineWork: [],
      expenses: [],
      securityLogs: [
        {
          id: `log-${String(Date.now()).slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-super',
          operatorName: currentUser?.name || 'Vakrangee Super Admin',
          role: currentUser?.role || 'Super Admin',
          action: 'Wiped all demo/dummy customer registry entries, cash logs, eMitra entries, and expenses to establish a clean database',
          status: 'Success',
          ipAddress: '127.0.0.1',
          device: 'System Portal',
          browser: 'System Web'
        },
        ...state.securityLogs
      ]
    };
    
    if (window.confirm("क्या आप वॉलेट बैलेंस को भी शून्य (₹0) पर रीसेट करना चाहते हैं ताकि एकदम फ्रेश शुरुआत हो सके? (Would you also like to reset wallet balances to ₹0 to start completely fresh?)")) {
      clearedState.wallet = {
        balance: 0,
        withdrawnCommission: 0,
        totalCommissionEarned: 0,
        lastUpdated: new Date().toISOString()
      };
      clearedState.aepsWallet = {
        onlineBalance: 0,
        physicalBalance: 0,
        lastUpdated: new Date().toISOString()
      };
      clearedState.emitraWallet = {
        balance: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    onUpdateState(clearedState);
    alert("✅ All demo entries cleared successfully! Your system is now 100% clean and ready for live operations.");
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs sm:text-sm">
      {/* View Header */}
      <div>
        <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
          Enterprise Security Settings Room
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure physical branch capital, adjust citizens transaction fees, manage certified operators, and execute system level backups.
        </p>
      </div>

      {/* Grid of panels */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: Sub navigation menu tabs */}
        <div className="lg:col-span-1">
          <div className={`p-4.5 rounded-3xl border space-y-1.5 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h4 className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold mb-3 px-3">Configuration Desk</h4>
            
            <button
              onClick={() => setAdminSubTab('operators')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-left cursor-pointer transition-all ${
                adminSubTab === 'operators' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : darkMode 
                    ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Users size={16} />
              <span>Operator Register</span>
            </button>

            <button
              onClick={() => setAdminSubTab('commissions')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-left cursor-pointer transition-all ${
                adminSubTab === 'commissions' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : darkMode 
                    ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Sliders size={16} />
              <span>Commission Rates</span>
            </button>

            <button
              onClick={() => setAdminSubTab('wallet')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-left cursor-pointer transition-all ${
                adminSubTab === 'wallet' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : darkMode 
                    ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Wallet size={16} />
              <span>Wallet Management</span>
            </button>

            <button
              onClick={() => setAdminSubTab('backup')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-left cursor-pointer transition-all ${
                adminSubTab === 'backup' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : darkMode 
                    ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Database size={16} />
              <span>Backups & Restore</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN COMPLEX PANELS */}
        <div className="lg:col-span-3">
          
          {/* Sub Tab: Operators roster lists */}
          {adminSubTab === 'operators' && (
            <div className={`p-5 rounded-3xl border space-y-4 animate-fade-in ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-base font-display">Branch Operators roster</h3>
                  <p className="text-xs text-slate-400">Allocate dynamic daily wallet limits and customized commission yields</p>
                </div>
                <button
                  onClick={() => setIsAddingOperator(!isAddingOperator)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  {isAddingOperator ? 'Close form' : 'Add Operator +'}
                </button>
              </div>

              {isAddingOperator && (
                <form onSubmit={handleAddOperator} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Operator Name *</label>
                    <input
                      type="text"
                      required
                      value={opName}
                      onChange={(e) => setOpName(e.target.value)}
                      placeholder="e.g. Priyesh Vyas"
                      className={`w-full px-2.5 py-1.5 rounded-lg border outline-hidden ${
                        darkMode ? 'bg-slate-905 bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Email ID *</label>
                    <input
                      type="email"
                      required
                      value={opEmail}
                      onChange={(e) => setOpEmail(e.target.value)}
                      placeholder="e.g. priyesh@gmail.com"
                      className={`w-full px-2.5 py-1.5 rounded-lg border outline-hidden ${
                        darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">phoneNumber Contact *</label>
                    <input
                      type="text"
                      required
                      value={opPhone}
                      onChange={(e) => setOpPhone(e.target.value)}
                      placeholder="e.g. +91 94140 00234"
                      className={`w-full px-2.5 py-1.5 rounded-lg border outline-hidden ${
                        darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">RBAC Role *</label>
                    <select
                      value={opRole}
                      onChange={(e: any) => setOpRole(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border outline-hidden ${
                        darkMode ? 'bg-slate-900 text-white border-slate-850' : 'bg-white border-slate-300'
                      }`}
                    >
                      <option value="Operator">Standard Operator</option>
                      <option value="Admin">Administrator (Branch Manager)</option>
                      {currentUser?.role === 'Super Admin' && (
                        <option value="Super Admin">Super Admin (Highest Authority)</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Secure Login Password *</label>
                    <input
                      type="text"
                      required
                      placeholder="Default password"
                      value={opPassword}
                      onChange={(e) => setOpPassword(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border outline-hidden font-mono ${
                        darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-350'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Max Cash Limit *</label>
                    <input
                      type="number"
                      required
                      value={opLimit}
                      onChange={(e) => setOpLimit(Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border outline-hidden font-mono font-bold ${
                        darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Commission Share (60-90%) *</label>
                    <input
                      type="number"
                      required
                      min={60}
                      max={90}
                      value={opCommRate}
                      onChange={(e) => setOpCommRate(Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border outline-hidden font-mono ${
                        darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="col-span-1 sm:col-span-2 py-2 bg-blue-600 text-white rounded-xl font-bold cursor-pointer hover:bg-blue-700"
                  >
                    Save to Operator Registry
                  </button>
                </form>
              )}

              {/* Roster database cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOperators.map(op => {
                  const canManageThisUser = currentUser?.role === 'Super Admin' || op.role !== 'Super Admin';
                  
                  return (
                    <div key={op.id} className={`p-4 rounded-2xl border space-y-3 ${
                      op.status === 'Inactive' ? 'opacity-60 bg-slate-50/50 dark:bg-slate-905/30' : 'bg-slate-50 dark:bg-slate-950/40'
                    } border-slate-100 dark:border-slate-850`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                            op.role === 'Super Admin' 
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' 
                              : op.role === 'Admin'
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
                              : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600'
                          }`}>
                            {op.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="font-bold text-slate-900 dark:text-white leading-tight">{op.name}</h5>
                              {op.isLockedOut && (
                                <span className="px-1.5 py-0.5 bg-rose-550 bg-rose-600 text-white font-extrabold text-[8px] rounded animate-pulse">
                                  🔒 LOCKED OUT
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] font-mono pr-2 opacity-50 block leading-tight">{op.email}</span>
                          </div>
                        </div>

                        <button
                          disabled={!canManageThisUser}
                          onClick={() => handleToggleOpStatus(op.id)}
                          className={`px-2 py-0.5 rounded-sm text-[9px] font-bold transition-all ${
                            !canManageThisUser 
                              ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 cursor-not-allowed' 
                              : op.status === 'Active' 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          {op.status === 'Active' ? 'Active' : 'Suspended'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-slate-200/60 dark:border-slate-850 pt-2 text-[11px] font-mono bg-white dark:bg-slate-900 p-2 rounded-xl">
                        <div>
                          <span className="text-[9px] text-slate-400 block leading-none">RBAC Identity</span>
                          <span className={`font-bold ${
                            op.role === 'Super Admin' ? 'text-amber-500' : op.role === 'Admin' ? 'text-blue-500' : 'text-emerald-500'
                          }`}>{op.role}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block leading-none">Contact</span>
                          <span className="font-mono text-slate-900 dark:text-white">{op.phoneNumber}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block leading-none">Cash Limit</span>
                          <span className="font-bold text-slate-900 dark:text-white">{formatINR(op.walletLimit)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block leading-none">Yield rate</span>
                          <span className="font-bold text-emerald-500">{op.commissionRate}% Share</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                          <span>🔑 Key:</span>
                          <span className="font-bold select-all bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                            {op.password || 'operator123'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {op.isLockedOut && (
                            <button
                              onClick={() => handleUnlockOperator(op.id)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[9px] uppercase tracking-wide cursor-pointer shadow-sm shadow-amber-500/20"
                            >
                              Unlock
                            </button>
                          )}
                          
                          {currentUser?.role === 'Super Admin' && currentUser.id !== op.id && (
                            <button
                              onClick={() => handleDeleteOperator(op.id)}
                              className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-500 font-bold rounded-lg text-[10px] cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reset password inline portal */}
                      {resettingOpId === op.id ? (
                        <div className="mt-2 p-2.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl space-y-2 border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-semibold">🔑 Set New Secure Password (नया पासवर्ड लिखें):</span>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="e.g. securePass1"
                              value={newPassVal}
                              onChange={(e) => setNewPassVal(e.target.value)}
                              className={`flex-1 px-2.5 py-1 rounded-md text-[11px] font-mono border outline-hidden ${
                                darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                              }`}
                            />
                            <button
                              onClick={() => handleResetPassword(op.id, newPassVal)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setResettingOpId(null)}
                              className="px-2.5 py-1 bg-slate-500 hover:bg-slate-600 text-white text-[10px] font-bold rounded-md cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : editingOpId === op.id ? (
                        <div className="mt-2 p-3 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl space-y-3 border border-amber-500/20">
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold uppercase tracking-wider">⚙️ Edit Operator Cash Limit & Commission (सीमा और कमीशन सेट करें)</span>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-1">CSP Cash Limit (₹)</label>
                              <input
                                type="number"
                                value={editLimitVal}
                                onChange={(e) => setEditLimitVal(Number(e.target.value))}
                                className={`w-full px-2 py-1 rounded-md text-[11px] font-mono font-bold border outline-hidden ${
                                  darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                                }`}
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-1">Yield Share (60-90%)</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={editCommVal}
                                onChange={(e) => setEditCommVal(Number(e.target.value))}
                                className={`w-full px-2 py-1 rounded-md text-[11px] font-mono font-bold border outline-hidden ${
                                  darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                                }`}
                              />
                            </div>
                          </div>

                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => handleUpdateOpSettings(op.id, editLimitVal, editCommVal)}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-md cursor-pointer"
                            >
                              Save Limit & Share
                            </button>
                            <button
                              onClick={() => setEditingOpId(null)}
                              className="px-2.5 py-1 bg-slate-500 hover:bg-slate-600 text-white text-[10px] font-bold rounded-md cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          <button
                            disabled={!canManageThisUser}
                            onClick={() => {
                              setEditingOpId(op.id);
                              setEditLimitVal(op.walletLimit);
                              setEditCommVal(op.commissionRate);
                            }}
                            className={`px-2 py-1 font-bold rounded-lg text-[10px] inline-flex items-center gap-1 transition-all ${
                              canManageThisUser 
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 cursor-pointer' 
                                : 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            ⚙️ Edit CSP Limits (सीमाएं बदलें)
                          </button>
                          <button
                            disabled={!canManageThisUser}
                            onClick={() => { setResettingOpId(op.id); setNewPassVal(''); }}
                            className={`px-2 py-1 font-bold rounded-lg text-[10px] inline-flex items-center gap-1 transition-all ${
                              canManageThisUser 
                                ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 cursor-pointer' 
                                : 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            🔑 Change Password (पासवर्ड बदलें)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub Tab: Commissions setting updates */}
          {adminSubTab === 'commissions' && (
            <form onSubmit={handleSaveCommissions} className={`p-5 rounded-3xl border space-y-5 animate-fade-in ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <h3 className="font-bold text-base font-display">CSP + eMitra Commission Matrices</h3>
                <p className="text-xs text-slate-400">Control system-wide calculation rates applied on Deposits, aePS withdrawals, and domestic transfers</p>
              </div>

              {/* Commission rates forms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl">
                <h4 className="col-span-1 sm:col-span-2 text-[10px] font-bold font-mono uppercase text-slate-400">National Banking Rates</h4>
                
                <div>
                  <label className="text-xs font-semibold text-slate-450 block mb-1">Cash Deposit Rate (%)</label>
                  <input
                    type="number"
                    step={0.01}
                    required
                    value={depositRate}
                    onChange={(e) => setDepositRate(Number(e.target.value))}
                    className={`w-full px-3 py-1.5 rounded-xl border font-mono ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <span className="text-[9px] text-slate-450 block mt-1">E.g. 0.20% awards ₹20 commission on a ₹10,000 cash deposit.</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-450 block mb-1">AEPS Cash Withdrawal (%)</label>
                  <input
                    type="number"
                    step={0.01}
                    required
                    value={withdrawalRate}
                    onChange={(e) => setWithdrawalRate(Number(e.target.value))}
                    className={`w-full px-3 py-1.5 rounded-xl border font-mono ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <span className="text-[9px] text-slate-450 block mt-1">E.g. 0.50% awards ₹50 commission on a ₹10,000 withdrawal transaction.</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-450 block mb-1">Fixed Transfer Fee (Rs)</label>
                  <input
                    type="number"
                    required
                    value={transferRate}
                    onChange={(e) => setTransferRate(Number(e.target.value))}
                    className={`w-full px-3 py-1.5 rounded-xl border font-mono ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <span className="text-[9px] text-slate-450 block mt-1">Fixed fee charged to the customer on domestic fund transfers.</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-450 block mb-1">IMPS DMT Fee Matrix Share (%)</label>
                  <input
                    type="number"
                    step={0.01}
                    required
                    value={dmtRate}
                    onChange={(e) => setDmtRate(Number(e.target.value))}
                    className={`w-full px-3 py-1.5 rounded-xl border font-mono ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <span className="text-[9px] text-slate-450 block mt-1">Defines percentage of DMT user charges kept as commission share.</span>
                </div>
              </div>

              {/* Expense budget & restrictions form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl">
                <h4 className="col-span-1 sm:col-span-2 text-[10px] font-bold font-mono uppercase text-rose-500 flex items-center gap-1">
                  <span>●</span> Shop Operations & Expense Config (दुकान खर्च सेटिंग्स)
                </h4>
                
                <div>
                  <label className="text-xs font-semibold text-slate-450 block mb-1">Monthly Cost/Expense Budget Limit (₹)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={expenseBudgetLimit}
                    onChange={(e) => setExpenseBudgetLimit(Number(e.target.value))}
                    className={`w-full px-3 py-1.5 rounded-xl border font-mono ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <span className="text-[9px] text-slate-450 block mt-1">Maximum targeted expenses budget in Rs. used to warn or monitor monthly shop outflow.</span>
                </div>

                <div className="flex items-center justify-start sm:pt-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={disableOperatorExpenseLogging}
                      onChange={(e) => setDisableOperatorExpenseLogging(e.target.checked)}
                      className="w-4 h-4 rounded-md border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-650 dark:text-slate-300 block">
                        Restrict Operators from recording entries
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Only Admins can log or delete expense records on active branches when selected.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Dynamic Expense Categories (खर्च के प्रकार) */}
                <div className="col-span-1 sm:col-span-2 border-t border-slate-200/45 dark:border-slate-800/45 pt-4 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">1. Custom Expense Categories / Types (खर्च के प्रकार सेटिंग्स)</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Define allowed custom categories for recording shop outflows.</span>
                  </div>
                  
                  {/* Category Chips List */}
                  <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                    {customExpenseCategories.map(cat => (
                      <span 
                        key={cat}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/10 group/chip"
                      >
                        {cat}
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat)}
                          className="text-slate-400 hover:text-rose-650 cursor-pointer font-bold select-none text-[10px] pl-0.5"
                          title="Remove category"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add New Category form strip */}
                  <div className="flex gap-2 max-w-sm">
                    <input
                      type="text"
                      placeholder="e.g. Courier / Speed Post"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className={`flex-1 px-3 py-1.5 rounded-xl border text-xs outline-hidden ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                    >
                      + जोड़ें
                    </button>
                  </div>
                </div>

                {/* Dynamic Staff/Operators for expenses (खर्च करने वाले स्टाफ नाम) */}
                <div className="col-span-1 sm:col-span-2 border-t border-slate-200/45 dark:border-slate-800/45 pt-4 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">2. Allowed Staff / Operator Names (खर्च करने वाले स्टाफ का नाम)</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Authorised operators or helpers allowed to allocate or log expenses.</span>
                  </div>
                  
                  {/* Staff Chips List */}
                  <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                    {staffNames.map(staff => (
                      <span 
                        key={staff}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 group/chip"
                      >
                        {staff}
                        <button
                          type="button"
                          onClick={() => handleRemoveStaff(staff)}
                          className="text-slate-400 hover:text-indigo-650 cursor-pointer font-bold select-none text-[10px] pl-0.5"
                          title="Remove staff"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add New Staff form strip */}
                  <div className="flex gap-2 max-w-sm">
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Singh"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      className={`flex-1 px-3 py-1.5 rounded-xl border text-xs outline-hidden ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddStaff}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                    >
                      + जोड़ें
                    </button>
                  </div>
                </div>
              </div>

              {/* eMitra services list and table with actions to delete */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-850">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/55 dark:border-slate-800 pb-2">
                  <div>
                    <h4 className="text-[11px] font-bold font-mono uppercase text-slate-400">eMitra Citizen Services & Fee Chart</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Edit base SSO wallet costs, branch commissions, or delete custom services.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/60 dark:border-slate-800 text-[10px] font-mono tracking-wider uppercase text-slate-400">
                        <th className="py-2 pr-2">Service Name</th>
                        <th className="py-2 px-2 text-right">SSO Govt Cost (₹)</th>
                        <th className="py-2 px-2 text-right">CSP Commission (₹)</th>
                        <th className="py-2 pl-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50 text-xs text-slate-800 dark:text-slate-200">
                      {Object.keys(emitraRates).map((service) => (
                        <tr key={service} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/10">
                          <td className="py-2.5 pr-2 font-medium text-slate-800 dark:text-slate-100 truncate max-w-[150px]" title={service}>
                            {service}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              required
                              value={emitraFees[service] !== undefined ? emitraFees[service] : 100}
                              onChange={(e) => setEmitraFees({ ...emitraFees, [service]: Number(e.target.value) })}
                              className={`w-18 px-1.5 py-1 rounded-md border text-right font-mono font-bold text-[11px] outline-hidden ${
                                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              required
                              value={emitraRates[service] !== undefined ? emitraRates[service] : 35}
                              onChange={(e) => setEmitraRates({ ...emitraRates, [service]: Number(e.target.value) })}
                              className={`w-18 px-1.5 py-1 rounded-md border text-right font-mono font-bold text-[11px] outline-hidden ${
                                darkMode ? 'bg-slate-900 border-slate-805 text-white' : 'bg-white border-slate-300'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 pl-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteService(service)}
                              className="p-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Delete Service"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {Object.keys(emitraRates).length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400 italic text-[11px]">
                            No services active in registry. Add a service below!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Sub form: Add element to services inline */}
                <div className="border-t border-slate-200/55 dark:border-slate-800 pt-4 mt-2 space-y-3">
                  <h5 className="font-bold text-xs flex items-center gap-1 text-slate-800 dark:text-slate-150">
                    <Plus size={14} className="text-blue-500" /> Add New Custom eMitra Service
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-405 block mb-1">Service Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Police Verification"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border outline-hidden ${
                          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-250'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-405 block mb-1">SSO Govt Cost (₹) *</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="e.g. 50"
                        value={newServiceFee}
                        onChange={(e) => setNewServiceFee(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-mono outline-hidden ${
                          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-250'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-405 block mb-1">CSP Commission (₹) *</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="e.g. 30"
                        value={newServiceRate}
                        onChange={(e) => setNewServiceRate(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-mono outline-hidden ${
                          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-250'
                        }`}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewService}
                    className="py-1.5 px-3 bg-blue-600/10 text-blue-600 border border-blue-600/25 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    + Register Custom Service Type
                  </button>
                </div>
              </div>

              {/* Custom Offline work settings block */}
              <div className="space-y-4 bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-850">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/55 dark:border-slate-800 pb-2">
                  <div>
                    <h4 className="text-[11px] font-bold font-mono uppercase text-slate-400">Offline Work & Document Print Registry List</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Edit customer charges, default raw materials cost, or delete offline service nodes.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/60 dark:border-slate-800 text-[10px] font-mono tracking-wider uppercase text-slate-400">
                        <th className="py-2 pr-2">Service Name</th>
                        <th className="py-2 px-2 text-right">Customer Fee (₹)</th>
                        <th className="py-2 px-2 text-right">Raw Cost (₹)</th>
                        <th className="py-2 pl-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50 text-xs text-slate-800 dark:text-slate-200">
                      {Object.keys(offlineFees).map((service) => (
                        <tr key={service} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/10">
                          <td className="py-2.5 pr-2 font-medium text-slate-800 dark:text-slate-100 truncate max-w-[150px]" title={service}>
                            {service}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              required
                              value={offlineFees[service] !== undefined ? offlineFees[service] : 40}
                              onChange={(e) => setOfflineFees({ ...offlineFees, [service]: Number(e.target.value) })}
                              className={`w-18 px-1.5 py-1 rounded-md border text-right font-mono font-bold text-[11px] outline-hidden ${
                                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              required
                              value={offlineCosts[service] !== undefined ? offlineCosts[service] : 5}
                              onChange={(e) => setOfflineCosts({ ...offlineCosts, [service]: Number(e.target.value) })}
                              className={`w-18 px-1.5 py-1 rounded-md border text-right font-mono font-bold text-[11px] outline-hidden ${
                                darkMode ? 'bg-slate-900 border-slate-805 text-white' : 'bg-white border-slate-300'
                              }`}
                            />
                          </td>
                          <td className="py-2.5 pl-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteOfflineService(service)}
                              className="p-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Delete Offline Service"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {Object.keys(offlineFees).length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400 italic text-[11px]">
                            No offline services active in registry. Register one below!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Sub form: Add element to offline services inline */}
                <div className="border-t border-slate-200/55 dark:border-slate-800 pt-4 mt-2 space-y-3">
                  <h5 className="font-bold text-xs flex items-center gap-1 text-slate-800 dark:text-slate-150">
                    <Plus size={14} className="text-emerald-500" /> Add Custom Offline Service Type
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-405 block mb-1">Service Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Spiral Binding"
                        value={newOfflineName}
                        onChange={(e) => setNewOfflineName(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border outline-hidden ${
                          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-250'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-405 block mb-1">Customer Price/Fee (₹) *</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="e.g. 40"
                        value={newOfflineFee}
                        onChange={(e) => setNewOfflineFee(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-mono outline-hidden ${
                          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-250'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-405 block mb-1">Base Raw Cost (₹) *</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="e.g. 5"
                        value={newOfflineCost}
                        onChange={(e) => setNewOfflineCost(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-mono outline-hidden ${
                          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-250'
                        }`}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewOfflineService}
                    className="py-1.5 px-3 bg-emerald-600/10 text-emerald-600 border border-emerald-600/25 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    + Register Custom Offline Type
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer text-center"
              >
                Apply System Calculations Adjustments
              </button>
            </form>
          )}

          {/* Sub Tab: Wallet management / Topup capital */}
          {adminSubTab === 'wallet' && (
            <div className={`p-5 rounded-3xl border space-y-4 animate-fade-in ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <h3 className="font-bold text-base font-display">Branch Capital Top-up</h3>
                <p className="text-xs text-slate-400">Add secure immediate reserves to your running Cash register wallet via bank transfers</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left Side: Balance & Direct Setter */}
                <div className="space-y-4">
                  <div className="p-4 bg-blue-600 rounded-2xl text-white space-y-2 relative overflow-hidden">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-blue-200 block">Total Running Balance</span>
                    <p className="text-3xl font-bold font-display font-mono">{formatINR(wallet.balance)}</p>
                    
                    <div className="text-[11px] text-blue-100 flex items-center gap-1 opacity-70">
                      <ShieldCheck size={12} />
                      <span>Real-time backed limit</span>
                    </div>
                  </div>

                  {/* Direct Override Form */}
                  <form onSubmit={handleDirectWalletSet} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 space-y-3">
                    <div>
                      <h4 className="font-bold text-xs flex items-center gap-1 text-slate-800 dark:text-slate-150">
                        <Sliders size={13} className="text-amber-500" /> Directly Set Balance
                      </h4>
                      <p className="text-[10px] text-slate-400">Directly override the running cash register balance to a custom specified value.</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-405 block mb-1">Target Balance (INR)</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={directWalletBalance}
                        onChange={(e) => setDirectWalletBalance(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold outline-hidden ${
                          darkMode ? 'bg-slate-900 text-white border-slate-800 focus:border-amber-500' : 'bg-white border-slate-350 focus:border-amber-600'
                        }`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      Override Balance Value
                    </button>
                  </form>
                </div>

                {/* Right Side: Instrument Capital Topup */}
                <form onSubmit={handleWalletTopup} className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 space-y-3.5 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs flex items-center gap-1 text-slate-800 dark:text-slate-150">
                      <Plus size={13} className="text-emerald-500" /> Add Reserve Capital
                    </h4>
                    <p className="text-[10px] text-slate-400">Increment the balance using settled payment details or bank UTNs.</p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-405 block mb-1">Top-up Amount (INR)</label>
                      <input
                        type="number"
                        required
                        min={100}
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold outline-hidden ${
                          darkMode ? 'bg-slate-900 text-white border-slate-800 focus:border-emerald-500' : 'bg-white border-slate-350 focus:border-emerald-600'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-455 block mb-1">Settlement instrument reference</label>
                      <input
                        type="text"
                        required
                        value={topupSource}
                        onChange={(e) => setTopupSource(e.target.value)}
                        placeholder="Check details, or BANK UTN"
                        className={`w-full px-2.5 py-1.5 rounded-lg border outline-hidden ${
                          darkMode ? 'bg-slate-900 text-white border-slate-800 focus:border-emerald-500' : 'bg-white border-slate-350 focus:border-emerald-600'
                        }`}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors mt-2"
                  >
                    Top-up Wallet Limit
                  </button>
                </form>
              </div>

              {/* AEPS Wallet Ledger Override Form */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 space-y-3">
                <div>
                  <h4 className="font-bold text-xs flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Sliders size={13} /> AEPS Banking Balance Overrides (Online & Physical)
                  </h4>
                  <p className="text-[10px] text-slate-400">Set precise virtual balances for both Online Portal and branch Physical Cash accounting.</p>
                </div>

                <form onSubmit={handleDirectAepsWalletSet} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Online Cash Portal Balance (INR)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={directAepsOnline}
                      onChange={(e) => setDirectAepsOnline(Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold outline-hidden ${
                        darkMode ? 'bg-slate-900 text-white border-slate-800 focus:border-amber-500' : 'bg-white border-slate-350 focus:border-amber-600'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Branch Physical Cash in Hand (INR)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={directAepsPhysical}
                      onChange={(e) => setDirectAepsPhysical(Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold outline-hidden ${
                        darkMode ? 'bg-slate-900 text-white border-slate-800 focus:border-amber-500' : 'bg-white border-slate-350 focus:border-amber-600'
                      }`}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                    >
                      Override AEPS Balances
                    </button>
                  </div>
                </form>
              </div>

              {/* eMitra Wallet Load & Unload Form */}
              <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/15 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="font-bold text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Wallet size={14} /> eMitra Wallet Management (Load & Unload)
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Load the eMitra wallet with funds deducted from your CSP Cash Limit, or Unload remaining eMitra funds back to the CSP Cash Limit.
                    </p>
                  </div>
                  <div className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-right">
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase tracking-wider">Current eMitra Balance</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{formatINR(emitraWallet.balance)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Load eMitra Wallet Form */}
                  <form onSubmit={handleEmitraWalletLoad} className="space-y-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850">
                    <h5 className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Plus size={12} /> Load eMitra Wallet
                    </h5>
                    <p className="text-[10px] text-slate-400">Funds are debited from CSP Cash Limit (Available: {formatINR(wallet.balance)})</p>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Load Amount (₹)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={emitraLoadAmount}
                        onChange={(e) => setEmitraLoadAmount(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold outline-hidden ${
                          darkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-emerald-500' : 'bg-white border-slate-250 focus:border-emerald-600'
                        }`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Deduct from CSP & Load eMitra Wallet
                    </button>
                  </form>

                  {/* Unload eMitra Wallet Form */}
                  <form onSubmit={handleEmitraWalletUnload} className="space-y-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850">
                    <h5 className="font-bold text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                      <Plus size={12} className="rotate-45" /> Unload eMitra Wallet
                    </h5>
                    <p className="text-[10px] text-slate-400">Funds are returned to CSP Cash Limit (Current eMitra: {formatINR(emitraWallet.balance)})</p>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">Unload Amount (₹)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={emitraUnloadAmount}
                        onChange={(e) => setEmitraUnloadAmount(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold outline-hidden ${
                          darkMode ? 'bg-slate-900 border-slate-800 text-white focus:border-red-500' : 'bg-white border-slate-250 focus:border-red-650'
                        }`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Unload eMitra Wallet to CSP Limit
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Sub Tab: Backups & System factory resets */}
          {adminSubTab === 'backup' && (
            <div className={`p-5 rounded-3xl border space-y-4 animate-fade-in ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <h3 className="font-bold text-base font-display">System Backup & Recovery</h3>
                <p className="text-xs text-slate-400">Wipe data matrices, export complete state database files, or restore default setups</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Option 1: Backing up */}
                <div className="p-4 rounded-2xl bg-blue-600/5 text-slate-800 dark:text-slate-200 border border-blue-500/15 space-y-3 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Download size={15} /> Backup System Database
                    </h5>
                    <p className="text-xs text-slate-400 leading-normal mt-1.5">
                      Download the entire active state dataset (including registered customers, active tokens, and security logs) as a clean `.json` dump file.
                    </p>
                  </div>
                  <button
                    onClick={handleBackupState}
                    className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold cursor-pointer hover:bg-blue-700 transition-colors"
                  >
                    Download State JSON
                  </button>
                </div>

                {/* Option 2: Clear Demo Data */}
                <div className="p-4 rounded-2xl bg-amber-600/5 text-slate-800 dark:text-slate-200 border border-amber-500/15 space-y-3 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Trash2 size={15} /> Clear All Demo Data
                    </h5>
                    <p className="text-xs text-slate-400 leading-normal mt-1.5">
                      Recommended: Safely clear out all default demo transactions, dummy customer registers, applications, and expenses to prepare the system for live operations.
                    </p>
                  </div>
                  <button
                    onClick={handleClearDemoData}
                    className="w-full py-2 bg-amber-600 text-white rounded-xl font-bold cursor-pointer hover:bg-amber-700 transition-colors"
                  >
                    Clear Demo Entries
                  </button>
                </div>

                {/* Option 3: Factory wiping */}
                <div className="p-4 rounded-2xl bg-rose-600/5 text-slate-800 dark:text-slate-200 border border-rose-500/15 space-y-3 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold flex items-center gap-1 text-rose-600 dark:text-rose-455">
                      <Database size={15} /> System Factory Reset
                    </h5>
                    <p className="text-xs text-slate-405 leading-normal mt-1.5 text-slate-400">
                      CRITICAL: Instantly clear all modifications from your browser store, wiping all transaction references, customer files, and restoring default matrices.
                    </p>
                  </div>
                  <button
                    onClick={handleSystemRestoreDefault}
                    className="w-full py-2 bg-rose-600 text-white rounded-xl font-bold cursor-pointer hover:bg-rose-700 transition-colors"
                  >
                    Wipe database defaults
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
