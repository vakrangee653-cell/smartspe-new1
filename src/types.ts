/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Super Admin' | 'Admin' | 'Operator' | 'Customer';

export interface Operator {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  walletLimit: number;
  commissionRate: number; // percentage
  phoneNumber: string;
  password?: string;
  failedAttempts?: number;
  isLockedOut?: boolean;
  createdBy?: string;
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

export type TransactionType = 'Deposit' | 'Withdrawal' | 'Fund Transfer' | 'DMT';

export interface Transaction {
  id: string;
  timestamp: string;
  customerId?: string;
  customerName: string;
  aadhaarNumber?: string;
  type: TransactionType;
  amount: number;
  fee: number;
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
  createdBy?: string;
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

export interface AppState {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    phoneNumber: string;
    createdBy?: string;
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
