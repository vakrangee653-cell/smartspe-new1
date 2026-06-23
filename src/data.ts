/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppState, Customer, Transaction, EmitraApplication, OfflineWorkItem, SecurityLog, Operator, Expense } from './types';

// Let's create helper date generators to populate dynamic relative times
const daysAgo = (num: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - num);
  return date.toISOString();
};

const hoursAgo = (hours: number, mins = 0): string => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  date.setMinutes(date.getMinutes() - mins);
  return date.toISOString();
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

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Ramesh Singh',
    phoneNumber: '9828456123',
    aadhaarNumber: '5432-1298-7654',
    panNumber: 'CHVPS4512A',
    janAadhaarNumber: '7612-8763-1254',
    address: 'Plot No. 45, Vaishali Nagar, Jaipur, Rajasthan',
    dueAmount: 450,
    documents: [
      { name: 'Aadhaar Card', type: 'Aadhaar', url: '#', uploadedAt: daysAgo(10), verified: true },
      { name: 'PAN Card', type: 'PAN', url: '#', uploadedAt: daysAgo(10), verified: true }
    ],
    notes: 'Regular customer for withdrawal & bill payments.',
    createdAt: daysAgo(10),
    followUpDate: daysAgo(-2).split('T')[0], // 2 days in the future
    followUpNotes: 'Pending Ayushman Card verification'
  },
  {
    id: 'cust-2',
    name: 'Meena Devi',
    phoneNumber: '9414567234',
    aadhaarNumber: '8912-3456-7890',
    janAadhaarNumber: '9082-1245-8791',
    address: 'Near Old Bus Stand, Chomu, Rajasthan',
    dueAmount: 1200,
    documents: [
      { name: 'Jan Aadhaar Card', type: 'Jan Aadhaar', url: '#', uploadedAt: daysAgo(15), verified: true }
    ],
    notes: 'Widow pension recipient, needs caste certificate and jan aadhaar transfer.',
    createdAt: daysAgo(15),
    followUpDate: daysAgo(-1).split('T')[0], // 1 day in the future
    followUpNotes: 'Collect Caste Certificate documents'
  },
  {
    id: 'cust-3',
    name: 'Mahendra Kumar Kumawat',
    phoneNumber: '7014123456',
    aadhaarNumber: '1122-3344-5566',
    panNumber: 'BZPPK8901L',
    address: 'VPO Kalwar, Jaipur, Rajasthan',
    dueAmount: 0,
    documents: [
      { name: 'Aadhaar Card', type: 'Aadhaar', url: '#', uploadedAt: daysAgo(4), verified: true },
      { name: 'Photo', type: 'Photo', url: '#', uploadedAt: daysAgo(4), verified: true }
    ],
    notes: 'Shop owner nearby, regular deposits.',
    createdAt: daysAgo(4)
  },
  {
    id: 'cust-4',
    name: 'Sunita Sharma',
    phoneNumber: '8005678912',
    aadhaarNumber: '4455-6677-8899',
    janAadhaarNumber: '4512-8923-0192',
    address: 'Ganesh Colony, Jhotwara, Jaipur',
    dueAmount: 150,
    documents: [
      { name: 'Aadhaar Card', type: 'Aadhaar', url: '#', uploadedAt: daysAgo(2), verified: false }
    ],
    notes: 'Submitted file for Income Certificate today.',
    createdAt: daysAgo(2),
    followUpDate: daysAgo(-3).split('T')[0],
    followUpNotes: 'Obtain Income Self-Declaration physically signed'
  },
  {
    id: 'cust-5',
    name: 'Gopal Lal Saini',
    phoneNumber: '9928345678',
    aadhaarNumber: '9988-7766-5544',
    address: 'Saini Mohalla, Mansarovar, Jaipur',
    dueAmount: 0,
    documents: [],
    notes: 'New account candidate.',
    createdAt: daysAgo(1)
  }
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  // Today's Transactions
  {
    id: 'TXN100234',
    timestamp: hoursAgo(1, 15),
    customerId: 'cust-1',
    customerName: 'Ramesh Singh',
    type: 'Withdrawal',
    amount: 5000,
    fee: 0,
    commission: 25.0,
    status: 'Success',
    operatorId: 'op-2',
    operatorName: 'Suresh Kumar',
    bankName: 'State Bank of India',
    utrNumber: '325412890641',
    walletDebited: true
  },
  {
    id: 'TXN100233',
    timestamp: hoursAgo(2, 45),
    customerId: 'cust-3',
    customerName: 'Mahendra Kumar Kumawat',
    type: 'Deposit',
    amount: 15000,
    fee: 0,
    commission: 30.0,
    status: 'Success',
    operatorId: 'op-1',
    operatorName: 'Rajendra Prasad',
    bankName: 'Bank of Baroda',
    utrNumber: '325412890612',
    walletDebited: true
  },
  {
    id: 'TXN100232',
    timestamp: hoursAgo(4, 10),
    customerName: 'Karan Meena',
    type: 'DMT',
    amount: 8500,
    fee: 45,
    commission: 22.5,
    status: 'Success',
    operatorId: 'op-3',
    operatorName: 'Priyanka Sharma',
    beneficiaryName: 'Bhanwar Singh Meena',
    beneficiaryAccount: '501002345128',
    beneficiaryIFSC: 'HDFC0000125',
    bankName: 'HDFC Bank',
    utrNumber: '325412890599',
    walletDebited: true
  },
  {
    id: 'TXN100231',
    timestamp: hoursAgo(5, 5),
    customerName: 'Dinesh Kumar',
    type: 'Fund Transfer',
    amount: 3000,
    fee: 10,
    commission: 15.0,
    status: 'Failed',
    operatorId: 'op-2',
    operatorName: 'Suresh Kumar',
    beneficiaryName: 'Rajesh Kumar',
    beneficiaryAccount: '31284561239',
    beneficiaryIFSC: 'SBIN0004512',
    bankName: 'State Bank of India',
    utrNumber: '325412890451',
    walletDebited: false
  },
  {
    id: 'TXN100230',
    timestamp: hoursAgo(6, 20),
    customerId: 'cust-2',
    customerName: 'Meena Devi',
    type: 'Withdrawal',
    amount: 1000,
    fee: 0,
    commission: 5.0,
    status: 'Success',
    operatorId: 'op-3',
    operatorName: 'Priyanka Sharma',
    bankName: 'Rajasthan Marudhara Gramin Bank',
    utrNumber: '325412890333',
    walletDebited: true
  },
  {
    id: 'TXN100229',
    timestamp: hoursAgo(7, 30),
    customerName: 'Prakash Sharma',
    type: 'DMT',
    amount: 25000,
    fee: 125,
    commission: 62.5,
    status: 'Success',
    operatorId: 'op-1',
    operatorName: 'Rajendra Prasad',
    beneficiaryName: 'Sharma & Sons Traders',
    beneficiaryAccount: '91802004561284',
    beneficiaryIFSC: 'ICIC0000104',
    bankName: 'ICICI Bank',
    utrNumber: '325412890201',
    walletDebited: true
  },
  {
    id: 'TXN100228',
    timestamp: hoursAgo(8, 12),
    customerName: 'Sunil Kumar',
    type: 'Deposit',
    amount: 4500,
    fee: 0,
    commission: 9.0,
    status: 'Pending',
    operatorId: 'op-2',
    operatorName: 'Suresh Kumar',
    bankName: 'Punjab National Bank',
    utrNumber: '325412890111',
    walletDebited: true
  },
  
  // Historical (1 day ago)
  {
    id: 'TXN100215',
    timestamp: daysAgo(1),
    customerName: 'Mahendra Singh',
    type: 'Withdrawal',
    amount: 10000,
    fee: 0,
    commission: 50.0,
    status: 'Success',
    operatorId: 'op-1',
    operatorName: 'Rajendra Prasad',
    bankName: 'State Bank of India',
    utrNumber: '325312890521',
    walletDebited: true
  },
  {
    id: 'TXN100216',
    timestamp: daysAgo(1),
    customerName: 'Aarti Vyas',
    type: 'DMT',
    amount: 12000,
    fee: 60,
    commission: 30.0,
    status: 'Success',
    operatorId: 'op-3',
    operatorName: 'Priyanka Sharma',
    beneficiaryName: 'Mohit Vyas',
    beneficiaryAccount: '40051287654',
    beneficiaryIFSC: 'BARB0VJJAIP',
    bankName: 'Bank of Baroda',
    utrNumber: '325312890533',
    walletDebited: true
  },
  {
    id: 'TXN100217',
    timestamp: daysAgo(1),
    customerName: 'Jagdish Kumawat',
    type: 'Deposit',
    amount: 8000,
    fee: 0,
    commission: 16.0,
    status: 'Success',
    operatorId: 'op-2',
    operatorName: 'Suresh Kumar',
    bankName: 'Bank of India',
    utrNumber: '325312890599',
    walletDebited: true
  },

  // Historical (2 days ago)
  {
    id: 'TXN100200',
    timestamp: daysAgo(2),
    customerName: 'Suman Choudhary',
    type: 'Withdrawal',
    amount: 6000,
    fee: 0,
    commission: 30.0,
    status: 'Success',
    operatorId: 'op-1',
    operatorName: 'Rajendra Prasad',
    bankName: 'State Bank of India',
    utrNumber: '325212890122',
    walletDebited: true
  },
  {
    id: 'TXN100201',
    timestamp: daysAgo(2),
    customerName: 'Mukesh Sharma',
    type: 'Deposit',
    amount: 18000,
    fee: 0,
    commission: 36.0,
    status: 'Success',
    operatorId: 'op-3',
    operatorName: 'Priyanka Sharma',
    bankName: 'Punjab National Bank',
    utrNumber: '325212890145',
    walletDebited: true
  },

  // Historical (3 days ago)
  {
    id: 'TXN100190',
    timestamp: daysAgo(3),
    customerName: 'Suresh Saini',
    type: 'DMT',
    amount: 15000,
    fee: 75,
    commission: 37.5,
    status: 'Success',
    operatorId: 'op-2',
    operatorName: 'Suresh Kumar',
    beneficiaryName: 'Pinky Saini',
    beneficiaryAccount: '100234512984',
    beneficiaryIFSC: 'UTIB0001101',
    bankName: 'Axis Bank',
    utrNumber: '325112890500',
    walletDebited: true
  },
  {
    id: 'TXN100191',
    timestamp: daysAgo(3),
    customerName: 'Om Prakash',
    type: 'Withdrawal',
    amount: 12000,
    fee: 0,
    commission: 60.0,
    status: 'Success',
    operatorId: 'op-1',
    operatorName: 'Rajendra Prasad',
    bankName: 'State Bank of India',
    utrNumber: '325112890511',
    walletDebited: true
  },

  // Historical (4 days ago)
  {
    id: 'TXN100180',
    timestamp: daysAgo(4),
    customerName: 'Vikas Shekhawat',
    type: 'Deposit',
    amount: 22000,
    fee: 0,
    commission: 44.0,
    status: 'Success',
    operatorId: 'op-3',
    operatorName: 'Priyanka Sharma',
    bankName: 'HDFC Bank',
    utrNumber: '325012890100',
    walletDebited: true
  },
  {
    id: 'TXN100181',
    timestamp: daysAgo(4),
    customerName: 'Bhagwan Das',
    type: 'Withdrawal',
    amount: 4000,
    fee: 0,
    commission: 20.0,
    status: 'Success',
    operatorId: 'op-2',
    operatorName: 'Suresh Kumar',
    bankName: 'Canara Bank',
    utrNumber: '325012890123',
    walletDebited: true
  },

  // Historical (5 days ago)
  {
    id: 'TXN100170',
    timestamp: daysAgo(5),
    customerName: 'Hanuman Sahay',
    type: 'DMT',
    amount: 5000,
    fee: 25,
    commission: 12.5,
    status: 'Success',
    operatorId: 'op-1',
    operatorName: 'Rajendra Prasad',
    beneficiaryName: 'Kailash Devi',
    beneficiaryAccount: '30245671298',
    beneficiaryIFSC: 'SBIN0003012',
    bankName: 'State Bank of India',
    utrNumber: '324912890900',
    walletDebited: true
  },
  {
    id: 'TXN100171',
    timestamp: daysAgo(5),
    customerName: 'Radha Mohan',
    type: 'Deposit',
    amount: 9000,
    fee: 0,
    commission: 18.0,
    status: 'Success',
    operatorId: 'op-2',
    operatorName: 'Suresh Kumar',
    bankName: 'Bank of Baroda',
    utrNumber: '324912890988',
    walletDebited: true
  },

  // Historical (6 days ago)
  {
    id: 'TXN100160',
    timestamp: daysAgo(6),
    customerName: 'Satish Yadav',
    type: 'Withdrawal',
    amount: 8000,
    fee: 0,
    commission: 40.0,
    status: 'Success',
    operatorId: 'op-3',
    operatorName: 'Priyanka Sharma',
    bankName: 'State Bank of India',
    utrNumber: '324812890512',
    walletDebited: true
  },
  {
    id: 'TXN100161',
    timestamp: daysAgo(6),
    customerName: 'Pappu Lal Sharma',
    type: 'Deposit',
    amount: 14000,
    fee: 0,
    commission: 28.0,
    status: 'Success',
    operatorId: 'op-1',
    operatorName: 'Rajendra Prasad',
    bankName: 'Central Bank of India',
    utrNumber: '324812890522',
    walletDebited: true
  }
];

