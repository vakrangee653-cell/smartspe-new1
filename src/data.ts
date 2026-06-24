/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, Customer, Transaction, EmitraApplication, OfflineWorkItem, SecurityLog, Operator, Expense, ShopDetails } from './types';

export const DEFAULT_SHOP_DETAILS: ShopDetails = {
  name: 'Vakrangee Kendra (वाकरंगी केंद्र)',
  mobile: '+91 90010 12345',
  gmail: 'vakrangee653@gmail.com',
  address: 'मुख्य चौराहा, वार्ड नं. 12, डाकघर के सामने, राजस्थान 331001 (Main Road, Ward No. 12, Rajasthan)',
  logoUrl: '' // Empty by default
};

// Initial Setup Data
const INITIAL_OPERATORS: Operator[] = [
  {
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
    isLockedOut: false
  },
  {
    id: 'op-1',
    name: 'Rajendra Prasad',
    email: 'rajendra.spe@gmail.com',
    role: 'Admin',
    status: 'Active',
    walletLimit: 500000,
    commissionRate: 80, // percentage of branch share
    phoneNumber: '+91 98290 12345',
    password: 'admin123',
    failedAttempts: 0,
    isLockedOut: false
  },
  {
    id: 'op-2',
    name: 'Suresh Kumar',
    email: 'suresh.emitra@gmail.com',
    role: 'Operator',
    status: 'Active',
    walletLimit: 150000,
    commissionRate: 65,
    phoneNumber: '+91 94140 56789',
    password: 'operator123',
    failedAttempts: 0,
    isLockedOut: false
  },
  {
    id: 'op-3',
    name: 'Priyanka Sharma',
    email: 'priyanka.csp@gmail.com',
    role: 'Operator',
    status: 'Active',
    walletLimit: 100000,
    commissionRate: 60,
    phoneNumber: '+91 91660 98765',
    password: 'operator123',
    failedAttempts: 0,
    isLockedOut: false
  }
];

const INITIAL_CUSTOMERS: Customer[] = [];

const INITIAL_TRANSACTIONS: Transaction[] = [];

const INITIAL_EMITRA_APPLICATIONS: EmitraApplication[] = [];

const INITIAL_OFFLINE_WORK: OfflineWorkItem[] = [];

const INITIAL_SECURITY_LOGS: SecurityLog[] = [];

const INITIAL_EXPENSES: Expense[] = [];

const INITIAL_WALLET: AppState['wallet'] = {
  balance: 0,
  withdrawnCommission: 0,
  totalCommissionEarned: 0,
  lastUpdated: new Date().toISOString()
};

const INITIAL_AEPS_WALLET: AppState['aepsWallet'] = {
  onlineBalance: 0,
  physicalBalance: 0,
  lastUpdated: new Date().toISOString()
};

const INITIAL_EMITRA_WALLET: AppState['emitraWallet'] = {
  balance: 0,
  lastUpdated: new Date().toISOString()
};

const INITIAL_COMMISSION_SETTINGS: AppState['commissionSettings'] = {
  depositRate: 0.2, // 0.2%
  withdrawalRate: 0.5, // 0.5%
  transferRate: 15.0, // Fixed Rs 15 per transaction
  dmtRate: 75.0, // 75% of the customer fee
  emitraRates: {
    'Jan Aadhaar Services': 45,
    'Birth Certificate': 35,
    'Income Certificate': 40,
    'Caste Certificate': 35,
    'Residence Certificate': 35,
    'Ayushman Card': 20,
    'PAN Card Services': 50,
    'Utility Bill Services': 15,
    'Government Application': 60
  },
  emitraFees: {
    'Jan Aadhaar Services': 120,
    'Birth Certificate': 80,
    'Income Certificate': 100,
    'Caste Certificate': 80,
    'Residence Certificate': 80,
    'Ayushman Card': 50,
    'PAN Card Services': 150,
    'Utility Bill Services': 15,
    'Government Application': 180
  },
  offlineFees: {
    'Photocopy (फोटोकॉपी)': 5,
    'Lamination (लेमिनेशन)': 30,
    'Aadhaar Print (आधार प्रिंट)': 50,
    'Form Filling (फॉर्म भरना)': 50,
    'File Print (फाइल प्रिंट)': 15,
    'Recharge & Bill (रिचार्ज एवं बिल)': 100,
    'Other Offline Service (अन्य ऑफ़लाइन कार्य)': 40
  },
  offlineCosts: {
    'Photocopy (फोटोकॉपी)': 1,
    'Lamination (लेमिनेशन)': 5,
    'Aadhaar Print (आधार प्रिंट)': 10,
    'Form Filling (फॉर्म भरना)': 0,
    'File Print (फाइल प्रिंट)': 2,
    'Recharge & Bill (रिचार्ज एवं बिल)': 98,
    'Other Offline Service (अन्य ऑफ़लाइन कार्य)': 5
  },
  customExpenseCategories: [
    'Shop Rent',
    'Internet & Wifi',
    'Electricity',
    'Printing & Ink',
    'Tea & Refreshments',
    'Salary/Wages',
    'Other'
  ],
  staffNames: [
    'Rajendra Prasad',
    'Suresh Kumar',
    'Priyanka Sharma',
    'Rahul Sen'
  ]
};

