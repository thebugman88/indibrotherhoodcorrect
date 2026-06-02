import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  Shield, 
  UserPlus, 
  Settings, 
  Search, 
  Trash2, 
  LayoutDashboard, 
  ChevronRight,
  Target,
  Crown,
  Activity,
  Menu,
  X,
  User,
  Star,
  Binary,
  Terminal,
  Gavel,
  Coffee,
  Music,
  Feather,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  runTransaction
} from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { createCollective, addMember } from '../lib/collectiveService';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { logBreadcrumb } from '../lib/sentinel';

const SUPER_ADMINS = ["xchristopherrayx@gmail.com", "c.e.o@indiebrotherhood.com"];
const isSuperAdmin = (email?: string | null) => email && SUPER_ADMINS.includes(email.toLowerCase());

const CollectiveDashboard = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [collectives, setCollectives] = useState<any[]>([]);
  const [activeCollective, setActiveCollective] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Create Form State
  const [newCollective, setNewCollective] = useState({
    name: '',
    description: '',
    type: 'collective' as 'label' | 'crew' | 'collective',
    isPrivate: true
  });

  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/');
        return;
      }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserProfile({ ...userSnap.data(), uid: user.uid });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      // Fetch memberships for this user
      const q = query(collection(db, 'memberships'), where('uid', '==', user.uid));
      const unsubMemberships = onSnapshot(q, async (snap) => {
        try {
          const membershipData = snap.docs.map(d => d.data());
          const collectiveIds = membershipData.map(m => m.collectiveId);
          
          if (collectiveIds.length === 0) {
            setCollectives([]);
            setLoading(false);
            return;
          }

          // Fetch each collective
          const colls = [];
          for (const id of collectiveIds) {
            const d = await getDoc(doc(db, 'collectives', id));
            if (d.exists()) colls.push({ id: d.id, ...d.data() });
          }
          setCollectives(colls);
          if (colls.length > 0 && !activeCollective) {
            setActiveCollective(colls[0]);
          }
          setLoading(false);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, 'collectives_batch');
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'memberships_subscription');
      });

      return () => unsubMemberships();
    });

    return () => unsubAuth();
  }, [navigate, activeCollective]);

  useEffect(() => {
    if (!activeCollective?.id) return;
    
    // Fetch Memberships of Active Collective
    const q = query(collection(db, 'memberships'), where('collectiveId', '==', activeCollective.id));
    const unsubMembers = onSnapshot(q, async (snap) => {
      const memberDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMembers(memberDocs);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `memberships/${activeCollective.id}`);
    });

    return () => unsubMembers();
  }, [activeCollective]);

  const handleKickMember = async (memberId: string) => {
    if (!window.confirm("TERMINATE NODE CONNECTION? THIS ACTION IS PERMANENT.")) return;
    
    logBreadcrumb(`KICK_MEMBER_INIT: ${memberId}`);
    try {
      await runTransaction(db, async (transaction) => {
        const membershipRef = doc(db, 'memberships', memberId);
        const collectiveRef = doc(db, 'collectives', activeCollective.id);
        
        const mSnap = await transaction.get(membershipRef);
        const cSnap = await transaction.get(collectiveRef);
        
        if (!mSnap.exists() || !cSnap.exists()) throw new Error("Entity nodes lost.");
        
        const currentCount = cSnap.data().memberCount || 0;
        
        transaction.delete(membershipRef);
        transaction.update(collectiveRef, { 
          memberCount: Math.max(0, currentCount - 1),
          updatedAt: serverTimestamp()
        });
      });
      alert("NODE EJECTED. FREQUENCY CLEARED.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `memberships/${memberId}`);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = await createCollective(
        newCollective.name,
        newCollective.description,
        newCollective.type,
        newCollective.isPrivate
      );
      setIsCreateModalOpen(false);
      setNewCollective({ name: '', description: '', type: 'collective', isPrivate: true });
      alert("COLLECTIVE FORGED. IDENTITY SYNCED.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const NavItems = [
    { label: "Profile", icon: User, to: "/profile" },
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { label: "ML Lab", icon: Binary, to: "/ml-lab" },
    ...(isSuperAdmin(userProfile?.email) ? [
      { label: "Control Room", icon: Terminal, to: "/control-room" },
      { label: "Admin Hub", icon: Activity, to: "/sentinel" }
    ] : []),
    { label: "Collectives", icon: Users, to: "/collectives", active: true },
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
        <Users className="text-[#24b324]" size={48} />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black text-white flex flex-col font-sans selection:bg-[#24b324] selection:text-black">
      
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md relative z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <Menu className="text-[#24b324]" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">IndieBrotherhood</h1>
            <span className="text-[10px] uppercase font-bold text-[#24b324] tracking-widest pl-1">Collective Multi-Tenancy</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Active Operator</div>
            <div className="text-sm font-black italic uppercase text-[#24b324]">
              {userProfile?.displayName || userProfile?.email.split('@')[0]}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-[#24b324] flex items-center justify-center bg-black/50 overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            {auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Profile" referrerPolicy="no-referrer" />
            ) : (
              <User size={24} className="text-[#24b324]" />
            )}
          </div>
        </div>
      </header>

      {/* Side Menu Drawer */}
       <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black border-r-4 border-[#24b324] z-[101] p-8 flex flex-col overflow-y-auto no-scrollbar"
            >
              <div className="mb-8 flex justify-between items-center flex-shrink-0">
                <h2 className="text-3xl font-black italic uppercase italic leading-none">Indie<br/>Brotherhood</h2>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/10 text-white/40 hover:text-white transition-colors backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <X size={24} />
                </button>
              </div>
              
              <nav className="flex-grow space-y-2 mb-8">
                {NavItems.map((item, i) => (
                  <Link 
                    to={item.to} 
                    key={i} 
                    onClick={() => {
                      if (window.location.pathname === item.to) {
                        setIsMenuOpen(false);
                      }
                    }}
                    className={`flex items-center gap-4 p-4 font-black uppercase italic tracking-wider transition-all group ${window.location.pathname === item.to ? 'bg-[#24b324] text-black shadow-lg translate-x-2' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  >
                    <item.icon size={20} className={window.location.pathname === item.to ? 'text-black' : 'group-hover:text-[#24b324] transition-transform group-hover:scale-110'} />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <button 
                onClick={() => signOut(auth)}
                className="mt-auto border-2 border-white/10 p-4 font-black uppercase italic text-white/40 hover:text-red-500 hover:border-red-500 transition-all text-center tracking-widest flex-shrink-0 shadow-2xl shadow-black/80"
              >
                Exit Portal
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left: Collectives List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex justify-between items-end">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#24b324] italic">01. Your Collectives</h2>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="p-2 bg-[#24b324] text-black hover:bg-white transition-colors border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="space-y-3">
            {collectives.length === 0 && (
              <div className="p-8 border-2 border-dashed border-white/10 text-center space-y-4 shadow-2xl shadow-black/80">
                <Users size={48} className="mx-auto text-white/10" />
                <p className="text-[10px] font-bold uppercase text-white/30 tracking-widest">No active collectives found. <br/> Forge one to begin multi-tenant logic.</p>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-white/5 border border-white/10 px-4 py-2 text-[10px] font-black uppercase italic hover:bg-white/10 transition-colors backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                >
                  FORGE NEW COLLECTIVE
                </button>
              </div>
            )}
            {collectives.map(c => (
              <button 
                key={c.id}
                onClick={() => setActiveCollective(c)}
                className={`w-full p-6 border-2 text-left flex items-center justify-between group transition-all ${activeCollective?.id === c.id ? 'bg-[#24b324] border-[#24b324] text-black shadow-xl scale-[1.02]' : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20'}`}
              >
                <div className="space-y-1">
                   <div className="flex items-center gap-2">
                     {c.isPrivate ? <Shield size={12} /> : <Activity size={12} />}
                     <h3 className="font-black uppercase italic tracking-tighter text-xl leading-none">{c.name}</h3>
                   </div>
                   <p className={`text-[10px] font-bold uppercase tracking-widest ${activeCollective?.id === c.id ? 'text-black/60' : 'text-white/20'}`}>{c.type} • {c.memberCount} MEMBERS</p>
                </div>
                <ChevronRight size={24} className={`transition-transform ${activeCollective?.id === c.id ? 'translate-x-1' : 'group-hover:translate-x-1'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Management Area */}
        <div className="lg:col-span-8">
           <AnimatePresence mode="wait">
             {activeCollective ? (
               <motion.div 
                 key={activeCollective.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="space-y-8"
               >
                 {/* Collective Hero */}
                 <div className="bg-[#222] border-4 border-black/50 p-8 space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                       <Users size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
                       <div className="space-y-2">
                         <div className="flex items-center gap-3">
                           <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none">{activeCollective.name}</h2>
                           <div className="bg-[#24b324] text-black px-2 py-0.5 text-[8px] font-black uppercase italic border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">Active Node</div>
                         </div>
                         <p className="text-white/60 font-medium italic italic leading-relaxed max-w-xl">{activeCollective.description}</p>
                       </div>
                       <div className="flex gap-2">
                         <button className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"><Settings size={18} /></button>
                         <button className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={18} /></button>
                       </div>
                    </div>
                 </div>

                 {/* Members Section */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Member List */}
                    <div className="space-y-6">
                       <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[#24b324] italic flex items-center gap-2">
                         <Users size={14} /> 02. Member Registry
                       </h3>
                       <div className="space-y-2 max-h-96 overflow-y-auto pr-2 no-scrollbar">
                         {members.map((m, i) => (
                           <div key={i} className="bg-black/40 border border-white/5 p-4 flex justify-between items-center group hover:border-[#24b324]/30 transition-all backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full border border-[#24b324]/20 flex items-center justify-center bg-black">
                                    <User size={20} className="text-[#24b324]" />
                                 </div>
                                 <div>
                                   <div className="text-[10px] font-black uppercase tracking-widest text-white/40">ID-{m.uid.slice(0,8)}</div>
                                   <div className="font-black italic uppercase text-sm flex items-center gap-2">
                                     User Node {i+1}
                                     {m.role === 'owner' && <Crown size={12} className="text-[#24b324]" />}
                                   </div>
                                 </div>
                              </div>
                                  <div className="flex items-center gap-4">
                                    <div className={`text-[10px] font-black uppercase italic px-3 py-1 border transition-all ${m.role === 'owner' ? 'bg-[#24b324] text-black border-[#24b324]' : 'text-white/40 border-white/10 group-hover:text-[#24b324] group-hover:border-[#24b324]'}`}>
                                      {m.role}
                                    </div>
                                    {(activeCollective.ownerId === userProfile?.uid || isSuperAdmin(userProfile?.email)) && m.role !== 'owner' && (
                                      <button 
                                        onClick={() => handleKickMember(m.id)}
                                        className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                           </div>
                         ))}
                       </div>
                    </div>

                    {/* Quick Controls / Multi-Tenancy Logic */}
                    <div className="space-y-6">
                       <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[#24b324] italic flex items-center gap-2">
                         <Target size={14} /> 03. Collective Control
                       </h3>
                       <div className="bg-[#24b324]/5 border-2 border-[#24b324]/30 p-6 space-y-6 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                          <div className="space-y-2">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-[#24b324]">Add Member to Collective</h4>
                             <p className="text-[9px] font-bold text-white/30 uppercase leading-none italic">Secure RBAC Protocol Active</p>
                          </div>
                          
                          <div className="flex gap-2">
                             <input 
                               placeholder="ENTER UID..."
                               className="flex-1 bg-black/40 border border-white/10 p-3 text-xs font-black uppercase placeholder:text-white/10 outline-none focus:border-[#24b324] transition-all backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                             />
                             <button className="bg-[#24b324] text-black px-6 font-black uppercase italic text-xs hover:bg-white transition-colors border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">ADD</button>
                          </div>
                          
                          <div className="h-px w-full bg-[#24b324]/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
                          
                          <div className="space-y-4">
                             <div className="flex items-center gap-3 text-white/40">
                                <Shield size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Multi-Tenant Isolation Level: PEAK</span>
                             </div>
                             <div className="flex items-center gap-3 text-white/40">
                                <Activity size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Real-Time Sync State: SYNCED</span>
                             </div>
                             <div className="flex items-center gap-3 text-white/40">
                                <Binary size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Collective ID: {activeCollective.id}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               </motion.div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-6 border-4 border-dashed border-white/5 p-12">
                  <Target size={80} className="text-white/5" />
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black italic uppercase italic tracking-tighter text-white/20">Awaiting Collective Selection</h2>
                    <p className="text-[10px] font-bold uppercase text-white/10 tracking-[0.3em]">Initialize a workspace to begin collaborative operations.</p>
                  </div>
               </div>
             )}
           </AnimatePresence>
        </div>
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-[#222] border-4 border-[#24b324] p-10 max-w-lg w-full space-y-8 shadow-[0_0_50px_rgba(217,225,43,0.2)]"
             >
                <div className="flex justify-between items-center">
                   <h2 className="text-3xl font-black italic uppercase tracking-tighter">Forge Collective</h2>
                   <button onClick={() => setIsCreateModalOpen(false)} className="text-white/20 hover:text-white"><X size={24} /></button>
                </div>
                
                <form onSubmit={handleCreate} className="space-y-6 text-black">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#24b324]">Collective Identity (Name)</label>
                      <input 
                        required
                        value={newCollective.name}
                        onChange={e => setNewCollective({...newCollective, name: e.target.value})}
                        className="w-full bg-[#111] border border-white/10 p-4 text-white font-black italic uppercase tracking-widest outline-none focus:border-[#24b324]"
                        placeholder="ENTER NAME..."
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#24b324]">Collective Logic (Description)</label>
                      <textarea 
                        required
                        value={newCollective.description}
                        onChange={e => setNewCollective({...newCollective, description: e.target.value})}
                        className="w-full bg-[#111] border border-white/10 p-4 text-white font-medium italic tracking-widest outline-none focus:border-[#24b324] h-32 resize-none"
                        placeholder="DEFINE YOUR PURPOSE..."
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#24b324]">Type</label>
                        <select 
                          value={newCollective.type}
                          onChange={e => setNewCollective({...newCollective, type: e.target.value as any})}
                          className="w-full bg-[#111] border border-white/10 p-4 text-white font-black uppercase italic tracking-widest outline-none"
                        >
                          <option value="collective">COLLECTIVE</option>
                          <option value="label">RECORD LABEL</option>
                          <option value="crew">PRODUCTION CREW</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#24b324]">Privacy</label>
                         <button 
                          type="button"
                          onClick={() => setNewCollective({...newCollective, isPrivate: !newCollective.isPrivate})}
                          className={`w-full p-4 border font-black uppercase italic transition-all ${newCollective.isPrivate ? 'bg-[#24b324] text-black border-[#24b324]' : 'bg-white/5 text-white/40 border-white/10'}`}
                         >
                           {newCollective.isPrivate ? 'PRIVATE (RBAC)' : 'PUBLIC (OPEN)'}
                         </button>
                      </div>
                   </div>

                   <button className="w-full bg-[#24b324] text-black py-4 font-black italic uppercase text-2xl tracking-tighter hover:bg-white transition-all shadow-xl border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">
                      INITIALIZE FORGE
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="p-12 border-t border-white/5 text-center bg-black/20 mt-auto backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <p className="text-white/10 text-[10px] uppercase font-bold tracking-[0.4em]">Multi-Tenancy Engine v1.0.0 Alpha • Brotherhood Authenticated</p>
      </footer>
    </div>
  );
};

export default CollectiveDashboard;
