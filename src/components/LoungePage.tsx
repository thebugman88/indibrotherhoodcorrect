import React, { useState, useEffect, useRef } from 'react';
import { 
  Coffee, 
  Menu, 
  X, 
  Home, 
  LayoutDashboard, 
  Gavel, 
  Feather, 
  User, 
  Star,
  Music,
  Zap,
  Cpu,
  Activity,
  Mic,
  Users,
  Send,
  Radio,
  Plus,
  Trophy,
  Flame,
  Speaker,
  Heart,
  ShoppingBag,
  Binary,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { logBreadcrumb, SentinelBoundary } from '../lib/sentinel';
import { auth, db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const SUPER_ADMINS = ["xchristopherrayx@gmail.com", "c.e.o@indiebrotherhood.com"];
const isSuperAdmin = (email?: string | null) => email && SUPER_ADMINS.includes(email.toLowerCase());

const Scene = ({ id, name, icon: Icon, color, isActive, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`p-6 border-2 transition-all flex flex-col items-center gap-3 relative overflow-hidden group ${isActive ? 'bg-white text-black border-white' : 'bg-black/40 border-white/5 text-white/40 hover:border-[#24b324] hover:text-[#24b324]'}`}
  >
    {isActive && <motion.div layoutId="sceneGlow" className="absolute inset-0 bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] mix-blend-overlay" />}
    <Icon size={32} className={isActive ? 'text-black' : 'group-hover:scale-110 transition-transform'} />
    <span className="font-black uppercase italic text-[10px] tracking-widest">{name}</span>
  </button>
);

const LoungePage = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeScene, setActiveScene] = useState('general');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loungeSongs, setLoungeSongs] = useState<any[]>([]);
  const [showSongForm, setShowSongForm] = useState(false);
  const [songLink, setSongLink] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [isSubmittingSong, setIsSubmittingSong] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      if (!user) {
        navigate('/');
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          // Check for admin upgrade
          if (isSuperAdmin(user.email) && (data.subscriptionTier !== 'admin' || data.level !== 99)) {
            await updateDoc(doc(db, 'users', user.uid), {
              subscriptionTier: 'admin',
              credits: 999999,
              level: 99
            });
            if (isMounted) setUserProfile({ ...data, subscriptionTier: 'admin', credits: 999999, level: 99, uid: user.uid });
          } else if (isMounted) {
            setUserProfile({ ...data, uid: user.uid });
          }
        } else if (isMounted) {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error("Lounge Auth Error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    });
    return () => { isMounted = false; unsub(); };
  }, [navigate]);

  useEffect(() => {
    if (!activeScene) return;
    
    if (activeScene === 'top-songs') {
      const q = query(
        collection(db, 'lounge_songs'),
        where('expiresAt', '>', new Date().toISOString()),
        orderBy('expiresAt', 'desc'),
        limit(30)
      );
      return onSnapshot(q, (snap) => {
        const songs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLoungeSongs(songs);
      }, (err) => {
        console.error("Lounge songs sync error:", err);
      });
    }

    const q = query(
      collection(db, 'lounge', activeScene, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      setMessages(msgs);
    }, (err) => {
      console.error("Lounge messages sync error:", err);
    });

    return unsubscribe;
  }, [activeScene]);

  const handleAddSong = async (priority = false) => {
    if (!songLink.trim() || !userProfile) return;
    setIsSubmittingSong(true);
    try {
      const durationHours = priority ? 2 : 24;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + durationHours);

      await addDoc(collection(db, 'lounge_songs'), {
        userId: userProfile.uid,
        userName: userProfile.displayName || userProfile.email.split('@')[0],
        title: songTitle || "Untitled Track",
        link: songLink,
        priority,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      });

      setSongLink("");
      setSongTitle("");
      setShowSongForm(false);
      alert(priority ? "PRIORITY PULSE ACTIVATED (2HR)" : "SONG ADDED TO LOUNGE QUEUE (24HR)");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingSong(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userProfile) return;

    try {
      await addDoc(collection(db, 'lounge', activeScene, 'messages'), {
        userId: userProfile.uid,
        userName: userProfile.displayName || userProfile.email.split('@')[0],
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
        userTier: userProfile.subscriptionTier || 'none'
      });
      setNewMessage("");
    } catch (err) {
      console.error(err);
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
    { label: "The Judgment", icon: Gavel, to: "/judgment" },
    { label: "IBH Meeting", icon: Users, to: "/ibh" },
    { label: "The Lounge", icon: Coffee, to: "/lounge", active: true },
    { label: "Mastering Suite", icon: Music, to: "/mastering" },
    { label: "Lyric Pro", icon: Feather, to: "/lyrics" },
    { label: "Hit Analyzer", icon: Zap, to: "/analysis" },
    { label: "The 99¢ Store", icon: ShoppingBag, to: "/store" }
  ];

  const Scenes = [
    { id: 'rap-battle', name: 'Rap Battle', icon: Flame, color: '#ff4b4b', desc: '1 Judge, 3 Jury. Raw Bars.' },
    { id: 'rave', name: 'Rave Room', icon: Zap, color: '#bc13fe', desc: 'Pulsing Frequencies. Neon Vibes.' },
    { id: 'country', name: 'Country Ballad', icon: Mic, color: '#d97706', desc: 'Acoustic Soul. Southern Grit.' },
    { id: 'legacy-lab', name: 'Legacy Lab', icon: Cpu, color: '#24b324', desc: 'Elite Production. Immortals Only.' },
    { id: 'live', name: 'Live Stage', icon: Radio, color: '#ef4444', desc: 'Start your own stream or join others.' },
    { id: 'top-songs', name: 'Top Voted', icon: Trophy, color: '#3b82f6', desc: 'Only the absolute best play here.' },
    { id: 'general', name: 'General Vibe', icon: Coffee, color: '#fff', desc: 'Music, Chat, Chill.' }
  ];

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
        <Coffee className="text-[#24b324]" size={48} />
      </motion.div>
    </div>
  );

  const activeSceneData = Scenes.find(s => s.id === activeScene) || Scenes[6];

  return (
    <SentinelBoundary moduleName="Lounge">
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black text-white flex flex-col font-sans selection:bg-[#24b324] selection:text-black overflow-hidden h-screen">
      {/* Lounge Ticker */}
      <div className="bg-[#24b324] overflow-hidden py-2 border-y border-black/10 relative z-30 shadow-lg">
        <div className="flex whitespace-nowrap animate-ticker">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-12 px-6">
              <span className="text-black font-black uppercase italic text-sm tracking-tight">ENJOY THE VIBE - CHECK OUT THE DIFFERENT ROOMS</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm tracking-tight">RAP BATTLE OPEN: 1 JUDGE, 3 JURY PROTOCOL ACTIVE</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm tracking-tight">LEGACY LAB NOW STREAMING: ELITE MASTERING SESSIONS</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm tracking-tight">TOP SONGS ROOM: DATA-DRIVEN FREQUENCY DOMINATION</span>
              <span className="text-black/40 font-black">•</span>
            </div>
          ))}
        </div>
      </div>

      <header className="p-6 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-6">
          <button 
            className="p-3 hover:bg-[#24b324] hover:text-black rounded-sm border border-[#24b324]/20 transition-all group" 
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu size={20} className="text-[#24b324] group-hover:text-black" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#24b324] flex items-center justify-center">
               <Coffee size={16} className="text-black" />
            </div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter">The Lounge</h1>
          </div>
          <div className="hidden md:flex items-center gap-4 border-l border-white/10 pl-6 ml-2">
            <div className="bg-white/10 text-white/40 px-3 py-1 text-[10px] font-black uppercase italic backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">Scenario: {activeSceneData.name}</div>
            <div className="text-white/20 text-[10px] uppercase font-bold tracking-widest">{activeSceneData.desc}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {userProfile?.subscriptionTier === 'legacy' && (
             <div className="bg-[#24b324] text-black px-3 py-1 text-[10px] font-black italic uppercase animate-pulse shadow-[0_0_10px_#24b324] border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">Legacy Owner</div>
           )}
           <div className="w-10 h-10 bg-black border border-[#24b324] flex items-center justify-center font-black italic text-[#24b324]">
             {userProfile?.level}
           </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        {/* Scenes Grid - Sidebar on desktop, top bar on mobile */}
        <div className="w-full md:w-64 bg-black/60 border-r border-white/5 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          {Scenes.map((scene) => (
            <Scene 
              key={scene.id}
              {...scene}
              isActive={activeScene === scene.id}
              onClick={() => {
                logBreadcrumb(`LOUNGE SCENE: ${scene.name}`);
                setActiveScene(scene.id);
              }}
            />
          ))}
        </div>

        {/* Chat / Room Content */}
        <main className="flex-1 flex flex-col bg-black relative">
           {/* Visualizer Background */}
           <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-1" />
              <div className="flex items-end justify-center h-full gap-1 p-4">
                 {[...Array(20)].map((_, i) => (
                   <motion.div 
                    key={i}
                    animate={{ height: ['10%', '60%', '20%', '90%', '40%'] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.05 }}
                    className="w-1 bg-[#24b324]/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                   />
                 ))}
              </div>
           </div>

           {/* Live Feed Header Area */}
           <div className="p-8 border-b border-white/5 relative z-10 flex flex-col md:flex-row items-center gap-8 bg-gradient-to-r from-black/80 to-transparent">
              <div 
                className="w-24 h-24 border-4 border-[#24b324] flex items-center justify-center shadow-[0_0_20px_rgba(217,225,43,0.2)]"
                style={{ borderColor: activeSceneData.color }}
              >
                 <activeSceneData.icon size={48} style={{ color: activeSceneData.color }} />
              </div>
              <div className="text-center md:text-left">
                 <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-2" style={{ color: activeSceneData.color }}>
                   {activeSceneData.name}
                 </h2>
                 <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px] max-w-lg">
                   {activeSceneData.desc}
                 </p>
              </div>
              <div className="ml-auto flex gap-4">
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Room Traffic</span>
                    <div className="flex items-center gap-2 text-2xl font-black italic text-[#24b324]">
                       <Users size={18} /> {Math.floor(Math.random() * 50) + 10}
                    </div>
                 </div>
              </div>
           </div>

           {/* Message History */}
           <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10 flex flex-col justify-end">
              {activeScene === 'top-songs' ? (
                 <div className="h-full w-full flex flex-col bg-zinc-950/20 border border-white/5 p-4 md:p-12 overflow-y-auto no-scrollbar scroll-smooth">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16">
                       <div className="space-y-3">
                          <div className="text-[10px] font-black uppercase text-[#3b82f6] tracking-[0.5em] italic leading-none mb-1">Frequency High-Scores</div>
                          <h3 className="text-5xl font-black italic uppercase tracking-tighter text-white">Top 10 Playlist</h3>
                          <p className="text-xs font-bold uppercase tracking-widest text-white/20 italic">The current pulse of the brotherhood • Queue Cap: 30</p>
                       </div>
                       <button 
                         onClick={() => setShowSongForm(true)}
                         className="w-full md:w-auto bg-[#3b82f6] text-white px-10 py-5 font-black uppercase italic text-xs tracking-widest shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                       >
                          <Plus size={24} />
                          SUBMIT TRACK
                       </button>
                    </div>

                    <div className="space-y-6 pb-32">
                       {loungeSongs.length === 0 ? (
                          <div className="p-32 text-center border-2 border-dashed border-white/5 space-y-6 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                             <Music className="mx-auto text-white/10" size={64} />
                             <p className="text-xs font-black uppercase tracking-[0.6em] text-white/20 italic leading-loose">The frequency is silent.<br/>Be the first to lock in.</p>
                          </div>
                       ) : (
                          loungeSongs.map((song, i) => (
                             <motion.div 
                               key={song.id}
                               initial={{ opacity: 0, y: 20 }}
                               animate={{ opacity: 1, y: 0 }}
                               className={cn(
                                 "group flex items-center gap-6 md:gap-8 p-6 md:p-8 border transition-all relative overflow-hidden",
                                 song.priority 
                                   ? "bg-blue-600/10 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.1)]" 
                                   : "bg-black/60 border-white/5 hover:border-white/20"
                               )}
                             >
                                {song.priority && (
                                  <div className="absolute top-0 right-0">
                                     <div className="bg-blue-600 text-white text-[9px] font-black uppercase px-4 py-1.5 italic tracking-[0.2em] shadow-lg">
                                        PRIORITY_BOOST
                                     </div>
                                  </div>
                                )}
                                
                                <div className={cn(
                                  "w-16 h-16 flex items-center justify-center font-black italic text-4xl flex-shrink-0",
                                  i < 10 ? "text-[#3b82f6]" : "text-white/10"
                                )}>
                                   {i < 9 ? `0${i + 1}` : i + 1}
                                </div>
                                
                                <div className="flex-grow min-w-0">
                                   <h4 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter group-hover:text-[#3b82f6] transition-colors truncate mb-1">{song.title}</h4>
                                   <div className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40 flex flex-wrap items-center gap-4">
                                      <span className="text-white/70 italic underline decoration-[#3b82f6]/30">{song.userName}</span>
                                      <span className="text-white/10 hidden sm:inline">•</span>
                                      <span className={cn(
                                        "px-3 py-1 rounded-sm text-[9px] tracking-[0.1em]",
                                        song.priority ? "bg-blue-500 text-white" : "bg-white/5 text-white/30"
                                      )}>
                                         {song.priority ? '2H PULSE TRANSMISSION' : '24H STANDARD SIGNAL'}
                                      </span>
                                   </div>
                                </div>

                                <button 
                                  onClick={() => window.open(song.link, '_blank')}
                                  className="w-16 h-16 bg-white/5 border border-white/10 text-white/30 hover:text-[#3b82f6] hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/10 transition-all flex items-center justify-center flex-shrink-0 group/play shadow-xl backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                                >
                                   <Speaker size={28} className="group-hover/play:scale-110 transition-transform" />
                                </button>
                             </motion.div>
                          ))
                       )}
                    </div>
                 </div>
              ) : (
                 <>
                   <AnimatePresence>
                     {messages.map((msg) => (
                       <motion.div 
                         key={msg.id}
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         role="alert"
                         className="flex flex-col gap-1 items-start max-w-2xl"
                       >
                         <div className="flex items-center gap-3">
                            <span className={`text-[8px] font-black uppercase italic px-2 py-0.5 border border-white/10 ${msg.userTier === 'legacy' ? 'bg-[#24b324] text-black border-none' : 'text-white/40'}`}>
                              {msg.userTier === 'legacy' ? 'ERA LEGEND' : 'ARTIST'}
                            </span>
                            <span className="text-[10px] font-black italic tracking-tighter text-white/60">
                              {msg.userName}
                            </span>
                         </div>
                         <div className="bg-white/5 border-l-2 border-[#24b324] p-3 text-sm font-medium tracking-tight leading-relaxed selection:bg-[#24b324] selection:text-black backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                            {msg.text}
                         </div>
                       </motion.div>
                     ))}
                   </AnimatePresence>
                   <div ref={chatEndRef} />
                 </>
              )}
           </div>

           {/* Input Area */}
           {activeScene !== 'top-songs' && (
             <form onSubmit={sendMessage} className="p-6 border-t border-white/10 bg-black/80 backdrop-blur-xl relative z-20 flex gap-4">
               <input 
                 type="text"
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 placeholder={`DROP A VIBE IN ${activeSceneData.name.toUpperCase()}...`}
                 className="flex-1 bg-white/5 border border-white/10 p-4 font-bold uppercase tracking-widest text-xs focus:border-[#24b324] focus:outline-none transition-all placeholder:text-white/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
               />
               <button 
                 type="submit"
                 className="bg-[#24b324] text-black p-4 flex items-center justify-center hover:bg-white transition-all shadow-[0_4px_0_rgba(0,0,0,0.5)] active:translate-y-0.5 active:shadow-none border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
               >
                 <Send size={20} />
               </button>
             </form>
           )}
        </main>
      </div>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ x: -400 }}
              animate={{ x: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              exit={{ x: -400 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black border-r-4 border-[#24b324] z-[101] p-8 flex flex-col overflow-y-auto no-scrollbar shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              <div className="flex justify-between items-center mb-8 flex-shrink-0">
                 <h2 className="text-3xl font-black italic uppercase leading-none tracking-tighter">Indie<br/><span className="text-[#24b324]">Brotherhood</span></h2>
                 <button onClick={() => setIsMenuOpen(false)} className="text-white/20 hover:text-white hover:rotate-90 transition-all duration-300">
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
                    className={`flex items-center gap-4 p-4 transition-all group ${window.location.pathname === item.to ? 'bg-[#24b324] text-black shadow-lg translate-x-2' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  >
                    <item.icon size={20} className={window.location.pathname === item.to ? 'text-black' : 'group-hover:text-[#24b324] transition-transform group-hover:scale-110'} />
                    <span className="font-black uppercase tracking-[0.2em] text-[10px] italic">{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="mt-auto pt-8 border-t border-white/5 space-y-6 flex-shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-black border-2 border-[#24b324] flex items-center justify-center p-0.5 overflow-hidden shadow-[0_0_15px_rgba(217,225,43,0.2)]">
                       <User size={24} className="text-[#24b324]" />
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Active Era</div>
                       <div className="text-[#24b324] font-black italic text-sm">{userProfile?.displayName || userProfile?.email.split('@')[0]}</div>
                    </div>
                 </div>
                 <button 
                  onClick={() => signOut(auth)}
                  className="w-full bg-white/5 border border-white/10 p-4 font-black uppercase italic text-xs text-white/40 hover:text-red-500 hover:border-red-500 transition-all tracking-[0.3em] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                 >
                   EXIT PORTAL
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Submission Modal */}
      <AnimatePresence>
        {showSongForm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              onClick={() => setShowSongForm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#111] border-4 border-[#3b82f6] p-12 shadow-[0_0_100px_rgba(59,130,246,0.2)] overflow-hidden"
            >
              <div className="relative z-10 space-y-10">
                <div className="space-y-2">
                  <div className="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.5em] italic">Frequency Submission</div>
                  <h3 className="text-4xl font-black italic uppercase italic tracking-tighter">Enter The Queue</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Track Title</label>
                    <input 
                      type="text"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      placeholder="ENTER SONG NAME..."
                      className="w-full bg-black border border-white/10 p-4 font-black uppercase italic text-sm text-[#3b82f6] focus:border-[#3b82f6]/40 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-white/30 tracking-widest">Streaming Link (SoundCloud / Audio Web URL)</label>
                    <input 
                      type="text"
                      value={songLink}
                      onChange={(e) => setSongLink(e.target.value)}
                      placeholder="HTTPS://..."
                      className="w-full bg-black border border-white/10 p-4 font-black uppercase italic text-xs text-[#3b82f6] focus:border-[#3b82f6]/40 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <button 
                     onClick={() => handleAddSong(false)}
                     disabled={isSubmittingSong}
                     className="bg-white/5 border border-white/10 p-6 flex flex-col items-center gap-2 hover:bg-white/10 transition-all group backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                   >
                     <span className="text-xl font-black italic uppercase tracking-tighter text-white">Standard Entry</span>
                     <span className="text-[10px] text-white/30 font-black uppercase italic tracking-widest group-hover:text-[#3b82f6]">24 Hours • 99¢</span>
                   </button>
                   <button 
                     onClick={() => handleAddSong(true)}
                     disabled={isSubmittingSong}
                     className="bg-blue-500/10 border-2 border-blue-500/30 p-6 flex flex-col items-center gap-2 hover:bg-blue-500/20 transition-all group shadow-[0_0_20px_rgba(59,130,246,0.1)] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                   >
                     <span className="text-xl font-black italic uppercase tracking-tighter text-blue-500">Priority Pulse</span>
                     <span className="text-[10px] text-blue-500/60 font-black uppercase italic tracking-widest group-hover:text-white">2 Hours • $1.98</span>
                   </button>
                </div>

                <div className="text-center pt-6">
                  <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest max-w-sm mx-auto">By submitting, you agree that your track will be queued and removed automatically after the specified window. Links must be direct and public.</p>
                </div>
              </div>

              {/* Background Accent */}
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#3b82f6]/5 rounded-full blur-[100px] pointer-events-none backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </SentinelBoundary>
  );
};

export default LoungePage;
