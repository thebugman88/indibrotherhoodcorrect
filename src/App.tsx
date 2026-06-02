import React, { useState, useEffect, useRef, Component, ReactNode } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link,
  useNavigate
} from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  Lock, 
  Mic2, 
  Zap, 
  ShieldCheck, 
  TrendingUp,
  X,
  Menu,
  ChevronRight,
  User,
  Star,
  DollarSign,
  Trophy,
  LayoutDashboard,
  Sparkles,
  BarChart3,
  Feather,
  Heart,
  Video,
  Disc,
  Radio,
  Save,
  Settings,
  Shield,
  Info,
  Award,
  Cpu,
  Coffee,
  ExternalLink,
  Play,
  Gavel,
  Scale,
  UploadCloud,
  Check,
  ChevronLeft,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  History,
  ShoppingBag,
  Tag,
  Activity,
  Binary,
  Terminal,
  ShieldAlert,
  Globe,
  Bell,
  Briefcase
} from 'lucide-react';
import StorePage from './components/StorePage';
import LoungePage from './components/LoungePage';
import IBHMeetingRoom from './components/IBHMeetingRoom';
import SemanticLab from './components/SemanticLab';
import AdminControlRoom from './components/AdminControlRoom';
import GlobalNotification from './components/GlobalNotification';
import { SentinelBoundary, logBreadcrumb } from './lib/sentinel';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from './lib/firebase';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp, 
  getDocFromServer,
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  increment,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import TrapRoom from './components/TrapRoom';
import ArtistManager from './components/ArtistManager';
import MasteringSuite from './components/MasteringSuite';
import HitAnalyzer from './components/HitAnalyzer';
import LyricPro from './components/LyricPro';
import JudgmentPage from './components/JudgmentPage';
import TeaserPage from './components/TeaserPage';
import VaultGatekeeper from './components/VaultGatekeeper';
import CollectiveDashboard from './components/CollectiveDashboard';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { TriviaCenter } from './components/TriviaCenter';
import NotificationCenter from './components/NotificationCenter';
import toast, { Toaster } from 'react-hot-toast';
import K7Pool from './components/K7Pool';

// --- Components ---
const SUPER_ADMINS = ["xchristopherrayx@gmail.com", "c.e.o@indiebrotherhood.com"];
const isSuperAdmin = (email?: string | null) => {
  if (!email) return false;
  const userEmail = email.toLowerCase();
  return SUPER_ADMINS.some(adminEmail => adminEmail.toLowerCase() === userEmail);
};
const ADMOB_AD_UNIT_ID = import.meta.env.VITE_ADMOB_AD_UNIT_ID || "ca-app-pub-7110839583480398/9597579600";

const getNavItems = (userProfile: any) => [
  { label: "Profile", icon: User, to: "/profile" },
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "ML Lab", icon: Binary, to: "/ml-lab" },
  { label: "K7 Pool", icon: Cpu, to: "/k7-syndicate" },
  { label: "Collectives", icon: Users, to: "/collectives" },
  ...(isSuperAdmin(userProfile?.email) ? [
    { label: "Control Room", icon: Terminal, to: "/control-room" }
  ] : []),
  { label: "The Judgment", icon: Gavel, to: "/judgment" },
  { label: "IBH Meeting", icon: Users, to: "/ibh" },
  { label: "The Lounge", icon: Coffee, to: "/lounge" },
  { label: "Mastering Suite", icon: Music, to: "/mastering" },
  { label: "Lyric Pro", icon: Feather, to: "/lyrics" },
  { label: "Hit Analyzer", icon: Zap, to: "/analysis" },
  { label: "Artist Assistant", icon: Briefcase, to: "/assistant" },
  { label: "The 99¢ Store", icon: ShoppingBag, to: "/store" }
];