const INITIAL_EMITRA_APPLICATIONS: EmitraApplication[] = [
  {
    id: 'EMI-70132',
    applicantName: 'Ramesh Singh',
    applicantPhone: '9828456123',
    serviceType: 'Jan Aadhaar Services',
    appliedDate: daysAgo(4),
    feeCharged: 120,
    commissionEarned: 45,
    status: 'Completed',
    tokenNumber: 'TOKEN45129841',
    dueAmount: 0,
    operatorId: 'op-2',
    notes: 'Aadhaar details locked, transfer successful.',
    documentsSubmitted: ['Aadhaar Card', 'Jan Aadhaar copy']
  },
  {
    id: 'EMI-70133',
    applicantName: 'Meena Devi',
    applicantPhone: '9414567234',
    serviceType: 'Caste Certificate',
    appliedDate: daysAgo(3),
    feeCharged: 80,
    commissionEarned: 35,
    status: 'In Process',
    tokenNumber: 'TOKEN45129899',
    dueAmount: 0,
    operatorId: 'op-3',
    notes: 'Sent to Tehsildar verification step',
    documentsSubmitted: ['Land Revenue Report', 'Self Declaration', 'School certificate']
  },
  {
    id: 'EMI-70134',
    applicantName: 'Kailash Soni',
    applicantPhone: '9166045612',
    serviceType: 'PAN Card Services',
    appliedDate: daysAgo(2),
    feeCharged: 150,
    commissionEarned: 50,
    status: 'Submitted',
    tokenNumber: 'TOKEN45129910',
    dueAmount: 50,
    operatorId: 'op-2',
    notes: 'Online application submitted, physical documents to be post-couriered',
    documentsSubmitted: ['Aadhaar Card', 'Photo', 'Physical PAN Form']
  },
  {
    id: 'EMI-70135',
    applicantName: 'Sunita Sharma',
    applicantPhone: '8005678912',
    serviceType: 'Income Certificate',
    appliedDate: daysAgo(1),
    feeCharged: 100,
    commissionEarned: 40,
    status: 'Pending',
    tokenNumber: 'TOKEN45129988',
    dueAmount: 100,
    operatorId: 'op-2',
    notes: 'Self-declaration seal pending from gazetted officer',
    documentsSubmitted: ['Form I, II', 'Aadhaar']
  },
  {
    id: 'EMI-70136',
    applicantName: 'Narendra Gujar',
    applicantPhone: '7829104561',
    serviceType: 'Residence Certificate',
    appliedDate: daysAgo(5),
    feeCharged: 80,
    commissionEarned: 35,
    status: 'Completed',
    tokenNumber: 'TOKEN45128005',
    dueAmount: 0,
    operatorId: 'op-3',
    notes: 'Certificate generated, digitally signed.',
    documentsSubmitted: ['Ration Card', 'Voter List Copy', 'Sarpanch Certificate']
  },
  {
    id: 'EMI-70137',
    applicantName: 'Baldev Singh',
    applicantPhone: '9512345678',
    serviceType: 'Ayushman Card',
    appliedDate: hoursAgo(4),
    feeCharged: 50,
    commissionEarned: 20,
    status: 'Completed',
    tokenNumber: 'TOKEN45129031',
    dueAmount: 0,
    operatorId: 'op-3',
    documentsSubmitted: ['Jan Aadhaar Card', 'Aadhaar Card']
  },
  {
    id: 'EMI-70138',
    applicantName: 'Lal Chand Koli',
    applicantPhone: '9414002345',
    serviceType: 'Utility Bill Services',
    appliedDate: hoursAgo(2),
    feeCharged: 2150, // Electric Bill
    commissionEarned: 15,
    status: 'Completed',
    tokenNumber: 'TOKEN45129045',
    dueAmount: 0,
    operatorId: 'op-1',
    documentsSubmitted: ['JVVNL Bill Copy']
  }
];

