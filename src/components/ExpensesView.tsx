/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Receipt,
  Plus, 
  Search, 
  Trash2, 
  Filter, 
  Calendar, 
  Home, 
  Wifi, 
  Zap, 
  Printer, 
  Coffee, 
  UserCheck, 
  MoreHorizontal,
  X,
  TrendingDown,
  TrendingUp,
  Info,
  DollarSign
} from 'lucide-react';
import { AppState, Expense } from '../types';
import { formatINR, formatDateNice } from '../utils';

interface ExpensesViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  darkMode: boolean;
}

export default function ExpensesView({
  state,
  onUpdateState,
  darkMode
}: ExpensesViewProps) {
  const currUser = state.currentUser;

  // RBAC Filter Rules for Expenses
  const expenses = React.useMemo(() => {
    const rawExpenses = state.expenses || [];
    if (!currUser) return rawExpenses;
    if (currUser.role === 'Super Admin' || currUser.role === 'Admin') return rawExpenses;
    // Operator can only view expenses added by themselves
    return rawExpenses.filter(e => e.addedBy === currUser.name);
  }, [state.expenses, currUser]);

  const { wallet, emitraWallet, currentUser, commissionSettings } = state;

  const budgetLimit = commissionSettings?.expenseBudgetLimit || 10000;
  const isOperatorDisabled = !!commissionSettings?.disableOperatorExpenseLogging && 
    currentUser?.role !== 'Admin' && 
    currentUser?.role !== 'Super Admin';

  // Available Categories list dynamically fetched from Admin settings
  const categories: string[] = commissionSettings?.customExpenseCategories && commissionSettings.customExpenseCategories.length > 0
    ? commissionSettings.customExpenseCategories
    : [
        'Shop Rent',
        'Internet & Wifi',
        'Electricity',
        'Printing & Ink',
        'Tea & Refreshments',
        'Salary/Wages',
        'Other'
      ];

  // Available authorized staff list dynamically fetched from Admin settings
  const staffList: string[] = commissionSettings?.staffNames && commissionSettings.staffNames.length > 0
    ? commissionSettings.staffNames
    : [
        'Rajendra Prasad',
        'Suresh Kumar',
        'Priyanka Sharma',
        'Rahul Sen'
      ];

  // Form States
  const [isAdding, setIsAdding] = React.useState(false);
  const [entryType, setEntryType] = React.useState<'Expense' | 'Income'>('Expense');
  const [description, setDescription] = React.useState('');
  
  const incomeCategories = React.useMemo(() => [
    'Other Income (अन्य आय)',
    'Commission Adjustments (कमीशन समायोजन)',
    'Bonus / Reward (बोनस / इनाम)',
    'Advisory / Consulting (परामर्श सेवा)',
    'Interest / Dividend (ब्याज आय)',
    'Other (अन्य)'
  ], []);

  const currentCategories = entryType === 'Income' ? incomeCategories : categories;

  const [category, setCategory] = React.useState<string>(categories[0] || 'Printing & Ink');
  const [amount, setAmount] = React.useState('');
  const [paymentMode, setPaymentMode] = React.useState<Expense['paymentMode']>('Commission Wallet');
  const [notes, setNotes] = React.useState('');
  const [deductFromWallet, setDeductFromWallet] = React.useState(true);
  const [staffName, setStaffName] = React.useState<string>(currentUser?.name || staffList[0] || 'Rajendra Prasad');

  // Filter & Search States
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
  const [selectedPaymentMode, setSelectedPaymentMode] = React.useState<string>('All');
  const [selectedType, setSelectedType] = React.useState<'All' | 'Expense' | 'Income'>('All');

  // Reset category/paymentMode/deduct when switching entry type
  React.useEffect(() => {
    if (entryType === 'Income') {
      setCategory(incomeCategories[0]);
      setPaymentMode('Commission Wallet');
      setDeductFromWallet(false);
    } else {
      setCategory(categories[0] || 'Printing & Ink');
      setPaymentMode('Commission Wallet');
      setDeductFromWallet(true);
    }
  }, [entryType, categories, incomeCategories]);

  // Helper to fetch matching icons for category
  const getCategoryIcon = (cat: string, type?: 'Expense' | 'Income') => {
    if (type === 'Income' || cat.includes('Income') || cat.includes('आय') || cat.includes('Commission') || cat.includes('Bonus') || cat.includes('Reward')) {
      return <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={16} />;
    }
    switch (cat) {
      case 'Shop Rent':
        return <Home className="text-teal-600 dark:text-teal-400" size={16} />;
      case 'Internet & Wifi':
        return <Wifi className="text-indigo-600 dark:text-indigo-400" size={16} />;
      case 'Electricity':
        return <Zap className="text-amber-500 dark:text-amber-400" size={16} />;
      case 'Printing & Ink':
        return <Printer className="text-blue-600 dark:text-blue-400" size={16} />;
      case 'Tea & Refreshments':
        return <Coffee className="text-orange-600 dark:text-orange-400" size={16} />;
      case 'Salary/Wages':
        return <UserCheck className="text-rose-600 dark:text-rose-400" size={16} />;
      default:
        return <MoreHorizontal className="text-slate-500 dark:text-slate-400" size={16} />;
    }
  };

  // Filter process
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
    const matchesPayment = selectedPaymentMode === 'All' || exp.paymentMode === selectedPaymentMode;
    const matchesType = selectedType === 'All' || (exp.type || 'Expense') === selectedType;
    return matchesSearch && matchesCategory && matchesPayment && matchesType;
  });

  // Math Calculations
  const totalExpenseVal = expenses.filter(e => (e.type || 'Expense') === 'Expense').reduce((sum, item) => sum + item.amount, 0);
  const totalIncomeVal = expenses.filter(e => e.type === 'Income').reduce((sum, item) => sum + item.amount, 0);
  
  const filteredExpenseVal = filteredExpenses.filter(e => (e.type || 'Expense') === 'Expense').reduce((sum, item) => sum + item.amount, 0);
  const filteredIncomeVal = filteredExpenses.filter(e => e.type === 'Income').reduce((sum, item) => sum + item.amount, 0);

  const allCategories = React.useMemo(() => {
    const combined = [...categories, ...incomeCategories];
    return Array.from(new Set(combined));
  }, [categories, incomeCategories]);

  // Category summary math
  const categorySummary = allCategories.reduce((acc, cat) => {
    const sum = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
    acc[cat] = sum;
    return acc;
  }, {} as Record<string, number>);

  // Payment mode math
  const paymentModeSummary = ['Commission Wallet', 'Cash (CSP Limit)', 'SSO Wallet', 'UPI/Bank', 'Personal Cash'].reduce((acc, mode) => {
    const sum = expenses.filter(e => e.paymentMode === mode).reduce((s, e) => s + e.amount, 0);
    acc[mode] = sum;
    return acc;
  }, {} as Record<string, number>);

  // Handle addition
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOperatorDisabled) {
      alert("प्रशासक द्वारा ऑपरेटरों के लिए दुकान खर्च/आय रिकॉर्ड करना ब्लॉक किया गया है। (Operator entry logging is disabled by Administrator)");
      return;
    }
    const parsedAmount = Number(amount);
    if (!description.trim()) {
      alert("Please provide a valid description.");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please specify a valid positive amount.");
      return;
    }

    // Check balance if deduction is checked for Expense
    if (entryType === 'Expense' && deductFromWallet) {
      if (paymentMode === 'Commission Wallet' && wallet.totalCommissionEarned < parsedAmount) {
        alert(`Insufficient funds in Commission Wallet. Available: ${formatINR(wallet.totalCommissionEarned)}`);
        return;
      }
      if (paymentMode === 'Cash (CSP Limit)' && wallet.balance < parsedAmount) {
        alert(`Insufficient funds in CSP Cash Limit wallet. Available: ${formatINR(wallet.balance)}`);
        return;
      }
      if (paymentMode === 'SSO Wallet' && emitraWallet.balance < parsedAmount) {
        alert(`Insufficient funds in eMitra SSO Wallet. Available: ${formatINR(emitraWallet.balance)}`);
        return;
      }
    }

    // New Expense/Income object
    const newExpense: Expense = {
      id: `${entryType === 'Income' ? 'INC' : 'EXP'}-${Date.now().toString().slice(-6)}`,
      type: entryType,
      description,
      category,
      amount: parsedAmount,
      timestamp: new Date().toISOString(),
      paymentMode,
      addedBy: staffName,
      notes: notes.trim() ? notes : undefined
    };

    // Update balances
    let updatedWallet = { ...wallet };
    let updatedEmitraWallet = { ...emitraWallet };

    if (entryType === 'Income') {
      // Income increases commission balance
      updatedWallet.totalCommissionEarned += parsedAmount;
      updatedWallet.lastUpdated = new Date().toISOString();
    } else {
      // Expense reduces balances if deduct requested
      if (deductFromWallet) {
        if (paymentMode === 'Commission Wallet') {
          updatedWallet.totalCommissionEarned -= parsedAmount;
          updatedWallet.lastUpdated = new Date().toISOString();
        } else if (paymentMode === 'Cash (CSP Limit)') {
          updatedWallet.balance -= parsedAmount;
          updatedWallet.lastUpdated = new Date().toISOString();
        } else if (paymentMode === 'SSO Wallet') {
          updatedEmitraWallet.balance -= parsedAmount;
          updatedEmitraWallet.lastUpdated = new Date().toISOString();
        }
      }
    }

    // Build log statement
    const systemAction = `Recorded Shop ${entryType === 'Income' ? 'Income' : 'Expense'} [${category}]: ${description} (${formatINR(parsedAmount)}) via ${paymentMode}. ${
      entryType === 'Income' ? 'Commission Wallet credited.' : deductFromWallet ? 'Wallet balance deducted.' : 'Tracked offline.'
    }`;

    // Create State package
    const updatedState: AppState = {
      ...state,
      expenses: [newExpense, ...expenses],
      wallet: updatedWallet,
      emitraWallet: updatedEmitraWallet,
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: currentUser?.role || 'Admin',
          action: systemAction,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'Expenses Management',
          browser: 'SmartSPE Portal'
        },
        ...state.securityLogs
      ]
    };

    onUpdateState(updatedState);
    
    // Reset Form
    setDescription('');
    setCategory(entryType === 'Income' ? incomeCategories[0] : (categories[0] || 'Printing & Ink'));
    setAmount('');
    setNotes('');
    setDeductFromWallet(entryType === 'Expense');
    setIsAdding(false);

    alert(`Successfully recorded ${entryType === 'Income' ? 'income' : 'expense'} of ${formatINR(parsedAmount)}.`);
  };

  // Handle Deletion
  const handleDeleteExpense = (expenseId: string) => {
    if (isOperatorDisabled) {
      alert("प्रशासक द्वारा ऑपरेटरों के लिए प्रविष्टि को हटाना ब्लॉक किया गया है। (Operator entry deletion is disabled by Administrator)");
      return;
    }
    const targetExp = expenses.find(e => e.id === expenseId);
    if (!targetExp) return;

    if (!window.confirm(`क्या आप वाकई इस प्रविष्टि को हटाना चाहते हैं: "${targetExp.description}"? (Are you sure you want to delete this ${targetExp.type || 'Expense'} entry? Wallet & Commission adjustments will be automatically reverted!)`)) {
      return;
    }

    const updatedExpenses = expenses.filter(e => e.id !== expenseId);

    // Revert the balance changes!
    let updatedWallet = { ...wallet };
    let updatedEmitraWallet = { ...emitraWallet };

    if (targetExp.type === 'Income') {
      // Revert income (deduct from commission balance)
      updatedWallet.totalCommissionEarned -= targetExp.amount;
      updatedWallet.lastUpdated = new Date().toISOString();
    } else {
      // Revert expense (refund to respective wallet)
      if (targetExp.paymentMode === 'Commission Wallet') {
        updatedWallet.totalCommissionEarned += targetExp.amount;
        updatedWallet.lastUpdated = new Date().toISOString();
      } else if (targetExp.paymentMode === 'Cash (CSP Limit)') {
        updatedWallet.balance += targetExp.amount;
        updatedWallet.lastUpdated = new Date().toISOString();
      } else if (targetExp.paymentMode === 'SSO Wallet') {
        updatedEmitraWallet.balance += targetExp.amount;
        updatedEmitraWallet.lastUpdated = new Date().toISOString();
      }
    }

    const updatedState: AppState = {
      ...state,
      expenses: updatedExpenses,
      wallet: updatedWallet,
      emitraWallet: updatedEmitraWallet,
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: currentUser?.id || 'op-1',
          operatorName: currentUser?.name || 'Admin',
          role: currentUser?.role || 'Admin',
          action: `Deleted Shop ${targetExp.type || 'Expense'} entry: ${targetExp.description} (${formatINR(targetExp.amount)}). Automatically reverted wallet/commission balance.`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'Expenses Management',
          browser: 'SmartSPE Portal'
        },
        ...state.securityLogs
      ]
    };

    onUpdateState(updatedState);
    alert("Entry removed and balance reverted successfully.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Header with CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display text-slate-900 dark:text-white flex items-center gap-2">
            <span className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
              <Receipt size={24} />
            </span>
            Shop Expenses Tracker (दुकान खर्च रजिस्टर)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track internet, rent, electricity, papers, ink, tea, and auxiliary branch operational cash expenses easily.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg hover:shadow-xl ${
            isAdding 
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 shadow-none hover:bg-slate-300' 
              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10'
          }`}
        >
          {isAdding ? (
            <>
              <X size={15} /> Close Form
            </>
          ) : (
            <>
              <Plus size={15} /> Add Shop Expense (खर्च जोड़ें)
            </>
          )}
        </button>
      </div>

      {/* Operator restricted banner */}
      {isOperatorDisabled && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-450 rounded-2xl text-xs flex items-center gap-2">
          <Info size={15} />
          <span><b>ऑपरेटर रेस्ट्रिक्शन एक्टिव:</b> व्यवस्थापक ने ऑपरेटर स्तर पर नया खर्च जोड़ने या हटाने की अनुमति को ब्लॉक कर दिया है। केवल व्यवस्थापक ही नए खर्च जोड़ सकते हैं। (Expense logging is disabled for operators by admin)</span>
        </div>
      )}

      {/* Monthly Budget Usage Tracker */}
      <div className={`p-5 rounded-3xl border ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs mb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-150">
            <span className="p-1 bg-rose-500/10 text-rose-500 rounded-md"><Receipt size={12} /></span>
            मासिक दुकान खर्च बजट स्थिति (Monthly Shop operational Budget scale)
          </div>
          <div className="font-mono text-slate-500">
            मासिक लिमिट: <b className="text-slate-900 dark:text-white font-black">{formatINR(budgetLimit)}</b>
          </div>
        </div>
        <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden relative">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              totalExpenseVal > budgetLimit 
                ? 'bg-rose-600' 
                : totalExpenseVal > budgetLimit * 0.85 
                ? 'bg-amber-500' 
                : 'bg-indigo-600'
            }`}
            style={{ width: `${Math.min(100, (totalExpenseVal / budgetLimit) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-bold">
          <span className="text-rose-500">कुल खर्च: {formatINR(totalExpenseVal)}</span>
          <span className={totalExpenseVal > budgetLimit ? 'text-rose-600' : 'text-indigo-500'}>
            {((totalExpenseVal / budgetLimit) * 100).toFixed(1)}% बजट उपयोग
          </span>
          <span className="text-emerald-500">शेष बजट: {formatINR(Math.max(0, budgetLimit - totalExpenseVal))}</span>
        </div>
      </div>

      {/* Overview Stat Cards Group */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Other Income Logged */}
        <div className={`p-5 rounded-3xl border flex items-center justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Total Other Income</span>
            <span className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 block">
              {formatINR(totalIncomeVal)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {expenses.filter(e => e.type === 'Income').length} entries added
            </span>
          </div>
          <div className="p-4 bg-emerald-500/15 text-emerald-600 rounded-2xl">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Total Expenses Logged */}
        <div className={`p-5 rounded-3xl border flex items-center justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Total Expenses Logged</span>
            <span className="text-2xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400 mt-1 block">
              {formatINR(totalExpenseVal)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {expenses.filter(e => (e.type || 'Expense') === 'Expense').length} entries recorded
            </span>
          </div>
          <div className="p-4 bg-rose-500/15 text-rose-600 rounded-2xl">
            <TrendingDown size={24} />
          </div>
        </div>

        {/* Commission Wallet */}
        <div className={`p-5 rounded-3xl border flex items-center justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Commission Wallet</span>
            <span className="text-2xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400 mt-1 block">
              {formatINR(wallet.totalCommissionEarned)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Adjusts on shop expenses/income</span>
          </div>
          <div className="p-4 bg-indigo-500/15 text-indigo-600 rounded-2xl">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Current CSP cash limits */}
        <div className={`p-5 rounded-3xl border flex items-center justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Available CSP Cash limit</span>
            <span className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 block">
              {formatINR(wallet.balance)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Used for cash operational limits</span>
          </div>
          <div className="p-4 bg-emerald-500/15 text-emerald-600 rounded-2xl">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Current eMitra limits */}
        <div className={`p-5 rounded-3xl border flex items-center justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div>
            <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Active eMitra Wallet</span>
            <span className="text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400 mt-1 block">
              {formatINR(emitraWallet.balance)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Used for SSO portal debits</span>
          </div>
          <div className="p-4 bg-amber-500/15 text-amber-600 rounded-2xl">
            <Receipt size={24} />
          </div>
        </div>
      </div>

      {/* Add Expense Form Container */}
      {isAdding && (
        <div className={`p-6 rounded-3xl border animate-fade-in ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white animate-scale-in' : 'bg-white border-slate-200 text-slate-900 animate-scale-in'
        }`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <h3 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className={`p-1 rounded-lg ${entryType === 'Income' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}>
                <Receipt size={14} />
              </span>
              {entryType === 'Income' ? 'Add New Other Income Entry (अन्य आय जोड़ें)' : 'Add New Shop Expense Entry (नया दुकान खर्च जोड़ें)'}
            </h3>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
              Operator: {currentUser?.name || "Admin"}
            </span>
          </div>

          <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Entry Type */}
            <div className="md:col-span-4 flex flex-col sm:flex-row sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Entry Type / प्रविष्टि प्रकार:</span>
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEntryType('Expense')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    entryType === 'Expense'
                      ? 'bg-rose-650 text-white shadow-md'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Shop Expense (दुकान खर्च)
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('Income')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    entryType === 'Income'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Other Income (अन्य आय)
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                {entryType === 'Income' ? 'Income Description / Purpose (आय का विवरण) *' : 'Expense Description / Purpose (खर्च का विवरण) *'}
              </label>
              <input
                type="text"
                required
                placeholder={entryType === 'Income' ? 'e.g. Commission bonus, old newspaper sale, scan services profit' : 'e.g. WiFi Fiber Broadband monthly recharge'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-xs border outline-hidden transition-all font-medium ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-rose-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-600'
                }`}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                Category (श्रेणी) *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden transition-all font-medium ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-rose-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-600'
                }`}
              >
                {currentCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                Amount (राशि ₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                placeholder="₹ Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-xs border font-mono font-bold outline-hidden transition-all ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-rose-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-600'
                }`}
              />
            </div>

            {/* Payment Mode */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                Payment Mode (भुगतान का प्रकार) *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => {
                  const val = e.target.value as Expense['paymentMode'];
                  setPaymentMode(val);
                  if (val === 'UPI/Bank' || val === 'Personal Cash') {
                    setDeductFromWallet(false);
                  }
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden transition-all font-medium ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-rose-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-600'
                }`}
              >
                {entryType === 'Expense' ? (
                  <>
                    <option value="Commission Wallet">Commission Wallet (कमीशन से काटें)</option>
                    <option value="Cash (CSP Limit)">Cash (CSP Limit)</option>
                    <option value="SSO Wallet">SSO Wallet</option>
                    <option value="UPI/Bank">UPI/Bank Transfer</option>
                    <option value="Personal Cash">Personal Cash (Offline)</option>
                  </>
                ) : (
                  <>
                    <option value="Commission Wallet">Commission Wallet (कमीशन में जोड़ें)</option>
                    <option value="Cash (CSP Limit)">Cash (CSP Limit)</option>
                    <option value="UPI/Bank">UPI/Bank Transfer</option>
                    <option value="Personal Cash">Personal Cash (Offline)</option>
                  </>
                )}
              </select>
            </div>

            {/* Notes / Remarks */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                Additional Notes / Remarks (विशेष विवरण)
              </label>
              <input
                type="text"
                placeholder="e.g. Invoice #251 attached / Monthly rent paid"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-xs border outline-hidden transition-all font-medium ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-rose-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-600'
                }`}
              />
            </div>

            {/* Spent By / Staff Member Names */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                {entryType === 'Income' ? 'Received By (स्टाफ का नाम) *' : 'Spent By / Staff member (स्टाफ का नाम) *'}
              </label>
              <select
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden transition-all font-medium ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-rose-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-600'
                }`}
              >
                {staffList.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Wallet Deduct Option */}
            <div className="md:col-span-1 flex items-center justify-start md:pt-6">
              {entryType === 'Income' ? (
                <div className="flex items-center gap-1.5 text-emerald-650 dark:text-emerald-400 text-xs py-1.5 px-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 font-semibold w-full">
                  <TrendingUp size={13} />
                  <span>Always credited to Commission Wallet.</span>
                </div>
              ) : (paymentMode === 'Commission Wallet' || paymentMode === 'Cash (CSP Limit)' || paymentMode === 'SSO Wallet') ? (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={deductFromWallet}
                    onChange={(e) => setDeductFromWallet(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Deduct directly from selected wallet limit
                  </span>
                </label>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400 text-xs py-1.5 px-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
                  <Info size={13} />
                  <span>No digital wallet linked for this mode.</span>
                </div>
              )}
            </div>

            {/* Actions Submit */}
            <div className="md:col-span-1 flex items-end md:pt-4">
              <button
                type="submit"
                className={`w-full py-2.5 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-lg ${
                  entryType === 'Income'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'
                }`}
              >
                Post {entryType === 'Income' ? 'Income' : 'Expense'} Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Analytics & breakdown side-by-side grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown list */}
        <div className={`p-6 rounded-3xl border ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <h3 className="font-bold text-xs font-display uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
            <TrendingUp size={13} /> Category Wise Spent & Income Ledger
          </h3>
          <div className="space-y-4">
            {allCategories.map(cat => {
              const spent = categorySummary[cat] || 0;
              if (spent === 0) return null;
              const isIncomeCategory = incomeCategories.includes(cat);
              const totalVal = isIncomeCategory ? totalIncomeVal : totalExpenseVal;
              const pct = totalVal > 0 ? (spent / totalVal) * 100 : 0;
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs tracking-tight">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                      {getCategoryIcon(cat, isIncomeCategory ? 'Income' : 'Expense')}
                      {cat}
                    </span>
                    <span className={`font-bold font-mono ${isIncomeCategory ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      {isIncomeCategory ? '+' : ''}{formatINR(spent)} <span className="text-[10px] text-slate-450 font-normal">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isIncomeCategory ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {expenses.length === 0 && (
              <p className="text-xs text-slate-400 italic">No category logs recorded yet.</p>
            )}
          </div>
        </div>

        {/* Payment mode Breakdown list */}
        <div className={`p-6 rounded-3xl border ${
          darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <h3 className="font-bold text-xs font-display uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
            <Receipt size={13} /> Payment Mode Allocation
          </h3>
          <div className="space-y-4">
            {['Commission Wallet', 'Cash (CSP Limit)', 'SSO Wallet', 'UPI/Bank', 'Personal Cash'].map(mode => {
              const spent = paymentModeSummary[mode] || 0;
              if (spent === 0) return null;
              const totalVal = totalExpenseVal + totalIncomeVal;
              const pct = totalVal > 0 ? (spent / totalVal) * 100 : 0;
              return (
                <div key={mode} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs tracking-tight">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {mode}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {formatINR(spent)} <span className="text-[10px] text-slate-450 font-normal">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {expenses.length === 0 && (
              <p className="text-xs text-slate-400 italic">No allocation logs recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Filters & Core Ledger Logs list panel */}
      <div className={`p-6 rounded-3xl border ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 className="font-bold text-xs font-display uppercase tracking-wider text-slate-400">
              Operational Ledger historical registry
            </h3>
            <p className="text-[10px] text-slate-400">Showing {filteredExpenses.length} matching entries</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Search description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-hidden transition-all ${
                  darkMode 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-rose-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-600'
                }`}
              />
            </div>

            {/* Entry Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className={`px-3 py-1.5 rounded-xl text-xs border outline-hidden transition-all ${
                darkMode 
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-rose-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-600'
              }`}
            >
              <option value="All">All Entry Types</option>
              <option value="Expense">Expenses Only</option>
              <option value="Income">Incomes Only</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs border outline-hidden transition-all ${
                darkMode 
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-rose-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-600'
              }`}
            >
              <option value="All">All Categories</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Payment Mode Filter */}
            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs border outline-hidden transition-all ${
                darkMode 
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-rose-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-600'
              }`}
            >
              <option value="All">All Payment Modes</option>
              <option value="Commission Wallet">Commission Wallet</option>
              <option value="Cash (CSP Limit)">Cash (CSP Limit)</option>
              <option value="SSO Wallet">SSO Wallet</option>
              <option value="UPI/Bank">UPI/Bank Transfer</option>
              <option value="Personal Cash">Personal Cash</option>
            </select>

            {/* Reset button */}
            {(searchQuery || selectedCategory !== 'All' || selectedPaymentMode !== 'All' || selectedType !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedPaymentMode('All');
                  setSelectedType('All');
                }}
                className="p-1 px-2 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg font-bold hover:bg-slate-250 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Expenses List Table */}
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <Receipt className="mx-auto opacity-30 animate-pulse" size={40} />
            <p className="text-sm font-semibold">No records found.</p>
            <p className="text-xs text-slate-400/80">Try resetting filters or registering a new entry above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredExpenses.map((exp) => {
                  const isIncome = exp.type === 'Income';
                  return (
                    <tr 
                      key={exp.id} 
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/45 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                        {exp.id}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{formatDateNice(exp.timestamp)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isIncome 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                          {isIncome ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {exp.description}
                          </span>
                          {exp.notes && (
                            <span className="text-[10px] text-slate-400 italic block mt-0.5">
                              Note: {exp.notes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                          {getCategoryIcon(exp.category, exp.type)}
                          <span>{exp.category}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          exp.paymentMode === 'Commission Wallet'
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                            : exp.paymentMode === 'Cash (CSP Limit)' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : exp.paymentMode === 'SSO Wallet'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : exp.paymentMode === 'UPI/Bank'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-slate-500/10 text-slate-650 dark:text-slate-350'
                        }`}>
                          {exp.paymentMode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {exp.addedBy}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-black ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isIncome ? '+' : '-'}{formatINR(exp.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Delete entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
