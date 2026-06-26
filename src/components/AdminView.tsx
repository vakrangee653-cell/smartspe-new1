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
  Lock,
  History,
  Check,
  X,
  FileSpreadsheet,
  Activity
} from 'lucide-react';
import { AppState, Operator, EmitraServiceType } from '../types';
import { formatINR } from '../utils';
import { getAllUserStatesFromFirestore, saveStateToFirestore } from '../firebase';

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
  const [adminSubTab, setAdminSubTab] = React.useState<'operators' | 'commissions' | 'wallet' | 'backup' | 'settlements' | 'activity_timeline'>('operators');

  // Cloud Diagnostics & Data Recovery
  const [scannedDocs, setScannedDocs] = React.useState<{ id: string; data: any }[]>([]);
  const [scanLoading, setScanLoading] = React.useState(false);
  const [scanError, setScanError] = React.useState('');
  const [recoveryLogs, setRecoveryLogs] = React.useState<string[]>([]);

  // New operator form states
  const [isAddingOperator, setIsAddingOperator] = React.useState(false);
  const [opName, setOpName] = React.useState('');
  const [opEmail, setOpEmail] = React.useState('');
  const [opPhone, setOpPhone] = React.useState('');
  const [opRole, setOpRole] = React.useState<'Admin' | 'Operator'>('Operator');
  const [opLimit, setOpLimit] = React.useState(100000);
  const [opCommRate, setOpCommRate] = React.useState(100);
  const [opPassword, setOpPassword] = React.useState('operator123');

  // Operator recharge states
  const [rechargeOpId, setRechargeOpId] = React.useState('');
  const [rechargeAmt, setRechargeAmt] = React.useState<number>(5000);

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
    // Admins can only see operators they created and cannot see Super Admins
    return operators.filter(op => op.role !== 'Super Admin' && op.createdBy === currentUser.id);
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

  // Settlements states
  const [settlementFilter, setSettlementFilter] = React.useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [settlementSearch, setSettlementSearch] = React.useState('');
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [activeRejectionId, setActiveRejectionId] = React.useState<string | null>(null);

  // Activity Timeline states
  const [timelineSearch, setTimelineSearch] = React.useState('');
  const [timelineActionFilter, setTimelineActionFilter] = React.useState<string>('All');
  const [timelineOperatorFilter, setTimelineOperatorFilter] = React.useState<string>('All');

  // Dynamic Commission Rules states
  const [showRuleModal, setShowRuleModal] = React.useState(false);
  const [ruleService, setRuleService] = React.useState<'Deposit' | 'Withdrawal' | 'DMT' | 'UPI Payment' | 'eMitra' | 'Offline'>('Deposit');
  const [ruleTargetType, setRuleTargetType] = React.useState<'All' | 'Admin' | 'Operator' | 'Specific'>('All');
  const [ruleTargetUserId, setRuleTargetUserId] = React.useState<string>('');
  const [ruleRateType, setRuleRateType] = React.useState<'percentage' | 'fixed'>('percentage');
  const [ruleRateValue, setRuleRateValue] = React.useState<number>(0.5);
  const [activeHistoryRuleId, setActiveHistoryRuleId] = React.useState<string | null>(null);

  // Cloud Backup List
  const [cloudBackups, setCloudBackups] = React.useState<{ id: string; timestamp: string; size: number; creator: string; description: string; data: any }[]>([]);
  const [isBackingUpCloud, setIsBackingUpCloud] = React.useState(false);
  const [isRestoringCloud, setIsRestoringCloud] = React.useState(false);

  // Load cloud backups list on load/tab switch and handle Daily Automatic Backups
  React.useEffect(() => {
    if (adminSubTab === 'backup' && currentUser?.role === 'Super Admin') {
      const savedBackups = localStorage.getItem('smartspe_cloud_backups');
      let currentList: any[] = [];
      if (savedBackups) {
        try {
          currentList = JSON.parse(savedBackups);
          setCloudBackups(currentList);
        } catch (e) {
          console.error(e);
        }
      } else {
        const initialBackups = [
          {
            id: 'bk-78291',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            size: 45200,
            creator: 'System Core Engine',
            description: 'Daily Automatic System Snapshot',
            data: null
          },
          {
            id: 'bk-71029',
            timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            size: 44900,
            creator: 'Vakrangee Super Admin',
            description: 'Manual Golden Snapshot Pre-Upgrade',
            data: null
          }
        ];
        currentList = initialBackups;
        setCloudBackups(initialBackups);
        localStorage.setItem('smartspe_cloud_backups', JSON.stringify(initialBackups));
      }

      // Daily Automatic Backup Trigger: Check if there is already an automatic backup for today
      const todayString = new Date().toISOString().split('T')[0];
      const hasTodayBackup = currentList.some(b => b.timestamp.startsWith(todayString) && b.description.includes('Automatic'));
      if (!hasTodayBackup) {
        const autoBackup = {
          id: `bk-${String(Date.now()).slice(-5)}`,
          timestamp: new Date().toISOString(),
          size: JSON.stringify(state).length,
          creator: 'System Core Engine',
          description: `Daily Automatic System Snapshot (${todayString})`,
          data: JSON.parse(JSON.stringify(state))
        };
        const updatedBackups = [autoBackup, ...currentList];
        setCloudBackups(updatedBackups);
        localStorage.setItem('smartspe_cloud_backups', JSON.stringify(updatedBackups));
        console.log("Daily automatic system backup created successfully!");
      }
    }
  }, [adminSubTab, currentUser, state]);

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
  const isSuperAdmin = currentUser?.role === 'Super Admin';

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
      isLockedOut: false,
      createdBy: currentUser?.id || 'op-1'
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

  // Recharge Operator Wallet balance
  const handleRechargeOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargeOpId) {
      alert('कृपया रिचार्ज करने के लिए ऑपरेटर का चयन करें। (Please select an Operator)');
      return;
    }
    if (rechargeAmt <= 0) {
      alert('कृपया वैध रिचार्ज राशि दर्ज करें। (Please enter a valid amount)');
      return;
    }
    if (wallet.balance < rechargeAmt) {
      alert(`अपर्याप्त कैश बैलेंस! (Insufficient funds in your branch cash balance. Available: ${formatINR(wallet.balance)})`);
      return;
    }

    const targetOp = state.operators.find(o => o.id === rechargeOpId);
    if (!targetOp) return;

    // Deduct from Admin's wallet and add to Operator's wallet balance
    const updatedWallet = {
      ...wallet,
      balance: wallet.balance - rechargeAmt,
      lastUpdated: new Date().toISOString()
    };

    const updatedOperators = state.operators.map(op => {
      if (op.id === rechargeOpId) {
        const currentBal = op.walletBalance !== undefined ? op.walletBalance : (op.walletLimit !== undefined ? op.walletLimit : 15000);
        return {
          ...op,
          walletBalance: currentBal + rechargeAmt,
          updatedAt: new Date().toISOString()
        };
      }
      return op;
    });

    const rechargeAuditLog = {
      id: `log-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
      operatorId: currentUser?.id || 'op-1',
      operatorName: currentUser?.name || 'Admin',
      role: currentUser?.role || 'Admin',
      action: `Recharged Operator Wallet of ${targetOp.name} with ₹${rechargeAmt}. Sourced from Admin CSP Cash Limit.`,
      status: 'Success' as const,
      ipAddress: '47.11.134.19',
      device: 'Admin Console',
      browser: 'Secure Admin browser'
    };

    onUpdateState({
      ...state,
      wallet: updatedWallet,
      operators: updatedOperators,
      securityLogs: [rechargeAuditLog, ...state.securityLogs]
    });

    setRechargeAmt(5000);
    setRechargeOpId('');
    alert(`₹${rechargeAmt} का रिचार्ज सफलतापूर्वक ऑपरेटर ${targetOp.name} के वॉलेट में जोड़ दिया गया है!`);
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

  // Create Manual Cloud Backup
  const handleCreateCloudBackup = () => {
    setIsBackingUpCloud(true);
    setTimeout(() => {
      const newBackup = {
        id: `bk-${String(Date.now()).slice(-5)}`,
        timestamp: new Date().toISOString(),
        size: JSON.stringify(state).length,
        creator: currentUser?.name || 'Vakrangee Super Admin',
        description: `Manual Backup by ${currentUser?.role || 'Super Admin'}`,
        data: JSON.parse(JSON.stringify(state))
      };
      
      const updatedList = [newBackup, ...cloudBackups];
      setCloudBackups(updatedList);
      localStorage.setItem('smartspe_cloud_backups', JSON.stringify(updatedList));
      setIsBackingUpCloud(false);
      
      // Log Security audit
      onUpdateState({
        ...state,
        securityLogs: [
          {
            id: `log-${Date.now().toString().slice(-5)}`,
            timestamp: new Date().toISOString(),
            operatorId: currentUser?.id || 'op-super',
            operatorName: currentUser?.name || 'Vakrangee Super Admin',
            role: 'Super Admin',
            action: `Created manual system state backup snapshot (Backup ID: ${newBackup.id})`,
            status: 'Success',
            ipAddress: '127.0.0.1',
            device: 'System Portal Server',
            browser: 'Chrome 125'
          },
          ...state.securityLogs
        ]
      });
      alert(`Manual system backup ${newBackup.id} successfully generated and stored.`);
    }, 1200);
  };

  // Restore State from Cloud Backup
  const handleRestoreFromCloudBackup = (backupId: string) => {
    const selected = cloudBackups.find(b => b.id === backupId);
    if (!selected) {
      alert("Selected backup not found.");
      return;
    }
    if (!window.confirm(`CRITICAL CONFIRMATION: Are you sure you want to completely restore the system state to snapshot ${selected.id} generated on ${new Date(selected.timestamp).toLocaleString()}? This will replace all current data!`)) return;

    setIsRestoringCloud(true);
    setTimeout(() => {
      const restoredData = selected.data;
      if (!restoredData) {
        alert("This is a demo snapshot index, restore is simulated.");
        setIsRestoringCloud(false);
        return;
      }

      onUpdateState({
        ...restoredData,
        securityLogs: [
          {
            id: `log-${Date.now().toString().slice(-5)}`,
            timestamp: new Date().toISOString(),
            operatorId: currentUser?.id || 'op-super',
            operatorName: currentUser?.name || 'Vakrangee Super Admin',
            role: 'Super Admin',
            action: `Restored entire system state database from Cloud Backup snapshot: ${selected.id}`,
            status: 'Success',
            ipAddress: '127.0.0.1',
            device: 'System Portal Server',
            browser: 'Chrome 125'
          },
          ...restoredData.securityLogs
        ]
      });
      setIsRestoringCloud(false);
      alert("Entire database successfully restored from Cloud Backup. The application state has been rolled back.");
    }, 1500);
  };

  // Import JSON File Backup
  const handleUploadBackupFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Basic schema checks to verify it is an AppState
        if (!json.currentUser || !json.operators || !json.transactions) {
          alert("Invalid backup file! The schema does not match SmartSPE AppState structure.");
          return;
        }

        if (window.confirm("CONFIRM RESTORE: Do you want to completely overwrite current database with this JSON backup file?")) {
          onUpdateState({
            ...json,
            securityLogs: [
              {
                id: `log-${Date.now().toString().slice(-5)}`,
                timestamp: new Date().toISOString(),
                operatorId: currentUser?.id || 'op-super',
                operatorName: currentUser?.name || 'Vakrangee Super Admin',
                role: 'Super Admin',
                action: 'Imported system database from external JSON file upload',
                status: 'Success',
                ipAddress: '127.0.0.1',
                device: 'System Portal Server',
                browser: 'Chrome 125'
              },
              ...(json.securityLogs || [])
            ]
          });
          alert("System state successfully imported and restored from JSON file!");
        }
      } catch (err) {
        alert("Failed to parse JSON file! Please ensure it is a valid backup dump.");
      }
    };
    reader.readAsText(file);
  };

  // Approve Settlement Request
  const handleApproveSettlement = (id: string) => {
    const settlement = (state.settlements || []).find(s => s.id === id);
    if (!settlement) return;

    if (!window.confirm(`Are you sure you want to APPROVE this settlement request of ₹${settlement.amount} to bank account ${settlement.accountNumber}?`)) return;

    // Check if wallet has sufficient balance
    if (wallet.balance < settlement.amount) {
      alert(`Sufficient branch cash limit balance not available! Required: ₹${settlement.amount}, Available: ₹${wallet.balance}`);
      return;
    }

    const newBalance = wallet.balance - settlement.amount;
    
    // Create new settlement array
    const updatedSettlements = (state.settlements || []).map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: 'Approved' as const,
          approvedBy: currentUser?.id || 'op-super',
          approvedAt: new Date().toISOString()
        };
      }
      return s;
    });

    // Create a corresponding Ledger Entry for the settlement debit
    const newLedgerEntry = {
      id: `wle-${String(Date.now()).slice(-5)}`,
      userId: settlement.operatorId,
      userName: settlement.operatorName,
      role: 'Operator',
      transactionId: settlement.id,
      service: 'Settlement Payout',
      openingBalance: wallet.balance,
      credit: 0,
      debit: settlement.amount,
      closingBalance: newBalance,
      availableBalance: newBalance,
      status: 'Success' as const,
      operatorId: settlement.operatorId,
      adminId: currentUser?.id || 'op-super',
      timestamp: new Date().toISOString()
    };

    // Add activity timeline
    const newTimelineEntry = {
      id: `act-${String(Date.now()).slice(-5)}`,
      timestamp: new Date().toISOString(),
      userId: settlement.operatorId,
      userName: settlement.operatorName,
      role: 'Operator' as const,
      actionType: 'Wallet Debit' as const,
      details: `Settlement request approved for payout of ₹${settlement.amount} to ${settlement.bankName}`,
      amount: settlement.amount,
      status: 'Success' as const
    };

    // Trigger state update
    onUpdateState({
      ...state,
      wallet: {
        ...wallet,
        balance: newBalance,
        lastUpdated: new Date().toISOString()
      },
      settlements: updatedSettlements,
      walletLedger: [newLedgerEntry, ...(state.walletLedger || [])],
      activityTimeline: [newTimelineEntry, ...(state.activityTimeline || [])],
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-super',
          operatorName: currentUser?.name || 'Super Admin',
          role: 'Super Admin',
          action: `Approved bank settlement payout of ₹${settlement.amount} for operator ${settlement.operatorName}`,
          status: 'Success',
          ipAddress: '127.0.0.1',
          device: 'App Web Console',
          browser: 'Chrome 125'
        },
        ...state.securityLogs
      ],
      notifications: [
        {
          notificationId: `not-${String(Date.now()).slice(-5)}`,
          title: 'Settlement Approved (सेटलमेंट स्वीकृत)',
          message: `Your settlement request of ₹${settlement.amount} to bank ${settlement.bankName} has been approved and payout processed.`,
          type: 'success',
          userId: settlement.operatorId,
          role: 'Operator',
          status: 'unread',
          createdAt: new Date().toISOString()
        },
        ...(state.notifications || [])
      ]
    });

    alert("Settlement payout request successfully APPROVED and processed.");
  };

  // Reject Settlement Request
  const handleRejectSettlementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRejectionId || !rejectionReason.trim()) return;

    const settlement = (state.settlements || []).find(s => s.id === activeRejectionId);
    if (!settlement) return;

    const updatedSettlements = (state.settlements || []).map(s => {
      if (s.id === activeRejectionId) {
        return {
          ...s,
          status: 'Rejected' as const,
          remarks: rejectionReason,
          approvedBy: currentUser?.id || 'op-super',
          approvedAt: new Date().toISOString()
        };
      }
      return s;
    });

    // Add activity timeline
    const newTimelineEntry = {
      id: `act-${String(Date.now()).slice(-5)}`,
      timestamp: new Date().toISOString(),
      userId: settlement.operatorId,
      userName: settlement.operatorName,
      role: 'Operator' as const,
      actionType: 'Wallet Debit' as const,
      details: `Settlement request of ₹${settlement.amount} REJECTED. Reason: ${rejectionReason}`,
      amount: settlement.amount,
      status: 'Failed' as const
    };

    onUpdateState({
      ...state,
      settlements: updatedSettlements,
      activityTimeline: [newTimelineEntry, ...(state.activityTimeline || [])],
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-super',
          operatorName: currentUser?.name || 'Super Admin',
          role: 'Super Admin',
          action: `Rejected bank settlement of ₹${settlement.amount} for operator ${settlement.operatorName}. Reason: ${rejectionReason}`,
          status: 'Success',
          ipAddress: '127.0.0.1',
          device: 'App Web Console',
          browser: 'Chrome 125'
        },
        ...state.securityLogs
      ],
      notifications: [
        {
          notificationId: `not-${String(Date.now()).slice(-5)}`,
          title: 'Settlement Rejected (सेटलमेंट अस्वीकृत)',
          message: `Your settlement request of ₹${settlement.amount} has been rejected. Reason: ${rejectionReason}`,
          type: 'error',
          userId: settlement.operatorId,
          role: 'Operator',
          status: 'unread',
          createdAt: new Date().toISOString()
        },
        ...(state.notifications || [])
      ]
    });

    alert("Settlement request rejected and operator notified.");
    setActiveRejectionId(null);
    setRejectionReason('');
  };

  // Create Commission Rule
  const handleCreateCommissionRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let targetName = 'All Users';
    if (ruleTargetType === 'Admin') targetName = 'All Branch Admins';
    if (ruleTargetType === 'Operator') targetName = 'All Operators';
    if (ruleTargetType === 'Specific') {
      const found = operators.find(op => op.id === ruleTargetUserId);
      targetName = found ? found.name : ruleTargetUserId;
    }

    const newRule = {
      id: `rcr-${String(Date.now()).slice(-5)}`,
      service: ruleService,
      targetType: ruleTargetType,
      targetId: ruleTargetUserId || 'all',
      targetName: targetName,
      rateType: (ruleRateType === 'percentage' ? 'Percentage' : 'Fixed') as 'Percentage' | 'Fixed',
      rateValue: ruleRateValue,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          timestamp: new Date().toISOString(),
          action: 'Created rule',
          changedBy: currentUser?.name || 'Super Admin',
          prevVal: 0,
          newVal: ruleRateValue,
          prevStatus: false,
          newStatus: true
        }
      ]
    };

    onUpdateState({
      ...state,
      commissionRules: [newRule, ...(state.commissionRules || [])],
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-super',
          operatorName: currentUser?.name || 'Super Admin',
          role: 'Super Admin',
          action: `Created custom commission rule ${newRule.id} for service ${ruleService} targeting ${targetName}`,
          status: 'Success',
          ipAddress: '127.0.0.1',
          device: 'App Web Console',
          browser: 'Chrome 125'
        },
        ...state.securityLogs
      ]
    });

    alert(`Commission rule successfully registered for ${ruleService}!`);
    setShowRuleModal(false);
  };

  // Toggle Commission Rule Enabled/Disabled
  const handleToggleCommissionRule = (id: string) => {
    const rulesList = (state.commissionRules || []).map(r => {
      if (r.id === id) {
        const nextStatus = !r.enabled;
        const historyLog = {
          timestamp: new Date().toISOString(),
          action: nextStatus ? 'Enabled Rule' : 'Disabled Rule',
          changedBy: currentUser?.name || 'Super Admin',
          prevVal: r.rateValue,
          newVal: r.rateValue,
          prevStatus: r.enabled,
          newStatus: nextStatus
        };
        return {
          ...r,
          enabled: nextStatus,
          updatedAt: new Date().toISOString(),
          history: [historyLog, ...(r.history || [])]
        };
      }
      return r;
    });

    onUpdateState({
      ...state,
      commissionRules: rulesList,
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-super',
          operatorName: currentUser?.name || 'Super Admin',
          role: 'Super Admin',
          action: `Toggled status of custom commission rule ${id}`,
          status: 'Success',
          ipAddress: '127.0.0.1',
          device: 'App Web Console',
          browser: 'Chrome 125'
        },
        ...state.securityLogs
      ]
    });

    alert("Commission rule status successfully modified.");
  };

  // Delete Commission Rule
  const handleDeleteCommissionRule = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this custom commission rule? This action is permanent.")) return;

    onUpdateState({
      ...state,
      commissionRules: (state.commissionRules || []).filter(r => r.id !== id),
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-super',
          operatorName: currentUser?.name || 'Super Admin',
          role: 'Super Admin',
          action: `Deleted custom commission rule ${id}`,
          status: 'Success',
          ipAddress: '127.0.0.1',
          device: 'App Web Console',
          browser: 'Chrome 125'
        },
        ...state.securityLogs
      ]
    });

    alert("Commission rule successfully deleted.");
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

  // Cloud Database Diagnostics & Live Self-Healing Recovery
  const handleScanDatabase = async () => {
    setScanLoading(true);
    setScanError('');
    try {
      const docs = await getAllUserStatesFromFirestore();
      setScannedDocs(docs);
      setRecoveryLogs(prev => [
        `[${new Date().toLocaleTimeString()}] 🔍 Scan Completed: Found ${docs.length} active documents in Firestore database.`,
        ...prev
      ]);
    } catch (err: any) {
      setScanError(err?.message || String(err));
      setRecoveryLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ❌ Scan Failed: ${err?.message || String(err)}`,
        ...prev
      ]);
    } finally {
      setScanLoading(false);
    }
  };

  const handleRecoverMergeDoc = (docId: string, docData: any) => {
    if (!window.confirm(`Are you sure you want to recover and merge all entries from [${docId}] into your current branch active state? This will automatically recover missing transactions, customers, eMitra entries, and offline work without overwriting any existing data.`)) return;

    try {
      // 1. Transactions merge
      const existingTxns = [...state.transactions];
      const incomingTxns = docData.transactions || [];
      let txMergedCount = 0;
      for (const tx of incomingTxns) {
        if (!existingTxns.some((t: any) => t.id === tx.id)) {
          existingTxns.push(tx);
          txMergedCount++;
        }
      }

      // 2. eMitra Applications merge
      const existingApps = [...state.emitraApplications];
      const incomingApps = docData.emitraApplications || [];
      let appMergedCount = 0;
      for (const app of incomingApps) {
        if (!existingApps.some((a: any) => a.id === app.id)) {
          existingApps.push(app);
          appMergedCount++;
        }
      }

      // 3. Offline Work merge
      const existingWork = [...state.offlineWork];
      const incomingWork = docData.offlineWork || [];
      let workMergedCount = 0;
      for (const w of incomingWork) {
        if (!existingWork.some((work: any) => work.id === w.id)) {
          existingWork.push(w);
          workMergedCount++;
        }
      }

      // 4. Customers merge
      const existingCusts = [...state.customers];
      const incomingCusts = docData.customers || [];
      let custMergedCount = 0;
      for (const c of incomingCusts) {
        if (!existingCusts.some((cust: any) => cust.id === c.id)) {
          existingCusts.push(c);
          custMergedCount++;
        }
      }

      // 5. Update State
      onUpdateState({
        ...state,
        transactions: existingTxns,
        emitraApplications: existingApps,
        offlineWork: existingWork,
        customers: existingCusts,
        securityLogs: [
          {
            id: `log-${String(Date.now()).slice(-5)}`,
            timestamp: new Date().toISOString(),
            operatorId: currentUser?.id || 'op-super',
            operatorName: currentUser?.name || 'Vakrangee Super Admin',
            role: currentUser?.role || 'Super Admin',
            action: `Recovered and merged data from Firestore document [${docId}]: Restored ${txMergedCount} txs, ${appMergedCount} eMitra, ${workMergedCount} offline, ${custMergedCount} customers`,
            status: 'Success',
            ipAddress: '127.0.0.1',
            device: 'System Recovery Terminal',
            browser: 'System Web'
          },
          ...state.securityLogs
        ]
      });

      setRecoveryLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ✅ Merged Doc [${docId}] successfully! Restored: ${txMergedCount} txs, ${appMergedCount} apps, ${workMergedCount} offline, ${custMergedCount} customers.`,
        ...prev
      ]);
      alert(`Success! Successfully restored and merged:\n- ${txMergedCount} Transactions\n- ${appMergedCount} eMitra Applications\n- ${workMergedCount} Offline work records\n- ${custMergedCount} Customers\ninto your active branch state.`);

      // Refresh scanning list
      setTimeout(() => {
        handleScanDatabase();
      }, 500);
    } catch (err: any) {
      alert(`Recovery failed: ${err?.message || String(err)}`);
    }
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

            {currentUser?.role === 'Super Admin' && (
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
            )}

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

            {currentUser?.role === 'Super Admin' && (
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
            )}

            <button
              onClick={() => setAdminSubTab('settlements')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-left cursor-pointer transition-all ${
                adminSubTab === 'settlements' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : darkMode 
                    ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <UserCheck size={16} />
              <span>Settlement Center</span>
            </button>

            {currentUser?.role === 'Super Admin' && (
              <button
                onClick={() => setAdminSubTab('activity_timeline')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-left cursor-pointer transition-all ${
                  adminSubTab === 'activity_timeline' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : darkMode 
                      ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <RefreshCw size={16} />
                <span>Activity Timeline</span>
              </button>
            )}
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
                  <div className="col-span-1 sm:col-span-2">
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
                        <div className="col-span-2 border-t border-slate-100 dark:border-slate-800 pt-1">
                          <span className="text-[9px] text-slate-400 block leading-none">CSP Cash Limit</span>
                          <span className="font-bold text-slate-900 dark:text-white">{formatINR(op.walletLimit)}</span>
                        </div>
                        {op.createdBy && (() => {
                          const creatorOp = operators.find(o => o.id === op.createdBy);
                          return (
                            <div className="col-span-2 border-t border-slate-100 dark:border-slate-800 pt-1">
                              <span className="text-[9px] text-slate-400 block leading-none">Created By / Creator (प्रशासक / शाखा)</span>
                              <span className="font-bold text-slate-600 dark:text-slate-300 text-xs block truncate mt-0.5">
                                {creatorOp 
                                  ? `${creatorOp.name} (${creatorOp.email})` 
                                  : (op.createdBy === 'op-super' ? 'System Super Admin (vakrangee653@gmail.com)' : op.createdBy)
                                }
                              </span>
                            </div>
                          );
                        })()}
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
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold uppercase tracking-wider">⚙️ Edit Operator Cash Limit (सीमा सेट करें)</span>
                          
                          <div className="text-xs">
                            <label className="text-[9px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">CSP Cash Limit (₹)</label>
                            <input
                              type="number"
                              value={editLimitVal}
                              onChange={(e) => setEditLimitVal(Number(e.target.value))}
                              className={`w-full px-2 py-1 rounded-md text-[11px] font-mono font-bold border outline-hidden ${
                                darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                              }`}
                            />
                          </div>

                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => handleUpdateOpSettings(op.id, editLimitVal, op.commissionRate)}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-md cursor-pointer"
                            >
                              Save Limit (सीमा सहेजें)
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
                        <div className="space-y-2">
                          {/* Operator Transfer Option for Super Admins */}
                          {currentUser?.role === 'Super Admin' && op.role === 'Operator' && (
                            <div className="p-2 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-2">
                              <span className="text-[9px] text-blue-600 dark:text-blue-400 block font-bold uppercase tracking-wider">🔄 Transfer Operator to another Admin</span>
                              <div className="flex gap-2">
                                <select
                                  onChange={(e) => {
                                    const targetAdminId = e.target.value;
                                    if (!targetAdminId) return;
                                    if (window.confirm(`Are you sure you want to transfer operator ${op.name} to Admin ${operators.find(o => o.id === targetAdminId)?.name}?`)) {
                                      // Update state
                                      const updated = operators.map(u => {
                                        if (u.id === op.id) {
                                          return {
                                            ...u,
                                            adminId: targetAdminId,
                                            createdBy: targetAdminId,
                                            updatedAt: new Date().toISOString()
                                          };
                                        }
                                        return u;
                                      });
                                      
                                      // Create log
                                      const targetAdmin = operators.find(o => o.id === targetAdminId);
                                      const logMsg = `Transferred operator ${op.name} (${op.email}) to Admin ${targetAdmin?.name || targetAdminId}`;
                                      const newLog = {
                                        id: 'log_' + Date.now(),
                                        timestamp: new Date().toISOString(),
                                        operatorId: currentUser?.id || 'op-super',
                                        operatorName: currentUser?.name || 'Super Admin',
                                        role: currentUser?.role || 'Super Admin',
                                        action: logMsg,
                                        status: 'Success' as const,
                                        ipAddress: '47.11.134.19',
                                        device: 'Admin Control Hub',
                                        browser: 'Web secure portal browser'
                                      };
                                      
                                      onUpdateState({
                                        ...state,
                                        operators: updated,
                                        securityLogs: [newLog, ...(state.securityLogs || [])]
                                      });
                                      
                                      alert(`✅ Operator successfully transferred! (ट्रांसफर संपन्न हुआ!)`);
                                    }
                                    e.target.value = ""; // Reset
                                  }}
                                  className={`w-full px-2 py-1 text-[10px] rounded-md border outline-hidden ${
                                    darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-250'
                                  }`}
                                >
                                  <option value="">-- Choose New Admin --</option>
                                  {operators
                                    .filter(u => u.role === 'Admin')
                                    .map(u => (
                                      <option key={u.id} value={u.id}>
                                        {u.name} ({u.email})
                                      </option>
                                    ))
                                  }
                                </select>
                              </div>
                            </div>
                          )}

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
            <div className="space-y-6 animate-fade-in">
              <form onSubmit={handleSaveCommissions} className={`p-5 rounded-3xl border space-y-5 ${
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

            {/* Rule-Based Dynamic Commissions Settings block */}
            <div className={`p-5 rounded-3xl border space-y-4 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm font-display text-slate-800 dark:text-slate-100">Rule-Based Dynamic Commission Slabs</h3>
                  <p className="text-[11px] text-slate-400">Override base rates dynamically by defining rules per-service, user role, or individual operator accounts.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRuleModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={13} /> Add Commission Rule
                </button>
              </div>

              {/* Rules List Table */}
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-mono tracking-wider uppercase text-slate-400 ${
                      darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-150'
                    }`}>
                      <th className="py-2.5 px-4">Rule ID</th>
                      <th className="py-2.5 px-4">Service Type</th>
                      <th className="py-2.5 px-4">Target Audience</th>
                      <th className="py-2.5 px-4 text-right">Commission Slab</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50 text-xs">
                    {(state.commissionRules || []).map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/10">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-100">
                          {rule.id}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                          {rule.service}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold text-[10px]">
                            {rule.targetName}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold font-mono text-slate-800 dark:text-slate-100">
                          {rule.rateValue}{rule.rateType === 'Percentage' ? '%' : ' Rs'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleCommissionRule(rule.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                              rule.enabled 
                                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                                : 'bg-slate-500/10 text-slate-500 hover:bg-slate-500/20'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${rule.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {rule.enabled ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveHistoryRuleId(rule.id)}
                              className="p-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="View History Logs"
                            >
                              <History size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCommissionRule(rule.id)}
                              className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Delete Rule Slabs"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(state.commissionRules || []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-450 italic font-mono text-[11px]">
                          No custom commission override rules configured in running session database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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

                  {/* Direct Override Form - Super Admin Only */}
                  {currentUser?.role === 'Super Admin' && (
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
                  )}
                </div>

                {/* Right Side: Instrument Capital Topup / Operator Recharge */}
                {currentUser?.role === 'Super Admin' ? (
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
                ) : (
                  /* Operator Wallet Recharge Form - Admin Only */
                  <form onSubmit={handleRechargeOperator} className="p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 space-y-3.5 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs flex items-center gap-1 text-slate-800 dark:text-slate-150">
                        <Wallet size={13} className="text-blue-500" /> Recharge Operator Wallet (ऑपरेटर रिचार्ज)
                      </h4>
                      <p className="text-[10px] text-slate-400">Transfer running cash limit from your branch balance into one of your Operator's wallets.</p>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-405 block mb-1">Select Operator *</label>
                        <select
                          required
                          value={rechargeOpId}
                          onChange={(e) => setRechargeOpId(e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs outline-hidden ${
                            darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-350'
                          }`}
                        >
                          <option value="">-- Choose Operator --</option>
                          {filteredOperators.map(op => (
                            <option key={op.id} value={op.id}>
                              {op.name} ({op.email}) - Bal: {formatINR(op.walletBalance !== undefined ? op.walletBalance : (op.walletLimit !== undefined ? op.walletLimit : 15000))}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-455 block mb-1">Recharge Amount (₹) *</label>
                        <input
                          type="number"
                          required
                          min={100}
                          value={rechargeAmt}
                          onChange={(e) => setRechargeAmt(Number(e.target.value))}
                          className={`w-full px-2.5 py-1.5 rounded-lg border font-mono font-bold outline-hidden ${
                            darkMode ? 'bg-slate-900 text-white border-slate-800 focus:border-blue-500' : 'bg-white border-slate-350 focus:border-blue-600'
                          }`}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors mt-2"
                    >
                      Process Recharge (रिचार्ज करें)
                    </button>
                  </form>
                )}
              </div>

              {/* AEPS Wallet Ledger Override Form - Super Admin Only */}
              {currentUser?.role === 'Super Admin' && (
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
              )}

              {/* eMitra Wallet Load & Unload Form - Super Admin Only */}
              {currentUser?.role === 'Super Admin' && (
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
              )}
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

              {/* Option 4: Cloud Backups & JSON Imports */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                
                {/* Cloud Snapshot Manager */}
                <div className={`p-5 rounded-2xl border ${
                  darkMode ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-150'
                } space-y-4`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">
                      Cloud Snapshots Ledger
                    </h4>
                    <button
                      onClick={handleCreateCloudBackup}
                      disabled={isBackingUpCloud}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-450 text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {isBackingUpCloud ? 'Backing up...' : '+ Save Cloud Snapshot'}
                    </button>
                  </div>

                  {/* Backups List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {cloudBackups.map((bk) => (
                      <div key={bk.id} className={`p-3 rounded-xl text-xs border flex items-center justify-between ${
                        darkMode ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-900' : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}>
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800 dark:text-slate-100 font-mono flex items-center gap-1.5">
                            {bk.id}
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-500 font-semibold font-mono">
                              {(bk.size / 1000).toFixed(1)} KB
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold">{bk.description}</p>
                          <p className="text-[9px] text-slate-405">{new Date(bk.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleRestoreFromCloudBackup(bk.id)}
                            disabled={isRestoringCloud}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-[9px] rounded-lg cursor-pointer transition-colors"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Delete backup snapshot?")) {
                                const remaining = cloudBackups.filter(b => b.id !== bk.id);
                                setCloudBackups(remaining);
                                localStorage.setItem('smartspe_cloud_backups', JSON.stringify(remaining));
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-550 transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {cloudBackups.length === 0 && (
                      <p className="text-center text-slate-450 italic py-4 text-[10px]">No snapshots found.</p>
                    )}
                  </div>
                </div>

                {/* External Backup JSON Importer */}
                <div className={`p-5 rounded-2xl border ${
                  darkMode ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-150'
                } space-y-4 flex flex-col justify-between`}>
                  <div>
                    <h4 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono">
                      Import External JSON Backup
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      Upload a previously exported database backup JSON dump. This will securely merge with or restore all branch limits, operators, and customer registers.
                    </p>
                  </div>

                  {/* Custom Drag & Drop/Click Upload box */}
                  <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    darkMode ? 'bg-slate-900/40 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-500'
                  }`}>
                    <Upload className="text-blue-500" size={20} />
                    <div className="text-center">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">Click to select JSON Backup</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">File must end with .json</span>
                    </div>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleUploadBackupFile} 
                      className="hidden" 
                    />
                  </label>
                </div>

              </div>

              {/* Live Database Diagnostics & Self-Healing Section */}
              <div className={`mt-6 p-5 rounded-2xl border ${
                darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="font-bold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <ShieldCheck size={18} className="animate-pulse" /> 
                      Active Cloud Diagnostics & Live Self-Healing (सक्रिय क्लाउड डेटा रिकवरी और डायग्नोस्टिक्स)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Scan all Firestore branch nodes in real-time, inspect saved transaction records, and instantly restore/merge missing entries made by any operator.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleScanDatabase}
                    disabled={scanLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-blue-500/10 shrink-0"
                  >
                    {scanLoading ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" /> Scanning Database...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={13} /> 🔍 Scan Cloud Firestore Database (सक्रिय डेटाबेस स्कैन करें)
                      </>
                    )}
                  </button>
                </div>

                {/* Console Logs */}
                {recoveryLogs.length > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-black font-mono text-[10px] text-emerald-400 border border-slate-800 max-h-32 overflow-y-auto space-y-1">
                    <div className="text-slate-500 border-b border-slate-900 pb-1 mb-1 flex justify-between items-center">
                      <span>RECOVERY TERMINAL ACTIVE LOGGER</span>
                      <button 
                        onClick={() => setRecoveryLogs([])}
                        className="text-red-400 hover:text-red-300 text-[9px] underline bg-transparent border-none cursor-pointer"
                      >
                        Clear logs
                      </button>
                    </div>
                    {recoveryLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">{log}</div>
                    ))}
                  </div>
                )}

                {scanError && (
                  <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Scan Error:</span> {scanError}
                    </div>
                  </div>
                )}

                {scannedDocs.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-xs font-semibold text-slate-500 flex justify-between items-center px-1">
                      <span>Real-Time Branch Records in Cloud Storage ({scannedDocs.length} Documents)</span>
                      <span className="text-[10px] text-blue-500">Click recover to restore entries instantly</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {scannedDocs.map((docItem) => {
                        const d = docItem.data || {};
                        const txCount = Array.isArray(d.transactions) ? d.transactions.length : 0;
                        const appCount = Array.isArray(d.emitraApplications) ? d.emitraApplications.length : 0;
                        const workCount = Array.isArray(d.offlineWork) ? d.offlineWork.length : 0;
                        const custCount = Array.isArray(d.customers) ? d.customers.length : 0;
                        
                        // Try to identify operator details
                        let docLabel = "Isolated/Unknown Branch Node";
                        let opEmail = "";
                        
                        if (docItem.id === 'shared_shop_state') {
                          docLabel = "Central Operator Registry (केंद्रीय ऑपरेटर सूची)";
                        } else if (docItem.id === 'shop_state_op-super') {
                          docLabel = "Main Branch / Super Admin Document (मुख्य शाखा)";
                        } else {
                          // Search inside state.operators with canonical ID support
                          const opReg = state.operators.find(op => {
                            const canonicalId = op.email.toLowerCase() === 'vakrangee653@gmail.com' ? 'op-super' :
                                                op.email.toLowerCase() === 'rajendra.spe@gmail.com' ? 'op-1' :
                                                op.email.toLowerCase() === 'smartspeatm@gmail.com' ? 'op-smartspeatm' :
                                                op.email.toLowerCase() === 'suresh.emitra@gmail.com' ? 'op-2' :
                                                op.email.toLowerCase() === 'priyanka.csp@gmail.com' ? 'op-3' : op.id;
                            
                            const targetDocId = docItem.id.replace('shop_state_', '');
                            return op.id === targetDocId || canonicalId === targetDocId || `shop_state_${op.id}` === docItem.id;
                          });
                          if (opReg) {
                            docLabel = `${opReg.name} (${opReg.role === 'Admin' ? 'Admin' : 'Operator'})`;
                            opEmail = opReg.email;
                          } else {
                            const incomingOps = d.operators || [];
                            const matchedOp = incomingOps.find((op: any) => op.id === docItem.id);
                            if (matchedOp) {
                              docLabel = `${matchedOp.name} (${matchedOp.role})`;
                              opEmail = matchedOp.email;
                            } else {
                              docLabel = `Branch ID: ${docItem.id}`;
                            }
                          }
                        }

                        const hasRecoverableData = txCount > 0 || appCount > 0 || workCount > 0 || custCount > 0;

                        return (
                          <div
                            key={docItem.id}
                            className={`p-4 rounded-xl border transition-all ${
                              darkMode 
                                ? 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900' 
                                : 'bg-white border-slate-200 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${hasRecoverableData ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                  <span className="font-bold text-xs font-mono">{docItem.id}</span>
                                  {opEmail && (
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-mono">
                                      {opEmail}
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                  {docLabel}
                                </h5>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 font-medium">
                                  <span>Transactions (लेनदेन): <strong className="text-slate-700 dark:text-slate-200">{txCount}</strong></span>
                                  <span>eMitra (आवेदन): <strong className="text-slate-700 dark:text-slate-200">{appCount}</strong></span>
                                  <span>Offline Work (कार्य): <strong className="text-slate-700 dark:text-slate-200">{workCount}</strong></span>
                                  <span>Customers (ग्राहक): <strong className="text-slate-700 dark:text-slate-200">{custCount}</strong></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {hasRecoverableData ? (
                                  <button
                                    onClick={() => handleRecoverMergeDoc(docItem.id, d)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                                  >
                                    <RefreshCw size={13} /> 
                                    Recover & Merge (प्रविष्टियां लोड करें)
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic px-3 py-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
                                    No entries to merge
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Detailed List of transactions inside this document */}
                            {txCount > 0 && (
                              <div className="mt-3 pt-3 border-t border-slate-150 dark:border-slate-800/60">
                                <p className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                                  Recent Transactions in Document:
                                </p>
                                <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg text-[10px] font-mono">
                                  {(d.transactions as any[]).map((tx: any, idx: number) => (
                                    <div key={tx.id || idx} className="flex justify-between items-center hover:bg-slate-150 dark:hover:bg-slate-900/60 p-1 rounded transition-all">
                                      <span className="text-slate-400">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'No Date'}</span>
                                      <span className="font-bold text-slate-700 dark:text-slate-300">{tx.customerName || 'No Name'}</span>
                                      <span className="text-blue-500 font-bold">{tx.type}</span>
                                      <span className="text-emerald-500 font-bold">{formatINR(tx.amount)}</span>
                                      <span className="text-slate-400">({tx.id})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  !scanLoading && (
                    <div className="p-8 rounded-xl border border-dashed border-slate-350 dark:border-slate-800 text-center text-slate-400 text-xs">
                      No cloud scan performed yet. Click the "Scan Cloud Firestore Database" button to analyze live records, find operator entries, and restore missing database rows.
                    </div>
                  )
                )}

              </div>
            </div>
          )}

          {/* Sub Tab: Settlements approvals */}
          {adminSubTab === 'settlements' && (
            <div className={`p-5 rounded-3xl border space-y-6 animate-fade-in ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-base font-display">Settlement Approvals & Payout Logs (सेटलमेंट भुगतान और अनुमोदन)</h3>
                  <p className="text-xs text-slate-400">Review operator settlement withdrawal requests, issue bank payouts, or decline requests with custom remarks.</p>
                </div>
                
                {/* Search & Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search by operator, bank..."
                    value={settlementSearch}
                    onChange={(e) => setSettlementSearch(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <select
                    value={settlementFilter}
                    onChange={(e) => setSettlementFilter(e.target.value as any)}
                    className={`px-3 py-1.5 rounded-xl border text-xs outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Pending Requests</span>
                  <span className="text-xl font-bold font-mono text-amber-500">
                    {(state.settlements || []).filter(s => s.status === 'Pending').length} requests
                  </span>
                </div>
                <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Approved volume (स्वीकृत राशि)</span>
                  <span className="text-xl font-bold font-mono text-emerald-500">
                    {formatINR((state.settlements || []).filter(s => s.status === 'Approved').reduce((acc, s) => acc + s.amount, 0))}
                  </span>
                </div>
                <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Rejected requests</span>
                  <span className="text-xl font-bold font-mono text-rose-500">
                    {(state.settlements || []).filter(s => s.status === 'Rejected').length} requests
                  </span>
                </div>
              </div>

              {/* Requests Table */}
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-mono tracking-wider uppercase text-slate-400 ${
                      darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-150'
                    }`}>
                      <th className="py-3 px-4">Request Details</th>
                      <th className="py-3 px-4">Operator</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                      <th className="py-3 px-4">Bank & Account Details</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50 text-xs">
                    {(state.settlements || [])
                      .filter(s => {
                        const matchesSearch = s.operatorName.toLowerCase().includes(settlementSearch.toLowerCase()) || 
                                              s.bankName.toLowerCase().includes(settlementSearch.toLowerCase()) ||
                                              (s.accountNumber && s.accountNumber.includes(settlementSearch));
                        const matchesFilter = settlementFilter === 'All' ? true : s.status === settlementFilter;
                        return matchesSearch && matchesFilter;
                      })
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/10 text-slate-800 dark:text-slate-200">
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-slate-800 dark:text-slate-100 block">{s.id}</span>
                            <span className="text-[10px] text-slate-400">{new Date(s.createdAt).toLocaleString()}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-700 dark:text-slate-200 block">{s.operatorName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {s.operatorId}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/10">
                              {s.type === 'Bank Settlement' ? 'Bank Settlement' : 'Wallet Transfer'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold font-mono text-slate-800 dark:text-slate-100">
                            {formatINR(s.amount)}
                          </td>
                          <td className="py-3 px-4">
                            {s.type === 'Bank Settlement' ? (
                              <div className="space-y-0.5 text-slate-750 dark:text-slate-300">
                                <p className="font-semibold">{s.bankName}</p>
                                <p className="font-mono text-[10px] text-slate-400">A/C: {s.accountNumber}</p>
                                <p className="font-mono text-[10px] text-slate-400">IFSC: {s.ifscCode}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Immediate Wallet Credit</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                              s.status === 'Pending' 
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/15' 
                                : s.status === 'Approved'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15'
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/15'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                s.status === 'Pending' ? 'bg-amber-500 animate-pulse' : s.status === 'Approved' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`} />
                              {s.status}
                            </span>
                            {s.remarks && (
                              <span className="block text-[9px] text-rose-500 italic mt-1 max-w-[150px] truncate" title={s.remarks}>
                                Reason: {s.remarks}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {s.status === 'Pending' ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleApproveSettlement(s.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setActiveRejectionId(s.id)}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">
                                <p>Processed</p>
                                <p className="font-mono text-[9px] mt-0.5">{s.approvedAt ? new Date(s.approvedAt).toLocaleDateString() : ''}</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    {(state.settlements || []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 italic font-mono text-[11px]">
                          No settlement payout requests logged in database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub Tab: Activity Audit Timeline */}
          {adminSubTab === 'activity_timeline' && (
            <div className={`p-5 rounded-3xl border space-y-6 animate-fade-in ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-base font-display">System Operations Activity Timeline (संचालन इतिहास)</h3>
                  <p className="text-xs text-slate-400">Real-time cryptographic forensic audit tracking all user logins, financial transactions, and wallet adjustments.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={timelineSearch}
                    onChange={(e) => setTimelineSearch(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                  <select
                    value={timelineActionFilter}
                    onChange={(e) => setTimelineActionFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl border text-xs outline-hidden ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="All">All Actions</option>
                    <option value="Login">Login</option>
                    <option value="Logout">Logout</option>
                    <option value="Transaction">Transaction</option>
                    <option value="Settlement">Settlement</option>
                    <option value="Commission">Commission Rule Change</option>
                    <option value="Wallet">Wallet Override</option>
                  </select>
                </div>
              </div>

              {/* Vertical Timeline List */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {(state.activityTimeline || [])
                  .filter(item => {
                    const matchesSearch = item.details.toLowerCase().includes(timelineSearch.toLowerCase()) || 
                                          item.userName.toLowerCase().includes(timelineSearch.toLowerCase());
                    const matchesFilter = timelineActionFilter === 'All' ? true : item.actionType.toLowerCase().includes(timelineActionFilter.toLowerCase());
                    return matchesSearch && matchesFilter;
                  })
                  .map((item, index) => {
                    return (
                      <div key={item.id || index} className="flex gap-4 relative group text-slate-800 dark:text-slate-100">
                        {/* Timeline left line */}
                        {index !== (state.activityTimeline || []).length - 1 && (
                          <span className="absolute top-8 left-4 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800" />
                        )}

                        {/* Icon Node */}
                        <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 shadow-xs border transition-colors ${
                          item.status === 'Success' 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}>
                          {item.actionType === 'Login' || item.actionType === 'Logout' ? (
                            <Lock size={14} />
                          ) : item.actionType === 'Wallet Debit' ? (
                            <TrendingUp size={14} />
                          ) : item.actionType === 'Wallet Credit' ? (
                            <Wallet size={14} />
                          ) : (
                            <Activity size={14} />
                          )}
                        </div>

                        {/* Content Card */}
                        <div className={`flex-1 p-4 rounded-2xl border transition-all ${
                          darkMode 
                            ? 'bg-slate-950/40 border-slate-850 hover:bg-slate-950/60' 
                            : 'bg-slate-50 border-slate-100 hover:bg-slate-100/55'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
                            <span className="font-bold text-xs block text-slate-800 dark:text-slate-100">
                              {item.actionType} - {item.userName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed">
                            {item.details}
                          </p>
                          {item.amount && (
                            <span className="inline-block mt-2 font-mono font-bold text-[10px] text-blue-500 bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded-md">
                              Transaction Volume: {formatINR(item.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {(state.activityTimeline || []).length === 0 && (
                  <div className="py-12 text-center text-slate-405 italic text-xs">
                    No timeline activity logs recorded in the running session database yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* COMMISSION RULES ADD MODAL */}
          {showRuleModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl ${
                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  <h3 className="font-bold text-base font-display">Create Custom Commission Rule</h3>
                  <button 
                    onClick={() => setShowRuleModal(false)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-655"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleCreateCommissionRuleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-405 uppercase block mb-1">Service Node Type</label>
                    <select
                      value={ruleService}
                      onChange={(e) => setRuleService(e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-xl border font-semibold outline-hidden ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-250'
                      }`}
                    >
                      <option value="Deposit">Cash Deposit</option>
                      <option value="Withdrawal">aePS Withdrawal</option>
                      <option value="DMT">Domestic Money Transfer (DMT)</option>
                      <option value="UPI Payment">UPI QR Merchant Payment</option>
                      <option value="eMitra">eMitra Citizens Portal</option>
                      <option value="Offline">Offline & Documents Print</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-405 uppercase block mb-1">Target Rule Audience</label>
                    <select
                      value={ruleTargetType}
                      onChange={(e) => {
                        setRuleTargetType(e.target.value as any);
                        if (e.target.value !== 'Specific') setRuleTargetUserId('');
                      }}
                      className={`w-full px-3 py-2 rounded-xl border font-semibold outline-hidden ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-250'
                      }`}
                    >
                      <option value="All">Global (All CSP Branches)</option>
                      <option value="Admin">All Local Admins only</option>
                      <option value="Operator">All Operators only</option>
                      <option value="Specific">Target Single Operator account</option>
                    </select>
                  </div>

                  {ruleTargetType === 'Specific' && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Select Single Operator Account</label>
                      <select
                        required
                        value={ruleTargetUserId}
                        onChange={(e) => setRuleTargetUserId(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border font-mono outline-hidden ${
                          darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-250'
                        }`}
                      >
                        <option value="">-- Choose Operator --</option>
                        {operators.map(op => (
                          <option key={op.id} value={op.id}>
                            {op.name} ({op.role} - Branch: {op.createdBy})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-455 uppercase block mb-1">Rate Type</label>
                      <select
                        value={ruleRateType}
                        onChange={(e) => setRuleRateType(e.target.value as any)}
                        className={`w-full px-3 py-2 rounded-xl border outline-hidden ${
                          darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-250'
                        }`}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed (₹ / Tx)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-455 uppercase block mb-1">Commission Rate Value</label>
                      <input
                        type="number"
                        step={0.01}
                        required
                        min={0}
                        value={ruleRateValue}
                        onChange={(e) => setRuleRateValue(Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-xl border font-mono font-bold outline-hidden ${
                          darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-250'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Register custom override rule
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* COMMISSION RULE HISTORY LOG VIEW MODAL */}
          {activeHistoryRuleId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl ${
                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  <h3 className="font-bold text-sm font-display">Rule Slabs Audit Logs ({activeHistoryRuleId})</h3>
                  <button 
                    onClick={() => setActiveHistoryRuleId(null)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-655"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto text-xs pr-1">
                  {((state.commissionRules || []).find(r => r.id === activeHistoryRuleId)?.history || []).map((h, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border ${
                      darkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[10px] text-blue-500 uppercase tracking-wider font-mono">
                          {h.action}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(h.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-850 dark:text-slate-200">
                        Modified by: <strong className="text-indigo-500">{h.changedBy}</strong>
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-100 dark:border-slate-855">
                        <span>Prev: {h.prevVal} ({h.prevStatus ? 'Enabled' : 'Disabled'})</span>
                        <span className="text-right text-emerald-500 font-bold">New: {h.newVal} ({h.newStatus ? 'Enabled' : 'Disabled'})</span>
                      </div>
                    </div>
                  ))}
                  {(((state.commissionRules || []).find(r => r.id === activeHistoryRuleId)?.history || []).length === 0) && (
                    <p className="text-center italic text-slate-450 py-4">No audit log history entries recorded.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SETTLEMENT REJECTION REASON DIALOG MODAL */}
          {activeRejectionId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl ${
                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  <h3 className="font-bold text-sm font-display text-rose-500">Provide Rejection Reason</h3>
                  <button 
                    onClick={() => {
                      setActiveRejectionId(null);
                      setRejectionReason('');
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-655"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleRejectSettlementSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-455 uppercase block mb-1">Remarks / Remarks Reason *</label>
                    <textarea
                      required
                      placeholder="Specify why this payout is rejected (e.g. Invalid bank details / Limit mismatched)"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-hidden resize-none ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-250'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Reject request & notify operator
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
