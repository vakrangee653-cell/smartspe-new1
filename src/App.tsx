/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import CustomersView from './components/CustomersView';
import BankingView from './components/BankingView';
import EmitraView from './components/EmitraView';
import OfflineView from './components/OfflineView';
import ReportsView from './components/ReportsView';
import SecurityView from './components/SecurityView';
import AdminView from './components/AdminView';
import ExpensesView from './components/ExpensesView';
import LoginView from './components/LoginView';
import UserProfileView from './components/UserProfileView';

import { getInitialState, saveState } from './data';
import { AppState, UserRole } from './types';
import { auth, saveStateToFirestore, getStateFromFirestore } from './firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { 
  Fingerprint, 
  Lock, 
  ShieldCheck, 
  Bell, 
  UserCheck, 
  Clock, 
  VolumeX, 
  HelpCircle,
  Menu,
  ShieldAlert
} from 'lucide-react';
import { formatINR } from './utils';

export const metadata = {
  title: "SmartSPE - CSC Management Software",
  description: "CSC Management & Billing Software"
};

export default function App() {
  const [state, setState] = React.useState<AppState>(() => getInitialState());
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [darkMode, setDarkMode] = React.useState(false);
  const [isLocked, setIsLocked] = React.useState(false);
  const [passcode, setPasscode] = React.useState('');
  const [passcodeError, setPasscodeError] = React.useState('');
  const [liveTime, setLiveTime] = React.useState('');
  const [firebaseLoading, setFirebaseLoading] = React.useState(true);

  // Set document title dynamically
  React.useEffect(() => {
    document.title = metadata.title;
  }, []);

  // Pre-action triggers for navigation shortcuts
  const [activePreAction, setActivePreAction] = React.useState<string | null>(null);

  // Selected Branch ID for Super Admin View Isolation and Switcher
  const [selectedBranchId, setSelectedBranchId] = React.useState<string>('all');

  // Real-time Firebase Auth Status Listener and Firestore Synchronizer
  React.useEffect(() => {
    const syncState = async () => {
      setFirebaseLoading(true);
      try {
        console.log('[App] Initial Sync - Fetching central operator registry...');
        const centralState = await getStateFromFirestore('shared_shop_state');
        if (centralState) {
          setState(prev => {
            let loadedOperators = centralState.operators || prev.operators;
            const hasSmartSPEATM = loadedOperators.some((op: any) => op.email.toLowerCase() === 'smartspeatm@gmail.com');
            
            if (!hasSmartSPEATM) {
              console.log('[App] Proactively injecting smartspeatm@gmail.com into loaded operator registry');
              loadedOperators = [
                ...loadedOperators,
                {
                  id: 'op-smartspeatm',
                  name: 'SmartSPE ATM Admin',
                  email: 'smartspeatm@gmail.com',
                  role: 'Admin',
                  status: 'Active',
                  walletLimit: 500000,
                  commissionRate: 80,
                  phoneNumber: '+91 99999 77777',
                  password: 'admin123',
                  failedAttempts: 0,
                  isLockedOut: false,
                  createdBy: 'op-super'
                }
              ];
              saveStateToFirestore('shared_shop_state', {
                operators: loadedOperators,
                securityLogs: centralState.securityLogs || prev.securityLogs,
                commissionSettings: centralState.commissionSettings || prev.commissionSettings
              });
            }

            const merged = {
              ...prev,
              operators: loadedOperators,
              securityLogs: centralState.securityLogs || prev.securityLogs,
              commissionSettings: centralState.commissionSettings || prev.commissionSettings
            };
            saveState(merged);
            return merged;
          });
        } else {
          const defaultState = getInitialState();
          await saveStateToFirestore('shared_shop_state', {
            operators: defaultState.operators,
            securityLogs: defaultState.securityLogs,
            commissionSettings: defaultState.commissionSettings
          });
        }
      } catch (err) {
        console.error('[App] Failed to load central state:', err);
      } finally {
        setFirebaseLoading(false);
      }
    };

    syncState();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('[App] Auth State Changed: User Signed In', firebaseUser.uid);
        const email = (firebaseUser.email || '').toLowerCase().trim();
        const role: UserRole = (email.includes('admin') || email === 'vakrangee653@gmail.com') ? 'Super Admin' : 'Admin';
        
        setState(prev => {
          const updatedUser = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Vakrangee Operator',
            email: email,
            role: role,
            phoneNumber: firebaseUser.phoneNumber || '+91 99999 55555'
          };
          
          const exists = prev.operators.some(op => op.id === firebaseUser.uid || op.email.toLowerCase() === email);
          let updatedOperators = [...prev.operators];
          
          if (!exists) {
            console.log('[App] Auto-registering logged-in Google/Firebase user into central operator list:', email);
            updatedOperators.push({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Vakrangee Operator',
              email: email,
              role: role === 'Super Admin' ? 'Super Admin' : 'Admin',
              status: 'Active',
              walletLimit: 15000,
              commissionRate: 12,
              phoneNumber: firebaseUser.phoneNumber || '+91 99999 55555',
              failedAttempts: 0,
              isLockedOut: false,
              createdBy: 'op-super'
            });
          } else {
            updatedOperators = updatedOperators.map(op => {
              if (op.email.toLowerCase() === email) {
                return { 
                  ...op, 
                  id: firebaseUser.uid,
                  role: op.role === 'Super Admin' ? 'Super Admin' : (role === 'Super Admin' ? 'Super Admin' : op.role)
                };
              }
              return op;
            });
          }
          
          const clean = {
            ...prev,
            currentUser: updatedUser,
            operators: updatedOperators
          };
          
          saveState(clean);
          
          // Save back to Firestore 'shared_shop_state' immediately
          saveStateToFirestore('shared_shop_state', {
            operators: updatedOperators,
            securityLogs: clean.securityLogs,
            commissionSettings: clean.commissionSettings
          });
          
          return clean;
        });
      } else {
        // Keep manual operator sessions active, otherwise reset guest
        setState(prev => {
          if (prev.currentUser && !prev.currentUser.id.startsWith('gg-') && prev.currentUser.id !== 'op-super') {
            return prev;
          }
          const clean = {
            ...prev,
            currentUser: null
          };
          saveState(clean);
          return clean;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Reactive isolated state loader (whenever currentUser ID changes, selectedBranchId changes, or operators count changes)
  React.useEffect(() => {
    const syncIsolatedState = async () => {
      if (!state.currentUser) return;
      
      const isSuper = state.currentUser.role === 'Super Admin';
      
      if (isSuper) {
        if (selectedBranchId === 'all') {
          console.log('[App] Super Admin - Fetching and aggregating ALL branches...');
          setFirebaseLoading(true);
          try {
            // Get all registered Admins in the network
            const admins = state.operators.filter(op => op.role === 'Admin');
            
            // If there are no admins yet, load op-super as default or empty
            if (admins.length === 0) {
              const opSuperData = await getStateFromFirestore('shop_state_op-super');
              if (opSuperData) {
                setState(prev => ({
                  ...prev,
                  shopDetails: opSuperData.shopDetails || prev.shopDetails,
                  wallet: opSuperData.wallet || prev.wallet,
                  aepsWallet: opSuperData.aepsWallet || prev.aepsWallet,
                  emitraWallet: opSuperData.emitraWallet || prev.emitraWallet,
                  customers: opSuperData.customers || prev.customers,
                  transactions: opSuperData.transactions || prev.transactions,
                  emitraApplications: opSuperData.emitraApplications || prev.emitraApplications,
                  offlineWork: opSuperData.offlineWork || prev.offlineWork,
                  expenses: opSuperData.expenses || prev.expenses,
                  commissionSettings: opSuperData.commissionSettings || prev.commissionSettings,
                }));
              }
              return;
            }

            // Fetch states for all Admins
            const fetchedStates = await Promise.all(
              admins.map(async (admin) => {
                const data = await getStateFromFirestore(`shop_state_${admin.id}`);
                return { adminId: admin.id, data };
              })
            );
            
            // Filter out empty/null states
            const validStates = fetchedStates.filter(s => s.data !== null) as { adminId: string; data: any }[];
            
            // Now aggregate the states
            let aggWalletBalance = 0;
            let aggWithdrawnCommission = 0;
            let aggTotalCommissionEarned = 0;
            
            let aggAepsOnlineBalance = 0;
            let aggAepsPhysicalBalance = 0;
            
            let aggEmitraWalletBalance = 0;
            
            let aggCustomers: any[] = [];
            let aggTransactions: any[] = [];
            let aggEmitraApplications: any[] = [];
            let aggOfflineWork: any[] = [];
            let aggExpenses: any[] = [];
            
            validStates.forEach(({ data }) => {
              if (data.wallet) {
                aggWalletBalance += Number(data.wallet.balance || 0);
                aggWithdrawnCommission += Number(data.wallet.withdrawnCommission || 0);
                aggTotalCommissionEarned += Number(data.wallet.totalCommissionEarned || 0);
              }
              if (data.aepsWallet) {
                aggAepsOnlineBalance += Number(data.aepsWallet.onlineBalance || 0);
                aggAepsPhysicalBalance += Number(data.aepsWallet.physicalBalance || 0);
              }
              if (data.emitraWallet) {
                aggEmitraWalletBalance += Number(data.emitraWallet.balance || 0);
              }
              if (Array.isArray(data.customers)) {
                aggCustomers = [...aggCustomers, ...data.customers];
              }
              if (Array.isArray(data.transactions)) {
                aggTransactions = [...aggTransactions, ...data.transactions];
              }
              if (Array.isArray(data.emitraApplications)) {
                aggEmitraApplications = [...aggEmitraApplications, ...data.emitraApplications];
              }
              if (Array.isArray(data.offlineWork)) {
                aggOfflineWork = [...aggOfflineWork, ...data.offlineWork];
              }
              if (Array.isArray(data.expenses)) {
                aggExpenses = [...aggExpenses, ...data.expenses];
              }
            });
            
            // Remove duplicates for customers (by id or phone)
            const seenCust = new Set();
            const uniqueCustomers = aggCustomers.filter(c => {
              if (!c?.id) return false;
              const duplicate = seenCust.has(c.id);
              seenCust.add(c.id);
              return !duplicate;
            });

            // Sort lists by timestamp desc or date desc to keep them organized
            aggTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            aggEmitraApplications.sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
            aggOfflineWork.sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
            aggExpenses.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            setState(prev => {
              const merged = {
                ...prev,
                wallet: {
                  balance: aggWalletBalance,
                  withdrawnCommission: aggWithdrawnCommission,
                  totalCommissionEarned: aggTotalCommissionEarned,
                  lastUpdated: new Date().toISOString()
                },
                aepsWallet: {
                  onlineBalance: aggAepsOnlineBalance,
                  physicalBalance: aggAepsPhysicalBalance,
                  lastUpdated: new Date().toISOString()
                },
                emitraWallet: {
                  balance: aggEmitraWalletBalance,
                  lastUpdated: new Date().toISOString()
                },
                customers: uniqueCustomers,
                transactions: aggTransactions,
                emitraApplications: aggEmitraApplications,
                offlineWork: aggOfflineWork,
                expenses: aggExpenses,
              };
              saveState(merged);
              return merged;
            });
            
          } catch (err) {
            console.error('[App] Failed to load aggregated shop states:', err);
          } finally {
            setFirebaseLoading(false);
          }
        } else {
          // Fetch specific branch data
          console.log(`[App] Super Admin - Fetching branch data for Admin: ${selectedBranchId}`);
          setFirebaseLoading(true);
          try {
            const isolatedData = await getStateFromFirestore(`shop_state_${selectedBranchId}`);
            if (isolatedData) {
              setState(prev => {
                const merged = {
                  ...prev,
                  shopDetails: isolatedData.shopDetails || prev.shopDetails,
                  wallet: isolatedData.wallet || prev.wallet,
                  aepsWallet: isolatedData.aepsWallet || prev.aepsWallet,
                  emitraWallet: isolatedData.emitraWallet || prev.emitraWallet,
                  customers: isolatedData.customers || prev.customers,
                  transactions: isolatedData.transactions || prev.transactions,
                  emitraApplications: isolatedData.emitraApplications || prev.emitraApplications,
                  offlineWork: isolatedData.offlineWork || prev.offlineWork,
                  expenses: isolatedData.expenses || prev.expenses,
                };
                saveState(merged);
                return merged;
              });
            } else {
              console.log(`[App] Selected branch state not found for admin ${selectedBranchId}, using standard templates.`);
            }
          } catch (err) {
            console.error('[App] Failed to load selected branch state:', err);
          } finally {
            setFirebaseLoading(false);
          }
        }
      } else {
        // Normal Admin or Operator isolated loading
        const adminId = state.currentUser.role === 'Operator'
          ? (state.currentUser.createdBy || 'op-1')
          : state.currentUser.id;
          
        console.log(`[App] Current user is ${state.currentUser.role}. Branch Admin ID resolved: ${adminId}`);
        setFirebaseLoading(true);
        try {
          const isolatedData = await getStateFromFirestore(`shop_state_${adminId}`);
          if (isolatedData) {
            setState(prev => {
              const merged = {
                ...prev,
                shopDetails: isolatedData.shopDetails || prev.shopDetails,
                wallet: isolatedData.wallet || prev.wallet,
                aepsWallet: isolatedData.aepsWallet || prev.aepsWallet,
                emitraWallet: isolatedData.emitraWallet || prev.emitraWallet,
                customers: isolatedData.customers || prev.customers,
                transactions: isolatedData.transactions || prev.transactions,
                emitraApplications: isolatedData.emitraApplications || prev.emitraApplications,
                offlineWork: isolatedData.offlineWork || prev.offlineWork,
                expenses: isolatedData.expenses || prev.expenses,
              };
              saveState(merged);
              return merged;
            });
          } else {
            // Initialize isolated state for this Admin
            console.log(`[App] Initializing new isolated shop state document for Admin: ${adminId}`);
            const defaultIsolated = {
              shopDetails: state.shopDetails,
              wallet: state.wallet,
              aepsWallet: state.aepsWallet,
              emitraWallet: state.emitraWallet,
              customers: state.customers,
              transactions: state.transactions,
              emitraApplications: state.emitraApplications,
              offlineWork: state.offlineWork,
              expenses: state.expenses,
            };
            await saveStateToFirestore(`shop_state_${adminId}`, defaultIsolated);
          }
        } catch (err) {
          console.error('[App] Failed to load isolated shop state:', err);
        } finally {
          setFirebaseLoading(false);
        }
      }
    };

    syncIsolatedState();
  }, [state.currentUser?.id, selectedBranchId, state.operators.length]);

  // Synchronize state changes to localStorage and cloud Firestore
  const handleUpdateState = (newState: AppState) => {
    setState(newState);
    saveState(newState);
    
    // 1. Save global/shared data (operators list, security logs, and central commission settings) to the central shared document
    const centralData = {
      operators: newState.operators,
      securityLogs: newState.securityLogs,
      commissionSettings: newState.commissionSettings
    };
    saveStateToFirestore('shared_shop_state', centralData);

    // 2. Save isolated shop/branch data to the Admin's private shop state document
    if (newState.currentUser) {
      const isSuper = newState.currentUser.role === 'Super Admin';
      
      if (isSuper) {
        // If Super Admin selected a specific branch, they save changes to THAT branch's document!
        // (If they are in 'all' view, saving is blocked or saves to 'op-super' to protect data)
        if (selectedBranchId !== 'all') {
          const isolatedData = {
            shopDetails: newState.shopDetails,
            wallet: newState.wallet,
            aepsWallet: newState.aepsWallet,
            emitraWallet: newState.emitraWallet,
            customers: newState.customers,
            transactions: newState.transactions,
            emitraApplications: newState.emitraApplications,
            offlineWork: newState.offlineWork,
            expenses: newState.expenses,
            commissionSettings: newState.commissionSettings
          };
          saveStateToFirestore(`shop_state_${selectedBranchId}`, isolatedData);
        } else {
          // Standard backup for Super Admin's personal root file
          const isolatedData = {
            shopDetails: newState.shopDetails,
            wallet: newState.wallet,
            aepsWallet: newState.aepsWallet,
            emitraWallet: newState.emitraWallet,
            customers: newState.customers,
            transactions: newState.transactions,
            emitraApplications: newState.emitraApplications,
            offlineWork: newState.offlineWork,
            expenses: newState.expenses,
            commissionSettings: newState.commissionSettings
          };
          saveStateToFirestore('shop_state_op-super', isolatedData);
        }
      } else {
        const adminId = newState.currentUser.role === 'Operator'
          ? (newState.currentUser.createdBy || 'op-1')
          : newState.currentUser.id;

        const isolatedData = {
          shopDetails: newState.shopDetails,
          wallet: newState.wallet,
          aepsWallet: newState.aepsWallet,
          emitraWallet: newState.emitraWallet,
          customers: newState.customers,
          transactions: newState.transactions,
          emitraApplications: newState.emitraApplications,
          offlineWork: newState.offlineWork,
          expenses: newState.expenses,
          commissionSettings: newState.commissionSettings
        };
        saveStateToFirestore(`shop_state_${adminId}`, isolatedData);
      }
    }
  };

  // Handle log out
  const handleLogout = async () => {
    setActiveTab('dashboard');
    setIsLocked(false);
    
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('[Firebase Signout Error]', err);
    }

    handleUpdateState({
      ...state,
      currentUser: null
    });
  };

  // Sync dark class on document element
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Real-time ticking clock
  React.useEffect(() => {
    const tick = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Password Unlock verification
  const handleUnlockSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '1234' || passcode === 'admin123') {
      setIsLocked(false);
      setPasscode('');
      setPasscodeError('');
    } else {
      setPasscodeError('Invalid operational PIN code. Hint: Use default operator pin "1234" or admin pin "admin123".');
    }
  };

  // Handle preset navigation callbacks from dashboard quick clicks
  const handleTriggerPreAction = (tabId: string, actionType: string) => {
    setActiveTab(tabId);
    setActivePreAction(actionType);
  };

  // Calculate today's total commission for the current logged-in user context
  const todayCommission = React.useMemo(() => {
    const currUser = state.currentUser;
    if (!currUser) return 0;

    const todayStr = '2026-06-21'; // matching simulated date in dashboard

    // 1. Transactions commission
    let txns = state.transactions;
    if (currUser.role === 'Admin') {
      txns = txns.filter(t => t.operatorId !== 'op-super');
    } else if (currUser.role !== 'Super Admin') {
      txns = txns.filter(t => t.operatorId === currUser.id);
    }
    const todayTxnsComm = txns
      .filter(t => t.timestamp?.startsWith(todayStr) && t.status === 'Success')
      .reduce((sum, t) => sum + t.commission, 0);

    // 2. eMitra commission
    let emitras = state.emitraApplications;
    if (currUser.role === 'Admin') {
      emitras = emitras.filter(a => a.operatorId !== 'op-super');
    } else if (currUser.role !== 'Super Admin') {
      emitras = emitras.filter(a => a.operatorId === currUser.id);
    }
    const todayEmitrasComm = emitras
      .filter(a => a.appliedDate?.startsWith(todayStr))
      .reduce((sum, a) => sum + a.commissionEarned, 0);

    // 3. Offline work commission
    let offworks = state.offlineWork;
    if (currUser.role === 'Admin') {
      offworks = offworks.filter(w => w.operatorId !== 'op-super');
    } else if (currUser.role !== 'Super Admin') {
      offworks = offworks.filter(w => w.operatorId === currUser.id);
    }
    const todayOfflineComm = offworks
      .filter(w => w.receivedDate?.startsWith(todayStr))
      .reduce((sum, w) => sum + (w.commissionEarned || 0), 0);

    return todayTxnsComm + todayEmitrasComm + todayOfflineComm;
  }, [state.transactions, state.emitraApplications, state.offlineWork, state.currentUser]);

  // Render view router based on selected menu tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            state={state} 
            darkMode={darkMode}
            onNavigateTab={(tabId) => setActiveTab(tabId)}
            onTriggerAction={(actionType) => {
              if (actionType === 'cash_deposit' || actionType === 'cash_withdrawal' || actionType === 'dmt_transfer') {
                setActiveTab('banking');
                setActivePreAction(actionType);
              } else if (actionType === 'emitra_apply') {
                setActiveTab('emitra');
                setActivePreAction(actionType);
              } else if (actionType === 'offline_add') {
                setActiveTab('offline');
                setActivePreAction(actionType);
              }
            }}
          />
        );
      case 'customers':
        return (
          <CustomersView 
            state={state} 
            onUpdateState={handleUpdateState}
            darkMode={darkMode}
          />
        );
      case 'banking':
        return (
          <BankingView 
            state={state} 
            onUpdateState={handleUpdateState}
            darkMode={darkMode}
            activePreAction={activePreAction}
            onClearPreAction={() => setActivePreAction(null)}
          />
        );
      case 'emitra':
        return (
          <EmitraView 
            state={state} 
            onUpdateState={handleUpdateState}
            darkMode={darkMode}
            activePreAction={activePreAction}
            onClearPreAction={() => setActivePreAction(null)}
          />
        );
      case 'offline':
        return (
          <OfflineView 
            state={state} 
            onUpdateState={handleUpdateState}
            darkMode={darkMode}
            activePreAction={activePreAction}
            onClearPreAction={() => setActivePreAction(null)}
          />
        );
      case 'expenses':
        return (
          <ExpensesView 
            state={state} 
            onUpdateState={handleUpdateState}
            darkMode={darkMode}
          />
        );
      case 'reports':
        return (
          <ReportsView 
            state={state} 
            darkMode={darkMode}
          />
        );
      case 'security':
        return (
          <SecurityView 
            state={state} 
            onUpdateState={handleUpdateState}
            darkMode={darkMode}
            onLockSession={() => setIsLocked(true)}
          />
        );
      case 'admin':
        return (
          <AdminView 
            state={state} 
            onUpdateState={handleUpdateState}
            darkMode={darkMode}
          />
        );
      case 'profile':
        return (
          <UserProfileView 
            state={state}
            onUpdateState={handleUpdateState}
            darkMode={darkMode}
          />
        );
      default:
        return <div className="text-center py-20">View not resolved.</div>;
    }
  };

  // 0. FIREBASE STATE TRANSITION SPINNER GUARD
  if (firebaseLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${
        darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
      }`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex items-center justify-center">
            {/* Elegant glowing active ring spinner */}
            <div className="w-16 h-16 rounded-full border-4 border-indigo-650/10 border-t-indigo-600 animate-spin" />
            <div className="absolute w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 opacity-80 blur-xs" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold tracking-tight uppercase font-display">
              SmartSPE Secure Workspace
            </h3>
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mt-1 animate-pulse">
              Firebase Synced State Loading...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 1. SECURE AUTHENTICATION LOGIN GUARD
  if (!state.currentUser) {
    return (
      <LoginView 
        state={state} 
        onUpdateState={handleUpdateState} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
      />
    );
  }

  // 2. LOCKED WORKSPACE SESSION GUARD
  if (isLocked) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        darkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
      }`}>
        {/* Lock Screen card with Glassmorphism */}
        <div className={`w-full max-w-md p-8 rounded-3xl border shadow-2xl space-y-6 ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'
        } backdrop-blur-xl relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600" />

          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
              <Lock size={26} className="animate-pulse" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold font-display uppercase tracking-tight flex items-center justify-center gap-1.5">
                Smart<span>SPE</span> Secure
              </h2>
              <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Operating Terminal Locked
              </p>
            </div>
          </div>

          <form onSubmit={handleUnlockSession} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 block font-mono">
                Operator operational PIN code
              </label>
              <input
                type="password"
                required
                autoFocus
                placeholder="••••"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setPasscodeError('');
                }}
                className={`w-full py-3 px-4 rounded-xl text-center text-lg tracking-widest border font-mono outline-hidden ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {passcodeError && (
              <p className="text-rose-500 text-[11px] leading-relaxed text-center font-bold bg-rose-500/15 p-2 rounded-xl border border-rose-500/10">
                ⚠️ {passcodeError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 cursor-pointer text-sm whitespace-nowrap transition-colors"
            >
              Decrypt Session
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 space-y-1">
            <p>Authorized access points only. All keystrokes recorded.</p>
            <p className="font-mono">Console Coordinates: 47.11.134.19</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. STANDARD UNLOCKED MAIN APP CONTAINER SCREEN
  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
    }`}>
      {/* Dynamic Slide-in Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        currentUser={state.currentUser}
        walletBalance={state.wallet.balance}
        totalCommission={state.wallet.totalCommissionEarned}
        todayCommission={todayCommission}
        onLogout={handleLogout}
        selectedBranchId={selectedBranchId}
        setSelectedBranchId={setSelectedBranchId}
        operators={state.operators}
      />

      {/* Main Workspace Frame container */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Global workspace top-header panel */}
        <header className={`hidden md:flex items-center justify-between px-8 py-5 border-b backdrop-blur-md sticky top-0 z-30 ${
          darkMode ? 'bg-slate-950/80 border-slate-900' : 'bg-white/80 border-slate-200'
        }`}>
          {/* Left panel: live stats ticker */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-700'
            }`}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>SSO STABLE CHANNEL</span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-slate-400">
              <ShieldCheck size={14} className="text-blue-500" />
              <span>JWT Signed</span>
            </div>

            {/* Branch Selector for Super Admins */}
            {state.currentUser?.role === 'Super Admin' && (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 font-sans">
                  🏢 Active Branch (सक्रिय शाखा):
                </span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold outline-hidden transition-all cursor-pointer ${
                    darkMode 
                      ? 'bg-slate-900 border-slate-800 text-white hover:border-slate-700 focus:border-blue-500' 
                      : 'bg-white border-blue-200 text-slate-900 hover:border-blue-350 focus:border-blue-600'
                  }`}
                >
                  <option value="all">All Branches (कुल शाखाएँ - Aggregated)</option>
                  {state.operators
                    .filter(op => op.role === 'Admin')
                    .map(admin => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name} ({admin.email})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Right panel: Operator metadata, notification drawer and clock */}
          <div className="flex items-center gap-4 text-xs">
            <div className={`px-3 py-1.5 rounded-xl flex items-center gap-2 border font-semibold ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <Clock size={13} className="text-blue-500" />
              <span className="font-mono">{liveTime || '00:00:00 AM'}</span>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsLocked(true)}
                title="Lock Terminal Session" 
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-550 hover:text-slate-900'
                }`}
              >
                <Lock size={14} />
              </button>

              <button 
                title="Silence warnings" 
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'
                }`}
              >
                <VolumeX size={14} />
              </button>
            </div>

            {/* Quick Operator indicator widget */}
            <button 
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 hover:opacity-80 transition-opacity text-left cursor-pointer"
            >
              <div className="text-right">
                <span className="font-bold block text-slate-900 dark:text-white leading-none">
                  {state.currentUser?.name}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  ID: {state.currentUser?.id.toUpperCase()}
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* Inner page components workspace with bento padding style */}
        <section className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {renderTabContent()}
        </section>

      </main>
    </div>
  );
}
