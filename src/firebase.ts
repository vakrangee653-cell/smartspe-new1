import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  inMemoryPersistence,
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc,
  collection,
  getDocs,
  query,
  limit,
  orderBy,
  where,
  runTransaction,
  deleteDoc
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

// Initialize Storage
let tempStorage;
try {
  tempStorage = getStorage(app);
} catch (error) {
  console.error('[Firebase Storage] Failed to initialize Storage:', error);
  tempStorage = null;
}
export const storage = tempStorage;

// Initialize Auth with standard or in-memory persistence fallback for sandboxed iframes
let tempAuth;
try {
  tempAuth = getAuth(app);
} catch (error) {
  console.warn('[Firebase] Default auth initialization blocked, falling back to in-memory persistence:', error);
  try {
    tempAuth = initializeAuth(app, {
      persistence: inMemoryPersistence
    });
  } catch (err) {
    console.error('[Firebase] Fatal: Failed to initialize in-memory auth:', err);
    tempAuth = getAuth(app);
  }
}

export const auth = tempAuth;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore targeting the specific custom database ID
let tempDb;
try {
  tempDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn('[Firebase] Failed to initialize firestore:', error);
  tempDb = getFirestore(app);
}

export const db = tempDb;

/**
 * Standard User Mapping conforming precisely to Part 2 requirements:
 * uid, name, email, mobile, role, adminId, createdBy, permissions, status, walletBalance, createdAt, updatedAt
 */
export function mapUserDoc(op: any): any {
  const now = new Date().toISOString();
  const balance = op.walletBalance !== undefined 
    ? Number(op.walletBalance) 
    : (op.walletLimit !== undefined ? Number(op.walletLimit) : 15000);

  return {
    id: op.id || op.uid || '',
    uid: op.uid || op.id || '',
    name: op.name || '',
    email: (op.email || '').toLowerCase().trim(),
    phoneNumber: op.phoneNumber || op.mobile || '',
    mobile: op.mobile || op.phoneNumber || '',
    role: op.role || 'Operator',
    adminId: op.adminId || op.createdBy || '',
    createdBy: op.createdBy || 'System',
    permissions: Array.isArray(op.permissions) 
      ? op.permissions 
      : ['Dashboard', 'Wallet', 'Banking', 'Reports', 'Transactions', 'Profile'],
    status: op.status || 'Active',
    walletLimit: Number(op.walletLimit !== undefined ? op.walletLimit : balance),
    walletBalance: balance,
    commissionRate: op.commissionRate !== undefined ? Number(op.commissionRate) : 12,
    failedAttempts: op.failedAttempts !== undefined ? Number(op.failedAttempts) : 0,
    isLockedOut: !!op.isLockedOut,
    password: op.password || '',
    createdAt: op.createdAt || now,
    updatedAt: now
  };
}

// 1. Users sync with schema validation and bi-directional cleanup of deleted operators
export async function syncUsersToFirestore(operators: any[]) {
  const activeIds = new Set(operators.map(op => op.id).filter(Boolean));

  for (const op of operators) {
    if (!op.id) continue;
    try {
      const mapped = mapUserDoc(op);
      await setDoc(doc(db, 'users', mapped.id), mapped);
    } catch (err) {
      console.error('[Firestore] Error syncing operator to users collection:', err);
    }
  }

  // Find and clean up any deleted operator documents from 'users' collection
  try {
    const snap = await getDocs(collection(db, 'users'));
    snap.forEach(async (docSnap) => {
      const userId = docSnap.id;
      const data = docSnap.data();
      const isSuperEmail = data && data.email && data.email.toLowerCase().trim() === 'vakrangee653@gmail.com';
      
      // Do not delete Super Admin or active operators
      if (userId !== 'op-super' && !isSuperEmail && !activeIds.has(userId)) {
        console.log(`[Firestore Cleanup] Deleting removed user from 'users' collection: ${userId}`);
        await deleteDoc(doc(db, 'users', userId));
      }
    });
  } catch (err) {
    console.error('[Firestore Cleanup] Error removing deleted operators from users collection:', err);
  }
}

