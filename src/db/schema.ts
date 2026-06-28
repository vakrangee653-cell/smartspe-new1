import { pgTable, text, doublePrecision, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

// 1. Users Table (Operators list, Administrators, etc.)
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull(),
  walletLimit: doublePrecision('wallet_limit').default(15000),
  commissionRate: doublePrecision('commission_rate').default(12),
  phoneNumber: text('phone_number'),
  mobile: text('mobile'),
  password: text('password'),
  failedAttempts: integer('failed_attempts').default(0),
  isLockedOut: boolean('is_locked_out').default(false),
  createdBy: text('created_by'),
  adminId: text('admin_id'),
  permissions: jsonb('permissions'),
  walletBalance: doublePrecision('wallet_balance').default(15000),
  photoUrl: text('photo_url'),
  address: text('address'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

// 2. Customers Table
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  aadhaarNumber: text('aadhaar_number'),
  panNumber: text('pan_number'),
  janAadhaarNumber: text('jan_aadhaar_number'),
  address: text('address').notNull(),
  dueAmount: doublePrecision('due_amount').default(0),
  documents: jsonb('documents').default([]),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  followUpDate: text('follow_up_date'),
  followUpNotes: text('follow_up_notes'),
  createdBy: text('created_by'),
});

// 3. Transactions Table
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  customerId: text('customer_id'),
  customerName: text('customer_name').notNull(),
  aadhaarNumber: text('aadhaar_number'),
  type: text('type').notNull(),
  amount: doublePrecision('amount').notNull(),
  fee: doublePrecision('fee').notNull(),
  char: doublePrecision('char'),
  commission: doublePrecision('commission').notNull(),
  status: text('status').notNull(),
  operatorId: text('operator_id').notNull(),
  operatorName: text('operator_name').notNull(),
  beneficiaryName: text('beneficiary_name'),
  beneficiaryAccount: text('beneficiary_account'),
  beneficiaryIFSC: text('beneficiary_ifsc'),
  bankName: text('bank_name'),
  utrNumber: text('utr_number').notNull(),
  walletDebited: boolean('wallet_debited').notNull(),
  createdBy: text('created_by'),
  adminId: text('admin_id'),
  openingBalance: doublePrecision('opening_balance'),
  closingBalance: doublePrecision('closing_balance'),
  date: text('date'),
  time: text('time'),
});

// 4. Wallets Table (Tracks specific wallet state limits)
export const wallets = pgTable('wallets', {
  userId: text('user_id').primaryKey(),
  userName: text('user_name').notNull(),
  role: text('role').notNull(),
  balance: doublePrecision('balance').notNull(),
  openingBalance: doublePrecision('opening_balance').default(0),
  currentBalance: doublePrecision('current_balance').default(0),
  credit: doublePrecision('credit').default(0),
  debit: doublePrecision('debit').default(0),
  closingBalance: doublePrecision('closing_balance').default(0),
  availableBalance: doublePrecision('available_balance').default(0),
  lastUpdated: text('last_updated'),
});

// 5. Wallet Ledger Table
export const walletLedger = pgTable('wallet_ledger', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  role: text('role').notNull(),
  transactionId: text('transaction_id').notNull(),
  service: text('service').notNull(),
  openingBalance: doublePrecision('opening_balance').notNull(),
  credit: doublePrecision('credit').notNull(),
  debit: doublePrecision('debit').notNull(),
  closingBalance: doublePrecision('closing_balance').notNull(),
  availableBalance: doublePrecision('available_balance').notNull(),
  status: text('status').notNull(),
  operatorId: text('operator_id').notNull(),
  adminId: text('admin_id').notNull(),
  timestamp: text('timestamp').notNull(),
});

// 6. eMitra Applications Table
export const emitraApplications = pgTable('emitra_applications', {
  id: text('id').primaryKey(),
  applicantName: text('applicant_name').notNull(),
  applicantPhone: text('applicant_phone').notNull(),
  serviceType: text('service_type').notNull(),
  appliedDate: text('applied_date').notNull(),
  feeCharged: doublePrecision('fee_charged').notNull(),
  commissionEarned: doublePrecision('commission_earned').notNull(),
  status: text('status').notNull(),
  tokenNumber: text('token_number').notNull(),
  dueAmount: doublePrecision('due_amount').notNull(),
  operatorId: text('operator_id').notNull(),
  notes: text('notes'),
  documentsSubmitted: jsonb('documents_submitted').default([]),
  paymentMode: text('payment_mode'),
  createdBy: text('created_by'),
});

