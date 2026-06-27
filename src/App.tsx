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
import { formatINR, deduplicateById } from './utils';

export const metadata = {
  title: "CSP Bilin V02 - CSC Management Software",
  description: "CSC Management & Billing Software"
};

const getCanonicalDocId = (id: string, email?: string): string => {
  const e = (email || '').toLowerCase().trim();
  if (e === 'vakrangee653@gmail.com' || id === 'op-super') return 'op-super';
  if (e === 'rajendra.spe@gmail.com' || id === 'op-1') return 'op-1';
  if (e === 'smartspeatm@gmail.com' || id === 'op-smartspeatm') return 'op-smartspeatm';
  if (e === 'suresh.emitra@gmail.com' || id === 'op-2') return 'op-2';
  if (e === 'priyanka.csp@gmail.com' || id === 'op-3') return 'op-3';
  return id;
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
    setFirebaseLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('[App] Auth State Changed: User Signed In. Fetching authoritative central registry...', firebaseUser.uid);
        const email = (firebaseUser.email || '').toLowerCase().trim();
        const role: UserRole = (email.includes('admin') || email === 'vakrangee653@gmail.com') ? 'Super Admin' : 'Admin';
        
        let freshOperators: any[] = [];
        let freshSettings: any = null;
        let freshLogs: any[] = [];
        
        try {
          const centralState = await getStateFromFirestore('shared_shop_state', 'Super Admin', 'shared_shop_state');
          if (centralState) {
            freshOperators = centralState.operators || [];
            const hasSuperAdmin = freshOperators.some((op: any) => op.email && op.email.toLowerCase().trim() === 'vakrangee653@gmail.com');
            if (!hasSuperAdmin) {
              freshOperators.push({
                id: 'op-super',
                name: 'Vakrangee Super Admin',
                email: 'vakrangee653@gmail.com',
                role: 'Super Admin',
                status: 'Active',
                walletLimit: 1000000,
                commissionRate: 100,
                phoneNumber: '+91 90010 12345',
                password: 'superadmin123',
                failedAttempts: 0,
                isLockedOut: false,
                createdBy: 'System'
              });
            }
            freshSettings = centralState.commissionSettings;
            freshLogs = centralState.securityLogs || [];
          } else {
            // Seed default if centralState does not exist
            const defaultState = getInitialState();
            freshOperators = defaultState.operators;
            freshSettings = defaultState.commissionSettings;
            freshLogs = defaultState.securityLogs;
            await saveStateToFirestore('shared_shop_state', {
              operators: freshOperators,
              securityLogs: freshLogs,
              commissionSettings: freshSettings
            });
          }
        } catch (err) {
          console.error('[App] Failed to fetch central state during authenticated sync:', err);
        }

        setState(prev => {
          const activeOps = freshOperators.length > 0 ? freshOperators : prev.operators;
          const existingOp = activeOps.find(op => op.id === firebaseUser.uid || op.email.toLowerCase() === email);
          
          if (existingOp && existingOp.status !== 'Active') {
            console.warn('[App] Security block: Account is inactive or deleted. Signing out:', email);
            firebaseSignOut(auth).catch(err => console.error(err));
            setFirebaseLoading(false);
            return {
              ...prev,
              currentUser: null
            };
          }

          let resolvedRole: UserRole = role;
          let resolvedCreatedBy: string | undefined = undefined;
          let resolvedName = firebaseUser.displayName || 'Vakrangee Operator';
          let resolvedPhone = firebaseUser.phoneNumber || '+91 99999 55555';
          
          if (existingOp) {
            resolvedRole = existingOp.role;
            resolvedCreatedBy = existingOp.createdBy;
            if (existingOp.name) resolvedName = existingOp.name;
            if (existingOp.phoneNumber) resolvedPhone = existingOp.phoneNumber;
          }

          const updatedUser = {
            id: firebaseUser.uid,
            name: resolvedName,
            email: email,
            role: resolvedRole,
            phoneNumber: resolvedPhone,
            ...(resolvedCreatedBy ? { createdBy: resolvedCreatedBy } : {})
          };
          
          const exists = !!existingOp;
          let updatedOperators = [...activeOps];
          
          if (!exists) {
            if (email === 'vakrangee653@gmail.com') {
              console.log('[App] Auto-registering logged-in Super Admin:', email);
              updatedOperators.push({
                id: firebaseUser.uid,
                name: 'Vakrangee Super Admin',
                email: email,
                role: 'Super Admin',
                status: 'Active',
                walletLimit: 1000000,
                commissionRate: 100,
                phoneNumber: '+91 90010 12345',
                failedAttempts: 0,
                isLockedOut: false,
                createdBy: 'System'
              });
            } else {
              console.warn('[App] Deletion check: Non-registered or deleted user tried to access, signing out:', email);
              firebaseSignOut(auth).catch(err => console.error(err));
              setFirebaseLoading(false);
              return {
                ...prev,
                currentUser: null
              };
            }
          } else {
            updatedOperators = updatedOperators.map(op => {
              if (op.email.toLowerCase() === email || op.id === firebaseUser.uid) {
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
            operators: updatedOperators,
            securityLogs: freshLogs.length > 0 ? freshLogs : prev.securityLogs,
            commissionSettings: freshSettings || prev.commissionSettings
          };
          
          saveState(clean);
          
          // Save back to Firestore 'shared_shop_state' immediately
          saveStateToFirestore('shared_shop_state', {
            operators: updatedOperators,
            securityLogs: clean.securityLogs,
            commissionSettings: clean.commissionSettings
          });
          
          setFirebaseLoading(false);
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
        setFirebaseLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Reactive isolated state loader (whenever currentUser ID changes, selectedBranchId changes, or operators count changes)
  React.useEffect(() => {
    const syncIsolatedState = async () => {
      if (!state.currentUser) return;
      
      const isSuper = state.currentUser.role === 'Super Admin';
      
      // 1. Resolve and run automated migration check for any Google UID documents to canonical ones
      try {
        console.log('[App] Running Google UID document migration checks...');
        for (const op of state.operators) {
          const canonicalId = getCanonicalDocId(op.id, op.email);
          if (canonicalId !== op.id) {
            // This is a Google UID document! Check if it has any active data
            const personalDocId = `shop_state_${op.id}`;
            const personalData = await getStateFromFirestore(personalDocId);
            
            if (personalData && !personalData.migrated_to_canonical && (
              (personalData.transactions && personalData.transactions.length > 0) ||
              (personalData.emitraApplications && personalData.emitraApplications.length > 0) ||
              (personalData.offlineWork && personalData.offlineWork.length > 0) ||
              (personalData.customers && personalData.customers.length > 0)
            )) {
              console.log(`[App] Google UID Migration: Found data in ${personalDocId}. Migrating to canonical document shop_state_${canonicalId}...`);
              
              const canonicalDocId = `shop_state_${canonicalId}`;
              const canonicalData = await getStateFromFirestore(canonicalDocId) || {
                shopDetails: state.shopDetails,
                wallet: state.wallet,
                aepsWallet: state.aepsWallet,
                emitraWallet: state.emitraWallet,
                customers: [],
                transactions: [],
                emitraApplications: [],
                offlineWork: [],
                expenses: [],
              };
              
              // Transactions merge
              const canonicalTxns = canonicalData.transactions || [];
              const personalTxns = personalData.transactions || [];
              const mergedTxns = [...canonicalTxns];
              for (const tx of personalTxns) {
                if (!mergedTxns.some((t: any) => t.id === tx.id)) {
                  mergedTxns.push({
                    ...tx,
                    operatorId: op.id,
                    operatorName: op.name,
                    createdBy: canonicalId
                  });
                }
              }
              canonicalData.transactions = mergedTxns;

              // eMitra apps merge
              const canonicalApps = canonicalData.emitraApplications || [];
              const personalApps = personalData.emitraApplications || [];
              const mergedApps = [...canonicalApps];
              for (const app of personalApps) {
                if (!mergedApps.some((a: any) => a.id === app.id)) {
                  mergedApps.push({
                    ...app,
                    operatorId: op.id,
                    operatorName: op.name,
                    createdBy: canonicalId
                  });
                }
              }
              canonicalData.emitraApplications = mergedApps;

              // Offline Register merge
              const canonicalWork = canonicalData.offlineWork || [];
              const personalWork = personalData.offlineWork || [];
              const mergedWork = [...canonicalWork];
              for (const w of personalWork) {
                if (!mergedWork.some((work: any) => work.id === w.id)) {
                  mergedWork.push({
                    ...w,
                    operatorId: op.id,
                    operatorName: op.name,
                    createdBy: canonicalId
                  });
                }
              }
              canonicalData.offlineWork = mergedWork;

              // Customers merge
              const canonicalCusts = canonicalData.customers || [];
              const personalCusts = personalData.customers || [];
              const mergedCusts = [...canonicalCusts];
              for (const c of personalCusts) {
                if (!mergedCusts.some((cust: any) => cust.id === c.id)) {
                  mergedCusts.push({
                    ...c,
                    createdBy: canonicalId
                  });
                }
              }
              canonicalData.customers = mergedCusts;

              // Save canonical merged state
              await saveStateToFirestore(canonicalDocId, canonicalData);
              
              // Mark the google uid document as migrated
              personalData.migrated_to_canonical = true;
              personalData.migrated = true;
              await saveStateToFirestore(personalDocId, personalData);
              console.log(`[App] Google UID Migration completed successfully for ${op.email}`);
            }
          }
        }
      } catch (migrateErr) {
        console.error('[App] Google UID migration run failed:', migrateErr);
      }

      if (isSuper) {
        // Super Admin Self-Healing & Data Recovery Checks
        try {
          console.log('[App] Super Admin Self-Healing: Running active recovery checks...');
          const operatorsToCheck = state.operators;
          for (const op of operatorsToCheck) {
            if (op.id === 'op-super' || op.role === 'Super Admin') continue;
            
            // Check for any accidental/isolated data in op's personal state doc
            const docIds = [op.id];
            // If they are Naresh, check their email too just in case
            if (op.email.toLowerCase() === 'nareshsuthar249@gmail.com') {
              docIds.push('nareshsuthar249@gmail.com');
            }
            
            for (const docId of docIds) {
              const personalDocId = `shop_state_${docId}`;
              const personalData = await getStateFromFirestore(personalDocId);
              
              if (personalData && !personalData.recovered_to_super && (
                (personalData.transactions && personalData.transactions.length > 0) ||
                (personalData.emitraApplications && personalData.emitraApplications.length > 0) ||
                (personalData.offlineWork && personalData.offlineWork.length > 0) ||
                (personalData.customers && personalData.customers.length > 0)
              )) {
                const targetAdminId = op.createdBy || 'op-super';
                console.log(`[App] Super Admin Self-Healing: Found entries in ${personalDocId}. Recovering to ${targetAdminId}...`);
                
                const targetData = await getStateFromFirestore(`shop_state_${targetAdminId}`) || {
                  shopDetails: state.shopDetails,
                  wallet: state.wallet,
                  aepsWallet: state.aepsWallet,
                  emitraWallet: state.emitraWallet,
                  customers: [],
                  transactions: [],
                  emitraApplications: [],
                  offlineWork: [],
                  expenses: [],
                };
                
                // 1. Transactions merge
                const targetTxns = targetData.transactions || [];
                const personalTxns = personalData.transactions || [];
                const mergedTxns = [...targetTxns];
                let txMergedCount = 0;
                for (const tx of personalTxns) {
                  if (!mergedTxns.some((t: any) => t.id === tx.id)) {
                    mergedTxns.push({
                      ...tx,
                      operatorId: op.id,
                      operatorName: op.name,
                      createdBy: targetAdminId
                    });
                    txMergedCount++;
                  }
                }
                targetData.transactions = mergedTxns;

                // 2. eMitra apps merge
                const targetApps = targetData.emitraApplications || [];
                const personalApps = personalData.emitraApplications || [];
                const mergedApps = [...targetApps];
                let appMergedCount = 0;
                for (const app of personalApps) {
                  if (!mergedApps.some((a: any) => a.id === app.id)) {
                    mergedApps.push({
                      ...app,
                      operatorId: op.id,
                      operatorName: op.name,
                      createdBy: targetAdminId
                    });
                    appMergedCount++;
                  }
                }
                targetData.emitraApplications = mergedApps;

                // 3. Offline Register merge
                const targetWork = targetData.offlineWork || [];
                const personalWork = personalData.offlineWork || [];
                const mergedWork = [...targetWork];
                let workMergedCount = 0;
                for (const w of personalWork) {
                  if (!mergedWork.some((work: any) => work.id === w.id)) {
                    mergedWork.push({
                      ...w,
                      operatorId: op.id,
                      operatorName: op.name,
                      createdBy: targetAdminId
                    });
                    workMergedCount++;
                  }
                }
                targetData.offlineWork = mergedWork;

                // 4. Customers merge
                const targetCusts = targetData.customers || [];
                const personalCusts = personalData.customers || [];
                const mergedCusts = [...targetCusts];
                for (const c of personalCusts) {
                  if (!mergedCusts.some((cust: any) => cust.id === c.id)) {
                    mergedCusts.push({
                      ...c,
                      createdBy: targetAdminId
                    });
                  }
                }
                targetData.customers = mergedCusts;

                // Save merged state
                await saveStateToFirestore(`shop_state_${targetAdminId}`, targetData);
                
                // Mark as recovered
                personalData.recovered_to_super = true;
                await saveStateToFirestore(personalDocId, personalData);
                console.log(`[App] Super Admin Self-Healing: Restored ${txMergedCount} txs, ${appMergedCount} apps, ${workMergedCount} offline items for ${op.email}`);
              }
            }
          }
        } catch (recoverErr) {
          console.error('[App] Super Admin recovery run failed:', recoverErr);
        }

        if (selectedBranchId === 'all') {
          console.log('[App] Super Admin - Fetching and aggregating ALL branches...');
          setFirebaseLoading(true);
          try {
            // Get all registered Admins and Super Admin in the network to aggregate ALL branches
            const admins = state.operators.filter(op => op.role === 'Admin' || op.role === 'Super Admin');
            
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
                const docId = getCanonicalDocId(admin.id, admin.email);
                const data = await getStateFromFirestore(`shop_state_${docId}`, 'Admin', admin.id);
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
            
            validStates.forEach(({ adminId, data }) => {
              // Only sum wallet balances of non-Super Admin branches to avoid doubling
              const isSuperAdmin = state.operators.find(o => o.id === adminId)?.role === 'Super Admin';
              if (!isSuperAdmin) {
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
            
            // Remove duplicates for customers (by id)
            const seenCust = new Set();
            const uniqueCustomers = aggCustomers.filter(c => {
              if (!c?.id) return false;
              const duplicate = seenCust.has(c.id);
              seenCust.add(c.id);
              return !duplicate;
            });

            // Remove duplicates for transactions, applications, offlineWork, and expenses by ID
            const seenTx = new Set();
            const uniqueTransactions = aggTransactions.filter(t => {
              if (!t?.id) return false;
              const duplicate = seenTx.has(t.id);
              seenTx.add(t.id);
              return !duplicate;
            });

            const seenApp = new Set();
            const uniqueApps = aggEmitraApplications.filter(a => {
              if (!a?.id) return false;
              const duplicate = seenApp.has(a.id);
              seenApp.add(a.id);
              return !duplicate;
            });

            const seenWork = new Set();
            const uniqueWork = aggOfflineWork.filter(w => {
              if (!w?.id) return false;
              const duplicate = seenWork.has(w.id);
              seenWork.add(w.id);
              return !duplicate;
            });

            const seenExpense = new Set();
            const uniqueExpenses = aggExpenses.filter(e => {
              if (!e?.id) return false;
              const duplicate = seenExpense.has(e.id);
              seenExpense.add(e.id);
              return !duplicate;
            });

            // Sort lists by timestamp desc or date desc to keep them organized
            uniqueTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            uniqueApps.sort((a, b) => new Date(b.submittedDate || b.appliedDate).getTime() - new Date(a.submittedDate || a.appliedDate).getTime());
            uniqueWork.sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
            uniqueExpenses.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
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
                transactions: uniqueTransactions,
                emitraApplications: uniqueApps,
                offlineWork: uniqueWork,
                expenses: uniqueExpenses,
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
          const canonicalBranchId = getCanonicalDocId(selectedBranchId, state.operators.find(o => o.id === selectedBranchId)?.email);
          console.log(`[App] Super Admin - Fetching branch data for Admin: ${selectedBranchId} (resolved: ${canonicalBranchId})`);
          setFirebaseLoading(true);
          try {
            const isolatedData = await getStateFromFirestore(`shop_state_${canonicalBranchId}`, 'Admin', selectedBranchId);
            if (isolatedData) {
              setState(prev => {
                const merged = {
                  ...prev,
                  shopDetails: isolatedData.shopDetails || prev.shopDetails,
                  wallet: isolatedData.wallet || prev.wallet,
                  aepsWallet: isolatedData.aepsWallet || prev.aepsWallet,
                  emitraWallet: isolatedData.emitraWallet || prev.emitraWallet,
                  customers: deduplicateById(isolatedData.customers || prev.customers),
                  transactions: deduplicateById(isolatedData.transactions || prev.transactions),
                  emitraApplications: deduplicateById(isolatedData.emitraApplications || prev.emitraApplications),
                  offlineWork: deduplicateById(isolatedData.offlineWork || prev.offlineWork),
                  expenses: deduplicateById(isolatedData.expenses || prev.expenses),
                };
                saveState(merged);
                return merged;
              });
            } else {
              console.log(`[App] Selected branch state not found for admin ${selectedBranchId} (resolved: ${canonicalBranchId}), using standard templates.`);
            }
          } catch (err) {
            console.error('[App] Failed to load selected branch state:', err);
          } finally {
            setFirebaseLoading(false);
          }
        }
      } else {
        // Normal Admin or Operator isolated loading
        const rawAdminId = state.currentUser.role === 'Operator'
          ? (state.currentUser.createdBy || 'op-1')
          : state.currentUser.id;
          
        const matchedOp = state.operators.find(o => o.id === rawAdminId);
        const adminId = getCanonicalDocId(rawAdminId, matchedOp?.email || state.currentUser.email);
          
        console.log(`[App] Current user is ${state.currentUser.role}. Branch Admin ID resolved: ${adminId}`);
        setFirebaseLoading(true);
        try {
          // Self-Healing: Check if an operator has data in their own personal state from before
          let personalDataToMerge: any = null;
          if (state.currentUser.role === 'Operator') {
            const personalDocId = `shop_state_${state.currentUser.id}`;
            try {
              const personalData = await getStateFromFirestore(personalDocId);
              if (personalData && !personalData.migrated && (
                (personalData.transactions && personalData.transactions.length > 0) ||
                (personalData.emitraApplications && personalData.emitraApplications.length > 0) ||
                (personalData.offlineWork && personalData.offlineWork.length > 0) ||
                (personalData.customers && personalData.customers.length > 0)
              )) {
                console.log(`[App] Self-Healing: Found accidental isolated data in ${personalDocId}. Migrating to ${adminId}...`);
                personalDataToMerge = personalData;
              }
            } catch (pErr) {
              console.error('[App] Failed checking personal data for migration:', pErr);
            }
          }

          let isolatedData = await getStateFromFirestore(`shop_state_${adminId}`, state.currentUser.role, state.currentUser.id);
          
          if (personalDataToMerge) {
            // We need to merge!
            if (!isolatedData) {
              isolatedData = {
                shopDetails: state.shopDetails,
                wallet: state.wallet,
                aepsWallet: state.aepsWallet,
                emitraWallet: state.emitraWallet,
                customers: [],
                transactions: [],
                emitraApplications: [],
                offlineWork: [],
                expenses: [],
              };
            }

            // Transactions merge
            const existingTxns = isolatedData.transactions || [];
            const personalTxns = personalDataToMerge.transactions || [];
            const mergedTxns = [...existingTxns];
            for (const tx of personalTxns) {
              if (!mergedTxns.some((t: any) => t.id === tx.id)) {
                mergedTxns.push({
                  ...tx,
                  operatorId: state.currentUser.id,
                  createdBy: adminId
                });
              }
            }
            isolatedData.transactions = mergedTxns;

            // eMitra apps merge
            const existingApps = isolatedData.emitraApplications || [];
            const personalApps = personalDataToMerge.emitraApplications || [];
            const mergedApps = [...existingApps];
            for (const app of personalApps) {
              if (!mergedApps.some((a: any) => a.id === app.id)) {
                mergedApps.push({
                  ...app,
                  operatorId: state.currentUser.id,
                  createdBy: adminId
                });
              }
            }
            isolatedData.emitraApplications = mergedApps;

            // Offline Register merge
            const existingWork = isolatedData.offlineWork || [];
            const personalWork = personalDataToMerge.offlineWork || [];
            const mergedWork = [...existingWork];
            for (const w of personalWork) {
              if (!mergedWork.some((work: any) => work.id === w.id)) {
                mergedWork.push({
                  ...w,
                  operatorId: state.currentUser.id,
                  createdBy: adminId
                });
              }
            }
            isolatedData.offlineWork = mergedWork;

            // Customers merge
            const existingCusts = isolatedData.customers || [];
            const personalCusts = personalDataToMerge.customers || [];
            const mergedCusts = [...existingCusts];
            for (const c of personalCusts) {
              if (!mergedCusts.some((cust: any) => cust.id === c.id)) {
                mergedCusts.push({
                  ...c,
                  createdBy: adminId
                });
              }
            }
            isolatedData.customers = mergedCusts;

            // Save the merged data to the correct Admin/Branch document
            await saveStateToFirestore(`shop_state_${adminId}`, isolatedData);

            // Mark personal document as migrated
            await saveStateToFirestore(`shop_state_${state.currentUser.id}`, { migrated: true });
            console.log('[App] Self-Healing migration completed successfully!');
          }

          if (isolatedData) {
            setState(prev => {
              const merged = {
                ...prev,
                shopDetails: isolatedData.shopDetails || prev.shopDetails,
                wallet: isolatedData.wallet || prev.wallet,
                aepsWallet: isolatedData.aepsWallet || prev.aepsWallet,
                emitraWallet: isolatedData.emitraWallet || prev.emitraWallet,
                customers: deduplicateById(isolatedData.customers || prev.customers),
                transactions: deduplicateById(isolatedData.transactions || prev.transactions),
                emitraApplications: deduplicateById(isolatedData.emitraApplications || prev.emitraApplications),
                offlineWork: deduplicateById(isolatedData.offlineWork || prev.offlineWork),
                expenses: deduplicateById(isolatedData.expenses || prev.expenses),
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
  }, [state.currentUser?.id, selectedBranchId, JSON.stringify(state.operators.map(o => ({ id: o.id, email: o.email, role: o.role })))]);

  // Synchronize state changes to localStorage and cloud Firestore
  const handleUpdateState = (rawNewState: AppState) => {
    // Proactively clean duplicates from arrays
    const newState: AppState = {
      ...rawNewState,
      customers: deduplicateById(rawNewState.customers || []),
      transactions: deduplicateById(rawNewState.transactions || []),
      emitraApplications: deduplicateById(rawNewState.emitraApplications || []),
      offlineWork: deduplicateById(rawNewState.offlineWork || []),
      expenses: deduplicateById(rawNewState.expenses || []),
      notifications: rawNewState.notifications ? rawNewState.notifications.filter((v, i, a) => a.findIndex(t => t.notificationId === v.notificationId) === i) : [],
      settlements: deduplicateById(rawNewState.settlements || []),
      activityTimeline: deduplicateById(rawNewState.activityTimeline || []),
      commissionRules: deduplicateById(rawNewState.commissionRules || [])
    };

    setState(newState);
    saveState(newState);
    
    // 1. Save global/shared data (operators list, security logs, central settings, and new collections) to the central shared document
    const centralData = {
      operators: newState.operators,
      securityLogs: newState.securityLogs,
      commissionSettings: newState.commissionSettings,
      notifications: newState.notifications,
      settlements: newState.settlements,
      activityTimeline: newState.activityTimeline,
      commissionRules: newState.commissionRules
    };
    saveStateToFirestore('shared_shop_state', centralData);

    // 2. Save isolated shop/branch data to the Admin's private shop state document
    if (newState.currentUser) {
      const isSuper = newState.currentUser.role === 'Super Admin';
      
      if (isSuper) {
        // If Super Admin selected a specific branch, they save changes to THAT branch's document!
        // (If they are in 'all' view, saving is blocked or saves to 'op-super' to protect data)
        if (selectedBranchId !== 'all') {
          const matchedOp = newState.operators.find(o => o.id === selectedBranchId);
          const canonicalBranchId = getCanonicalDocId(selectedBranchId, matchedOp?.email);
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
          saveStateToFirestore(`shop_state_${canonicalBranchId}`, isolatedData);
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
        const rawAdminId = newState.currentUser.role === 'Operator'
          ? (newState.currentUser.createdBy || 'op-1')
          : newState.currentUser.id;

        const matchedOp = newState.operators.find(o => o.id === rawAdminId);
        const adminId = getCanonicalDocId(rawAdminId, matchedOp?.email || newState.currentUser.email);

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

  // Route and Role Security Check
  React.useEffect(() => {
    if (!state.currentUser) return;
    
    const role = state.currentUser.role;
    
    // Valid roles check
    if (role !== 'Super Admin' && role !== 'Admin' && role !== 'Operator') {
      console.warn('[Route Security] Invalid role:', role, '- Redirecting to logout');
      handleLogout();
      return;
    }
    
    // Operator access restrictions
    if (role === 'Operator') {
      const forbiddenTabsForOperator = ['security', 'admin'];
      if (forbiddenTabsForOperator.includes(activeTab)) {
        console.warn(`[Route Security] Operator tried to access forbidden tab: ${activeTab}. Redirecting to dashboard.`);
        setActiveTab('dashboard');
      }
    }
  }, [activeTab, state.currentUser?.role]);

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

  const resolvedWalletBalance = React.useMemo(() => {
    if (state.currentUser?.role === 'Operator') {
      const activeOp = state.operators.find(op => op.id === state.currentUser?.id);
      if (activeOp) {
        return activeOp.walletBalance ?? activeOp.walletLimit ?? 0;
      }
    }
    return state.wallet.balance;
  }, [state.wallet.balance, state.currentUser, state.operators]);

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
              CSP Bilin V02 Secure Workspace
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
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#EBF0F5] text-slate-900'
    }`}>
      {/* Dynamic Slide-in Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        currentUser={state.currentUser}
        walletBalance={resolvedWalletBalance}
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