/**
 * Server-Side Query-Level Filtering for Users
 * Super Admin -> All data
 * Admin -> Only own Operators
 * Operator -> Only own records
 */
export async function fetchUsersFromFirestore(userRole?: string, userId?: string): Promise<any[]> {
  try {
    const usersCol = collection(db, 'users');
    let q;

    if (userRole === 'Super Admin') {
      q = query(usersCol);
    } else if (userRole === 'Admin' && userId) {
      // Query where adminId matches this admin's ID
      q = query(usersCol, where('adminId', '==', userId));
    } else if (userRole === 'Operator' && userId) {
      // Query specifically themselves
      q = query(usersCol, where('id', '==', userId));
    } else {
      q = query(usersCol);
    }

    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });

    // For Admin, also ensure the Admin themselves is in the list of operators returned
    if (userRole === 'Admin' && userId && !list.some(item => item.id === userId)) {
      const selfSnap = await getDoc(doc(db, 'users', userId));
      if (selfSnap.exists()) {
        list.push(selfSnap.data());
      }
    }

    // Ensure the super admin (vakrangee653@gmail.com) is in the list
    const hasSuperAdmin = list.some(item => item && item.email && item.email.toLowerCase().trim() === 'vakrangee653@gmail.com');
    
    if (!hasSuperAdmin) {
      list.push({
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

    return list;
  } catch (err) {
    console.error('[Firestore] Error fetching users with server filtering:', err);
    return [];
  }
}

// 2. Wallets sync
export async function syncWalletsToFirestore(wallet: any, aepsWallet: any, emitraWallet: any) {
  try {
    await setDoc(doc(db, 'wallets', 'main_wallet'), wallet || {});
    await setDoc(doc(db, 'wallets', 'aeps_wallet'), aepsWallet || {});
    await setDoc(doc(db, 'wallets', 'emitra_wallet'), emitraWallet || {});
  } catch (err) {
    console.error('[Firestore] Error syncing wallets:', err);
  }
}

export async function fetchWalletsFromFirestore(): Promise<any> {
  try {
    const mainSnap = await getDoc(doc(db, 'wallets', 'main_wallet'));
    const aepsSnap = await getDoc(doc(db, 'wallets', 'aeps_wallet'));
    const emitraSnap = await getDoc(doc(db, 'wallets', 'emitra_wallet'));
    return {
      wallet: mainSnap.exists() ? mainSnap.data() : null,
      aepsWallet: aepsSnap.exists() ? aepsSnap.data() : null,
      emitraWallet: emitraSnap.exists() ? emitraSnap.data() : null
    };
  } catch (err) {
    console.error('[Firestore] Error fetching wallets:', err);
    return null;
  }
}

// 3. Transactions sync
export async function syncTransactionsToFirestore(transactions: any[], adminId?: string) {
  for (const tx of transactions) {
    if (!tx.id) continue;
    try {
      const mappedTx = {
        ...tx,
        adminId: tx.adminId || adminId || tx.createdBy || ''
      };
      await setDoc(doc(db, 'transactions', tx.id), mappedTx);
    } catch (err) {
      console.error('[Firestore] Error syncing transaction:', err);
    }
  }
}

/**
 * Server-Side Query-Level Filtering for Transactions
 * Super Admin -> All data
 * Admin -> Only own Operators' transactions
 * Operator -> Only own transactions
 */
export async function fetchTransactionsFromFirestore(userRole?: string, userId?: string): Promise<any[]> {
  try {
    const txCol = collection(db, 'transactions');
    let q;

    if (userRole === 'Super Admin') {
      q = query(txCol, orderBy('timestamp', 'desc'));
    } else if (userRole === 'Admin' && userId) {
      q = query(txCol, where('adminId', '==', userId), orderBy('timestamp', 'desc'));
    } else if (userRole === 'Operator' && userId) {
      q = query(txCol, where('operatorId', '==', userId), orderBy('timestamp', 'desc'));
    } else {
      q = query(txCol, orderBy('timestamp', 'desc'));
    }

    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });
    return list;
  } catch (err) {
    console.warn('[Firestore] Transaction fetch index not ready, querying unordered:', err);
    try {
      const txCol = collection(db, 'transactions');
      let q;
      if (userRole === 'Super Admin') {
        q = query(txCol);
      } else if (userRole === 'Admin' && userId) {
        q = query(txCol, where('adminId', '==', userId));
      } else if (userRole === 'Operator' && userId) {
        q = query(txCol, where('operatorId', '==', userId));
      } else {
        q = query(txCol);
      }
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data());
      });
      return list;
    } catch (fallbackErr) {
      console.error('[Firestore] Error fetching transactions fallback:', fallbackErr);
      return [];
    }
  }
}

