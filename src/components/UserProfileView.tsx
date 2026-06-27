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
  Save, 
  CheckCircle, 
  Camera, 
  Trash2, 
  MapPin,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { AppState } from '../types';
import { changeAuthUserPassword } from '../firebase';

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

  // Basic Profile Inputs
  const [name, setName] = React.useState(currentUser?.name || '');
  const [email, setEmail] = React.useState(currentUser?.email || '');
  const [phone, setPhone] = React.useState(currentUser?.phoneNumber || '');
  const [address, setAddress] = React.useState(currentUser?.address || '');
  const [photoUrl, setPhotoUrl] = React.useState(currentUser?.photoUrl || '');
  
  // Password Change Inputs
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Messages
  const [successMsg, setSuccessMsg] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = React.useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = React.useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!currentUser) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">कृपया पहले लॉगइन करें। (Please login first.)</p>
      </div>
    );
  }

  // Handle Profile Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('फोटो का साइज़ 2MB से कम होना चाहिए। (Photo size must be less than 2MB.)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoUrl(base64);
        
        // Auto-save the photo directly to the state
        const updatedUser = {
          ...currentUser,
          photoUrl: base64
        };

        const updatedOperators = state.operators.map(op => {
          if (op.id === currentUser.id) {
            return {
              ...op,
              photoUrl: base64
            };
          }
          return op;
        });

        onUpdateState({
          ...state,
          currentUser: updatedUser,
          operators: updatedOperators
        });

        setSuccessMsg('प्रोफ़ाइल फोटो सफलतापूर्वक अपडेट हो गई है! (Profile Photo Updated!)');
        setTimeout(() => setSuccessMsg(''), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove Photo
  const handleRemovePhoto = () => {
    setPhotoUrl('');
    
    const updatedUser = {
      ...currentUser,
      photoUrl: ''
    };

    const updatedOperators = state.operators.map(op => {
      if (op.id === currentUser.id) {
        return {
          ...op,
          photoUrl: ''
        };
      }
      return op;
    });

    onUpdateState({
      ...state,
      currentUser: updatedUser,
      operators: updatedOperators
    });

    setSuccessMsg('प्रोफ़ाइल फोटो हटा दी गई है। (Profile Photo Removed.)');
    setTimeout(() => setSuccessMsg(''), 3000);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save Name, Mobile, Email, Address
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('कृपया अपना नाम दर्ज करें। (Please enter your name.)');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('कृपया अपना मोबाइल नंबर दर्ज करें। (Please enter your mobile number.)');
      return;
    }

    const updatedUser = {
      ...currentUser,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phone.trim(),
      address: address.trim()
    };

    // Update operators list if present
    const updatedOperators = state.operators.map(op => {
      if (op.id === currentUser.id) {
        return {
          ...op,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phoneNumber: phone.trim(),
          address: address.trim()
        };
      }
      return op;
    });

    onUpdateState({
      ...state,
      currentUser: updatedUser,
      operators: updatedOperators
    });

    setSuccessMsg('प्रोफ़ाइल विवरण सफलतापूर्वक सहेजा गया! (Profile Details Saved Successfully!)');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Save Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    if (!newPassword) {
      setPasswordErrorMsg('कृपया नया पासवर्ड दर्ज करें। (Please enter a new password.)');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErrorMsg('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए। (Password must be at least 6 characters.)');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('पासवर्ड मैच नहीं कर रहे हैं। (Passwords do not match.)');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // 1. Update Firebase Auth Password
      await changeAuthUserPassword(newPassword);

      // 2. Update local state password too (for backup dynamic state logins)
      const updatedOperators = state.operators.map(op => {
        if (op.id === currentUser.id) {
          return {
            ...op,
            password: newPassword
          };
        }
        return op;
      });

      onUpdateState({
        ...state,
        operators: updatedOperators
      });

      setPasswordSuccessMsg('🔒 पासवर्ड सफलतापूर्वक बदल दिया गया है! (Password Changed Successfully!)');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('[Profile Password Change Error]:', err);
      setPasswordErrorMsg(`पासवर्ड बदलने में त्रुटि: ${err.message || 'Error updating password'}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold font-display uppercase tracking-tight flex items-center gap-2">
          <User className="text-blue-600 dark:text-blue-400" size={24} />
          यूज़र प्रोफ़ाइल <span className="text-blue-600 dark:text-blue-400 font-sans">/ USER PROFILE</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase font-mono tracking-wider">
          Manage your personal identity, contact details and security passwords
        </p>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Card - Photo & Quick Info */}
        <div className={`p-6 rounded-3xl border shadow-lg flex flex-col items-center text-center relative overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'
        }`}>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />

          {/* Real Photo or Initials */}
          <div className="relative mt-4 mb-4 group">
            {photoUrl ? (
              <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-white flex items-center justify-center">
                <img 
                  src={photoUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-display font-bold text-4xl text-white shadow-xl shadow-blue-500/20 border-4 border-white dark:border-slate-800">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Camera Overlay button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg border-2 border-white dark:border-slate-900 cursor-pointer transition-all"
              title="Upload Profile Picture"
            >
              <Camera size={16} />
            </button>
            <input 
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {photoUrl && (
            <button
              onClick={handleRemovePhoto}
              className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 mb-4 transition-colors cursor-pointer"
            >
              <Trash2 size={12} />
              <span>फोटो हटाएं (Remove Photo)</span>
            </button>
          )}

          <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-1">
            {currentUser.name}
          </h2>
          <p className="text-xs font-mono font-semibold text-slate-400 mt-1 uppercase">
            ID: {currentUser.id.slice(0, 12).toUpperCase()}...
          </p>

          <div className="flex items-center gap-1.5 mt-3">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${
              currentUser.role === 'Super Admin'
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/20'
                : currentUser.role === 'Admin'
                  ? 'bg-blue-500/15 text-blue-500 border-blue-500/20'
                  : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20'
            }`}>
              {currentUser.role}
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-450 border border-emerald-500/10 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider">
              ACTIVE
            </span>
          </div>

          <div className="w-full border-t border-slate-100 dark:border-slate-850 my-5" />

          <div className="w-full text-left space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Gmail:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                {currentUser.email}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Mobile:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {currentUser.phoneNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side - Forms */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Form 1: Edit Profile details (photo, name, mobile, gmail, address) */}
          <div className={`p-6 rounded-3xl border shadow-lg ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'
          }`}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-5 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <User className="text-blue-500" size={16} />
              व्यक्तिगत विवरण <span className="text-slate-500 font-sans">/ PERSONAL DETAILS</span>
            </h3>

            {successMsg && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
                <CheckCircle size={14} />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1">पूरा नाम / Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-hidden transition-all font-semibold ${
                      darkMode 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-250 text-slate-800 focus:border-blue-600'
                    }`}
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1">मोबाइल नंबर / Mobile Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-slate-400" size={14} />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter mobile number"
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border outline-hidden transition-all font-semibold ${
                        darkMode 
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                          : 'bg-slate-50 border-slate-250 text-slate-800 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>

                {/* Email (Gmail) */}
                <div>
                  <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1">जीमेल एड्रेस / Gmail Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-slate-400" size={14} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="username@gmail.com"
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border outline-hidden transition-all font-semibold ${
                        darkMode 
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                          : 'bg-slate-50 border-slate-250 text-slate-800 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>

                {/* Role (Read only) */}
                <div>
                  <label className="font-bold text-slate-400 block mb-1">यूज़र रोल / Account Role (Unchangeable)</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.role}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-100 dark:bg-slate-950/40 text-slate-500 font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Address Field */}
              <div>
                <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1">पता / Full Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-slate-400" size={14} />
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your permanent or shop address"
                    className={`w-full pl-9 pr-3.5 py-2 rounded-xl border outline-hidden transition-all font-semibold resize-none ${
                      darkMode 
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-250 text-slate-800 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <Save size={14} />
                  <span>विवरण सहेजें (Save Details)</span>
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Change Password */}
          <div className={`p-6 rounded-3xl border shadow-lg ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'
          }`}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-5 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Lock className="text-indigo-500" size={16} />
              पासवर्ड बदलें <span className="text-slate-500 font-sans">/ CHANGE PASSWORD</span>
            </h3>

            {passwordSuccessMsg && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
                <CheckCircle size={14} />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
                <span>⚠️</span>
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* New Password */}
                <div>
                  <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1">नया पासवर्ड / New Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className={`w-full px-3.5 py-2.5 rounded-xl border outline-hidden transition-all font-semibold pr-10 ${
                        darkMode 
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                          : 'bg-slate-50 border-slate-250 text-slate-800 focus:border-blue-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-500"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="font-bold text-slate-500 dark:text-slate-400 block mb-1">पासवर्ड की पुष्टि करें / Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className={`w-full px-3.5 py-2.5 rounded-xl border outline-hidden transition-all font-semibold pr-10 ${
                        darkMode 
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' 
                          : 'bg-slate-50 border-slate-250 text-slate-800 focus:border-blue-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-500"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
                >
                  <Key size={14} />
                  <span>{isUpdatingPassword ? 'अपडेट किया जा रहा है...' : 'पासवर्ड बदलें (Change Password)'}</span>
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