const INITIAL_OFFLINE_WORK: OfflineWorkItem[] = [
  {
    id: 'OFF-101',
    receivedDate: daysAgo(4),
    customerName: 'Meena Devi',
    phoneNumber: '9414567234',
    workDescription: 'Caste certificate application physical registry, Gram Sevak sign coordinates.',
    documentsReceived: ['Affidavit', 'School TC', 'Panchayat report'],
    pendingSteps: ['Gram Sevak Signature', 'Patwari Land Verification Document'],
    status: 'Processing',
    dueAmount: 500,
    operatorId: 'op-2',
    followUpDate: daysAgo(-1).split('T')[0]
  },
  {
    id: 'OFF-102',
    receivedDate: daysAgo(2),
    customerName: 'Ramesh Singh',
    phoneNumber: '9828456123',
    workDescription: 'Ayushman Card physical document checklist matching & card printing task.',
    documentsReceived: ['Aadhaar OTP state copy', 'Jan Aadhaar copy'],
    pendingSteps: ['Card PVC Printing'],
    status: 'Ready for Delivery',
    dueAmount: 100,
    operatorId: 'op-3'
  },
  {
    id: 'OFF-103',
    receivedDate: daysAgo(5),
    customerName: 'Govind Ram Jat',
    phoneNumber: '9929876543',
    workDescription: 'Death Certificate Offline correction register submission in Tehsil.',
    documentsReceived: ['Death Report', 'Panchayat Verification', 'Old Identity Proof'],
    pendingSteps: ['Submit correction letter to Registrar office'],
    status: 'Checking',
    dueAmount: 1500,
    operatorId: 'op-1',
    followUpDate: daysAgo(-3).split('T')[0]
  },
  {
    id: 'OFF-104',
    receivedDate: daysAgo(8),
    customerName: 'Rajesh Gurjar',
    phoneNumber: '9876543210',
    workDescription: 'NOC certificate for tubewell connection in agricultural land.',
    documentsReceived: ['Jamabandi Fard Copy', 'Aadhaar Card', 'Map Layout'],
    pendingSteps: [],
    status: 'Delivered',
    dueAmount: 0,
    deliveryDate: daysAgo(1),
    operatorId: 'op-1'
  }
];