// 4. eMitra Applications Sync & Query
export async function syncEmitraApplicationsToFirestore(apps: any[], adminId?: string) {
  for (const app of apps) {
    if (!app.id) continue;
    try {
      const mappedApp = {
        ...app,
        adminId: app.adminId || adminId || app.createdBy || ''
      };
      await setDoc(doc(db, 'emitra_applications', app.id), mappedApp);
    } catch (err) {
      console.error('[Firestore] Error syncing emitra application:', err);
    }
  }
}

export async function fetchEmitraApplicationsFromFirestore(userRole?: string, userId?: string): Promise<any[]> {
  try {
    const appCol = collection(db, 'emitra_applications');
    let q;

    if (userRole === 'Super Admin') {
      q = query(appCol);
    } else if (userRole === 'Admin' && userId) {
      q = query(appCol, where('adminId', '==', userId));
    } else if (userRole === 'Operator' && userId) {
      q = query(appCol, where('operatorId', '==', userId));
    } else {
      q = query(appCol);
    }

    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });
    return list;
  } catch (err) {
    console.error('[Firestore] Error fetching emitra applications:', err);
    return [];
  }
}

// 5. Offline Work Sync & Query
export async function syncOfflineWorkToFirestore(workItems: any[], adminId?: string) {
  for (const w of workItems) {
    if (!w.id) continue;
    try {
      const mappedWork = {
        ...w,
        adminId: w.adminId || adminId || w.createdBy || ''
      };
      await setDoc(doc(db, 'offline_work', w.id), mappedWork);
    } catch (err) {
      console.error('[Firestore] Error syncing offline work:', err);
    }
  }
}

export async function fetchOfflineWorkFromFirestore(userRole?: string, userId?: string): Promise<any[]> {
  try {
    const workCol = collection(db, 'offline_work');
    let q;

    if (userRole === 'Super Admin') {
      q = query(workCol);
    } else if (userRole === 'Admin' && userId) {
      q = query(workCol, where('adminId', '==', userId));
    } else if (userRole === 'Operator' && userId) {
      q = query(workCol, where('operatorId', '==', userId));
    } else {
      q = query(workCol);
    }

    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });
    return list;
  } catch (err) {
    console.error('[Firestore] Error fetching offline work:', err);
    return [];
  }
}

// 6. Expenses Sync & Query
export async function syncExpensesToFirestore(expenses: any[], adminId?: string) {
  for (const e of expenses) {
    if (!e.id) continue;
    try {
      const mappedExp = {
        ...e,
        adminId: e.adminId || adminId || e.createdBy || ''
      };
      await setDoc(doc(db, 'expenses', e.id), mappedExp);
    } catch (err) {
      console.error('[Firestore] Error syncing expense:', err);
    }
  }
}

