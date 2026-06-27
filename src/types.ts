/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Super Admin' | 'Admin' | 'Operator' | 'Customer';

export interface Operator {
  id: string;
  uid?: string; // mapping for user schema
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  walletLimit: number;
  commissionRate: number; // percentage
  phoneNumber: string;
  mobile?: string; // mapping for user schema
  password?: string;
  failedAttempts?: number;
  isLockedOut?: boolean;
  createdBy?: string;
  adminId?: string;
  permissions?: string[];
  walletBalance?: number;
  photoUrl?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  aadhaarNumber?: string;
  panNumber?: string;
  janAadhaarNumber?: string;
  address: string;
  dueAmount: number;
  documents: {
    name: string;
    type: 'Aadhaar' | 'PAN' | 'Jan Aadhaar' | 'Photo' | 'Other';
    url: string; // Base64 or objectUrl simulated
    uploadedAt: string;
    verified: boolean;
  }[];
  notes?: string;
  createdAt: string;
  followUpDate?: string;
  followUpNotes?: string;
  createdBy?: string;
}

export type TransactionType = 'Deposit' | 'Withdrawal' | 'DMT' | 'UPI Payment';

export interface Transaction {
  id: string;
  timestamp: string;
  customerId?: string;
  customerName: string;
  aadhaarNumber?: string;
  type: TransactionType;
  amount: number;
  fee: number;
  char?: number; // charges/fee mapping
  commission: number;
  status: 'Success' | 'Failed' | 'Pending';
  operatorId: string;
  operatorName: string;
  beneficiaryName?: string;
  beneficiaryAccount?: string;
  beneficiaryIFSC?: string;
  bankName?: string;
  utrNumber: string;
  walletDebited: boolean;
  createdBy?: string; // Admin ID / branch identifier
  adminId?: string; // Explicit Admin ID
  openingBalance?: number;
  closingBalance?: number;
  date?: string;
  time?: string;
}

export interface UserWallet {
  userId: string;
  userName: string;
  role: string;
  balance: number; // Current / Available balance
  openingBalance: number;
  currentBalance: number;
  credit: number;
  debit: number;
  closingBalance: number;
  availableBalance: number;
  lastUpdated: string;
}

export interface WalletLedgerEntry {
  id: string;
  userId: string;
  userName: string;
  role: string;
  transactionId: string;
  service: string;
  openingBalance: number;
  credit: number;
  debit: number;
  closingBalance: number;
  availableBalance: number;
  status: 'Success' | 'Failed' | 'Pending';
  operatorId: string;
  adminId: string;
  timestamp: string;
}

export type EmitraServiceType = string;

export interface EmitraApplication {
  id: string;
  applicantName: string;
  applicantPhone: string;
  serviceType: EmitraServiceType;
  appliedDate: string;
  feeCharged: number;
  commissionEarned: number;
  status: 'Pending' | 'Submitted' | 'In Process' | 'Completed' | 'Uncompleted' | 'Rejected';
  tokenNumber: string;
  dueAmount: number;
  operatorId: string;
  notes?: string;
  documentsSubmitted: string[];
  paymentMode?: 'Cash' | 'Online';
  createdBy?: string;
}

export interface OfflineWorkItem {
  id: string;
  receivedDate: string;
  customerName: string;
  phoneNumber: string;
  workDescription: string;
  documentsReceived: string[];
  pendingSteps: string[];
  status: 'File Received' | 'Checking' | 'Processing' | 'Ready for Delivery' | 'Delivered' | 'In Process' | 'Completed' | 'Uncompleted';
  dueAmount: number;
  deliveryDate?: string;
  followUpDate?: string;
  followUpNotes?: string;
  operatorId: string;
  serviceType?: string;
  totalCharged?: number;
  baseCost?: number;
  commissionEarned?: number;
  amountCollected?: number;
  paymentMode?: 'Cash' | 'Online';
  createdBy?: string;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  role: UserRole;
  action: string;
  status: 'Success' | 'Failed' | 'Blocked';
  ipAddress: string;
  device: string;
  browser: string;
  createdBy?: string;
}

export interface WalletState {
  balance: number;
  withdrawnCommission: number;
  totalCommissionEarned: number;
  lastUpdated: string;
}

