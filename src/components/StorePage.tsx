import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Tag, 
  Coins, 
  Zap, 
  Music, 
  Palette, 
  Sparkles, 
  Menu, 
  X, 
  Home, 
  LayoutDashboard, 
  Gavel, 
  Feather, 
  User, 
  Star,
  Coffee,
  Users,
  ChevronRight,
  ShieldAlert,
  Clock,
  Skull,
  Ghost,
  Compass,
  Bug,
  Binary,
  Terminal,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { logBreadcrumb, SentinelBoundary } from '../lib/sentinel';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, serverTimestamp, runTransaction } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const SUPER_ADMINS = ["xchristopherrayx@gmail.com", "c.e.o@indiebrotherhood.com"];
const isSuperAdmin = (email?: string | null) => email && SUPER_ADMINS.includes(email.toLowerCase());

const Button = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const variants = {
    primary: 'bg-[#24b324] text-black hover:bg-[#1d8f1d] border-none shadow-[0_4px_0_rgb(0,0,0,0.2)] active:translate-y-0.5 active:shadow-none',
    outline: 'bg-transparent border-2 border-white/20 text-white hover:border-[#24b324] hover:text-[#24b324]',
    gold: 'bg-gradient-to-r from-[#24b324] to-[#3df53d] text-black border-none font-black italic shadow-lg hover:scale-105 transition-transform'
  };
  
  return (
    <button 
      className={`px-6 py-3 font-black uppercase tracking-widest text-xs transition-all duration-200 ${variants[variant as keyof typeof variants]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const StorePage = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [showFortuneDisclaimer, setShowFortuneDisclaimer] = useState(false);
  const [activeFortune, setActiveFortune] = useState<string | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/');
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          setUserProfile({ ...snap.data(), uid: user.uid });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }
      setLoading(false);
    });
  }, [navigate]);

  const handlePurchase = async (type: 'coin' | 'skin' | 'fortune', itemId: string, cost: number, metadata: any) => {
    if (!userProfile) return;
    
    // Preliminary check
    if ((userProfile.credits || 0) < cost && userProfile.subscriptionTier !== 'legacy' && !isSuperAdmin(userProfile.email)) {
      setMessage("INSUFFICIENT BROTHERHOOD CREDITS");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsBuying(true);
    logBreadcrumb(`INIT_PURCHASE: ${itemId} (${type})`);
    
    try {
      let finalFortune: string | null = null;
      
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userProfile.uid);
        const userSnap = await transaction.get(userRef);
        
        if (!userSnap.exists()) throw new Error("USER_NODE_LOST");
        const userData = userSnap.data();
        
        // Final sanity check inside transaction
        if ((userData.credits || 0) < cost && userData.subscriptionTier !== 'legacy' && !isSuperAdmin(userData.email)) {
           throw new Error("CREDIT_INSUFFICIENT_TRANSACTION");
        }

        const updates: any = {};
        
        // Fortune Timing Check
        if (type === 'fortune') {
           const lastFortune = userData.lastFortunePurchase?.toDate() || 0;
           const weekInMs = 7 * 24 * 60 * 60 * 1000;
           if (Date.now() - lastFortune < weekInMs) {
             throw new Error("ORACLE_RESTING");
           }
           updates.lastFortunePurchase = serverTimestamp();
           finalFortune = generateFortune();
        }

        // Apply Costs
        if (userData.subscriptionTier !== 'legacy' && !isSuperAdmin(userData.email)) {
           updates.credits = (userData.credits || 0) - cost;
        }

        // Item Logic
        if (type === 'coin') {
           if (itemId === 'master-coin') updates.masteringCredits = (userData.masteringCredits || 0) + metadata.amount;
           if (itemId === 'analyzer-coin') updates.analysisCredits = (userData.analysisCredits || 0) + metadata.amount;
           if (itemId === 'pro-bundle') {
              updates.masteringCredits = (userData.masteringCredits || 0) + 3;
              updates.analysisCredits = (userData.analysisCredits || 0) + 3;
              updates.credits = (updates.credits !== undefined ? updates.credits : (userData.credits || 0)) + 10;
           }
        } else if (type === 'skin') {
           const unlocked = userData.unlockedSkins || [];
           if (!unlocked.includes(itemId)) {
              updates.unlockedSkins = [...unlocked, itemId];
           }
        }

        transaction.update(userRef, { ...updates, lastActive: new Date().toISOString() });
      });

      if (type === 'fortune' && finalFortune) {
         setActiveFortune(finalFortune);
         logBreadcrumb(`FORTUNE_REVEALED`);
      } else {
         logBreadcrumb(`SUCCESS_PURCHASE: ${itemId}`);
         setMessage(`${itemId.toUpperCase()} INTEGRATED INTO YOUR ERA`);
         setTimeout(() => setMessage(""), 3000);
      }
      
      // Update local state by re-fetching
      const newSnap = await getDoc(doc(db, 'users', userProfile.uid));
      if (newSnap.exists()) setUserProfile({ ...newSnap.data(), uid: userProfile.uid });

    } catch (err: any) {
      console.error("Purchase Transaction Error:", err);
      if (err.message === "ORACLE_RESTING") {
         setMessage("ERROR: THE ORACLE IS STILL RESTING.");
      } else if (err.message === "CREDIT_INSUFFICIENT_TRANSACTION") {
         setMessage("INSUFFICIENT CREDITS");
      } else {
         setMessage("SYSTEM ERROR: TRANSACTION VOIDED");
         handleFirestoreError(err, OperationType.UPDATE, `users/${userProfile.uid}/purchase`);
      }
      setTimeout(() => setMessage(""), 4000);
    } finally {
      setIsBuying(false);
    }
  };

  const generateFortune = () => {
    const subjects = ["You", "Your sound", "The era", "A viral moment", "Your brotherhood", "The frequency", "Your artistic soul", "A hidden rhythm"];
    const actions = ["will find", "is destined for", "will achieve", "shall encounter", "is vibrating towards", "will dominate", "shall manifest", "will pierce through"];
    const outcomes = ["unprecedented clarity", "a massive breakthrough", "immortal success", "the perfect frequency", "a sudden surge in reach", "absolute sonic dominance", "a dawn of a new era", "total creative enlightenment"];
    const timings = ["very soon", "within the week", "next time you create", "at midnight", "before the next moon", "when you least expect it", "in the heart of the pit", "forever"];

    const s = subjects[Math.floor(Math.random() * subjects.length)];
    const a = actions[Math.floor(Math.random() * actions.length)];
    const o = outcomes[Math.floor(Math.random() * outcomes.length)];
    const t = timings[Math.floor(Math.random() * timings.length)];

    return `${s} ${a} ${o} ${t}.`;
  };

  const NavItems = [
    { label: "Profile", icon: User, to: "/profile" },
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { label: "ML Lab", icon: Binary, to: "/ml-lab" },
    ...(isSuperAdmin(userProfile?.email) ? [
      { label: "Control Room", icon: Terminal, to: "/control-room" },
      { label: "Admin Hub", icon: Activity, to: "/sentinel" }
    ] : []),
    { label: "The Judgment", icon: Gavel, to: "/judgment" },
    { label: "IBH Meeting", icon: Users, to: "/ibh" },
    { label: "The Lounge", icon: Coffee, to: "/lounge" },
    { label: "Mastering Suite", icon: Music, to: "/mastering" },
    { label: "Lyric Pro", icon: Feather, to: "/lyrics" },
    { label: "Hit Analyzer", icon: Zap, to: "/analysis" },
    { label: "The 99¢ Store", icon: ShoppingBag, to: "/store" }
  ];

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
        <ShoppingBag className="text-[#24b324]" size={48} />
      </motion.div>
    </div>
  );

  return (
    <SentinelBoundary moduleName="Store">
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black text-white flex flex-col font-sans selection:bg-[#24b324] selection:text-black">
      {/* Deals Ticker */}
      <div className="bg-[#24b324] overflow-hidden py-2 border-y border-black/10 relative z-30 shadow-lg">
        <div className="flex whitespace-nowrap animate-ticker">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-12 px-6">
              <span className="text-black font-black uppercase italic text-sm tracking-tight">BOGO DEALS ACTIVE: BUY 2 WALLPAPERS GET 1 FREE</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm tracking-tight">UPGRADE YOUR ERA: PRO BUNDLES ONLY 99¢ BROTHERHOOD COINS</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm tracking-tight">LIMITED EDITION SKINS: STEAM PUNK & C-BUG NOW LIVE</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm tracking-tight">CONSULT THE ORACLE: WEEKLY FORTUNES TO SCALE YOUR REACH</span>
              <span className="text-black/40 font-black">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <button 
            className="p-3 hover:bg-[#24b324] hover:text-black rounded-sm border border-[#24b324]/20 transition-all group" 
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu className="text-[#24b324] group-hover:text-black" size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#24b324] flex items-center justify-center animate-pulse">
               <Tag size={16} className="text-black" />
            </div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter">The 99¢ Store</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-[8px] font-black text-white/40 uppercase tracking-widest">Available Credits</div>
            <div className="text-sm font-black text-[#24b324] italic tracking-tight">{userProfile?.credits || 0} BC</div>
          </div>
          <div className="w-10 h-10 bg-black border border-[#24b324] flex items-center justify-center font-black italic text-[#24b324]">
            {userProfile?.level}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full space-y-20">
        
        {message && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#24b324] text-black px-8 py-3 font-black italic uppercase text-sm border-2 border-black/20 shadow-2xl border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
          >
            {message}
          </motion.div>
        )}

        {/* Section: Resource Packs */}
        <section>
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter">Elite Resources</h2>
            <div className="h-0.5 flex-grow bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StoreCard 
              title="Mastering Coin"
              desc="Unlock 1 Studio-Grade Mastering Session. Total clarity guaranteed."
              price="0.99"
              icon={Music}
              itemId="master-coin"
              onBuy={() => handlePurchase('coin', 'master-coin', 1, { amount: 1 })}
              loading={isBuying}
            />
            <StoreCard 
              title="Analyzer Coin"
              desc="Deep-scan 1 track for viral metrics and era trajectory."
              price="0.99"
              icon={Zap}
              itemId="analyzer-coin"
              onBuy={() => handlePurchase('coin', 'analyzer-coin', 1, { amount: 1 })}
              loading={isBuying}
            />
            <StoreCard 
              title="IBH PRO BUNDLE"
              desc="The Ultimate Starter. 3 Masters, 3 Analyzers, + 10 Bonus Credits."
              price="2.99"
              icon={Star}
              isFeatured
              itemId="pro-bundle"
              onBuy={() => handlePurchase('coin', 'pro-bundle', 3, {})}
              loading={isBuying}
            />
          </div>
        </section>

        {/* Section: Skins */}
        <section>
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter">Digital Skins</h2>
            <div className="h-0.5 flex-grow bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'skull-bones', name: 'Skull & Bones', icon: Skull, color: '#ff4b4b' },
              { id: 'goth', name: 'Goth Era', icon: Ghost, color: '#8b5cf6' },
              { id: 'steampunk', name: 'Steam Punk', icon: Compass, color: '#f59e0b' },
              { id: 'c-bug', name: 'C-Bug', icon: Bug, color: '#10b981' }
            ].map((skin) => (
              <SkinCard 
                key={skin.id}
                id={skin.id}
                name={skin.name}
                icon={skin.icon}
                color={skin.color}
                isUnlocked={userProfile?.unlockedSkins?.includes(skin.id)}
                onBuy={() => handlePurchase('skin', skin.id, 1, {})}
                loading={isBuying}
              />
            ))}
          </div>
        </section>

        {/* Section: Mystic Fortune */}
        <section className="bg-gradient-to-br from-black to-[#1a1a1b] p-10 md:p-20 border-4 border-white/5 relative overflow-hidden text-center">
            <div className="absolute inset-0 bg-[#24b324]/5 opacity-20 pointer-events-none backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
            <Sparkles className="mx-auto text-[#24b324] mb-6 animate-pulse" size={64} />
            <h2 className="text-6xl font-black italic uppercase tracking-tighter mb-4">The Digital Oracle</h2>
            <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-xs max-w-xl mx-auto mb-12">
               Synchronize your future with the era. One week's worth of prophetic guidance condensed into raw sonic frequency.
            </p>
            
            {!activeFortune ? (
               <Button 
                variant="gold" 
                className="text-lg px-12 py-5" 
                onClick={() => setShowFortuneDisclaimer(true)}
                disabled={isBuying}
               >
                 CONSULT THE ORACLE (0.99)
               </Button>
            ) : (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-2xl mx-auto"
              >
                 <div className="bg-[#24b324] text-black p-10 font-black italic text-3xl leading-tight border-4 border-black/10 shadow-2xl relative border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">
                    <div className="absolute -top-4 -left-4 bg-black text-[#24b324] p-2"><Star size={24} /></div>
                    "{activeFortune}"
                 </div>
                 <button 
                  onClick={() => setActiveFortune(null)}
                  className="mt-8 text-white/40 hover:text-white uppercase font-black italic text-xs tracking-widest transition-colors underline"
                 >
                   CLOSE PROPHECY
                 </button>
              </motion.div>
            )}

            <div className="mt-12 flex items-center justify-center gap-4 text-white/20">
               <div className="h-px w-10 bg-current" />
               <Clock size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">RESET EVERY 7 SOLAR CYCLES</span>
               <div className="h-px w-10 bg-current" />
            </div>
        </section>

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
              className="fixed top-0 left-0 bottom-0 w-80 bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black border-r-4 border-[#24b324] z-[101] p-8 flex flex-col overflow-y-auto no-scrollbar"
            >
              <div className="mb-8 flex justify-between items-center flex-shrink-0">
                 <Logo />
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

              <div className="mt-auto pt-8 border-t border-white/5 flex-shrink-0">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-black border border-[#24b324] flex items-center justify-center">
                       <Star size={20} className="text-[#24b324]" />
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Active Credits</div>
                       <div className="text-[#24b324] font-black italic">{userProfile?.credits || 0} COINS</div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fortune Disclaimer */}
      <AnimatePresence>
        {showFortuneDisclaimer && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-black/80">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              className="max-w-lg w-full bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black border-4 border-[#24b324] p-10 relative overflow-hidden shadow-[0_0_50px_rgba(217,225,43,0.3)]"
            >
              <ShieldAlert className="text-[#24b324] mb-6 mx-auto" size={64} />
              <h3 className="text-3xl font-black uppercase italic leading-none mb-6 text-center">Prophetic Disclaimer</h3>
              <div className="space-y-4 text-xs font-bold uppercase tracking-widest text-white/60 leading-relaxed text-center mb-10">
                 <p>THESE PROPHESIES ARE GENERATED BY BROTHERHOOD ALGORITHMS FOR ARTISTIC MOTIVATION ONLY.</p>
                 <p>RESULTS ARE NOT FACTUAL OR GUARANTEED. WE ARE NOT LIABLE FOR FUTURES THAT DO NOT MANIFEST OR DIVERGE FROM THE ORACLE'S VISION.</p>
                 <p>BY PROCEEDING, YOU AGREE TO EMBRACE THE SONIC UNKOWN.</p>
              </div>

              <div className="flex flex-col gap-4">
                <Button 
                  onClick={() => {
                    setShowFortuneDisclaimer(false);
                    handlePurchase('fortune', 'mystic-fortune', 1, {});
                  }}
                >
                  I EMBRACE MY FATE
                </Button>
                <button 
                  onClick={() => setShowFortuneDisclaimer(false)}
                  className="text-[10px] font-black uppercase italic text-white/20 hover:text-white transition-colors"
                >
                  ABANDON DESTINY
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-8 border-t border-white/5 py-8 text-center bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
         <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] italic">
            "All Sales Are Final. No refunds on digital credits."
         </p>
      </footer>
    </div>
    </SentinelBoundary>
  );
};

const StoreCard = ({ title, desc, price, icon: Icon, isFeatured, onBuy, loading }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className={`p-8 relative overflow-hidden flex flex-col items-center text-center group ${isFeatured ? 'bg-[#24b324] text-black border-none' : 'bg-black/40 border border-white/5'}`}
  >
    {isFeatured && <div className="absolute top-0 right-0 bg-black text-[#24b324] px-3 py-1 font-black italic text-[8px] uppercase tracking-widest">BEST VALUE</div>}
    
    <div className={`w-20 h-20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${isFeatured ? 'bg-black text-[#24b324]' : 'bg-[#24b324]/10 text-[#24b324]'}`}>
       <Icon size={40} />
    </div>

    <h3 className="text-2xl font-black italic uppercase leading-none mb-2">{title}</h3>
    <p className={`text-[10px] font-bold uppercase tracking-widest mb-10 leading-relaxed ${isFeatured ? 'text-black/60' : 'text-white/40'}`}>
      {desc}
    </p>
    
    <div className="mt-auto w-full">
      <Button 
        variant={isFeatured ? 'outline' : 'primary'} 
        className={`w-full ${isFeatured ? 'border-black text-black hover:bg-black hover:text-[#24b324]' : ''}`}
        onClick={onBuy}
        disabled={loading}
      >
        {loading ? 'PROCESSING...' : `COLLECT FOR ${price}`}
      </Button>
    </div>
  </motion.div>
);

const SkinCard = ({ id, name, icon: Icon, color, isUnlocked, onBuy, loading }: any) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    className="bg-black/60 border border-white/5 p-6 flex flex-col items-center text-center gap-4 relative group backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
  >
    <div 
      className="w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all duration-500" 
      style={{ backgroundColor: `${color}20`, border: `2px solid ${color}40`, color }}
    >
       <Icon size={32} />
    </div>
    <div className="space-y-1">
      <h4 className="text-sm font-black italic uppercase italic tracking-tighter">{name}</h4>
      <p className="text-[8px] font-bold uppercase tracking-[.2em] text-white/20">Wallpaper Skin</p>
    </div>
    
    {isUnlocked ? (
       <div className="mt-4 px-3 py-1 bg-white/5 text-white/40 text-[8px] font-black uppercase italic tracking-widest border border-white/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          OWNED
       </div>
    ) : (
      <button 
        onClick={onBuy}
        disabled={loading}
        className="mt-4 text-[#24b324] text-[10px] font-black uppercase italic hover:underline flex items-center gap-2 group-hover:gap-3 transition-all"
      >
        0.99 COINS <ChevronRight size={12} />
      </button>
    )}
  </motion.div>
);

const Logo = () => (
  <Link to="/" className="flex items-center gap-2 group">
    <div className="w-10 h-10 bg-[#24b324] flex items-center justify-center rounded-sm group-hover:rotate-90 transition-transform duration-500">
      <Music className="text-black" size={24} />
    </div>
    <span className="text-xl font-black uppercase italic tracking-tighter leading-none">Indie<br/><span className="text-[#24b324]">Brotherhood</span></span>
  </Link>
);

export default StorePage;