export async function fetchExpensesFromFirestore(userRole?: string, userId?: string): Promise<any[]> {
  try {
    const expenseCol = collection(db, 'expenses');
    let q;

    if (userRole === 'Super Admin') {
      q = query(expenseCol);
    } else if (userRole === 'Admin' && userId) {
      q = query(expenseCol, where('adminId', '==', userId));
    } else if (userRole === 'Operator' && userId) {
      q = query(expenseCol, where('addedBy', '==', userId));
    } else {
      q = query(expenseCol);
    }

    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });
    return list;
  } catch (err) {
    console.error('[Firestore] Error fetching expenses:', err);
    return [];
  }
}

// 7. Settings sync (shopDetails, commissionSettings)
export async function syncSettingsToFirestore(shopDetails: any, commissionSettings: any) {
  try {
    await setDoc(doc(db, 'settings', 'shopDetails'), shopDetails || {});
    await setDoc(doc(db, 'settings', 'commissionSettings'), commissionSettings || {});
  } catch (err) {
    console.error('[Firestore] Error syncing settings:', err);
  }
}

export async function fetchSettingsFromFirestore(): Promise<any> {
  try {
    const shopSnap = await getDoc(doc(db, 'settings', 'shopDetails'));
    const commSnap = await getDoc(doc(db, 'settings', 'commissionSettings'));
    return {
      shopDetails: shopSnap.exists() ? shopSnap.data() : null,
      commissionSettings: commSnap.exists() ? commSnap.data() : null
    };
  } catch (err) {
    console.error('[Firestore] Error fetching settings:', err);
    return null;
  }
}

// 8. Audit logs sync (securityLogs)
export async function syncAuditLogsToFirestore(securityLogs: any[], adminId?: string) {
  for (const log of securityLogs) {
    if (!log.id) continue;
    try {
      const mappedLog = {
        ...log,
        adminId: log.adminId || adminId || log.createdBy || ''
      };
      await setDoc(doc(db, 'audit_logs', log.id), mappedLog);
    } catch (err) {
      console.error('[Firestore] Error syncing audit log:', err);
    }
  }
}

/**
 * Server-Side Query-Level Filtering for Audit Logs
 * Super Admin -> All audit logs
 * Admin -> Only own Operators' audit logs
 * Operator -> Cannot access at all (handled at router layer, return empty query)
 */
export async function fetchAuditLogsFromFirestore(userRole?: string, userId?: string): Promise<any[]> {
  try {
    const auditCol = collection(db, 'audit_logs');
    let q;

    if (userRole === 'Super Admin') {
      q = query(auditCol, orderBy('timestamp', 'desc'), limit(150));
    } else if (userRole === 'Admin' && userId) {
      q = query(auditCol, where('adminId', '==', userId), orderBy('timestamp', 'desc'), limit(150));
    } else {
      // Operator doesn't have access to audit logs
      return [];
    }

    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });
    return list;
  } catch (err) {
    console.warn('[Firestore] Audit log orderby index not ready, querying unordered:', err);
    try {
      const auditCol = collection(db, 'audit_logs');
      let q;
      if (userRole === 'Super Admin') {
        q = query(auditCol, limit(150));
      } else if (userRole === 'Admin' && userId) {
        q = query(auditCol, where('adminId', '==', userId), limit(150));
      } else {
        return [];
      }
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data());
      });
      return list;
    } catch (fallbackErr) {
      console.error('[Firestore] Error fetching audit logs fallback:', fallbackErr);
      return [];
    }
  }
}