const INITIAL_SECURITY_LOGS: SecurityLog[] = [
  {
    id: 'log-101',
    timestamp: hoursAgo(0, 10),
    operatorId: 'op-1',
    operatorName: 'Rajendra Prasad',
    role: 'Admin',
    action: 'OTP Login Verification',
    status: 'Success',
    ipAddress: '47.11.134.19',
    device: 'Lenovo ThinkPad T480',
    browser: 'Chrome 125.0'
  },
  {
    id: 'log-102',
    timestamp: hoursAgo(0, 48),
    operatorId: 'op-3',
    operatorName: 'Priyanka Sharma',
    role: 'Operator',
    action: 'Wallet Debit (DMT Release)',
    status: 'Success',
    ipAddress: '47.11.129.215',
    device: 'HP ProBook G8',
    browser: 'Chrome 125.0'
  },
  {
    id: 'log-103',
    timestamp: hoursAgo(1, 40),
    operatorId: 'op-2',
    operatorName: 'Suresh Kumar',
    role: 'Operator',
    action: 'Document Upload (Customer Verification)',
    status: 'Success',
    ipAddress: '47.11.144.108',
    device: 'Dell Latitude 3520',
    browser: 'Edge 124.0'
  },
  {
    id: 'log-104',
    timestamp: hoursAgo(3, 10),
    operatorId: 'op-2',
    operatorName: 'Suresh Kumar',
    role: 'Operator',
    action: 'Failed Login Attempt (Wrong Password)',
    status: 'Failed',
    ipAddress: '47.11.144.108',
    device: 'Dell Latitude 3520',
    browser: 'Firefox 126.0'
  }
];

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'EXP-401',
    description: 'Shop Rent June 2026',
    category: 'Shop Rent',
    amount: 3500,
    timestamp: daysAgo(5),
    paymentMode: 'Cash (CSP Limit)',
    addedBy: 'Rajendra Prasad',
    notes: 'Paid to shop owner Mr. Saini'
  },
  {
    id: 'EXP-402',
    description: 'Airtel Fiber Broadband Wifi',
    category: 'Internet & Wifi',
    amount: 699,
    timestamp: daysAgo(4),
    paymentMode: 'UPI/Bank',
    addedBy: 'Suresh Kumar',
    notes: 'Recharged online, 100Mbps unlimited'
  },
  {
    id: 'EXP-403',
    description: 'A4 Printing Paper Reams (2x)',
    category: 'Printing & Ink',
    amount: 450,
    timestamp: daysAgo(3),
    paymentMode: 'Cash (CSP Limit)',
    addedBy: 'Priyanka Sharma',
    notes: 'Bought from Royal Stationery, 500 sheets each'
  },
  {
    id: 'EXP-404',
    description: 'Epson L3210 Ink Refill (BK/C/M/Y)',
    category: 'Printing & Ink',
    amount: 750,
    timestamp: daysAgo(2),
    paymentMode: 'UPI/Bank',
    addedBy: 'Rajendra Prasad',
    notes: '1 set of original pigment inks'
  },
  {
    id: 'EXP-405',
    description: 'Samosa & Tea for Gram Sevak Meeting',
    category: 'Tea & Refreshments',
    amount: 220,
    timestamp: daysAgo(1),
    paymentMode: 'Personal Cash',
    addedBy: 'Suresh Kumar',
    notes: 'Hosted Gram Sevak for caste certificate verification alignment'
  }
];

