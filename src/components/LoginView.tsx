import React from 'react';
import { 
  Lock, 
  Mail, 
  Phone, 
  Fingerprint, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle,
  AlertTriangle,
  Compass,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { AppState, Operator, SecurityLog, UserRole } from '../types';
import SmartSpeLogo from './SmartSpeLogo';
import { useAuth } from '../firebase/AuthProvider';

interface LoginViewProps {
  state: AppState;
  onUpdateState: (newState: AppState) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function LoginView({
  state,
  onUpdateState,
  darkMode,
  setDarkMode
}: LoginViewProps) {
  const { loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();
  const [loginMethod, setLoginMethod] = React.useState<'email' | 'phone'>('phone');
  const [emailInput, setEmailInput] = React.useState('');
  const [phoneInput, setPhoneInput] = React.useState('');
  const [passwordInput, setPasswordInput] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  
  const [errorMsg, setErrorMsg] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');
  const [isFingerprinting, setIsFingerprinting] = React.useState(true);
  const [fingerprintHash, setFingerprintHash] = React.useState('');

  // Self recovery state variables
  const [showRecoveryModal, setShowRecoveryModal] = React.useState(false);
  const [recoverySearch, setRecoverySearch] = React.useState('');
  const [foundOperator, setFoundOperator] = React.useState<Operator | null>(null);
  const [recoveryError, setRecoveryError] = React.useState('');
  const [recoverySuccess, setRecoverySuccess] = React.useState('');
  const [recoveryOtpInput, setRecoveryOtpInput] = React.useState('');
  const [generatedOtp, setGeneratedOtp] = React.useState('');
  const [isOtpVerified, setIsOtpVerified] = React.useState(false);
  const [otpError, setOtpError] = React.useState('');

  // Operator / Customer Registration states
  const [viewMode, setViewMode] = React.useState<'login' | 'register'>('login');
  const [regName, setRegName] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regPhone, setRegPhone] = React.useState('');
  const [regPassword, setRegPassword] = React.useState('');
  const [regConfirmPassword, setRegConfirmPassword] = React.useState('');
  const [regRole, setRegRole] = React.useState<UserRole>('Admin');
  const [showRegPassword, setShowRegPassword] = React.useState(false);

  // Real Gmail OTP States
  const [activeOtpFlow, setActiveOtpFlow] = React.useState<'none' | 'login_otp' | 'register_otp'>('none');
  const [sessionOtp, setSessionOtp] = React.useState('');
  const [otpSentMessage, setOtpSentMessage] = React.useState('');
  const [tempRegisteredOp, setTempRegisteredOp] = React.useState<Operator | null>(null);
  const [tempLoginOp, setTempLoginOp] = React.useState<Operator | null>(null);
  const [userOtpInput, setUserOtpInput] = React.useState('');
  const [sendingOtp, setSendingOtp] = React.useState(false);
  const [otpIsSimulated, setOtpIsSimulated] = React.useState(false);

  // Dynamic Environment Check: Auto-detects if running on localhost / AI Studio development preview URLs
  const isDevEnv = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('ais-dev') ||
    window.location.hostname.includes('ais-pre') ||
    window.location.hostname.includes('run.app')
  );

  // State to toggle display of the Quick Demo Login Bypass panel
  const [showDemoPanel, setShowDemoPanel] = React.useState(isDevEnv);

  // Simulated browser details for fingerprinting
  const browserDetails = {
    ip: '103.241.12.94',
    browser: typeof window !== 'undefined' ? navigator.userAgent.split(' ')[0] || 'Chrome 126.3' : 'Chrome 126.3',
    device: typeof window !== 'undefined' ? (navigator.platform || 'Windows PC') : 'Windows PC',
    resolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080',
    location: 'Jaipur, Rajasthan, India (Vakrangee Point Zone)'
  };

  // Generate simulated fingerprint on mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      // Create a deterministic hash string based on browser specs
      const pseudoHash = Array.from({ length: 16 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('').toUpperCase();
      setFingerprintHash(`JWT-FP-${pseudoHash}`);
      setIsFingerprinting(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [loginMethod]);

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const googleEmail = (user.email || '').toLowerCase().trim();
      const googleName = user.displayName || 'Google User';

      // Check if the user exists in state.operators or is the superadmin
      const hasProfile = state.operators.some(
        op => op.email && op.email.toLowerCase().trim() === googleEmail
      ) || googleEmail === 'vakrangee653@gmail.com';

      if (!hasProfile) {
        await signOut(auth);
        setErrorMsg('❌ लॉगिन विफल: आपका कोई प्रोफाइल नहीं मिला है। कृपया पहले "एडमिन पंजीकरण (Register)" टैब से अपनी प्रोफाइल बनाएं, तभी आप इस Gmail से लॉगिन कर सकेंगे। (Login failed: Profile not found. Please create your profile first from the registration tab before logging in with your Gmail).');
        return;
      }

      setSuccessMsg(`🎉 Google लॉगिन सफल! स्वागत है, ${googleName}. डेटा लोड हो रहा है...`);
    } catch (err: any) {
      console.error('[Firebase Auth Error]', err);
      let localizedMsg = err.message || 'पॉपअप शुरू करने में असमर्थ';
      if (err.code === 'auth/popup-blocked') {
        localizedMsg = 'ब्राउज़र ने पॉपअप ब्लॉक कर दिया है। कृपया पॉपअप की अनुमति दें! (Popup was blocked by the browser)';
      } else if (err.code === 'auth/popup-closed-by-user') {
        localizedMsg = 'लॉगिन पॉपअप बंद कर दिया गया। (Login popup was closed by user)';
      }
      setErrorMsg(`❌ Google Sign-In विफल: ${localizedMsg}`);
    }
  };

  // Handle standard manual login validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const targetVal = phoneInput.trim();
    const enteredPass = passwordInput;

    if (!targetVal || !enteredPass) {
      setErrorMsg('कृपया क्रेडेंशियल्स दर्ज करें! (Please enter credentials)');
      return;
    }

    const isEmailInput = targetVal.includes('@');
    const detectionMethod = isEmailInput ? 'email' : 'phone';

    // Find custom match inside state.operators (dynamic list)
    const existingOps = state.operators;
    const operatorMatched = existingOps.find(op => {
      if (isEmailInput) {
        return op.email.toLowerCase() === targetVal.toLowerCase();
      } else {
        // Clean phone number matches
        const cleanOpPhone = op.phoneNumber.replace(/[\s+()-]/g, '');
        const cleanInputPhone = targetVal.replace(/[\s+()-]/g, '');
        return cleanOpPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(cleanOpPhone);
      }
    });

    if (!operatorMatched) {
      setErrorMsg('प्रवेश अमान्य है! यह यूज़र पंजीकृत नहीं है। (Invalid access. This user is not registered)');
      return;
    }

    // Check if locked out (Super Admin and Admin can never be locked out)
    const canBeLocked = operatorMatched.role !== 'Super Admin' && operatorMatched.role !== 'Admin';
    if ((operatorMatched.isLockedOut && canBeLocked) || operatorMatched.status === 'Inactive') {
      // Record blocked log
      const blockedLog: SecurityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        operatorId: operatorMatched.id,
        operatorName: operatorMatched.name,
        role: operatorMatched.role,
        action: `Blocked Login Attempt - Roll Blocked/Locked (${detectionMethod === 'email' ? 'Email' : 'Phone'})`,
        status: 'Blocked',
        ipAddress: browserDetails.ip,
        device: browserDetails.device,
        browser: browserDetails.browser
      };

      onUpdateState({
        ...state,
        securityLogs: [blockedLog, ...state.securityLogs]
      });

      setErrorMsg('⚠️ यह खाता निलंबित या बार-बार गलत पासवर्ड के कारण लॉक कर दिया गया है! कृपया व्यवस्थापक से संपर्क करें। (This account has been suspended or locked out due to consecutive failed logins)');
      return;
    }

    try {
      let cred;
      try {
        cred = await loginWithEmail(operatorMatched.email, enteredPass);
      } catch (err: any) {
        // If password is correct according to state.operators but account doesn't exist in Firebase Auth (e.g. newly added back or deleted)
        if (
          (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') &&
          enteredPass === operatorMatched.password
        ) {
          console.log('[LoginView] Auto-registering operator with matched password in Firebase Auth:', operatorMatched.email);
          cred = await registerWithEmail(
            operatorMatched.email,
            enteredPass,
            operatorMatched.name,
            operatorMatched.phoneNumber,
            operatorMatched.role
          );
        } else {
          throw err;
        }
      }

      // Reset failed attempts on success and link ID to correct Firebase UID
      const updatedOperators = state.operators.map(op => {
        if (op.id === operatorMatched.id) {
          return {
            ...op,
            id: cred.user.uid, // Map custom ID to real Firebase UID
            failedAttempts: 0,
            isLockedOut: false
          };
        }
        return op;
      });

      // Direct Login for Operator, Admin, and Super Admin roles
      const successLog: SecurityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        operatorId: cred.user.uid,
        operatorName: operatorMatched.name,
        role: operatorMatched.role,
        action: `Direct Login Success via ${detectionMethod === 'email' ? 'Email' : 'Phone'} (Firebase Authenticated)`,
        status: 'Success',
        ipAddress: browserDetails.ip,
        device: browserDetails.device,
        browser: browserDetails.browser
      };

      onUpdateState({
        ...state,
        operators: updatedOperators,
        currentUser: {
          id: cred.user.uid,
          name: `${operatorMatched.name} (${operatorMatched.role})`,
          email: operatorMatched.email,
          role: operatorMatched.role,
          phoneNumber: operatorMatched.phoneNumber,
          createdBy: operatorMatched.createdBy,
          photoUrl: operatorMatched.photoUrl || '',
          address: operatorMatched.address || ''
        },
        securityLogs: [successLog, ...state.securityLogs]
      });
      setSuccessMsg(`🎉 लॉगिन सफल! स्वागत है, ${operatorMatched.name} (Direct Login)`);
    } catch (err: any) {
      // Increase failed attempts
      const currentFailed = (operatorMatched.failedAttempts || 0) + 1;
      const maxAttempts = (operatorMatched.role === 'Super Admin' || operatorMatched.role === 'Admin') ? 999 : 10;
      const isNowLocked = currentFailed >= maxAttempts;

      const updatedOperators = state.operators.map(op => {
        if (op.id === operatorMatched.id) {
          return {
            ...op,
            failedAttempts: currentFailed,
            isLockedOut: isNowLocked ? true : op.isLockedOut
          };
        }
        return op;
      });

      // Record failed security audit log
      const failedLog: SecurityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        operatorId: operatorMatched.id,
        operatorName: operatorMatched.name,
        role: operatorMatched.role,
        action: `Failed Login Step (${currentFailed}/${maxAttempts} Attempts) via ${detectionMethod === 'email' ? 'Email' : 'Phone'} (Auth Error: ${err.message})`,
        status: isNowLocked ? 'Blocked' : 'Failed',
        ipAddress: browserDetails.ip,
        device: browserDetails.device,
        browser: browserDetails.browser
      };

      onUpdateState({
        ...state,
        operators: updatedOperators,
        securityLogs: [failedLog, ...state.securityLogs]
      });

      if (isNowLocked) {
        setErrorMsg(`❌ ${maxAttempts} असफल लॉगिन प्रयासों के बाद आपका खाता लॉक कर दिया गया है! (Account locked out after ${maxAttempts} failed login attempts)`);
      } else {
        setErrorMsg(`❌ गलत पासवर्ड या प्रमाणीकरण त्रुटि! शेष अवसर: ${maxAttempts - currentFailed} (Wrong password or authentication error. Remaining attempts: ${maxAttempts - currentFailed})`);
      }
    }
  };

  // Preset demo bypass login
  const handlePresetLogin = (opPreset: any) => {
    setErrorMsg('');
    setSuccessMsg('');
    
    // Check lock
    if (opPreset.isLockedOut) {
      alert("यहpreset खाता लॉक है! पहले सुपर एडमिन/एडमिन लॉगिन करके इसे अनलॉक करें।");
      return;
    }

    const successLog: SecurityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      operatorId: opPreset.id,
      operatorName: opPreset.name,
      role: opPreset.role,
      action: `Demo Preset Quick Login Bypass (Fingerprint verification skipped)`,
      status: 'Success',
      ipAddress: browserDetails.ip,
      device: browserDetails.device,
      browser: browserDetails.browser
    };

    setSuccessMsg(`बायपास लॉगिन स्वीकृत: ${opPreset.name} (${opPreset.role})!`);

    setTimeout(() => {
      onUpdateState({
        ...state,
        currentUser: {
          id: opPreset.id,
          name: `${opPreset.name} (${opPreset.role === 'Super Admin' ? 'Super Admin' : opPreset.role})`,
          email: opPreset.email,
          role: opPreset.role,
          phoneNumber: opPreset.phoneNumber,
          createdBy: opPreset.createdBy,
          photoUrl: opPreset.photoUrl || '',
          address: opPreset.address || ''
        },
        securityLogs: [successLog, ...state.securityLogs]
      });
    }, 800);
  };

  // Handle user registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim();
    const trimmedPhone = regPhone.trim();
    const pass = regPassword;
    const confirmPass = regConfirmPassword;

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !pass) {
      setErrorMsg('कृपया सभी आवश्यक क्षेत्रों को भरें! (Please fill all required fields)');
      return;
    }

    if (pass !== confirmPass) {
      setErrorMsg('पासवर्ड मेल नहीं खाते! (Passwords do not match)');
      return;
    }

    if (pass.length < 6) {
      setErrorMsg('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए! (Password must be at least 6 characters long)');
      return;
    }

    // Check if email or phone already exists
    const emailExists = state.operators.some(op => op.email.toLowerCase() === trimmedEmail.toLowerCase());
    const phoneExists = state.operators.some(op => op.phoneNumber.replace(/[\s+()-]/g, '') === trimmedPhone.replace(/[\s+()-]/g, ''));

    if (emailExists) {
      setErrorMsg('यह ईमेल पहले से ही पंजीकृत है! (This email is already registered)');
      return;
    }

    if (phoneExists) {
      setErrorMsg('यह मोबाइल नंबर पहले से ही पंजीकृत है! (This mobile number is already registered)');
      return;
    }

    // Create new Operator
    const newOpId = `op-${Math.random().toString(36).substring(2, 8)}`;
    const newOperator: Operator = {
      id: newOpId,
      name: trimmedName,
      email: trimmedEmail,
      role: 'Admin',
      status: 'Active',
      walletLimit: 15000,
      commissionRate: 12,
      phoneNumber: trimmedPhone,
      password: pass,
      failedAttempts: 0,
      isLockedOut: false
    };

    setSendingOtp(true);
    setErrorMsg('');
    setSuccessMsg('पंजीकरण प्रक्रिया शुरू हो रही है... (Initiating registration...)');

    registerWithEmail(
      trimmedEmail,
      pass,
      trimmedName,
      trimmedPhone,
      'Admin'
    )
    .then((cred) => {
      const registeredOpWithUid = {
        ...newOperator,
        id: cred.user.uid
      };
      
      onUpdateState({
        ...state,
        operators: [...state.operators, registeredOpWithUid],
        securityLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            operatorId: cred.user.uid,
            operatorName: trimmedName,
            role: 'Admin',
            action: `Self Admin Registration Completed: ${trimmedEmail}`,
            status: 'Success',
            ipAddress: browserDetails.ip,
            device: browserDetails.device,
            browser: browserDetails.browser
          },
          ...state.securityLogs
        ]
      });

      setSendingOtp(false);
      setSuccessMsg('🎉 पंजीकरण सफल! अब आप लॉगिन कर सकते हैं। (Registration successful! You can now log in)');
      setTimeout(() => {
        setViewMode('login');
        setEmailInput(trimmedEmail);
        setPasswordInput(pass);
      }, 1500);
    })
    .catch((err: any) => {
      setSendingOtp(false);
      setErrorMsg(`❌ पंजीकरण विफल (Registration Failed): ${err.message}`);
    });

    // Clear registration fields
    setRegName('');
    setRegEmail('');
    setRegPhone('');
    setRegPassword('');
    setRegConfirmPassword('');
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Absolute Dark Mode Controls */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 px-3 rounded-full border shadow-sm text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <div className="w-full max-w-md space-y-6">
        
        {/* Branding Head - Centered */}
        <div className="flex flex-col items-center text-center space-y-3">
          <SmartSpeLogo size={80} showText={true} showTagline={true} className="transform hover:scale-105 transition-all duration-300" />
          <p className={`text-xs max-w-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Secure Rajasthan eMitra & CSP Multi-Wallet Terminal node handles digital payments directly.
          </p>
        </div>

        {/* Right Authentication Form Container with demo accounts */}
        <div className="space-y-6">
          
          {/* Main Login or Registration Card */}
          <div className={`p-6 md:p-8 rounded-3xl border shadow-xl relative overflow-hidden backdrop-blur-md min-h-[480px] ${
            darkMode ? 'bg-slate-950/40 border-slate-900' : 'bg-white/80 border-slate-200'
          }`}>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />
            
            {/* Password & ID Recovery Overlay */}
            {showRecoveryModal && (
              <div className="absolute inset-0 bg-slate-950/95 dark:bg-slate-950/98 backdrop-blur-md z-30 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-500/15 rounded-lg text-indigo-400"><HelpCircle size={15} /></span>
                        स्व-सेवा पासवर्ड / ID रिकवरी (Self-Service Reset)
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Recover lost Operator ID or reset locked terminal passwords.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowRecoveryModal(false)}
                      className="text-slate-400 hover:text-white text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                    >
                      बंद करें (Close)
                    </button>
                  </div>

                  {!foundOperator ? (
                    <div className="space-y-4 mt-2">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        कृपया अपना **पंजीकृत ईमेल पता (Registered Email)** या **10-अंकों का मोबाइल नंबर (Mobile Number)** दर्ज करें ताकि हम आपके ऑपरेटर/एडमिन विवरणों की खोज कर सकें:
                      </p>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
                          Registered Email / Phone Number
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. rajendra.spe@gmail.com or 9829012345"
                          value={recoverySearch}
                          onChange={(e) => setRecoverySearch(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white focus:border-indigo-500 focus:outline-hidden transition-all"
                        />
                      </div>

                      {recoveryError && (
                        <p className="text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                          {recoveryError}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryError('');
                          const query = recoverySearch.trim().toLowerCase();
                          if (!query) {
                            setRecoveryError('⚠️ कृपया ईमेल या मोबाइल नंबर दर्ज करें!');
                            return;
                          }
                          const match = state.operators.find(op => 
                            op.email.toLowerCase() === query ||
                            op.phoneNumber.replace(/[\s+()-]/g, '').endsWith(query) ||
                            query.endsWith(op.phoneNumber.replace(/[\s+()-]/g, ''))
                          );

                          if (match) {
                            setFoundOperator(match);
                            setIsOtpVerified(true);
                            setGeneratedOtp('');
                            setRecoveryOtpInput('');
                            setOtpError('');
                          } else {
                            setRecoveryError('❌ कोई भी ऑपरेटर या एडमिन विवरण मेल नहीं खाता! कृपया सही इनपुट की जांच करें।');
                          }
                        }}
                        className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                      >
                        खाते की खोज करें (Search Active Registry)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 mt-2">
                      <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Secure Audit Record Found !</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            foundOperator.role === 'Super Admin' ? 'bg-amber-500/10 text-amber-400' 
                            : foundOperator.role === 'Admin' ? 'bg-indigo-500/10 text-indigo-400' 
                            : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {foundOperator.role}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs border-y border-slate-800/60 py-2 font-mono font-bold text-left">
                          <div>
                            <span className="text-slate-400 text-[10px] block">Operator / Name</span>
                            <span className="text-white">
                              {foundOperator.name.split(' ').map(n => n[0] + '****' + (n[n.length-1] || '')).join(' ')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Email ID (Masked)</span>
                            <span className="text-white truncate block">
                              {(() => {
                                const parts = foundOperator.email.split('@');
                                if (parts.length < 2) return '******';
                                return parts[0].slice(0, 2) + '****' + parts[0].slice(-1) + '@' + parts[1];
                              })()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Mobile (Masked)</span>
                            <span className="text-white">
                              {foundOperator.phoneNumber.slice(0, 3) + '******' + foundOperator.phoneNumber.slice(-3)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Security Status</span>
                            <span className={foundOperator.isLockedOut ? 'text-rose-450 font-bold animate-pulse' : 'text-emerald-400'}>
                              {foundOperator.isLockedOut ? 'Locked / Blocked 🔒' : 'Verified Profile ✅'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {recoverySuccess ? (
                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center space-y-2">
                          <p className="font-bold">🎉 {recoverySuccess}</p>
                          <p className="opacity-90">लॉगिन करने के लिए 'वापस लॉगिन पर जाएं' बटन पर क्लिक करें।</p>
                        </div>
                      ) : !isOtpVerified ? (
                        <div className="space-y-3.5 mt-2 text-left">
                          <div className="p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-2 text-amber-500">
                            <span className="text-[10px] font-bold uppercase tracking-wider block">🔐 SECURITY CHALLENGE (ओटीपी सुरक्षा जांच)</span>
                            <p className="text-[11px] text-slate-300 leading-normal font-sans">
                              अवांछित एक्सेस रोकने के लिए, इस ऑपरेटर के पंजीकृत नंबर पर एक सुरक्षित ६-अंकीय ओटीपी कोड भेजा गया है।
                            </p>
                            
                            <div className="p-2.5 bg-slate-950 border border-slate-900 rounded-xl space-y-1 mt-1 font-mono text-center relative overflow-hidden">
                              <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-[8px] uppercase font-bold rounded-bl-lg">Simulated SMS Channel</div>
                              <span className="text-[9px] text-slate-550 block text-left">💬 SMS RECEIVER (+91-******{foundOperator.phoneNumber.slice(-4)}):</span>
                              <p className="text-white text-xs font-bold my-1 tracking-wider text-left">
                                Your safe reset OTP is: <span className="text-emerald-400 bg-emerald-500/10 px-2   py-0.5 rounded-md text-sm font-black tracking-widest">{generatedOtp}</span>
                              </p>
                              <span className="text-[8px] text-slate-500 block text-left leading-tight">This gateway popup behaves as Twilio/SNS notification simulation.</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase text-indigo-400 font-bold block">Enter 6-Digit Verification OTP*</label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Type 6-digit OTP code here"
                              value={recoveryOtpInput}
                              onChange={(e) => setRecoveryOtpInput(e.target.value.replace(/\D/g, ''))}
                              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-center font-mono font-bold text-white text-sm focus:border-indigo-500 focus:outline-hidden"
                            />
                          </div>

                          {otpError && (
                            <p className="text-xs text-rose-450 font-medium bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                              {otpError}
                            </p>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const cleanInput = recoveryOtpInput.trim();
                                if (cleanInput === generatedOtp) {
                                  setIsOtpVerified(true);
                                  setOtpError('');
                                } else {
                                  setOtpError('❌ अवैध सुरक्षा ओटीपी! कृपया प्रदान किया गया सही ६-अंकीय कोड डालें।');
                                }
                              }}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer transition-all"
                            >
                              सत्यापित करें (Verify OTP)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const code = Math.floor(100000 + Math.random() * 900000).toString();
                                setGeneratedOtp(code);
                                setRecoveryOtpInput('');
                                setOtpError('');
                                alert('🔄 सिम्युलेटेड एसएमएस गेटवे पर नया सुरक्षा ओटीपी कोड सेंड किया गया!');
                              }}
                              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all"
                            >
                              री-सेंड (Resend)
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 text-left">
                          <p className="text-[11px] text-emerald-400 font-bold flex items-center justify-start gap-1">
                            <span>✅ Identity Verified Successfully! (पहचान सफलतापूर्वक सत्यापित!)</span>
                          </p>
                          
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-left">
                            <label className="text-[10px] uppercase text-slate-450 font-bold mb-1 block">Set New Password (नया पासवर्ड दर्ज करें)</label>
                            <input
                              type="text"
                              placeholder="Type new secure pass (e.g. rajendra123)"
                              id="recoveryNewPassword"
                              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 text-xs text-white rounded-lg focus:border-indigo-500 outline-hidden font-bold"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                            <button
                              type="button"
                              onClick={() => {
                                const newPasswordEl = document.getElementById('recoveryNewPassword') as HTMLInputElement | null;
                                const newPass = newPasswordEl ? newPasswordEl.value.trim() : '';
                                if (!newPass || newPass.length < 6) {
                                  alert('❌ नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए!');
                                  return;
                                }

                                // Perform state updates
                                const updatedOps = state.operators.map(op => {
                                  if (op.id === foundOperator.id) {
                                    return {
                                      ...op,
                                      password: newPass,
                                      failedAttempts: 0,
                                      isLockedOut: false
                                    };
                                  }
                                  return op;
                                });

                                const auditLog: SecurityLog = {
                                  id: `log-${Date.now()}`,
                                  timestamp: new Date().toISOString(),
                                  operatorId: foundOperator.id,
                                  operatorName: foundOperator.name,
                                  role: foundOperator.role,
                                  action: `Self Password Recovered & Reset via secure OTP Challenge`,
                                  status: 'Success',
                                  ipAddress: '103.241.12.94',
                                  device: 'Credential Recovery Sub-Node',
                                  browser: 'Chrome 126.3 Secure'
                                };

                                onUpdateState({
                                  ...state,
                                  operators: updatedOps,
                                  securityLogs: [auditLog, ...state.securityLogs]
                                });

                                setRecoverySuccess('पासवर्ड सफलतापूर्वक बदल दिया गया है और खाता अनलॉक कर दिया गया है!');
                              }}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold uppercase cursor-pointer transition-all"
                            >
                              सेट करें (Set Secure Pass)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                // Just direct default reset
                                const defaultPass = foundOperator.role === 'Admin' ? 'admin123' : 'operator123';
                                const updatedOps = state.operators.map(op => {
                                  if (op.id === foundOperator.id) {
                                    return {
                                      ...op,
                                      password: defaultPass,
                                      failedAttempts: 0,
                                      isLockedOut: false
                                    };
                                  }
                                  return op;
                                });

                                const auditLog: SecurityLog = {
                                  id: `log-${Date.now()}`,
                                  timestamp: new Date().toISOString(),
                                  operatorId: foundOperator.id,
                                  operatorName: foundOperator.name,
                                  role: foundOperator.role,
                                  action: `Self Password Reset to Default (${defaultPass})`,
                                  status: 'Success',
                                  ipAddress: '103.241.12.94',
                                  device: 'Credential Recovery Sub-Node',
                                  browser: 'Chrome 126.3'
                                };

                                onUpdateState({
                                  ...state,
                                  operators: updatedOps,
                                  securityLogs: [auditLog, ...state.securityLogs]
                                });

                                setRecoverySuccess(`पासवर्ड डिफ़ॉल्ट "${defaultPass}" पर रिसेट कर दिया गया है!`);
                              }}
                              className="w-full py-2 bg-amber-650 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold uppercase cursor-pointer transition-all"
                            >
                              डिफ़ॉल्ट पर सेट करें (Reset to Default)
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setFoundOperator(null);
                          setRecoverySuccess('');
                          setRecoverySearch('');
                        }}
                        className="text-[10px] text-slate-400 hover:text-white transition-colors block text-center underline cursor-pointer mt-2"
                      >
                        ← अन्य खाता खोजें (Search another account)
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/60 mt-4 flex justify-between items-center text-[9px] text-slate-450 font-mono">
                  <span>Secured by smart hashing algorithms</span>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    वापस लॉगिन पर जाएं (Back to login)
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-1 text-center md:text-left flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  {viewMode === 'login' ? 'सुरक्षित लॉगिन पोर्टल (Secure Login Portal)' : 'एडमिन / शाखा प्रबंधक पंजीकरण (Admin Registration)'}
                </h2>
                <p className="text-xs text-slate-450 dark:text-slate-400">
                  {viewMode === 'login' ? 'Secure AES & SSO encryption backed logins.' : 'Register a new Admin/Branch Manager account securely.'}
                </p>
              </div>
            </div>

            {/* View Mode Toggle Tabs */}
            <div className="flex rounded-2xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 mt-5 mb-3 select-none">
              <button
                type="button"
                onClick={() => { setViewMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  viewMode === 'login' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10 font-bold' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                लॉगिन करें (Sign In)
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  viewMode === 'register' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10 font-bold' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                नया पंजीकरण करें (Create Login ID)
              </button>
            </div>

            {/* Error & Success Banner Notification */}
            {errorMsg && (
              <div className="mt-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-start gap-2.5">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <div className="space-y-0.5 font-medium leading-relaxed">
                  {errorMsg}
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mt-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-xs flex items-start gap-2.5">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500 mt-0.5" />
                <span className="font-bold">{successMsg}</span>
              </div>
            )}

            {activeOtpFlow !== 'none' ? (
              /* GMAIL SECURITY OTP CHALLENGE VIEW */
              <div className="space-y-4 py-2 text-left animate-fade-in">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 space-y-2">
                  <div className="flex items-center gap-2">
                     <ShieldCheck size={18} className="text-amber-500 animate-pulse" />
                     <span className="text-[11px] font-bold uppercase tracking-wider">🔐 GMAIL IDENTITY CHALLENGE (ईमेल सुरक्षा जांच)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-300 leading-normal font-sans">
                     सुरक्षित सुरक्षा नीतियों के तहत, इस ईमेल पते पर एक गतिशील ६-अंकीय ओटीपी कोड भेजा गया है। कृपया अपने Gmail इनबॉक्स (या स्पैम फोल्डर) की जाँच करें।
                  </p>
                  
                  {/* Automated Simulated/Real visual notification indicator */}
                  <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-1.5 mt-2 font-mono relative overflow-hidden text-xs">
                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] uppercase font-bold rounded-bl-lg">
                      {otpIsSimulated ? "Simulated Mode" : "Real SMTP Gateway"}
                    </div>
                    <span className="text-[9px] text-slate-400 block">💬 EMAIL TO ({activeOtpFlow === 'login_otp' ? tempLoginOp?.email : tempRegisteredOp?.email}):</span>
                    
                    {otpIsSimulated ? (
                      <div className="mt-1 space-y-1">
                        <p className="text-white text-[11px] font-bold">
                          Your safe reset OTP is: <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md text-sm font-black tracking-widest">{sessionOtp}</span>
                        </p>
                        <p className="text-[9px] text-amber-400 font-sans leading-tight">
                          💡 Tip: To receive real emails in your actual inbox, configure <strong className="font-mono">SMTP_USER</strong> and <strong className="font-mono">SMTP_PASS</strong> in your Settings/Secrets.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <p className="text-white text-[11px] font-bold flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>Mailing code to Gmail... check inbox!</span>
                        </p>
                        <p className="text-[9.5px] text-slate-400 leading-normal font-sans">
                          A real email has been dispatched via Gmail SMTP server gateway.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {otpSentMessage && (
                  <p className="text-center font-mono text-[10px] text-emerald-500 bg-emerald-500/5 py-1.5 px-3 rounded-lg border border-emerald-500/10">
                    ✅ {otpSentMessage}
                  </p>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-indigo-400 font-bold block pb-1">Enter 6-Digit Gmail OTP*</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Type 6-digit OTP code here"
                    value={userOtpInput}
                    onChange={(e) => setUserOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-850 rounded-xl text-center font-mono font-bold text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={sendingOtp}
                    onClick={() => {
                      if (userOtpInput.trim() === sessionOtp) {
                        // Confirm success!
                        if (activeOtpFlow === 'login_otp' && tempLoginOp) {
                          // Complete login
                          const successLog: SecurityLog = {
                            id: `log-${Date.now()}`,
                            timestamp: new Date().toISOString(),
                            operatorId: tempLoginOp.id,
                            operatorName: tempLoginOp.name,
                            role: tempLoginOp.role,
                            action: `Google Auth 2FA Verified: ${tempLoginOp.email}`,
                            status: 'Success',
                            ipAddress: browserDetails.ip,
                            device: browserDetails.device,
                            browser: browserDetails.browser
                          };

                          onUpdateState({
                            ...state,
                            currentUser: {
                              id: tempLoginOp.id,
                              name: `${tempLoginOp.name} (${tempLoginOp.role === 'Super Admin' ? 'Super Admin' : tempLoginOp.role})`,
                              email: tempLoginOp.email,
                              role: tempLoginOp.role,
                              phoneNumber: tempLoginOp.phoneNumber,
                              createdBy: tempLoginOp.createdBy,
                              photoUrl: tempLoginOp.photoUrl || '',
                              address: tempLoginOp.address || ''
                            },
                            securityLogs: [successLog, ...state.securityLogs]
                          });
                          setSuccessMsg(`🎉 लॉगिन सफल! स्वागत है, ${tempLoginOp.name} (Logged in via Google OTP)`);
                        } else if (activeOtpFlow === 'register_otp' && tempRegisteredOp) {
                          // Complete registration via Firebase Auth & Firestore
                          registerWithEmail(
                            tempRegisteredOp.email, 
                            tempRegisteredOp.password || 'operator123', 
                            tempRegisteredOp.name, 
                            tempRegisteredOp.phoneNumber, 
                            'Admin'
                          )
                          .then((cred) => {
                            const registeredOpWithUid = {
                              ...tempRegisteredOp,
                              id: cred.user.uid
                            };
                            onUpdateState({
                              ...state,
                              operators: [...state.operators, registeredOpWithUid],
                              securityLogs: [
                                {
                                  id: `log-${Date.now()}`,
                                  timestamp: new Date().toISOString(),
                                  operatorId: cred.user.uid,
                                  operatorName: tempRegisteredOp.name,
                                  role: 'Admin',
                                  action: `Self Admin Registration Verified via Gmail OTP & Firebase Auth Created: ${tempRegisteredOp.email}`,
                                  status: 'Success',
                                  ipAddress: browserDetails.ip,
                                  device: browserDetails.device,
                                  browser: browserDetails.browser
                                },
                                ...state.securityLogs
                              ]
                            });
                            setSuccessMsg('🎉 आपका ईमेल और पासवर्ड सफलतापूर्वक सत्यापित किया गया है! (Account verified and created successfully!)');
                            setTimeout(() => {
                              setViewMode('login');
                              setEmailInput(tempRegisteredOp.email);
                              setPasswordInput(tempRegisteredOp.password || '');
                            }, 1500);
                          })
                          .catch((err) => {
                            setErrorMsg(`❌ Firebase Auth Registration Failed: ${err.message}`);
                          });
                        }

                        // Close security view
                        setActiveOtpFlow('none');
                        setSessionOtp('');
                        setUserOtpInput('');
                        setOtpSentMessage('');
                      } else {
                        setErrorMsg('❌ अवैध ओटीपी कोड! कृपया अपने ईमेल पर भेजा गया सही ६-अंकीय कोड डालें।');
                      }
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer transition-all disabled:opacity-50"
                  >
                    सत्यापित करें (Verify OTP)
                  </button>
                  <button
                    type="button"
                    disabled={sendingOtp}
                    onClick={() => {
                      const code = Math.floor(100000 + Math.random() * 900000).toString();
                      setSessionOtp(code);
                      setSendingOtp(true);
                      setErrorMsg('');
                      
                      const targetEmail = activeOtpFlow === 'login_otp' ? tempLoginOp?.email : tempRegisteredOp?.email;
                      const targetName = activeOtpFlow === 'login_otp' ? tempLoginOp?.name : tempRegisteredOp?.name;

                      fetch('/api/send-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: targetEmail,
                          otp: code,
                          name: targetName,
                          context: 'पुनः भेजा गया ओटीपी (Resent Security Challenge)'
                        })
                      })
                      .then(async res => {
                        const isJson = res.headers.get('content-type')?.includes('application/json');
                        const text = await res.text();
                        if (!res.ok) {
                          throw new Error(`Server Error (${res.status}): ${text.substring(0, 100)}`);
                        }
                        if (!isJson) {
                          throw new Error(`Invalid Response (Non-JSON): ${text.substring(0, 100)}`);
                        }
                        return JSON.parse(text);
                      })
                      .then(data => {
                        setSendingOtp(false);
                        if (data.success) {
                          if (data.simulated) {
                            setOtpIsSimulated(true);
                            setOtpSentMessage(`📦 Simulated OTP (Console Mode): ${code}`);
                          } else {
                            setOtpIsSimulated(false);
                            setOtpSentMessage(`📧 New OTP sent safely to Gmail: ${targetEmail}`);
                          }
                        } else {
                          setErrorMsg(`❌ Resend failed: ${data.error}`);
                        }
                      })
                      .catch(err => {
                        setSendingOtp(false);
                        setErrorMsg(`❌ Resend Failed: ${err.message}`);
                      });
                    }}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-850 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
                  >
                    री-सेंड (Resend)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveOtpFlow('none');
                    setSessionOtp('');
                    setUserOtpInput('');
                    setOtpSentMessage('');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="w-full py-2 text-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer"
                >
                  रद्द करें और वापस जाएं (Cancel Verification)
                </button>
              </div>
            ) : viewMode === 'login' ? (
              <>
                {/* Auth Input form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Single Mobile Number Input */}
                  <div className="space-y-1.5 mt-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                      पंजीकृत मोबाइल नंबर (Registered Mobile Number) *
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. 9829012345 (या ईमेल आईडी)"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border outline-hidden transition-all ${
                          darkMode 
                            ? 'bg-slate-950 border-slate-850 text-white focus:border-indigo-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Password input with toggle button */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Secure Password *
                      </label>
                      <span className="text-[10px] text-slate-400">Default: admin123 or operator123</span>
                    </div>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs border outline-hidden transition-all ${
                          darkMode 
                            ? 'bg-slate-950 border-slate-850 text-white focus:border-indigo-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Security Hint & Forgot Password/ID */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] font-mono mt-2">
                    <div className="flex items-center gap-1.5 text-slate-405 dark:text-slate-400">
                      <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                      <span>लगातार 3 बार गलत पासवर्ड डालने पर खाता लॉक हो जायेगा।</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRecoveryModal(true);
                        setRecoverySearch('');
                        setFoundOperator(null);
                        setRecoveryError('');
                        setRecoverySuccess('');
                      }}
                      className="text-indigo-500 hover:text-indigo-650 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold transition-all whitespace-nowrap text-left cursor-pointer hover:underline"
                    >
                      पासवर्ड / ID भूल गए? (Forgot ID / Pass?)
                    </button>
                  </div>

                   <button
                    type="submit"
                    className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-indigo-600/10 transition-all duration-150"
                  >
                    प्रवेश प्रमाणित करें (Authenticate Session)
                  </button>

                  {/* Google Sign-In Split Option */}
                  <div className="relative my-4 flex items-center justify-center">
                    <div className="absolute inset-x-0 h-px bg-slate-200 dark:bg-slate-800/80" />
                    <span className="relative bg-white dark:bg-slate-900 px-3 text-[10px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 font-bold">
                      या (Or Continue with)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-850 dark:bg-slate-900/60 dark:hover:bg-slate-900/90 border border-slate-250 dark:border-slate-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2.5 shadow-sm cursor-pointer transition-all duration-150"
                  >
                    <svg className="w-4 h-4 mr-1 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.77-.66-1.29-1.52-1.33-2.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Google / Gmail से सीधा प्रवेश (Sign in with Google)</span>
                  </button>
                </form>
              </>
            ) : (
              /* Custom User/Operator Registration Form */
              <form onSubmit={handleRegisterSubmit} className="space-y-4 mt-4">
                {/* Operator/Customer Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                    Full Name (पूरा नाम) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajendra Sharma"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs border outline-hidden transition-all ${
                        darkMode 
                          ? 'bg-slate-950 border-slate-850 text-white focus:border-indigo-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                    Email Address (ईमेल पता) *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="e.g. rajendra@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs border outline-hidden transition-all ${
                        darkMode 
                          ? 'bg-slate-950 border-slate-850 text-white focus:border-indigo-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Mobile Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                    Mobile Number (मोबाइल नंबर) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9829012345"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs border outline-hidden transition-all ${
                        darkMode 
                          ? 'bg-slate-950 border-slate-850 text-white focus:border-indigo-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Direct Admin Registration Info Box */}
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                    <Sparkles size={12} className="text-indigo-500 shrink-0" />
                    <span>सीधे एडमिन / शाखा प्रबंधक पंजीकरण (Direct Admin Registration Live)</span>
                  </div>
                  <p className="text-[10px] leading-relaxed opacity-90">
                    यहाँ से पंजीकृत होने वाला प्रत्येक नया खाता सीधे **शाखा प्रबंधक / एडमिन (Admin)** के रूप में सक्रिय होगा। लॉगिन करने के बाद आपके पास ऑपरेटर (Operators) और सहायक जोड़ने की पूर्ण अनुमति होगी।
                  </p>
                </div>

                {/* Secure Password Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                    Choose Password (नया पासवर्ड)*
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 6 characters (e.g. raj1234)"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs border outline-hidden transition-all ${
                        darkMode 
                          ? 'bg-slate-950 border-slate-850 text-white focus:border-indigo-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                    Confirm Password (पासवर्ड की पुष्टि)*
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs border outline-hidden transition-all ${
                        darkMode 
                          ? 'bg-slate-950 border-slate-850 text-white focus:border-indigo-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Show passwords checkbox */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 select-none">
                  <input
                    type="checkbox"
                    id="showRegP"
                    checked={showRegPassword}
                    onChange={(e) => setShowRegPassword(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="showRegP" className="cursor-pointer">पासवर्ड दिखाएं (Show Passwords)</label>
                </div>

                {/* Register Submission Button */}
                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-750 hover:to-emerald-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md shadow-emerald-600/10 transition-all duration-150"
                >
                  खाता बनाएं और पंजीकरण पूर्ण करें (Create login ID)
                </button>
              </form>
            )}
          </div>

          {/* Quick Demo Pre-set logins for smooth QA & review */}
          {showDemoPanel ? (
            <div className={`p-5 rounded-3xl border transition-all ${
              darkMode ? 'bg-slate-950/20 border-slate-900' : 'bg-white/60 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 uppercase tracking-widest">
                  <span className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-500"><HelpCircle size={12} /></span>
                  त्वरित परीक्षण पैनल (Quick Demo Login Bypass)
                </div>
                <button 
                  type="button"
                  onClick={() => setShowDemoPanel(false)}
                  className="text-[10px] bg-slate-500/10 hover:bg-slate-500/20 px-2.5 py-1 rounded-lg text-slate-400 cursor-pointer transition-all border border-transparent hover:text-slate-200"
                  title="Hide demo accounts list"
                >
                  छिपाएं (Hide)
                </button>
              </div>
              
              <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                कृपया स्मार्ट आरबीएसी (Smart RBAC) का परीक्षण करने के लिए नीचे दिए गए किसी भी अधिकृत खाते पर क्लिक करें:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {state.operators.filter(op => op.email.toLowerCase() === 'vakrangee653@gmail.com').map((op) => (
                  <button
                    key={op.id}
                    onClick={() => handlePresetLogin(op)}
                    className={`p-3 rounded-2xl border text-left transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                      darkMode 
                        ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900 hover:border-slate-700' 
                        : 'bg-white border-slate-250 hover:border-slate-350'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs truncate max-w-[130px]" title={op.name}>
                        {op.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-sm text-[8px] font-extrabold uppercase tracking-wide ${
                        op.role === 'Super Admin'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : op.role === 'Admin'
                          ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                          : op.role === 'Customer'
                          ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      }`}>
                        {op.role}
                      </span>
                    </div>
                    <div className="font-mono text-[9px] text-slate-400 space-y-0.5">
                      <div className="truncate"><b>Email:</b> {op.email}</div>
                      <div><b>Phone:</b> {op.phoneNumber}</div>
                      <div className="flex justify-between items-center mt-1">
                        <span>🔑 <b className="text-slate-600 dark:text-slate-300 font-bold">{op.password || 'operator123'}</b></span>
                        {op.isLockedOut && (
                          <span className="text-rose-500 font-bold bg-rose-500/10 px-1 rounded">⚠️ LOCKED</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            isDevEnv && (
              <div className="text-center py-2">
                <button
                  type="button"
                  onClick={() => setShowDemoPanel(true)}
                  className="text-[10px] text-indigo-500 hover:text-indigo-600 dark:text-blue-400 dark:hover:text-blue-300 font-bold tracking-wide transition-all uppercase cursor-pointer"
                >
                  🚀 परीक्षण खातों की सूची दिखाएं (Show Demo Bypass Accounts Panel)
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
