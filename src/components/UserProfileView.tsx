/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Key, 
  Shield, 
  Wallet, 
  Edit, 
  Save, 
  CheckCircle, 
  TrendingUp,
  Fingerprint,
  Activity,
  UserCheck,
  Store,
  MapPin,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { AppState } from '../types';
import { formatINR } from '../utils';

interface UserProfileViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  darkMode: boolean;
}

export default function UserProfileView({
  state,
  onUpdateState,
  darkMode
}: UserProfileViewProps) {
  const currentUser = state.currentUser;
  
  // State for Operator Profile inputs
  const [name, setName] = React.useState(currentUser?.name || '');
  const [email, setEmail] = React.useState(currentUser?.email || '');
  const [phone, setPhone] = React.useState(currentUser?.phoneNumber || '');
  const [isEditingOperator, setIsEditingOperator] = React.useState(false);

  // State for Shop Details inputs
  const [shopName, setShopName] = React.useState(state.shopDetails?.name || 'Vakrangee Kendra (वाकरंगी केंद्र)');
  const [shopMobile, setShopMobile] = React.useState(state.shopDetails?.mobile || '+91 90010 12345');
  const [shopGmail, setShopGmail] = React.useState(state.shopDetails?.gmail || 'vakrangee653@gmail.com');
  const [shopAddress, setShopAddress] = React.useState(state.shopDetails?.address || 'मुख्य चौराहा, वार्ड नं. 12, डाकघर के सामने, राजस्थान 331001 (Main Road, Ward No. 12, Rajasthan)');
  const [shopLogoUrl, setShopLogoUrl] = React.useState(state.shopDetails?.logoUrl || '');
  const [isEditingShop, setIsEditingShop] = React.useState(false);

  const [successMsg, setSuccessMsg] = React.useState('');

  const logoInputRef = React.useRef<HTMLInputElement>(null);

  // Stats for the logged in operator
  const myTxns = React.useMemo(() => {
    if (!currentUser) return [];
    return state.transactions.filter(t => t.operatorId === currentUser.id);
  }, [state.transactions, currentUser]);

  const myEmitras = React.useMemo(() => {
    if (!currentUser) return [];
    return state.emitraApplications.filter(a => a.operatorId === currentUser.id);
  }, [state.emitraApplications, currentUser]);

  const myOffline = React.useMemo(() => {
    if (!currentUser) return [];
    return state.offlineWork.filter(w => w.operatorId === currentUser.id);
  }, [state.offlineWork, currentUser]);

  const successTxnsCount = myTxns.filter(t => t.status === 'Success').length;
  const completedEmitrasCount = myEmitras.filter(a => a.status === 'Completed').length;
  const deliveredOfflineCount = myOffline.filter(w => w.status === 'Delivered').length;

  const handleSaveOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Update currentUser state
    const updatedUser = {
      ...currentUser,
      name,
      email,
      phoneNumber: phone
    };

    // Update operators list if present
    const updatedOperators = state.operators.map(op => {
      if (op.id === currentUser.id) {
        return {
          ...op,
          name,
          email,
          phoneNumber: phone
        };
      }
      return op;
    });

    onUpdateState({
      ...state,
      currentUser: updatedUser,
      operators: updatedOperators
    });

    setSuccessMsg('ऑपरेटर प्रोफ़ाइल सफलतापूर्वक अपडेट हो गया है! (Operator Profile Updated!)');
    setIsEditingOperator(false);

    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  const handleSaveShop = (e: React.FormEvent) => {
    e.preventDefault();

    onUpdateState({
      ...state,
      shopDetails: {
        name: shopName,
        mobile: shopMobile,
        gmail: shopGmail,
        address: shopAddress,
        logoUrl: shopLogoUrl
      }
    });

    setSuccessMsg('दुकान का विवरण और बिलिंग सेटिंग्स सफलतापूर्वक अपडेट कर दी गई हैं! (Shop Settings Saved!)');
    setIsEditingShop(false);

    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setShopLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setShopLogoUrl('');
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  if (!currentUser) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">कृपया पहले लॉगइन करें। (Please login first.)</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display uppercase tracking-tight flex items-center gap-2">
            <User className="text-blue-600 dark:text-blue-400" size={24} />
            यूज़र प्रोफ़ाइल <span className="text-blue-600 dark:text-blue-400 font-sans">/ USER PROFILE</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase font-mono tracking-wider">
            Terminal Profile, Shop Billing Settings & Print customization
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Profile Layout: 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Profile Card Summary & Stats */}
        <div className="space-y-6 lg:col-span-1">
          {/* Main ID Card */}
          <div className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden text-center flex flex-col items-center justify-center ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'
          }`}>
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
            
            {/* User Avatar with Initials */}
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-display font-bold text-3xl text-white shadow-lg shadow-blue-500/25">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-500 text-white rounded-xl border-4 border-white dark:border-slate-900 shadow-sm">
                <UserCheck size={12} />
              </div>
            </div>

            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {currentUser.name}
            </h2>
            <p className="text-xs font-mono font-bold text-slate-400 mt-1">
              ID: {currentUser.id.toUpperCase()}
            </p>

            <div className="flex items-center gap-1.5 mt-3">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                currentUser.role === 'Super Admin'
                  ? 'bg-amber-500/15 text-amber-500 border-amber-500/20'
                  : currentUser.role === 'Admin'
                    ? 'bg-blue-500/15 text-blue-500 border-blue-500/20'
                    : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20'
              }`}>
                {currentUser.role}
              </span>
              <span className="px-2 py-0.5 bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/15 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                ACTIVE
              </span>
            </div>

            {/* Micro Details Divider */}
            <div className="w-full border-t border-slate-100 dark:border-slate-800 my-5" />

            <div className="w-full space-y-2.5 text-left text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="font-semibold">Email:</span>
                <span className="font-mono font-bold text-slate-850 dark:text-slate-200 truncate max-w-[150px]" title={currentUser.email}>
                  {currentUser.email}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="font-semibold">Phone:</span>
                <span className="font-mono font-bold text-slate-850 dark:text-slate-200">
                  {currentUser.phoneNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Business & Operation Stats Card */}
          <div className={`p-6 rounded-3xl border shadow-lg ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'
          }`}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <Activity className="text-blue-500" size={16} />
              संचालन गतिविधि <span className="text-slate-500 font-sans">/ OPERATION SUMMARY</span>
            </h3>

            <div className="space-y-3">
              {/* CSP Cash Limit */}
              <div className="p-3.5 rounded-2xl bg-blue-500/5 dark:bg-slate-950/40 border border-blue-500/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">CSP Cash Limit</span>
                  <span className="text-base font-mono font-extrabold text-blue-600 dark:text-blue-400">
                    {formatINR(state.wallet.balance)}
                  </span>
                </div>
                <Wallet className="text-blue-500 opacity-60" size={24} />
              </div>

              {/* Commissions Earned */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-slate-950/40 border border-emerald-500/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Commissions Wallet</span>
                  <span className="text-base font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatINR(state.wallet.totalCommissionEarned)}
                  </span>
                </div>
                <TrendingUp className="text-emerald-500 opacity-60" size={24} />
              </div>

              {/* Transactions Logged */}
              <div className="grid grid-cols-3 gap-2.5 pt-1.5">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/40 text-center">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none mb-1.5">Banking Txns</span>
                  <span className="text-sm font-mono font-extrabold text-slate-800 dark:text-slate-200">{successTxnsCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/40 text-center">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none mb-1.5">eMitra Appls</span>
                  <span className="text-sm font-mono font-extrabold text-slate-800 dark:text-slate-200">{completedEmitrasCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/40 text-center">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none mb-1.5">Offline Works</span>
                  <span className="text-sm font-mono font-extrabold text-slate-800 dark:text-slate-200">{deliveredOfflineCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns - Forms, Keys & Settings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Shop Details & Receipt Settings (दुकान का विवरण और बिलिंग) */}
          <div className={`p-6 rounded-3xl border shadow-lg ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'
          }`}>
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Store className="text-blue-600 dark:text-blue-400" size={18} />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    दुकान और प्रिंट बिलिंग प्रोफाइल <span className="text-blue-500 font-sans">/ SHOP & RECEIPT SETTINGS</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">यह जानकारी ग्राहकों की प्रिंट पर्ची (Printed Receipt) पर सबसे ऊपर दिखाई देगी।</p>
                </div>
              </div>
              {!isEditingShop && (
                <button
                  onClick={() => setIsEditingShop(true)}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Edit Shop Details
                </button>
              )}
            </div>

            <form onSubmit={handleSaveShop} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shop Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">दुकान का नाम / Shop Name *</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditingShop}
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-hidden transition-all font-semibold ${
                      !isEditingShop 
                        ? 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed'
                        : darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>

                {/* Shop Mobile */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">दुकान मोबाइल / Shop Mobile *</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditingShop}
                    value={shopMobile}
                    onChange={(e) => setShopMobile(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-hidden transition-all font-semibold ${
                      !isEditingShop 
                        ? 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed'
                        : darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>

                {/* Shop Gmail */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">दुकान ईमेल / Shop Gmail *</label>
                  <input
                    type="email"
                    required
                    disabled={!isEditingShop}
                    value={shopGmail}
                    onChange={(e) => setShopGmail(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-hidden transition-all font-semibold ${
                      !isEditingShop 
                        ? 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed'
                        : darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>

                {/* Shop Address */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">दुकान का पता / Shop Address *</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditingShop}
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-hidden transition-all font-semibold ${
                      !isEditingShop 
                        ? 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed'
                        : darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Logo/Photo Upload Section */}
              <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 mt-2">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  
                  {/* Real-time logo preview */}
                  <div className="relative">
                    {shopLogoUrl ? (
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white flex items-center justify-center relative group">
                        <img 
                          src={shopLogoUrl} 
                          alt="Shop Logo" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        {isEditingShop && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={removeLogo}
                              className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                              title="Delete Logo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon size={24} className="mb-1 opacity-50" />
                        <span className="text-[8px] font-bold uppercase tracking-wider">No Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">दुकान का फोटो / लोगो (Shop Logo Photo)</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">रसीद के शीर्ष भाग पर प्रदर्शित करने के लिए लोगो अपलोड करें (JPEG/PNG/SVG)।</p>
                    
                    {isEditingShop && (
                      <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <input
                          type="file"
                          ref={logoInputRef}
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/15 text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <Camera size={12} />
                          <span>फोटो अपलोड करें (Upload Image)</span>
                        </button>
                        {shopLogoUrl && (
                          <button
                            type="button"
                            onClick={removeLogo}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/15 text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                          >
                            <Trash2 size={12} />
                            <span>हटाएं (Remove)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {isEditingShop && (
                <div className="flex items-center gap-3.5 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShopName(state.shopDetails?.name || 'Vakrangee Kendra (वाकरंगी केंद्र)');
                      setShopMobile(state.shopDetails?.mobile || '+91 90010 12345');
                      setShopGmail(state.shopDetails?.gmail || 'vakrangee653@gmail.com');
                      setShopAddress(state.shopDetails?.address || '');
                      setShopLogoUrl(state.shopDetails?.logoUrl || '');
                      setIsEditingShop(false);
                    }}
                    className={`px-4 py-2 rounded-xl font-bold border transition-colors cursor-pointer ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-250 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>दुकान विवरण सहेजें (Save Shop Details)</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Card 2: Edit Operator Profile Form */}
          <div className={`p-6 rounded-3xl border shadow-lg ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'
          }`}>
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="text-blue-500" size={16} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  ऑपरेटर विवरण अपडेट करें <span className="text-slate-500 font-sans">/ MANAGE OPERATOR DETAILS</span>
                </h3>
              </div>
              {!isEditingOperator && (
                <button
                  onClick={() => setIsEditingOperator(true)}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Edit Operator
                </button>
              )}
            </div>

            <form onSubmit={handleSaveOperator} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Operator Full Name *</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditingOperator}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-hidden transition-all font-semibold ${
                      !isEditingOperator 
                        ? 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed'
                        : darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Registered Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!isEditingOperator}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-hidden transition-all font-semibold ${
                      !isEditingOperator 
                        ? 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed'
                        : darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Contact Phone Number *</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditingOperator}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-hidden transition-all font-semibold ${
                      !isEditingOperator 
                        ? 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-500 cursor-not-allowed'
                        : darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-600'
                    }`}
                  />
                </div>

                {/* Operational Code */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Operator System Role</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.role}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/40 text-slate-500 font-semibold cursor-not-allowed"
                  />
                </div>
              </div>

              {isEditingOperator && (
                <div className="flex items-center gap-3.5 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setName(currentUser.name);
                      setEmail(currentUser.email);
                      setPhone(currentUser.phoneNumber);
                      setIsEditingOperator(false);
                    }}
                    className={`px-4 py-2 rounded-xl font-bold border transition-colors cursor-pointer ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-250 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>ऑपरेटर विवरण सहेजें (Save Operator Details)</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Secure PIN and Session Lock Info Card */}
          <div className={`p-6 rounded-3xl border shadow-lg ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'
          }`}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <Shield className="text-blue-500" size={16} />
              सुरक्षा और सत्र पासवर्ड <span className="text-slate-500 font-sans">/ TERMINAL LOCK CODE</span>
            </h3>

            <div className="space-y-4 text-xs leading-relaxed">
              <p className="text-slate-500 dark:text-slate-400">
                आपकी सुरक्षा सुनिश्चित करने के लिए, निष्क्रियता के मामले में या ऊपर दिए गए <Key className="inline-block" size={12} /> लॉक आइकन को दबाकर अपने ऑपरेटिंग टर्मिनल सत्र (Terminal Session) को तुरंत लॉक किया जा सकता है।
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Fingerprint className="text-indigo-500 animate-pulse" size={16} />
                    डिफ़ॉल्ट सुरक्षा पिन (Default Lock Passcode)
                  </span>
                  <p className="text-[10px] text-slate-400 uppercase font-mono">
                    Session Decryption Key configured
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-3.5 py-1.5 rounded-xl font-bold text-sm tracking-wider">
                    1234
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">या (or)</span>
                  <span className="font-mono bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-3.5 py-1.5 rounded-xl font-bold text-sm tracking-wider">
                    admin123
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/10 text-[11px] font-medium leading-normal">
                <span>ℹ️</span>
                <p>
                  यह पिन आपके सभी CSP कैश और eMitra ट्रांजैक्शन सत्रों को सुरक्षित रखने के लिए आवश्यक है। अधिक सुरक्षा नियमों के लिए व्यवस्थापक (Admin) से संपर्क करें।
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