const INITIAL_WALLET: AppState['wallet'] = {
  balance: 184500,
  withdrawnCommission: 5600,
  totalCommissionEarned: 12450,
  lastUpdated: new Date().toISOString()
};

const INITIAL_AEPS_WALLET: AppState['aepsWallet'] = {
  onlineBalance: 125000,
  physicalBalance: 59500,
  lastUpdated: new Date().toISOString()
};

const INITIAL_EMITRA_WALLET: AppState['emitraWallet'] = {
  balance: 25000,
  lastUpdated: new Date().toISOString()
};

const INITIAL_COMMISSION_SETTINGS: AppState['commissionSettings'] = {
  depositRate: 0.2, // 0.2%
  withdrawalRate: 0.5, // 0.5%
  transferRate: 15.0, // Fixed Rs 15 per transaction
  dmtRate: 0.75, // 0.75%
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
    'Other Offline Service (अन्य ऑफ़लाइन कार्य)': 40
  },
  offlineCosts: {
    'Photocopy (फोटोकॉपी)': 1,
    'Lamination (लेमिनेशन)': 5,
    'Aadhaar Print (आधार प्रिंट)': 10,
    'Form Filling (फॉर्म भरना)': 0,
    'File Print (फाइल प्रिंट)': 2,
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
  // Try loading from localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('smartspe_app_state');
    if (saved) {
      try {
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
          }
          if (!parsed.commissionSettings.offlineCosts) {
            parsed.commissionSettings.offlineCosts = { ...INITIAL_COMMISSION_SETTINGS.offlineCosts };
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
        return parsed;
      } catch (e) {
        console.error('Error parsing saved state, using default schema:', e);
      }
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
    localStorage.setItem('smartspe_app_state', JSON.stringify(state));
  }
};
