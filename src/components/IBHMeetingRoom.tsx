import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Menu, 
  X, 
  Home, 
  LayoutDashboard, 
  Gavel, 
  Feather, 
  User, 
  Star,
  Music,
  ShoppingBag,
  Coffee,
  Mic,
  MicOff,
  Send,
  ThumbsUp,
  ThumbsDown,
  Box,
  TrendingUp,
  AlertCircle,
  Binary,
  Terminal,
  Zap,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { logBreadcrumb, SentinelBoundary } from '../lib/sentinel';
import { auth, db } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  runTransaction
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const SUPER_ADMINS = ["xchristopherrayx@gmail.com", "c.e.o@indiebrotherhood.com"];
const isSuperAdmin = (email?: string | null) => email && SUPER_ADMINS.includes(email.toLowerCase());

const IBHMeetingRoom = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [meetingState, setMeetingState] = useState<any>(null);
  const [speakerMessages, setSpeakerMessages] = useState<any[]>([]);
  const [voterMessages, setVoterMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const speakerChatRef = useRef<HTMLDivElement>(null);
  const voterChatRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isOwner = isSuperAdmin(userProfile?.email);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/');
        return;
      }
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (isSuperAdmin(user.email) && data.subscriptionTier !== 'admin') {
          await updateDoc(doc(db, 'users', user.uid), { subscriptionTier: 'admin', credits: 999999 });
          setUserProfile({ ...data, subscriptionTier: 'admin', credits: 999999, uid: user.uid });
        } else {
          setUserProfile({ ...data, uid: user.uid });
        }
      }
      setLoading(false);
    });
  }, [navigate]);

  useEffect(() => {
    // Sync Meeting State
    const unsubMeeting = onSnapshot(doc(db, 'meetings', 'current'), (snap) => {
      if (snap.exists()) {
        setMeetingState(snap.data());
      } else {
        // Initialize if not exists (for owner)
        if (isOwner) {
           setDoc(doc(db, 'meetings', 'current'), {
             activeTopic: "Indie Brotherhood General Protocol",
             status: "idle",
             yays: 0,
             nays: 0,
             prevMeetingSummary: {
               topic: "Credit Allocation Reform",
               yays: 42,
               nays: 5
             },
             updatedAt: serverTimestamp()
           });
        }
      }
    }, (err) => {
      console.error("Meeting state sync error:", err);
    });

    // Sync Messages
    const q = query(
      collection(db, 'meetings', 'current', 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubMessages = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).reverse();
      setSpeakerMessages(msgs.filter((m: any) => m.type === 'speaker'));
      setVoterMessages(msgs.filter((m: any) => m.type === 'voter'));
    }, (err) => {
      console.error("Messages sync error:", err);
    });

    return () => {
      unsubMeeting();
      unsubMessages();
    };
  }, [isOwner]);

  useEffect(() => {
    if (userProfile && meetingState?.status === 'voting') {
       const checkVote = async () => {
          const vSnap = await getDoc(doc(db, 'meetings', 'current', 'votes', userProfile.uid));
          setHasVoted(vSnap.exists());
       };
       checkVote();
    } else {
      setHasVoted(false);
    }
  }, [userProfile, meetingState?.status]);

  useEffect(() => {
    speakerChatRef.current?.scrollIntoView({ behavior: 'smooth' });
    voterChatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [speakerMessages, voterMessages]);

  const sendMessage = async (type: 'speaker' | 'voter') => {
    if (!newMessage.trim() || !userProfile) return;
    
    // Only owner/privileged can speak in speaker chat
    if (type === 'speaker' && !isOwner) return;

    try {
      await addDoc(collection(db, 'meetings', 'current', 'messages'), {
        userId: userProfile.uid,
        userName: userProfile.displayName || userProfile.email.split('@')[0],
        text: newMessage.trim(),
        type,
        createdAt: serverTimestamp(),
        userTier: userProfile.subscriptionTier
      });
      setNewMessage("");
    } catch (err) {
      console.error(err);
    }
  };

  const castVote = async (choice: 'yay' | 'nay') => {
    if (hasVoted || !userProfile || meetingState?.status !== 'voting') return;

    logBreadcrumb(`VOTE CAST: ${choice}`);
    try {
      await runTransaction(db, async (transaction) => {
        const meetingRef = doc(db, 'meetings', 'current');
        const voteRef = doc(db, 'meetings', 'current', 'votes', userProfile.uid);
        
        transaction.set(voteRef, {
          userId: userProfile.uid,
          choice,
          createdAt: serverTimestamp()
        });

        transaction.update(meetingRef, {
          [choice === 'yay' ? 'yays' : 'nays']: increment(1)
        });
      });
      setHasVoted(true);
    } catch (err) {
      console.error("VOTE ERROR:", err);
    }
  };

  const triggerVoteAction = async () => {
    if (!isOwner) return;
    const newStatus = meetingState.status === 'discussing' ? 'voting' : 'discussing';
    await updateDoc(doc(db, 'meetings', 'current'), {
      status: newStatus,
      // Clear current votes if starting new
      ...(newStatus === 'voting' ? { yays: 0, nays: 0 } : {})
    });
    // In a real app, you'd clear the subcollection too, but for now we'll keep it simple
  };

  const NavItems = [
    { label: "Profile", icon: User, to: "/profile" },
    { label: "Dashboard", icon: Home, to: "/dashboard" },
    { label: "ML Lab", icon: Binary, to: "/ml-lab" },
    ...(isSuperAdmin(userProfile?.email) ? [
      { label: "Control Room", icon: Terminal, to: "/control-room" },
      { label: "Admin Hub", icon: Activity, to: "/sentinel" }
    ] : []),
    { label: "The Judgment", icon: Gavel, to: "/judgment" },
    { label: "IBH Meeting", icon: Users, to: "/ibh", active: true },
    { label: "The Lounge", icon: Coffee, to: "/lounge" },
    { label: "Mastering Suite", icon: Music, to: "/mastering" },
    { label: "Lyric Pro", icon: Feather, to: "/lyrics" },
    { label: "Hit Analyzer", icon: Zap, to: "/analysis" },
    { label: "The 99¢ Store", icon: ShoppingBag, to: "/store" }
  ];

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black flex items-center justify-center font-mono">
      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
        <Users className="text-[#24b324]" size={48} />
      </motion.div>
    </div>
  );

  return (
    <SentinelBoundary moduleName="Meeting">
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black text-white flex flex-col font-sans selection:bg-[#24b324] selection:text-black h-screen overflow-hidden">
      {/* Meeting Ticker */}
      <div className="bg-[#24b324] overflow-hidden py-2 border-y border-black/10 relative z-30 shadow-lg">
        <div className="flex whitespace-nowrap animate-ticker">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-12 px-6">
              <span className="text-black font-black uppercase italic text-sm tracking-tight">IBH COUNCIL IN SESSION: CURRENT TOPIC - {meetingState?.activeTopic || "INITIALIZING PROTOCOL"}</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm tracking-tight">UPCOMING FEATURE REVIEW: PROFILE LAYOUT V2 B-BUG SKIN INTEGRATION</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm tracking-tight">ALL VOTES ARE BINDING UNDER THE BROTHERHOOD OATH</span>
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
               <Users size={16} className="text-black" />
            </div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">IBH Meeting Room</h1>
          </div>
          <div className="hidden lg:flex items-center gap-4 border-l border-white/10 pl-6 ml-2">
             <div className="px-3 py-1 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-[#24b324] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                Council Level 1 Protocol
             </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="bg-black/60 border border-white/10 p-2 flex items-center gap-4 hidden sm:flex backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <div className="text-right">
                 <div className="text-[8px] font-black text-white/40 uppercase tracking-widest">Previous Vote Results</div>
                 <div className="text-[10px] font-black text-[#24b324] uppercase">Topic: {meetingState?.prevMeetingSummary?.topic}</div>
              </div>
              <div className="flex gap-2">
                 <div className="bg-green-500/20 text-green-400 px-2 py-1 text-[10px] font-black italic border border-green-500/20">YAY: {meetingState?.prevMeetingSummary?.yays}</div>
                 <div className="bg-red-500/20 text-red-400 px-2 py-1 text-[10px] font-black italic border border-red-500/20">NAY: {meetingState?.prevMeetingSummary?.nays}</div>
              </div>
           </div>
           <div className="w-10 h-10 bg-black border border-[#24b324] flex items-center justify-center font-black italic text-[#24b324] shadow-[0_0_10px_rgba(217,225,43,0.2)]">
             {userProfile?.level}
           </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-black relative">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
         
         {/* Live Topic Area & Dual Chat */}
         <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
            {/* Top Status Bar */}
            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-[#24b324]/5 to-transparent flex flex-col items-center justify-center relative">
               <div className="absolute top-4 left-4 flex gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${meetingState?.status === 'voting' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-[#24b324]'}`} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/20 mt-[-2px]">
                    {meetingState?.status === 'voting' ? 'VOTING OPEN' : 'DISCUSSION PHASE'}
                  </span>
               </div>
               
               <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-center max-w-2xl leading-none mb-4">
                 {meetingState?.activeTopic}
               </h2>
               
               <div className="flex gap-8 mt-4">
                  <div className="flex flex-col items-center">
                     <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Current Yays</span>
                     <div className="text-4xl font-black italic text-green-400 leading-none">{meetingState?.yays}</div>
                  </div>
                  <div className="flex flex-col items-center">
                     <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Current Nays</span>
                     <div className="text-4xl font-black italic text-red-400 leading-none">{meetingState?.nays}</div>
                  </div>
               </div>
            </div>

            {/* Dual Chat Split */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               {/* Speakers Chat (Left/Top) */}
               <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-white/5 bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <div className="p-3 bg-[#24b324] text-black flex items-center justify-between shadow-lg border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">
                     <div className="flex items-center gap-2">
                        <Mic size={14} />
                        <span className="text-[10px] font-black uppercase italic tracking-widest">Speakers Chat</span>
                     </div>
                     <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
                     {speakerMessages.map((msg, i) => (
                       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={msg.id} className="flex flex-col gap-1">
                          <span className="text-white/40 uppercase tracking-widest text-[8px] font-bold">[{msg.userName}] // ERA LEGEND</span>
                          <span className="text-[#24b324] leading-relaxed border-l border-[#24b324]/20 pl-2">{msg.text}</span>
                       </motion.div>
                     ))}
                     <div ref={speakerChatRef} />
                  </div>
                  {isOwner && (
                    <div className="p-4 border-t border-[#24b324]/10 flex gap-2 bg-black">
                       <input 
                         type="text"
                         value={newMessage}
                         onChange={(e) => setNewMessage(e.target.value)}
                         onKeyPress={(e) => e.key === 'Enter' && sendMessage('speaker')}
                         placeholder="SPEAK TO THE COUNCIL..."
                         className="flex-1 bg-white/5 border border-white/10 p-3 italic font-black uppercase tracking-wider text-[10px] focus:border-[#24b324] focus:outline-none backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                       />
                       <button onClick={() => sendMessage('speaker')} className="bg-[#24b324] text-black p-3 hover:bg-white transition-all border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">
                          <Send size={16} />
                       </button>
                    </div>
                  )}
               </div>

               {/* Voters Chat (Right/Bottom) */}
               <div className="flex-1 flex flex-col bg-white/[0.02]">
                  <div className="p-3 bg-white/10 text-white flex items-center justify-between border-b border-white/5 shadow-inner backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                     <div className="flex items-center gap-2">
                        <Users size={14} className="text-[#24b324]" />
                        <span className="text-[10px] font-black uppercase italic tracking-widest">Voters Discussion</span>
                     </div>
                     <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter italic">Vibe Check Active</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     {voterMessages.map((msg, i) => (
                       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={msg.id} className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-2">
                             <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest leading-none">{msg.userName}</span>
                             <span className="w-1 h-1 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
                          </div>
                          <div className="bg-white/5 p-2 border-l border-white/10 text-[11px] font-medium tracking-tight text-white/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                             {msg.text}
                          </div>
                       </motion.div>
                     ))}
                     <div ref={voterChatRef} />
                  </div>
                  <div className="p-4 border-t border-white/5 flex gap-2 bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                      <input 
                         type="text"
                         value={newMessage}
                         onChange={(e) => setNewMessage(e.target.value)}
                         onKeyPress={(e) => e.key === 'Enter' && sendMessage('voter')}
                         placeholder="DISCUSS TOPIC..."
                         className="flex-1 bg-white/5 border border-white/10 p-3 font-bold uppercase tracking-widest text-[9px] focus:border-white/20 focus:outline-none transition-all backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                       />
                       <button onClick={() => sendMessage('voter')} className="p-3 border border-white/10 hover:border-[#24b324] hover:text-[#24b324] transition-all">
                          <Send size={16} />
                       </button>
                  </div>
               </div>
            </div>
         </div>

         {/* Sidebar Controls (Right on desktop) */}
         <div className="w-full md:w-80 bg-black/80 flex flex-col p-8 border-l border-white/5 z-10 backdrop-blur-xl">
            {isOwner && (
               <div className="mb-8 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#24b324] mb-4">Leader Protocol</h3>
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-full p-6 flex flex-col items-center gap-2 border-2 transition-all ${isMuted ? 'border-white/10 text-white/40' : 'bg-[#24b324] text-black border-[#24b324] shadow-[0_0_30px_rgba(217,225,43,0.2)]'}`}
                  >
                     {isMuted ? <MicOff size={32} /> : <Mic size={32} />}
                     <span className="text-[10px] font-black uppercase italic tracking-widest">{isMuted ? 'UNMUTE VOICE' : 'BROADCASTING LIVE'}</span>
                  </button>
                  <button 
                    onClick={triggerVoteAction}
                    className="w-full p-4 bg-white/5 border-2 border-white/10 hover:border-[#24b324] hover:text-[#24b324] transition-all flex items-center justify-center gap-2 font-black uppercase italic text-xs backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                  >
                    <Box size={16} /> {meetingState?.status === 'discussing' ? 'OPEN VOTING PROTOCOL' : 'CLOSE VOTING'}
                  </button>
               </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center text-center">
               <AnimatePresence mode="wait">
                  {meetingState?.status === 'voting' ? (
                     <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6 w-full"
                     >
                        <AlertCircle className="text-red-500 mx-auto animate-pulse" size={48} />
                        <div>
                           <h4 className="text-2xl font-black italic uppercase italic leading-none mb-2">Vote Now</h4>
                           <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                             All decisions are final. Influence the next era of IBH.
                           </p>
                        </div>
                        
                        {!hasVoted ? (
                           <div className="grid grid-cols-2 gap-4">
                              <button 
                                onClick={() => castVote('yay')}
                                className="p-6 bg-green-500 text-black flex flex-col items-center gap-2 hover:bg-green-400 transition-all active:scale-95 shadow-[0_4px_0_rgba(0,0,0,0.5)]"
                              >
                                 <ThumbsUp size={24} />
                                 <span className="text-[10px] font-black uppercase italic tracking-widest">YAY</span>
                              </button>
                              <button 
                                onClick={() => castVote('nay')}
                                className="p-6 bg-red-500 text-black flex flex-col items-center gap-2 hover:bg-red-400 transition-all active:scale-95 shadow-[0_4px_0_rgba(0,0,0,0.5)]"
                              >
                                 <ThumbsDown size={24} />
                                 <span className="text-[10px] font-black uppercase italic tracking-widest">NAY</span>
                              </button>
                           </div>
                        ) : (
                           <div className="p-6 bg-white/5 border border-white/10 text-[#24b324] font-black uppercase italic text-sm tracking-widest italic animate-pulse backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                              VOTE COMMITTED
                           </div>
                        )}
                     </motion.div>
                  ) : (
                     <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                     >
                        <TrendingUp className="text-white/20 mx-auto" size={48} />
                        <h4 className="text-sm font-black italic uppercase italic tracking-tighter text-white/40">Discussion Phase</h4>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-relaxed max-w-[200px] mx-auto">
                           Listen to the speakers. Share your thoughts in the voter discuss field.
                        </p>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>

            <div className="mt-auto pt-8 border-t border-white/5">
                <p className="text-[10px] font-bold uppercase italic tracking-widest leading-relaxed text-[#24b324] text-center">
                  YOUR VOTE MATTERS AS YOU DO AS AN INDIVIDUAL AND AS AN IBH MEMBER.
                </p>
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
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ x: -400 }}
              animate={{ x: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              exit={{ x: -400 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black border-r-4 border-[#24b324] z-[101] p-8 flex flex-col overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-8 flex-shrink-0">
                 <h2 className="text-3xl font-black italic uppercase leading-none tracking-tighter italic">Indie<br/><span className="text-[#24b324]">Brotherhood</span></h2>
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

              <div className="mt-auto pt-8 border-t border-white/5 flex-shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-black border-2 border-[#24b324] flex items-center justify-center p-0.5 overflow-hidden shadow-[0_0_15px_rgba(217,225,43,0.2)]">
                       <User size={24} className="text-[#24b324]" />
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Member Rank</div>
                       <div className="text-[#24b324] font-black italic text-sm italic">{userProfile?.displayName || userProfile?.email.split('@')[0]}</div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
    </SentinelBoundary>
  );
};

export default IBHMeetingRoom;