// 7. Offline Work Items Table
export const offlineWorkItems = pgTable('offline_work_items', {
  id: text('id').primaryKey(),
  receivedDate: text('received_date').notNull(),
  customerName: text('customer_name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  workDescription: text('work_description').notNull(),
  documentsReceived: jsonb('documents_received').default([]),
  pendingSteps: jsonb('pending_steps').default([]),
  status: text('status').notNull(),
  dueAmount: doublePrecision('due_amount').notNull(),
  deliveryDate: text('delivery_date'),
  followUpDate: text('follow_up_date'),
  followUpNotes: text('follow_up_notes'),
  operatorId: text('operator_id').notNull(),
  serviceType: text('service_type'),
  totalCharged: doublePrecision('total_charged'),
  baseCost: doublePrecision('base_cost'),
  commissionEarned: doublePrecision('commission_earned'),
  amountCollected: doublePrecision('amount_collected'),
  paymentMode: text('payment_mode'),
  createdBy: text('created_by'),
});

// 8. Security Logs Table
export const securityLogs = pgTable('security_logs', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  operatorId: text('operator_id').notNull(),
  operatorName: text('operator_name').notNull(),
  role: text('role').notNull(),
  action: text('action').notNull(),
  status: text('status').notNull(),
  ipAddress: text('ip_address').notNull(),
  device: text('device').notNull(),
  browser: text('browser').notNull(),
  createdBy: text('created_by'),
});

// 9. Expenses Table
export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  type: text('type'),
  description: text('description').notNull(),
  category: text('category').notNull(),
  amount: doublePrecision('amount').notNull(),
  timestamp: text('timestamp').notNull(),
  paymentMode: text('payment_mode').notNull(),
  addedBy: text('added_by').notNull(),
  notes: text('notes'),
  createdBy: text('created_by'),
});

// 10. Notifications Table
export const notifications = pgTable('notifications', {
  notificationId: text('notification_id').primaryKey(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  channelsSent: jsonb('channels_sent'),
});

// 11. Settlements Table
export const settlements = pgTable('settlements', {
  id: text('id').primaryKey(),
  amount: doublePrecision('amount').notNull(),
  bankName: text('bank_name').notNull(),
  accountHolder: text('account_holder').notNull(),
  accountNumber: text('account_number').notNull(),
  ifscCode: text('ifsc_code').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull(),
  operatorId: text('operator_id').notNull(),
  operatorName: text('operator_name').notNull(),
  adminId: text('admin_id').notNull(),
  approvedBy: text('approved_by'),
  approvedByName: text('approved_by_name'),
  approvedAt: text('approved_at'),
  remarks: text('remarks'),
  createdAt: text('created_at').notNull(),
  timestamp: text('timestamp').notNull(),
});

// 12. Activity Timeline Table
export const activityTimeline = pgTable('activity_timeline', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  role: text('role').notNull(),
  actionType: text('action_type').notNull(),
  details: text('details').notNull(),
  status: text('status').notNull(),
  amount: doublePrecision('amount'),
  ipAddress: text('ip_address'),
});

// 13. Commission Rules Table
export const commissionRules = pgTable('commission_rules', {
  id: text('id').primaryKey(),
  service: text('service').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  targetName: text('target_name').notNull(),
  rateType: text('rate_type').notNull(),
  rateValue: doublePrecision('rate_value').notNull(),
  enabled: boolean('enabled').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  history: jsonb('history'),
});

// 14. Shop Settings Table
export const shopSettings = pgTable('shop_settings', {
  key: text('key').primaryKey(), // e.g. 'shopDetails', 'commissionSettings'
  value: jsonb('value').notNull(),
});

// 15. Backup / Overall States Table
export const appStates = pgTable('app_states', {
  userId: text('user_id').primaryKey(),
  state: jsonb('state').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