// State Compatible proxies
export async function saveStateToFirestore(userId: string, state: any) {
  if (!userId) return;
  try {
    // 1. Sync to single document for safety/compatibility
    const docRef = doc(db, 'user_states', userId);
    await setDoc(docRef, state);

    // Resolve active admin context to partition individual collections
    const currentUser = state.currentUser;
    const role = currentUser?.role || 'Super Admin';
    const activeAdminId = role === 'Operator' ? (currentUser?.createdBy || '') : (currentUser?.id || '');

    // 2. Proactively sync to separate collections with correct mapping ONLY IF they are provided!
    if (state.operators !== undefined) {
      await syncUsersToFirestore(state.operators);
    }
    if (state.wallet !== undefined && state.aepsWallet !== undefined && state.emitraWallet !== undefined) {
      await syncWalletsToFirestore(state.wallet, state.aepsWallet, state.emitraWallet);
    }
    if (state.transactions !== undefined) {
      await syncTransactionsToFirestore(state.transactions, activeAdminId);
    }
    if (state.emitraApplications !== undefined) {
      await syncEmitraApplicationsToFirestore(state.emitraApplications, activeAdminId);
    }
    if (state.offlineWork !== undefined) {
      await syncOfflineWorkToFirestore(state.offlineWork, activeAdminId);
    }
    if (state.expenses !== undefined) {
      await syncExpensesToFirestore(state.expenses, activeAdminId);
    }
    if (state.shopDetails !== undefined && state.commissionSettings !== undefined) {
      await syncSettingsToFirestore(state.shopDetails, state.commissionSettings);
    } else if (state.shopDetails !== undefined) {
      await setDoc(doc(db, 'settings', 'shopDetails'), state.shopDetails || {});
    } else if (state.commissionSettings !== undefined) {
      await setDoc(doc(db, 'settings', 'commissionSettings'), state.commissionSettings || {});
    }
    if (state.securityLogs !== undefined) {
      await syncAuditLogsToFirestore(state.securityLogs, activeAdminId);
    }
    if (state.walletLedger !== undefined) {
      await syncWalletLedgerToFirestore(state.walletLedger);
    }
    if (state.notifications !== undefined) {
      await syncNotificationsToFirestore(state.notifications);
    }
    if (state.settlements !== undefined) {
      await syncSettlementsToFirestore(state.settlements);
    }
    if (state.activityTimeline !== undefined) {
      await syncActivityTimelineToFirestore(state.activityTimeline);
    }
    if (state.commissionRules !== undefined) {
      await syncCommissionRulesToFirestore(state.commissionRules);
    }
  } catch (err) {
    console.error('[Firebase Sync Error]', err);
  }
}

// 9. Wallet ledger sync
export async function syncWalletLedgerToFirestore(ledgerEntries: any[]) {
  for (const entry of ledgerEntries) {
    if (!entry.id) continue;
    try {
      await setDoc(doc(db, 'wallet_ledger', entry.id), entry);
    } catch (err) {
      console.error('[Firestore] Error syncing wallet ledger entry:', err);
    }
  }
}

// 10. Notifications Sync & Query
export async function syncNotificationsToFirestore(notifications: any[]) {
  for (const n of notifications) {
    if (!n.notificationId) continue;
    try {
      await setDoc(doc(db, 'notifications', n.notificationId), n);
    } catch (err) {
      console.error('[Firestore] Error syncing notification:', err);
    }
  }
}

export async function fetchNotificationsFromFirestore(userRole?: string, userId?: string): Promise<any[]> {
  try {
    const colRef = collection(db, 'notifications');
    const snap = await getDocs(colRef);
    const list: any[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (
        userRole === 'Super Admin' ||
        data.userId === 'broadcast' ||
        data.userId === 'all' ||
        data.userId === userId ||
        data.role === 'all' ||
        data.role === userRole
      ) {
        list.push(data);
      }
    });
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  } catch (err) {
    console.error('[Firestore] Error fetching notifications:', err);
    return [];
  }
}

// 11. Settlements Sync & Query
export async function syncSettlementsToFirestore(settlements: any[]) {
  for (const s of settlements) {
    if (!s.id) continue;
    try {
      await setDoc(doc(db, 'settlements', s.id), s);
    } catch (err) {
      console.error('[Firestore] Error syncing settlement:', err);
    }
  }
}

