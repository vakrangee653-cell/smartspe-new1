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

  // Real-time Firebase Auth Status Listener and Firestore Synchronizer
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseLoading(true);
      if (firebaseUser) {
        console.log('[App] Auth State Changed: User Signed In', firebaseUser.uid);
        const fetchedState = await getStateFromFirestore(firebaseUser.uid);
        if (fetchedState) {
          // Verify currentUser represents this active Firebase authenticated profile
          if (!fetchedState.currentUser || fetchedState.currentUser.id !== firebaseUser.uid) {
            fetchedState.currentUser = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Vakrangee Operator',
              email: firebaseUser.email || '',
              role: (fetchedState.currentUser?.role || 'Super Admin') as UserRole,
              phoneNumber: firebaseUser.phoneNumber || fetchedState.currentUser?.phoneNumber || '+91 99999 55555'
            };
          }
          setState(fetchedState);
          saveState(fetchedState);
        } else {
          // Initialize fresh user workspace document in Firestore
          const baseState = getInitialState();
          const fbInitState = {
            ...baseState,
            currentUser: {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Vakrangee Operator',
              email: firebaseUser.email || '',
              role: ((firebaseUser.email?.toLowerCase().includes('admin') || firebaseUser.email === 'vakrangee653@gmail.com') ? 'Super Admin' : 'Admin') as UserRole,
              phoneNumber: firebaseUser.phoneNumber || '+91 99999 55555'
            }
          };
          setState(fbInitState);
          saveState(fbInitState);
          await saveStateToFirestore(firebaseUser.uid, fbInitState);
        }
      } else {
        // No Firebase user. We can keep whatever is in local state but reset Auth UI
        const localState = getInitialState();
        if (localState.currentUser && localState.currentUser.id.startsWith('gg-')) {
          localState.currentUser = null;
          saveState(localState);
        }
        setState(localState);
      }
      setFirebaseLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Synchronize state changes to localStorage and cloud Firestore
  const handleUpdateState = (newState: AppState) => {
    setState(newState);
    saveState(newState);
    
    if (auth.currentUser) {
      saveStateToFirestore(auth.currentUser.uid, newState);
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
