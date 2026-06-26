/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  Wallet, 
  FileText, 
  ShieldCheck, 
  Settings, 
  ClipboardList, 
  Moon, 
  Sun, 
  Menu, 
  X,
  TrendingUp,
  Fingerprint,
  Receipt,
  User,
  LogOut
} from 'lucide-react';
import { UserRole, Operator } from '../types';
import { formatINR } from '../utils';
import SmartSpeLogo from './SmartSpeLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  currentUser: { id: string; name: string; role: UserRole; email: string } | null;
  walletBalance: number;
  totalCommission: number;
  todayCommission?: number;
  onLogout: () => void;
  selectedBranchId?: string;
  setSelectedBranchId?: (id: string) => void;
  operators?: Operator[];
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  currentUser,
  walletBalance,
  totalCommission,
  todayCommission,
  onLogout,
  selectedBranchId,
  setSelectedBranchId,
  operators
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Dynamic menu based on User Role permissions
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'banking', label: 'Banking Services', icon: Wallet },
    { id: 'emitra', label: 'eMitra Services', icon: Layers },
    { id: 'offline', label: 'Offline Work', icon: ClipboardList },
    { id: 'expenses', label: 'Expenses Tracker', icon: Receipt },
    { id: 'profile', label: 'User Profile (यूज़र प्रोफ़ाइल)', icon: User },
    { id: 'reports', label: 'Reports & Analytics', icon: FileText },
    ...(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin'
      ? [
          { id: 'security', label: 'Security Portal', icon: ShieldCheck }
        ]
      : []),
    ...(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin'
      ? [{ id: 'admin', label: 'Admin Settings', icon: Settings }] 
      : [])
  ];

  const handleNav = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const currentYear = new Date().getFullYear();

  // Role style configuration helper
  const getRoleBadgeClasses = (role?: UserRole) => {
    switch (role) {
      case 'Super Admin':
        return darkMode
          ? 'bg-amber-500/20 text-amber-350 border border-amber-500/30'
          : 'bg-amber-100 text-amber-900 border border-amber-200 font-bold';
      case 'Admin':
        return darkMode
          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
          : 'bg-blue-100 text-blue-900 border border-blue-200 font-bold';
      default:
        return darkMode
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          : 'bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold';
    }
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className={`md:hidden flex items-center justify-between px-4 py-3 border-b ${
        darkMode ? 'bg-slate-900/90 text-white border-slate-800' : 'bg-white/90 text-slate-900 border-slate-200'
      } backdrop-blur-md sticky top-0 z-40`}>
        <div className="flex items-center gap-2">
          <SmartSpeLogo size={32} showText={true} />
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-all ${
              darkMode ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`p-2 rounded-lg ${darkMode ? 'text-white hover:bg-slate-800' : 'text-slate-950 hover:bg-slate-100'}`}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Side Navigation Block - Styled with soft elegant Light Blue (Halka Blue) in Light mode, Slate-950 in Dark mode */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 h-full border-r transition-transform duration-300 transform 
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:sticky md:top-0 
        bg-[#E8F1FC] dark:bg-slate-950 text-slate-800 dark:text-white border-blue-200/60 dark:border-slate-850 shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="hidden md:flex items-center justify-between px-6 py-5 border-b border-blue-200/50 dark:border-slate-850 bg-[#E8F1FC] dark:bg-slate-950">
          <SmartSpeLogo size={42} showText={true} showTagline={true} />
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl transition-all bg-blue-600/10 dark:bg-white/5 text-amber-500 dark:text-amber-400 hover:bg-blue-600/20 dark:hover:bg-white/10"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Close Button Inside Drawer on Mobile */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-blue-200/50 dark:border-slate-850 bg-[#E8F1FC] dark:bg-slate-950">
          <span className="font-bold text-sm text-slate-900 dark:text-white">Menu Navigation</span>
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg bg-blue-600/10 dark:bg-white/5 text-slate-950 dark:text-white">
            <X size={20} />
          </button>
        </div>


        {/* Sidebar Main Navigation Lists */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pb-4 pt-4">
          {currentUser?.role === 'Super Admin' && setSelectedBranchId && operators && (
            <div className="mb-4 p-3 bg-blue-600/5 dark:bg-white/5 rounded-2xl border border-blue-500/10 dark:border-white/5 space-y-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono block">
                🏢 Selected Branch (शाखा चयन)
              </span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-xl border text-[11px] font-bold outline-hidden transition-all cursor-pointer ${
                  darkMode 
                    ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' 
                    : 'bg-white border-blue-200 text-slate-900 focus:border-blue-600'
                }`}
              >
                <option value="all">All Branches (कुल शाखाएँ)</option>
                <option value="op-super">Main Branch (मुख्य शाखा - Super Admin)</option>
                {operators
                  .filter(op => op.role === 'Admin')
                  .map(admin => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer outline-hidden tracking-wide group
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-blue-600/10 dark:hover:bg-white/5 hover:text-blue-950 dark:hover:text-white'
                  }`}
              >
                <Icon size={18} className={`shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:translate-x-0.5'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Block */}
        <div className="p-5 border-t border-blue-100 dark:border-slate-850 bg-[#DFEEFC] dark:bg-[#0B111E] space-y-3">
          <button 
            onClick={() => handleNav('profile')}
            className="w-full flex items-center gap-3 text-left hover:bg-blue-600/5 p-1 rounded-xl transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-display font-bold text-white shadow-md group-hover:scale-105 transition-transform">
              {currentUser?.name.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate leading-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {currentUser?.name || 'User'}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className={`px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase ${getRoleBadgeClasses(currentUser?.role)}`}>
                  {currentUser?.role || 'Guest'}
                </span>
                <span className="text-[9px] font-mono font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
                  ID: {currentUser?.id.toUpperCase()}
                </span>
              </div>
              {currentUser?.role === 'Operator' && (() => {
                const matchedOp = operators?.find(op => op.id === currentUser?.id);
                const creatorId = matchedOp?.createdBy;
                const creatorOp = creatorId ? operators?.find(o => o.id === creatorId) : null;
                return (
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-1.5 leading-none truncate border-t border-blue-200/40 dark:border-slate-800/40 pt-1">
                    प्रशासक (Admin): <span className="font-bold text-blue-600 dark:text-blue-450 block truncate mt-0.5">{creatorOp ? `${creatorOp.name} (${creatorOp.email})` : (creatorId === 'op-super' ? 'Super Admin (vakrangee653@gmail.com)' : 'Vakrangee')}</span>
                  </div>
                );
              })()}
            </div>
          </button>

          {/* Dual Wallet Display (CSP Cash Limit and Commission Wallet) */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2.5 border-t border-blue-200/50 dark:border-slate-800">
            <div className="p-2 rounded-xl bg-blue-600/5 dark:bg-slate-900 border border-blue-500/10 text-left flex flex-col justify-center">
              <span className="text-[8px] text-slate-500 dark:text-slate-400 block font-bold leading-tight uppercase tracking-wider mb-0.5">CSP Cash Limit</span>
              <span className="text-xs font-mono font-extrabold text-blue-600 dark:text-blue-400">{formatINR(walletBalance)}</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-600/5 dark:bg-slate-900 border border-emerald-500/10 text-left flex flex-col justify-center">
              <span className="text-[8px] text-slate-500 dark:text-slate-400 block font-bold leading-tight uppercase tracking-wider mb-0.5">Commission</span>
              <div className="text-[9px] leading-tight font-medium text-slate-550 dark:text-slate-400">
                <div>Total: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatINR(totalCommission)}</span></div>
                {todayCommission !== undefined && (
                  <div>Today: <span className="font-mono font-bold text-teal-600 dark:text-teal-400">+{formatINR(todayCommission)}</span></div>
                )}
              </div>
            </div>
          </div>

          {/* Real Logout Button */}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-600/10 dark:bg-rose-500/10 hover:bg-rose-600 dark:hover:bg-rose-500 text-rose-700 dark:text-rose-450 hover:text-white border border-rose-500/20 rounded-xl text-xs font-bold cursor-pointer transition-all duration-150"
          >
            <LogOut size={13} />
            <span>सुरक्षित लॉगआउट (Logout)</span>
          </button>

          <div className="text-center pt-1.5 border-t border-blue-200/50 dark:border-white/5">
            <p className="text-[9px] text-slate-600 dark:text-slate-500 font-bold font-mono tracking-wider">
              © {currentYear} SMARTSPE SECURE v2.5
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