export async function fetchSettlementsFromFirestore(userRole?: string, userId?: string): Promise<any[]> {
  try {
    const colRef = collection(db, 'settlements');
    let q;
    if (userRole === 'Super Admin') {
      q = query(colRef);
    } else if (userRole === 'Admin' && userId) {
      q = query(colRef, where('adminId', '==', userId));
    } else if (userRole === 'Operator' && userId) {
      q = query(colRef, where('operatorId', '==', userId));
    } else {
      q = query(colRef);
    }
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });
    list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    return list;
  } catch (err) {
    console.error('[Firestore] Error fetching settlements:', err);
    return [];
  }
}

// 12. Activity Timeline Sync & Query
export async function syncActivityTimelineToFirestore(entries: any[]) {
  for (const e of entries) {
    if (!e.id) continue;
    try {
      await setDoc(doc(db, 'activity_timeline', e.id), e);
    } catch (err) {
      console.error('[Firestore] Error syncing activity timeline:', err);
    }
  }
}

export async function fetchActivityTimelineFromFirestore(userRole?: string, userId?: string): Promise<any[]> {
  try {
    const colRef = collection(db, 'activity_timeline');
    let q;
    if (userRole === 'Super Admin') {
      q = query(colRef);
    } else if (userRole === 'Admin' && userId) {
      q = query(colRef);
    } else {
      q = query(colRef, where('userId', '==', userId));
    }
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data() as any;
      if (userRole === 'Super Admin' || data.userId === userId || data.adminId === userId) {
        list.push(data);
      }
    });
    list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    return list;
  } catch (err) {
    console.error('[Firestore] Error fetching activity timeline:', err);
    return [];
  }
}

// 13. Commission Rules Sync & Query
export async function syncCommissionRulesToFirestore(rules: any[]) {
  for (const r of rules) {
    if (!r.id) continue;
    try {
      await setDoc(doc(db, 'commission_rules', r.id), r);
    } catch (err) {
      console.error('[Firestore] Error syncing commission rule:', err);
    }
  }
}

export async function fetchCommissionRulesFromFirestore(): Promise<any[]> {
  try {
    const colRef = collection(db, 'commission_rules');
    const snap = await getDocs(colRef);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });
    return list;
  } catch (err) {
    console.error('[Firestore] Error fetching commission rules:', err);
    return [];
  }
}

// 14. Backups Saving & Fetching
export async function saveBackupToFirestore(backup: { id: string; type: string; data: string; createdAt: string; createdBy: string }) {
  try {
    await setDoc(doc(db, 'backups', backup.id), backup);
  } catch (err) {
    console.error('[Firestore] Error saving backup:', err);
  }
}

export async function fetchBackupsFromFirestore(): Promise<any[]> {
  try {
    const colRef = collection(db, 'backups');
    const snap = await getDocs(colRef);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  } catch (err) {
    console.error('[Firestore] Error fetching backups:', err);
    return [];
  }
}

export async function fetchWalletLedgerFromFirestore(userRole?: string, userId?: string): Promise<any[]> {
  try {
    const ledgerCol = collection(db, 'wallet_ledger');
    let q;
    if (userRole === 'Super Admin') {
      q = query(ledgerCol, orderBy('timestamp', 'desc'));
    } else if (userRole === 'Admin' && userId) {
      q = query(ledgerCol, where('adminId', '==', userId), orderBy('timestamp', 'desc'));
    } else if (userRole === 'Operator' && userId) {
      q = query(ledgerCol, where('userId', '==', userId), orderBy('timestamp', 'desc'));
    } else {
      q = query(ledgerCol, orderBy('timestamp', 'desc'));
    }
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data());
    });
    return list;
  } catch (err) {
    console.warn('[Firestore] Wallet ledger orderBy index not ready, querying unordered:', err);
    try {
      const ledgerCol = collection(db, 'wallet_ledger');
      let q;
      if (userRole === 'Super Admin') {
        q = query(ledgerCol);
      } else if (userRole === 'Admin' && userId) {
        q = query(ledgerCol, where('adminId', '==', userId));
      } else if (userRole === 'Operator' && userId) {
        q = query(ledgerCol, where('userId', '==', userId));
      } else {
        q = query(ledgerCol);
      }
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data());
      });
      return list;
    } catch (fallbackErr) {
      console.error('[Firestore] Error fetching wallet ledger:', fallbackErr);
      return [];
    }
  }
}

