/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  Settings, 
  Eye, 
  Lock, 
  Activity, 
  Monitor, 
  Cpu, 
  Globe, 
  Key, 
  Clock, 
  ShieldAlert,
  UserCheck,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { AppState, SecurityLog, UserRole } from '../types';
import { formatRelativeTime } from '../utils';

interface SecurityViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  darkMode: boolean;
  onLockSession: () => void;
}

export default function SecurityView({
  state,
  onUpdateState,
  darkMode,
  onLockSession
}: SecurityViewProps) {
  const { securityLogs, currentUser } = state;

  // RBAC Access Restriction: Operator is NOT permitted to load the Security logs
  if (currentUser?.role === 'Operator') {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-rose-500/10 border border-rose-500/20 rounded-3xl mt-12 space-y-4">
        <ShieldAlert size={48} className="mx-auto text-rose-500 animate-bounce" />
        <h2 className="text-xl font-bold text-rose-500">पहुंच अस्वीकृत! (Access Denied!)</h2>
        <p className="text-xs text-slate-400">
          ऑपरेटर रोल के लिए सुरक्षा सेटिंग्स और ऑडिट लॉग्स तक पहुंच वर्जित है। कृपया उच्चस्तरीय एडमिन आईडी से लॉगिन करें। (Operator roles are strictly forbidden from viewing cryptocurrency audits or security portal endpoints).
        </p>
      </div>
    );
  }

  // RBAC Filter Rules: Admin cannot view Super Admin security telemetry
  const filteredLogs = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'Super Admin') return securityLogs;
    return securityLogs.filter(log => log.operatorId !== 'op-super');
  }, [securityLogs, currentUser]);

  // Role control switches
  const handleToggleRoleGroup = (role: UserRole) => {
    if (!currentUser) return;

    const newName = role === 'Admin' ? 'Rajendra Prasad (Admin)' : 'Suresh Kumar (Operator)';
    const newEmail = role === 'Admin' ? 'rajendra.spe@gmail.com' : 'suresh.emitra@gmail.com';
    const newPhone = role === 'Admin' ? '+91 98290 12345' : '+91 94140 56789';

    onUpdateState({
      ...state,
      currentUser: {
        id: role === 'Admin' ? 'op-1' : 'op-2',
        name: newName,
        email: newEmail,
        role,
        phoneNumber: newPhone
      },
      securityLogs: [
        {
          id: `log-${Date.now().toString().slice(-5)}`,
          timestamp: new Date().toISOString(),
          operatorId: role === 'Admin' ? 'op-1' : 'op-2',
          operatorName: newName,
          role,
          action: `Switched active Role-Based Access Control node to ${role}`,
          status: 'Success',
          ipAddress: '47.11.134.19',
          device: 'App Web Console',
          browser: 'Firefox Developer Edition'
        },
        ...securityLogs
      ]
    });
  };

  // JWT Token representation text
  const getJWTFootprint = () => {
    if (!currentUser) return '';
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      sub: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      exp: Math.floor(Date.now() / 1000) + 3600
    }));
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.signature_verified`;
  };

  const jwtString = getJWTFootprint();

  return (
    <div className="space-y-6 animate-fade-in text-xs sm:text-sm">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white">
            Security Control & Access Portal
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor real-time system audit logs, track authenticated device signatures, review cryptographical JWT token parameters, and lock operational terminals.
          </p>
        </div>

        <button 
          onClick={onLockSession}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/15 cursor-pointer whitespace-nowrap transition-colors"
        >
          <Lock size={15} />
          <span>Lock Station Session</span>
        </button>
      </div>

      {/* Grid containing Session details and Audit logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Telemetry / JWT keys */}
        <div className="space-y-4">
          
          {/* Active session telemetry */}
          <div className={`p-5 rounded-3xl border ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-950'
          }`}>
            <h3 className="font-bold text-base font-display mb-3 pb-2 border-b border-inherit">
              Active Console Footprint
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                  <UserCheck size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Active Operator</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{currentUser?.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                  <Monitor size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Hardware Node</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">Intel Broadwell Terminal #1</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Globe size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">IP Access Address</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">47.11.134.19 (SSL Secure)</span>
                </div>
              </div>
            </div>

            {/* Active Session telemetry status */}
            <div className="mt-4 pt-4 border-t border-slate-150 dark:border-slate-800 border-dashed space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase font-mono">Access Authentication Grade</span>
              <div className="flex items-center gap-1 text-xs text-emerald-500 font-bold">
                <ShieldCheck size={14} />
                <span>AUTHORIZED - ROLE LEVEL: {currentUser?.role}</span>
              </div>
            </div>
          </div>

          {/* Cryptographical JWT Token View */}
          <div className={`p-5 rounded-3xl border ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-950'
          }`}>
            <h3 className="font-bold text-base font-display flex items-center gap-2 mb-2 pb-2 border-b border-inherit">
              <Key size={18} className="text-blue-650 text-blue-600" />
              <span>Cryptographical JWT Token</span>
            </h3>
            
            <p className="text-xs text-slate-400 leading-normal mb-3">
              SmartSPE uses cryptographically signed JSON Web Tokens (JWT) inside session headers to protect server queries against unauthorized injection.
            </p>

            <div className={`p-3 rounded-2xl font-mono text-[9px] break-all select-all leading-normal border ${
              darkMode ? 'bg-slate-950 border-slate-850 text-blue-400' : 'bg-slate-50 border-slate-250 text-blue-750'
            }`}>
              {jwtString}
            </div>

            <div className="flex items-center gap-1.5 mt-3 text-[10px] text-emerald-500 font-bold justify-center">
              <ShieldCheck size={12} />
              <span>JWT Decryption key: HS256 SSL Verified</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Full security audit table logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`p-5 rounded-3xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base font-display">Administrative Security Audit</h3>
                <p className="text-xs text-slate-400">Live feed tracking secure database transactions & session lockings</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Activity size={12} className="animate-pulse text-emerald-500" />
                <span>Monitoring Live</span>
              </div>
            </div>

            {/* Audit Logs table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Operator</th>
                    <th className="py-2.5 px-3">Action logged</th>
                    <th className="py-2.5 px-3 text-right">Target IP</th>
                    <th className="py-2.5 px-3 text-right">Hardware footprint</th>
                    <th className="py-2.5 px-3 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-705 dark:text-slate-350">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/10 dark:hover:bg-slate-800/10">
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[10px]/none opacity-80">
                        {formatRelativeTime(log.timestamp)}
                      </td>
                      <td className="py-3 px-3">
                        <div>
                          <span className="font-bold text-slate-950 dark:text-white-text block leading-none">{log.operatorName}</span>
                          <span className="text-[10px] text-slate-405 block mt-0.5">{log.role}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {log.action}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[10px] opacity-80">
                        {log.ipAddress}
                      </td>
                      <td className="py-3 px-3 text-right text-[10px] max-w-40 truncate">
                        {log.device} • {log.browser}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${
                          log.status === 'Success' 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