export const getInitialState = (): AppState => {
  // Try loading from localStorage safely to prevent sandboxed iframe security crashes
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('smartspe_clean_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Force upgrade/sync vakrangee653@gmail.com super admin configuration
        if (parsed.operators) {
          const hasVakrangee = parsed.operators.some((o: any) => o.email === 'vakrangee653@gmail.com');
          if (!hasVakrangee) {
            parsed.operators = parsed.operators.map((o: any) => {
              if (o.id === 'op-super' || o.role === 'Super Admin') {
                return {
                  ...o,
                  id: 'op-super',
                  email: 'vakrangee653@gmail.com',
                  name: 'Vakrangee Super Admin',
                  password: 'superadmin123'
                };
              }
              return o;
            });
            
            if (parsed.currentUser && (parsed.currentUser.id === 'op-super' || parsed.currentUser.role === 'Super Admin')) {
              parsed.currentUser.email = 'vakrangee653@gmail.com';
              parsed.currentUser.name = 'Vakrangee Super Admin (Super Admin)';
            }
          }
        }

        // Ensure standard date objects match correctly
        if (parsed.commissionSettings) {
          if (!parsed.commissionSettings.emitraFees) {
            parsed.commissionSettings.emitraFees = { ...INITIAL_COMMISSION_SETTINGS.emitraFees };
          }
          if (!parsed.commissionSettings.offlineFees) {
            parsed.commissionSettings.offlineFees = { ...INITIAL_COMMISSION_SETTINGS.offlineFees };
          } else if (!parsed.commissionSettings.offlineFees['Recharge & Bill (रिचार्ज एवं बिल)']) {
            parsed.commissionSettings.offlineFees['Recharge & Bill (रिचार्ज एवं बिल)'] = 100;
          }
          if (!parsed.commissionSettings.offlineCosts) {
            parsed.commissionSettings.offlineCosts = { ...INITIAL_COMMISSION_SETTINGS.offlineCosts };
          } else if (!parsed.commissionSettings.offlineCosts['Recharge & Bill (रिचार्ज एवं बिल)']) {
            parsed.commissionSettings.offlineCosts['Recharge & Bill (रिचार्ज एवं बिल)'] = 98;
          }
          if (!parsed.commissionSettings.customExpenseCategories) {
            parsed.commissionSettings.customExpenseCategories = [ ...INITIAL_COMMISSION_SETTINGS.customExpenseCategories! ];
          }
          if (!parsed.commissionSettings.staffNames) {
            parsed.commissionSettings.staffNames = [ ...INITIAL_COMMISSION_SETTINGS.staffNames! ];
          }
        }
        if (!parsed.aepsWallet) {
          parsed.aepsWallet = { ...INITIAL_AEPS_WALLET };
        }
        if (!parsed.emitraWallet) {
          parsed.emitraWallet = { ...INITIAL_EMITRA_WALLET };
        }
        if (!parsed.expenses) {
          parsed.expenses = [...INITIAL_EXPENSES];
        }
        if (!parsed.shopDetails) {
          parsed.shopDetails = { ...DEFAULT_SHOP_DETAILS };
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing saved state, using default schema:', e);
    }
  }

  // Fallback to seeded initial state
  const state: AppState = {
    currentUser: {
      id: 'op-super',
      name: 'Vakrangee Super Admin',
      email: 'vakrangee653@gmail.com',
      role: 'Super Admin',
      phoneNumber: '+91 90010 12345'
    },
    shopDetails: { ...DEFAULT_SHOP_DETAILS },
    wallet: INITIAL_WALLET,
    aepsWallet: INITIAL_AEPS_WALLET,
    emitraWallet: INITIAL_EMITRA_WALLET,
    operators: INITIAL_OPERATORS,
    customers: INITIAL_CUSTOMERS,
    transactions: INITIAL_TRANSACTIONS,
    emitraApplications: INITIAL_EMITRA_APPLICATIONS,
    offlineWork: INITIAL_OFFLINE_WORK,
    securityLogs: INITIAL_SECURITY_LOGS,
    expenses: INITIAL_EXPENSES,
    commissionSettings: INITIAL_COMMISSION_SETTINGS
  };

  saveState(state);
  return state;
};

export const saveState = (state: AppState) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('smartspe_clean_state', JSON.stringify(state));
    } catch (e) {
      console.warn('[Storage] Failed to save state to localStorage:', e);
    }
  }
};