export async function executeBankingTransaction(params: {
  userId: string;
  userName: string;
  userRole: string;
  customerName: string;
  aadhaarNumber?: string;
  type: 'Deposit' | 'Withdrawal' | 'DMT' | 'UPI Payment';
  amount: number;
  fee: number;
  commission: number;
  utrNumber: string;
  adminId: string;
  operatorId: string;
  operatorName: string;
}) {
  const txnId = `TXN${Math.floor(100000 + Math.random() * 900000)}`;
  const ledgerId = `LEDGER_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  
  const txRef = doc(db, 'transactions', txnId);
  const ledgerRef = doc(db, 'wallet_ledger', ledgerId);
  const walletRef = doc(db, 'wallets', params.userId);
  
  try {
    const result = await runTransaction(db, async (transaction) => {
      const txSnap = await transaction.get(txRef);
      if (txSnap.exists()) {
        throw new Error('Duplicate transaction ID detected!');
      }
      
      const walletSnap = await transaction.get(walletRef);
      let openingBalance = 15000;
      if (walletSnap.exists()) {
        const d = walletSnap.data();
        openingBalance = d.balance !== undefined ? d.balance : (d.currentBalance !== undefined ? d.currentBalance : 15000);
      }
      
      let credit = 0;
      let debit = 0;
      
      if (params.type === 'Deposit' || params.type === 'DMT' || params.type === 'UPI Payment') {
        debit = params.amount + params.fee;
      } else if (params.type === 'Withdrawal') {
        credit = params.amount + params.commission;
      }
      
      const closingBalance = openingBalance + credit - debit;
      const availableBalance = closingBalance;
      
      if (debit > 0 && openingBalance < debit) {
        throw new Error(`Insufficient wallet balance! Available: ₹${openingBalance}, Transaction requires: ₹${debit}`);
      }
      
      const updatedWallet = {
        userId: params.userId,
        userName: params.userName,
        role: params.userRole,
        balance: availableBalance,
        openingBalance,
        currentBalance: closingBalance,
        credit,
        debit,
        closingBalance,
        availableBalance,
        lastUpdated: now
      };
      
      const newTransaction = {
        id: txnId,
        timestamp: now,
        customerName: params.customerName,
        aadhaarNumber: params.aadhaarNumber,
        type: params.type as 'Deposit' | 'Withdrawal' | 'DMT' | 'UPI Payment',
        amount: params.amount,
        fee: params.fee,
        char: params.fee,
        commission: params.commission,
        status: 'Success' as const,
        operatorId: params.operatorId,
        operatorName: params.operatorName,
        adminId: params.adminId,
        utrNumber: params.utrNumber || `${Math.floor(300000000000 + Math.random() * 600000000000)}`,
        walletDebited: debit > 0,
        createdBy: params.adminId,
        openingBalance,
        closingBalance,
        date: now.split('T')[0],
        time: now.split('T')[1].substring(0, 8)
      };
      
      const newLedger = {
        id: ledgerId,
        userId: params.userId,
        userName: params.userName,
        role: params.userRole,
        transactionId: txnId,
        service: params.type,
        openingBalance,
        credit,
        debit,
        closingBalance,
        availableBalance,
        status: 'Success' as const,
        operatorId: params.operatorId,
        adminId: params.adminId,
        timestamp: now
      };
      
      transaction.set(txRef, newTransaction);
      transaction.set(ledgerRef, newLedger);
      transaction.set(walletRef, updatedWallet);
      
      return {
        transaction: newTransaction,
        ledger: newLedger,
        wallet: updatedWallet
      };
    });
    
    return result;
  } catch (err) {
    console.error('Transaction rolled back:', err);
    throw err;
  }
}

export async function getStateFromFirestore(userId: string, userRole?: string, currentUserId?: string): Promise<any | null> {
  if (!userId) return null;
  try {
    // 1. First, always read the full single document (authoritative complete state)
    const legacyDoc = await getDoc(doc(db, 'user_states', userId));
    const legacyData = legacyDoc.exists() ? legacyDoc.data() : null;

    // Determine the role and context to filter Firestore queries server-side
    const role = userRole || (userId === 'shared_shop_state' || userId === 'op-super' ? 'Super Admin' : 'Admin');
    const filterId = currentUserId || (userId.startsWith('shop_state_') ? userId.replace('shop_state_', '') : userId);

    console.log(`[Firebase Server-Query] Loading state for ${userId}. Role: ${role}, Context UID: ${filterId}`);

    // 2. If legacyData exists, return it immediately as the single source of truth.
    // This guarantees perfect integrity, zero lag, and prevents cross-contamination of balances.
    if (legacyData) {
      return legacyData;
    }

    // 3. Fallback: If the complete document doesn't exist, reconstruct from individual collections
    const users = await fetchUsersFromFirestore(role, filterId);
    const wallets = await fetchWalletsFromFirestore();
    const transactions = await fetchTransactionsFromFirestore(role, filterId);
    const settings = await fetchSettingsFromFirestore();
    const auditLogs = await fetchAuditLogsFromFirestore(role, filterId);
    const emitraApps = await fetchEmitraApplicationsFromFirestore(role, filterId);
    const offlineWork = await fetchOfflineWorkFromFirestore(role, filterId);
    const expenses = await fetchExpensesFromFirestore(role, filterId);
    const walletLedger = await fetchWalletLedgerFromFirestore(role, filterId);
    const notifications = await fetchNotificationsFromFirestore(role, filterId);
    const settlements = await fetchSettlementsFromFirestore(role, filterId);
    const timeline = await fetchActivityTimelineFromFirestore(role, filterId);
    const commissionRules = await fetchCommissionRulesFromFirestore();

    return {
      operators: users.map(u => mapUserDoc(u)),
      wallet: wallets?.wallet || { balance: 0, withdrawnCommission: 0, totalCommissionEarned: 0, lastUpdated: new Date().toISOString() },
      aepsWallet: wallets?.aepsWallet || { onlineBalance: 0, physicalBalance: 0, lastUpdated: new Date().toISOString() },
      emitraWallet: wallets?.emitraWallet || { balance: 0, lastUpdated: new Date().toISOString() },
      transactions: transactions,
      emitraApplications: emitraApps,
      offlineWork: offlineWork,
      expenses: expenses,
      shopDetails: settings?.shopDetails || {
        name: 'Vakrangee Kendra (वाकरंगी केंद्र)',
        mobile: '+91 90010 12345',
        gmail: 'vakrangee653@gmail.com',
        address: 'मुख्य चौराहा, वार्ड नं. 12, राजस्थान',
        logoUrl: ''
      },
      commissionSettings: settings?.commissionSettings || {
        depositRate: 0.2,
        withdrawalRate: 0.5,
        transferRate: 15.0,
        dmtRate: 75.0,
        emitraRates: {},
        emitraFees: {},
        offlineFees: {},
        offlineCosts: {},
        customExpenseCategories: [],
        staffNames: []
      },
      securityLogs: auditLogs,
      walletLedger: walletLedger,
      notifications: notifications,
      settlements: settlements,
      activityTimeline: timeline,
      commissionRules: commissionRules
    };
  } catch (err) {
    console.error('[Firebase Error getting state]', err);
    return null;
  }
}

export async function getAllUserStatesFromFirestore(): Promise<{ id: string; data: any }[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'user_states'));
    const results: { id: string; data: any }[] = [];
    querySnapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, data: docSnap.data() });
    });
    return results;
  } catch (err) {
    console.error('[Firebase] Failed to fetch all user states:', err);
    return [];
  }
}