export interface AEPSWalletState {
  onlineBalance: number;
  physicalBalance: number;
  lastUpdated: string;
}

export interface EMitraWalletState {
  balance: number;
  lastUpdated: string;
}

export interface Expense {
  id: string;
  type?: 'Expense' | 'Income';
  description: string;
  category: string;
  amount: number;
  timestamp: string;
  paymentMode: 'Commission Wallet' | 'Cash (CSP Limit)' | 'SSO Wallet' | 'UPI/Bank' | 'Personal Cash';
  addedBy: string;
  notes?: string;
  createdBy?: string;
}

export interface ShopDetails {
  name: string;
  mobile: string;
  gmail: string;
  address: string;
  logoUrl?: string; // Base64 or URL of the shop logo
}

export interface InAppNotification {
  notificationId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'alert' | 'audit' | 'ledger' | 'system';
  userId: string; // Target user's id or 'all' or 'broadcast'
  role: string;   // Role permitted to read or 'all'
  status: 'read' | 'unread';
  createdAt: string;
  channelsSent?: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
}

export interface SettlementEntry {
  id: string; // settlementId
  amount: number;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  type: 'Bank Settlement' | 'Wallet Settlement';
  status: 'Pending' | 'Approved' | 'Rejected';
  operatorId: string;
  operatorName: string;
  adminId: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  remarks?: string;
  createdAt: string;
  timestamp: string;
}

export interface ActivityTimelineEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  actionType: 'Login' | 'Logout' | 'Wallet Credit' | 'Wallet Debit' | 'Cash Deposit' | 'Cash Withdrawal' | 'DMT' | 'UPI Payment' | 'Settings Update' | 'User Create' | 'User Delete' | 'Role Change';
  details: string;
  status: 'Success' | 'Failed';
  amount?: number;
  ipAddress?: string;
}

export interface CommissionHistoryEntry {
  timestamp: string;
  action: string;
  changedBy: string;
  prevVal: number;
  newVal: number;
  prevStatus: boolean;
  newStatus: boolean;
}

export interface CommissionRule {
  id: string;
  service: 'Deposit' | 'Withdrawal' | 'DMT' | 'UPI Payment' | 'eMitra' | 'Offline';
  targetType: 'All' | 'Admin' | 'Operator';
  targetId: string; // specific user ID or 'all'
  targetName: string;
  rateType: 'Percentage' | 'Fixed';
  rateValue: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  history: CommissionHistoryEntry[];
}

export interface AppState {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    phoneNumber: string;
    createdBy?: string;
    photoUrl?: string;
    address?: string;
  } | null;
  shopDetails?: ShopDetails;
  wallet: WalletState;
  aepsWallet: AEPSWalletState;
  emitraWallet: EMitraWalletState;
  operators: Operator[];
  customers: Customer[];
  transactions: Transaction[];
  emitraApplications: EmitraApplication[];
  offlineWork: OfflineWorkItem[];
  securityLogs: SecurityLog[];
  expenses: Expense[];
  walletLedger: WalletLedgerEntry[];
  notifications: InAppNotification[];
  settlements: SettlementEntry[];
  activityTimeline: ActivityTimelineEntry[];
  commissionRules: CommissionRule[];
  commissionSettings: {
    depositRate: number; // percentage, e.g. 0.2%
    withdrawalRate: number; // percentage, e.g. 0.5%
    transferRate: number; // fixed Rs per txn, or rate
    dmtRate: number; // percentage
    emitraRates: Record<string, number>; // absolute Rs commission
    emitraFees: Record<string, number>; // absolute Rs base government cost
    offlineFees: Record<string, number>; // customer default charges
    offlineCosts: Record<string, number>; // base default cost (paper/ink/etc)
    expenseBudgetLimit?: number; // Monthly shop budget limit in INR
    disableOperatorExpenseLogging?: boolean; // Restrict operator from recording new expenses
    customExpenseCategories?: string[]; // Custom set of expense types (खर्च का प्रकार) Selected by Admin
    staffNames?: string[]; // Dynamic staff names allowed to log expenses (स्टाफ सदस्य नाम)
  };
}