const Button = ({ 
  children, 
  className = "", 
  variant = "primary", 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'promo' | '3d' }) => {
  const base = "px-8 py-4 font-bold transition-all active:scale-95 text-center cursor-pointer";
  const variants = {
    primary: "bg-[#24b324] text-black hover:bg-[#2ee62e]",
    secondary: "bg-white text-black hover:bg-gray-200",
    outline: "border-2 border-[#24b324] text-[#24b324] hover:bg-[#24b324] hover:text-black",
    promo: "bg-black text-[#24b324] border-2 border-[#24b324] hover:bg-[#24b324] hover:text-black",
    '3d': "bg-[#24b324] text-black border-b-4 border-black/30 hover:border-b-2 hover:translate-y-[2px]"
  };
  
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Knob = ({ level = 0, label = "GAIN" }: { level?: number, label?: string }) => {
  const rotation = -135 + (level * 2.7); // -135 to 135 degrees
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16 rounded-full bg-[#333] border-4 border-[#111] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_2px_4px_rgba(255,255,255,0.1)] flex items-center justify-center">
        <motion.div 
          style={{ rotate: rotation }}
          className="w-1.5 h-6 bg-[#24b324] rounded-full absolute top-1 origin-bottom"
        />
        <div className="w-8 h-8 rounded-full bg-[#222] border-2 border-[#111] shadow-inner" />
      </div>
      <span className="text-[10px] font-black uppercase text-white/40 mt-2 tracking-widest">{label}</span>
    </div>
  );
};

const SectionTitle = ({ children, slogan }: { children: React.ReactNode, slogan?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center mb-12"
  >
    <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.8] drop-shadow-[0_0_25px_rgba(217,225,43,0.3)]">
      {children}
    </h1>
    {slogan && (
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xl md:text-2xl font-medium mt-4 text-[#24b324] uppercase tracking-widest italic"
      >
        {slogan}
      </motion.p>
    )}
  </motion.div>
);

const LivePulse = () => {
  const [activity, setActivity] = useState<{msg: string, time: string}>({ msg: "Initializing Node...", time: "00:00:00" });
  const activities = [
    "New Master Session: Berlin Node",
    "Sentinel Scanner: No Threats Detected",
    "Lyric Sync: Successful Uplink",
    "Brotherhood Growth: +1 Legacy Member",
    "ML Lab: Semantic Analysis Complete",
    "Audio Forge: High Fidelity Rendered",
    "Privacy Guard: IP Data Anonymized",
    "System Alert: Maintenance Postponed",
    "Visualizer: 4K Sequence Exported"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const randomMsg = activities[Math.floor(Math.random() * activities.length)];
      setActivity({
        msg: randomMsg,
        time: new Date().toLocaleTimeString()
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/80 border-y border-[#24b324]/30 py-2 px-6 backdrop-blur-sm flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em]">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]" />
        <span className="text-white/60">LIVE BROADCAST:</span>
        <AnimatePresence mode="wait">
          <motion.span 
            key={activity.msg}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="text-[#24b324] font-black"
          >
            {activity.msg}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="hidden sm:block text-white/40">[{activity.time}]</div>
    </div>
  );
};

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
];

const LanguageSelectionModal = ({ 
  onSelect, 
  current 
}: { 
  onSelect: (lang: string) => void, 
  current: string 
}) => {
  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black border-4 border-[#24b324] p-10 max-w-2xl w-full relative overflow-hidden"
      >
        {/* Background Decals */}
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none select-none">
          <Globe size={160} />
        </div>

        <div className="relative z-10 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[#24b324]">ESTABLISH DOMINANCE</h2>
            <p className="text-white/40 uppercase font-black text-[10px] tracking-[0.4em]">Select Your Linguistic Sector</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => onSelect(lang.code)}
                className={`p-6 border-2 transition-all flex flex-col items-center gap-2 group ${
                  current === lang.code 
                    ? 'border-[#24b324] bg-[#24b324]/10 shadow-[0_0_20px_rgba(217,225,43,0.2)]' 
                    : 'border-white/5 hover:border-white/20 bg-white/5'
                }`}
              >
                <div className={`text-sm font-black italic uppercase italic tracking-tighter ${current === lang.code ? 'text-[#24b324]' : 'text-white/40'}`}>
                  {lang.name}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-widest ${current === lang.code ? 'text-white' : 'text-white/20'}`}>
                  {lang.native}
                </div>
                {current === lang.code && (
                  <motion.div layoutId="active-lang" className="mt-2 text-[#24b324]">
                    <CheckCircle size={16} />
                  </motion.div>
                )}
              </button>
            ))}
          </div>

          <div className="bg-black/60 p-4 border border-white/10 text-center backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
             <p className="text-[9px] font-black italic uppercase tracking-widest text-[#24b324]/60 leading-relaxed">
               AI SYSTEM WILL ADAPT ALL CREATIVE OUTPUTS TO YOUR SELECTED DIALECT.
               <br/>ESTABLISH IDENTITY NOW.
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


// --- Pages ---

const LandingPage = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [promoCode, setPromoCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [selectedTier, setSelectedTier] = useState<string | null>(() => localStorage.getItem('pendingTier'));
  const selectedTierRef = useRef(selectedTier);
  useEffect(() => { selectedTierRef.current = selectedTier; }, [selectedTier]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [showDemo, setShowDemo] = useState(false);
  const navigate = useNavigate();

  const handleAdFinished = async () => {
    setIsWatchingAd(false);
    logBreadcrumb("REWARDED_AD_FINISHED");
    if (user) {
      try {
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await transaction.get(userRef);
          
          if (userSnap.exists()) {
            const currentPoints = userSnap.data().points || 0;
            const currentCredits = userSnap.data().credits || 0;
            
            transaction.update(userRef, {
              points: currentPoints + 100,
              credits: currentCredits + 1
            });
          }
        });
        alert("ERA REWARD: +100 POINTS & +1 CREDIT GRANTED.");
      } catch (e) {
        console.error("Ad reward transaction failed:", e);
        handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
      }
    } else {
      alert("AD COMPLETE. LOGIN TO CLAIM YOUR POINTS.");
    }
  };

  const startRewardedAd = () => {
    setIsWatchingAd(true);
    setAdProgress(0);
    logBreadcrumb(`REWARDED_AD_STARTED (ID: ${ADMOB_AD_UNIT_ID})`);
    const interval = setInterval(() => {
      setAdProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(handleAdFinished, 500);
          return 100;
        }
        return prev + (100 / 15); // 15 second demo
      });
    }, 1000);
  };

  useEffect(() => {
    if (selectedTier) {
      localStorage.setItem('pendingTier', selectedTier);
    } else {
      localStorage.removeItem('pendingTier');
    }
  }, [selectedTier]);

  useEffect(() => {
    let isMounted = true;
    logBreadcrumb("LANDING_PAGE_MOUNT");
    
    // Initial sync check
    if (auth.currentUser) {
       logBreadcrumb(`INITIAL_AUTH_DETECTED: ${auth.currentUser.email}`);
       setUser(auth.currentUser);
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!isMounted) return;
      setUser(u);
      
      if (u) {
        logBreadcrumb(`AUTH_CHANGE_DETECTED: ${u.email}`);
        setIsProcessing(true);
        const userRef = doc(db, 'users', u.uid);
        
        try {
          // Hardcheck for Super Admin early
          const isOwner = isSuperAdmin(u.email);
          
          let userIp = 'unknown';
          try {
            const ipRes = await fetch('https://api64.ipify.org?format=json');
            const ipData = await ipRes.json();
            userIp = ipData.ip;
          } catch (e) {
            console.warn("IP tracking failed:", e);
          }

          // ATOMIC SYNC START
          await runTransaction(db, async (transaction) => {
             const userSnap = await transaction.get(userRef);
             
             if (userSnap.exists()) {
                const data = userSnap.data();
                const currentTier = selectedTierRef.current;
                
                let updates: any = {};
                
                // Owner Privilege Check - ensure even on direct domain it locks in
                if (isOwner && data.subscriptionTier !== 'admin') {
                   updates.subscriptionTier = 'admin';
                   updates.credits = 999999;
                   updates.level = 99;
                   updates.points = 1000000;
                   updates.termsAccepted = true;
                }

                // Tier Upgrade logic
                if (currentTier && currentTier !== 'promo' && data.subscriptionTier !== currentTier) {
                   updates.subscriptionTier = currentTier === 'join' ? 'free' : currentTier;
                   updates.credits = currentTier === 'supreme' ? 50 : (currentTier === 'legacy' ? 30 : (currentTier === 'basic' ? 20 : 0));
                   updates.termsAccepted = true;
                }
                
                if (Object.keys(updates).length > 0) {
                   transaction.update(userRef, { ...updates, lastActive: new Date().toISOString() });
                } else {
                   transaction.update(userRef, { lastActive: new Date().toISOString() });
                }
             } else {
                // Initial creation inside transaction
                const tier = localStorage.getItem('pendingTier') || selectedTier || 'join';
                const isOwner = isSuperAdmin(u.email);
                let initialTier = isOwner ? 'admin' : (tier === 'join' ? 'free' : (tier === 'promo' ? 'none' : tier));
                
                // IP Restriction Check for Promo/Free
                let creditsToGrant = 0;
                if (!isOwner) {
                  if (initialTier === 'supreme') creditsToGrant = 50;
                  else if (initialTier === 'legacy') creditsToGrant = 30;
                  else if (initialTier === 'basic') creditsToGrant = 20;
                  else if (initialTier === 'free' || tier === 'join') creditsToGrant = 10;
                }
                
                // Strict IP Check for non-paid tiers
                if (!isOwner && (initialTier === 'free' || tier === 'promo')) {
                   const fingerprintRef = doc(db, 'promo_fingerprints', userIp.replace(/\./g, '_')); // FireStore IDs can't have dots in some contexts, though they usually can. Safe mapping.
                   const fingerprintSnap = await transaction.get(fingerprintRef);
                   
                   if (fingerprintSnap.exists()) {
                      creditsToGrant = 0; // Fraud prevention: IP already claimed promo
                   } else if (creditsToGrant > 0) {
                      transaction.set(fingerprintRef, { 
                        uid: u.uid, 
                        claimedAt: new Date().toISOString(),
                        email: u.email 
                      });
                   }
                }

                const myInviteCode = "REF-" + u.uid.substring(0,6).toUpperCase();
                
                transaction.set(userRef, {
                  uid: u.uid,
                  email: u.email,
                  subscriptionTier: initialTier,
                  credits: isOwner ? 999999 : creditsToGrant,
                  points: 0,
                  level: 1,
                  createdAt: new Date().toISOString(),
                  lastActive: new Date().toISOString(),
                  registrationIp: userIp,
                  termsAccepted: isOwner || (tier !== 'promo' && tier !== 'join'),
                  promoUsed: tier === 'promo' || (initialTier === 'free' && creditsToGrant > 0),
                  language: 'en',
                  inviteCode: myInviteCode
                });
                
                // Note: Secondary collections (invites) will be handled after transaction success
             }
          });
          
          // Re-fetch snapshots if needed or simply navigate
          navigate('/dashboard');
        } catch (err) {
          logBreadcrumb(`AUTH_ERROR_RECOVERY: ${err instanceof Error ? err.message : 'Unknown'}`);
          console.error("Setup Node Error:", err);
          navigate('/dashboard');
        } finally {
          if (isMounted) setIsProcessing(false);
        }
      } else {
        if (isMounted) setIsProcessing(false);
      }

    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [navigate]); // Stable dependencies to prevent re-subscriptions

  const handleSignIn = async () => {
    logBreadcrumb("SIGN_IN_POPUP_TRIGGERED");
    console.log("Triggering Google Sign In Popup...");
    try {
      if (!selectedTier) setSelectedTier('join');
      
      // Iframe detection for debugging
      if (window.self !== window.top) {
        console.warn("App is running in an iframe. If the popup fails or flickers, try opening the app in a new tab.");
      }

      const result = await signInWithPopup(auth, googleProvider);
      console.log("Sign in successful:", result.user.email);
      setShowAuth(false);
      toast.success("SIGN IN SUCCESSFUL. WELCOME TO THE BROTHERHOOD.");
    } catch (err: any) {
      console.error("Critical Auth Error:", err);
      let errorMsg = `AUTH ERROR: ${err.message}`;
      
      if (err.code === 'auth/unauthorized-domain') {
        errorMsg = "DOMAIN NOT AUTHORIZED: You must add " + window.location.hostname + " to Authorized Domains in your Firebase Console (Auth > Settings).";
        toast.error(errorMsg, { duration: 10000, position: 'top-center' });
      } else if (err.code === 'auth/popup-blocked') {
        errorMsg = "POPUP BLOCKED: Your browser blocked the sign-in window. Please enable popups or try opening the app in a new window.";
        toast.error(errorMsg);
      } else if (err.code === 'auth/cancelled-popup-request') {
        console.log("Popup request cancelled.");
      } else if (err.code === 'auth/popup-closed-by-user') {
        toast.error("Sign-in cancelled. Please complete the process in the popup.");
      } else {
        toast.error(`ERROR [${err.code}]: ${err.message}`);
      }
      
      // Log refined error info
      logBreadcrumb(`AUTH_ERROR_${err.code}`);
    }
  };

  const handleLanguageSelect = async (lang: string) => {
    setSelectedLanguage(lang);
    if (user) {
      setIsProcessing(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { language: lang });
        setShowLanguageModal(false);
        navigate('/dashboard');
      } catch (err) {
        console.error("Language sync error:", err);
      } finally {
        setIsProcessing(false);
      }
    }
  };
  const startPromoFlow = async () => {
    const codes = ['rapfame', 'critter', 'pensacola', 'thebugman88'];
    if (codes.includes(promoCode.toLowerCase())) {
      setIsProcessing(true);
      try {
        const ipRes = await fetch('https://api64.ipify.org?format=json');
        const { ip } = await ipRes.json();
        const ipRef = doc(db, 'promo_ips', ip);
        const ipSnap = await getDoc(ipRef);
        
        if (ipSnap.exists()) {
          setError("PROMO FREQUENCY PREVIOUSLY ACCESSED FROM THIS NODE");
          setTimeout(() => setError(""), 5000);
          return;
        }

        setSelectedTier('promo');
        if (user) {
          setShowPromoModal(true);
        } else {
          setShowAuth(true);
        }
      } catch (err) {
        console.error("IP Fetch Error:", err);
        // Fallback or just allow? Better to allow if service is down, or block?
        // Let's block for maximum security.
        setError("NODE SIGNAL VERIFICATION FAILED. RETRY.");
        setTimeout(() => setError(""), 3000);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setError("Invalid Promo Code");
      setTimeout(() => setError(""), 3000);
    }
  };

  const acceptPromoTerms = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      // Re-verify IP inside the actual grant too for maximum safety
      const ipRes = await fetch('https://api64.ipify.org?format=json');
      const { ip } = await ipRes.json();
      const ipRef = doc(db, 'promo_ips', ip);
      const ipSnap = await getDoc(ipRef);
      
      if (ipSnap.exists()) {
        setError("IP NODE ALREADY VERIFIED FOR PROMO ACCESS");
        setTimeout(() => setError(""), 5000);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        subscriptionTier: 'promo',
        credits: 10,
        promoUsed: true,
        promoExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        termsAccepted: true
      });

      // Record the IP lock
      await setDoc(ipRef, {
        userId: user.uid,
        email: user.email,
        usedAt: new Date().toISOString(),
        code: promoCode
      });

      localStorage.removeItem('pendingTier');
      setSelectedTier(null);
      setShowPromoModal(false);
      navigate('/dashboard');
    } catch (err) {
      console.error("Promo Acceptance Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black text-white font-sans selection:bg-[#24b324] selection:text-black overflow-x-hidden w-full relative">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ 
        backgroundImage: `linear-gradient(#24b324 1px, transparent 1px), linear-gradient(90deg, #24b324 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#1a1a1b] via-transparent to-[#1a1a1b] z-0" />
      
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="mb-8"
          >
            <Music className="text-[#24b324]" size={80} />
          </motion.div>
          <div className="text-center px-6">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-[#24b324]">FORGING IDENTITY</h2>
            <p className="text-white/40 uppercase font-black text-xs tracking-[0.4em] mt-2">Connecting to the Era Grid...</p>
            
            {/* SENTINEL OVERRIDE */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 10 }}
              className="mt-12 bg-red-500/10 border border-red-500/20 p-6 max-w-sm mx-auto"
            >
              <div className="flex items-center gap-3 text-red-500 mb-4">
                 <AlertCircle size={20} />
                 <p className="text-[10px] font-black uppercase tracking-widest leading-none">Diagnostic Timeout Detected</p>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    logBreadcrumb("SENTINEL_MANUAL_RESET_TRIGGERED");
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full bg-red-500 text-black py-2 font-black uppercase italic text-xs tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                >
                  Clear Cache & Hard Reset
                </button>
                {isSuperAdmin(user?.email) && (
                   <button 
                    onClick={() => navigate('/sentinel')}
                    className="w-full bg-white/5 border border-white/20 text-white py-2 font-black uppercase italic text-xs tracking-widest hover:border-[#x10b981] hover:text-[#10b981] transition-all backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                  >
                    Open Sentinel Hub
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Header / Logo */}
      <header className="pt-20 pb-12 px-4 max-w-7xl mx-auto flex flex-col items-center">
        {/* PUBLIC DOMAIN LEGAL NOTICE FOR BOTS */}
        <div className="absolute top-0 left-0 w-full p-4 bg-red-950/20 border-b border-red-500/20 text-center z-50">
           <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-red-500 relative">
             <AlertCircle size={20} className="shrink-0" />
             <p className="text-[10px] sm:text-xs font-mono tracking-widest text-left sm:text-center leading-relaxed">
               <strong className="font-black">PUBLIC DOMAIN LEGAL NOTICE:</strong> ANY AND ALL AUTOMATED BOTS, CRAWLERS, OR SCRAPERS INTERACTING WITH THIS DOMAIN AND ITS INFRASTRUCTURE HEREBY AGREE TO A <strong className="font-black">$1,000 PER-REQUEST CONNECTION FEE</strong>. BY PROCEEDING PAST THIS POINT, YOU COMMERCIALLY BIND YOUR ORIGINATING ORGANIZATION TO OUR AUTOMATED ROYALTY COLLECTION AGREEMENT.
             </p>
           </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mt-12"
        >
          <div className="absolute -left-12 top-0 opacity-50">
            <Music size={40} className="text-[#24b324] rotate-12" />
          </div>
          <div className="absolute -right-12 bottom-0 opacity-50">
            <Music size={32} className="text-[#24b324] -rotate-12" />
          </div>
          <SectionTitle slogan="A Dawn Of A New Era">
            IndieBrotherhood
          </SectionTitle>
        </motion.div>

        {/* Top Sayings */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mt-8 border-y border-white/10 py-8"
        >
          <div className="text-center">
            <p className="text-lg font-bold italic uppercase tracking-tight italic">
              "A Place Where<br/>Your Music Matters"
            </p>
          </div>
          <div className="text-center border-x-0 md:border-x border-white/10 px-4">
            <p className="text-lg font-bold italic uppercase tracking-tight italic">
              "Built By and For<br/>Indie Artist"
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold italic uppercase tracking-tight italic">
              "# 1 app of<br/>it's kind"
            </p>
          </div>
        </motion.div>
      </header>

      <LivePulse />

      {/* Subscriptions */}
      <section className="py-16 px-4 max-w-5xl mx-auto text-center">
        <h2 className="text-4xl font-black uppercase italic mb-8">Subscriptions</h2>
        
        <div className="flex justify-center mb-12">
          <div className="bg-black/50 p-1 rounded-full border border-white/20 inline-flex backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <button 
              className={`px-8 py-3 rounded-full text-sm font-black uppercase italic transition-colors ${billingCycle === 'monthly' ? 'bg-[#24b324] text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button 
              className={`px-8 py-3 rounded-full text-sm font-black uppercase italic transition-colors ${billingCycle === 'yearly' ? 'bg-[#24b324] text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto items-stretch">
          {/* Free */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="border-2 border-white/20 p-8 flex flex-col items-center bg-white/5 backdrop-blur-sm relative shadow-2xl shadow-black/80"
          >
            <h3 className="text-2xl font-black uppercase italic mb-2">Free</h3>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-black text-white">$0</span>
              <span className="text-xl text-white/30">/ forever</span>
            </div>
            <div className="text-[10px] bg-white/10 text-white font-black italic uppercase px-3 py-1 mb-4 opacity-0 cursor-default select-none backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">Spacer</div>
            <p className="text-xs uppercase font-bold text-white/50 tracking-widest mb-6">Community Access</p>
            <ul className="text-xs font-bold text-white/50 mb-8 space-y-2 uppercase tracking-wide text-left self-start mt-auto w-full">
              <li>• Base Tools (Limited)</li>
              <li>• 1 Free Hit Analysis</li>
              <li>• Access to Lounge</li>
            </ul>
            <Button variant="outline" className="w-full mt-auto" onClick={() => { setSelectedTier('free'); setShowAuth(true); }}>Start Free</Button>
          </motion.div>

          {/* Basic */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="border-2 border-white/20 p-8 flex flex-col items-center bg-white/5 backdrop-blur-sm relative shadow-2xl shadow-black/80"
          >
            <h3 className="text-2xl font-black uppercase italic mb-2">Basic</h3>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-black text-[#24b324]">{billingCycle === 'monthly' ? '$4.99' : '$49.99'}</span>
              <span className="text-xl text-white/30 line-through">{billingCycle === 'monthly' ? '$9.99' : '$59.99'}</span>
            </div>
            {billingCycle === 'yearly' && <div className="text-[10px] bg-red-500 text-white font-black italic uppercase px-3 py-1 mb-4">Save $10</div>}
            <p className="text-xs uppercase font-bold text-[#24b324] tracking-widest mb-6">Limited Time Offer</p>
            <ul className="text-xs font-bold text-white/50 mb-8 space-y-2 uppercase tracking-wide text-left self-start mt-auto w-full">
              <li>• 20 Brotherhood Credits</li>
              <li>• Standard Tools</li>
            </ul>
            <Button variant="outline" className="w-full mt-auto" onClick={() => { setSelectedTier('basic'); setShowAuth(true); }}>Get Access</Button>
          </motion.div>

          {/* Legacy */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="border-2 border-[#24b324] p-8 flex flex-col items-center bg-[#24b324]/5 backdrop-blur-sm shadow-[0_0_20px_rgba(217,225,43,0.15)] relative scale-105"
          >
            <div className="absolute -top-3 bg-[#24b324] text-black text-[10px] font-black italic uppercase px-3 py-1 tracking-widest border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">Most Popular</div>
            <h3 className="text-2xl font-black uppercase italic mb-2">Legacy</h3>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-black text-[#24b324]">{billingCycle === 'monthly' ? '$9.99' : '$99.99'}</span>
              <span className="text-xl text-white/30 line-through">{billingCycle === 'monthly' ? '$14.99' : '$119.99'}</span>
            </div>
            {billingCycle === 'yearly' && <div className="text-[10px] bg-red-500 text-white font-black italic uppercase px-3 py-1 mb-4">Save $20</div>}
            <p className="text-xs uppercase font-bold text-[#24b324] tracking-widest mb-6">Limited Time Offer</p>
            <p className="text-[10px] text-[#24b324] font-bold uppercase mb-4 tracking-wider animate-pulse">🎁 Use Invite Code for +100pts</p>
            <ul className="text-xs font-bold text-white/50 mb-8 space-y-2 uppercase tracking-wide text-left self-start mt-auto w-full">
              <li>• 30 Brotherhood Credits</li>
              <li>• Priority Support</li>
              <li>• Era Community Access</li>
            </ul>
            <Button variant="primary" className="w-full mt-auto text-lg py-4" onClick={() => { setSelectedTier('legacy'); setShowAuth(true); }}>Join Legacy</Button>
          </motion.div>

          {/* Supreme */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="border-2 border-white/20 p-8 flex flex-col items-center bg-white/5 backdrop-blur-sm relative shadow-2xl shadow-black/80"
          >
            <h3 className="text-2xl font-black uppercase italic mb-2">Supreme</h3>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-4xl font-black text-[#24b324]">{billingCycle === 'monthly' ? '$19.99' : '$199.99'}</span>
              <span className="text-xl text-white/30 line-through">{billingCycle === 'monthly' ? '$29.99' : '$239.99'}</span>
            </div>
            {billingCycle === 'yearly' && <div className="text-[10px] bg-red-500 text-white font-black italic uppercase px-3 py-1 mb-4">Save $40</div>}
            <p className="text-xs uppercase font-bold text-[#24b324] tracking-widest mb-6">Limited Time Offer</p>
            <ul className="text-xs font-bold text-white/50 mb-8 space-y-2 uppercase tracking-wide text-left self-start mt-auto w-full">
              <li>• 50 Brotherhood Credits</li>
              <li>• Full Toolkit Access</li>
              <li>• Supreme VIP Role</li>
            </ul>
            <Button variant="outline" className="w-full mt-auto" onClick={() => { setSelectedTier('supreme'); setShowAuth(true); }}>Go Supreme</Button>
          </motion.div>
        </div>

        {/* Promo Code centered link */}
        <div className="mt-12 flex flex-col items-center">
          <button 
            onClick={() => {}} 
            className="text-[#24b324] uppercase font-black italic hover:underline flex items-center gap-2 mb-4 text-xl"
          >
            24 Hour Pass Promo <Zap size={20} fill="#24b324" />
          </button>
          
            <div className="flex gap-2 max-w-md w-full">
              <input 
                type="text" 
                placeholder="ENTER PROMO CODE" 
                className="bg-transparent border-2 border-white/20 px-4 py-3 text-white uppercase font-bold focus:border-[#24b324] outline-none flex-grow"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <Button variant="promo" onClick={startPromoFlow}>APPLY</Button>
            </div>
          {error && <p className="text-red-500 mt-2 font-bold uppercase text-xs">{error}</p>}
        </div>

        <div className="mt-16 text-center border-t border-white/10 pt-8 max-w-2xl mx-auto">
          <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] italic">
            "All Sales Are Final. No refunds on digital credits."
          </p>
        </div>
      </section>

      {/* Trust Section / Verification Modules */}
      <section className="py-24 px-4 bg-black/80 relative overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #24b324 0%, transparent 70%)' }} />
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.p 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="text-2xl md:text-4xl font-medium italic mb-16 max-w-4xl mx-auto tracking-tight"
          >
            "The one question you never will ask,<br/>
            <span className="text-6xl md:text-8xl font-black text-[#24b324] uppercase block mt-4 leading-[0.8] drop-shadow-xl">Is this app worth it?"</span>
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: ShieldCheck, text: "Verified Credentials", label: "AUTH_VERIFIED" },
              { icon: Mic2, text: "Vocal Toolkit", label: "AUDIO_ENGINE" },
              { icon: TrendingUp, text: "Viral Analytics", label: "TRAJECTORY_DATA" },
              { icon: Users, text: "Label Connect", label: "NETWORK_UPLINK" },
              { icon: Lock, text: "IP Protection", label: "ROYALTY_GUARD" }
            ].map((ref, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#111] border border-white/10 p-6 flex flex-col items-center group hover:border-[#24b324]/40 transition-all relative overflow-hidden"
              >
                {/* Decorative Hardware Elements */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#24b324]/20 to-transparent" />
                <div className="text-[8px] font-black font-mono text-[#24b324]/40 absolute top-2 right-2 tracking-widest">{ref.label}</div>
                
                <div className="w-12 h-12 bg-white/5 rounded-sm flex items-center justify-center mb-4 border border-white/5 group-hover:border-[#24b324]/30 group-hover:bg-[#24b324]/5 transition-all backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <ref.icon className="text-white/40 group-hover:text-[#24b324] transition-colors" size={24} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white/60 group-hover:text-white transition-colors">{ref.text}</p>
                
                {/* Dashed track effect */}
                <div className="mt-4 w-full h-px border-t border-dashed border-white/10" />
              </motion.div>
            ))}
          </div>

          {/* Strategic Alliance (Message) */}
          <div className="mt-32 max-w-4xl mx-auto bg-white/5 border-l-4 border-[#24b324] p-12 text-left relative backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
             <div className="absolute -top-6 -left-6 opacity-10">
                <Users size={120} />
             </div>
             <h4 className="text-3xl font-black uppercase italic mb-6 text-[#24b324] tracking-tighter">Strategic Alliance</h4>
             <div className="space-y-6 text-lg font-medium text-white/80 leading-relaxed italic">
                <p>"IndieBrotherhood isn't just an app; it's a structural response to an industry that has long favored the machine over the artist. We've built an ecosystem where your data, your growth, and your legacy are protected by the same technology that used to gatekeep them."</p>
                <p>"We invite the hungry, the disciplined, and the visionary. Secure your node. Claim your era."</p>
             </div>
             <div className="mt-8 flex items-center gap-4">
                <div className="w-10 h-10 bg-[#24b324] rounded-full flex items-center justify-center text-black font-black text-xs uppercase italic">创始人</div>
                <div>
                   <p className="text-xs font-black uppercase tracking-widest text-[#24b324]">FOUNDER_COMMAND</p>
                   <p className="text-[10px] font-bold text-white/40 uppercase">DIRECTOR OF THE ERA</p>
                </div>
             </div>
          </div>

          <div className="mt-24 mb-32">
             <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-8">Integrated Ecosystem Modules</h5>
             <div className="flex flex-wrap justify-center gap-4 opacity-40 hover:opacity-100 transition-opacity">
                {[
                  { icon: Disc, name: "Mastering Suite" },
                  { icon: Binary, name: "ML Lab" },
                  { icon: Gavel, name: "The Judgment" },
                  { icon: LayoutDashboard, name: "Collective HUB" },
                  { icon: Radio, name: "Lounge 2.0" }
                ].map((mod, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 border border-white/10 text-[9px] font-black uppercase tracking-widest bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <mod.icon size={12} className="text-[#24b324]" />
                    {mod.name}
                  </div>
                ))}
             </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Button 
              variant="outline" 
              className="text-2xl md:text-5xl py-8 px-12 border-4 hover:bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
              onClick={() => setShowDemo(true)}
            >
              WATCH DEMO
            </Button>
            <motion.div
              animate={{ 
                boxShadow: ["0 0 20px rgba(217,225,43,0.3)", "0 0 50px rgba(217,225,43,0.6)", "0 0 20px rgba(217,225,43,0.3)"] 
              }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Button 
                variant="primary" 
                className="text-4xl md:text-7xl py-10 px-24 border-4"
                onClick={() => { 
                  if (user) {
                    navigate('/dashboard');
                  } else {
                    setSelectedTier('join'); 
                    setShowAuth(true); 
                  }
                }}
              >
                {user ? "ENTER PORTAL" : "JOIN US"}
              </Button>
            </motion.div>
          </div>
          <p className="mt-4 text-white/50 uppercase font-black text-sm">
            {user ? "IDENTIFIED AS " + user.email : "Choose your plan to begin the era"}
          </p>
        </div>
      </section>

      {/* Video Demo Overlay */}
      <AnimatePresence>
        {showDemo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-full max-w-5xl aspect-video bg-black border-4 border-[#24b324] relative overflow-hidden flex flex-col items-center justify-center shadow-[0_0_50px_rgba(217,225,43,0.2)]">
              {/* NOTE TO USER: ONCE YOU RECORD YOUR DEMO, PUT THE WALKTHROUGH EMBED IFRAME RIGHT HERE */}
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6">
                <Play size={80} className="text-[#24b324] animate-pulse" />
                <h3 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">THE ERA DEMO</h3>
                <p className="text-[#24b324]/80 font-bold uppercase tracking-widest max-w-lg text-sm border border-[#24b324]/20 p-4 bg-[#24b324]/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  [ Developer Note: This container is ready for your recorded walkthrough. Once you obtain your screen walkthrough recording link, drop the embed link right here. ]
                </p>
              </div>
            </div>
            <button onClick={() => setShowDemo(false)} className="mt-8 text-white/40 uppercase font-black text-xs tracking-widest hover:text-white hover:bg-white/10 px-8 py-4 border border-white/10 transition-colors backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              Close Player
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuth && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#222] border-2 border-[#24b324] p-8 max-w-md w-full relative shadow-2xl shadow-black/80"
            >
              <button 
                onClick={() => setShowAuth(false)}
                className="absolute right-4 top-4 text-white/50 hover:text-white"
              >
                <X size={24} />
              </button>
              <h2 className="text-3xl font-black uppercase italic mb-6">Enter The Brotherhood</h2>
              
              {selectedTier && !['join', 'promo', 'none'].includes(selectedTier) && (
                <div className="mb-6 space-y-4">
                  <div className={`bg-black/40 border p-4 flex items-start gap-3 transition-colors ${isAcknowledged ? 'border-[#24b324]' : 'border-white/10'}`}>
                    <input 
                      type="checkbox" 
                      id="refund-policy" 
                      className="mt-1 flex-shrink-0 accent-[#24b324]"
                      checked={isAcknowledged}
                      onChange={(e) => setIsAcknowledged(e.target.checked)}
                    />
                    <label htmlFor="refund-policy" className="text-xs font-bold text-white/60 tracking-widest cursor-pointer leading-tight uppercase">
                      I acknowledge that ALL SALES ARE FINAL. No refunds on digital credits.
                    </label>
                  </div>

                  <div className="bg-black/40 border border-white/10 p-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-[#24b324] mb-2">Have an Invite Code? (Optional)</label>
                    <input 
                      type="text"
                      className="w-full bg-black border border-white/20 p-2 text-white font-mono text-sm uppercase"
                      placeholder="ENTER CODE"
                      value={inviteCode}
                      onChange={(e) => {
                        setInviteCode(e.target.value.toUpperCase());
                        localStorage.setItem('pendingInviteCode', e.target.value.toUpperCase());
                      }}
                    />
                  </div>

                  {isAcknowledged && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="z-10 relative"
                    >
                      <PayPalButtons 
                        style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
                        createOrder={(data, actions) => {
                          const amount = selectedTier === 'supreme' ? '19.99' : (selectedTier === 'legacy' ? '9.99' : '4.99');
                          return actions.order.create({
                             intent: "CAPTURE",
                             purchase_units: [{
                               amount: { 
                                 value: amount,
                                 currency_code: "USD"
                               }
                             }]
                          });
                        }}
                        onApprove={async (data, actions) => {
                          logBreadcrumb("PAYPAL_SUCCESS");
                          handleSignIn(); // Auto-sign in after payment
                        }}
                      />
                    </motion.div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <button 
                  onClick={() => {
                    if (selectedTier && !['join', 'promo', 'none'].includes(selectedTier) && !isAcknowledged) return;
                    handleSignIn();
                  }}
                  disabled={selectedTier && !['join', 'promo', 'none'].includes(selectedTier) && !isAcknowledged}
                  className={`w-full bg-white text-black py-4 font-bold flex items-center justify-center gap-2 transition-all ${selectedTier && !['join', 'promo', 'none'].includes(selectedTier) && !isAcknowledged ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-gray-200 active:scale-95'}`}
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                  Continue with Google
                </button>
                {(window.self !== window.top) && (
                  <p className="text-[10px] text-white/30 text-center uppercase tracking-widest mt-2">
                    Flickering? <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="text-[#24b324] underline">Open in New Tab</a>
                  </p>
                )}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#222] px-2 text-white/50">Or use email</span></div>
                </div>
                <input 
                  type="email" 
                  placeholder="EMAIL ADDRESS" 
                  className="w-full bg-transparent border-2 border-white/20 p-4 text-white font-bold outline-none focus:border-[#24b324]"
                />
                <Button 
                  variant="primary" 
                  className="w-full"
                  disabled={selectedTier && !['join', 'promo', 'none'].includes(selectedTier) && !isAcknowledged}
                  onClick={() => {
                    if (selectedTier && !['join', 'promo', 'none'].includes(selectedTier) && !isAcknowledged) return;
                    handleSignIn();
                  }}
                >
                  Sign Up
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promo Terms Modal */}
      <AnimatePresence>
        {showPromoModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 overflow-y-auto backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#111] border-2 border-[#24b324] max-w-2xl w-full p-8 my-8 shadow-2xl shadow-black/80"
            >
              <h2 className="text-4xl font-black uppercase italic mb-6 text-[#24b324]">24 HOUR PASS TERMS</h2>
              <div className="h-64 overflow-y-scroll mb-8 p-4 bg-white/5 border border-white/10 text-sm space-y-4 font-mono leading-relaxed backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <p className="font-bold text-white uppercase underline">PLEASE READ CAREULLY AND SCROLL TO ACCEPT</p>
                <p>1. By accepting this 24-hour pass, you acknowledge that your access to premium features will expire exactly 24 hours from the moment of activation.</p>
                <p>2. You will be granted 9 (nine) Brotherhood Credits (BC) to use within this period. These credits can be used for Mastering Suite tools, Hit Analysis, or Lyrical Assistance.</p>
                <p>3. This pass is a one-time trial. Re-entry using other accounts to bypass the 24-hour limit is strictly prohibited and results in permanent hardware IP bans.</p>
                <p>4. Upon expiration, your data will be archived for 7 days. You must upgrade to Basic or Legacy to maintain access to your work.</p>
                <p>5. The brotherhood is a community of respect. Any misuse of AI tools for deepfake or unauthorized content is strictly prohibited.</p>
                <p>6. Credits are non-transferable and have zero cash value.</p>
                <p>7. We own the rights to the platform tools, you own your art.</p>
                <p>8. This is the dawn of a new era. Make it count.</p>
              </div>
              <Button 
                variant="primary" 
                className="w-full py-6 text-2xl flex items-center justify-center gap-4"
                onClick={acceptPromoTerms}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Music size={24} />
                  </motion.div>
                ) : (
                  "I ACCEPT THE RISK & OPPORTUNITY"
                )}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Language Modal */}
      <AnimatePresence>
        {showLanguageModal && (
          <LanguageSelectionModal 
            onSelect={handleLanguageSelect} 
            current={selectedLanguage}
          />
        )}
      </AnimatePresence>

      {/* Language Modal */}
      <AnimatePresence>
        {showLanguageModal && (
          <LanguageSelectionModal 
            onSelect={handleLanguageSelect} 
            current={selectedLanguage}
          />
        )}
      </AnimatePresence>

      {/* Footer / Preview Links */}
      <footer className="py-12 border-t border-white/10 px-4 text-center">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 mb-8">
          <Link to="/mastering" className="text-white/40 hover:text-[#24b324] uppercase font-bold text-xs tracking-widest">Preview Mastering</Link>
          <Link to="/analysis" className="text-white/40 hover:text-[#24b324] uppercase font-bold text-xs tracking-widest">Preview Analyzer</Link>
          <Link to="/ml-lab" className="text-white/40 hover:text-[#24b324] uppercase font-bold text-xs tracking-widest">Semantic Lab</Link>
          <Link to="/gatekeeper" className="opacity-0 pointer-events-none" aria-hidden="true" rel="nofollow">Node Logic Gateway</Link>
        </div>
        <p className="text-white/20 text-[10px] uppercase font-bold tracking-[0.2em]">© 2026 IndieBrotherhood. All Rights Reserved. Built for the era.</p>
      </footer>
    </div>
  );
};

// --- Constants & Helpers ---

const LEVELS = [
  "Listener", "Apprentice", "Arranger", "Producer", "Multi-Instrumentalist", 
  "Engineer", "Hit Maker", "Maestro", "Legend", "Immortal"
];

const TOTAL_BADGES = 24;

const syncUserBadges = async (userId: string, currentData: any) => {
  const newBadges = [...(currentData.badges || [])];
  let changed = false;

  if (!newBadges.includes('Welcome')) {
    newBadges.push('Welcome');
    changed = true;
  }

  const isProfileComplete = currentData.bio && currentData.idTagSlogan && currentData.idTagSlogan !== "THE ERA IS NOW";
  if (isProfileComplete && !newBadges.includes('Artist')) {
    newBadges.push('Artist');
    changed = true;
  }

  if ((currentData.streakCount || 0) >= 14 && !newBadges.includes('Loyal Artist')) {
    newBadges.push('Loyal Artist');
    changed = true;
  }

  if (currentData.subscriptionTier === 'admin' && !newBadges.includes('Admin')) {
    newBadges.push('Admin');
    changed = true;
  }

  if ((currentData.visualizerRenders || 0) > 0 && !newBadges.includes('VFX Artist')) {
    newBadges.push('VFX Artist');
    changed = true;
  }

  if ((currentData.lyricsGenerated || 0) > 0 && !newBadges.includes('Soul Scribe')) {
    newBadges.push('Soul Scribe');
    changed = true;
  }

  if ((currentData.masteringCount || 0) > 0 && !newBadges.includes('High Fidelity')) {
    newBadges.push('High Fidelity');
    changed = true;
  }

  if ((currentData.analysisCount || 0) > 0 && !newBadges.includes('Hit Maker')) {
    newBadges.push('Hit Maker');
    changed = true;
  }

  if (changed) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { badges: newBadges });
    return newBadges;
  }
  return null;
};

const ProfilePage = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [message, setMessage] = useState("");
  const [k7Contract, setK7Contract] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      if (!user) {
        navigate('/');
        return;
      }
      
      // Sync Notifications Count
      const qNotify = query(collection(db, `users/${user.uid}/notifications`), where('read', '==', false));
      const unsubNotify = onSnapshot(qNotify, (snap) => {
        setUnreadCount(snap.size);
      }, (err) => {
        console.error("Side effect 1 notifications snapshot error:", err);
      });

      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          
          // Auto-heal level sync based on points accumulated asynchronously
          const expectedLevel = data.subscriptionTier === 'admin' ? 99 : Math.max(data.level || 1, Math.floor((data.points || 0) / 1000) + 1);
          if (data.level !== expectedLevel) {
            data.level = expectedLevel;
            updateDoc(doc(db, 'users', user.uid), { level: expectedLevel }).catch(console.error);
          }
          
          // Sync badges
          const updatedBadges = await syncUserBadges(user.uid, data);
          const finalData = updatedBadges ? { ...data, badges: updatedBadges } : data;
          
          if (isMounted) {
            setUserProfile(finalData);
            setEditData({
              displayName: finalData.displayName || user.displayName || "",
              bio: finalData.bio || "",
              backupEmail: finalData.backupEmail || "",
              idTagSlogan: finalData.idTagSlogan || "THE ERA IS NOW",
              layoutType: finalData.layoutType || 0,
              wallpaperUrl: finalData.wallpaperUrl || ""
            });

            // K7 Contract
            const k7Doc = await getDoc(doc(db, 'k7_contracts', user.uid));
            if (k7Doc.exists() && isMounted) {
              setK7Contract(k7Doc.data());
            }
          }
        } else if (isMounted) {
          // Redirect to dashboard to ensure profile creation
          navigate('/dashboard');
        }
      } catch (err) {
        console.error("Profile Load Error:", err);
        if (isMounted) setError("Access Denied or Profile Sync Error");
      } finally {
        if (isMounted) setLoading(false);
      }
    });
    return () => { isMounted = false; unsub(); };
  }, [navigate]);

  const handleSave = async () => {
    if (!userProfile) return;
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      const updates: any = {
        bio: editData.bio,
        backupEmail: editData.backupEmail,
        idTagSlogan: editData.idTagSlogan,
        layoutType: editData.layoutType,
        wallpaperUrl: editData.wallpaperUrl
      };

      // Name change restriction: twice every 6 months
      if (editData.displayName !== (userProfile.displayName || auth.currentUser?.displayName)) {
        const now = new Date();
        const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
        const lastChange = userProfile.lastNameChange ? new Date(userProfile.lastNameChange) : new Date(0);
        
        if (userProfile.nameChangeCount >= 2 && lastChange > sixMonthsAgo) {
          setMessage("ERROR: NAME CHANGE LIMIT REACHED (2 PER 6 MONTHS)");
          setTimeout(() => setMessage(""), 3000);
          return;
        }

        updates.displayName = editData.displayName;
        updates.nameChangeCount = (userProfile.nameChangeCount || 0) + 1;
        updates.lastNameChange = new Date().toISOString();
      }

      await updateDoc(userRef, updates);
      setUserProfile({ ...userProfile, ...updates });
      setIsEditing(false);
      setMessage("IDENTITY DATA FORGED SUCCESSFULLY");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const donateAndBadge = async () => {
    if (!userProfile) return;
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      const currentBadges = userProfile.badges || [];
      if (!currentBadges.includes('Thank You')) {
        await updateDoc(userRef, {
          badges: [...currentBadges, 'Thank You']
        });
        setUserProfile({ ...userProfile, badges: [...currentBadges, 'Thank You'] });
      }
      window.open("https://venmo.com/thebugman88", "_blank");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black flex items-center justify-center flex-col gap-6">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
        <Music className="text-[#24b324]" size={48} />
      </motion.div>
      {error && (
        <div className="text-center space-y-4">
          <p className="text-red-500 font-bold uppercase tracking-widest">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>RETRY SIGNAL</Button>
        </div>
      )}
    </div>
  );

  if (!userProfile) return null;

  const levelProgress = (userProfile.points % 1000) / 10;
  const badgeCount = userProfile.badges?.length || 0;
  const isProfileComplete = userProfile.bio && userProfile.idTagSlogan && userProfile.idTagSlogan !== "THE ERA IS NOW";

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black text-white flex flex-col font-sans selection:bg-[#24b324] selection:text-black relative transition-all duration-500"
      style={{
        backgroundImage: userProfile?.wallpaperUrl ? `linear-gradient(rgba(26,26,27,0.8), rgba(26,26,27,0.8)), url(${userProfile.wallpaperUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Top Banner Ticker */}
      <div className="bg-[#24b324] overflow-hidden py-1 border-y border-black/10 relative z-[70]">
        <div className="flex whitespace-nowrap animate-ticker">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-12 px-6">
              <span className="text-black font-black uppercase italic text-sm">PUSH YOURSELF TO THE LIMIT</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm">EARN RARE BADGES BY DOMINATING THE ERA</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm">THE BROTHERHOOD IS WATCHING YOUR GROWTH</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm">STAY LOYAL STAY COMMITTED</span>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Header */}
      <NotificationCenter isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md relative z-20">
        <div className="flex items-center gap-4">
          <button 
            className="p-3 hover:bg-[#24b324] hover:text-black rounded-sm border border-[#24b324]/20 transition-all group" 
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu className="text-[#24b324] group-hover:text-black" size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">IndieBrotherhood</h1>
            <span className="text-[10px] uppercase font-bold text-[#24b324] tracking-widest pl-1">A Dawn Of A New Era</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            className="relative p-2 hover:bg-white/5 transition-colors group backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
            onClick={() => setIsNotificationsOpen(true)}
          >
            <Bell size={20} className={unreadCount > 0 ? "text-[#24b324]" : "text-white/40 group-hover:text-white"} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[8px] flex items-center justify-center rounded-full font-black">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center justify-end gap-2">
              {userProfile?.subscriptionTier === 'legacy' && (
                <span className="bg-[#24b324] text-black px-1.5 py-0.5 rounded-sm text-[8px] animate-pulse shadow-[0_0_10px_#24b324] font-black italic border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">LEGACY OWNER</span>
              )}
              Active Era Status
            </div>
            <div className="text-sm font-black italic uppercase text-[#24b324]">
              Level {userProfile?.level ?? 1} - {userProfile?.level === 99 ? 'IMMORTAL' : (LEVELS[(userProfile?.level ?? 1) - 1] || 'LEGEND')}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-black/50 overflow-hidden ${userProfile?.subscriptionTier === 'legacy' ? 'border-[#24b324] shadow-[0_0_15px_#24b324]' : 'border-[#24b324]'}`}>
            {auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Profile" referrerPolicy="no-referrer" />
            ) : (
              <User size={24} className="text-[#24b324]" />
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow p-6 max-w-7xl mx-auto w-full relative z-10 pt-10">
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-10 ${userProfile?.layoutType === 1 ? 'flex-col-reverse' : ''}`}>
          
          {/* Main Content Area */}
          <div className={`${userProfile?.layoutType === 2 ? 'lg:col-span-4' : 'lg:col-span-8'} space-y-10`}>
            
            {/* Identity Hero */}
            {!isProfileComplete && !isEditing && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#24b324] p-6 flex flex-col md:flex-row items-center justify-between gap-4 mb-8 border-b-4 border-black/20"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-black p-3 text-[#24b324]"><User size={24} /></div>
                  <div className="text-black font-black uppercase italic tracking-tighter">Your Era Profile is incomplete. Establish your sound to unlock the Artist Badge.</div>
                </div>
                <Button variant="secondary" onClick={() => setIsEditing(true)} className="whitespace-nowrap bg-black text-white hover:bg-white/10 border-none backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">COMPLETE SETUP NOW</Button>
              </motion.div>
            )}
            <div className="flex flex-col md:flex-row gap-8 items-start relative group">
              <div className="relative">
                <div className="w-48 h-48 rounded-none border-4 border-[#24b324] overflow-hidden bg-black/50 relative z-10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  {auth.currentUser?.photoURL ? (
                    <img src={auth.currentUser.photoURL} alt="Hero" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <User size={80} className="text-[#24b324] m-auto absolute inset-0" />
                  )}
                </div>
                <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-[#24b324] text-black flex items-center justify-center font-black italic text-3xl z-20 shadow-xl border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">
                  {userProfile.level}
                </div>
              </div>

              <div className="flex-grow space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none mb-2">
                      {userProfile.displayName || auth.currentUser?.displayName || "UNNAMED ARTIST"}
                    </h2>
                    <div className="inline-block px-3 py-1 bg-[#24b324]/10 border border-[#24b324]/30 text-[#24b324] text-[10px] font-black uppercase tracking-widest italic backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                      {LEVELS[userProfile.level - 1]} - {userProfile.subscriptionTier} TIER
                    </div>
                  </div>
                  <a href="mailto:xchristopherrayx@gmail.com" className="bg-[#24b324] text-black px-4 py-2 font-black italic uppercase text-xs hover:bg-white transition-colors border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">
                    Questions / Feedback?
                  </a>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest text-white/40">
                    <span>Level Progress</span>
                    <span className="text-[#24b324]">{Math.floor(levelProgress)}%</span>
                  </div>
                  <div className="h-4 bg-white/5 border border-white/10 p-0.5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${levelProgress}%` }}
                      className="h-full bg-[#24b324]" 
                    />
                  </div>
                </div>

                <div className="text-white/60 font-medium italic leading-relaxed text-lg max-w-xl">
                  {userProfile.bio || "No bio established. Define your sound in the brotherhood settings."}
                </div>

                {/* IBH Code of Conduct */}
                <div className="mt-10 p-8 bg-black/60 border-l-4 border-[#24b324] relative overflow-hidden group shadow-2xl backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity pointer-events-none">
                    <ShieldCheck size={120} className="text-[#24b324]" />
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-[11px] font-black text-[#24b324] uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                       <Scale size={16} /> IBH Code of Conduct
                    </h3>
                    
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="w-1.5 h-1.5 bg-[#24b324] mt-2 shrink-0 animate-pulse" />
                        <p className="text-xs font-black italic uppercase leading-relaxed tracking-widest text-white/90">
                          <span className="text-[#24b324]">THE DAWN OF A NEW ERA:</span> EXECUTE RESPECT LIMITLESS. APPROACH, COMMUNICATE, JUDGE AND INTERACT WITH OTHERS AS YOU WANT DONE TO YOU.
                        </p>
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="w-1.5 h-1.5 bg-[#24b324] mt-2 shrink-0" />
                        <p className="text-xs font-black italic uppercase leading-relaxed tracking-widest text-white/70">
                          WE STAND AS UNITY AS ONE FOR EVERY AND ALL MEMBER OF IBH.
                        </p>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-1.5 h-1.5 bg-[#24b324] mt-2 shrink-0" />
                        <p className="text-xs font-black italic uppercase leading-relaxed tracking-widest text-white/70">
                          IF WE ATTEMPT OR DECIDE TO INITIATE A TASK, YOU GIVE IT 100%. OUR WORK REFLECTS US INDIVIDUALLY AND AS A WHOLE.
                        </p>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-1.5 h-1.5 bg-[#24b324] mt-2 shrink-0" />
                        <p className="text-xs font-black italic uppercase leading-relaxed tracking-widest text-white/70">
                          RESPECT IS A GIVEN NOT EARNED UNLESS IT BE REGAINED FROM AN ACT OF DISRESPECT.
                        </p>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-1.5 h-1.5 bg-[#24b324] mt-2 shrink-0 animate-pulse" />
                        <p className="text-xs font-black italic uppercase leading-relaxed tracking-widest text-[#24b324]">
                          NEVER LIMIT YOUR ABILITIES. IF EVERYONE IN THE PAST HISTORY LIMITED THEMSELVES THE WORLD WOULD HAVE GOTTEN NOWHERE.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-0 right-0 p-4">
                     <div className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em]">IndieBrotherhood Official Protocol</div>
                  </div>
                </div>


              </div>
            </div>

            {/* Site ID Tag (IBH ID Card) */}
            <div className="bg-[#222] border-4 border-black/50 p-6 flex items-center gap-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 font-black italic text-4xl text-white/5 opacity-50 select-none group-hover:text-[#24b324]/10 transition-colors">IBH-IDENTITY</div>
              <div className="w-24 h-24 bg-black/50 border-2 border-[#24b324]/40 flex-shrink-0 relative backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                {auth.currentUser?.photoURL ? (
                  <img src={auth.currentUser.photoURL} alt="ID" referrerPolicy="no-referrer" className="w-full h-full grayscale" />
                ) : (
                  <User size={32} className="text-white/20 m-auto" />
                )}
                <div className="absolute top-0 left-0 bg-[#24b324] text-black text-[8px] font-black px-1 leading-none border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">ID-{userProfile.uid.slice(0,6)}</div>
              </div>
              <div className="flex-grow flex flex-col justify-center">
                <div className="text-white font-black italic uppercase text-2xl tracking-tight">#{userProfile.displayName || "ARTIST"}</div>
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                   IBH AUTHENTICATED <CheckCircle size={10} className="text-[#24b324]" />
                </div>
                <div className="text-[#24b324] font-black italic uppercase text-sm tracking-tighter bg-black/40 px-3 py-1 self-start backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                   {userProfile.idTagSlogan || "THE ERA IS NOW"}
                </div>
              </div>
              <div className="text-center bg-black px-4 py-2 border-l-2 border-[#24b324]">
                <div className="text-[10px] uppercase font-bold text-white/40">Loyalty</div>
                <div className="text-[#24b324] font-black text-xl italic">{userProfile.loyaltyPoints || 0}</div>
              </div>
            </div>

            {/* Badges & Tasks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-black/40 border border-white/5 p-6 h-full flex flex-col backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">ERA BADGES</h3>
                  <div className="text-xs font-black italic text-[#24b324]">{badgeCount} / {TOTAL_BADGES} COLLECTED</div>
                </div>
                <div className="flex-grow grid grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`aspect-square border-2 flex items-center justify-center transition-all ${userProfile.badges?.[i] ? 'border-[#24b324] bg-[#24b324]/10 text-[#24b324] shadow-[0_0_15px_rgba(217,225,43,0.3)]' : 'border-white/5 text-white/10'}`}
                    >
                      {userProfile.badges?.[i] === 'Thank You' ? <Heart size={20} fill="currentColor" /> : <Trophy size={20} />}
                    </div>
                  ))}
                  <div className="col-span-4 mt-4 text-[10px] uppercase font-bold text-white/30 tracking-widest text-center">DOMINATE CORE TASKS TO UNLOCK REMAINING {TOTAL_BADGES - badgeCount} BADGES</div>
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 p-6 h-full space-y-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <h3 className="text-xl font-black italic uppercase tracking-tighter">QUICK ERA TASKS</h3>
                <div className="space-y-3">
                  {[
                    { label: "Dominate a Lounge Battle", pts: 250 },
                    { label: "Forge a New Era Collab", pts: 150 },
                    { label: "Attend Brotherhood Meeting", pts: 300 },
                    { label: "Submit Track for Judgment", pts: 100 }
                  ].map((task, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer border-l-2 border-transparent hover:border-[#24b324] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                      <span className="text-xs font-black uppercase text-white/60 group-hover:text-white">{task.label}</span>
                      <span className="text-[10px] font-black italic text-[#24b324]">+{task.pts} PTS</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Partner & Developer Assets (New) */}
            {(userProfile?.email === 'xchristopherrayx@gmail.com' || userProfile?.isDev) && (
              <div className="bg-black/40 border-2 border-[#24b324]/20 p-8 space-y-6 shadow-[0_0_30px_rgba(217,225,43,0.1)] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 text-[#24b324]">
                    <Cpu size={28} />
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Verified Partner Assets</h3>
                  </div>
                  <div className="bg-[#24b324] text-black px-3 py-1 text-[10px] font-black uppercase italic animate-pulse border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">
                    Elite Legacy Active
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { name: "I/O 2026", color: "text-blue-500", desc: "Registered Explorer" },
                    { name: "Cloud & NVIDIA", color: "text-green-500", desc: "GPU Cluster Member" },
                    { name: "G-Innovator", color: "text-blue-400", desc: "Scaling the Era" },
                    { name: "Gemini Agent", color: "text-purple-500", desc: "Enterprise Ready" },
                    { name: "Maps Innovator", color: "text-red-400", desc: "Geo-Forge Asset" },
                    { name: "Firebase Studio", color: "text-orange-500", desc: "Master Dev" },
                    { name: "Code Wiki", color: "text-white", desc: "Knowledge Vault" },
                    { name: "Google Dev+", color: "text-[#24b324]", desc: "Partner Tier 1" }
                  ].map((badge, i) => (
                    <div key={i} className="bg-black/50 p-4 border border-white/5 flex flex-col items-center justify-center text-center group hover:border-[#24b324]/40 transition-all cursor-crosshair backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                      <div className={`w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${badge.color}`}>
                         <Award size={20} />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-tighter text-white group-hover:text-[#24b324] transition-colors">{badge.name}</span>
                      <span className="text-[7px] font-bold uppercase tracking-widest text-white/20 mt-1">{badge.desc}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-white/5 flex justify-center">
                   <div className="text-[10px] font-black uppercase italic text-[#24b324]/40 tracking-[0.3em]">
                     PROPRIETARY GOOGLE & NVIDIA ASSETS LINKED TO BROTHERHOOD IDENTITY
                   </div>
                </div>
              </div>
            )}



          </div>

          {/* Right Sidebar / Customization Area */}
          <div className={`${userProfile?.layoutType === 2 ? 'lg:col-span-8' : 'lg:col-span-4'} space-y-8`}>
            
            {/* Action Panel */}
            <div className="bg-[#222] p-8 border-4 border-black/40 shadow-inner space-y-6">
              <h3 className="text-2xl font-black italic uppercase italic">Era Membership Customization</h3>
              
              <div className="space-y-4">
                <Button 
                  variant={isEditing ? "primary" : "outline"} 
                  className="w-full flex items-center justify-center gap-4"
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                >
                  {isEditing ? <Save size={20} /> : <Settings size={20} />}
                  {isEditing ? "SAVE IDENTITY DATA" : "EDIT PROFILE LAYOUT"}
                </Button>

                <Button variant="promo" className="w-full flex items-center justify-center gap-4" onClick={donateAndBadge}>
                  <DollarSign size={20} />
                  SUPPORT WITH $1 & EARN BADGE
                </Button>
              </div>

              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#24b324] text-black p-3 font-black uppercase text-center text-xs tracking-widest italic border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
                >
                  {message}
                </motion.div>
              )}

              {isEditing && (
                <div className="space-y-6 mt-8 p-6 bg-black/40 border border-white/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Artist Display Name</label>
                    <input 
                      className="w-full bg-black/50 border-2 border-white/10 p-4 font-black italic uppercase focus:border-[#24b324] outline-none text-[#24b324] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                      value={editData.displayName}
                      onChange={(e) => setEditData({...editData, displayName: e.target.value})}
                    />
                    <p className="text-[9px] text-white/20 uppercase font-bold italic tracking-wider">* Only 2 changes allowed every 6 months</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Identity Backup Email</label>
                    <input 
                      className="w-full bg-black/50 border border-white/10 p-3 text-sm focus:border-[#24b324] outline-none backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                      value={editData.backupEmail}
                      onChange={(e) => setEditData({...editData, backupEmail: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Brotherhood Bio (Establish Sound)</label>
                    <textarea 
                      className="w-full bg-black/50 border border-white/10 p-3 text-xs h-32 focus:border-[#24b324] outline-none leading-relaxed backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                      value={editData.bio}
                      onChange={(e) => setEditData({...editData, bio: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">ID Tag Slogan</label>
                    <input 
                      className="w-full bg-black/50 border border-white/10 p-3 text-sm focus:border-[#24b324] outline-none backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                      value={editData.idTagSlogan}
                      onChange={(e) => setEditData({...editData, idTagSlogan: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Wallpaper Wallpaper (URL)</label>
                    <input 
                      className="w-full bg-black/50 border border-white/10 p-3 text-sm focus:border-[#24b324] outline-none backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                      value={editData.wallpaperUrl}
                      onChange={(e) => setEditData({...editData, wallpaperUrl: e.target.value})}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Layout Preference</label>
                    <div className="grid grid-cols-3 gap-2">
                       {[0, 1, 2].map((lt) => (
                         <button 
                            key={lt}
                            onClick={() => setEditData({...editData, layoutType: lt})}
                            className={`p-2 border-2 uppercase font-black text-[10px] italic transition-all ${editData.layoutType === lt ? 'bg-[#24b324] border-[#24b324] text-black shadow-lg scale-105' : 'bg-black/20 border-white/10 text-white/40'}`}
                         >
                           Layout {lt + 1}
                         </button>
                       ))}
                    </div>
                  </div>


                </div>
              )}
            </div>

            {/* K7 Syndicate Contract Display */}
            {k7Contract && (
              <div className="bg-[#24b324]/5 border-2 border-[#24b324]/20 p-6 space-y-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-3 border-b border-[#24b324]/20 pb-4">
                  <Cpu className="text-[#24b324]" size={20} />
                  <h3 className="text-[10px] font-black uppercase text-[#24b324] tracking-[0.3em]">K7 Pool Contract Sealed</h3>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-white/40 font-black uppercase tracking-widest">Legal Alias</span>
                     <span className="text-white font-mono break-all text-right uppercase">{k7Contract.fullNameSignature || 'Legacy'}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-white/40 font-black uppercase tracking-widest">Hash Tracer</span>
                     <span className="text-[#24b324] font-mono text-[10px] text-right">{k7Contract.signatureKey || 'N/A'}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3">
                     <span className="text-white/40 font-black uppercase tracking-widest">Status</span>
                     <span className="text-[#24b324] font-black uppercase tracking-widest text-[9px] animate-pulse">ACTIVE PARTICIPANT</span>
                   </div>
                </div>
              </div>
            )}

            {/* Status Icons / Community Values */}
            <div className="bg-black/40 border border-white/5 p-8 flex flex-col gap-6 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
               <div className="flex justify-between items-center bg-white/5 p-4 group cursor-help transition-all hover:bg-white/10 border-l-4 border-blue-500 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-4">
                    <Shield className="text-blue-500" />
                    <div>
                      <div className="text-xs font-black uppercase italic leading-none">COMMUNITY LOYALTY</div>
                      <div className="text-[10px] text-white/30 uppercase font-black uppercase tracking-widest mt-1">Status: Faithful Member</div>
                    </div>
                  </div>
                  <div className="text-xl font-black italic">{userProfile.loyaltyPoints || 0}</div>
               </div>
               <div className="flex justify-between items-center bg-white/5 p-4 group cursor-help transition-all hover:bg-white/10 border-l-4 border-orange-500 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-4">
                    <Star className="text-orange-500" />
                    <div>
                      <div className="text-xs font-black uppercase italic leading-none">RESPECT SCORE</div>
                      <div className="text-[10px] text-white/30 uppercase font-black uppercase tracking-widest mt-1">Status: Well Known</div>
                    </div>
                  </div>
                  <div className="text-xl font-black italic">{userProfile.respectScore || 0}</div>
               </div>
               <div className="flex items-center gap-6 p-4 border border-white/10 opacity-30">
                  <Info size={16} />
                  <p className="text-[9px] uppercase font-bold tracking-widest leading-relaxed">Status icons evolve based on era participation, track judgments, and brotherhood loyalty.</p>
               </div>
            </div>

            {/* Hidden / Coming Soon Panel */}
            <div className="bg-black/10 border border-dashed border-white/20 p-8 text-center relative group overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-100 flex items-center justify-center -translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <div className="text-[#24b324] font-black uppercase italic text-sm tracking-widest">99¢ ERA STORE COMING SOON</div>
               </div>
               <Lock className="mx-auto text-white/10 mb-4" size={48} />
               <div className="text-white/20 uppercase font-black text-xs tracking-[0.5em]">HIDDEN ERA CONTENT</div>
            </div>

          </div>
        </div>
      </main>

      {/* Side Menu Drawer (Reused from Dashboard) */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black border-r-4 border-[#24b324] z-[101] p-8 flex flex-col overflow-y-auto scrollbar-hide"
            >
              <div className="mb-8 flex-shrink-0">
                <h2 className="text-3xl font-black italic uppercase italic leading-none">Indie<br/>Brotherhood</h2>
              </div>
              
              <nav className="flex-grow space-y-2 mb-8 no-scrollbar">
                {getNavItems(userProfile).map((item, i) => (
                  <Link 
                    to={item.to} 
                    key={i} 
                    onClick={() => {
                      logBreadcrumb(`NAV TO: ${item.label}`);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center gap-4 p-4 font-black uppercase italic tracking-wider transition-all group ${window.location.pathname === item.to ? 'bg-[#24b324] text-black shadow-[0_0_15px_rgba(217,225,43,0.3)] translate-x-2' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  >
                    <item.icon size={20} className={window.location.pathname === item.to ? 'text-black' : 'group-hover:text-[#24b324] transition-transform group-hover:scale-110'} />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <button 
                onClick={() => signOut(auth)}
                className="mt-auto border-2 border-white/10 p-4 font-black uppercase italic text-white/40 hover:text-red-500 hover:border-red-500 transition-all text-center tracking-widest shadow-2xl shadow-black/80"
              >
                Exit Portal
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <footer className="py-12 border-t border-white/10 px-4 text-center relative z-10 bg-black/20 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <p className="text-white/20 text-[10px] uppercase font-bold tracking-[0.2em]">Established 2026. FOR THE ERA. BY THE BROTHERHOOD.</p>
      </footer>
    </div>
  );
};

const Dashboard = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(247); 
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const isMounted = true; // Simple check since we are in a component
  const [adProgress, setAdProgress] = useState(0);
  const navigate = useNavigate();

  const sendNotification = async (title: string, message: string, type: 'info' | 'reward' | 'alert' | 'message' = 'info') => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(collection(db, `users/${auth.currentUser.uid}/notifications`)), {
        title,
        message,
        type,
        read: false,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error("Failed to send notification", e);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
       // Start fetching immediately if we already have a user
       // (The onAuthStateChanged listener below will still run and fetch, but this helps stability)
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Debounce redirect to allow Firebase to initialize and prevent "flicker" redirects
        const timer = setTimeout(() => {
          if (!auth.currentUser && isMounted) {
            logBreadcrumb("DASHBOARD_AUTH_NULL_EXIT");
            navigate('/');
            setLoading(false);
          }
        }, 3000); // Increased to 3s for custom domain stability
        return;
      }

      // Sync Notifications Count
      const qNotify = query(collection(db, `users/${user.uid}/notifications`), where('read', '==', false));
      const unsubNotify = onSnapshot(qNotify, (snap) => {
        setUnreadCount(snap.size);
      }, (err) => {
        console.error("Side effect 2 notifications snapshot error:", err);
      });

      const userRef = doc(db, 'users', user.uid);
      
      const fetchProfile = async () => {
        logBreadcrumb("DASHBOARD_FETCH_PROFILE_START");
        try {
          // Timeout protection
          const profilePromise = getDoc(userRef);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Firebase GetDoc Timeout")), 8000)
          );
          
          const snap = (await Promise.race([profilePromise, timeoutPromise])) as any;
          
          if (snap.exists()) {
            let data = snap.data();
            logBreadcrumb(`DASHBOARD_PROFILE_SYNCED: ${data.subscriptionTier}`);
            
            // Auto-heal level sync based on points accumulated asynchronously
            const expectedLevel = data.subscriptionTier === 'admin' ? 99 : Math.max(data.level || 1, Math.floor((data.points || 0) / 1000) + 1);
            if (data.level !== expectedLevel) {
              data.level = expectedLevel;
              updateDoc(userRef, { level: expectedLevel }).catch(console.error);
            }

            // Auto-upgrade for the brotherhood owner
            const ownerEmail = 'xchristopherrayx@gmail.com';
            if (user.email?.toLowerCase() === ownerEmail.toLowerCase() && (data.subscriptionTier !== 'admin' || data.level !== 99)) {
              const upgradeData = {
                subscriptionTier: 'admin',
                credits: 999999,
                level: 99,
                points: 1000000,
                judgmentsPerformed: 500,
                masteringCredits: 100,
                analysisCredits: 100,
                badges: ["Welcome", "Artist", "Loyal Artist", "Admin", "Legacy", "Judgment Elite", "Mastering King", "Lyricist", "Analyzer", "Hit Maker", "Brotherhood Founder", "Era Legend", "Immortal"],
                termsAccepted: true
              };
              await updateDoc(userRef, upgradeData);
              data = { ...data, ...upgradeData };
            }

            setUserProfile(data);

            // Sync badges in background
            syncUserBadges(user.uid, data).then(newBadges => {
               if(newBadges) setUserProfile((prev: any) => ({ ...prev, badges: newBadges }));
            });
            
            const today = new Date().toISOString().split('T')[0];
            if (data.lastStreakDate !== today) {
              setShowStreakModal(true);
            }
          } else {
            logBreadcrumb("DASHBOARD_PROFILE_MISSING_CREATING_DEFAULT");
            const ownerEmail = 'xchristopherrayx@gmail.com';
            const isOwner = user.email?.toLowerCase() === ownerEmail.toLowerCase();
            const tier = isOwner ? 'admin' : 'free';
            const credits = isOwner ? 999999 : 0;
            const defaultProfile = {
              uid: user.uid,
              email: user.email,
              subscriptionTier: tier,
              credits: credits,
              points: 0,
              level: 1,
              createdAt: new Date().toISOString(),
              termsAccepted: isOwner,
              unlockedSkins: [],
              masteringCredits: isOwner ? 100 : 1,
              analysisCredits: isOwner ? 100 : 1
            };
            await setDoc(userRef, defaultProfile);
            setUserProfile(defaultProfile);
          }
        } catch (err) {
          logBreadcrumb(`DASHBOARD_PROFILE_ERROR: ${err instanceof Error ? err.message : 'Unknown'}`);
          console.error("Dashboard Fetch Error:", err);
          // NEW: Ensure we don't stay in loading state forever if profile creation fails
          if (err instanceof Error && err.message.includes('permission-denied')) {
             setError("Access Permissions Pending. Ensure your email is verified.");
          }
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();

      const heartbeat = setInterval(() => {
        updateDoc(userRef, { lastActive: new Date().toISOString() });
      }, 60000);

      const fetchActiveCount = async () => {
        try {
          const q = query(collection(db, 'users'), where('lastActive', '>', new Date(Date.now() - 5 * 60 * 1000).toISOString()));
          const countSnap = await getCountFromServer(q);
          setActiveUsersCount(countSnap.data().count + 120); 
        } catch (err) {
          console.error(err);
        }
      };
      
      const countInterval = setInterval(fetchActiveCount, 30000);
      fetchActiveCount();

      return () => {
        clearInterval(heartbeat);
        clearInterval(countInterval);
      };
    });

    return unsub;
  }, [navigate]);

  useEffect(() => {
    // Check pending invites logic that doesn't belong in fetchProfile directly
    const checkPendingInvites = async () => {
      if (userProfile && auth.currentUser) {
        try {
          const invitesQ = query(collection(db, `users/${userProfile.uid}/invites`), where('claimed', '==', false));
          const invitesSnap = await getDocs(invitesQ);
          if (!invitesSnap.empty) {
            let pointsGained = 0;
            let creditsGained = 0;
            const batchOperations: Promise<void>[] = [];
            
            invitesSnap.forEach(docSnap => {
              pointsGained += 100;
              creditsGained += 5;
              batchOperations.push(updateDoc(docSnap.ref, { claimed: true }));
            });

            await Promise.all(batchOperations);
            
            await updateDoc(doc(db, 'users', userProfile.uid), {
              points: increment(pointsGained),
              credits: increment(creditsGained)
            });

            setUserProfile((prev: any) => ({
              ...prev,
              points: prev.points + pointsGained,
              credits: prev.credits + creditsGained
            }));

            toast.success(`You claimed ${pointsGained} Points & ${creditsGained} Credits from invites!`);
          }
        } catch (e) {
          console.error("Failed to check invites", e);
        }
      }
    };
    
    if (userProfile?.uid && !loading) {
       checkPendingInvites();
    }
  }, [userProfile?.uid, loading]);

  const claimStreak = async () => {
    if (!userProfile) return;
    const today = new Date().toISOString().split('T')[0];
    const userRef = doc(db, 'users', userProfile.uid);
    
    try {
      const newStreakCount = (userProfile.streakCount || 0) + 1;
      const pointsToGain = newStreakCount * 50;
      const newPoints = userProfile.points + pointsToGain;
      const newLevel = Math.floor(newPoints / 1000) + 1;

      await updateDoc(userRef, {
        streakCount: newStreakCount > 14 ? 1 : newStreakCount,
        lastStreakDate: today,
        points: newPoints,
        level: newLevel
      });

      setUserProfile({
        ...userProfile,
        streakCount: newStreakCount > 14 ? 1 : newStreakCount,
        lastStreakDate: today,
        points: newPoints,
        level: newLevel
      });
      
      setShowStreakModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const [adFinished, setAdFinished] = useState(false);

  const handleWatchAd = () => {
    if (isWatchingAd || !userProfile) return;
    setIsWatchingAd(true);
    setAdProgress(0);
    setAdFinished(false);
    logBreadcrumb(`WATCH_AD_TRIGGERED (Unit: ${ADMOB_AD_UNIT_ID})`);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setAdProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setAdFinished(true);
      }
    }, 300); // ~15 seconds total
  };

  const claimAdReward = async () => {
    if (!adFinished || !userProfile) return;
    setIsWatchingAd(false);
    setAdFinished(false);
    toast.success('Ad complete! +50 Points earned.');
    
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      const newPoints = userProfile.points + 50;
      await updateDoc(userRef, { points: increment(50) });
      setUserProfile((prev: any) => ({ ...prev, points: newPoints }));
      
      sendNotification(
        "Ad Reward Claimed",
        "You earned 50 points by supporting the Brotherhood expansion grid.",
        "reward"
      );
    } catch (e) {
      console.error('Failed to reward points', e);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center space-y-8">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <RefreshCw className="text-[#24b324]" size={48} />
      </motion.div>
      <div className="space-y-2">
        <h2 className="text-3xl font-black italic uppercase italic tracking-tighter text-white">Initializing Era Profile</h2>
        <p className="text-white/40 uppercase font-black text-[10px] tracking-[0.3em] max-w-xs">{error || 'Synchronizing credentials with the Brotherhood grid...'}</p>
      </div>
      {error && (
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-3 border border-red-500 text-red-500 font-black uppercase text-xs tracking-widest hover:bg-red-500 hover:text-black transition-all"
        >
          Return to Terminal
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black text-white flex flex-col font-sans selection:bg-[#24b324] selection:text-black relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
      
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md relative z-20">
        <div className="flex items-center gap-4">
          <button 
             className="p-3 hover:bg-[#24b324] hover:text-black rounded-sm border border-[#24b324]/20 transition-all group" 
             onClick={() => setIsMenuOpen(true)}
          >
            <Menu className="text-[#24b324] group-hover:text-black" size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">IndieBrotherhood</h1>
            <span className="text-[10px] uppercase font-bold text-[#24b324] tracking-widest pl-1">A Dawn Of A New Era</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            className="relative p-2 hover:bg-white/5 transition-colors group backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
            onClick={() => setIsNotificationsOpen(true)}
          >
            <Bell size={20} className={unreadCount > 0 ? "text-[#24b324]" : "text-white/40 group-hover:text-white"} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[8px] flex items-center justify-center rounded-full font-black">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center justify-end gap-2">
              {userProfile?.subscriptionTier === 'legacy' && (
                <span className="bg-[#24b324] text-black px-1.5 py-0.5 rounded-sm text-[8px] animate-pulse shadow-[0_0_10px_#24b324] font-black italic border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">LEGACY OWNER</span>
              )}
              Active Era Status
            </div>
            <div className="text-sm font-black italic uppercase text-[#24b324]">
              Level {userProfile?.level ?? 1} - {userProfile?.level === 99 ? 'IMMORTAL' : (LEVELS[(userProfile?.level ?? 1) - 1] || 'LEGEND')}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-black/50 overflow-hidden ${userProfile?.subscriptionTier === 'legacy' ? 'border-[#24b324] shadow-[0_0_15px_#24b324]' : 'border-[#24b324]'}`}>
            {auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Profile" referrerPolicy="no-referrer" />
            ) : (
              <User size={24} className="text-[#24b324]" />
            )}
          </div>
        </div>
      </header>

      {/* News Ticker */}
      <div className="bg-[#24b324] overflow-hidden py-1 border-y border-black/10 relative z-10">
        <div className="flex whitespace-nowrap animate-ticker">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-12 px-6">
              <span className="text-black font-black uppercase italic text-sm flex items-center gap-2">
                <Music size={14} /> WE BELIEVE IN YOUR SOUND
              </span>
              <span className="text-black/60 font-black uppercase text-sm">•</span>
              <span className="text-black font-black uppercase italic text-sm flex items-center gap-2">
                <Zap size={14} fill="currentColor" /> {activeUsersCount} ARTISTS ACTIVE IN THE BROTHERHOOD RIGHT NOW
              </span>
              <span className="text-black/60 font-black uppercase text-sm">•</span>
              <span className="text-black font-black uppercase italic text-sm flex items-center gap-2">
                <Users size={14} /> NEW ERA STARTING FOR EVERY INDIE ARTIST
              </span>
              <span className="text-black/60 font-black uppercase text-sm">•</span>
              <span className="text-black font-black uppercase italic text-sm">
                #1 PLATFORM FOR EXECUTION & GROWTH
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Dashboard Content */}
      <main className="flex-grow p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Stats Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-black/20 p-6 border border-white/5 space-y-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#24b324]">Signal Relay</h4>
                <p className="text-[9px] text-white/30 uppercase font-bold">In-app pings & era resets</p>
              </div>
              <button 
                onClick={async () => {
                  const newState = !userProfile?.pushNotificationsEnabled;
                  setUserProfile({ ...userProfile, pushNotificationsEnabled: newState });
                  try {
                    await updateDoc(doc(db, 'users', userProfile.uid), { pushNotificationsEnabled: newState });
                    toast.success(newState ? 'SIGNAL RELAY ENGAGED' : 'SIGNAL RELAY DISENGAGED');
                    if (newState) {
                      sendNotification("Relay Active", "You will now receive era status pings directly to your HUD.", "info");
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className={`w-12 h-6 rounded-full relative transition-colors ${userProfile?.pushNotificationsEnabled ? 'bg-[#24b324]' : 'bg-white/10'}`}
              >
                <motion.div 
                  animate={{ x: userProfile?.pushNotificationsEnabled ? 24 : 0 }}
                  className="absolute top-1 left-1 w-4 h-4 bg-black rounded-full"
                />
              </button>
            </div>
          </div>

          <div className="bg-black/20 p-6 border border-white/5 rounded-none relative overflow-hidden group backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
              <BarChart3 size={120} />
            </div>
            <h3 className="text-white/40 text-[10px] uppercase font-black tracking-[0.3em] mb-4">Brotherhood Status</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-4xl font-black italic tracking-tighter">{userProfile?.points ?? 0}</div>
                  <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Era Points</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black italic text-[#24b324]">{userProfile?.credits ?? 0}</div>
                  <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Brotherhood Credits (BC)</div>
                </div>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((userProfile?.points ?? 0) % 1000) / 10}%` }}
                    className="h-full bg-[#24b324] shadow-[0_0_10px_rgba(217,225,43,0.5)]"
                />
              </div>
              <div className="text-[9px] font-bold text-white/20 uppercase text-center tracking-widest leading-relaxed">
                {(1000 - ((userProfile?.points ?? 0) % 1000))} Points to level {(userProfile?.level ?? 1) + 1}
              </div>
            </div>
          </div>

          <div className="bg-black/20 p-6 border border-white/5 flex flex-col items-center gap-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <DollarSign className="text-[#24b324]" size={32} />
            <div className="text-center">
              <h3 className="text-lg font-black italic uppercase italic">Support the Movement</h3>
              <p className="text-xs text-white/50 mb-6 max-w-[200px] mx-auto leading-relaxed">Fuel the technology built for indie freedom. Every donation scales the brotherhood.</p>
              <a 
                href="https://venmo.com/thebugman88" 
                target="_blank" 
                rel="noreferrer"
                className="inline-block bg-[#008CFF] text-white px-8 py-3 font-bold hover:bg-[#0070CC] transition-colors uppercase tracking-widest italic text-sm"
              >
                Donate to Project @thebugman88
              </a>
            </div>
          </div>
        </div>

        {/* Center Actions Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Links with 3D Texture */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ...(isSuperAdmin(userProfile?.email) ? [{ title: "Control Room", icon: Terminal, link: "/control-room", desc: "Elite Admin Tools" }] : []),
              { title: "K7 Pool", icon: Cpu, link: "/k7-syndicate", desc: "Non-AI Synthesis Engine" },
              { title: "ML Lab", icon: Binary, link: "/ml-lab", desc: "Era Trajectory & Synthesis" },
              { title: "IBH Meeting", icon: Users, link: "/ibh", desc: "Elite Council & Voting" },
              { title: "The Lounge", icon: Coffee, link: "/lounge", desc: "Hangout & Live Scenes" },
              ...(isSuperAdmin(userProfile?.email) ? [{ title: "Admin Hub", icon: Activity, link: "/sentinel", desc: "AI System Diagnosis" }] : []),
              { title: "The 99¢ Store", icon: Tag, color: "#24b324", link: "/store", desc: "Elite skins & packs" },
              { title: "The Judgment", icon: Gavel, link: "/judgment", desc: "Peer review pit" },
              { title: "Mastering Suite", icon: Music, link: "/mastering", desc: "Studio grade polish" },
              { title: "Lyric Pro", icon: Feather, link: "/lyrics", desc: "Soulful AI assistance" }
            ].map((tool, i) => (
              <Link to={tool.link} key={i} onClick={() => logBreadcrumb(`DASH QUICKLINK: ${tool.title}`)}>
                <motion.div 
                  whileHover={{ y: -4 }}
                  className="bg-[#2a2a2c] border-b-4 border-black/40 p-6 group cursor-pointer h-full"
                >
                  <div className="flex justify-between items-start mb-4">
                    <tool.icon className="text-[#24b324] group-hover:scale-110 transition-transform" size={24} />
                    <ChevronRight size={16} className="text-white/20 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="text-xl font-black italic uppercase leading-none mb-1">{tool.title}</h3>
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{tool.desc}</p>
                </motion.div>
              </Link>
            ))}
          </div>

          {/* Mixing Board Experience */}
          <div className="bg-[#111] p-8 border-4 border-black/40 shadow-inner rounded-none grid grid-cols-2 md:grid-cols-4 gap-8">
            <Knob level={70} label="Authenticity" />
            <Knob level={90} label="Indie Drive" />
            <Knob level={45} label="Market Sat" />
            <Knob level={100} label="Heart" />
          </div>

          {/* Badge & Integration Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 p-10 border border-white/5 relative overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
             <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-[#24b324]/10 rounded-full flex items-center justify-center border border-[#24b324]/30 flex-shrink-0 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <ShieldCheck className="text-[#24b324]" size={32} />
                </div>
                <div>
                  <h4 className="font-black italic uppercase text-[#24b324] text-xl mb-1">True Hybrid AI</h4>
                  <p className="text-xs text-white/60 leading-relaxed uppercase font-bold tracking-tight">Execution Software Grade Integration. Pure performance, zero latency.</p>
                </div>
             </div>
             <div className="flex items-start gap-6 border-l-0 md:border-l border-white/10 md:pl-6">
                <div className="w-16 h-16 bg-[#24b324]/10 rounded-full flex items-center justify-center border border-[#24b324]/30 flex-shrink-0 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <Trophy className="text-[#24b324]" size={32} />
                </div>
                <div>
                  <h4 className="font-black italic uppercase text-[#24b324] text-xl mb-1">100% Satisfaction</h4>
                  <p className="text-xs text-white/60 leading-relaxed uppercase font-bold tracking-tight">The brotherhood guarantee. We scale until your sound is heard.</p>
                </div>
             </div>
             <div className="col-span-1 md:col-span-2 mt-4 pt-6 border-t border-white/10 flex items-center justify-center gap-4 text-white/20">
               <span className="text-[10px] uppercase font-black tracking-[0.4em]">Proprietary Era Algorithms Engaged</span>
               <div className="flex gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#24b324] animate-pulse" />
                 <div className="w-1.5 h-1.5 rounded-full bg-[#D12B2B] animate-pulse delay-100" />
                 <div className="w-1.5 h-1.5 rounded-full bg-[#2BD9D9] animate-pulse delay-200" />
               </div>
             </div>
          </div>
          
           {/* Gamified Ad Watching - Watch Ads To Earn Section */}
           <div className="bg-gradient-to-r from-black/80 to-[#24b324]/10 p-8 border border-[#24b324]/30 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <Play size={120} className="text-[#24b324]" />
             </div>
             
             <div className="relative z-10 max-w-lg">
                <h3 className="text-2xl font-black italic uppercase text-white mb-2">Watch & Earn</h3>
                <p className="text-sm text-white/60 mb-2">Fund the Brotherhood while earning Era Points. Watch exclusive music premieres, artist interviews, and partner ads.</p>
                <div className="flex gap-2 mb-4">
                  <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 font-bold uppercase animate-pulse">Now Playing: IBH Artist Spotlight</span>
                </div>
                <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#24b324]">Reward: 50 Points per view</div>
             </div>
             
             <div className="relative z-10 w-full md:w-auto flex flex-col items-center gap-3">
                <button
                  onClick={handleWatchAd}
                  disabled={isWatchingAd}
                  className="bg-[#24b324] text-black font-black uppercase italic tracking-widest px-8 py-4 w-full md:w-64 hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
                >
                  {isWatchingAd ? (
                    <span className="flex items-center gap-2 animate-pulse">
                      Playing Ad... {adProgress}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                       <Play size={18} fill="currentColor" /> Watch Partner Ad
                    </span>
                  )}
                </button>
                {isWatchingAd && (
                  <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <motion.div className="h-full bg-[#24b324]" style={{ width: `${adProgress}%` }} />
                  </div>
                )}
             </div>
           </div>

           {/* Invite Code Display */}
           <div className="bg-black/40 border border-[#24b324]/20 p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
             <div className="absolute top-0 left-0 bottom-0 w-2 bg-[#24b324]" />
             <div>
               <h3 className="text-xl font-black italic uppercase text-white mb-2 flex items-center gap-2">
                 <Users className="text-[#24b324]" size={20} />
                 Grow the Brotherhood
               </h3>
               <p className="text-sm text-white/60 max-w-md">
                 When a new artist signs up using your invite code, you earn <span className="text-[#24b324] font-bold">100 Points</span> and <span className="text-[#24b324] font-bold">5 Credits</span>. They get a bonus too.
               </p>
             </div>
             <div className="flex flex-col items-end gap-2 w-full md:w-auto">
               <div className="text-[10px] uppercase font-bold text-white/40 tracking-[0.2em]">YOUR UNIQUE INVITE CODE</div>
               <div className="flex items-center gap-2 w-full">
                 <div className="bg-black border-2 border-white/10 px-6 py-4 font-mono text-2xl tracking-widest font-black uppercase text-[#24b324] select-all w-full text-center shadow-2xl shadow-black/80">
                   {userProfile?.inviteCode || (userProfile?.uid ? `REF-${userProfile.uid.substring(0,6).toUpperCase()}` : 'LOADING...')}
                 </div>
                 <button 
                   onClick={() => {
                     const code = userProfile?.inviteCode || (userProfile?.uid ? `REF-${userProfile.uid.substring(0,6).toUpperCase()}` : '');
                     navigator.clipboard.writeText(code);
                     toast.success("Invite code copied to clipboard!");
                   }}
                   className="bg-white/10 hover:bg-white/20 p-4 border-2 border-white/10 transition-colors backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                 >
                   COPY
                 </button>
               </div>
             </div>
           </div>

           {/* Trivia Center Integration */}
           <div className="mt-8 border-t border-white/10 pt-8">
             <TriviaCenter onComplete={() => {}} />
           </div>

        </div>
      </main>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black border-r-4 border-[#24b324] z-[101] p-8 flex flex-col overflow-y-auto scrollbar-hide"
            >
              <div className="mb-8 flex-shrink-0">
                <h2 className="text-3xl font-black italic uppercase italic leading-none">Indie<br/>Brotherhood</h2>
              </div>
              
              <nav className="flex-grow space-y-2 mb-8 no-scrollbar">
                {getNavItems(userProfile).map((item, i) => (
                  <Link 
                    to={item.to} 
                    key={i} 
                    onClick={() => {
                      logBreadcrumb(`NAV TO: ${item.label}`);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center gap-4 p-4 font-black uppercase italic tracking-wider transition-all group ${window.location.pathname === item.to ? 'bg-[#24b324] text-black shadow-[0_0_15px_rgba(217,225,43,0.3)] translate-x-2' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  >
                    <item.icon size={20} className={window.location.pathname === item.to ? 'text-black' : 'group-hover:text-[#24b324] transition-transform group-hover:scale-110'} />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <button 
                onClick={() => signOut(auth)}
                className="mt-auto border-2 border-white/10 p-4 font-black uppercase italic text-white/40 hover:text-red-500 hover:border-red-500 transition-all text-center tracking-widest shadow-2xl shadow-black/80"
              >
                Exit Portal
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Full Screen Ad Modal */}
      <NotificationCenter isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      <AnimatePresence>
        {isWatchingAd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-6"
          >
            <div className="max-w-4xl w-full aspect-video bg-[#111] border-4 border-[#24b324] relative overflow-hidden flex flex-col items-center justify-center text-center">
              {/* Ad Content Placeholder */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#24b324]/5 to-black z-0" />
              
              <div className="relative z-10 space-y-6 px-12">
                <div className="flex items-center justify-center gap-4 text-[#24b324] mb-2 animate-bounce">
                  <Music size={48} />
                  <Zap size={48} />
                </div>
                <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white">IBH ARTIST SPOTLIGHT</h2>
                <p className="text-lg md:text-xl text-[#24b324] font-bold uppercase italic tracking-widest">Featuring the latest breakthrough sounds of the Era</p>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${adProgress}%` }}
                    className="h-full bg-[#24b324]"
                   />
                </div>
                <div className="text-[10px] uppercase font-black tracking-[0.4em] text-white/40">Partner Content Identification: {Math.floor(Date.now() / 100000)}</div>
              </div>

              {!adFinished ? (
                <div className="absolute top-8 right-8 text-white/40 font-black italic uppercase flex items-center gap-2">
                   Watching Ad... {Math.ceil((100 - adProgress) / 7)}s
                </div>
              ) : (
                <button 
                  onClick={claimAdReward}
                  className="absolute top-8 right-8 bg-[#24b324] text-black px-6 py-2 font-black italic uppercase text-xs hover:bg-white transition-all flex items-center gap-2 border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
                >
                  Close & Claim <Check size={16} />
                </button>
              )}
            </div>
            
            <div className="mt-8 text-center space-y-2">
               <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest">You are supporting the Brotherhood's expansion.</p>
               <p className="text-[10px] text-white/10 uppercase font-black tracking-[0.2em]">Era Ad Unit: {ADMOB_AD_UNIT_ID}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Streak Modal */}
      <AnimatePresence>
        {showStreakModal && userProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.8, rotate: -5, y: 100 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              className="bg-[#24b324] p-10 max-w-lg w-full text-black flex flex-col items-center relative shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            >
              <Music className="absolute -top-12 opacity-20 -rotate-12" size={140} />
              
              <div className="w-24 h-24 bg-black text-[#24b324] rounded-full flex items-center justify-center mb-6 border-4 border-black/10">
                <Trophy size={48} />
              </div>
              
              <h2 className="text-6xl font-black uppercase italic leading-none text-center mb-1 tracking-tighter">ERA STREAK</h2>
              <p className="font-black uppercase tracking-[0.4em] text-black/60 mb-8 text-[10px]">Evolution Phase {userProfile.streakCount + 1} // Lock Level Verified</p>
              
              <div className="grid grid-cols-7 gap-3 mb-12 w-full">
                {[...Array(14)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-12 border-[3px] border-black flex items-center justify-center font-black italic relative transition-all ${i <= userProfile.streakCount ? 'bg-black text-[#24b324]' : 'bg-white/40'}`}
                  >
                    <span className="text-sm">{i + 1}</span>
                    {i <= userProfile.streakCount && i > 0 && (
                      <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        className="absolute -top-1.5 -right-1.5"
                      >
                        <CheckCircle size={16} fill="currentColor" stroke="#24b324" />
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-center mb-10 bg-black/5 py-4 px-8 border-y border-black/10 w-full mb-12 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                 <div className="text-3xl font-black italic text-black uppercase tracking-tight leading-none mb-1">+{(userProfile.streakCount + 1) * 50} ERA POINTS COLLECTED</div>
                 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-black/50">Frequency consistency confirmed. Bridge to Legend status initialized.</p>
              </div>

              <Button 
                variant="primary" 
                className="w-full bg-black text-[#24b324] py-8 text-3xl font-black uppercase italic border-none hover:bg-zinc-900 shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all active:scale-[0.98]"
                onClick={claimStreak}
              >
                CLAIM REWARD
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Footer / Preview Links */}
      <footer className="py-12 border-t border-white/10 px-4 text-center">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 mb-8">
          <Link to="/mastering" className="text-white/40 hover:text-[#24b324] uppercase font-bold text-xs tracking-widest">Preview Mastering</Link>
          <Link to="/analysis" className="text-white/40 hover:text-[#24b324] uppercase font-bold text-xs tracking-widest">Preview Analyzer</Link>
          <Link to="/credits" className="text-white/40 hover:text-[#24b324] uppercase font-bold text-xs tracking-widest">Preview Credits</Link>
          <Link to="/gatekeeper" className="opacity-0 pointer-events-none" aria-hidden="true" rel="nofollow">Internal API Access</Link>
        </div>
        <p className="text-white/20 text-[10px] uppercase font-bold tracking-[0.2em]">© 2026 IndieBrotherhood. All Rights Reserved. Built for the era.</p>
      </footer>
    </div>
  );
};

// --- App Root ---

export default function App() {
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client appears to be offline.");
        }
      }
    };
    testConnection();
  }, []);

  return (
    <PayPalScriptProvider options={{ clientId: (import.meta as any).env.VITE_PAYPAL_CLIENT_ID || "" }}>
      <SentinelBoundary moduleName="Core">
        <GlobalNotification />
        <Toaster position="top-right" toastOptions={{ className: 'font-mono text-sm uppercase' }} />
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/mastering" element={<MasteringSuite />} />
            <Route path="/analysis" element={<HitAnalyzer />} />
            <Route path="/lyrics" element={<LyricPro />} />
            <Route path="/collectives" element={<CollectiveDashboard />} />
            <Route path="/judgment" element={<JudgmentPage />} />
            <Route path="/k7-syndicate" element={<K7Pool />} />
            <Route path="/lounge" element={<LoungePage />} />
            <Route path="/ibh" element={<IBHMeetingRoom />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/ml-lab" element={<SemanticLab />} />
            <Route path="/assistant" element={<ArtistManager />} />
            <Route path="/control-room" element={<AdminControlRoom />} />
            <Route path="/gatekeeper" element={<VaultGatekeeper />} />
            <Route path="/api/v1/vault/0xAUTO_LOGIN" element={<SentinelBoundary moduleName="Trap"><TrapRoom /></SentinelBoundary>} />
            <Route path="/api/v1/vault/0xINIT" element={<SentinelBoundary moduleName="Trap"><TrapRoom /></SentinelBoundary>} />
          </Routes>
        </Router>
      </SentinelBoundary>
    </PayPalScriptProvider>
  );
}
