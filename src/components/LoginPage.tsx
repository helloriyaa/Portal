import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { createUserDoc, getUserDoc } from '../firebase/services';
import { useApp } from '../contexts/AppContext';
import { Mail, Lock, User, ShieldCheck, HelpCircle, Sun, Moon, ArrowLeft, Check, Sparkles, BookOpen, Clock, AlertCircle, X } from 'lucide-react';
import { UserDoc } from '../types';

export default function LoginPage() {
  const { activeTab, setTab, setCurrentUserByUid, approvalPopup, setApprovalPopup } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>(
    activeTab === 'auth-register' ? 'register' : 'login'
  );
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Account, Step 2: Role selection for Register

  // Keep mode in sync with activeTab when navigation happens
  useEffect(() => {
    setApprovalPopup(null);
    if (activeTab === 'auth-register') {
      setMode('register');
      setStep(1);
    } else if (activeTab === 'auth-login') {
      setMode('login');
    }
  }, [activeTab]);
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'intern' | 'hr' | 'mentor'>('intern');
  const [termsAccepted, setTermsCheck] = useState(false);

  // Statuses
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle standard login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if they are approved
      const userDoc = await getUserDoc(userCred.user.uid);
      if (userDoc && (userDoc.role === 'hr' || userDoc.role === 'mentor') && !userDoc.approved) {
        await signOut(auth);
        setApprovalPopup('under-request');
        setError('Your account is currently awaiting admin approval.');
        setLoading(false);
        return;
      }

      setSuccess('Sign in successful! Redirecting...');
      // Auth state listener in AppContext will handle routing
    } catch (err: any) {
      console.error("Standard auth failed, checking for seeded demo user:", err);
      
      // If authentication fails, check if this is an existing seeded/demo account that is in Firestore but not in Firebase Auth
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email.trim()));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const oldUserDocSnap = snap.docs[0];
          const oldUserDoc = oldUserDocSnap.data() as UserDoc;
          const oldUid = oldUserDocSnap.id;
          
          // Auto-register this seeded user with the supplied password in Firebase Auth!
          const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          const newUid = userCred.user.uid;
          
          // Copy user data to the new real UID
          const newUserDoc: UserDoc = {
            ...oldUserDoc,
            uid: newUid
          };
          
          await setDoc(doc(db, 'users', newUid), newUserDoc);
          
          // Delete old mock UID user document
          await deleteDoc(doc(db, 'users', oldUid));
          
          // Update any references in other collections
          if (oldUserDoc.role === 'hr') {
            // Update postedBy in internships
            const internshipsRef = collection(db, 'internships');
            const iSnap = await getDocs(query(internshipsRef, where('postedBy', '==', oldUid)));
            for (const iDoc of iSnap.docs) {
              await updateDoc(doc(db, 'internships', iDoc.id), { postedBy: newUid });
            }
          } else if (oldUserDoc.role === 'mentor') {
            // Update mentorId in groups
            const groupsRef = collection(db, 'groups');
            const gSnap = await getDocs(query(groupsRef, where('mentorId', '==', oldUid)));
            for (const gDoc of gSnap.docs) {
              await updateDoc(doc(db, 'groups', gDoc.id), { mentorId: newUid });
            }
          } else if (oldUserDoc.role === 'intern') {
            // Update internId in applications
            const appsRef = collection(db, 'applications');
            const aSnap = await getDocs(query(appsRef, where('internId', '==', oldUid)));
            for (const aDoc of aSnap.docs) {
              await updateDoc(doc(db, 'applications', aDoc.id), { internId: newUid });
            }
            
            // Update studentIds in groups
            const groupsRef = collection(db, 'groups');
            const gSnap = await getDocs(groupsRef);
            for (const gDoc of gSnap.docs) {
              const gData = gDoc.data();
              if (gData.studentIds && gData.studentIds.includes(oldUid)) {
                const updatedStudentIds = gData.studentIds.map((id: string) => id === oldUid ? newUid : id);
                await updateDoc(doc(db, 'groups', gDoc.id), { studentIds: updatedStudentIds });
              }
            }
          }
          
          // Check if this newly migrated user is approved
          if ((newUserDoc.role === 'hr' || newUserDoc.role === 'mentor') && !newUserDoc.approved) {
            await signOut(auth);
            setApprovalPopup('under-request');
            setError('Your account is currently awaiting admin approval.');
            setLoading(false);
            return;
          }

          setSuccess('Sign in successful! Redirecting...');
          setLoading(false);
          return;
        }
      } catch (migrationErr: any) {
        console.error("Migration error:", migrationErr);
      }
      
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Handle standard registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError('Please accept the Terms of Service & Privacy Policy.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      (window as any).__justRegistered = true;
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      // Create user doc
      await createUserDoc(userCred.user.uid, name, email, role);
      setSuccess(`Account created as ${role.toUpperCase()} successfully!`);
      // Auth listener will handle routing
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCred = await signInWithPopup(auth, provider);
      // Check if user doc exists
      const userDoc = await getUserDoc(userCred.user.uid);
      if (!userDoc) {
        // Create default 'intern' role
        await createUserDoc(userCred.user.uid, userCred.user.displayName || 'Google User', userCred.user.email || '', 'intern');
      }
      setSuccess('Google login successful!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Auth is disabled or restricted in this frame.');
    } finally {
      setLoading(false);
    }
  };

  // Step validation
  const validateStep1 = () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setStep(2);
  };

  // Quick Demo Bypass Logins (Absolute Magic for Testing and Previews!)
  const handleQuickLogin = async (roleType: 'intern' | 'hr' | 'mentor' | 'admin') => {
    const roleUids = {
      intern: "student1_demo_uid",
      hr: "hr1_demo_uid",
      mentor: "mentor1_demo_uid",
      admin: "admin_demo_uid"
    };
    setError('');
    setLoading(true);
    try {
      await setCurrentUserByUid(roleUids[roleType]);
    } catch (err) {
      setError('Failed to switch to demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      
      {/* Left Column (Branding Side) */}
      <aside className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-white/5 bg-[#0B1120]/40">
        {/* Background Decorative Mesh / Orbs */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-[#4F46E5]/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#06B6D4]/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer z-10" onClick={() => setTab('landing')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-display text-xl font-extrabold tracking-tight">Internship<span className="text-pink-400">Portal</span></div>
            <div className="text-[10px] text-white/50 tracking-widest uppercase">Where careers begin</div>
          </div>
        </div>

        {/* Brand Hero Message */}
        <div className="relative z-10 max-w-lg my-auto">
          <h1 className="font-display text-5xl font-extrabold leading-tight mb-6">
            Launch your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-pink-300 to-cyan-300">dream career</span> today.
          </h1>
          <p className="text-gray-400 text-base leading-relaxed mb-8">
            Connect with top companies, discover internships tailored to your skills, and take the next big step in your professional journey.
          </p>

          {/* Testimonial Box */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
            <p className="text-sm text-white/90 italic mb-4">
              "Found my dream internship at Google in just 2 weeks. The platform is beautifully designed, extremely secure and easy to use."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold text-xs">
                SM
              </div>
              <div>
                <div className="text-sm font-semibold">Sarah Mitchell</div>
                <div className="text-xs text-gray-500">CS Student • Stanford</div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Column Footer */}
        <div className="text-[11px] text-gray-500 z-10">
          © 2026 InternshipPortal. All rights reserved.
        </div>
      </aside>

      {/* Right Column (Forms & Demo Accounts Bypass) */}
      <main className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative overflow-y-auto">
        
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setTab('landing')}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>

        {/* Central Core Panel */}
        <div className="my-auto py-12 max-w-md w-full mx-auto">
          


          {/* Mode Tabs */}
          <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-8">
            <button 
              onClick={() => { setTab('auth-login'); setMode('login'); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'login' ? 'bg-[#4F46E5] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setTab('auth-register'); setMode('register'); setStep(1); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'register' ? 'bg-[#4F46E5] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              Create Account
            </button>
          </div>

          {/* Error and Success Indicators */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-semibold">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-semibold">
              {success}
            </div>
          )}

          {/* ================= LOGIN MODE ================= */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight mb-1">Welcome back</h2>
                <p className="text-gray-400 text-sm">Enter your credentials to access your dashboard.</p>
              </div>

              {/* Google Login button */}
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all text-white"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.6h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4c0,-0.34 -0.03,-0.68 -0.08,-1z" fill="#4285F4" />
                  <path d="M12,20.62c2.6,0 4.78,-0.86 6.38,-2.3l-3.3,-2.6c-0.92,0.62 -2.1,1 -3.08,1 -2.38,0 -4.41,-1.61 -5.13,-3.78H3.34v2.68C4.94,18.73 8.24,20.62 12,20.62z" fill="#34A853" />
                  <path d="M6.87,12.94c-0.18,-0.54 -0.29,-1.11 -0.29,-1.7s0.11,-1.16 0.29,-1.7V6.86H3.34c-0.62,1.24 -0.97,2.64 -0.97,4.1s0.35,2.86 0.97,4.1l3.53,-2.72z" fill="#FBBC05" />
                  <path d="M12,6.38c1.41,0 2.68,0.49 3.68,1.44l2.72,-2.72C16.78,3.53 14.6,2.7 12,2.7c-3.76,0 -7.06,1.89 -8.66,4.78l3.53,2.72c0.72,-2.17 2.75,-3.78 5.13,-3.78z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/5"></div>
                <span className="text-[10px] uppercase text-gray-500 tracking-wider font-semibold">or email sign in</span>
                <div className="flex-1 h-px bg-white/5"></div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input 
                    type="email" 
                    placeholder="you@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10 transition-all text-white"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Password</label>
                  <span className="text-xs text-[#4F46E5] hover:underline cursor-pointer">Forgot?</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10 transition-all text-white"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all flex items-center justify-center"
              >
                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
              </button>
            </form>
          )}

          {/* ================= REGISTER MODE ================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-6">
              
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${step === 1 ? 'text-[#4F46E5]' : 'text-gray-500'}`}>1. Account</span>
                <div className="h-px bg-white/10 flex-1 mx-3"></div>
                <span className={`text-xs font-bold uppercase tracking-wider ${step === 2 ? 'text-[#4F46E5]' : 'text-gray-500'}`}>2. Select Role</span>
              </div>

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-display text-3xl font-bold tracking-tight mb-1">Create Account</h2>
                    <p className="text-gray-400 text-sm">Join the platform to discover world-class matches.</p>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="John Doe" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#4F46E5] transition-all text-white"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input 
                        type="email" 
                        placeholder="you@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#4F46E5] transition-all text-white"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input 
                        type="password" 
                        placeholder="Min 6 characters" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#4F46E5] transition-all text-white"
                      />
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#4F46E5] transition-all text-white"
                      />
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={validateStep1}
                    className="w-full py-3.5 bg-[#4F46E5] text-white font-semibold rounded-xl hover:opacity-90 transition-all"
                  >
                    Continue to Role Selection
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-display text-2xl font-bold mb-1">Choose your role</h2>
                    <p className="text-gray-400 text-sm">Roles cannot be changed once the account is created.</p>
                  </div>

                  {/* Role Option Toggle */}
                  <div className="grid grid-cols-3 gap-2">
                    <div 
                      onClick={() => setRole('intern')}
                      className={`p-4 border-2 rounded-2xl transition-all cursor-pointer text-center flex flex-col items-center justify-center ${role === 'intern' ? 'border-[#4F46E5] bg-gradient-to-br from-[#4F46E5]/20 to-[#6366F1]/15 text-white' : 'border-white/10 bg-white/5 hover:border-[#4F46E5]/40 text-gray-400'}`}
                    >
                      <User className={`w-6 h-6 mb-2 ${role === 'intern' ? 'text-white' : 'text-gray-500'}`} />
                      <div className="font-bold text-xs leading-tight mb-1 text-white">Intern</div>
                      <p className="text-[9px] text-gray-400 leading-tight">Apply & complete projects</p>
                    </div>

                    <div 
                      onClick={() => setRole('hr')}
                      className={`p-4 border-2 rounded-2xl transition-all cursor-pointer text-center flex flex-col items-center justify-center ${role === 'hr' ? 'border-[#4F46E5] bg-gradient-to-br from-[#4F46E5]/20 to-[#6366F1]/15 text-white' : 'border-white/10 bg-white/5 hover:border-[#4F46E5]/40 text-gray-400'}`}
                    >
                      <ShieldCheck className={`w-6 h-6 mb-2 ${role === 'hr' ? 'text-white' : 'text-gray-500'}`} />
                      <div className="font-bold text-xs leading-tight mb-1 text-white">HR Admin</div>
                      <p className="text-[9px] text-gray-400 leading-tight">Manage & hire interns</p>
                    </div>

                    <div 
                      onClick={() => setRole('mentor')}
                      className={`p-4 border-2 rounded-2xl transition-all cursor-pointer text-center flex flex-col items-center justify-center ${role === 'mentor' ? 'border-[#4F46E5] bg-gradient-to-br from-[#4F46E5]/20 to-[#6366F1]/15 text-white' : 'border-white/10 bg-white/5 hover:border-[#4F46E5]/40 text-gray-400'}`}
                    >
                      <BookOpen className={`w-6 h-6 mb-2 ${role === 'mentor' ? 'text-white' : 'text-gray-500'}`} />
                      <div className="font-bold text-xs leading-tight mb-1 text-white">Mentor</div>
                      <p className="text-[9px] text-gray-400 leading-tight">Guide, review & rate work</p>
                    </div>
                  </div>

                  {/* Terms */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={termsAccepted}
                      onChange={(e) => setTermsCheck(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded bg-white/5 border border-white/10 accent-[#4F46E5]" 
                    />
                    <span className="text-xs text-gray-400">
                      I agree to the <span className="text-[#4F46E5] hover:underline">Terms of Service</span> and <span className="text-[#4F46E5] hover:underline">Privacy Policy</span>.
                    </span>
                  </label>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 border border-white/20 hover:bg-white/5 rounded-xl text-xs font-semibold"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleRegister}
                      disabled={loading}
                      className="flex-1 py-3.5 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                    >
                      {loading ? "Creating..." : "Create Account"}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')} className="font-semibold text-indigo-600 hover:underline bg-transparent border-none cursor-pointer">Sign in</button>
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 lg:px-8 py-5 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            © 2026 InternshipPortal. All rights reserved. · <a href="#" className="hover:text-indigo-600">Privacy</a> · <a href="#" className="hover:text-indigo-600">Terms</a>
          </p>
        </div>
      </main>

      {/* Mini Pop-up at Bottom Right Corner */}
      <AnimatePresence>
        {approvalPopup && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex gap-4 overflow-hidden"
          >
            {/* Glowing border effects */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${approvalPopup === 'waiting' ? 'from-amber-500 to-yellow-400' : 'from-indigo-500 to-purple-400'}`} />
            
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${approvalPopup === 'waiting' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
              {approvalPopup === 'waiting' ? (
                <Clock className="w-5 h-5 animate-pulse" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white mb-1">
                {approvalPopup === 'waiting' ? 'Waiting for Approval' : 'Approval Under Request'}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                {approvalPopup === 'waiting' 
                  ? 'Your profile registration has been submitted. An admin will review and approve your account shortly.'
                  : 'This account is currently awaiting administrative approval. Please check back later.'}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setApprovalPopup(null)}
              className="flex-shrink-0 self-start text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

