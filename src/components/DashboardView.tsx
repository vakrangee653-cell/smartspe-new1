/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRightLeft, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  FileCheck,
  ClipboardList,
  Hourglass,
  IndianRupee,
  Share2,
  Lock,
  Plus,
  Fingerprint,
  Wallet
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { AppState, Transaction, EmitraApplication, OfflineWorkItem } from '../types';
import { formatINR, formatDateNice } from '../utils';

interface DashboardViewProps {
  state: AppState;
  darkMode: boolean;
  onNavigateTab: (tabId: string) => void;
  onTriggerAction: (actionType: string) => void;
}

export default function DashboardView({
  state,
  darkMode,
  onNavigateTab,
  onTriggerAction
}: DashboardViewProps) {
  const currUser = state.currentUser;

  // RBAC Filter Rules: Display only allowed data based on the logged-in user role hierarchy
  const transactions = React.useMemo(() => {
    if (!currUser) return state.transactions;
    if (currUser.role === 'Super Admin') return state.transactions;
    if (currUser.role === 'Admin') {
      const myOpIds = state.operators.filter(op => op.createdBy === currUser.id || op.id === currUser.id).map(op => op.id);
      return state.transactions.filter(t => t.createdBy === currUser.id || t.operatorId === currUser.id || myOpIds.includes(t.operatorId));
    }
    return state.transactions.filter(t => t.operatorId === currUser.id);
  }, [state.transactions, state.operators, currUser]);

  const emitraApplications = React.useMemo(() => {
    if (!currUser) return state.emitraApplications;
    if (currUser.role === 'Super Admin') return state.emitraApplications;
    if (currUser.role === 'Admin') {
      const myOpIds = state.operators.filter(op => op.createdBy === currUser.id || op.id === currUser.id).map(op => op.id);
      return state.emitraApplications.filter(a => a.createdBy === currUser.id || a.operatorId === currUser.id || myOpIds.includes(a.operatorId));
    }
    return state.emitraApplications.filter(a => a.operatorId === currUser.id);
  }, [state.emitraApplications, state.operators, currUser]);

  const offlineWork = React.useMemo(() => {
    if (!currUser) return state.offlineWork;
    if (currUser.role === 'Super Admin') return state.offlineWork;
    if (currUser.role === 'Admin') {
      const myOpIds = state.operators.filter(op => op.createdBy === currUser.id || op.id === currUser.id).map(op => op.id);
      return state.offlineWork.filter(w => w.createdBy === currUser.id || w.operatorId === currUser.id || myOpIds.includes(w.operatorId));
    }
    return state.offlineWork.filter(w => w.operatorId === currUser.id);
  }, [state.offlineWork, state.operators, currUser]);

  const customers = React.useMemo(() => {
    if (!currUser) return state.customers;
    if (currUser.role === 'Super Admin') return state.customers;
    const branchAdminId = currUser.role === 'Admin' 
      ? currUser.id 
      : (state.operators.find(o => o.id === currUser.id)?.createdBy || 'op-1');
    return state.customers.filter(c => !c.createdBy || c.createdBy === branchAdminId);
  }, [state.customers, state.operators, currUser]);

  const { wallet } = state;

  // 1. Calculate stats (Today is June 21, 2026 as per local time metadata)
  const todayStr = '2026-06-21';
  
  // Filter for today
  const todayTxns = transactions.filter(t => t.timestamp?.startsWith(todayStr));
  const successTodayTxns = todayTxns.filter(t => t.status === 'Success');
  const failedTodayTxns = todayTxns.filter(t => t.status === 'Failed');
  const pendingTodayTxns = todayTxns.filter(t => t.status === 'Pending');

  // Sum today's cash flow
  const todayTxnVolume = successTodayTxns.reduce((sum, t) => sum + t.amount, 0);
  
  // Commission calculation
  const todayCommission = successTodayTxns.reduce((sum, t) => sum + t.commission, 0);
  const todayEmitraComm = emitraApplications.filter(a => a.appliedDate?.startsWith(todayStr)).reduce((sum, a) => sum + a.commissionEarned, 0);
  const todayOfflineComm = offlineWork.filter(w => w.receivedDate?.startsWith(todayStr)).reduce((sum, w) => sum + (w.commissionEarned || 0), 0);
  const totalTodayCommission = todayCommission + todayEmitraComm + todayOfflineComm;
  
  // eMitra applications summary
  const pendingEmitraCount = emitraApplications.filter(app => app.status === 'Pending' || app.status === 'In Process').length;
  
  // Offline work summaries
  const pendingOfflineWork = offlineWork.filter(w => w.status !== 'Delivered').length;
  const dueCollectorSum = customers.reduce((sum, c) => sum + c.dueAmount, 0) + 
                          emitraApplications.reduce((sum, a) => sum + a.dueAmount, 0) + 
                          offlineWork.reduce((sum, o) => sum + o.dueAmount, 0);

  // 2. Charting setup - last 7 days of performance (aggregation)
  const getLast7DaysData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const compareStr = d.toISOString().split('T')[0];
      
      const dayTxns = transactions.filter(t => t.timestamp?.startsWith(compareStr) && t.status === 'Success');
      const volume = dayTxns.reduce((sum, t) => sum + t.amount, 0);
      const comm = dayTxns.reduce((sum, t) => sum + t.commission, 0);

      const dayEmitras = emitraApplications.filter(a => a.appliedDate?.startsWith(compareStr));
      const emitraComm = dayEmitras.reduce((sum, a) => sum + a.commissionEarned, 0);
      
      days.push({
        name: label,
        'Volume (k)': Math.round(volume / 1000),
        'Commission (₹)': Math.round(comm + emitraComm),
      });
    }
    return days;
  };

  const chartData = getLast7DaysData();

  // 3. Service performance (eMitra categories count)
  const getServicePerformance = () => {
    const counts: Record<string, { count: number; commission: number }> = {};
    emitraApplications.forEach(app => {
      if (!counts[app.serviceType]) {
        counts[app.serviceType] = { count: 0, commission: 0 };
      }
      counts[app.serviceType].count += 1;
      counts[app.serviceType].commission += app.commissionEarned;
    });

    return Object.entries(counts).map(([name, data]) => ({
      name,
      count: data.count,
      commission: data.commission
    })).sort((a, b) => b.commission - a.commission);
  };

  const servicePerformance = getServicePerformance();

  // Color mappings
  const COLORS = ['#1D4ED8', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Prime Header Dashboard Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider font-semibold text-blue-600 dark:text-blue-400">
            Enterprise CSP Portal
          </span>
          <h1 className="text-3xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Operational Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time monitoring of cashflows, eMitra files, and customer balances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl text-center text-xs font-mono border ${
            darkMode ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-white text-slate-600 border-slate-200'
          }`}>
            <span className="opacity-60 block">Last Sync Time</span>
            <span className="font-bold flex items-center gap-1.5 justify-center text-emerald-500 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Connected (UTC)
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Micro stats (Bento style) - Compact size as requested */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Stat 1: CSP Cash Limit */}
        <div className={`p-3.5 rounded-2xl shadow-xs border transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 text-white border-slate-800/80' : 'bg-white text-slate-900 border-slate-200/80'
        }`}>
          <div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Wallet size={18} />
              </div>
              <span className="text-[9px] font-bold font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                Active
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                CSP Cash Limit
              </p>
              <h3 className="text-lg md:text-xl font-bold font-display tracking-tight mt-0.5 text-emerald-600 dark:text-emerald-400">
                {formatINR(wallet.balance)}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>Branch Capital Balance</span>
          </div>
        </div>

        {/* Stat 1.5: Commission Wallet */}
        <div className={`p-3.5 rounded-2xl shadow-xs border transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 text-white border-slate-800/80' : 'bg-white text-slate-900 border-slate-200/80'
        }`}>
          <div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <TrendingUp size={18} />
              </div>
              <span className="text-[9px] font-bold font-mono text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">
                Real-time
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Commission Wallet
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Total:</span>
                  <span className="text-sm font-extrabold font-mono text-indigo-650 dark:text-indigo-400">
                    {formatINR(wallet.totalCommissionEarned)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Today:</span>
                  <span className="text-xs font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    +{formatINR(totalTodayCommission)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>Total & Daily Commission</span>
          </div>
        </div>

        {/* Stat 2: Today Transactions Volume */}
        <div className={`p-3.5 rounded-2xl shadow-xs border transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 text-white border-slate-800/80' : 'bg-white text-slate-900 border-slate-200/80'
        }`}>
          <div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <IndianRupee size={18} />
              </div>
              <span className="text-[9px] font-bold font-mono text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                +14% ↑
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Today's Txn Volume
              </p>
              <h3 className="text-lg md:text-xl font-bold font-display tracking-tight mt-0.5 text-blue-600 dark:text-blue-450">
                {formatINR(todayTxnVolume)}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>Succ: {successTodayTxns.length} | Fail: {failedTodayTxns.length}</span>
          </div>
        </div>

        {/* Stat 3: Total Commission Income */}
        <div className={`p-3.5 rounded-2xl shadow-xs border transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 text-white border-slate-800/80' : 'bg-white text-slate-900 border-slate-200/80'
        }`}>
          <div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                <TrendingUp size={18} />
              </div>
              <span className="text-[9px] font-bold font-mono text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded-md">
                Real-time
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Today's Extra Income
              </p>
              <h3 className="text-lg md:text-xl font-bold font-display tracking-tight mt-0.5 text-purple-600 dark:text-purple-450">
                {formatINR(todayCommission)}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>Avg yield ~0.42%</span>
          </div>
        </div>

        {/* Stat 4: Total Due Amount Summary */}
        <div className={`p-3.5 rounded-2xl shadow-xs border transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 text-white border-slate-800/80' : 'bg-white text-slate-900 border-slate-200/80'
        }`}>
          <div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <AlertCircle size={18} />
              </div>
              <button 
                onClick={() => onNavigateTab('reports')}
                className="text-amber-500 text-[10px] font-bold hover:underline cursor-pointer">
                Collect →
              </button>
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Customer Due Balances
              </p>
              <h3 className="text-lg md:text-xl font-bold font-display tracking-tight mt-0.5 text-amber-500">
                {formatINR(dueCollectorSum)}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>Total: {customers.filter(c => c.dueAmount > 0).length + emitraApplications.filter(a => a.dueAmount > 0).length} accounts</span>
          </div>
        </div>

        {/* Stat 5: Pending Work Summary */}
        <div className={`p-3.5 rounded-2xl shadow-xs border transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 text-white border-slate-800/80' : 'bg-white text-slate-900 border-slate-200/80'
        }`}>
          <div>
            <div className="flex items-start justify-between">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <ClipboardList size={18} />
              </div>
              <span className="text-[9px] font-bold font-mono text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                Active
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pending Work Summary
              </p>
              <h3 className="text-lg md:text-xl font-bold font-display tracking-tight mt-0.5 text-indigo-500">
                {pendingEmitraCount + pendingOfflineWork} <span className="text-xs font-normal text-slate-400">files</span>
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>eMitra: {pendingEmitraCount} | Offline: {pendingOfflineWork}</span>
          </div>
        </div>
      </div>

      {/* Quick Action Triggers Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
          Quick Action Services
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Quick Action: eMitra Portal */}
          <button 
            onClick={() => onTriggerAction('emitra_apply')}
            className={`p-5 rounded-2xl text-left border font-medium group transition-all duration-200 flex items-center gap-4 hover:shadow-md cursor-pointer
            ${darkMode 
              ? 'bg-slate-900/60 text-slate-100 border-slate-800 hover:bg-slate-800 hover:border-purple-500' 
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-purple-600'}`}>
            <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 transition-transform group-hover:scale-110 shrink-0">
              <FileCheck size={24} />
            </div>
            <div>
              <span className="text-sm font-bold block">eMitra Portal</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">Apply New citizen forms & certificate logs</span>
            </div>
          </button>

          {/* Quick Action: aePS Banking */}
          <button 
            onClick={() => onTriggerAction('cash_withdrawal')}
            className={`p-5 rounded-2xl text-left border font-medium group transition-all duration-200 flex items-center gap-4 hover:shadow-md cursor-pointer
            ${darkMode 
              ? 'bg-slate-900/60 text-slate-100 border-slate-800 hover:bg-slate-800 hover:border-blue-500' 
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-blue-600'}`}>
            <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-110 shrink-0">
              <Fingerprint size={24} />
            </div>
            <div>
              <span className="text-sm font-bold block">aePS Cash Banking</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">Instant cash withdrawal & deposit</span>
            </div>
          </button>
          
          {/* Quick Action: Offline Register */}
          <button 
            onClick={() => onTriggerAction('offline_add')}
            className={`p-5 rounded-2xl text-left border font-medium group transition-all duration-200 flex items-center gap-4 hover:shadow-md cursor-pointer
            ${darkMode 
              ? 'bg-slate-900/60 text-slate-100 border-slate-800 hover:bg-slate-800 hover:border-rose-500' 
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-rose-600'}`}>
            <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-transform group-hover:scale-110 shrink-0">
              <ClipboardList size={24} />
            </div>
            <div>
              <span className="text-sm font-bold block">Offline Register</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">Log custom offline customer work forms</span>
            </div>
          </button>
        </div>
      </div>

      {/* Analytics Chart Block */}
      <div className="grid grid-cols-1 gap-6">
        {/* eMitra Service performance breakdown (BarChart or Pie list) */}
        <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <h3 className="font-bold text-lg font-display tracking-tight">Service-wise Commissions</h3>
            <p className="text-xs text-slate-400 mb-4">Highest yielding citizen certificate models</p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-56 pr-1 my-3">
            {servicePerformance.slice(0, 5).map((service, idx) => (
              <div key={service.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="truncate max-w-44 text-slate-700 dark:text-slate-300">{service.name}</span>
                  <span className="font-mono">{formatINR(service.commission)} ({service.count})</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, (service.commission / (servicePerformance[0]?.commission || 1)) * 100)}%`,
                      backgroundColor: COLORS[idx % COLORS.length] 
                    }}
                  />
                </div>
              </div>
            ))}
            {servicePerformance.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-8">No applications processed yet</p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">Main source profile</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">PAN & Caste Certificates</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions / Active Offline Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions List */}
        <div className={`p-5 rounded-3xl border shadow-xs ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg font-display tracking-tight">Recent Live Deposits / DMT</h3>
              <p className="text-xs text-slate-400">Last processed AEPS & money transfers</p>
            </div>
            <button 
              onClick={() => onNavigateTab('banking')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              View All →
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-80 pr-1">
            {transactions.slice(0, 5).map((txn) => (
              <div key={txn.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    txn.status === 'Success' 
                      ? 'bg-emerald-500/10 text-emerald-600' 
                      : txn.status === 'Failed' 
                        ? 'bg-rose-500/10 text-rose-600' 
                        : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    {txn.type === 'Withdrawal' ? (
                      <ArrowDownLeft size={16} />
                    ) : (
                      <ArrowUpRight size={16} />
                    )}
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200">{txn.customerName}</h5>
                    <p className="text-[10px] text-slate-400">
                      {txn.type} • {txn.bankName || 'Private Bank'} • <span className="font-mono uppercase">{txn.id}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-slate-900 dark:text-white font-mono">{formatINR(txn.amount)}</p>
                  <p className={`font-mono text-[10px] ${
                    txn.status === 'Success' 
                      ? 'text-emerald-500' 
                      : txn.status === 'Failed' 
                        ? 'text-rose-500' 
                        : 'text-amber-500'
                  }`}>
                    {txn.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Offline Work Delivery Tracker */}
        <div className={`p-5 rounded-3xl border shadow-xs ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg font-display tracking-tight">Offline Document Pipeline</h3>
              <p className="text-xs text-slate-400">Physical forms currently awaiting governmental processing</p>
            </div>
            <button 
              onClick={() => onNavigateTab('offline')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Full Register →
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-80 pr-1">
            {offlineWork.slice(0, 5).map((work) => (
              <div key={work.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <h5 className="font-semibold text-slate-800 dark:text-slate-200">
                    {work.customerName}
                    {work.serviceType && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-[8px] uppercase font-bold font-mono">
                        🔩 {work.serviceType.replace(/ \(.+\)/, '')}
                      </span>
                    )}
                  </h5>
                  <p className="text-slate-400 mt-0.5 line-clamp-1 max-w-sm">
                    {work.workDescription}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${
                      work.status === 'Delivered' 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : work.status === 'Ready for Delivery' 
                          ? 'bg-blue-500/10 text-blue-500' 
                          : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {work.status}
                    </span>
                    {work.dueAmount > 0 && (
                      <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded-xs">
                        Due: {formatINR(work.dueAmount)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block">Received:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{formatDateNice(work.receivedDate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
