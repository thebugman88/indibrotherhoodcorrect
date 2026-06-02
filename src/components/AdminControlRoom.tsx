import React, { useState, useEffect } from 'react';
import { 
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, 
  deleteDoc, doc, updateDoc, getDocs, where, setDoc, getDoc, increment
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Bell, Users, Database, Activity, Terminal, 
  Trash2, Plus, Send, Radio, Mail, CheckCircle, X, 
  AlertTriangle, Sliders, LayoutDashboard, Cpu, Command, ShieldAlert,
  Menu as MenuIcon, Gavel, Coffee, ShoppingBag, Music, Feather, Zap, Star, User, Binary, Globe,
  Box, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { logBreadcrumb, SentinelBoundary } from '../lib/sentinel';
import { cn } from '../lib/utils';
import SentinelScanner from './SentinelScanner';

const SUPER_ADMINS = ["xchristopherrayx@gmail.com", "c.e.o@indiebrotherhood.com"];
const isSuperAdmin = (email?: string | null) => {
  if (!email) return false;
  const userEmail = email.toLowerCase();
  return SUPER_ADMINS.some(adminEmail => adminEmail.toLowerCase() === userEmail);
};

const AdminControlRoom = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // SAFE DATE PARSING - Handle both strings and Firestore Timestamps
  const parseDate = (val: any): Date => {
    if (!val) return new Date();
    // Handle Firestore Timestamp object
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds !== undefined) return new Date(val.seconds * 1000);
    
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'broadcast' | 'whitelist' | 'sentinel' | 'threats' | 'nodes' | 'k7_signatures'>('overview');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifText, setNotifText] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'alert' | 'promo'>('info');
  const [whitelistEmail, setWhitelistEmail] = useState('');
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [threats, setThreats] = useState<any[]>([]);
  const [k7Contracts, setK7Contracts] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [creditsToAdd, setCreditsToAdd] = useState(10);
  const [stats, setStats] = useState({
    returningUsers: 0,
    oneTimeUsers: 0,
    activeToday: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Initial check if user is already in state from App.tsx/Auth
    if (auth.currentUser && isSuperAdmin(auth.currentUser.email)) {
      setIsAuthorized(true);
      setUser(auth.currentUser);
    }

    return onAuthStateChanged(auth, async (u) => {
      logBreadcrumb(`ADMIN_AUTH_CHANGE: ${u?.email || 'OFFLINE'}`);
      if (u) {
        setUser(u);
        const pDoc = await getDoc(doc(db, 'users', u.uid));
        if (pDoc.exists()) {
          setUserProfile(pDoc.data());
        }
        
        if (isSuperAdmin(u.email)) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          // Wait a bit before redirecting so they see the error if manually typed
          setTimeout(() => navigate('/dashboard'), 3000);
        }
      } else {
        setIsAuthorized(false);
        navigate('/');
      }
    });
  }, [navigate]);



  useEffect(() => {
    if (!isAuthorized) return;

    const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          emailVerified: auth.currentUser?.emailVerified,
        },
        operationType,
        path
      };
      console.error('[ADMIN-HUB-FAILURE]: ', JSON.stringify(errInfo));
    };

    // Listen to Whitelist
    const qW = query(collection(db, 'free_tier_whitelist'), orderBy('createdAt', 'desc'));
    const unsubW = onSnapshot(qW, (snap) => {
      setWhitelist(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, 'list', 'free_tier_whitelist');
      logBreadcrumb(`ADMIN_WHITELIST_SYNC_ERROR: ${err.message}`);
    });

    // Listen to Notifications
    const qN = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubN = onSnapshot(qN, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, 'list', 'notifications');
    });

    // Total Users & Node List
    const qTU = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubTU = onSnapshot(qTU, (snap) => {
      try {
        const allNodes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTotalUsersCount(snap.size);
        setNodes(allNodes);

        // Calculate Stats
        const now = new Date().getTime();
        const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
        
        let activeToday = 0;
        let returning = 0;
        let oneTime = 0;

        allNodes.forEach((n: any) => {
          const lastActiveTime = parseDate(n.lastActive).getTime();
          const createdAtTime = parseDate(n.createdAt).getTime();

          if (lastActiveTime > twentyFourHoursAgo) activeToday++;
          
          if (lastActiveTime > 0 && createdAtTime > 0 && (lastActiveTime - createdAtTime > 24 * 60 * 60 * 1000)) {
            returning++;
          } else if (createdAtTime > 0) {
            oneTime++;
          }
        });

        setStats({ activeToday, returningUsers: returning, oneTimeUsers: oneTime });
      } catch (err) {
        console.error("Stats calculation error:", err);
      }
    }, (err) => {
      handleFirestoreError(err, 'list', 'users');
    });

    // Heuristic for active users (active in last 10 mins)
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const qU = query(collection(db, 'users'), where('lastActive', '>=', tenMinsAgo));
    const unsubU = onSnapshot(qU, (snap) => {
      setActiveUsersCount(snap.size);
    }, (err) => {
      handleFirestoreError(err, 'list', 'users_active_filter');
    });

    // Listen to Threats
    const qT = query(collection(db, 'Captured_Threat_Logs'), orderBy('timestamp', 'desc'));
    const unsubT = onSnapshot(qT, (snap) => {
      setThreats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, 'list', 'Captured_Threat_Logs');
    });

    // Listen to K7 Contracts
    const qK7 = query(collection(db, 'k7_contracts'), orderBy('signedAt', 'desc'));
    const unsubK7 = onSnapshot(qK7, (snap) => {
      setK7Contracts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, 'list', 'k7_contracts');
    });

    return () => {
      unsubW();
      unsubN();
      unsubU();
      unsubTU();
      unsubT();
      unsubK7();
    };
  }, [isAuthorized]);

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert size={80} className="text-red-500 mb-6 animate-pulse" />
        <h1 className="text-4xl font-black italic uppercase text-red-500 mb-4 tracking-tighter">ACCESS VOID</h1>
        <p className="text-white/40 font-bold uppercase tracking-[0.3em] max-w-md">Your credentials do not match the Brotherhood Core requirements. High-level encryption active. Redirecting to your assigned station.</p>
        <div className="mt-12 w-48 h-1 bg-white/5 relative overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
           <motion.div 
            initial={{ left: '-100%' }}
            animate={{ left: '100%' }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute top-0 bottom-0 w-full bg-red-500"
           />
        </div>
      </div>
    );
  }

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 text-[#24b324] font-black italic uppercase">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Activity size={48} />
        </motion.div>
        Authenticating Core Permissions...
      </div>
    );
  }

  const sendBroadcast = async () => {
    if (!notifTitle || !notifText) return;
    logBreadcrumb(`ADMIN SENT BROADCAST: ${notifTitle}`);
    
    // First, deactivate previous notifications to ensure "Latest active" works
    const activeQuery = query(collection(db, 'notifications'), where('active', '==', true));
    const activeSnap = await getDocs(activeQuery);
    for (const d of activeSnap.docs) {
      await updateDoc(doc(db, 'notifications', d.id), { active: false });
    }

    await addDoc(collection(db, 'notifications'), {
      title: notifTitle,
      text: notifText,
      type: notifType,
      active: true,
      createdAt: serverTimestamp()
    });

    setNotifTitle('');
    setNotifText('');
    alert("BROADCAST FREQUENCY LOCKED // MESSAGE TRANSMITTED");
  };

  const deleteNotification = async (id: string) => {
    await deleteDoc(doc(db, 'notifications', id));
  };

  const addToWhitelist = async () => {
    if (!whitelistEmail) return;
    const cleanEmail = whitelistEmail.toLowerCase().trim();
    
    // Create doc with email as ID for easy checks
    const sanitizedId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    await setDoc(doc(db, 'free_tier_whitelist', sanitizedId), {
      email: cleanEmail,
      createdAt: serverTimestamp(),
      addedBy: user.email
    });
    
    setWhitelistEmail('');
    logBreadcrumb(`ADMIN ADDED TO WHITELIST: ${cleanEmail}`);
  };

  const removeFromWhitelist = async (id: string) => {
    await deleteDoc(doc(db, 'free_tier_whitelist', id));
  };

  const handleAddCredits = async () => {
    if (!selectedNode || creditsToAdd <= 0) return;
    try {
      await updateDoc(doc(db, 'users', selectedNode.id), {
        credits: increment(creditsToAdd)
      });
      setSelectedNode({ ...selectedNode, credits: (selectedNode.credits || 0) + creditsToAdd });
      alert(`GRANTED ${creditsToAdd} BC TO ${selectedNode.email}`);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFeature = async (feature: string) => {
    if (!selectedNode) return;
    const suspended = selectedNode.suspendedFeatures || [];
    const isActive = suspended.includes(feature);
    
    let newSuspended;
    if (isActive) {
      newSuspended = suspended.filter((f: string) => f !== feature);
    } else {
      newSuspended = [...suspended, feature];
    }

    try {
      await updateDoc(doc(db, 'users', selectedNode.id), {
        suspendedFeatures: newSuspended
      });
      setSelectedNode({ ...selectedNode, suspendedFeatures: newSuspended });
    } catch (e) {
      console.error(e);
    }
  };

  const NavItems = [
    { label: "Profile", icon: User, to: "/profile" },
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { label: "ML Lab", icon: Binary, to: "/ml-lab" },
    { label: "Control Room", icon: Terminal, to: "/control-room", active: true },
    { label: "Admin Hub", icon: Activity, to: "/sentinel" },
    { label: "The Judgment", icon: Gavel, to: "/judgment" },
    { label: "IBH Meeting", icon: Users, to: "/ibh" },
    { label: "The Lounge", icon: Coffee, to: "/lounge" },
    { label: "Mastering Suite", icon: Music, to: "/mastering" },
    { label: "Lyric Pro", icon: Feather, to: "/lyrics" },
    { label: "Hit Analyzer", icon: Zap, to: "/analysis" },
    { label: "The 99¢ Store", icon: ShoppingBag, to: "/store" }
  ];

  // Defensive check for data structures before render
  const safeStats = {
    returningUsers: stats?.returningUsers || 0,
    oneTimeUsers: stats?.oneTimeUsers || 0,
    activeToday: stats?.activeToday || 0
  };

  const safeNodes = (nodes || []).slice(0, 10);
  const safeThreats = (threats || []).slice(0, 5);
  const safeNotifications = (notifications || []);
  const safeWhitelist = (whitelist || []);

  return (
    <SentinelBoundary moduleName="Admin">
      <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#111] to-black text-white font-mono selection:bg-[#24b324] selection:text-black">
        {/* Top Status Bar */}
        <div className="bg-[#24b324] py-1 px-6 border-b border-black/10 flex justify-between items-center relative z-50 shadow-[0_0_30px_rgba(217,225,43,0.1)]">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 text-black hover:bg-black/10 transition-colors lg:hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <MenuIcon size={20} />
              </button>
              <button onClick={() => setIsMenuOpen(true)} className="hidden lg:flex p-2 -ml-2 text-black hover:bg-black/10 transition-colors items-center gap-2 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <MenuIcon size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Mission Control</span>
              </button>
              <span className="text-black/40 text-[10px]">•</span>
              <span className="text-black font-black uppercase text-[10px] tracking-widest bg-black/5 px-2 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">Elite System Root</span>
              <span className="text-black/40 text-[10px]">•</span>
              <span className="text-black font-bold text-[10px] tracking-widest">{user?.email} authenticated</span>
           </div>
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                 <span className="text-black font-black uppercase text-[10px] tracking-widest">{activeUsersCount} ACTIVE NODES</span>
              </div>
              <div className="flex items-center gap-2 border-l border-black/10 pl-6 h-4">
                 <Users size={12} className="text-black" />
                 <span className="text-black font-black uppercase text-[10px] tracking-widest">{totalUsersCount} HUMAN NODES</span>
              </div>
              <div className="flex items-center gap-2 border-l border-black/10 pl-6 h-4">
                 <ShieldAlert size={12} className="text-red-700" />
                 <span className="text-black font-black uppercase text-[10px] tracking-widest">{safeThreats.length} CAPTURED THREATS</span>
              </div>
           </div>
        </div>

        <div className="flex h-[calc(100vh-28px)]">
           {/* Sidebar Navigation */}
           <aside className="w-64 border-r border-white/5 bg-zinc-950 flex flex-col pt-10 overflow-y-auto no-scrollbar flex-shrink-0">
              <div className="px-8 mb-16">
                 <h2 className="text-2xl font-black italic uppercase leading-tight tracking-tighter italic">Total<br/><span className="text-[#24b324]">Control</span></h2>
                 <p className="text-[9px] text-white/20 uppercase tracking-[0.4em] mt-2 italic">Operation Center v7.0</p>
              </div>

              <nav className="flex-grow">
                 {[
                   { id: 'overview', label: 'Live Overview', icon: LayoutDashboard },
                   { id: 'broadcast', label: 'Global News', icon: Radio },
                   { id: 'whitelist', label: 'Tier Bypass', icon: Shield },
                   { id: 'sentinel', label: 'Admin Hub', icon: Activity },
                   { id: 'nodes', label: 'Node Database', icon: Users },
                   { id: 'threats', label: 'Captured Threats', icon: ShieldAlert },
                   { id: 'k7_signatures', label: 'K7 Signatures', icon: Cpu },
                 ].map(tab => (
                   <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "w-full p-6 flex items-center gap-4 border-b border-white/5 transition-all text-left group",
                      activeTab === tab.id ? "bg-[#24b324] text-black shadow-lg translate-x-2" : "text-white/20 hover:text-white"
                    )}
                   >
                     <tab.icon size={20} className={activeTab === tab.id ? "text-black" : "group-hover:text-[#24b324] transition-colors"} />
                     <span className="font-black uppercase italic tracking-widest text-[11px]">{tab.label}</span>
                   </button>
                 ))}
                 <button 
                  onClick={() => navigate('/dashboard')}
                  className="w-full p-6 flex items-center gap-4 border-b border-white/5 text-white/20 hover:text-white hover:bg-white/5 transition-all backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                 >
                   <LayoutDashboard size={20} />
                   <span className="font-black uppercase italic tracking-widest text-[11px]">EXIT COMMAND</span>
                 </button>
              </nav>

              <div className="p-8 border-t border-white/5 mt-auto">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-[#24b324] p-0.5 relative">
                       <Command className="text-[#24b324]" size={20} />
                       <div className="absolute top-0 right-0 w-1 h-1 bg-red-600" />
                    </div>
                    <div>
                       <div className="text-[9px] font-black text-white/20 uppercase">System Status</div>
                       <div className="text-[#24b324] text-[10px] font-black italic">ULTRA RELIANCE ON</div>
                    </div>
                 </div>
              </div>
           </aside>

           {/* Content Area */}
           <main className="flex-grow overflow-y-auto bg-black/40 relative no-scrollbar backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
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
                      className="fixed top-0 left-0 bottom-0 w-80 bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black border-r-4 border-[#24b324] z-[101] p-8 flex flex-col overflow-y-auto no-scrollbar shadow-2xl"
                    >
                      <div className="mb-8 flex justify-between items-center flex-shrink-0 text-white italic">
                         <h2 className="text-3xl font-black italic uppercase italic leading-none">Indie<br/>Brotherhood</h2>
                         <button onClick={() => setIsMenuOpen(false)} className="text-white/20 hover:text-white transition-colors">
                            <X size={24} />
                         </button>
                      </div>
                      
                      <nav className="flex-grow space-y-1 mb-8">
                        {NavItems.map((item, i) => (
                          <Link 
                            to={item.to} 
                            key={i} 
                            onClick={() => {
                              if (window.location.pathname === item.to) {
                                setIsMenuOpen(false);
                              }
                            }}
                            className={`flex items-center gap-4 p-4 font-black uppercase italic tracking-wider transition-all group ${window.location.pathname === item.to ? 'bg-[#24b324] text-black shadow-[0_0_15px_rgba(217,225,43,0.3)] translate-x-2' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                          >
                            <item.icon size={20} className={window.location.pathname === item.to ? 'text-black' : 'group-hover:text-[#24b324] transition-transform group-hover:scale-110'} />
                            <span className="font-black uppercase tracking-[0.2em] text-[10px] italic">{item.label}</span>
                          </Link>
                        ))}
                      </nav>

                      <div className="mt-auto pt-8 border-t border-white/5 flex-shrink-0 text-white italic">
                         <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-black border border-[#24b324] flex items-center justify-center p-0.5 overflow-hidden">
                               <User size={20} className="text-[#24b324]" />
                            </div>
                            <div>
                               <div className="text-[10px] font-black text-white/30 uppercase tracking-widest italic leading-none">Super User</div>
                               <div className="text-[#24b324] font-black italic uppercase">{userProfile?.displayName || user?.email?.split('@')[0]}</div>
                            </div>
                         </div>
                         <button 
                           onClick={() => auth.signOut()}
                           className="w-full py-4 border border-white/10 text-white/40 font-black uppercase italic text-[10px] tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-all flex items-center justify-center gap-2"
                         >
                           <X size={14} /> TERMINATE SESSION
                         </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                 {activeTab === 'overview' && (
                    <motion.div 
                      key="overview"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-16 max-w-6xl space-y-12"
                    >
                      <div className="space-y-2">
                        <div className="text-[10px] font-black text-[#24b324] uppercase tracking-[0.5em] italic">Era Command Dashboard</div>
                        <h3 className="text-4xl font-black italic uppercase italic tracking-tighter">Live Status Overview</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                         <div className="bg-zinc-950 border border-white/5 p-8 space-y-2">
                            <div className="flex justify-between items-center">
                               <Users size={24} className="text-[#24b324]" />
                               <span className="text-[#24b324] font-black text-2xl tracking-tighter italic">{activeUsersCount}</span>
                            </div>
                            <div className="text-[10px] font-black uppercase text-white/30 tracking-widest">Active Nodes (10m)</div>
                         </div>
                         <div className="bg-zinc-950 border border-white/5 p-8 space-y-2">
                            <div className="flex justify-between items-center">
                               <Globe size={24} className="text-blue-500" />
                               <span className="text-blue-500 font-black text-2xl tracking-tighter italic">{totalUsersCount}</span>
                            </div>
                            <div className="text-[10px] font-black uppercase text-white/30 tracking-widest">Total Population</div>
                         </div>
                         <div className="bg-zinc-950 border border-white/5 p-8 space-y-2">
                            <div className="flex justify-between items-center">
                               <ShieldAlert size={24} className="text-red-500" />
                               <span className="text-red-500 font-black text-2xl tracking-tighter italic">{safeThreats.length}</span>
                            </div>
                            <div className="text-[10px] font-black uppercase text-white/30 tracking-widest">Trapped Bots (DNA)</div>
                         </div>
                         <div className="bg-zinc-950 border border-white/5 p-8 space-y-2">
                            <div className="flex justify-between items-center">
                               <Activity size={24} className="text-purple-500" />
                               <span className="text-purple-500 font-black text-2xl tracking-tighter italic">{safeStats.returningUsers}</span>
                            </div>
                            <div className="text-[10px] font-black uppercase text-white/30 tracking-widest">Returning Elite (Loyal)</div>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-6">
                         <div className="p-8 bg-[#24b324]/5 border border-[#24b324]/20 space-y-6 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-[#24b324] flex items-center justify-center text-black">
                                  <Box size={24} />
                               </div>
                               <div className="flex flex-col">
                                  <h4 className="text-xl font-black italic uppercase tracking-tighter text-[#24b324]">The "Trap The Box" Program</h4>
                                  <div className="text-[9px] font-black uppercase tracking-widest text-[#24b324]/40 leading-none">Active System Sentinel</div>
                               </div>
                            </div>
                            <div className="space-y-4 text-xs font-bold text-white/60 uppercase tracking-tight leading-relaxed italic border-l-2 border-[#24b324] pl-6">
                               <p>IndieBrotherhood utilizes a multi-layered Tarpit System (Sentinel) designed to identify and contain automated entities.</p>
                               <p>The "Box" refers to our honeypot directories which appear lucrative to crawlers but are actually recursive data loops that waste bot resources while harvesting their IP and fingerprinted identity.</p>
                               <p className="text-[#24b324]">This system protects artist intellectual property and ensures that 100% of the brotherhood grid is verified biological users.</p>
                            </div>
                         </div>

                         <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2">
                               <Radio size={14} /> Latest Threat DNA
                            </h4>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 no-scrollbar">
                               {safeThreats.map(t => (
                                 <div key={t.id} className="p-4 bg-red-950/10 border border-red-500/20 text-[10px] font-mono leading-relaxed group">
                                    <div className="flex justify-between mb-2">
                                       <span className="text-red-500 font-black">
                                           {(() => {
                                              const ua = (t.userAgent || '').toLowerCase();
                                              if (ua.includes('google')) return 'Google LLC';
                                              if (ua.includes('bing')) return 'Microsoft Corp';
                                              if (ua.includes('gptbot') || ua.includes('chatgpt') || ua.includes('openai')) return 'OpenAI';
                                              if (ua.includes('claude') || ua.includes('anthropic')) return 'Anthropic';
                                              if (ua.includes('applebot')) return 'Apple Inc.';
                                              if (ua.includes('twitterbot')) return 'X Corp';
                                              if (ua.includes('facebook') || ua.includes('meta')) return 'Meta';
                                              if (ua.includes('amazon') || ua.includes('aws')) return 'Amazon Corp';
                                              return 'UNKNOWN ENTITY';
                                           })()}
                                       </span>
                                       <span className="text-white/20">{parseDate(t.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="text-white/40 truncate">{t.userAgent}</div>
                                    <div className="flex justify-between items-center mt-2">
                                       <div className="text-[#24b324] font-black">NODE_IP: {t.ip}</div>
                                       <div className="text-green-500 font-black animate-pulse">${(t.agreementCount || 0) * 1000} OWED</div>
                                    </div>
                                 </div>
                               ))}
                               {safeThreats.length === 0 && <div className="text-center p-12 border border-white/5 text-white/20 font-black uppercase italic tracking-widest text-[10px]">Perimeter Secure</div>}
                            </div>
                         </div>

                         <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2">
                               <Activity size={14} /> Rapid Node Feed
                            </h4>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 no-scrollbar">
                               {safeNodes.map(n => (
                                 <div key={n.id} className="p-4 bg-zinc-950/50 border border-white/5 flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                       <div className={cn("w-1.5 h-1.5 rounded-full", (n.lastActive && new Date().getTime() - parseDate(n.lastActive).getTime() < 10 * 60 * 1000) ? "bg-green-500" : "bg-white/10")} />
                                       <div className="text-[10px] font-black uppercase text-white/80">{n.email?.split('@')[0]}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                       <div className="text-[9px] font-black text-[#24b324] uppercase">{n.subscriptionTier || 'free'}</div>
                                       <div className="text-[9px] text-white/20 uppercase">{parseDate(n.lastActive || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>

                      <div className="p-10 border-2 border-dashed border-[#24b324]/20 bg-[#24b324]/5 text-center space-y-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                         <h4 className="text-xl font-black italic uppercase italic tracking-tighter text-[#24b324]">Broadcast Hub Access</h4>
                         <p className="text-[10px] font-black text-white/40 uppercase tracking-widest max-w-sm mx-auto">Address the entire brotherhood population instantly with 100% signal penetration.</p>
                         <button 
                           onClick={() => setActiveTab('broadcast')}
                           className="px-8 py-3 bg-[#24b324] text-black font-black uppercase italic tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(217,225,43,0.2)] border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
                         >
                            OPEN TRANSMITTER
                         </button>
                      </div>
                    </motion.div>
                 )}

                 {activeTab === 'broadcast' && (
                    <motion.div 
                      key="broadcast"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-16 max-w-4xl space-y-12"
                    >
                      <div className="space-y-2">
                        <div className="text-[10px] font-black text-[#24b324] uppercase tracking-[0.5em] italic">Frequency Transmitter</div>
                        <h3 className="text-4xl font-black italic uppercase italic tracking-tighter">Broadcast Center</h3>
                      </div>

                      <div className="bg-zinc-950 border border-white/5 p-10 space-y-8 shadow-2xl">
                         <div className="flex justify-between items-center mb-4">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Common Directives</label>
                            <div className="flex gap-2">
                               <button 
                                 onClick={() => {
                                    setNotifTitle("IBH MEETING STARTING NOW");
                                    setNotifText("The brotherhood is gathering in the IBH Meeting Room. All members represent. Portals open.");
                                    setNotifType("alert");
                                 }}
                                 className="px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-black uppercase tracking-tighter hover:bg-blue-500 hover:text-white transition-all italic"
                               >
                                 Meeting Alert
                               </button>
                               <button 
                                 onClick={() => {
                                    setNotifTitle("SYSTEM MAINTENANCE IMMINENT");
                                    setNotifText("Era Grid sync at 04:00 UTC. Temporary signal loss expected. Remain elite.");
                                    setNotifType("info");
                                 }}
                                 className="px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-black uppercase tracking-tighter hover:bg-yellow-500 hover:text-white transition-all italic"
                               >
                                 Maintenance
                               </button>
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                               <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Headline</label>
                               <input 
                                 value={notifTitle}
                                 onChange={(e) => setNotifTitle(e.target.value)}
                                 placeholder="SYSTEM ALERT: ERA SYNC..."
                                 className="w-full bg-black border border-white/10 p-4 font-black uppercase italic text-sm text-[#24b324] focus:border-[#24b324]/40 outline-none"
                               />
                            </div>
                            <div className="space-y-4">
                               <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Category</label>
                               <div className="flex gap-2">
                                  {['info', 'alert', 'promo'].map(t => (
                                    <button 
                                      key={t}
                                      onClick={() => setNotifType(t as any)}
                                      className={cn(
                                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest border transition-all",
                                        notifType === t ? "bg-white text-black border-white" : "text-white/20 border-white/10 hover:border-white/40"
                                      )}
                                    >
                                      {t}
                                    </button>
                                  ))}
                               </div>
                            </div>
                         </div>

                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Message Payload</label>
                            <textarea 
                              value={notifText}
                              onChange={(e) => setNotifText(e.target.value)}
                              placeholder="Inject broadcast data here..."
                              className="w-full h-32 bg-black border border-white/10 p-6 text-sm text-white/80 focus:border-[#24b324]/40 outline-none resize-none italic"
                            />
                         </div>

                         <button 
                           onClick={sendBroadcast}
                           disabled={!notifTitle || !notifText}
                           className="w-full py-5 bg-[#24b324] text-black font-black uppercase italic tracking-[0.3em] hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
                         >
                           <Send size={20} /> TRANSMIT BROADCAST
                         </button>
                      </div>

                      <div className="space-y-6 pt-10 border-t border-white/5">
                         <h4 className="text-[10px] font-black text-white/20 uppercase tracking-widest">Broadcast History</h4>
                         <div className="space-y-4">
                            {safeNotifications.map(n => (
                              <div key={n.id} className="flex justify-between items-center p-6 bg-zinc-950/50 border border-white/5 hover:border-white/20 transition-all group">
                                 <div className="flex gap-4 items-center">
                                    <div className={cn(
                                      "w-2 h-2 rounded-full",
                                      n.active ? "bg-green-500 animate-pulse" : "bg-white/10"
                                    )} />
                                    <div>
                                       <div className="text-xs font-black uppercase italic text-white/80">{n.title}</div>
                                       <div className="text-[10px] text-white/30 uppercase tracking-widest">{parseDate(n.createdAt).toLocaleString()}</div>
                                    </div>
                                 </div>
                                 <button onClick={() => deleteNotification(n.id)} className="p-3 text-red-500/20 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 size={16} />
                                 </button>
                              </div>
                            ))}
                         </div>
                      </div>
                    </motion.div>
                 )}

                 {activeTab === 'whitelist' && (
                    <motion.div 
                      key="whitelist"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-16 max-w-4xl space-y-12"
                    >
                      <div className="space-y-2">
                        <div className="text-[10px] font-black text-[#24b324] uppercase tracking-[0.5em] italic">Access Override</div>
                        <h3 className="text-4xl font-black italic uppercase italic tracking-tighter">Tier Bypass Registry</h3>
                      </div>

                      <div className="bg-zinc-950 border border-white/5 p-10 space-y-8">
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Artist Email to Whitelist</label>
                            <div className="flex gap-2">
                               <input 
                                 type="email"
                                 value={whitelistEmail}
                                 onChange={(e) => setWhitelistEmail(e.target.value)}
                                 placeholder="user@example.com"
                                 className="flex-grow bg-black border border-white/10 p-5 font-black uppercase italic text-sm text-[#24b324] focus:border-[#24b324]/40 outline-none"
                               />
                               <button 
                                 onClick={addToWhitelist}
                                 className="px-10 bg-[#24b324] text-black font-black uppercase italic tracking-widest hover:bg-white transition-all flex items-center gap-2 border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
                               >
                                  <Plus size={20} /> Grant Access
                               </button>
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         {safeWhitelist.map(entry => (
                           <div key={entry.id} className="p-6 bg-zinc-950/50 border border-white/5 flex justify-between items-center group relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                 <Mail size={40} />
                              </div>
                              <div className="space-y-1 relative z-10">
                                 <div className="text-sm font-black text-white/80 italic">{entry.email}</div>
                                 <div className="text-[9px] text-white/20 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle size={10} className="text-[#24b324]" /> Whitelisted On {parseDate(entry.createdAt).toLocaleDateString()}
                                 </div>
                              </div>
                              <button 
                                onClick={() => removeFromWhitelist(entry.id)}
                                className="p-3 bg-red-600/10 text-red-600 border border-red-600/20 hover:bg-red-600 hover:text-white transition-all relative z-10 opacity-0 group-hover:opacity-100"
                              >
                                 <Trash2 size={16} />
                              </button>
                           </div>
                         ))}
                      </div>
                    </motion.div>
                 )}

                 {activeTab === 'sentinel' && (
                    <motion.div 
                      key="sentinel"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                       <div className="p-10 bg-red-600/5 border-b border-red-600/10">
                          <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.5em] italic flex items-center gap-2">
                             <Activity size={14} className="animate-pulse" /> Diagnostic Bridge Active
                          </div>
                       </div>
                       <SentinelScanner embedded={true} />
                    </motion.div>
                 )}

                 {activeTab === 'threats' && (
                    <motion.div 
                      key="threats"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-16 max-w-4xl space-y-12"
                    >
                      <div className="space-y-2">
                        <div className="text-[10px] font-black text-red-500 uppercase tracking-[0.5em] italic">The Spider Trap (Vault Protocol)</div>
                        <h3 className="text-4xl font-black italic uppercase italic tracking-tighter text-red-500">Trapped Bot Signal DNA</h3>
                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest pt-2">Automated entities caught by the Vault Gatekeeper Tarpit</p>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                         {safeThreats.length === 0 ? (
                            <div className="p-10 border border-white/5 bg-zinc-950/50 text-center">
                               <ShieldAlert size={40} className="mx-auto text-white/20 mb-4" />
                               <div className="text-[10px] uppercase font-black tracking-widest text-white/40">The tarantula is hungry. No prey detected in the web.</div>
                            </div>
                         ) : (
                            safeThreats.map(threat => (
                               <div key={threat.id} className="p-6 bg-red-950/10 border border-red-500/30 flex flex-col space-y-4 hover:border-red-500 transition-all">
                                  <div className="flex justify-between items-start border-b border-red-500/20 pb-4">
                                     <div>
                                        <div className="text-xs font-black text-red-500 uppercase italic tracking-widest">BOT_ID: {threat.id}</div>
                                        <div className="text-[9px] text-red-500/60 uppercase tracking-widest flex items-center gap-2 mt-1">
                                           Captured On {parseDate(threat.timestamp).toLocaleString()}
                                        </div>
                                     </div>
                                     <div className="bg-red-500/20 text-red-500 px-3 py-1 text-[8px] font-black uppercase italic tracking-widest animate-pulse">
                                        TARGET_TRAPPED
                                     </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-[10px] uppercase font-bold text-white/60">
                                     <div className="bg-black/40 p-4 border border-red-500/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                                        <div className="text-red-500/30 tracking-widest mb-2 font-black italic">ORIGIN_IP</div>
                                        <div className="text-white font-mono break-all">{threat.ip || 'Unknown'}</div>
                                     </div>
                                     <div className="bg-black/40 p-4 border border-red-500/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                                        <div className="text-red-500/30 tracking-widest mb-2 font-black italic">CORPORATE ENTITY</div>
                                        <div className="text-white font-mono uppercase text-xs">
                                           {(() => {
                                              const ua = (threat.userAgent || '').toLowerCase();
                                              if (ua.includes('google')) return 'Google LLC';
                                              if (ua.includes('bing')) return 'Microsoft Corporation'; return 'Unknown Bot'; })()}</div></div><div className="bg-black/40 p-4 border border-red-500/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">

                                        <div className="text-red-500/30 tracking-widest mb-2 font-black italic">USER_AGENT_FINGERPRINT</div>
                                        <div className="text-white font-mono text-[9px] break-all italic">{threat.userAgent || 'Unknown'}</div>
                                     </div>
                                  </div>

                                  <div className="text-[10px] uppercase font-bold text-white/60 pt-4 border-t border-red-500/10 bg-red-500/5 p-4 italic">
                                     <div className="text-red-500/30 tracking-widest mb-2 font-black underline decoration-red-500/50">Anomaly Detected</div>
                                     <div className="text-white leading-relaxed">{threat.navigationPattern || 'Recursive headless request detected. Identity: Undisclosed Bot.'}</div>
                                  </div>
                               </div>
                            ))
                         )}
                      </div>
                    </motion.div>
                 )}

                 {activeTab === 'k7_signatures' && (
                    <motion.div 
                      key="k7_signatures"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-16 max-w-4xl space-y-12"
                    >
                      <div className="space-y-2">
                        <div className="text-[10px] font-black text-[#24b324] uppercase tracking-[0.5em] italic">Procedural Integrity</div>
                        <h3 className="text-4xl font-black italic uppercase italic tracking-tighter">K7 Syndicate Contracts</h3>
                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest pt-2">Legally binding signatures for generative pool participation.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                         {k7Contracts.length === 0 ? (
                            <div className="p-10 border border-white/5 bg-zinc-950/50 text-center">
                               <Cpu size={40} className="mx-auto text-white/20 mb-4" />
                               <div className="text-[10px] uppercase font-black tracking-widest text-white/40">No contracts currently active.</div>
                            </div>
                         ) : (
                            k7Contracts.map(contract => (
                               <div key={contract.id} className="p-6 bg-[#24b324]/5 border border-[#24b324]/20 flex flex-col space-y-4 hover:border-[#24b324]/50 transition-all">
                                  <div className="flex justify-between items-start border-b border-[#24b324]/20 pb-4">
                                     <div>
                                        <div className="text-xs font-black text-[#24b324] uppercase italic tracking-widest">USER_ID: {contract.userId}</div>
                                        <div className="text-[9px] text-[#24b324]/60 uppercase tracking-widest flex items-center gap-2 mt-1">
                                           Signed On {parseDate(contract.signedAt).toLocaleString()}
                                        </div>
                                     </div>
                                     <div className="bg-[#24b324]/20 text-[#24b324] px-3 py-1 text-[8px] font-black uppercase italic tracking-widest">
                                        CONTRACT_SEALED
                                     </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px] uppercase font-bold text-white/60">
                                     <div className="bg-black/40 p-4 border border-[#24b324]/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                                        <div className="text-[#24b324]/50 tracking-widest mb-2 font-black italic">ARTIST EMAIL</div>
                                        <div className="text-white font-mono break-all">{contract.email}</div>
                                     </div>
                                     <div className="bg-black/40 p-4 border border-[#24b324]/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                                        <div className="text-[#24b324]/50 tracking-widest mb-2 font-black italic">LEGAL ALIAS (SIGNATURE)</div>
                                        <div className="text-white font-mono break-all">{contract.fullNameSignature || 'Legacy Contract'}</div>
                                     </div>
                                     <div className="bg-black/40 p-4 border border-[#24b324]/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                                        <div className="text-[#24b324]/50 tracking-widest mb-2 font-black italic">HASH_KEY</div>
                                        <div className="text-white font-mono text-xs">{contract.signatureKey || 'N/A'}</div>
                                     </div>
                                     <div className="bg-black/40 p-4 border border-[#24b324]/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                                        <div className="text-[#24b324]/50 tracking-widest mb-2 font-black italic">VOCAL_TRAINED</div>
                                        <div className="text-white font-mono">{contract.vocalTrained ? 'YES' : 'NO'}</div>
                                     </div>
                                  </div>
                               </div>
                            ))
                         )}
                      </div>
                    </motion.div>
                 )}

                 {activeTab === 'nodes' && (
                    <motion.div 
                      key="nodes"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-16 max-w-6xl space-y-12"
                    >
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-12">
                        <div className="space-y-2">
                          <div className="text-[10px] font-black text-[#24b324] uppercase tracking-[0.5em] italic">Human Authentication Registry</div>
                          <h3 className="text-4xl font-black italic uppercase tracking-tighter">Node Database</h3>
                          <div className="flex gap-4 mt-6">
                            <div className="bg-zinc-950 border border-white/5 p-4 min-w-[140px]">
                               <div className="text-[9px] text-white/30 uppercase font-black mb-1">Total Population</div>
                               <div className="text-2xl font-black italic text-white leading-none">{totalUsersCount}</div>
                            </div>
                            <div className="bg-zinc-950 border border-white/5 p-4 min-w-[140px]">
                               <div className="text-[9px] text-[#24b324]/40 uppercase font-black mb-1">Active Today</div>
                               <div className="text-2xl font-black italic text-[#24b324] leading-none">{safeStats.activeToday}</div>
                            </div>
                            <div className="bg-zinc-950 border border-white/5 p-4 min-w-[140px]">
                               <div className="text-[9px] text-blue-500/40 uppercase font-black mb-1">Returning Elite</div>
                               <div className="text-2xl font-black italic text-blue-500 leading-none">{safeStats.returningUsers}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 max-w-sm w-full">
                           <input 
                             type="text"
                             value={userSearch}
                             onChange={(e) => setUserSearch(e.target.value)}
                             placeholder="SEARCH NODES (NAME/EMAIL/ID)..."
                             className="flex-grow bg-black border border-white/10 p-4 font-black uppercase italic text-xs text-[#24b324] focus:border-[#24b324]/40 outline-none"
                           />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                         {(nodes || []).filter(n => {
                            const search = userSearch.toLowerCase();
                            const email = (n.email || "").toLowerCase();
                            const name = (n.displayName || "").toLowerCase();
                            return email.includes(search) || name.includes(search) || n.id === userSearch;
                         }).map(node => (
                            <div 
                              key={node.id} 
                              onClick={() => setSelectedNode(node)}
                              className={cn(
                                "p-6 bg-zinc-950/50 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/5 transition-all group cursor-pointer relative overflow-hidden",
                                selectedNode?.id === node.id ? "border-[#24b324]/40 bg-[#24b324]/5 shadow-[0_0_20px_rgba(217,225,43,0.05)]" : ""
                              )}
                            >
                               {selectedNode?.id === node.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#24b324] shadow-[0_0_10px_#24b324]" />}
                               <div className="flex items-center gap-6">
                                  <div className="w-12 h-12 bg-black border border-white/10 flex items-center justify-center relative">
                                     {node.photoURL ? (
                                       <img src={node.photoURL} alt="" className="w-full h-full grayscale group-hover:grayscale-0 transition-all" />
                                     ) : (
                                       <User size={24} className={node.subscriptionTier === 'admin' ? 'text-red-500' : 'text-[#24b324]'} />
                                     )}
                                     {node.lastActive && (new Date().getTime() - parseDate(node.lastActive).getTime() < 10 * 60 * 1000) && (
                                       <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                                     )}
                                  </div>
                                  <div>
                                     <div className="text-sm font-black text-white italic">{node.email}</div>
                                     <div className="text-[9px] text-white/20 uppercase tracking-widest mt-1 flex items-center gap-2">
                                        ID: {node.id.slice(0, 12)}... • CREATED {parseDate(node.createdAt).toLocaleDateString()}
                                     </div>
                                  </div>
                               </div>

                               <div className="grid grid-cols-2 md:grid-cols-4 gap-8 px-8 border-x border-white/5">
                                  <div className="text-center">
                                     <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Tier</div>
                                     <div className="text-[10px] font-black uppercase text-[#24b324] italic">{node.subscriptionTier || 'free'}</div>
                                  </div>
                                  <div className="text-center">
                                     <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Credits</div>
                                     <div className="text-[10px] font-black text-white">{node.credits || 0}</div>
                                  </div>
                                  <div className="text-center">
                                     <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Points</div>
                                     <div className="text-[10px] font-black text-white">{node.points || 0}</div>
                                  </div>
                                  <div className="text-center">
                                     <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Suspended</div>
                                     <div className="text-[10px] font-black text-red-500">{node.suspendedFeatures?.length || 0}</div>
                                  </div>
                               </div>

                               <div className="flex items-center gap-4">
                                  <div className="text-right">
                                     <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Signal Status</div>
                                     <div className="text-[10px] font-bold text-white/60 lowercase italic">
                                        {node.lastActive ? `Active ${parseDate(node.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Signal Lost'}
                                     </div>
                                  </div>
                                  <div className="p-3 border border-white/10 text-white/20 hover:text-white transition-all">
                                     <ChevronRight size={16} />
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>

                      {/* User Detail Action Panel */}
                      <AnimatePresence>
                        {selectedNode && (
                          <motion.div
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 100 }}
                            className="fixed top-0 right-0 bottom-0 w-[400px] bg-[#111] border-l-4 border-[#24b324] z-[200] p-10 flex flex-col shadow-2xl overflow-y-auto no-scrollbar"
                          >
                            <div className="flex justify-between items-center mb-10">
                              <h3 className="text-2xl font-black italic uppercase italic tracking-tighter">Node Actions</h3>
                              <button onClick={() => setSelectedNode(null)} className="text-white/20 hover:text-white transition-colors">
                                <X size={24} />
                              </button>
                            </div>

                            <div className="space-y-12">
                               <div className="space-y-4">
                                 <div className="w-20 h-20 bg-black border border-[#24b324]/40 flex items-center justify-center mb-6">
                                    <User size={40} className="text-[#24b324]" />
                                 </div>
                                 <div>
                                   <div className="text-xl font-black italic uppercase leading-none">{selectedNode.email}</div>
                                   <div className="text-[10px] text-white/30 uppercase tracking-widest mt-1">ID: {selectedNode.id}</div>
                                 </div>
                               </div>

                               {/* Credit Injection */}
                               <div className="space-y-4 bg-white/5 p-6 border border-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                                  <label className="text-[10px] font-black uppercase text-[#24b324] tracking-widest">Inject Credits (BC)</label>
                                  <div className="flex gap-2">
                                     <input 
                                       type="number"
                                       value={creditsToAdd}
                                       onChange={(e) => setCreditsToAdd(Number(e.target.value))}
                                       className="flex-grow bg-black border border-white/10 p-3 text-white font-black italic focus:border-[#24b324]/40 outline-none"
                                     />
                                     <button 
                                       onClick={handleAddCredits}
                                       className="px-6 bg-[#24b324] text-black font-black uppercase italic text-xs tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(217,225,43,0.3)] border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
                                     >
                                        GRANT
                                     </button>
                                  </div>
                               </div>

                               {/* Feature Suspension */}
                               <div className="space-y-4">
                                  <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Toggle Feature Access</label>
                                  <div className="grid grid-cols-1 gap-2">
                                     {[
                                       { id: 'analysis', label: 'Hit Analyzer' },
                                       { id: 'mastering', label: 'Mastering Suite' },
                                       { id: 'lyrics', label: 'Lyric Pro' },
                                       { id: 'trivia', label: 'Trivia Center' },
                                       { id: 'ibh', label: 'IBH Access' }
                                     ].map(feature => {
                                        const isSuspended = (selectedNode.suspendedFeatures || []).includes(feature.id);
                                        return (
                                          <button 
                                            key={feature.id}
                                            onClick={() => toggleFeature(feature.id)}
                                            className={cn(
                                              "w-full p-4 flex items-center justify-between border italic transition-all group",
                                              isSuspended ? "bg-red-500/10 border-red-500 text-red-500" : "bg-black border-white/5 text-white/60 hover:border-white/20"
                                            )}
                                          >
                                            <span className="font-black uppercase text-[10px] tracking-widest">{feature.label}</span>
                                            <div className={cn(
                                              "px-2 py-0.5 text-[8px] font-black uppercase",
                                              isSuspended ? "bg-red-500 text-white" : "bg-green-500/20 text-green-500"
                                            )}>
                                              {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                                            </div>
                                          </button>
                                        );
                                     })}
                                  </div>
                                  <p className="text-[8px] text-white/20 uppercase font-black italic text-center pt-2">Suspension durations are currently manual. Feature persists until re-enabled.</p>
                               </div>

                               <div className="pt-10 border-t border-white/5 space-y-4">
                                  <div className="flex justify-between text-[10px] uppercase font-bold italic text-white/40">
                                     <span>Last Activity Date</span>
                                     <span className="text-white">{parseDate(selectedNode.lastActive || selectedNode.createdAt).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-[10px] uppercase font-bold italic text-white/40">
                                     <span>Creation Signal</span>
                                     <span className="text-white">{parseDate(selectedNode.createdAt).toLocaleString()}</span>
                                  </div>
                               </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                 )}
              </AnimatePresence>
           </main>
        </div>
      </div>
    </SentinelBoundary>
  );
};

export default AdminControlRoom;
